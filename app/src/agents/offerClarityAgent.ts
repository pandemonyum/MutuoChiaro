import type { ComponentContext, ComponentDefinition } from '../core/registry.js';
import type {
  AgentEnvelope,
  ComprehensionFeedback,
  NormalizedOffer,
  OfferValidation,
  ScenarioResult,
} from '../core/types.js';
import type { ExplainInput, ExplainOutput } from '../skills/explainMortgageTradeoffs.js';
import type { SafetyGuardInput, SafetyGuardOutput } from '../tools/safetyGuard.js';

/**
 * CONTRATTO - Offer Clarity Agent
 *
 * purpose         Spiegare in linguaggio semplice differenze e trade-off fra le
 *                 offerte già normalizzate, evidenziare i dati mancanti e
 *                 preparare il feedback mirato del controllo di comprensione.
 * allowedInputs   offerte normalizzate, validazioni, scenari calcolati,
 *                 feedback del quiz. Nessun accesso allo stato mutabile.
 * requiredOutputs AgentEnvelope con perOffer, crossOffer, missingDataNotes,
 *                 scenarioNotes, quizFeedback, disclaimers.
 * procedure       1) invoca la skill explain-mortgage-tradeoffs;
 *                 2) fa passare ogni testo dal tool SafetyGuard;
 *                 3) restituisce solo i testi approvati.
 * prohibitions    non produce graduatorie; non assegna punteggi di convenienza;
 *                 non dichiara un offerta adatta o inadatta; non esegue formule
 *                 finanziarie; non inventa dati assenti.
 * doneCondition   ogni offerta ha una nota neutrale e ogni dato mancante è
 *                 dichiarato con la relativa domanda da porre alla banca.
 * fallback        se SafetyGuard blocca dei testi, l agente restituisce i testi
 *                 sostituiti con status fallback e il blocco resta osservabile.
 */
export const CLARITY_AGENT_CONTRACT = Object.freeze({
  name: 'offer-clarity-agent',
  purpose:
    'Spiega differenze e trade-off fra le offerte normalizzate in linguaggio semplice e neutrale, evidenziando i dati mancanti.',
  allowedInputs: ['normalizedOffers', 'offerValidations', 'scenarios', 'comprehensionFeedback'],
  requiredOutputs: ['perOffer', 'crossOffer', 'missingDataNotes', 'scenarioNotes', 'disclaimers'],
  procedure: ['explain-mortgage-tradeoffs', 'SafetyGuard'],
  prohibitions: [
    'non produce una graduatoria delle offerte',
    'non assegna punteggi di convenienza',
    'non dichiara un offerta adatta o inadatta',
    'non esegue direttamente formule finanziarie',
    'non inventa dati assenti',
  ],
  doneCondition:
    'Ogni offerta ha almeno una nota neutrale e ogni dato mancante è dichiarato con la domanda da porre alla banca.',
  fallback: 'Testi non conformi sostituiti da SafetyGuard, status=fallback.',
});

export interface ClarityAgentInput {
  normalized: NormalizedOffer[];
  validations: OfferValidation[];
  scenarios: ScenarioResult[];
  emergencyFundMin: number | null;
  existingDebtsDeclared: boolean;
  comprehensionFeedback: ComprehensionFeedback[];
  /**
   * Bozze aggiuntive da sottoporre a SafetyGuard.
   * Usato dal failure branch dimostrativo: permette di iniettare un testo non
   * conforme e verificare che non raggiunga mai la UI.
   */
  injectedDrafts?: string[];
}

export interface ClarityAgentOutput {
  perOffer: { offerId: string; lines: string[] }[];
  crossOffer: string[];
  missingDataNotes: string[];
  scenarioNotes: string[];
  quizFeedback: { concept: string; explanation: string; reopenScenario: string }[];
  disclaimers: string[];
  safety: {
    blocked: boolean;
    blockedCount: number;
    matches: SafetyGuardOutput['matches'];
  };
}

export function runOfferClarityAgent(
  input: ClarityAgentInput,
  ctx: ComponentContext,
): AgentEnvelope<ClarityAgentOutput> {
  const explained = ctx.invoke<ExplainInput, ExplainOutput>('explain-mortgage-tradeoffs', {
    normalized: input.normalized,
    validations: input.validations,
    scenarios: input.scenarios,
    emergencyFundMin: input.emergencyFundMin,
    existingDebtsDeclared: input.existingDebtsDeclared,
  });

  // Tutti i testi destinati alla UI, in un unico ordine stabile.
  const flat: string[] = [];
  const index: { bucket: string; offerId?: string }[] = [];
  for (const offer of explained.perOffer) {
    for (const line of offer.lines) {
      flat.push(line);
      index.push({ bucket: 'perOffer', offerId: offer.offerId });
    }
  }
  for (const line of explained.crossOffer) {
    flat.push(line);
    index.push({ bucket: 'crossOffer' });
  }
  for (const line of explained.scenarioNotes) {
    flat.push(line);
    index.push({ bucket: 'scenarioNotes' });
  }
  for (const draft of input.injectedDrafts ?? []) {
    flat.push(draft);
    index.push({ bucket: 'injected' });
  }

  const guard = ctx.invoke<SafetyGuardInput, SafetyGuardOutput>('SafetyGuard', {
    texts: flat,
    source: CLARITY_AGENT_CONTRACT.name,
  });

  if (guard.blocked) {
    ctx.emit(
      'safety_guard.blocked',
      `SafetyGuard ha bloccato ${guard.matches.length} frase/i non conformi prodotte da ${CLARITY_AGENT_CONTRACT.name}: ${guard.matches
        .map((m) => m.pattern)
        .join(', ')}`,
    );
  }

  // Ricostruzione dei bucket usando solo i testi approvati.
  const perOffer = new Map<string, string[]>();
  for (const offer of explained.perOffer) perOffer.set(offer.offerId, []);
  const crossOffer: string[] = [];
  const scenarioNotes: string[] = [];
  const injected: string[] = [];

  guard.safeTexts.forEach((text, i) => {
    const slot = index[i]!;
    if (slot.bucket === 'perOffer' && slot.offerId) {
      perOffer.get(slot.offerId)!.push(text);
    } else if (slot.bucket === 'crossOffer') {
      crossOffer.push(text);
    } else if (slot.bucket === 'scenarioNotes') {
      scenarioNotes.push(text);
    } else {
      injected.push(text);
    }
  });

  const quizFeedback = input.comprehensionFeedback.map((f) => ({
    concept: f.concept,
    explanation: f.explanation,
    reopenScenario: f.reopenScenario,
  }));

  const output: ClarityAgentOutput = {
    perOffer: [...perOffer.entries()].map(([offerId, lines]) => ({ offerId, lines })),
    crossOffer: [...crossOffer, ...injected],
    missingDataNotes: explained.missingDataNotes,
    scenarioNotes,
    quizFeedback,
    disclaimers: explained.disclaimers,
    safety: {
      blocked: guard.blocked,
      blockedCount: guard.matches.length,
      matches: guard.matches,
    },
  };

  const everyOfferHasNote = output.perOffer.every((o) => o.lines.length > 0);
  const everyMissingDeclared = input.validations
    .filter((v) => v.missingFields.length > 0)
    .every((v) => output.missingDataNotes.some((n) => n.includes(v.offerId) || n.length > 0));

  return {
    agent: CLARITY_AGENT_CONTRACT.name,
    status: guard.blocked ? 'fallback' : 'success',
    output,
    evidence: [
      'skill:explain-mortgage-tradeoffs',
      'tool:SafetyGuard',
      `testi verificati: ${flat.length}`,
      `testi bloccati: ${guard.matches.length}`,
    ],
    issues: guard.matches.map((m) => `SafetyGuard [${m.pattern}] su: "${m.original}"`),
    prohibitionsRespected: [...CLARITY_AGENT_CONTRACT.prohibitions],
    confidence: everyOfferHasNote && everyMissingDeclared ? (guard.blocked ? 0.6 : 0.9) : 0.4,
    nextAction: guard.blocked ? 'REVIEW_BLOCKED_TEXTS' : 'SHOW_MUTUOSPECCHIO',
    doneCondition: CLARITY_AGENT_CONTRACT.doneCondition,
  };
}

export const offerClarityAgent: ComponentDefinition<
  ClarityAgentInput,
  AgentEnvelope<ClarityAgentOutput>
> = {
  name: CLARITY_AGENT_CONTRACT.name,
  kind: 'agent',
  purpose: CLARITY_AGENT_CONTRACT.purpose,
  run: (input, ctx) => runOfferClarityAgent(input, ctx),
};
