import { ArtifactStore } from './artifactStore.js';
import { EventBus } from './eventBus.js';
import { ComponentNotFoundError, ComponentUnavailableError } from './errors.js';
import type { ComponentKind, EventKind } from './types.js';

export interface ComponentContext {
  runId: string;
  /** Invocazione annidata: skill e agenti chiamano i tool solo passando da qui. */
  invoke: <I, O>(componentName: string, input: I) => O;
  emit: (
    kind: EventKind,
    message: string,
    extra?: { inputRef?: string; outputRef?: string },
  ) => void;
}

export type ComponentFn<I = never, O = unknown> = (input: I, ctx: ComponentContext) => O;

export interface ComponentDefinition<I = never, O = unknown> {
  name: string;
  kind: ComponentKind;
  purpose: string;
  run: ComponentFn<I, O>;
}

interface InvocationRecord {
  component: string;
  kind: ComponentKind;
  inputRef: string;
  outputRef: string | null;
  durationMs: number;
  ok: boolean;
}

const STARTED: Record<ComponentKind, EventKind> = {
  agent: 'agent.started',
  skill: 'skill.started',
  tool: 'tool.started',
};
const COMPLETED: Record<ComponentKind, EventKind> = {
  agent: 'agent.completed',
  skill: 'skill.completed',
  tool: 'tool.completed',
};
const FAILED: Record<ComponentKind, EventKind> = {
  agent: 'agent.failed',
  skill: 'skill.failed',
  tool: 'tool.failed',
};

/**
 * Kernel di invocazione: unico punto d'ingresso per agenti, skill e tool.
 *
 * Sequenza garantita per ogni chiamata:
 *  1. verifica del nome del componente;
 *  2. salvataggio input -> inputRef;
 *  3. evento *.started;
 *  4. esecuzione;
 *  5. salvataggio output -> outputRef;
 *  6. evento *.completed con durata, oppure *.failed con errore.
 *
 * Il kernel NON ha accesso in scrittura allo stato del run: lo stato viene
 * aggiornato esclusivamente dall'orchestratore.
 */
export class Registry {
  private readonly components = new Map<string, ComponentDefinition<never, unknown>>();
  private readonly disabled = new Set<string>();
  private readonly invocations: InvocationRecord[] = [];

  constructor(
    readonly events: EventBus,
    readonly artifacts: ArtifactStore,
  ) {}

  register<I, O>(def: ComponentDefinition<I, O>): void {
    if (this.components.has(def.name)) {
      throw new Error(`Componente già registrato: ${def.name}`);
    }
    this.components.set(def.name, def as unknown as ComponentDefinition<never, unknown>);
  }

  has(name: string): boolean {
    return this.components.has(name);
  }

  list(): { name: string; kind: ComponentKind; purpose: string; enabled: boolean }[] {
    return [...this.components.values()].map((c) => ({
      name: c.name,
      kind: c.kind,
      purpose: c.purpose,
      enabled: !this.disabled.has(c.name),
    }));
  }

  /** Simulazione controllata di "tool non disponibile". */
  disable(name: string): void {
    if (!this.components.has(name)) throw new ComponentNotFoundError(name);
    this.disabled.add(name);
  }

  enable(name: string): void {
    this.disabled.delete(name);
  }

  callCount(name: string): number {
    return this.invocations.filter((i) => i.component === name).length;
  }

  invocationLog(): readonly InvocationRecord[] {
    return this.invocations;
  }

  invoke<I, O>(runId: string, componentName: string, input: I): O {
    const def = this.components.get(componentName);
    if (!def) {
      // Nome sconosciuto: nessun artifact di input, ma l'errore resta osservabile.
      this.events.emit({
        runId,
        kind: 'tool.failed',
        actor: componentName,
        actorKind: 'system',
        status: 'failed',
        message: `Componente non registrato: ${componentName}`,
      });
      throw new ComponentNotFoundError(componentName);
    }

    const inputRef = this.artifacts.put(runId, def.name, 'input', input);
    this.events.emit({
      runId,
      kind: STARTED[def.kind],
      actor: def.name,
      actorKind: def.kind,
      status: 'started',
      message: def.purpose,
      inputRef,
    });

    if (this.disabled.has(def.name)) {
      const err = new ComponentUnavailableError(def.name);
      const outputRef = this.artifacts.put(runId, def.name, 'output', {
        error: err.name,
        message: err.message,
      });
      this.events.emit({
        runId,
        kind: FAILED[def.kind],
        actor: def.name,
        actorKind: def.kind,
        status: 'failed',
        message: err.message,
        inputRef,
        outputRef,
        durationMs: 0,
      });
      this.invocations.push({
        component: def.name,
        kind: def.kind,
        inputRef,
        outputRef,
        durationMs: 0,
        ok: false,
      });
      throw err;
    }

    const ctx: ComponentContext = {
      runId,
      invoke: <NI, NO>(nested: string, nestedInput: NI): NO =>
        this.invoke<NI, NO>(runId, nested, nestedInput),
      emit: (kind, message, extra) => {
        this.events.emit({
          runId,
          kind,
          actor: def.name,
          actorKind: def.kind,
          status: 'info',
          message,
          ...extra,
        });
      },
    };

    const startedAt = process.hrtime.bigint();
    try {
      const output = (def.run as ComponentFn<I, O>)(input, ctx);
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const outputRef = this.artifacts.put(runId, def.name, 'output', output);
      this.events.emit({
        runId,
        kind: COMPLETED[def.kind],
        actor: def.name,
        actorKind: def.kind,
        status: 'completed',
        message: `${def.name} completato`,
        inputRef,
        outputRef,
        durationMs: round3(durationMs),
      });
      this.invocations.push({
        component: def.name,
        kind: def.kind,
        inputRef,
        outputRef,
        durationMs,
        ok: true,
      });
      return output;
    } catch (error) {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const err = error instanceof Error ? error : new Error(String(error));
      const outputRef = this.artifacts.put(runId, def.name, 'output', {
        error: err.name,
        message: err.message,
      });
      this.events.emit({
        runId,
        kind: FAILED[def.kind],
        actor: def.name,
        actorKind: def.kind,
        status: 'failed',
        message: `${err.name}: ${err.message}`,
        inputRef,
        outputRef,
        durationMs: round3(durationMs),
      });
      this.invocations.push({
        component: def.name,
        kind: def.kind,
        inputRef,
        outputRef,
        durationMs,
        ok: false,
      });
      throw err;
    }
  }
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
