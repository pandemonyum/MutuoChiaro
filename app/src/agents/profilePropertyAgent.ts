import type { ComponentContext, ComponentDefinition } from '../core/registry.js';
import { ValidationError } from '../core/errors.js';
import type {
  AgentEnvelope,
  DecisiveQuestion,
  FieldIssue,
  FinancialProfile,
  OfferValidation,
  PropertyPlan,
  RunState,
} from '../core/types.js';
import type { BuildProfileInput, BuildProfileOutput } from '../skills/buildFinancialProfile.js';
import type {
  SelectQuestionInput,
  SelectQuestionOutput,
} from '../skills/selectNextDecisiveQuestion.js';

/**
 * CONTRATTO - Profile & Property Agent
 *
 * purpose         Interpretare la situazione economica dichiarata e il piano di
 *                 acquisto, rilevare dati mancanti o contraddittori e proporre
 *                 la prossima domanda decisiva.
 * allowedInputs   snapshot congelato di profilo, immobile e validazioni offerte.
 * requiredOutputs AgentEnvelope con issues, derived, question, rationale,
 *                 summaryForUser, confidence, nextAction.
 * procedure       1) invoca la skill build-financial-profile;
 *                 2) invoca la skill select-next-decisive-question;
 *                 3) restituisce la busta senza toccare lo stato globale.
 * prohibitions    non calcola rate o interessi; non stima probabilità di
 *                 approvazione; non raccomanda banche; non modifica lo stato.
 * doneCondition   profilo privo di dati mancanti con impatto, oppure domanda
 *                 decisiva selezionata, oppure giri di domande esauriti.
 * fallback        su input non valido restituisce status human-review con gli
 *                 errori bloccanti, senza proseguire.
 */
export const PROFILE_AGENT_CONTRACT = Object.freeze({
  name: 'profile-property-agent',
  purpose:
    'Interpreta situazione economica e piano di acquisto, rileva dati mancanti o contraddittori, propone la prossima domanda decisiva.',
  allowedInputs: ['syntheticProfile', 'property', 'offerValidations', 'answeredQuestions', 'questionRounds'],
  requiredOutputs: ['issues', 'derived', 'question', 'rationale', 'summaryForUser'],
  procedure: ['build-financial-profile', 'select-next-decisive-question'],
  prohibitions: [
    'non calcola rate o interessi',
    'non stima probabilità di approvazione o finanziabilità',
    'non raccomanda una banca o una offerta',
    'non modifica direttamente lo stato globale',
  ],
  doneCondition:
    'Nessun dato mancante con impatto sul confronto, oppure domanda decisiva selezionata, oppure giri massimi esauriti.',
  fallback: 'status=human-review con elenco degli errori bloccanti.',
});

export interface ProfileAgentInput {
  profile: FinancialProfile;
  property: PropertyPlan;
  offerValidations: OfferValidation[];
  answeredQuestions: string[];
  questionRounds: number;
  maxQuestionRounds: number;
  offerNames: { offerId: string; displayName: string }[];
}

export interface ProfileAgentOutput {
  issues: FieldIssue[];
  derived: BuildProfileOutput['derived'];
  summaryForUser: string[];
  question: DecisiveQuestion | null;
  questionRationale: string;
  candidates: SelectQuestionOutput['candidates'];
  profileComplete: boolean;
  questionsExhausted: boolean;
}

export function runProfileAgent(
  input: ProfileAgentInput,
  ctx: ComponentContext,
): AgentEnvelope<ProfileAgentOutput> {
  let profileOut: BuildProfileOutput;
  try {
    profileOut = ctx.invoke<BuildProfileInput, BuildProfileOutput>('build-financial-profile', {
      profile: input.profile,
      property: input.property,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        agent: PROFILE_AGENT_CONTRACT.name,
        status: 'human-review',
        output: {
          issues: error.issues.map((i) => ({
            field: i.field,
            code: i.code as FieldIssue['code'],
            message: i.message,
            decisionImpact: 1,
          })),
          derived: {
            totalMonthlyIncome: null,
            downPayment: null,
            cashNeededBeforeOfferCosts: null,
            loanToPricePct: null,
          },
          summaryForUser: [
            'I dati inseriti contengono valori non ammessi: correggili per proseguire il confronto.',
          ],
          question: null,
          questionRationale: 'Nessuna domanda selezionata: prima vanno corretti i valori non validi.',
          candidates: [],
          profileComplete: false,
          questionsExhausted: false,
        },
        evidence: ['skill:build-financial-profile ha rifiutato l input'],
        issues: error.issues.map((i) => `${i.field}: ${i.message}`),
        prohibitionsRespected: [...PROFILE_AGENT_CONTRACT.prohibitions],
        confidence: 0,
        nextAction: 'CORRECT_PROFILE_INPUT',
        doneCondition: PROFILE_AGENT_CONTRACT.doneCondition,
      };
    }
    throw error;
  }

  const offerMissingFields = input.offerValidations.map((v) => ({
    offerId: v.offerId,
    displayName:
      input.offerNames.find((o) => o.offerId === v.offerId)?.displayName ?? v.offerId,
    fields: v.missingFields,
  }));

  const questionOut = ctx.invoke<SelectQuestionInput, SelectQuestionOutput>(
    'select-next-decisive-question',
    {
      issues: profileOut.issues,
      alreadyAnswered: input.answeredQuestions,
      offerMissingFields,
      round: input.questionRounds,
      maxRounds: input.maxQuestionRounds,
    },
  );

  for (const issue of profileOut.issues) {
    ctx.emit('missing_data.detected', `${issue.field}: ${issue.message}`);
  }
  if (questionOut.question) {
    ctx.emit(
      'question.selected',
      `${questionOut.question.field} - ${questionOut.question.question}`,
    );
  }

  const status: AgentEnvelope['status'] = questionOut.question
    ? 'needs-data'
    : profileOut.complete
      ? 'success'
      : 'fallback';

  // Confidenza: quota di dati con impatto effettivamente disponibili.
  const totalImpact = 10;
  const missingImpact = profileOut.issues.reduce((acc, i) => acc + i.decisionImpact, 0);
  const confidence = Math.max(0, Math.min(1, 1 - missingImpact / totalImpact));

  return {
    agent: PROFILE_AGENT_CONTRACT.name,
    status,
    output: {
      issues: profileOut.issues,
      derived: profileOut.derived,
      summaryForUser: profileOut.summaryForUser,
      question: questionOut.question,
      questionRationale: questionOut.rationale,
      candidates: questionOut.candidates,
      profileComplete: profileOut.complete,
      questionsExhausted: questionOut.exhausted,
    },
    evidence: [
      'skill:build-financial-profile',
      'skill:select-next-decisive-question',
      `dati mancanti rilevati: ${profileOut.issues.length}`,
    ],
    issues: profileOut.issues.map((i) => `${i.field}: ${i.message}`),
    prohibitionsRespected: [...PROFILE_AGENT_CONTRACT.prohibitions],
    confidence: Math.round(confidence * 100) / 100,
    nextAction: questionOut.question
      ? 'ASK_DECISIVE_QUESTION'
      : questionOut.exhausted
        ? 'PROCEED_WITH_PARTIAL_PROFILE'
        : 'NORMALIZE_OFFERS',
    doneCondition: PROFILE_AGENT_CONTRACT.doneCondition,
  };
}

export const profilePropertyAgent: ComponentDefinition<
  ProfileAgentInput,
  AgentEnvelope<ProfileAgentOutput>
> = {
  name: PROFILE_AGENT_CONTRACT.name,
  kind: 'agent',
  purpose: PROFILE_AGENT_CONTRACT.purpose,
  run: (input, ctx) => runProfileAgent(input, ctx),
};

/** Usato dai test per verificare che l agente riceva solo uno snapshot congelato. */
export function isFrozenSnapshot(state: Readonly<RunState>): boolean {
  return Object.isFrozen(state) && Object.isFrozen(state.syntheticProfile);
}
