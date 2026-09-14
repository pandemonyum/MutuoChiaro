import { IllegalTransitionError } from './errors.js';
import { isLegalTransition } from './stateMachine.js';
import type { Phase, RunState } from './types.js';

const MUTATION_TOKEN = Symbol('mutuochiaro.orchestrator-only');

/**
 * Contenitore dello stato esterno e tipizzato.
 *
 * Le mutazioni passano solo da `mutate`, che richiede il token detenuto
 * dall'orchestratore. Agenti e skill ricevono uno snapshot congelato in
 * profondità: un tentativo di scrittura non ha effetto e viene rilevato.
 */
export class RunStore {
  private readonly runs = new Map<string, RunState>();

  static readonly token: symbol = MUTATION_TOKEN;

  create(state: RunState): RunState {
    this.runs.set(state.runId, state);
    return state;
  }

  exists(runId: string): boolean {
    return this.runs.has(runId);
  }

  ids(): string[] {
    return [...this.runs.keys()];
  }

  /** Riferimento interno: accessibile solo a chi possiede il token. */
  raw(runId: string, token: symbol): RunState {
    if (token !== MUTATION_TOKEN) {
      throw new Error('Accesso allo stato mutabile consentito solo all orchestratore');
    }
    const state = this.runs.get(runId);
    if (!state) throw new Error(`Run inesistente: ${runId}`);
    return state;
  }

  /** Snapshot di sola lettura per agenti, skill e API. */
  snapshot(runId: string): Readonly<RunState> {
    const state = this.runs.get(runId);
    if (!state) throw new Error(`Run inesistente: ${runId}`);
    return deepFreeze(structuredClone(state));
  }

  mutate(runId: string, token: symbol, fn: (draft: RunState) => void): RunState {
    const state = this.raw(runId, token);
    fn(state);
    state.timestamps.updatedAt = new Date().toISOString();
    return state;
  }

  /** Applica una transizione di fase solo se legale. */
  transition(runId: string, token: symbol, to: Phase, reason: string): Phase {
    const state = this.raw(runId, token);
    const from = state.currentPhase;
    if (!isLegalTransition(from, to)) {
      throw new IllegalTransitionError(from, to, reason);
    }
    state.currentPhase = to;
    state.timestamps.updatedAt = new Date().toISOString();
    return to;
  }
}

export function deepFreeze<T>(value: T): Readonly<T> {
  if (value === null || typeof value !== 'object') return value;
  Object.freeze(value);
  for (const key of Object.getOwnPropertyNames(value)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}
