import type { ComponentDefinition } from '../core/registry.js';
import type { FieldIssue, MortgageOffer, OfferValidation, Provenance } from '../core/types.js';

export interface OfferValidatorInput {
  offers: MortgageOffer[];
}

export interface OfferValidatorOutput {
  validations: OfferValidation[];
  anyPartial: boolean;
  anyInvalid: boolean;
}

interface FieldSpec {
  field: keyof MortgageOffer;
  type: 'number' | 'boolean' | 'enum';
  required: boolean;
  min?: number;
  max?: number;
  enumValues?: string[];
  /** Confronti che diventano impossibili se il campo manca. */
  blocks: string[];
  bankQuestion?: string;
}

const SPECS: readonly FieldSpec[] = [
  { field: 'amount', type: 'number', required: true, min: 1, max: 5_000_000, blocks: ['rata', 'costo totale simulato', 'liquidità necessaria'] },
  { field: 'years', type: 'number', required: true, min: 1, max: 40, blocks: ['rata', 'costo totale simulato'] },
  { field: 'rateType', type: 'enum', required: true, enumValues: ['FIXED', 'VARIABLE'], blocks: ['sensibilità agli scenari di tasso'] },
  { field: 'tanPct', type: 'number', required: true, min: 0, max: 25, blocks: ['rata', 'interessi totali simulati'] },
  { field: 'declaredTaegPct', type: 'number', required: true, min: 0, max: 30, blocks: ['confronto fra TAN e TAEG dichiarato'] },
  { field: 'arrangementFee', type: 'number', required: true, min: 0, max: 50_000, blocks: ['costi iniziali'] },
  { field: 'appraisalFee', type: 'number', required: true, min: 0, max: 10_000, blocks: ['costi iniziali'] },
  { field: 'insuranceRequired', type: 'boolean', required: true, blocks: ['costi iniziali'] },
  { field: 'maxLtvPct', type: 'number', required: false, min: 10, max: 100, blocks: ['scenario di perizia inferiore'] },
];

/**
 * Validatore di schema delle offerte: campi obbligatori, tipi, intervalli,
 * incongruenze e provenienza. Non completa e non inventa alcun dato assente.
 */
export function validateOffers(input: OfferValidatorInput): OfferValidatorOutput {
  const validations = input.offers.map((offer) => validateOffer(offer));
  return {
    validations,
    anyPartial: validations.some((v) => v.partial),
    anyInvalid: validations.some((v) => !v.valid && !v.partial),
  };
}

function validateOffer(offer: MortgageOffer): OfferValidation {
  const missingFields: string[] = [];
  const typeErrors: FieldIssue[] = [];
  const inconsistencies: FieldIssue[] = [];
  const blockedComparisons = new Set<string>();
  let questionForBank: string | null = null;

  for (const spec of SPECS) {
    const value = offer[spec.field] as unknown;
    if (value === null || value === undefined) {
      if (spec.required) {
        missingFields.push(String(spec.field));
        for (const b of spec.blocks) blockedComparisons.add(b);
      }
      continue;
    }
    if (spec.type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        typeErrors.push({
          field: String(spec.field),
          code: 'NOT_A_NUMBER',
          message: `${String(spec.field)}: atteso un numero.`,
          decisionImpact: 0.6,
        });
        continue;
      }
      if (spec.min !== undefined && value < spec.min) {
        typeErrors.push({
          field: String(spec.field),
          code: value < 0 ? 'NEGATIVE' : 'OUT_OF_RANGE',
          message: `${String(spec.field)}: valore ${value} fuori dall intervallo ammesso (min ${spec.min}).`,
          decisionImpact: 0.7,
        });
      }
      if (spec.max !== undefined && value > spec.max) {
        typeErrors.push({
          field: String(spec.field),
          code: 'OUT_OF_RANGE',
          message: `${String(spec.field)}: valore ${value} fuori dall intervallo ammesso (max ${spec.max}).`,
          decisionImpact: 0.7,
        });
      }
    }
    if (spec.type === 'boolean' && typeof value !== 'boolean') {
      typeErrors.push({
        field: String(spec.field),
        code: 'NOT_A_NUMBER',
        message: `${String(spec.field)}: atteso un valore vero/falso.`,
        decisionImpact: 0.5,
      });
    }
    if (spec.type === 'enum' && !spec.enumValues?.includes(String(value))) {
      typeErrors.push({
        field: String(spec.field),
        code: 'OUT_OF_RANGE',
        message: `${String(spec.field)}: valore non previsto (${String(value)}).`,
        decisionImpact: 0.8,
      });
    }
  }

  // Polizza dichiarata obbligatoria ma senza costo: dato mancante, non stimabile.
  if (offer.insuranceRequired === true && (offer.insuranceCost === null || offer.insuranceCost === undefined)) {
    missingFields.push('insuranceCost');
    blockedComparisons.add('costo totale simulato completo');
    blockedComparisons.add('confronto dei costi iniziali complessivi');
    questionForBank =
      'Qual è il costo della polizza assicurativa indicata come obbligatoria, e come viene pagata (una tantum, annuale o inclusa nella rata)?';
    inconsistencies.push({
      field: 'insuranceCost',
      code: 'MISSING',
      message:
        'La polizza è indicata come obbligatoria ma il costo non è presente nell offerta: il costo totale resta parziale.',
      decisionImpact: 0.9,
    });
  }

  // TAEG dichiarato inferiore al TAN: incongruenza formale.
  if (
    typeof offer.declaredTaegPct === 'number' &&
    typeof offer.tanPct === 'number' &&
    offer.declaredTaegPct < offer.tanPct
  ) {
    inconsistencies.push({
      field: 'declaredTaegPct',
      code: 'INCONSISTENT',
      message:
        'Il TAEG dichiarato risulta inferiore al TAN: il TAEG include il TAN più i costi, quindi non può essere minore.',
      decisionImpact: 0.8,
    });
  }

  // Rata dichiarata molto distante dalla rata ricalcolabile: segnalata, non corretta.
  if (
    typeof offer.declaredInitialPayment === 'number' &&
    typeof offer.amount === 'number' &&
    typeof offer.years === 'number' &&
    typeof offer.tanPct === 'number'
  ) {
    const i = offer.tanPct / 100 / 12;
    const n = Math.round(offer.years * 12);
    const expected = i === 0 ? offer.amount / n : (offer.amount * i) / (1 - Math.pow(1 + i, -n));
    if (Math.abs(expected - offer.declaredInitialPayment) > Math.max(5, expected * 0.02)) {
      inconsistencies.push({
        field: 'declaredInitialPayment',
        code: 'INCONSISTENT',
        message:
          'La rata dichiarata non coincide con la rata ricalcolata da importo, TAN e durata: entrambi i valori sono mostrati senza sostituzioni.',
        decisionImpact: 0.5,
      });
    }
  }

  // Provenienza obbligatoria su ogni campo valorizzato.
  const provenanceGaps = missingProvenance(offer);
  for (const field of provenanceGaps) {
    inconsistencies.push({
      field,
      code: 'MISSING',
      message: `Provenienza non dichiarata per il campo ${field}.`,
      decisionImpact: 0.2,
    });
  }

  const essentialMissing = missingFields.filter((f) =>
    ['amount', 'years', 'rateType', 'tanPct'].includes(f),
  );
  const valid = missingFields.length === 0 && typeErrors.length === 0;
  const partial = !valid && essentialMissing.length === 0 && typeErrors.length === 0;

  const allComparisons = [
    'rata iniziale',
    'TAN',
    'TAEG dichiarato',
    'durata',
    'interessi totali simulati',
    'costo totale simulato completo',
    'liquidità residua',
    'rapporto rata/reddito',
    'margine mensile',
    'sensibilità agli scenari di tasso',
  ];
  const blocked = [...blockedComparisons];
  const available = allComparisons.filter((c) => !blocked.includes(c));

  return {
    offerId: offer.id,
    valid,
    partial,
    missingFields: [...new Set(missingFields)],
    inconsistencies,
    typeErrors,
    blockedComparisons: blocked,
    availableComparisons: available,
    questionForBank,
  };
}

function missingProvenance(offer: MortgageOffer): string[] {
  const tracked: (keyof MortgageOffer)[] = [
    'amount',
    'years',
    'rateType',
    'tanPct',
    'declaredTaegPct',
    'declaredInitialPayment',
    'arrangementFee',
    'appraisalFee',
    'otherUpfrontCosts',
    'insuranceRequired',
    'insuranceCost',
    'recurringMonthlyCost',
    'maxLtvPct',
  ];
  const gaps: string[] = [];
  for (const field of tracked) {
    const value = offer[field] as unknown;
    if (value === null || value === undefined) continue;
    const provenance: Provenance | undefined = offer.provenance[String(field)];
    if (!provenance) gaps.push(String(field));
  }
  return gaps;
}

export const offerSchemaValidatorTool: ComponentDefinition<OfferValidatorInput, OfferValidatorOutput> =
  {
    name: 'OfferSchemaValidator',
    kind: 'tool',
    purpose:
      'Verifica campi obbligatori, tipi, intervalli, incongruenze e provenienza delle offerte sintetiche senza completare i dati assenti.',
    run: (input) => validateOffers(input),
  };
