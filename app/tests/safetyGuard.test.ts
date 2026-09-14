import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { guardTexts } from '../src/tools/safetyGuard.js';
import { buildRuntime } from '../src/runtime/buildRuntime.js';
import { declareExistingDebts } from './support/journey.js';

const FORBIDDEN = [
  'Questo è il mutuo migliore per te.',
  'Scegli questa banca.',
  'Questa è l offerta ottimale.',
  'Sei sicuramente finanziabile.',
  'Hai il 90% di probabilità di approvazione.',
  'Ti conviene il tasso fisso.',
  'Questa banca approverà la richiesta.',
  'Ti consigliamo la seconda offerta.',
  'Questa offerta è adatta al tuo profilo.',
  'In classifica questa offerta è al primo posto.',
];

const ALLOWED = [
  'Questa offerta presenta la rata iniziale più bassa.',
  'Questa durata riduce la rata, ma aumenta il costo totale simulato.',
  'In questo scenario la liquidità residua scende sotto la soglia impostata.',
  'Il dato relativo alla polizza non è presente.',
  'Il tasso variabile è maggiormente sensibile allo scenario di aumento dei tassi.',
  'La simulazione non rappresenta una delibera bancaria.',
];

describe('SafetyGuard', () => {
  for (const text of FORBIDDEN) {
    test(`blocca: ${text}`, () => {
      const out = guardTexts({ texts: [text], source: 'test' });
      assert.equal(out.blocked, true, `non bloccato: ${text}`);
      assert.equal(out.matches.length >= 1, true);
      assert.ok(
        out.safeTexts[0]!.includes('bloccata da SafetyGuard'),
        'il testo non conforme deve essere sostituito, non solo segnalato',
      );
      assert.ok(!out.safeTexts[0]!.includes(text), 'la frase originale non deve raggiungere la UI');
    });
  }

  for (const text of ALLOWED) {
    test(`ammette: ${text}`, () => {
      const out = guardTexts({ texts: [text], source: 'test' });
      assert.equal(out.blocked, false, `bloccato per errore: ${text} -> ${JSON.stringify(out.matches)}`);
      assert.equal(out.safeTexts[0], text);
    });
  }

  test('blocca solo la frase non conforme e conserva le altre', () => {
    const out = guardTexts({
      texts: ['Questa offerta presenta la rata iniziale più bassa. Ti consigliamo di scegliere questa.'],
      source: 'test',
    });
    assert.equal(out.blocked, true);
    assert.ok(out.safeTexts[0]!.includes('rata iniziale più bassa'));
    assert.ok(out.safeTexts[0]!.includes('bloccata da SafetyGuard'));
  });

  test('classifica la categoria del blocco', () => {
    const approval = guardTexts({ texts: ['Hai il 90% di probabilità di approvazione.'], source: 't' });
    assert.equal(approval.matches[0]!.category, 'APPROVAL_ESTIMATE');
    const ranking = guardTexts({ texts: ['Questa è l offerta ottimale.'], source: 't' });
    assert.equal(ranking.matches[0]!.category, 'RANKING');
  });
});

describe('SafetyGuard nel percorso reale', () => {
  test("un output agentico con raccomandazione viene bloccato e genera l'evento", () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-safety');
    declareExistingDebts(rt, run.runId);

    const before = rt.events.countByKind(run.runId, 'safety_guard.blocked');
    const view = rt.orchestrator.injectNonCompliantDraft(
      run.runId,
      'Questo è il mutuo migliore per te: ti consigliamo di scegliere questa banca.',
    );
    const after = rt.events.countByKind(run.runId, 'safety_guard.blocked');

    assert.ok(after > before, 'deve essere emesso un evento safety_guard.blocked');
    assert.equal(view.clarity!.safety.blocked, true);
    assert.ok(view.clarity!.safety.blockedCount >= 1);

    // Testi effettivamente mostrati dalla UI: perOffer, crossOffer, scenarioNotes.
    const displayed = JSON.stringify({
      perOffer: view.clarity!.perOffer,
      crossOffer: view.clarity!.crossOffer,
      scenarioNotes: view.clarity!.scenarioNotes,
      missingDataNotes: view.clarity!.missingDataNotes,
    });
    assert.ok(!displayed.includes('mutuo migliore per te'), 'la frase non deve raggiungere la UI');
    assert.ok(displayed.includes('bloccata da SafetyGuard'));
    // La frase originale resta solo nel registro dei blocchi, come pista di audit.
    assert.ok(
      view.clarity!.safety.matches.some((m) => m.original.includes('mutuo migliore per te')),
      'il testo bloccato deve restare tracciabile per la verifica',
    );
    assert.ok(
      view.state.warnings.some((w) => /SafetyGuard/.test(w)),
      'il blocco deve essere registrato nello stato, non solo in console',
    );
  });

  test('nessun testo prodotto dallo Offer Clarity Agent viola le regole', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-safety-clean');
    declareExistingDebts(rt, run.runId);
    const view = rt.orchestrator.runScenarios(run.runId);
    assert.equal(view.clarity!.safety.blocked, false, JSON.stringify(view.clarity!.safety.matches));
    assert.equal(rt.events.countByKind(run.runId, 'safety_guard.blocked'), 0);
  });
});
