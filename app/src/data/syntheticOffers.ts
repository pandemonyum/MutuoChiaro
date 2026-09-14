import type { MortgageOffer } from '../core/types.js';

/**
 * OFFERTE SINTETICHE - nomi e condizioni inventati a scopo didattico.
 * Nessuna banca reale, nessuno scraping, nessuna API esterna.
 *
 * Offerta C contiene volutamente una polizza dichiarata obbligatoria
 * SENZA il relativo costo: è il failure branch del prototipo.
 */
export function buildSyntheticOffers(): MortgageOffer[] {
  return [
    {
      id: 'offer-a',
      displayName: 'Stabilità 20',
      bankName: 'Banca Aurora',
      code: 'SA',
      syntheticData: true,
      amount: 220_000,
      years: 20,
      rateType: 'FIXED',
      tanPct: 3.1,
      declaredTaegPct: 3.38,
      declaredInitialPayment: 1230.9,
      arrangementFee: 500,
      appraisalFee: 320,
      otherUpfrontCosts: 0,
      insuranceRequired: true,
      insuranceCost: 1450,
      recurringMonthlyCost: 0,
      maxLtvPct: 80,
      provenance: {
        amount: 'SYNTHETIC_OFFER',
        years: 'SYNTHETIC_OFFER',
        rateType: 'SYNTHETIC_OFFER',
        tanPct: 'SYNTHETIC_OFFER',
        declaredTaegPct: 'SYNTHETIC_OFFER',
        declaredInitialPayment: 'SYNTHETIC_OFFER',
        arrangementFee: 'SYNTHETIC_OFFER',
        appraisalFee: 'SYNTHETIC_OFFER',
        otherUpfrontCosts: 'SYNTHETIC_OFFER',
        insuranceRequired: 'SYNTHETIC_OFFER',
        insuranceCost: 'SYNTHETIC_OFFER',
        recurringMonthlyCost: 'SYNTHETIC_OFFER',
        maxLtvPct: 'SYNTHETIC_OFFER',
      },
      notes: 'Durata più breve fra le tre offerte sintetiche.',
    },
    {
      id: 'offer-b',
      displayName: 'Casa Lunga 30',
      bankName: 'Banca Quercia',
      code: 'CL',
      syntheticData: true,
      amount: 220_000,
      years: 30,
      rateType: 'FIXED',
      tanPct: 3.45,
      declaredTaegPct: 3.72,
      declaredInitialPayment: 981.7,
      arrangementFee: 350,
      appraisalFee: 300,
      otherUpfrontCosts: 0,
      insuranceRequired: true,
      insuranceCost: 1900,
      recurringMonthlyCost: 2,
      maxLtvPct: 80,
      provenance: {
        amount: 'SYNTHETIC_OFFER',
        years: 'SYNTHETIC_OFFER',
        rateType: 'SYNTHETIC_OFFER',
        tanPct: 'SYNTHETIC_OFFER',
        declaredTaegPct: 'SYNTHETIC_OFFER',
        declaredInitialPayment: 'SYNTHETIC_OFFER',
        arrangementFee: 'SYNTHETIC_OFFER',
        appraisalFee: 'SYNTHETIC_OFFER',
        otherUpfrontCosts: 'SYNTHETIC_OFFER',
        insuranceRequired: 'SYNTHETIC_OFFER',
        insuranceCost: 'SYNTHETIC_OFFER',
        recurringMonthlyCost: 'SYNTHETIC_OFFER',
        maxLtvPct: 'SYNTHETIC_OFFER',
      },
      notes: 'Durata più lunga fra le offerte a tasso fisso sintetiche.',
    },
    {
      id: 'offer-c',
      displayName: 'Orizzonte Variabile',
      bankName: 'Banca Cedro',
      code: 'OV',
      syntheticData: true,
      amount: 220_000,
      years: 30,
      rateType: 'VARIABLE',
      tanPct: 2.65,
      declaredTaegPct: 2.95,
      declaredInitialPayment: 886.2,
      arrangementFee: 0,
      appraisalFee: 350,
      otherUpfrontCosts: 0,
      insuranceRequired: true,
      // FAILURE BRANCH: polizza obbligatoria, costo non indicato nell offerta.
      // Il valore resta null: il sistema non lo stima e non lo inventa.
      insuranceCost: null,
      recurringMonthlyCost: 3,
      maxLtvPct: 75,
      provenance: {
        amount: 'SYNTHETIC_OFFER',
        years: 'SYNTHETIC_OFFER',
        rateType: 'SYNTHETIC_OFFER',
        tanPct: 'SYNTHETIC_OFFER',
        declaredTaegPct: 'SYNTHETIC_OFFER',
        declaredInitialPayment: 'SYNTHETIC_OFFER',
        arrangementFee: 'SYNTHETIC_OFFER',
        appraisalFee: 'SYNTHETIC_OFFER',
        otherUpfrontCosts: 'SYNTHETIC_OFFER',
        insuranceRequired: 'SYNTHETIC_OFFER',
        insuranceCost: 'MISSING',
        recurringMonthlyCost: 'SYNTHETIC_OFFER',
        maxLtvPct: 'SYNTHETIC_OFFER',
      },
      notes:
        'TAN indicizzato: parametro di riferimento 1,60% + spread 1,05%. Il TAEG dichiarato include un costo di polizza che l offerta non riporta.',
    },
  ];
}

/** Glossario mostrato nei tooltip della UI. */
export const GLOSSARY: Record<string, string> = {
  TAN: 'Tasso Annuo Nominale: il tasso di interesse puro applicato al capitale. Serve a calcolare la rata, ma non comprende i costi accessori.',
  TAEG: 'Tasso Annuo Effettivo Globale: indicatore che include il TAN più i costi obbligatori del finanziamento. È più alto del TAN quando ci sono costi.',
  'Costo totale simulato':
    'Somma di tutte le rate previste più i costi iniziali e ricorrenti noti. Se un costo obbligatorio non è indicato nell offerta, il totale resta parziale.',
  'Liquidità residua':
    'Risparmi dichiarati meno anticipo, spese accessorie, lavori e costi iniziali del mutuo. È il denaro che rimane disponibile dopo l acquisto.',
  'Fondo di emergenza':
    'Somma che si decide di non impegnare nell acquisto, per coprire spese impreviste. La soglia la imposti tu.',
  'Rapporto prestito/valore':
    'Rapporto fra importo del mutuo e valore dell immobile accertato con la perizia. Le offerte indicano un limite massimo.',
  'Rapporto rata/reddito':
    'Quota del reddito mensile assorbita dalla rata. Molte banche usano riferimenti interni intorno a un terzo: è un dato di contesto, non una valutazione della tua situazione.',
  'Margine mensile':
    'Reddito complessivo meno rate già attive, rata del mutuo e costi ricorrenti. È quanto resta ogni mese per tutto il resto.',
  Perizia:
    'Valutazione tecnica del valore dell immobile richiesta dalla banca. Se risulta inferiore al prezzo, il mutuo erogabile può ridursi.',
  'Polizza obbligatoria':
    'Copertura assicurativa che l offerta richiede come condizione. Il suo costo fa parte dei costi obbligatori e quindi del TAEG.',
};
