import type { ComponentKind, EventKind, Phase, RuntimeEvent } from './types.js';

export interface EmitInput {
  runId: string;
  kind: EventKind;
  actor: string;
  actorKind: ComponentKind | 'orchestrator' | 'human' | 'system';
  status: RuntimeEvent['status'];
  message: string;
  inputRef?: string;
  outputRef?: string;
  durationMs?: number;
  phaseAfter?: Phase;
}

/**
 * Stream di eventi append-only. La Traccia agentica della UI legge da qui:
 * nessun evento e' scritto a mano o precompilato.
 */
export class EventBus {
  private readonly events: RuntimeEvent[] = [];
  /** Numerazione progressiva per run: la traccia di un run parte sempre da 1. */
  private readonly seqByRun = new Map<string, number>();
  private readonly listeners: ((e: RuntimeEvent) => void)[] = [];

  emit(input: EmitInput): RuntimeEvent {
    const seq = (this.seqByRun.get(input.runId) ?? 0) + 1;
    this.seqByRun.set(input.runId, seq);
    const event: RuntimeEvent = {
      seq,
      ts: new Date().toISOString(),
      ...input,
    };
    this.events.push(event);
    for (const listener of this.listeners) listener(event);
    return event;
  }

  onEvent(listener: (e: RuntimeEvent) => void): void {
    this.listeners.push(listener);
  }

  byRun(runId: string): RuntimeEvent[] {
    return this.events.filter((e) => e.runId === runId);
  }

  all(): RuntimeEvent[] {
    return [...this.events];
  }

  countByKind(runId: string, kind: EventKind): number {
    return this.events.filter((e) => e.runId === runId && e.kind === kind).length;
  }
}
