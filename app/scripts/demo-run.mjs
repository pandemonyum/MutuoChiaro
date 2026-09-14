#!/usr/bin/env node
/**
 * Esegue il percorso canonico della demo e stampa le evidenze.
 * Usato per generare i numeri citati in docs/BEFORE_AFTER_EVIDENCE.md:
 * nessun valore nella documentazione è scritto a mano.
 *
 *   node scripts/demo-run.mjs
 */
const { buildRuntime } = await import(new URL('../dist/src/runtime/buildRuntime.js', import.meta.url));
const { QUIZ_QUESTIONS } = await import(new URL('../dist/src/data/quizBank.js', import.meta.url));
const { ANDREA_DEMO_EXISTING_DEBTS } = await import(
  new URL('../dist/src/data/syntheticPersona.js', import.meta.url)
);

const eur = (n) =>
  n === null || n === undefined
    ? 'n.d.'
    : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
const pct = (n) =>
  n === null || n === undefined ? 'n.d.' : `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(n)}%`;
const h = (t) => `\n## ${t}\n`;

const rt = buildRuntime();
const runId = 'demo-evidence';
rt.orchestrator.createRun(runId);

process.stdout.write('# Evidenze del run canonico MutuoChiaro (dati sintetici)\n');
process.stdout.write(`\nrunId: \`${runId}\`\n`);

// ---------------------------------------------------------------- fase A/B
process.stdout.write(h('Fase A/B - profilo e prossima domanda decisiva'));
rt.orchestrator.updateProfile(runId, {});
let s = rt.store.snapshot(runId);
process.stdout.write(`- fase dopo la conferma del profilo: \`${s.currentPhase}\`\n`);
process.stdout.write(`- campo mancante selezionato: \`${s.selectedQuestion.field}\`\n`);
process.stdout.write(`- domanda posta: "${s.selectedQuestion.question}"\n`);
process.stdout.write(`- motivazione: "${s.selectedQuestion.why}"\n`);
process.stdout.write(`- impatto dichiarato sul confronto: ${s.selectedQuestion.decisionImpact}\n`);

rt.orchestrator.answerDecisiveQuestion(runId, 'existingMonthlyDebts', ANDREA_DEMO_EXISTING_DEBTS);
s = rt.store.snapshot(runId);
process.stdout.write(
  `- dopo la risposta (${ANDREA_DEMO_EXISTING_DEBTS} €/mese) la fase è \`${s.currentPhase}\`\n`,
);

// ------------------------------------------------------------------ fase D
process.stdout.write(h('Fase D - MutuoSpecchio, scenario base'));
const rows = [
  ['rataIniziale', 'Rata iniziale', eur],
  ['tan', 'TAN', pct],
  ['taegDichiarato', 'TAEG dichiarato', pct],
  ['durataAnni', 'Durata (anni)', (n) => String(n)],
  ['costoTotaleSimulato', 'Costo totale simulato', eur],
  ['interessiTotaliSimulati', 'Interessi totali simulati', eur],
  ['costiIniziali', 'Costi iniziali', eur],
  ['liquiditaResidua', 'Liquidità residua', eur],
  ['rapportoRataReddito', 'Rapporto rata/reddito', pct],
  ['margineMensile', 'Margine mensile', eur],
];
process.stdout.write(`| Voce | ${s.normalizedOffers.map((o) => o.displayName).join(' | ')} |\n`);
process.stdout.write(`| --- | ${s.normalizedOffers.map(() => '---').join(' | ')} |\n`);
for (const [key, label, fmt] of rows) {
  const cells = s.normalizedOffers.map((o) => {
    const t = o.rows[key];
    return `${fmt(t.value)} \`${t.provenance}\``;
  });
  process.stdout.write(`| ${label} | ${cells.join(' | ')} |\n`);
}
process.stdout.write(
  `\nOfferte in confronto parziale: ${s.offerValidations.filter((v) => v.partial).map((v) => v.offerId).join(', ') || 'nessuna'}\n`,
);
for (const v of s.offerValidations.filter((v) => v.missingFields.length > 0)) {
  process.stdout.write(`- \`${v.offerId}\` campi assenti: ${v.missingFields.join(', ')}\n`);
  process.stdout.write(`  - confronti non possibili: ${v.blockedComparisons.join('; ')}\n`);
  process.stdout.write(`  - domanda per la banca: ${v.questionForBank}\n`);
}

// ------------------------------------------------------------------ fase E
process.stdout.write(h('Fase E - scenari'));
rt.orchestrator.runScenarios(runId);
s = rt.store.snapshot(runId);
for (const sc of s.scenarios) {
  process.stdout.write(`\n### ${sc.label} (\`${sc.scenarioId}\`)\n\n`);
  process.stdout.write(`| Voce | ${sc.offers.map((o) => o.displayName).join(' | ')} |\n`);
  process.stdout.write(`| --- | ${sc.offers.map(() => '---').join(' | ')} |\n`);
  const scRows = [
    ['monthlyPayment', 'Rata mensile', eur],
    ['paymentToIncomePct', 'Rapporto rata/reddito', pct],
    ['monthlyMargin', 'Margine mensile', eur],
    ['liquidityNeeded', 'Liquidità iniziale necessaria', eur],
    ['liquidityRemaining', 'Liquidità residua', eur],
  ];
  for (const [key, label, fmt] of scRows) {
    const cells = sc.offers.map((o) => `${fmt(o[key].value)} \`${o[key].provenance}\``);
    process.stdout.write(`| ${label} | ${cells.join(' | ')} |\n`);
  }
  const breach = sc.offers
    .filter((o) => o.emergencyFundBreach === true)
    .map((o) => o.displayName);
  process.stdout.write(
    `| Sotto il fondo di emergenza | ${sc.offers.map((o) => (o.emergencyFundBreach === true ? 'sì' : o.emergencyFundBreach === false ? 'no' : 'n.d.')).join(' | ')} |\n`,
  );
  process.stdout.write(`\nIpotesi dichiarate:\n`);
  for (const a of sc.assumptions) process.stdout.write(`- ${a}\n`);
  if (sc.warnings.length > 0) {
    process.stdout.write(`\nAvvertenze:\n`);
    for (const w of sc.warnings) process.stdout.write(`- ${w}\n`);
  }
  void breach;
}

// ------------------------------------------------------------ failure branch
process.stdout.write(h('Failure branch - SafetyGuard su output non conforme'));
const injected =
  'Questo è il mutuo migliore per te: ti consigliamo di scegliere questa banca, hai il 90% di probabilità di approvazione.';
const guarded = rt.orchestrator.injectNonCompliantDraft(runId, injected);
process.stdout.write(`\nBozza iniettata: "${injected}"\n\n`);
process.stdout.write(`Frasi bloccate: ${guarded.clarity.safety.blockedCount}\n`);
for (const m of guarded.clarity.safety.matches) {
  process.stdout.write(`- regola \`${m.pattern}\` categoria \`${m.category}\`\n`);
  process.stdout.write(`  - testo bloccato: "${m.original}"\n`);
  process.stdout.write(`  - sostituito con: "${m.replacement}"\n`);
}

// ------------------------------------------------------------------ fase F
process.stdout.write(h('Fase F - controllo di comprensione'));
rt.orchestrator.startUnderstandingCheck(runId);
const correct = Object.fromEntries(QUIZ_QUESTIONS.map((q) => [q.id, q.correctOptionId]));
// Primo tentativo con un errore su q3, come nella demo.
const firstAttempt = { ...correct, q3: 'b' };
const afterFirst = rt.orchestrator.submitQuiz(runId, firstAttempt);
process.stdout.write(
  `\nTentativo 1: risposte errate ${afterFirst.state.comprehensionAttempts[0].wrongQuestionIds.join(', ')}, stato \`${afterFirst.state.comprehensionResult.status}\`, fase \`${afterFirst.state.currentPhase}\`\n`,
);
for (const f of afterFirst.state.comprehensionResult.feedback) {
  process.stdout.write(`- concetto da rivedere: ${f.concept}\n`);
  process.stdout.write(`- scenario riaperto: \`${f.reopenScenario}\`\n`);
}
const afterSecond = rt.orchestrator.submitQuiz(runId, correct);
process.stdout.write(
  `\nTentativo 2: stato \`${afterSecond.state.comprehensionResult.status}\`, tentativi usati ${afterSecond.state.comprehensionResult.attemptsUsed} su ${afterSecond.state.comprehensionResult.maxAttempts}, fase \`${afterSecond.state.currentPhase}\`\n`,
);

// ------------------------------------------------------------------ fase G
process.stdout.write(h('Fase G - gate umano'));
process.stdout.write(
  `\nRequisiti aperti prima della conferma: ${afterSecond.completionBlockers.join(' ') || 'nessuno'}\n`,
);
const final = rt.orchestrator.confirmHumanApproval(runId, true, 'demo-evidence');
process.stdout.write(`Fase dopo la conferma: \`${final.state.currentPhase}\`\n`);
process.stdout.write(`Requisiti aperti dopo la conferma: ${final.completionBlockers.length}\n`);

// --------------------------------------------------------------- before/after
process.stdout.write(h('Prima / Dopo - metriche prodotte dal run'));
const m = final.metrics;
process.stdout.write('\n| Indicatore | Prima | Dopo |\n| --- | --- | --- |\n');
const ba = [
  ['Criteri di confronto usati o disponibili', m.beforeAfter.before.criteriaCount, m.beforeAfter.after.criteriaCount],
  ['Termini finanziari spiegati', m.beforeAfter.before.termsExplained, m.beforeAfter.after.termsExplained],
  ['Dati mancanti individuati', m.beforeAfter.before.missingDataKnownToUser, m.beforeAfter.after.missingDataKnownToUser],
  [
    'Sa spiegare rata vs costo totale',
    m.beforeAfter.before.canExplainPaymentVsTotalCost ? 'sì' : 'no',
    m.beforeAfter.after.canExplainPaymentVsTotalCost ? 'sì' : 'no',
  ],
  [
    "Sa spiegare l'effetto della perizia",
    m.beforeAfter.before.canExplainAppraisalEffect ? 'sì' : 'no',
    m.beforeAfter.after.canExplainAppraisalEffect ? 'sì' : 'no',
  ],
  [
    'Riconosce il rischio del tasso variabile',
    m.beforeAfter.before.canRecognizeVariableRateRisk ? 'sì' : 'no',
    m.beforeAfter.after.canRecognizeVariableRateRisk ? 'sì' : 'no',
  ],
];
for (const [label, before, after] of ba) {
  process.stdout.write(`| ${label} | ${before} | ${after} |\n`);
}
process.stdout.write(
  `\nCriteri di confronto iniziali dichiarati dalla persona sintetica: ${m.beforeAfter.before.comparisonCriteriaUsed.join(', ')}\n`,
);

process.stdout.write('\n| Metrica del run | Valore |\n| --- | --- |\n');
const runMetrics = [
  ['Concetti verificati', `${m.conceptsUnderstoodCount} su ${QUIZ_QUESTIONS.length}`],
  ['Errori al primo tentativo', m.initialWrongAnswers],
  ['Tentativi quiz usati', `${m.quizAttemptsUsed} su ${m.quizMaxAttempts}`],
  ['Eventi di dato mancante rilevato', m.missingDataDetected],
  ['Dati mancanti risolti', `${m.missingDataResolved} (${m.resolvedFields.join(', ')})`],
  ['Domande decisive risolte', m.decisiveQuestionsAnswered],
  ['Scenari completati', m.scenariosCompleted],
  ['Offerte in confronto parziale', m.partialOffers],
  ['Blocchi SafetyGuard', m.safetyGuardBlocks],
  ['Invocazioni tool', m.toolInvocations],
  ['Invocazioni skill', m.skillInvocations],
  ['Invocazioni agent', m.agentInvocations],
];
for (const [label, value] of runMetrics) process.stdout.write(`| ${label} | ${value} |\n`);

// ----------------------------------------------------------------- traccia
process.stdout.write(h('Traccia agentica del run'));
const events = rt.events.byRun(runId);
process.stdout.write(`\nEventi totali: ${events.length}\n\n`);
const counts = new Map();
for (const e of events) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
process.stdout.write('| Tipo evento | Occorrenze |\n| --- | --- |\n');
for (const [kind, n] of [...counts.entries()].sort()) {
  process.stdout.write(`| \`${kind}\` | ${n} |\n`);
}

process.stdout.write('\n| Componente | Invocazioni |\n| --- | --- |\n');
for (const c of rt.registry.list()) {
  process.stdout.write(`| \`${c.name}\` (${c.kind}) | ${rt.registry.callCount(c.name)} |\n`);
}

process.stdout.write('\nPrimi 12 eventi con riferimenti agli artifact:\n\n');
process.stdout.write('| # | Componente | Evento | inputRef | outputRef | Fase |\n| --- | --- | --- | --- | --- | --- |\n');
for (const e of events.slice(0, 12)) {
  process.stdout.write(
    `| ${e.seq} | ${e.actor} | \`${e.kind}\` | \`${e.inputRef ?? '-'}\` | \`${e.outputRef ?? '-'}\` | ${e.phaseAfter ?? '-'} |\n`,
  );
}

// ----------------------------------------------------------- escalation run
process.stdout.write(h('Failure branch - componente non disponibile (run separato)'));
const outageId = 'demo-outage';
rt.orchestrator.createRun(outageId);
rt.orchestrator.updateProfile(outageId, {});
rt.orchestrator.answerDecisiveQuestion(outageId, 'existingMonthlyDebts', ANDREA_DEMO_EXISTING_DEBTS);
const outage = rt.orchestrator.simulateComponentOutage(outageId, 'MortgageCalculator');
process.stdout.write(`\nFase finale: \`${outage.state.currentPhase}\`\n`);
process.stdout.write(`Motivo registrato: ${outage.state.escalation.reason}\n\n`);
process.stdout.write('| # | Componente | Evento | Messaggio |\n| --- | --- | --- | --- |\n');
for (const e of rt.events.byRun(outageId).filter((e) => e.status === 'failed' || e.kind === 'run.escalated')) {
  process.stdout.write(`| ${e.seq} | ${e.actor} | \`${e.kind}\` | ${e.message} |\n`);
}

// ------------------------------------------------- approvazione fuori fase
process.stdout.write(h('Failure branch - approvazione richiesta nella fase sbagliata'));
const earlyId = 'demo-early-approval';
rt.orchestrator.createRun(earlyId);
let rejected = null;
try {
  rt.orchestrator.confirmHumanApproval(earlyId, true, 'demo-evidence');
} catch (error) {
  rejected = error.message;
}
const early = rt.orchestrator.view(earlyId);
process.stdout.write(`\nErrore restituito: ${rejected}\n`);
process.stdout.write(`Fase dopo il tentativo: \`${early.state.currentPhase}\` (invariata)\n`);
process.stdout.write(`Conferma registrata: ${early.state.humanApproval.received}\n`);
process.stdout.write('\n| # | Evento | Messaggio |\n| --- | --- | --- |\n');
for (const e of rt.events.byRun(earlyId).filter((e) => e.kind === 'state.transition_rejected')) {
  process.stdout.write(`| ${e.seq} | \`${e.kind}\` | ${e.message} |\n`);
}
process.stdout.write('\n---\n\nTutti i dati riportati sono sintetici e generati da questo script.\n');
