import type { ComponentDefinition } from '../core/registry.js';
import { MAX_QUIZ_ATTEMPTS, QUIZ_QUESTIONS } from '../data/quizBank.js';
import type { ComprehensionFeedback, ComprehensionResult, QuizAttemptRecord } from '../core/types.js';

export interface AssessInput {
  answers: Record<string, string>;
  previousAttempts: QuizAttemptRecord[];
}

export interface AssessOutput {
  attempt: QuizAttemptRecord;
  result: ComprehensionResult;
  /** Scenari da riaprire perché collegati a una risposta errata. */
  reopenScenarios: string[];
  attemptsLeft: number;
  limitReached: boolean;
}

/**
 * Valutazione deterministica del controllo di comprensione.
 * In caso di errore produce una spiegazione mirata e indica lo scenario da riaprire.
 * Al terzo tentativo non superato registra "comprensione non verificata".
 */
export function assessUserUnderstanding(input: AssessInput): AssessOutput {
  const attemptNumber = input.previousAttempts.length + 1;
  const wrongQuestionIds: string[] = [];
  const feedback: ComprehensionFeedback[] = [];
  const conceptsUnderstood: string[] = [];
  const conceptsNotUnderstood: string[] = [];

  for (const question of QUIZ_QUESTIONS) {
    const given = input.answers[question.id];
    if (given === question.correctOptionId) {
      conceptsUnderstood.push(question.concept);
    } else {
      wrongQuestionIds.push(question.id);
      conceptsNotUnderstood.push(question.concept);
      feedback.push({
        questionId: question.id,
        concept: question.concept,
        explanation: question.misconceptionFeedback,
        reopenScenario: question.reopenScenario,
      });
    }
  }

  const passed = wrongQuestionIds.length === 0;
  const attempt: QuizAttemptRecord = {
    attempt: attemptNumber,
    ts: new Date().toISOString(),
    answers: { ...input.answers },
    wrongQuestionIds,
    passed,
  };

  const limitReached = !passed && attemptNumber >= MAX_QUIZ_ATTEMPTS;

  const result: ComprehensionResult = {
    status: passed ? 'PASSED' : limitReached ? 'NOT_VERIFIED' : 'IN_PROGRESS',
    attemptsUsed: attemptNumber,
    maxAttempts: MAX_QUIZ_ATTEMPTS,
    conceptsUnderstood,
    conceptsNotUnderstood,
    feedback,
  };

  return {
    attempt,
    result,
    reopenScenarios: [...new Set(feedback.map((f) => f.reopenScenario))],
    attemptsLeft: Math.max(0, MAX_QUIZ_ATTEMPTS - attemptNumber),
    limitReached,
  };
}

export const assessUserUnderstandingSkill: ComponentDefinition<AssessInput, AssessOutput> = {
  name: 'assess-user-understanding',
  kind: 'skill',
  purpose:
    'Valuta le risposte del controllo di comprensione, produce feedback mirato e indica gli scenari da riaprire.',
  run: (input) => assessUserUnderstanding(input),
};
