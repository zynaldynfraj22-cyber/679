import type {
  AssessmentResult,
  BreakdownStat,
  DifficultyLevel,
  GradedQuestionResult,
  LearningObjective,
  Question,
  QuestionAnswerKey,
  QuestionType,
} from '../src/types/curriculum';
import {
  DIFFICULTY_LABELS_AR,
  isManualGradingType,
  normalizeQuestionDefaults,
  normalizeTextToken,
  parseNumericOrMathValue,
} from '../src/utils/questionEngine';

function normalizeUnit(unit: string): string {
  return unit
    .replace(/\s+/g, '')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/·/g, '.')
    .replace(/μ/g, 'u')
    .replace(/µ/g, 'u')
    .toLowerCase();
}

export interface SingleGradeOutcome {
  isCorrect: boolean;
  needsManualGrading: boolean;
  earnedMarks: number;
}

export type GradableQuestionInput = Pick<
  Question,
  | 'id'
  | 'questionType'
  | 'marks'
  | 'correctAnswer'
  | 'correctAnswers'
  | 'matchingPairs'
  | 'orderingItemsAr'
  | 'numericTolerance'
  | 'requiredUnit'
>;

export function gradeSingleBankQuestion(
  question: GradableQuestionInput,
  rawAnswer: string
): SingleGradeOutcome {
  const maxMarks = question.marks || 1;
  const trimmed = rawAnswer?.trim() ?? '';
  if (!trimmed) {
    return { isCorrect: false, needsManualGrading: false, earnedMarks: 0 };
  }

  if (isManualGradingType(question.questionType)) {
    return { isCorrect: false, needsManualGrading: true, earnedMarks: 0 };
  }

  if (question.questionType === 'multi_select') {
    const expectedList = (
      question.correctAnswers && question.correctAnswers.length > 0
        ? question.correctAnswers
        : question.correctAnswer.split('|')
    )
      .map(normalizeTextToken)
      .filter(Boolean)
      .sort();

    let userList: string[] = [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        userList = parsed.map((x) => normalizeTextToken(String(x))).filter(Boolean).sort();
      }
    } catch {
      userList = trimmed.split('|').map(normalizeTextToken).filter(Boolean).sort();
    }

    const match =
      expectedList.length > 0 &&
      expectedList.length === userList.length &&
      expectedList.every((val, idx) => val === userList[idx]);
    return { isCorrect: match, needsManualGrading: false, earnedMarks: match ? maxMarks : 0 };
  }

  if (question.questionType === 'matching') {
    const pairs = question.matchingPairs ?? [];
    if (pairs.length === 0) {
      const eq = normalizeTextToken(trimmed) === normalizeTextToken(question.correctAnswer);
      return { isCorrect: eq, needsManualGrading: false, earnedMarks: eq ? maxMarks : 0 };
    }
    try {
      const userMap = JSON.parse(trimmed) as Record<string, string>;
      let matched = 0;
      for (const pair of pairs) {
        const expectedRight = normalizeTextToken(pair.rightAr);
        const userRight = normalizeTextToken(userMap[pair.leftAr] ?? '');
        if (userRight && userRight === expectedRight) {
          matched += 1;
        }
      }
      const allRight = matched === pairs.length;
      const earned = allRight ? maxMarks : Math.floor((matched / pairs.length) * maxMarks);
      return { isCorrect: allRight, needsManualGrading: false, earnedMarks: earned };
    } catch {
      return { isCorrect: false, needsManualGrading: false, earnedMarks: 0 };
    }
  }

  if (question.questionType === 'ordering') {
    const expectedOrder = (
      question.orderingItemsAr && question.orderingItemsAr.length > 0
        ? question.orderingItemsAr
        : question.correctAnswer.split('|')
    ).map(normalizeTextToken);
    let userOrder: string[] = [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        userOrder = parsed.map((x) => normalizeTextToken(String(x)));
      }
    } catch {
      userOrder = trimmed.split('|').map(normalizeTextToken);
    }
    const exact =
      expectedOrder.length > 0 &&
      expectedOrder.length === userOrder.length &&
      expectedOrder.every((item, idx) => item === userOrder[idx]);
    return { isCorrect: exact, needsManualGrading: false, earnedMarks: exact ? maxMarks : 0 };
  }

  if (question.questionType === 'fill_blank' || question.questionType === 'short_answer') {
    const accepted = question.correctAnswer
      .split('|')
      .map(normalizeTextToken)
      .filter(Boolean);
    const userNorm = normalizeTextToken(trimmed);
    const ok = accepted.some((ans) => ans === userNorm);
    if (ok) {
      return { isCorrect: true, needsManualGrading: false, earnedMarks: maxMarks };
    }
    const userNum = parseNumericOrMathValue(trimmed);
    const expNum = parseNumericOrMathValue(question.correctAnswer);
    if (userNum.value !== null && expNum.value !== null) {
      const tol = question.numericTolerance ?? Math.max(0.01, Math.abs(expNum.value) * 0.01);
      if (Math.abs(userNum.value - expNum.value) <= tol) {
        return { isCorrect: true, needsManualGrading: false, earnedMarks: maxMarks };
      }
    }
    return { isCorrect: false, needsManualGrading: false, earnedMarks: 0 };
  }

  if (question.questionType === 'numeric') {
    const userParsed = parseNumericOrMathValue(trimmed);
    const expParsed = parseNumericOrMathValue(question.correctAnswer);

    if (userParsed.value !== null && expParsed.value !== null) {
      if (question.requiredUnit && userParsed.unit) {
        if (normalizeUnit(userParsed.unit) !== normalizeUnit(question.requiredUnit)) {
          return { isCorrect: false, needsManualGrading: false, earnedMarks: 0 };
        }
      }
      const tol =
        question.numericTolerance ?? Math.max(0.02, Math.abs(expParsed.value) * 0.02);
      const ok = Math.abs(userParsed.value - expParsed.value) <= tol;
      return { isCorrect: ok, needsManualGrading: false, earnedMarks: ok ? maxMarks : 0 };
    }
  }

  const ok = normalizeTextToken(trimmed) === normalizeTextToken(question.correctAnswer);
  return { isCorrect: ok, needsManualGrading: false, earnedMarks: ok ? maxMarks : 0 };
}

export function gradeQuestionWithAnswerKey(
  meta: {
    id: string;
    questionType: QuestionType;
    difficulty: DifficultyLevel;
    lessonId: string;
    learningObjectiveId?: string;
    marks: number;
  },
  key: QuestionAnswerKey,
  rawAnswer: string
): GradedQuestionResult {
  const outcome = gradeSingleBankQuestion(
    {
      id: meta.id,
      questionType: meta.questionType,
      marks: meta.marks,
      correctAnswer: key.correctAnswer,
      correctAnswers: key.correctAnswers,
      matchingPairs: key.matchingPairs,
      orderingItemsAr: key.orderingItemsAr,
      numericTolerance: key.numericTolerance,
      requiredUnit: key.requiredUnit,
    },
    rawAnswer
  );

  return {
    questionId: meta.id,
    questionType: meta.questionType,
    difficulty: meta.difficulty,
    learningObjectiveId: meta.learningObjectiveId,
    isCorrect: outcome.isCorrect,
    needsManualGrading: outcome.needsManualGrading,
    userAnswer: rawAnswer,
    correctAnswer: key.correctAnswer,
    earnedMarks: outcome.earnedMarks,
    maxMarks: meta.marks || 1,
    explanationAr: key.explanationAr,
    whyCorrectAr: key.whyCorrectAr,
    solutionStepsAr: key.solutionStepsAr,
    commonMistakeAr: key.commonMistakeAr,
    conceptAr: key.conceptAr,
    rubricAr: key.rubricAr,
    sourceRefAr: key.sourceRefAr,
  };
}

export function gradeBankAssessment(
  questions: Question[],
  userAnswers: Record<string, string>,
  options?: {
    passingScorePercent?: number;
    timeSpentSeconds?: number;
    objectives?: LearningObjective[];
  }
): AssessmentResult {
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let manualPendingCount = 0;
  let earnedMarks = 0;
  let totalMarks = 0;

  const diffBuckets = new Map<
    DifficultyLevel,
    { total: number; correct: number; earned: number; max: number }
  >();
  const objBuckets = new Map<
    string,
    { label: string; total: number; correct: number; earned: number; max: number }
  >();

  const objectiveLabelMap = new Map<string, string>();
  for (const obj of options?.objectives ?? []) {
    objectiveLabelMap.set(obj.id, `${obj.code}: ${obj.statementAr}`);
  }

  const breakdown: GradedQuestionResult[] = questions.map((rawQ) => {
    const q = normalizeQuestionDefaults(rawQ);
    const userAnswer = userAnswers[q.id] ?? '';
    const maxMarks = q.marks || 1;
    totalMarks += maxMarks;

    const hasAnswer = userAnswer.trim().length > 0;
    const outcome = gradeSingleBankQuestion(q, userAnswer);

    if (!hasAnswer) {
      unansweredCount += 1;
    } else if (outcome.needsManualGrading) {
      manualPendingCount += 1;
    } else if (outcome.isCorrect) {
      correctCount += 1;
    } else {
      incorrectCount += 1;
    }

    earnedMarks += outcome.earnedMarks;

    const db = diffBuckets.get(q.difficulty) ?? { total: 0, correct: 0, earned: 0, max: 0 };
    db.total += 1;
    if (outcome.isCorrect) db.correct += 1;
    db.earned += outcome.earnedMarks;
    db.max += maxMarks;
    diffBuckets.set(q.difficulty, db);

    const objKey = q.learningObjectiveId ?? q.lessonId;
    const objLabel =
      (q.learningObjectiveId ? objectiveLabelMap.get(q.learningObjectiveId) : undefined) ??
      q.conceptAr ??
      `مفهوم الدرس (${q.lessonId})`;
    const ob = objBuckets.get(objKey) ?? {
      label: objLabel,
      total: 0,
      correct: 0,
      earned: 0,
      max: 0,
    };
    ob.total += 1;
    if (outcome.isCorrect) ob.correct += 1;
    ob.earned += outcome.earnedMarks;
    ob.max += maxMarks;
    objBuckets.set(objKey, ob);

    return {
      questionId: q.id,
      questionType: q.questionType,
      difficulty: q.difficulty,
      learningObjectiveId: q.learningObjectiveId,
      isCorrect: outcome.isCorrect,
      needsManualGrading: outcome.needsManualGrading,
      userAnswer,
      correctAnswer: q.correctAnswer,
      earnedMarks: outcome.earnedMarks,
      maxMarks,
      explanationAr: q.explanationAr,
      whyCorrectAr: q.whyCorrectAr,
      solutionStepsAr: q.solutionStepsAr,
      commonMistakeAr: q.commonMistakeAr,
      conceptAr: q.conceptAr,
      rubricAr: q.rubricAr,
      sourceRefAr: q.sourceRefAr,
    };
  });

  const autoGradableMarks = breakdown
    .filter((b) => !b.needsManualGrading)
    .reduce((sum, b) => sum + b.maxMarks, 0);
  const denominator = autoGradableMarks > 0 ? autoGradableMarks : totalMarks;
  const scorePercent = denominator > 0 ? Math.round((earnedMarks / denominator) * 100) : 0;

  const difficultyBreakdown: BreakdownStat[] = Array.from(diffBuckets.entries()).map(
    ([key, val]) => ({
      key,
      labelAr: DIFFICULTY_LABELS_AR[key],
      total: val.total,
      correct: val.correct,
      earnedMarks: val.earned,
      maxMarks: val.max,
      accuracyPercent: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
    })
  );

  const objectiveBreakdown: BreakdownStat[] = Array.from(objBuckets.entries()).map(
    ([key, val]) => ({
      key,
      labelAr: val.label,
      total: val.total,
      correct: val.correct,
      earnedMarks: val.earned,
      maxMarks: val.max,
      accuracyPercent: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
    })
  );

  const strongTopicsAr = objectiveBreakdown
    .filter((o) => o.accuracyPercent >= 75)
    .map((o) => o.labelAr);
  const weakTopicsAr = objectiveBreakdown
    .filter((o) => o.accuracyPercent < 60)
    .map((o) => o.labelAr);

  const passingThreshold = options?.passingScorePercent ?? 60;

  return {
    totalQuestions: questions.length,
    correctCount,
    incorrectCount,
    unansweredCount,
    manualPendingCount,
    earnedMarks,
    totalMarks,
    scorePercent,
    timeSpentSeconds: options?.timeSpentSeconds,
    passed: scorePercent >= passingThreshold,
    difficultyBreakdown,
    objectiveBreakdown,
    strongTopicsAr,
    weakTopicsAr,
    breakdown,
  };
}
