import type { ComponentDefinition } from '../core/registry.js';

export interface SafetyGuardInput {
  /** Testi candidati prodotti da un agente, prima di arrivare alla UI. */
  texts: string[];
  source: string;
}

export interface SafetyGuardMatch {
  index: number;
  original: string;
  pattern: string;
  category: 'RECOMMENDATION' | 'RANKING' | 'APPROVAL_ESTIMATE' | 'SUITABILITY';
  replacement: string;
}

export interface SafetyGuardOutput {
  source: string;
  blocked: boolean;
  matches: SafetyGuardMatch[];
  /** Testi ammessi: le frasi non conformi sono sostituite, non ripulite in silenzio. */
  safeTexts: string[];
}

interface Rule {
  id: string;
  pattern: RegExp;
  category: SafetyGuardMatch['category'];
  replacement: string;
}

const NEUTRAL_RECOMMENDATION =
  '[Frase bloccata da SafetyGuard: MutuoChiaro non indica quale offerta scegliere. I dati sopra mostrano i trade-off; la decisione resta tua.]';
const NEUTRAL_APPROVAL =
  '[Frase bloccata da SafetyGuard: MutuoChiaro non stima la probabilità di approvazione né la finanziabilità. Solo la banca può deliberare.]';
const NEUTRAL_RANKING =
  '[Frase bloccata da SafetyGuard: MutuoChiaro non produce classifiche fra le offerte.]';
const NEUTRAL_SUITABILITY =
  '[Frase bloccata da SafetyGuard: MutuoChiaro non dichiara se un offerta è adatta o non adatta a te.]';

/**
 * Regole di formulazione neutrale. Intercettano raccomandazioni, classifiche,
 * stime di approvazione e giudizi di idoneità.
 */
/**
 * Nota sui pattern: `\w` e `\b` di JavaScript non riconoscono le lettere
 * accentate, quindi le desinenze italiane usano `\S*` e i confini di parola
 * sono evitati dove la parola può iniziare con un accento.
 */
export const SAFETY_RULES: readonly Rule[] = [
  { id: 'migliore', pattern: /(?:il|la|l')?\s*(?:mutuo|offerta|banca|soluzione|scelta|opzione)\s+(?:più\s+)?(?:migliore|miglior|conveniente|vantaggios\S*)/i, category: 'RANKING', replacement: NEUTRAL_RANKING },
  { id: 'superlativo-migliore', pattern: /(?:migliore|miglior)\s+(?:mutuo|offerta|banca|scelta|opzione)/i, category: 'RANKING', replacement: NEUTRAL_RANKING },
  { id: 'ottimale', pattern: /(?:ottimale|ottima\s+scelta|la\s+scelta\s+giusta|il\s+più\s+indicato)/i, category: 'RANKING', replacement: NEUTRAL_RANKING },
  { id: 'classifica', pattern: /(?:classifica|graduatoria|punteggio\s+di\s+convenienza|primo\s+posto|vincitrice|vincente)/i, category: 'RANKING', replacement: NEUTRAL_RANKING },
  { id: 'consiglio', pattern: /(?:ti\s+consigli\S*|consigliamo|raccomand\S*|ti\s+suggeriamo\s+di\s+scegliere|dovresti\s+scegliere|scegli\s+(?:questa|quella|la|il)\b)/i, category: 'RECOMMENDATION', replacement: NEUTRAL_RECOMMENDATION },
  { id: 'conviene', pattern: /(?:ti\s+conviene|le\s+conviene|conviene\s+(?:scegliere|il|la))/i, category: 'RECOMMENDATION', replacement: NEUTRAL_RECOMMENDATION },
  { id: 'approvazione', pattern: /(?:probabilit\S*\s+di\s+approvazione|verrai\s+approvat\S*|banca\s+approver\S*|sarà\s+approvat\S*|approvazione\s+garantita)/i, category: 'APPROVAL_ESTIMATE', replacement: NEUTRAL_APPROVAL },
  { id: 'finanziabile', pattern: /(?:sicuramente\s+finanziabil\S*|certamente\s+finanziabil\S*|sei\s+finanziabil\S*)/i, category: 'APPROVAL_ESTIMATE', replacement: NEUTRAL_APPROVAL },
  { id: 'idoneita', pattern: /(?:è|e')\s+(?:l\s*)?(?:offerta\s+)?(?:non\s+)?(?:adatt\S*|inadatt\S*)\s+(?:a\s+te|per\s+te|al\s+tuo\s+profilo)/i, category: 'SUITABILITY', replacement: NEUTRAL_SUITABILITY },
  { id: 'idoneita2', pattern: /(?:fa\s+per\s+te|perfett\S*\s+per\s+te|ideale\s+per\s+te)/i, category: 'SUITABILITY', replacement: NEUTRAL_SUITABILITY },
];

/** Segmenta in frasi per bloccare solo la parte non conforme. */
function sentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  return parts.length > 0 ? parts : [text];
}

export function guardTexts(input: SafetyGuardInput): SafetyGuardOutput {
  const matches: SafetyGuardMatch[] = [];
  const safeTexts = input.texts.map((text, index) => {
    const checked = sentences(text).map((sentence) => {
      for (const rule of SAFETY_RULES) {
        if (rule.pattern.test(sentence)) {
          matches.push({
            index,
            original: sentence.trim(),
            pattern: rule.id,
            category: rule.category,
            replacement: rule.replacement,
          });
          return rule.replacement;
        }
      }
      return sentence;
    });
    return checked.join(' ');
  });

  return {
    source: input.source,
    blocked: matches.length > 0,
    matches,
    safeTexts,
  };
}

export const safetyGuardTool: ComponentDefinition<SafetyGuardInput, SafetyGuardOutput> = {
  name: 'SafetyGuard',
  kind: 'tool',
  purpose:
    'Intercetta raccomandazioni, classifiche, stime di approvazione e giudizi di idoneità e impone una formulazione neutrale.',
  run: (input) => guardTexts(input),
};
