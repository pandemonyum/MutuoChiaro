import type { ComponentDefinition } from '../core/registry.js';
import type { DecisiveQuestion, FieldIssue } from '../core/types.js';

export interface SelectQuestionInput {
  issues: FieldIssue[];
  alreadyAnswered: string[];
  /** Dati mancanti rilevati sulle offerte: entrano nella stessa graduatoria. */
  offerMissingFields: { offerId: string; displayName: string; fields: string[] }[];
  round: number;
  maxRounds: number;
}

export interface SelectQuestionOutput {
  question: DecisiveQuestion | null;
  /** Ragionamento esplicito sulla scelta, mostrabile in UI. */
  rationale: string;
  candidates: { field: string; decisionImpact: number; reason: string }[];
  exhausted: boolean;
}

interface QuestionTemplate {
  id: string;
  field: string;
  question: string;
  why: string;
  inputType: 'number' | 'boolean';
  unit?: string;
}

const TEMPLATES: Record<string, QuestionTemplate> = {
  existingMonthlyDebts: {
    id: 'q-existing-debts',
    field: 'existingMonthlyDebts',
    question:
      'Hai prestiti, finanziamenti o altre rate mensili già attive? Questo dato incide sul margine che rimane dopo il pagamento del mutuo.',
    why: 'Senza questo dato il margine mensile calcolato è più alto di quello reale, e il confronto fra le offerte risulta distorto.',
    inputType: 'number',
    unit: '€/mese',
  },
  monthlyNetIncome: {
    id: 'q-income',
    field: 'monthlyNetIncome',
    question: 'Qual è il tuo reddito netto mensile?',
    why: 'Il reddito è il denominatore del rapporto rata/reddito e del margine mensile: senza di esso nessun confronto è calcolabile.',
    inputType: 'number',
    unit: '€/mese',
  },
  savings: {
    id: 'q-savings',
    field: 'savings',
    question: 'A quanto ammontano i risparmi che puoi destinare a questo acquisto?',
    why: 'I risparmi determinano la liquidità residua dopo l acquisto e il confronto con il fondo di emergenza.',
    inputType: 'number',
    unit: '€',
  },
  emergencyFundMin: {
    id: 'q-emergency',
    field: 'emergencyFundMin',
    question: 'Quale somma vuoi conservare come fondo di emergenza dopo l acquisto?',
    why: 'È la soglia che imposti tu: serve a capire in quali scenari la liquidità residua scende sotto quel livello.',
    inputType: 'number',
    unit: '€',
  },
  accessoryCosts: {
    id: 'q-accessory',
    field: 'accessoryCosts',
    question: 'Quanto hai stimato per le spese accessorie dell acquisto?',
    why: 'Le spese accessorie riducono la liquidità disponibile il giorno del rogito.',
    inputType: 'number',
    unit: '€',
  },
  plannedWorks: {
    id: 'q-works',
    field: 'plannedWorks',
    question: 'Hai previsto lavori sull immobile? Per quale importo?',
    why: 'I lavori competono con lo stesso denaro dell anticipo e delle spese accessorie.',
    inputType: 'number',
    unit: '€',
  },
  assumedYears: {
    id: 'q-years',
    field: 'assumedYears',
    question: 'Su quale durata vuoi ragionare per il confronto?',
    why: 'La durata cambia rata e interessi totali: è il parametro che più sposta il confronto fra offerte.',
    inputType: 'number',
    unit: 'anni',
  },
  requestedLoanAmount: {
    id: 'q-loan',
    field: 'requestedLoanAmount',
    question: 'Quale importo di mutuo vuoi mettere a confronto?',
    why: 'L importo determina anticipo, rata e liquidità necessaria.',
    inputType: 'number',
    unit: '€',
  },
  otherMonthlyIncome: {
    id: 'q-other-income',
    field: 'otherMonthlyIncome',
    question: 'Ci sono altre entrate mensili nel nucleo familiare?',
    why: 'Altre entrate modificano il rapporto rata/reddito e il margine mensile.',
    inputType: 'number',
    unit: '€/mese',
  },
};

/**
 * Seleziona la singola domanda con il maggiore impatto sul confronto.
 * Non è un questionario fisso: la graduatoria dipende dallo stato corrente,
 * dai dati mancanti del profilo e da quelli rilevati sulle offerte.
 */
export function selectNextDecisiveQuestion(input: SelectQuestionInput): SelectQuestionOutput {
  const candidates: { field: string; decisionImpact: number; reason: string }[] = [];

  for (const issue of input.issues) {
    if (input.alreadyAnswered.includes(issue.field)) continue;
    if (!TEMPLATES[issue.field]) continue;
    candidates.push({
      field: issue.field,
      decisionImpact: issue.decisionImpact,
      reason: issue.message,
    });
  }

  for (const offer of input.offerMissingFields) {
    for (const field of offer.fields) {
      candidates.push({
        field: `offer:${offer.offerId}:${field}`,
        // I dati mancanti nelle offerte si chiedono alla banca, non all utente:
        // restano in graduatoria con impatto dichiarato ma non generano domande utente.
        decisionImpact: 0.5,
        reason: `${offer.displayName}: campo ${field} non presente nell offerta, da chiedere alla banca.`,
      });
    }
  }

  candidates.sort((a, b) => b.decisionImpact - a.decisionImpact);

  if (input.round >= input.maxRounds) {
    return {
      question: null,
      rationale: `Raggiunto il numero massimo di domande consecutive (${input.maxRounds}): il confronto prosegue con i dati disponibili e i dati mancanti restano segnalati.`,
      candidates,
      exhausted: true,
    };
  }

  const userAnswerable = candidates.find((c) => !c.field.startsWith('offer:'));
  if (!userAnswerable) {
    return {
      question: null,
      rationale:
        'Nessun dato del profilo con impatto sul confronto risulta mancante: i dati ancora assenti riguardano le offerte e vanno chiesti alla banca.',
      candidates,
      exhausted: false,
    };
  }

  const template = TEMPLATES[userAnswerable.field]!;
  return {
    question: {
      id: template.id,
      field: template.field,
      question: template.question,
      why: template.why,
      inputType: template.inputType,
      ...(template.unit ? { unit: template.unit } : {}),
      decisionImpact: userAnswerable.decisionImpact,
    },
    rationale: `Fra ${candidates.length} dati mancanti, "${userAnswerable.field}" ha l impatto dichiarato più alto (${userAnswerable.decisionImpact}) sul confronto fra le offerte.`,
    candidates,
    exhausted: false,
  };
}

export const selectNextDecisiveQuestionSkill: ComponentDefinition<
  SelectQuestionInput,
  SelectQuestionOutput
> = {
  name: 'select-next-decisive-question',
  kind: 'skill',
  purpose:
    'Ordina i dati mancanti per impatto sul confronto e seleziona la singola prossima domanda decisiva.',
  run: (input) => selectNextDecisiveQuestion(input),
};
