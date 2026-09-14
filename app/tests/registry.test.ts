import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Registry } from '../src/core/registry.js';
import { EventBus } from '../src/core/eventBus.js';
import { ArtifactStore } from '../src/core/artifactStore.js';
import { ComponentNotFoundError, ComponentUnavailableError } from '../src/core/errors.js';
import { EXPECTED_COMPONENTS, buildRuntime } from '../src/runtime/buildRuntime.js';
import { EVENT_KINDS } from '../src/core/types.js';
import { declareExistingDebts } from './support/journey.js';

function bareRegistry() {
  const events = new EventBus();
  const artifacts = new ArtifactStore();
  return { events, artifacts, registry: new Registry(events, artifacts) };
}

describe('Registry - contratto di invocazione', () => {
  test('ogni componente atteso e registrato una sola volta', () => {
    const rt = buildRuntime();
    const names = rt.registry.list().map((c) => c.name);
    for (const expected of EXPECTED_COMPONENTS) {
      assert.ok(names.includes(expected), `componente non registrato: ${expected}`);
    }
    assert.equal(new Set(names).size, names.length, 'nomi duplicati nel registry');
    assert.equal(names.length, EXPECTED_COMPONENTS.length);
  });

  test('la registrazione doppia dello stesso nome e rifiutata', () => {
    const { registry } = bareRegistry();
    const def = { name: 'X', kind: 'tool' as const, purpose: 'p', run: () => 1 };
    registry.register(def);
    assert.throws(() => registry.register(def), /già registrato/i);
  });

  test('un nome sconosciuto produce un errore e un evento di fallimento', () => {
    const { registry, events } = bareRegistry();
    assert.throws(() => registry.invoke('r1', 'NonEsiste', {}), ComponentNotFoundError);
    const failed = events.byRun('r1').filter((e) => e.status === 'failed');
    assert.equal(failed.length, 1);
    assert.equal(failed[0]!.actor, 'NonEsiste');
  });

  test('started e completed emessi in ordine con inputRef, outputRef e durata', () => {
    const { registry, events, artifacts } = bareRegistry();
    registry.register({
      name: 'Doppio',
      kind: 'tool',
      purpose: 'raddoppia',
      run: (input: { n: number }) => ({ n: input.n * 2 }),
    });
    const out = registry.invoke<{ n: number }, { n: number }>('r2', 'Doppio', { n: 21 });
    assert.deepEqual(out, { n: 42 });

    const log = events.byRun('r2');
    assert.equal(log.length, 2);
    assert.equal(log[0]!.kind, 'tool.started');
    assert.equal(log[1]!.kind, 'tool.completed');
    assert.ok(log[0]!.inputRef, 'inputRef obbligatorio su started');
    assert.ok(log[1]!.outputRef, 'outputRef obbligatorio su completed');
    assert.equal(log[0]!.inputRef, log[1]!.inputRef);
    assert.equal(typeof log[1]!.durationMs, 'number');
    assert.ok(log[1]!.durationMs! >= 0);
    assert.ok(log[0]!.seq < log[1]!.seq);

    const input = artifacts.get(log[0]!.inputRef!)!;
    const output = artifacts.get(log[1]!.outputRef!)!;
    assert.deepEqual(input.payload, { n: 21 });
    assert.deepEqual(output.payload, { n: 42 });
    assert.equal(input.direction, 'input');
    assert.equal(output.direction, 'output');
  });

  test('un errore nel componente emette failed con l errore salvato come artifact', () => {
    const { registry, events, artifacts } = bareRegistry();
    registry.register({
      name: 'Rotto',
      kind: 'skill',
      purpose: 'fallisce sempre',
      run: () => {
        throw new Error('guasto previsto');
      },
    });
    assert.throws(() => registry.invoke('r3', 'Rotto', {}), /guasto previsto/);
    const log = events.byRun('r3');
    assert.equal(log[0]!.kind, 'skill.started');
    assert.equal(log[1]!.kind, 'skill.failed');
    assert.equal(log[1]!.status, 'failed');
    const payload = artifacts.get(log[1]!.outputRef!)!.payload as { message: string };
    assert.match(payload.message, /guasto previsto/);
  });

  test('un componente disabilitato fallisce in modo osservabile', () => {
    const { registry, events } = bareRegistry();
    registry.register({ name: 'Spento', kind: 'tool', purpose: 'p', run: () => 1 });
    registry.disable('Spento');
    assert.throws(() => registry.invoke('r4', 'Spento', {}), ComponentUnavailableError);
    const log = events.byRun('r4');
    assert.equal(log[1]!.kind, 'tool.failed');
    registry.enable('Spento');
    assert.equal(registry.invoke('r4', 'Spento', {}), 1);
  });

  test('le invocazioni annidate passano dallo stesso kernel', () => {
    const { registry, events } = bareRegistry();
    registry.register({ name: 'Interno', kind: 'tool', purpose: 'p', run: () => 7 });
    registry.register({
      name: 'Esterno',
      kind: 'skill',
      purpose: 'p',
      run: (_input: unknown, ctx) => ctx.invoke<unknown, number>('Interno', {}) + 1,
    });
    assert.equal(registry.invoke('r5', 'Esterno', {}), 8);
    const kinds = events.byRun('r5').map((e) => e.kind);
    assert.deepEqual(kinds, ['skill.started', 'tool.started', 'tool.completed', 'skill.completed']);
    assert.equal(registry.callCount('Interno'), 1);
  });

  test('gli artifact ref sono univoci e risolvibili', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-artifacts');
    declareExistingDebts(rt, run.runId, 280);
    const refs = rt.events
      .byRun(run.runId)
      .flatMap((e) => [e.inputRef, e.outputRef])
      .filter((r): r is string => Boolean(r));
    assert.ok(refs.length > 10);
    // Un inputRef è condiviso dalla coppia started/completed: la proprietà da
    // verificare è che ogni ref distinto risolva a un artifact del run.
    const distinct = new Set(refs);
    for (const ref of distinct) {
      const artifact = rt.artifacts.get(ref);
      assert.ok(artifact, `artifact non risolvibile: ${ref}`);
      assert.equal(artifact!.runId, run.runId);
      assert.equal(artifact!.ref, ref);
    }
    assert.equal(
      distinct.size,
      rt.artifacts.listByRun(run.runId).length,
      'ogni artifact salvato deve essere citato nella traccia e viceversa',
    );
  });

  test('tutti i tipi di evento emessi appartengono al vocabolario dichiarato', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-vocab');
    declareExistingDebts(rt, run.runId, 280);
    rt.orchestrator.runScenarios(run.runId);
    for (const e of rt.events.byRun(run.runId)) {
      assert.ok(
        (EVENT_KINDS as readonly string[]).includes(e.kind),
        `evento fuori vocabolario: ${e.kind}`,
      );
    }
  });
});

describe('Registry - i calcoli non sono nel modello', () => {
  test('il conteggio delle invocazioni dimostra la delega ai tool', () => {
    const rt = buildRuntime();
    const run = rt.orchestrator.createRun('run-delegation');
    declareExistingDebts(rt, run.runId, 280);
    rt.orchestrator.runScenarios(run.runId);

    // 5 scenari calcolati in totale (base durante la normalizzazione + 4 espliciti),
    // ognuno delega la rata al MortgageCalculator una volta per offerta calcolabile.
    assert.ok(rt.registry.callCount('AffordabilityScenarioEngine') >= 5);
    assert.ok(
      rt.registry.callCount('MortgageCalculator') >= 15,
      `atteso >=15 invocazioni, ottenute ${rt.registry.callCount('MortgageCalculator')}`,
    );
    assert.ok(rt.registry.callCount('OfferSchemaValidator') >= 1);
    assert.ok(rt.registry.callCount('SafetyGuard') >= 1);
    assert.ok(rt.registry.callCount('build-financial-profile') >= 1);
    assert.ok(rt.registry.callCount('select-next-decisive-question') >= 1);
    assert.ok(rt.registry.callCount('normalize-mortgage-offers') >= 1);
    assert.ok(rt.registry.callCount('explain-mortgage-tradeoffs') >= 1);
    assert.ok(rt.registry.callCount('profile-property-agent') >= 1);
    assert.ok(rt.registry.callCount('offer-clarity-agent') >= 1);
  });
});
