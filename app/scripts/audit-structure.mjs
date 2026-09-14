#!/usr/bin/env node
/**
 * Audit strutturale di MutuoChiaro.
 * Verifica sul codice compilato che le proprietà dichiarate nella
 * documentazione siano effettivamente presenti nel runtime.
 * Esce con codice 1 al primo controllo fallito.
 */
import { readFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(APP, '..');

const checks = [];
const record = (name, ok, detail = '') => checks.push({ name, ok, detail });

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const { buildRuntime, EXPECTED_COMPONENTS } = await import(
  new URL('../dist/src/runtime/buildRuntime.js', import.meta.url)
);
const { LEGAL_TRANSITIONS } = await import(new URL('../dist/src/core/stateMachine.js', import.meta.url));
const { PHASES, EVENT_KINDS } = await import(new URL('../dist/src/core/types.js', import.meta.url));

// 1. Registry completo e senza duplicati.
const rt = buildRuntime();
const names = rt.registry.list().map((c) => c.name);
record(
  'registry: tutti i componenti attesi sono registrati',
  EXPECTED_COMPONENTS.every((n) => names.includes(n)),
  EXPECTED_COMPONENTS.filter((n) => !names.includes(n)).join(', '),
);
record('registry: nessun nome duplicato', new Set(names).size === names.length);
record(
  'registry: 5 tool, 5 skill, 2 agent',
  rt.registry.list().filter((c) => c.kind === 'tool').length === 5 &&
    rt.registry.list().filter((c) => c.kind === 'skill').length === 5 &&
    rt.registry.list().filter((c) => c.kind === 'agent').length === 2,
  JSON.stringify(
    rt.registry.list().reduce((acc, c) => ({ ...acc, [c.kind]: (acc[c.kind] ?? 0) + 1 }), {}),
  ),
);

// 2. Macchina a stati: tutte le fasi coperte, stati terminali chiusi.
record(
  'stato: ogni fase ha transizioni dichiarate',
  PHASES.every((p) => LEGAL_TRANSITIONS[p] !== undefined),
);
record(
  'stato: COMPLETED ed ESCALATED sono terminali',
  LEGAL_TRANSITIONS.COMPLETED.length === 0 && LEGAL_TRANSITIONS.ESCALATED.length === 0,
);
record(
  'stato: nessuna scorciatoia verso COMPLETED',
  Object.entries(LEGAL_TRANSITIONS)
    .filter(([from]) => from !== 'AWAITING_HUMAN_CONFIRMATION')
    .every(([, to]) => !to.includes('COMPLETED')),
);

// 3. Percorso end-to-end eseguito davvero.
const runId = 'audit-run';
rt.orchestrator.createRun(runId);
rt.orchestrator.updateProfile(runId, {});
const question = rt.store.snapshot(runId).selectedQuestion;
record(
  'percorso: la prossima domanda decisiva riguarda le rate già attive',
  question?.field === 'existingMonthlyDebts',
  String(question?.field),
);
rt.orchestrator.answerDecisiveQuestion(runId, 'existingMonthlyDebts', 280);
rt.orchestrator.runScenarios(runId);
rt.orchestrator.startUnderstandingCheck(runId);
const { QUIZ_QUESTIONS } = await import(new URL('../dist/src/data/quizBank.js', import.meta.url));
rt.orchestrator.submitQuiz(
  runId,
  Object.fromEntries(QUIZ_QUESTIONS.map((q) => [q.id, q.correctOptionId])),
);
const beforeGate = rt.store.snapshot(runId);
record(
  'gate: il run si ferma in attesa della conferma umana',
  beforeGate.currentPhase === 'AWAITING_HUMAN_CONFIRMATION' && !beforeGate.humanApproval.received,
  beforeGate.currentPhase,
);
const final = rt.orchestrator.confirmHumanApproval(runId, true, 'audit');
record('gate: dopo la conferma il run è COMPLETED', final.state.currentPhase === 'COMPLETED');

// 4. Eventi reali e artifact citabili.
const events = rt.events.byRun(runId);
record('eventi: il run ne ha prodotti più di 40', events.length > 40, String(events.length));
record(
  'eventi: tutti appartengono al vocabolario dichiarato',
  events.every((e) => EVENT_KINDS.includes(e.kind)),
);
const refs = events.flatMap((e) => [e.inputRef, e.outputRef]).filter(Boolean);
record(
  'artifact: ogni ref citato negli eventi è risolvibile',
  refs.every((r) => rt.artifacts.get(r) !== undefined),
);
record(
  'artifact: ogni invocazione ha inputRef e outputRef',
  rt.registry.invocationLog().every((i) => i.inputRef && i.outputRef),
);

// 5. Nessuna classifica nell output mostrato.
const displayed = JSON.stringify({
  offers: final.state.normalizedOffers,
  clarity: final.clarity,
  scenarios: final.state.scenarios,
}).toLowerCase();
const forbidden = [
  'migliore',
  'ottimale',
  'consigliat',
  'ti conviene',
  'classifica',
  'graduatoria',
  'punteggio',
  'probabilità di approvazione',
];
const found = forbidden.filter((f) => displayed.includes(f));
record('linguaggio: nessun termine di raccomandazione nell output', found.length === 0, found.join(', '));

// 6. Il dato mancante non viene inventato.
const offerC = final.state.offers.find((o) => o.id === 'offer-c');
record(
  'dati mancanti: il costo della polizza obbligatoria resta assente',
  offerC?.insuranceRequired === true && offerC?.insuranceCost === null,
);
record(
  "dati mancanti: l'offerta incompleta resta nel confronto",
  final.state.normalizedOffers.some((o) => o.offerId === 'offer-c'),
);
record(
  'dati mancanti: il run registra la limitazione fra le avvertenze',
  final.state.warnings.some((w) => /polizza/i.test(w)),
);

// 7. Provenienza dichiarata su ogni valore mostrato.
const missingProvenance = [];
for (const offer of final.state.normalizedOffers) {
  for (const [key, traced] of Object.entries(offer.rows)) {
    if (!traced.provenance) missingProvenance.push(`${offer.offerId}.${key}`);
  }
}
record(
  'provenienza: ogni riga normalizzata la dichiara',
  missingProvenance.length === 0,
  missingProvenance.join(', '),
);

// 8. Documentazione e sorgenti attesi presenti.
const requiredFiles = [
  'README.md',
  'OVERVIEW.md',
  'docs/EVIDENCE_MATRIX.md',
  'docs/DEMO_SCRIPT.md',
  'docs/RISK_AND_CLARITY_NOTE.md',
  'docs/USER_DIFFICULTY_STATEMENT.md',
  'docs/BEFORE_AFTER_EVIDENCE.md',
  'docs/AGENTIC_ARCHITECTURE.md',
  'agents/AGENTS.md',
  'agents/schemas/runtime-state.schema.json',
  'agents/schemas/runtime-event.schema.json',
  'agents/schemas/agent-envelope.schema.json',
];
for (const file of requiredFiles) {
  record(`documentazione: ${file}`, await exists(join(ROOT, file)));
}

// 9. Nessuna dipendenza runtime esterna.
const pkg = JSON.parse(await readFile(join(APP, 'package.json'), 'utf8'));
record(
  'dipendenze: nessuna dipendenza di runtime',
  !pkg.dependencies || Object.keys(pkg.dependencies).length === 0,
);

// ----------------------------------------------------------------- report
let failed = 0;
for (const check of checks) {
  if (!check.ok) failed += 1;
  const mark = check.ok ? 'OK  ' : 'FAIL';
  process.stdout.write(`${mark} ${check.name}${check.detail ? ` -> ${check.detail}` : ''}\n`);
}
process.stdout.write(`\n${checks.length - failed}/${checks.length} controlli superati\n`);
process.exit(failed === 0 ? 0 : 1);
