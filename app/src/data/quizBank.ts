import type { QuizQuestion } from '../core/types.js';

export const MAX_QUIZ_ATTEMPTS = 3;

/**
 * Controllo di comprensione: valutazione deterministica, feedback mirato
 * e riapertura dello scenario pertinente in caso di errore.
 */
export const QUIZ_QUESTIONS: readonly QuizQuestion[] = Object.freeze([
  {
    id: 'q1',
    concept: 'rata vs costo totale',
    prompt:
      'Perché un mutuo con rata mensile più bassa può avere un costo totale maggiore?',
    options: [
      { id: 'a', text: 'Perché la banca applica sempre più commissioni quando la rata è bassa.' },
      {
        id: 'b',
        text: 'Perché la rata più bassa spesso deriva da una durata più lunga: si pagano più rate e gli interessi si accumulano su più anni.',
      },
      { id: 'c', text: 'Non è possibile: una rata più bassa comporta sempre un costo totale più basso.' },
    ],
    correctOptionId: 'b',
    misconceptionFeedback:
      'La rata è quanto paghi ogni mese; il costo totale è quanto paghi in tutto. Allungando la durata la rata scende perché il capitale si distribuisce su più mesi, ma gli interessi maturano per più anni. Nel confronto sintetico, l offerta a 30 anni ha rata inferiore a quella a 20 anni e, allo stesso tempo, interessi totali simulati più alti: puoi verificarlo nella riga "interessi totali simulati" dello scenario base.',
    reopenScenario: 'BASE',
  },
  {
    id: 'q2',
    concept: 'sensibilità al tasso',
    prompt:
      'Quale tipologia di offerta è influenzata direttamente dallo scenario di aumento dei tassi?',
    options: [
      { id: 'a', text: 'Le offerte a tasso fisso, perché il tasso viene rinegoziato ogni anno.' },
      { id: 'b', text: 'Tutte allo stesso modo, perché il tasso di mercato è unico.' },
      {
        id: 'c',
        text: 'Le offerte a tasso variabile, perché il tasso applicato segue un parametro di riferimento che può salire.',
      },
    ],
    correctOptionId: 'c',
    misconceptionFeedback:
      'Nel tasso fisso il TAN resta quello concordato per tutta la durata, quindi lo scenario di aumento non modifica la rata. Nel tasso variabile il TAN è composto da un parametro di riferimento più uno spread: se il parametro sale, sale anche la rata. Nello scenario "aumento del tasso di 2 punti percentuali" solo l offerta variabile cambia rata: le altre due restano invariate.',
    reopenScenario: 'RATE_PLUS_2PP',
  },
  {
    id: 'q3',
    concept: 'perizia e liquidità iniziale',
    prompt: 'Perché una perizia inferiore al prezzo può richiedere maggiore liquidità iniziale?',
    options: [
      {
        id: 'a',
        text: 'Perché la banca calcola il mutuo massimo sul valore di perizia: se scende, l importo erogabile può ridursi e la differenza va coperta di tasca propria.',
      },
      { id: 'b', text: 'Perché il prezzo dell immobile aumenta automaticamente.' },
      { id: 'c', text: 'Perché la perizia va pagata due volte.' },
    ],
    correctOptionId: 'a',
    misconceptionFeedback:
      'La banca applica un limite massimo al rapporto prestito/valore, e il valore di riferimento è quello della perizia, non il prezzo pattuito. Se la perizia è inferiore, il mutuo erogabile scende mentre il prezzo da pagare resta lo stesso: la differenza diventa anticipo aggiuntivo. Nello scenario "perizia inferiore del 10%" puoi vedere la liquidità necessaria salire e la liquidità residua scendere.',
    reopenScenario: 'APPRAISAL_MINUS_10',
  },
]);
