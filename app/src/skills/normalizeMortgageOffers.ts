import type { ComponentContext, ComponentDefinition } from '../core/registry.js';
import type {
  FinancialProfile,
  MortgageOffer,
  NormalizedOffer,
  OfferValidation,
  PropertyPlan,
  ScenarioResult,
  Traced,
} from '../core/types.js';
import type { ScenarioInput } from '../tools/affordabilityScenarioEngine.js';

export interface NormalizeInput {
  profile: FinancialProfile;
  property: PropertyPlan;
  offers: MortgageOffer[];
  validations: OfferValidation[];
}

export interface NormalizeOutput {
  normalized: NormalizedOffer[];
  baseScenario: ScenarioResult;
  /** Etichette di riga nell ordine di visualizzazione di MutuoSpecchio. */
  rowOrder: string[];
}

export const ROW_ORDER = [
  'rataIniziale',
  'tan',
  'taegDichiarato',
  'durataAnni',
  'costoTotaleSimulato',
  'interessiTotaliSimulati',
  'costiIniziali',
  'liquiditaResidua',
  'rapportoRataReddito',
  'margineMensile',
  'tipoTasso',
  'sensibilitaScenari',
] as const;

export const ROW_LABELS: Record<string, string> = {
  rataIniziale: 'Rata iniziale',
  tan: 'TAN',
  taegDichiarato: 'TAEG dichiarato',
  durataAnni: 'Durata',
  costoTotaleSimulato: 'Costo totale simulato',
  interessiTotaliSimulati: 'Interessi totali simulati',
  costiIniziali: 'Costi iniziali',
  liquiditaResidua: 'Liquidità residua dopo l acquisto',
  rapportoRataReddito: 'Rapporto rata/reddito',
  margineMensile: 'Margine mensile',
  tipoTasso: 'Tipo di tasso',
  sensibilitaScenari: 'Sensibilità agli scenari',
};

const MISSING: Traced = { value: null, provenance: 'MISSING' };

/**
 * Porta tutte le offerte sullo stesso schema di righe, con provenienza
 * dichiarata su ogni valore. I numeri arrivano dai tool deterministici.
 */
export function normalizeMortgageOffers(
  input: NormalizeInput,
  ctx: ComponentContext,
): NormalizeOutput {
  const baseScenario = ctx.invoke<ScenarioInput, ScenarioResult>('AffordabilityScenarioEngine', {
    scenarioId: 'BASE',
    profile: input.profile,
    property: input.property,
    offers: input.offers,
    validations: input.validations,
  });

  const normalized: NormalizedOffer[] = input.offers.map((offer) => {
    const validation = input.validations.find((v) => v.offerId === offer.id);
    const scenarioRow = baseScenario.offers.find((o) => o.offerId === offer.id);
    const missingFields = validation?.missingFields ?? [];
    const insuranceMissing = missingFields.includes('insuranceCost');

    const upfrontKnown =
      (offer.arrangementFee ?? 0) + (offer.appraisalFee ?? 0) + (offer.otherUpfrontCosts ?? 0);

    const rows: Record<string, Traced> = {
      rataIniziale: scenarioRow?.monthlyPayment ?? MISSING,
      tan: traced(offer.tanPct, offer.provenance['tanPct']),
      taegDichiarato: traced(
        offer.declaredTaegPct,
        offer.provenance['declaredTaegPct'],
        insuranceMissing
          ? 'Dichiarato dall offerta. Include costi obbligatori che l offerta non elenca singolarmente.'
          : 'Dichiarato dall offerta, non ricalcolato da MutuoChiaro.',
      ),
      durataAnni: traced(offer.years, offer.provenance['years']),
      costoTotaleSimulato: scenarioRow?.totalCostSimulated ?? MISSING,
      interessiTotaliSimulati: scenarioRow?.totalInterestSimulated ?? MISSING,
      costiIniziali: insuranceMissing
        ? {
            value: upfrontKnown,
            provenance: 'SYNTHETIC_OFFER',
            note:
              'Parziale: istruttoria e perizia sono note, il costo della polizza obbligatoria non è presente nell offerta.',
          }
        : {
            value: upfrontKnown + (offer.insuranceCost ?? 0),
            provenance: 'SYNTHETIC_OFFER',
            note: 'Istruttoria + perizia + polizza obbligatoria + altri costi iniziali.',
          },
      liquiditaResidua: scenarioRow?.liquidityRemaining ?? MISSING,
      rapportoRataReddito: scenarioRow?.paymentToIncomePct ?? MISSING,
      margineMensile: scenarioRow?.monthlyMargin ?? MISSING,
      tipoTasso: {
        value: null,
        provenance: offer.rateType ? 'SYNTHETIC_OFFER' : 'MISSING',
        note: offer.rateType === 'FIXED' ? 'Fisso' : offer.rateType === 'VARIABLE' ? 'Variabile' : undefined,
      },
      sensibilitaScenari: {
        value: null,
        provenance: offer.rateType ? 'CALCULATED' : 'MISSING',
        note:
          offer.rateType === 'VARIABLE'
            ? 'La rata cambia nello scenario di aumento del tasso.'
            : offer.rateType === 'FIXED'
              ? 'La rata non cambia nello scenario di aumento del tasso; restano sensibili liquidità e margine.'
              : undefined,
      },
    };

    return {
      offerId: offer.id,
      displayName: offer.displayName,
      rateType: offer.rateType,
      partial: validation?.partial ?? false,
      missingFields,
      rows,
    };
  });

  return { normalized, baseScenario, rowOrder: [...ROW_ORDER] };
}

function traced(value: number | null, provenance: string | undefined, note?: string): Traced {
  if (value === null || value === undefined) return MISSING;
  return {
    value,
    provenance: (provenance as Traced['provenance']) ?? 'SYNTHETIC_OFFER',
    ...(note ? { note } : {}),
  };
}

export const normalizeMortgageOffersSkill: ComponentDefinition<NormalizeInput, NormalizeOutput> = {
  name: 'normalize-mortgage-offers',
  kind: 'skill',
  purpose:
    'Riporta tutte le offerte sullo stesso schema di righe con provenienza dichiarata, delegando i calcoli ai tool.',
  run: (input, ctx) => normalizeMortgageOffers(input, ctx),
};
