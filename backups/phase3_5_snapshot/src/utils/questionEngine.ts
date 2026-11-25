import type {
  AssessmentResult,
  BreakdownStat,
  DifficultyLevel,
  DifficultyTier,
  DuplicateMatch,
  ExaminationBlueprint,
  ExamBlueprintType,
  GradedQuestionResult,
  LearningObjective,
  Lesson,
  LessonCoverageTarget,
  Question,
  QuestionFilter,
  QuestionOrigin,
  QuestionType,
  QuestionVerificationState,
  RevisionRecommendation,
  ScientificValidationReport,
  StudentAnswerDetail,
  Subject,
  SubjectId,
} from '../types/curriculum';

export const DIFFICULTY_TIER_MAP: Record<DifficultyLevel, DifficultyTier> = {
  foundation: 1,
  basic_application: 2,
  intermediate: 3,
  advanced: 4,
  olympiad: 5,
};

export const DIFFICULTY_LABELS_AR: Record<DifficultyLevel, string> = {
  foundation: 'المستوى ١: تأسيسي',
  basic_application: 'المستوى ٢: تطبيق مباشر',
  intermediate: 'المستوى ٣: متوسط',
  advanced: 'المستوى ٤: متقدم',
  olympiad: 'المستوى ٥: تفكير عليا',
};

export const QUESTION_TYPE_LABELS_AR: Record<QuestionType, string> = {
  mcq: 'اختيار من متعدد',
  multi_select: 'اختيار متعدد الإجابات',
  true_false: 'صح أو خطأ',
  fill_blank: 'أكمل الفراغ',
  short_answer: 'إجابة قصيرة',
  numeric: 'مسألة رقمية',
  matching: 'المزاوجة والتوصيل',
  ordering: 'الترتيب والتسلسل',
  scientific_explanation: 'تفسير علمي',
  structured_long: 'سؤال مقالي مركب',
  diagram_interpretation: 'تفسير الأشكال والرسوم',
  data_graph_analysis: 'تحليل البيانات والمنحنيات',
};

export const ORIGIN_LABELS_AR: Record<QuestionOrigin, string> = {
  OFFICIAL_PAST_EXAM: 'امتحان وزاري سابق موثق',
  TEACHER_RESOURCE: 'مورد معلم معتمد',
  AI_GENERATED: 'مُنشأ بالذكاء الاصطناعي',
  ADMIN_CREATED: 'إعداد المشرف المنهجي',
};

export const VERIFICATION_STATE_LABELS_AR: Record<QuestionVerificationState, string> = {
  PENDING_REVIEW: 'بانتظار المراجعة',
  APPROVED: 'معتمد للطلبة',
  REJECTED: 'مرفوض',
  NEEDS_CORRECTION: 'بحاجة لتصحيح',
  OUTDATED: 'محتوى قديم',
};

export const EXAM_TYPE_LABELS_AR: Record<ExamBlueprintType, string> = {
  lesson_test: 'اختبار درس',
  unit_test: 'اختبار وحدة',
  semester_test: 'اختبار فصل دراسي',
  comprehensive_subject: 'اختبار شامل للمادة',
  mock_final: 'اختبار تجريبي نهائي',
  custom_practice: 'اختبار تدريبي مخصص',
};

const ARABIC_DIGIT_MAP: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
  '٫': '.',
  '،': '.',
  '−': '-',
  '–': '-',
  '×': '*',
  '÷': '/',
};

export function normalizeTextToken(raw: string): string {
  const replaced = raw
    .trim()
    .split('')
    .map((ch) => ARABIC_DIGIT_MAP[ch] ?? ch)
    .join('');
  return replaced.replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeQuestionDefaults(q: Question): Question {
  const origin: QuestionOrigin = q.origin ?? 'ADMIN_CREATED';
  const verificationStatus: QuestionVerificationState =
    q.verificationStatus ?? (q.isPublished ? 'APPROVED' : 'PENDING_REVIEW');
  return {
    ...q,
    academicYearId: q.academicYearId ?? '2026-2027',
    gradeAr: q.gradeAr ?? 'الصف الثاني عشر',
    trackAr: q.trackAr ?? 'المسار العلمي',
    difficultyLevel: q.difficultyLevel ?? DIFFICULTY_TIER_MAP[q.difficulty] ?? 3,
    estimatedSeconds:
      q.estimatedSeconds ??
      (q.questionType === 'structured_long' || q.questionType === 'scientific_explanation'
        ? 240
        : q.questionType === 'numeric' || q.questionType === 'data_graph_analysis'
        ? 150
        : 90),
    origin,
    verificationStatus,
    version: q.version ?? 1,
    createdAtIso: q.createdAtIso ?? '2026-09-01T08:00:00.000Z',
    lastReviewedAtIso:
      q.lastReviewedAtIso ?? (verificationStatus === 'APPROVED' ? '2026-10-15T08:00:00.000Z' : undefined),
  };
}

/**
 * Only APPROVED and published questions may be delivered to students.
 * Rejected, Pending Review, Needs Correction, and Outdated items are strictly excluded.
 */
export function isQuestionDeliverableToStudent(q: Question): boolean {
  const normalized = normalizeQuestionDefaults(q);
  if (!normalized.isPublished) return false;
  return normalized.verificationStatus === 'APPROVED';
}

export function filterBankQuestions(
  questions: Question[],
  filter: QuestionFilter
): Question[] {
  const query = filter.searchQuery?.trim().toLowerCase() ?? '';
  const savedSet = filter.onlySavedIds ? new Set(filter.onlySavedIds) : null;
  const incorrectSet = filter.onlyIncorrectIds ? new Set(filter.onlyIncorrectIds) : null;

  return questions
    .map(normalizeQuestionDefaults)
    .filter((q) => {
      if (!filter.includeUnapproved && !isQuestionDeliverableToStudent(q)) {
        return false;
      }
      if (filter.subjectId && filter.subjectId !== 'all' && q.subjectId !== filter.subjectId) {
        return false;
      }
      if (filter.unitId && filter.unitId !== 'all' && q.unitId !== filter.unitId) {
        return false;
      }
      if (filter.lessonId && filter.lessonId !== 'all' && q.lessonId !== filter.lessonId) {
        return false;
      }
      if (
        filter.learningObjectiveId &&
        filter.learningObjectiveId !== 'all' &&
        q.learningObjectiveId !== filter.learningObjectiveId
      ) {
        return false;
      }
      if (filter.semester && filter.semester !== 'all' && q.semester !== filter.semester) {
        return false;
      }
      if (filter.difficulty && filter.difficulty !== 'all' && q.difficulty !== filter.difficulty) {
        return false;
      }
      if (filter.questionType && filter.questionType !== 'all' && q.questionType !== filter.questionType) {
        return false;
      }
      if (filter.origin && filter.origin !== 'all' && q.origin !== filter.origin) {
        return false;
      }
      if (
        filter.verificationStatus &&
        filter.verificationStatus !== 'all' &&
        q.verificationStatus !== filter.verificationStatus
      ) {
        return false;
      }
      if (savedSet && !savedSet.has(q.id)) {
        return false;
      }
      if (incorrectSet && !incorrectSet.has(q.id)) {
        return false;
      }
      if (query.length > 0) {
        const hay = `${q.promptAr} ${q.explanationAr} ${q.conceptAr ?? ''} ${q.sourceRefAr ?? ''}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize = 10
): PaginatedResult<T> {
  const safePageSize = Math.max(1, pageSize);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const safePage = Math.max(1, Math.min(totalPages, page));
  const start = (safePage - 1) * safePageSize;
  return {
    items: items.slice(start, start + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    totalItems,
    totalPages,
  };
}

/**
 * Evaluates simple deterministic arithmetic/fraction/scientific expressions safely
 * (no eval, only digits, signs, decimal point, /, *, ^, e/E).
 */
export function parseNumericOrMathValue(raw: string): { value: number | null; unit: string } {
  const normalized = normalizeTextToken(raw);
  if (!normalized) return { value: null, unit: '' };

  // Extract leading numerical expression + optional trailing unit
  // Handle scientific notation like 1*10^-10 or 1e-10
  const sciTenMatch = normalized.match(
    /^([+-]?\d+(?:\.\d+)?)\s*\*\s*10\^?\(?([+-]?\d+)\)?(?:\s*(.*))?$/
  );
  if (sciTenMatch) {
    const mantissa = Number(sciTenMatch[1]);
    const exp = Number(sciTenMatch[2]);
    if (Number.isFinite(mantissa) && Number.isFinite(exp)) {
      return {
        value: mantissa * Math.pow(10, exp),
        unit: (sciTenMatch[3] ?? '').trim(),
      };
    }
  }

  // Handle fraction a/b (e.g. "1/4" or "3/2 N/C")
  const fracMatch = normalized.match(/^([+-]?\d+(?:\.\d+)?)\s*\/\s*([+-]?\d+(?:\.\d+)?)(?:\s+(.*))?$/);
  if (fracMatch) {
    const num = Number(fracMatch[1]);
    const den = Number(fracMatch[2]);
    if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
      return { value: num / den, unit: (fracMatch[3] ?? '').trim() };
    }
  }

  // Handle standard number + optional unit (e.g. "25 W/m²" or "5.0")
  const numUnitMatch = normalized.match(/^([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)(?:\s*(.*))?$/i);
  if (numUnitMatch) {
    const num = Number(numUnitMatch[1]);
    if (Number.isFinite(num)) {
      return { value: num, unit: (numUnitMatch[2] ?? '').trim() };
    }
  }

  return { value: null, unit: '' };
}

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

export function isManualGradingType(type: QuestionType): boolean {
  return type === 'scientific_explanation' || type === 'structured_long';
}

export interface SingleGradeOutcome {
  isCorrect: boolean;
  needsManualGrading: boolean;
  earnedMarks: number;
}

export function gradeSingleBankQuestion(
  question: Question,
  rawAnswer: string
): SingleGradeOutcome {
  const maxMarks = question.marks || 1;
  const trimmed = rawAnswer?.trim() ?? '';
  if (!trimmed) {
    return { isCorrect: false, needsManualGrading: false, earnedMarks: 0 };
  }

  if (isManualGradingType(question.questionType)) {
    // Long structured / scientific explanation questions enter manual/rubric workflow
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
    // Also check if numeric equivalence matches for math short answer
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
      // Never silently accept wrong unit when requiredUnit is explicitly configured and user typed a unit
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

  // Default exact normalized match (mcq, true_false, diagram_interpretation, data_graph_analysis)
  const ok = normalizeTextToken(trimmed) === normalizeTextToken(question.correctAnswer);
  return { isCorrect: ok, needsManualGrading: false, earnedMarks: ok ? maxMarks : 0 };
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

/**
 * Deterministic Scientific Validation per Subject (Stage 7)
 */
export function validateQuestionScientifically(question: Question): ScientificValidationReport {
  const warningsAr: string[] = [];
  const errorsAr: string[] = [];
  const deterministicChecks: string[] = [];

  if (!question.promptAr || question.promptAr.trim().length < 8) {
    errorsAr.push('نص السؤال قصير جداً أو مفقود.');
  }
  if (!question.explanationAr || question.explanationAr.trim().length < 10) {
    errorsAr.push('التفسير العلمي للحل مفقود أو غير كافٍ.');
  }

  // Option checks for choice questions
  if (question.questionType === 'mcq' || question.questionType === 'multi_select') {
    const opts = (question.optionsAr ?? []).map((o) => o.trim()).filter(Boolean);
    const uniqueOpts = new Set(opts.map(normalizeTextToken));
    deterministicChecks.push('التحقق من تميّز الخيارات وعدم تكرارها');
    if (opts.length < 3) {
      errorsAr.push('أسئلة الاختيار تتطلب ٣ خيارات متميزة على الأقل.');
    }
    if (uniqueOpts.size !== opts.length) {
      errorsAr.push('توجد خيارات مكررة أو متطابقة في نص الاختيارات.');
    }
    if (question.questionType === 'mcq') {
      const hasExactCorrect = opts.some(
        (o) => normalizeTextToken(o) === normalizeTextToken(question.correctAnswer)
      );
      if (!hasExactCorrect) {
        errorsAr.push('الإجابة الصحيحة لا تطابق أياً من الخيارات المدرجة.');
      }
    }
  }

  if (question.questionType === 'numeric') {
    deterministicChecks.push('التحقق الحتمي من الصيغة العددية والتسامح');
    const parsed = parseNumericOrMathValue(question.correctAnswer);
    if (parsed.value === null) {
      errorsAr.push('الإجابة الرقمية ليست رقماً أو قيمة علمية صالحة.');
    }
  }

  // Subject-specific rules
  if (question.subjectId === 'physics') {
    deterministicChecks.push('فحص وحدات النظام الدولي SI والكميات الفيزيائية');
    if (question.questionType === 'numeric' && !question.requiredUnit && !/[A-Za-zΩμ°]/.test(question.promptAr)) {
      warningsAr.push('يُستحسن تحديد وحدة القياس المطلوبة في السؤال الفيزيائي الرقمي.');
    }
    const negativeMassCheck = /(?:كتلة|الطاقة الحركية|تردد|طول موجي)[^\n]*-\d+/.test(
      question.correctAnswer
    );
    if (negativeMassCheck) {
      errorsAr.push('قيمة سالبة غير منطقية في كمية موجبة فيزيائياً.');
    }
  }

  if (question.subjectId === 'chemistry') {
    deterministicChecks.push('فحص الرموز الكيميائية ونطاق الأس الهيدروجيني ومعادلات الاتزان');
    if (question.promptAr.includes('pH') && question.questionType === 'numeric') {
      const parsed = parseNumericOrMathValue(question.correctAnswer);
      if (parsed.value !== null && (parsed.value < -1 || parsed.value > 15)) {
        warningsAr.push('قيمة pH تقع خارج النطاق المعتاد (0–14) — يرجى مراجعة الحساب.');
      }
    }
    if (
      (question.promptAr.includes('معادلة') || question.promptAr.includes('تفاعل')) &&
      /[A-Z]{2,}/.test(question.promptAr) &&
      !question.promptAr.includes('→') &&
      !question.promptAr.includes('⇌') &&
      !question.promptAr.includes('=')
    ) {
      warningsAr.push('تحقق من وجود سهم التفاعل الكيميائي واتزان المعادلة.');
    }
  }

  if (question.subjectId === 'biology') {
    deterministicChecks.push('فحص التسلسل الحيوي والمصطلحات العلمية');
    if (question.questionType === 'ordering' && (question.orderingItemsAr?.length ?? 0) < 3) {
      errorsAr.push('أسئلة تسلسل العمليات الحيوية تتطلب ٣ خطوات مرتبة على الأقل.');
    }
    if (question.questionType === 'diagram_interpretation' && !question.diagramKind) {
      warningsAr.push('سؤال تفسير شكل حيوي لا يرتبط برسم توضيحي محدد بعد.');
    }
  }

  if (question.subjectId === 'math') {
    deterministicChecks.push('فحص التكافؤ الرياضي وقيود المجال');
    if (
      question.promptAr.includes('/') &&
      (question.promptAr.includes('س') || question.promptAr.includes('x')) &&
      question.questionType === 'structured_long' &&
      !question.explanationAr.includes('≠') &&
      !question.explanationAr.includes('مجال')
    ) {
      warningsAr.push('تأكد من ذكر قيود المجال (استثناء أصفار المقام) في التفسير عند الحاجة.');
    }
  }

  if (question.origin === 'AI_GENERATED' && question.verificationStatus === 'APPROVED') {
    warningsAr.push('تأكد من توثيق مراجعة المشرف للأسئلة المنشأة بالذكاء الاصطناعي.');
  }

  return {
    isValid: errorsAr.length === 0,
    checkedAtIso: new Date().toISOString(),
    warningsAr,
    errorsAr,
    deterministicChecks,
  };
}

/**
 * Duplicate & Similarity Detection (Stage 8)
 * Flags potential duplicates for admin review without auto-deleting.
 */
function tokenizeArabicForSimilarity(text: string): Set<string> {
  const cleaned = normalizeTextToken(text).replace(/[^\p{L}\p{N}\s]/gu, ' ');
  return new Set(cleaned.split(/\s+/).filter((t) => t.length >= 2));
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function detectQuestionDuplicates(questions: Question[]): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  const tokenized = questions.map((q) => ({
    q,
    normPrompt: normalizeTextToken(q.promptAr),
    normAnswer: normalizeTextToken(q.correctAnswer),
    tokens: tokenizeArabicForSimilarity(q.promptAr),
  }));

  for (let i = 0; i < tokenized.length; i++) {
    for (let j = i + 1; j < tokenized.length; j++) {
      const a = tokenized[i];
      const b = tokenized[j];
      if (a.q.subjectId !== b.q.subjectId) continue;

      if (a.normPrompt === b.normPrompt) {
        matches.push({
          questionAId: a.q.id,
          questionBId: b.q.id,
          similarityScore: 1,
          reason: 'exact_duplicate',
          reasonAr: 'تطابق تام في نص السؤال',
        });
        continue;
      }

      const sim = jaccardSimilarity(a.tokens, b.tokens);
      if (sim >= 0.72) {
        matches.push({
          questionAId: a.q.id,
          questionBId: b.q.id,
          similarityScore: Number(sim.toFixed(2)),
          reason: 'near_identical',
          reasonAr: 'تشابه نصي مرتفع جداً بين السؤالين',
        });
      } else if (
        a.q.lessonId === b.q.lessonId &&
        a.normAnswer.length > 0 &&
        a.normAnswer === b.normAnswer &&
        sim >= 0.52
      ) {
        matches.push({
          questionAId: a.q.id,
          questionBId: b.q.id,
          similarityScore: Number(sim.toFixed(2)),
          reason: 'same_answer_reworded',
          reasonAr: 'إجابة متطابقة مع إعادة صياغة متقاربة في نفس الدرس',
        });
      }
    }
  }

  return matches;
}

/**
 * Adaptive Practice Algorithm (Stage 10)
 * Never confuses a lack of attempts with poor understanding.
 */
export function buildAdaptivePracticePlan(params: {
  questions: Question[];
  answerHistory: StudentAnswerDetail[];
  subjectId?: SubjectId;
  lessonId?: string;
}): {
  recommendation: RevisionRecommendation;
  selectedQuestions: Question[];
  hasSufficientData: boolean;
} {
  const pool = params.questions
    .map(normalizeQuestionDefaults)
    .filter((q) => isQuestionDeliverableToStudent(q))
    .filter((q) => (params.subjectId ? q.subjectId === params.subjectId : true))
    .filter((q) => (params.lessonId ? q.lessonId === params.lessonId : true));

  const poolIds = new Set(pool.map((q) => q.id));
  const relevantHistory = params.answerHistory.filter((h) => poolIds.has(h.questionId));

  const subjectId = params.subjectId ?? pool[0]?.subjectId ?? 'physics';

  if (relevantHistory.length === 0) {
    // No attempts yet — do NOT claim poor understanding! Provide balanced starter mix.
    const starter = pool
      .filter((q) => q.difficulty === 'foundation' || q.difficulty === 'basic_application' || q.difficulty === 'intermediate')
      .slice(0, 6);
    const selected = starter.length > 0 ? starter : pool.slice(0, 6);
    return {
      hasSufficientData: false,
      selectedQuestions: selected,
      recommendation: {
        id: `rec-starter-${subjectId}`,
        subjectId,
        lessonId: params.lessonId,
        reasonAr: 'لا توجد محاولات سابقة مسجلة في هذا النطاق بعد (عدم المحاولة لا يعني ضعفاً).',
        recommendedActionAr: 'ابدأ بجلسة استكشافية متوازنة من المستويات التأسيسية والمتوسطة لتحديد مستواك الفعلي.',
        recommendedDifficulty: 'foundation',
        questionIds: selected.map((q) => q.id),
        priority: 'normal',
      },
    };
  }

  // Group accuracy by learningObjective and difficulty
  const objStats = new Map<string, { total: number; correct: number }>();
  const easyStats = { total: 0, correct: 0 };
  const overallStats = { total: 0, correct: 0 };
  const wrongIds = new Set<string>();

  for (const item of relevantHistory) {
    overallStats.total += 1;
    if (item.isCorrect) overallStats.correct += 1;
    else wrongIds.add(item.questionId);

    if (item.difficulty === 'foundation' || item.difficulty === 'basic_application') {
      easyStats.total += 1;
      if (item.isCorrect) easyStats.correct += 1;
    }

    if (item.learningObjectiveId) {
      const curr = objStats.get(item.learningObjectiveId) ?? { total: 0, correct: 0 };
      curr.total += 1;
      if (item.isCorrect) curr.correct += 1;
      objStats.set(item.learningObjectiveId, curr);
    }
  }

  // Check struggling objective (>=2 attempts and <60% accuracy)
  let weakestObjId: string | undefined;
  let weakestAcc = 101;
  for (const [objId, stat] of objStats.entries()) {
    if (stat.total >= 2) {
      const acc = Math.round((stat.correct / stat.total) * 100);
      if (acc < 60 && acc < weakestAcc) {
        weakestAcc = acc;
        weakestObjId = objId;
      }
    }
  }

  if (weakestObjId) {
    const targeted = pool.filter(
      (q) =>
        q.learningObjectiveId === weakestObjId &&
        (q.difficulty === 'foundation' || q.difficulty === 'basic_application' || wrongIds.has(q.id))
    );
    const selected = (targeted.length > 0 ? targeted : pool.filter((q) => wrongIds.has(q.id))).slice(0, 6);
    return {
      hasSufficientData: true,
      selectedQuestions: selected.length > 0 ? selected : pool.slice(0, 5),
      recommendation: {
        id: `rec-weak-obj-${weakestObjId}`,
        subjectId,
        lessonId: params.lessonId,
        learningObjectiveId: weakestObjId,
        reasonAr: `رُصدت صعوبة متكررة في الهدف التعليمي (${weakestObjId}) بنسبة دقة ${weakestAcc}% خلال المحاولات المسجلة.`,
        recommendedActionAr: 'جلسة مراجعة مركزة بأسئلة تأسيسية وتطبيق مباشر مع إعادة الأسئلة المخطوءة.',
        recommendedDifficulty: 'foundation',
        questionIds: selected.map((q) => q.id),
        priority: 'high',
      },
    };
  }

  const easyAcc = easyStats.total >= 2 ? easyStats.correct / easyStats.total : 0;
  const overallAcc = overallStats.total >= 3 ? overallStats.correct / overallStats.total : 0;

  if (overallAcc >= 0.8) {
    const advancedPool = pool.filter(
      (q) => q.difficulty === 'advanced' || q.difficulty === 'olympiad'
    );
    const selected = (advancedPool.length > 0 ? advancedPool : pool).slice(0, 6);
    return {
      hasSufficientData: true,
      selectedQuestions: selected,
      recommendation: {
        id: `rec-challenge-${subjectId}`,
        subjectId,
        lessonId: params.lessonId,
        reasonAr: `أداء متميز بنسبة دقة ${Math.round(overallAcc * 100)}% في التدريبات السابقة.`,
        recommendedActionAr: 'الانتقال إلى مسائل التحدي المتقدمة ومهارات التفكير العليا.',
        recommendedDifficulty: 'advanced',
        questionIds: selected.map((q) => q.id),
        priority: 'normal',
      },
    };
  }

  if (easyAcc >= 0.75) {
    const midPool = pool.filter(
      (q) => q.difficulty === 'intermediate' || q.difficulty === 'advanced'
    );
    const selected = (midPool.length > 0 ? midPool : pool).slice(0, 6);
    return {
      hasSufficientData: true,
      selectedQuestions: selected,
      recommendation: {
        id: `rec-levelup-${subjectId}`,
        subjectId,
        lessonId: params.lessonId,
        reasonAr: `أتقنت الأسئلة التأسيسية بنسبة ${Math.round(easyAcc * 100)}%.`,
        recommendedActionAr: 'تدريب متدرج على الأسئلة المتوسطة متعددة الخطوات.',
        recommendedDifficulty: 'intermediate',
        questionIds: selected.map((q) => q.id),
        priority: 'medium',
      },
    };
  }

  const retryWrong = pool.filter((q) => wrongIds.has(q.id));
  const selected = (retryWrong.length > 0 ? retryWrong : pool).slice(0, 6);
  return {
    hasSufficientData: true,
    selectedQuestions: selected,
    recommendation: {
      id: `rec-retry-${subjectId}`,
      subjectId,
      lessonId: params.lessonId,
      reasonAr: 'توجد أسئلة لم تُحل بشكل صحيح في الجلسات السابقة.',
      recommendedActionAr: 'إعادة التدريب على الأسئلة التي أخطأت فيها مع قراءة التفسير خطوة بخطوة.',
      recommendedDifficulty: 'basic_application',
      questionIds: selected.map((q) => q.id),
      priority: 'medium',
    },
  };
}

/**
 * Deterministic Fisher-Yates shuffle (supports seed for reproducible tests)
 */
export function shuffleQuestions<T>(items: T[], seed?: number): T[] {
  const arr = [...items];
  let state = seed ?? Math.floor(Math.random() * 1000000);
  const nextRand = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate an Examination strictly from APPROVED questions matching the blueprint.
 */
export function generateExamFromBlueprint(
  blueprint: ExaminationBlueprint,
  allQuestions: Question[],
  seed?: number
): Question[] {
  const approvedPool = allQuestions
    .map(normalizeQuestionDefaults)
    .filter((q) => isQuestionDeliverableToStudent(q))
    .filter((q) => q.subjectId === blueprint.subjectId)
    .filter((q) =>
      blueprint.semester && blueprint.semester !== 'all' ? q.semester === blueprint.semester : true
    )
    .filter((q) =>
      blueprint.unitIds.length > 0 ? blueprint.unitIds.includes(q.unitId) : true
    )
    .filter((q) =>
      blueprint.lessonIds.length > 0 ? blueprint.lessonIds.includes(q.lessonId) : true
    )
    .filter((q) =>
      blueprint.learningObjectiveIds && blueprint.learningObjectiveIds.length > 0
        ? Boolean(q.learningObjectiveId && blueprint.learningObjectiveIds.includes(q.learningObjectiveId))
        : true
    )
    .filter((q) =>
      blueprint.allowedQuestionTypes && blueprint.allowedQuestionTypes.length > 0
        ? blueprint.allowedQuestionTypes.includes(q.questionType)
        : true
    );

  const orderedPool = blueprint.randomizeOrder
    ? shuffleQuestions(approvedPool, seed)
    : approvedPool;

  const selected: Question[] = [];
  const selectedIds = new Set<string>();

  // Respect requested difficulty distribution first
  const entries = Object.entries(blueprint.difficultyDistribution) as [DifficultyLevel, number][];
  for (const [diff, targetCount] of entries) {
    if (!targetCount || targetCount <= 0) continue;
    const candidates = orderedPool.filter(
      (q) => q.difficulty === diff && !selectedIds.has(q.id)
    );
    for (const c of candidates.slice(0, targetCount)) {
      if (selected.length >= blueprint.questionCount) break;
      selected.push(c);
      selectedIds.add(c.id);
    }
  }

  // Fill remaining slots up to blueprint.questionCount from approvedPool
  for (const q of orderedPool) {
    if (selected.length >= blueprint.questionCount) break;
    if (!selectedIds.has(q.id)) {
      selected.push(q);
      selectedIds.add(q.id);
    }
  }

  return selected;
}

/**
 * Exam Timer Formatting & Draft Persistence Helpers (Stage 11 & 21)
 */
export function formatExamCountdown(remainingSeconds: number): string {
  const safe = Math.max(0, Math.floor(remainingSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export interface PersistedExamDraft {
  blueprintId: string;
  answers: Record<string, string>;
  flaggedIds: string[];
  startedAtMs: number;
  durationSeconds: number;
  questionIds: string[];
}

export function serializeExamDraft(draft: PersistedExamDraft): string {
  return JSON.stringify(draft);
}

export function deserializeExamDraft(raw: string | null): PersistedExamDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedExamDraft>;
    if (
      typeof parsed.blueprintId !== 'string' ||
      typeof parsed.startedAtMs !== 'number' ||
      typeof parsed.durationSeconds !== 'number' ||
      !Array.isArray(parsed.questionIds) ||
      !parsed.answers ||
      typeof parsed.answers !== 'object'
    ) {
      return null;
    }
    return {
      blueprintId: parsed.blueprintId,
      answers: parsed.answers as Record<string, string>,
      flaggedIds: Array.isArray(parsed.flaggedIds) ? parsed.flaggedIds : [],
      startedAtMs: parsed.startedAtMs,
      durationSeconds: parsed.durationSeconds,
      questionIds: parsed.questionIds,
    };
  } catch {
    return null;
  }
}

/**
 * Real Question Coverage Analytics per Lesson (Stage 17)
 * Uses actual counts; never fabricates coverage or mixes planning goals with real counts.
 */
export interface LessonQuestionCoverageRow {
  lessonId: string;
  lessonTitleAr: string;
  subjectId: SubjectId;
  unitId: string;
  semester: 1 | 2;
  totalQuestions: number;
  approvedCount: number;
  pendingCount: number;
  needsCorrectionCount: number;
  rejectedCount: number;
  difficultyLevelsCovered: DifficultyLevel[];
  questionTypesCovered: QuestionType[];
  objectivesCoveredCount: number;
  missingDifficulties: DifficultyLevel[];
  planningTarget: number;
  isBelowTarget: boolean;
}

export interface QuestionCoverageReport {
  totalQuestions: number;
  approvedQuestions: number;
  pendingQuestions: number;
  needsCorrectionQuestions: number;
  rejectedQuestions: number;
  lessonsWithInsufficientCoverage: number;
  lessonRows: LessonQuestionCoverageRow[];
  subjectDistribution: {
    subjectId: SubjectId;
    titleAr: string;
    total: number;
    approved: number;
    pending: number;
  }[];
}

const ALL_FIVE_DIFFICULTIES: DifficultyLevel[] = [
  'foundation',
  'basic_application',
  'intermediate',
  'advanced',
  'olympiad',
];

export function computeQuestionCoverageAnalytics(
  subjects: Subject[],
  lessons: Lesson[],
  questions: Question[],
  targets: Record<string, LessonCoverageTarget> = {},
  defaultMinTarget = 4
): QuestionCoverageReport {
  const normalizedQs = questions.map(normalizeQuestionDefaults);

  const lessonRows: LessonQuestionCoverageRow[] = lessons.map((lesson) => {
    const lessonQs = normalizedQs.filter((q) => q.lessonId === lesson.id);
    const approved = lessonQs.filter((q) => q.verificationStatus === 'APPROVED');
    const pending = lessonQs.filter((q) => q.verificationStatus === 'PENDING_REVIEW');
    const needsCorrection = lessonQs.filter(
      (q) => q.verificationStatus === 'NEEDS_CORRECTION' || q.verificationStatus === 'OUTDATED'
    );
    const rejected = lessonQs.filter((q) => q.verificationStatus === 'REJECTED');

    const diffSet = new Set<DifficultyLevel>(approved.map((q) => q.difficulty));
    const typeSet = new Set<QuestionType>(approved.map((q) => q.questionType));
    const objSet = new Set<string>(
      approved.map((q) => q.learningObjectiveId).filter((x): x is string => Boolean(x))
    );

    const missingDifficulties = ALL_FIVE_DIFFICULTIES.filter((d) => !diffSet.has(d));
    const planningTarget = targets[lesson.id]?.minQuestionsTarget ?? defaultMinTarget;

    return {
      lessonId: lesson.id,
      lessonTitleAr: lesson.titleAr,
      subjectId: lesson.subjectId,
      unitId: lesson.unitId,
      semester: lesson.semester,
      totalQuestions: lessonQs.length,
      approvedCount: approved.length,
      pendingCount: pending.length,
      needsCorrectionCount: needsCorrection.length,
      rejectedCount: rejected.length,
      difficultyLevelsCovered: Array.from(diffSet),
      questionTypesCovered: Array.from(typeSet),
      objectivesCoveredCount: objSet.size,
      missingDifficulties,
      planningTarget,
      isBelowTarget: approved.length < planningTarget,
    };
  });

  const subjectDistribution = subjects.map((s) => {
    const subQs = normalizedQs.filter((q) => q.subjectId === s.id);
    return {
      subjectId: s.id,
      titleAr: s.titleAr,
      total: subQs.length,
      approved: subQs.filter((q) => q.verificationStatus === 'APPROVED').length,
      pending: subQs.filter((q) => q.verificationStatus === 'PENDING_REVIEW').length,
    };
  });

  return {
    totalQuestions: normalizedQs.length,
    approvedQuestions: normalizedQs.filter((q) => q.verificationStatus === 'APPROVED').length,
    pendingQuestions: normalizedQs.filter((q) => q.verificationStatus === 'PENDING_REVIEW').length,
    needsCorrectionQuestions: normalizedQs.filter(
      (q) => q.verificationStatus === 'NEEDS_CORRECTION' || q.verificationStatus === 'OUTDATED'
    ).length,
    rejectedQuestions: normalizedQs.filter((q) => q.verificationStatus === 'REJECTED').length,
    lessonsWithInsufficientCoverage: lessonRows.filter((r) => r.isBelowTarget).length,
    lessonRows,
    subjectDistribution,
  };
}
