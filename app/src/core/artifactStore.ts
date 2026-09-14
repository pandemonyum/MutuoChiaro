import { createHash } from 'node:crypto';

export interface Artifact {
  ref: string;
  runId: string;
  component: string;
  direction: 'input' | 'output';
  ts: string;
  payload: unknown;
}

/**
 * Store degli artifact di input/output di ogni invocazione.
 * Ogni ref e' citabile nella Traccia agentica e apribile dalla UI.
 */
export class ArtifactStore {
  private readonly items = new Map<string, Artifact>();
  private counter = 0;

  put(runId: string, component: string, direction: 'input' | 'output', payload: unknown): string {
    this.counter += 1;
    const serialized = safeStringify(payload);
    const digest = createHash('sha256').update(serialized).digest('hex').slice(0, 8);
    const ref = `art:${direction === 'input' ? 'in' : 'out'}:${String(this.counter).padStart(4, '0')}:${digest}`;
    this.items.set(ref, {
      ref,
      runId,
      component,
      direction,
      ts: new Date().toISOString(),
      payload: JSON.parse(serialized) as unknown,
    });
    return ref;
  }

  get(ref: string): Artifact | undefined {
    return this.items.get(ref);
  }

  listByRun(runId: string): Artifact[] {
    return [...this.items.values()].filter((a) => a.runId === runId);
  }

  get size(): number {
    return this.items.size;
  }
}

function safeStringify(payload: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(
    payload,
    (_key, value: unknown) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[circular]';
        seen.add(value);
      }
      if (typeof value === 'bigint') return value.toString();
      if (value instanceof Error) return { name: value.name, message: value.message };
      return value;
    },
    2,
  );
}
