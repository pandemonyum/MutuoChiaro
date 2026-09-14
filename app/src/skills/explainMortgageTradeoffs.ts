import type { ComponentDefinition } from '../core/registry.js';
import type { NormalizedOffer, OfferValidation, ScenarioResult } from '../core/types.js';

export interface ExplainInput {
  normalized: NormalizedOffer[];
  validations: OfferValidation[];
  scenarios: ScenarioResult[];
  emergencyFundMin: number | null;
  existingDebtsDeclared: boolean;
}

export interface ExplainOutput {
  /** Una nota per offerta, sempre descrittiva e mai comparativa in termini di merito. */
  perOffer: { offerId: string; lines: string[] }[];
  crossOffer: string[];
  missingDataNotes: string[];
  scenarioNotes: string[];
  disclaimers: string[];
}

const EUR = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const EUR2 = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const PCT = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

/**
 * Genera testi neutrali sui trade-off. Descrive fatti già calcolati dai tool:
 * non esegue formule, non ordina le offerte per merito, non inventa dati.
 */
export function explainMortgageTradeoffs(input: ExplainInput): ExplainOutput {
  const perOffer: { offerId: string; lines: string[] }[] = [];
  const crossOffer: string[] = [];
  const missingDataNotes: string[] = [];
  const scenarioNotes: string[] = [];

  const payments = input.normalized
    .map((o) => ({ id: o.offerId, name: o.displayName, value: o.rows['rataIniziale']?.value ?? null }))
    .filter((x): x is { id: string; name: string; value: number } => x.value !== null);
  const interests = input.normalized
    .map((o) => ({
      id: o.offerId,
      name: o.displayName,
      value: o.rows['interessiTotaliSimulati']?.value ?? null,
      partial: o.partial,
    }))
    .filter((x): x is { id: string; name: string; value: number; partial: boolean } => x.value !== null);

  const minPayment = payments.length > 0 ? Math.min(...payments.map((p) => p.value)) : null;
  const maxPayment = payments.length > 0 ? Math.max(...payments.map((p) => p.value)) : null;

  for (const offer of input.normalized) {
    const lines: string[] = [];
    const payment = offer.rows['rataIniziale']?.value ?? null;
    const years = offer.rows['durataAnni']?.value ?? null;
    const interest = offer.rows['interessiTotaliSimulati']?.value ?? null;
    const ratio = offer.rows['rapportoRataReddito']?.value ?? null;
    const margin = offer.rows['margineMensile']?.value ?? null;
    const liquidity = offer.rows['liquiditaResidua']?.value ?? null;
    const tan = offer.rows['tan']?.value ?? null;
    const taeg = offer.rows['taegDichiarato']?.value ?? null;

    if (payment !== null && minPayment !== null && payment === minPayment && payments.length > 1) {
      lines.push('Fra le offerte a confronto, questa presenta la rata iniziale più bassa.');
    }
    if (payment !== null && maxPayment !== null && payment === maxPayment && payments.length > 1) {
      lines.push('Fra le offerte a confronto, questa presenta la rata iniziale più alta.');
    }
    if (payment !== null && years !== null && interest !== null) {
      lines.push(
        `Con una durata di ${years} anni la rata è ${EUR2.format(payment)} e gli interessi totali simulati sono ${EUR.format(interest)}.`,
      );
    }
    if (tan !== null && taeg !== null) {
      const delta = Math.round((taeg - tan) * 100) / 100;
      lines.push(
        `Il TAN è ${PCT.format(tan)}% mentre il TAEG dichiarato è ${PCT.format(taeg)}%: la differenza di ${PCT.format(delta)} punti riflette i costi obbligatori inclusi nel TAEG e non nel TAN.`,
      );
    }
    if (ratio !== null) {
      lines.push(
        `La rata assorbe il ${PCT.format(ratio)}% delle entrate mensili dichiarate.`,
      );
    }
    if (margin !== null) {
      lines.push(
        input.existingDebtsDeclared
          ? `Dopo rate già attive e rata del mutuo, il margine mensile simulato è ${EUR2.format(margin)}.`
          : `Il margine mensile simulato è ${EUR2.format(margin)}, ma le rate già attive non sono ancora dichiarate: il valore reale sarà inferiore.`,
      );
    }
    if (liquidity !== null) {
      if (input.emergencyFundMin !== null && liquidity < input.emergencyFundMin) {
        lines.push(
          `Con questa offerta la liquidità residua dopo l acquisto è ${EUR.format(liquidity)}, quindi sotto la soglia di fondo di emergenza che hai impostato (${EUR.format(input.emergencyFundMin)}).`,
        );
      } else {
        lines.push(`La liquidità residua dopo l acquisto è ${EUR.format(liquidity)}.`);
      }
    }
    if (offer.rateType === 'VARIABLE') {
      lines.push(
        'Il tasso è variabile: è l unica tipologia fra queste la cui rata cambia direttamente nello scenario di aumento dei tassi.',
      );
    }
    if (offer.rateType === 'FIXED') {
      lines.push(
        'Il tasso è fisso: nello scenario di aumento dei tassi la rata resta invariata, mentre liquidità e margine restano sensibili agli altri scenari.',
      );
    }
    if (offer.missingFields.length > 0) {
      lines.push(
        `Attenzione: su questa offerta mancano ${offer.missingFields.length} dati (${offer.missingFields.join(', ')}). I valori che dipendono da quei dati sono mostrati come parziali.`,
      );
    }
    perOffer.push({ offerId: offer.offerId, lines });
  }

  // Osservazione trasversale su rata vs interessi, senza classifiche.
  if (payments.length > 1 && interests.length > 1) {
    const lowestPayment = payments.reduce((a, b) => (b.value < a.value ? b : a));
    const lowestInterest = interests.reduce((a, b) => (b.value < a.value ? b : a));
    if (lowestPayment.id !== lowestInterest.id) {
      crossOffer.push(
        `L offerta con la rata iniziale più bassa (${lowestPayment.name}) non è la stessa con gli interessi totali simulati più bassi (${lowestInterest.name}): rata mensile e costo complessivo sono due grandezze diverse.`,
      );
    } else {
      crossOffer.push(
        `In questo confronto ${lowestPayment.name} presenta sia la rata iniziale più bassa sia gli interessi totali simulati più bassi fra i valori calcolabili.`,
      );
    }
  }
  if (interests.some((i) => i.partial)) {
    crossOffer.push(
      'Alcuni costi totali sono parziali: il confronto sul costo complessivo non è completo fino a quando i dati mancanti non vengono forniti dalla banca.',
    );
  }

  for (const validation of input.validations) {
    if (validation.missingFields.length === 0) continue;
    const name = input.normalized.find((n) => n.offerId === validation.offerId)?.displayName ?? validation.offerId;
    missingDataNotes.push(
      `${name}: campi assenti ${validation.missingFields.join(', ')}. Confronti ancora possibili: ${validation.availableComparisons.join(', ')}. Confronti non possibili: ${validation.blockedComparisons.join(', ')}.`,
    );
    if (validation.questionForBank) {
      missingDataNotes.push(`${name} - domanda da porre alla banca: ${validation.questionForBank}`);
    }
  }

  for (const scenario of input.scenarios) {
    const changed = scenario.offers.filter(
      (o) => o.applicable && o.monthlyPayment.provenance === 'SCENARIO_ASSUMPTION',
    );
    const breached = scenario.offers.filter((o) => o.emergencyFundBreach === true);
    const parts: string[] = [`${scenario.label}:`];
    if (scenario.scenarioId === 'RATE_PLUS_2PP') {
      parts.push(
        changed.length > 0
          ? `la rata cambia per ${changed.map((c) => c.displayName).join(', ')}; per le altre offerte resta invariata.`
          : 'nessuna offerta a tasso variabile fra quelle a confronto, quindi nessuna rata cambia.',
      );
    }
    if (scenario.scenarioId === 'APPRAISAL_MINUS_10') {
      parts.push(
        'il valore di riferimento per il mutuo erogabile diventa la perizia ipotizzata: dove il limite prestito/valore viene superato, la differenza si trasforma in anticipo aggiuntivo e la liquidità necessaria aumenta.',
      );
    }
    if (scenario.scenarioId === 'INCOME_MINUS_20_6M') {
      parts.push(
        'la rata non cambia, ma il rapporto rata/reddito sale e il margine mensile scende; la differenza per sei mesi viene ipotizzata coperta con i risparmi.',
      );
    }
    if (breached.length > 0) {
      parts.push(
        `In questo scenario la liquidità residua scende sotto la soglia impostata per: ${breached.map((b) => b.displayName).join(', ')}.`,
      );
    }
    scenarioNotes.push(parts.join(' '));
  }

  return {
    perOffer,
    crossOffer,
    missingDataNotes,
    scenarioNotes,
    disclaimers: [
      'Tutti i dati e le offerte sono sintetici e servono solo a scopo educativo.',
      'La simulazione non rappresenta una proposta, una delibera bancaria o una raccomandazione finanziaria.',
      'MutuoChiaro non indica quale offerta scegliere: mostra i trade-off e lascia la decisione a te.',
    ],
  };
}

export const explainMortgageTradeoffsSkill: ComponentDefinition<ExplainInput, ExplainOutput> = {
  name: 'explain-mortgage-tradeoffs',
  kind: 'skill',
  purpose:
    'Traduce in linguaggio semplice i trade-off già calcolati dai tool, senza classifiche e senza inventare dati.',
  run: (input) => explainMortgageTradeoffs(input),
};
