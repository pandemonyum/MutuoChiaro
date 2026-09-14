import type { Phase } from './types.js';

/** Il componente richiesto non esiste nel registry. */
export class ComponentNotFoundError extends Error {
  constructor(public readonly componentName: string) {
    super(`Componente non registrato: ${componentName}`);
    this.name = 'ComponentNotFoundError';
  }
}

/** Il componente esiste ma e' stato disabilitato (simulazione di tool non disponibile). */
export class ComponentUnavailableError extends Error {
  constructor(public readonly componentName: string) {
    super(`Componente non disponibile: ${componentName}`);
    this.name = 'ComponentUnavailableError';
  }
}

/** Transizione di stato non prevista dalla macchina a stati. */
export class IllegalTransitionError extends Error {
  constructor(
    public readonly from: Phase,
    public readonly to: Phase,
    public readonly reason: string,
  ) {
    super(`Transizione non consentita ${from} -> ${to}: ${reason}`);
    this.name = 'IllegalTransitionError';
  }
}

/** Dati in ingresso non validi (importi negativi, reddito nullo, durata impossibile). */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: { field: string; code: string; message: string }[],
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** Tentativo di mutare lo stato al di fuori dell'orchestratore. */
export class StateMutationError extends Error {
  constructor(public readonly componentName: string) {
    super(
      `${componentName} ha tentato di modificare lo stato globale: consentito solo all'orchestratore`,
    );
    this.name = 'StateMutationError';
  }
}
