import type {
  CurriculumSource,
  DifficultyLevel,
  DifficultyTier,
  DuplicateMatch,
  ExaminationBlueprint,
  ExamBlueprintType,
  LearningObjective,
  Lesson,
  LessonCoverageTarget,
  PublicQuestion,
  Question,
  QuestionAnswerKey,
  QuestionBankAuditReport,
  QuestionFilter,
  QuestionLinkIssue,
  QuestionObjectiveIssue,
  QuestionOrigin,
  QuestionSourceIssue,
  QuestionType,
  QuestionTypePayloadIssue,
  QuestionVerificationState,
  RevisionRecommendation,
  ScientificValidationReport,
  StudentAnswerDetail,
  Subject,
  SubjectId,
  Unit,
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
  NEEDS_REVIEW: 'يحتاج مراجعة وتوثيق',
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

function deterministicSeedFromId(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export function deriveDefaultQuestionTitle(q: Pick<Question, 'titleAr' | 'conceptAr' | 'promptAr'>): string {
  if (q.titleAr && q.titleAr.trim().length >= 3) {
    return q.titleAr.trim();
  }
  if (q.conceptAr && q.conceptAr.trim().length >= 3) {
    return q.conceptAr.trim();
  }
  const clean = (q.promptAr ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= 72) return clean;
  return `${clean.slice(0, 69).trim()}...`;
}

export function normalizeQuestionDefaults(q: Question): Question {
  const origin: QuestionOrigin =
    q.origin ?? (q.aiMetadata ? 'AI_GENERATED' : 'ADMIN_CREATED');

  // Strict Phase 3.5/4A rule:
  // - AI-generated questions without explicit status default to PENDING_REVIEW
  // - Legacy questions without explicit verification evidence default to NEEDS_REVIEW (never auto-APPROVED!)
  let verificationStatus: QuestionVerificationState;
  if (q.verificationStatus) {
    verificationStatus = q.verificationStatus;
  } else if (origin === 'AI_GENERATED') {
    verificationStatus = 'PENDING_REVIEW';
  } else {
    verificationStatus = 'NEEDS_REVIEW';
  }

  return {
    ...q,
    titleAr: deriveDefaultQuestionTitle(q),
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
    createdAtIso: q.createdAtIso ?? '2026-10-01T00:00:00.000Z',
    lastReviewedAtIso: q.lastReviewedAtIso,
    version: q.version ?? 1,
  };
}

/**
 * Only explicitly APPROVED and published questions may be delivered to students.
 * NEEDS_REVIEW, PENDING_REVIEW, REJECTED, NEEDS_CORRECTION, and OUTDATED items are excluded.
 */
export function isQuestionDeliverableToStudent(q: {
  isPublished?: boolean;
  verificationStatus?: QuestionVerificationState;
}): boolean {
  if (!q.isPublished) return false;
  return q.verificationStatus === 'APPROVED';
}

export function toPublicQuestion(raw: Question): PublicQuestion {
  const q = normalizeQuestionDefaults(raw);
  const seed = deterministicSeedFromId(q.id);

  const matchingLeftsAr =
    q.matchingPairs && q.matchingPairs.length > 0
      ? q.matchingPairs.map((p) => p.leftAr)
      : undefined;

  let matchingRightsShuffledAr: string[] | undefined;
  if (q.matchingPairs && q.matchingPairs.length > 0) {
    matchingRightsShuffledAr = shuffleQuestions(
      q.matchingPairs.map((p) => p.rightAr),
      seed
    );
    // Avoid accidentally matching original index order when > 1 item
    if (
      matchingRightsShuffledAr.length > 1 &&
      matchingRightsShuffledAr.every((val, idx) => val === q.matchingPairs![idx].rightAr)
    ) {
      matchingRightsShuffledAr = [
        ...matchingRightsShuffledAr.slice(1),
        matchingRightsShuffledAr[0],
      ];
    }
  }

  let orderingItemsShuffledAr: string[] | undefined;
  if (q.orderingItemsAr && q.orderingItemsAr.length > 0) {
    orderingItemsShuffledAr = shuffleQuestions(q.orderingItemsAr, seed + 17);
    if (
      orderingItemsShuffledAr.length > 1 &&
      orderingItemsShuffledAr.every((val, idx) => val === q.orderingItemsAr![idx])
    ) {
      orderingItemsShuffledAr = [
        ...orderingItemsShuffledAr.slice(1),
        orderingItemsShuffledAr[0],
      ];
    }
  }

  const pub: PublicQuestion = {
    id: q.id,
    titleAr: q.titleAr,
    academicYearId: q.academicYearId,
    gradeAr: q.gradeAr,
    trackAr: q.trackAr,
    subjectId: q.subjectId,
    unitId: q.unitId,
    lessonId: q.lessonId,
    learningObjectiveId: q.learningObjectiveId,
    semester: q.semester,
    difficulty: q.difficulty,
    difficultyLevel: q.difficultyLevel,
    questionType: q.questionType,
    promptAr: q.promptAr,
    optionsAr: q.optionsAr,
    matchingLeftsAr,
    matchingRightsShuffledAr,
    orderingItemsShuffledAr,
    requiredUnit: q.requiredUnit,
    diagramKind: q.diagramKind,
    diagramCaptionAr: q.diagramCaptionAr,
    dataTable: q.dataTable,
    conceptAr: q.conceptAr,
    marks: q.marks,
    estimatedSeconds: q.estimatedSeconds,
    origin: q.origin,
    verificationStatus: q.verificationStatus,
    sourceId: q.sourceId,
    sourceRefAr: q.sourceRefAr,
    createdAtIso: q.createdAtIso,
    lastReviewedAtIso: q.lastReviewedAtIso,
    version: q.version,
    isPublished: q.isPublished,
  };
  return pub;
}

export function toPrivateAnswerKey(raw: Question): QuestionAnswerKey {
  const q = normalizeQuestionDefaults(raw);
  return {
    questionId: q.id,
    correctAnswer: q.correctAnswer,
    correctAnswers: q.correctAnswers,
    matchingPairs: q.matchingPairs,
    orderingItemsAr: q.orderingItemsAr,
    rubricAr: q.rubricAr,
    numericTolerance: q.numericTolerance,
    requiredUnit: q.requiredUnit,
    explanationAr: q.explanationAr,
    whyCorrectAr: q.whyCorrectAr,
    solutionStepsAr: q.solutionStepsAr,
    commonMistakeAr: q.commonMistakeAr,
    conceptAr: q.conceptAr,
    origin: q.origin,
    sourceId: q.sourceId,
    sourceRefAr: q.sourceRefAr,
    aiMetadata: q.aiMetadata,
    scientificValidation: q.scientificValidation,
    updatedAtIso: q.lastReviewedAtIso ?? q.createdAtIso,
  };
}

export function filterBankQuestions<T extends PublicQuestion>(
  questions: T[],
  filter: QuestionFilter
): T[] {
  const query = filter.searchQuery?.trim().toLowerCase() ?? '';
  const savedSet = filter.onlySavedIds ? new Set(filter.onlySavedIds) : null;
  const incorrectSet = filter.onlyIncorrectIds ? new Set(filter.onlyIncorrectIds) : null;

  return questions.filter((q) => {
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
      const hay = `${q.promptAr} ${q.conceptAr ?? ''} ${q.sourceRefAr ?? ''}`.toLowerCase();
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

export function isManualGradingType(type: QuestionType): boolean {
  return type === 'scientific_explanation' || type === 'structured_long';
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
      (question.promptAr.includes('معادلة') || question.promptAr.includes('تفاعل متزن') || question.promptAr.includes('أكمل التفاعل')) &&
      question.questionType !== 'true_false' &&
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

export function buildAdaptivePracticePlan<T extends PublicQuestion>(params: {
  questions: T[];
  answerHistory: StudentAnswerDetail[];
  subjectId?: SubjectId;
  lessonId?: string;
}): {
  recommendation: RevisionRecommendation;
  selectedQuestions: T[];
  hasSufficientData: boolean;
} {
  const pool = params.questions
    .filter((q) => isQuestionDeliverableToStudent(q))
    .filter((q) => (params.subjectId ? q.subjectId === params.subjectId : true))
    .filter((q) => (params.lessonId ? q.lessonId === params.lessonId : true));

  const poolIds = new Set(pool.map((q) => q.id));
  const relevantHistory = params.answerHistory.filter((h) => poolIds.has(h.questionId));

  const subjectId = params.subjectId ?? pool[0]?.subjectId ?? 'physics';

  if (relevantHistory.length === 0) {
    const starter = pool
      .filter(
        (q) =>
          q.difficulty === 'foundation' ||
          q.difficulty === 'basic_application' ||
          q.difficulty === 'intermediate'
      )
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
        recommendedActionAr:
          'ابدأ بجلسة استكشافية متوازنة من المستويات التأسيسية والمتوسطة لتحديد مستواك الفعلي.',
        recommendedDifficulty: 'foundation',
        questionIds: selected.map((q) => q.id),
        priority: 'normal',
      },
    };
  }

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
        recommendedActionAr:
          'جلسة مراجعة مركزة بأسئلة تأسيسية وتطبيق مباشر مع إعادة الأسئلة المخطوءة.',
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
export function generateExamFromBlueprint<T extends PublicQuestion>(
  blueprint: ExaminationBlueprint,
  allQuestions: T[],
  seed?: number
): T[] {
  const approvedPool = allQuestions
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

  const selected: T[] = [];
  const selectedIds = new Set<string>();

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

  for (const q of orderedPool) {
    if (selected.length >= blueprint.questionCount) break;
    if (!selectedIds.has(q.id)) {
      selected.push(q);
      selectedIds.add(q.id);
    }
  }

  return selected;
}

export function formatExamCountdown(remainingSeconds: number): string {
  const safe = Math.max(0, Math.floor(remainingSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export interface PersistedExamDraft {
  blueprintId: string;
  sessionId?: string;
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
      sessionId: typeof parsed.sessionId === 'string' ? parsed.sessionId : undefined,
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

export interface LessonQuestionCoverageRow {
  lessonId: string;
  lessonTitleAr: string;
  subjectId: SubjectId;
  unitId: string;
  semester: 1 | 2;
  totalQuestions: number;
  approvedCount: number;
  needsReviewCount: number;
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
  needsReviewQuestions: number;
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
    needsReview: number;
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
    const needsReview = lessonQs.filter((q) => q.verificationStatus === 'NEEDS_REVIEW');
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
      needsReviewCount: needsReview.length,
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
      needsReview: subQs.filter((q) => q.verificationStatus === 'NEEDS_REVIEW').length,
      pending: subQs.filter((q) => q.verificationStatus === 'PENDING_REVIEW').length,
    };
  });

  return {
    totalQuestions: normalizedQs.length,
    approvedQuestions: normalizedQs.filter((q) => q.verificationStatus === 'APPROVED').length,
    needsReviewQuestions: normalizedQs.filter((q) => q.verificationStatus === 'NEEDS_REVIEW').length,
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

const ALL_QUESTION_TYPES_LIST: QuestionType[] = [
  'mcq',
  'multi_select',
  'true_false',
  'fill_blank',
  'short_answer',
  'numeric',
  'matching',
  'ordering',
  'scientific_explanation',
  'structured_long',
  'diagram_interpretation',
  'data_graph_analysis',
];

const PRIVATE_KEY_FIELDS_FOR_AUDIT = new Set([
  'correctAnswer',
  'correctAnswers',
  'matchingPairs',
  'orderingItemsAr',
  'explanationAr',
  'whyCorrectAr',
  'solutionStepsAr',
  'commonMistakeAr',
  'rubricAr',
  'numericTolerance',
  'aiMetadata',
]);

/**
 * Subphase 4A Comprehensive Question Bank Integrity Audit.
 * Validates unique IDs, duplicates, lesson/unit/semester links, learning objectives,
 * all 5 difficulties, all 12 question type payloads, source attribution, scientific checks,
 * and strict public/private answer-key separation.
 */
export function auditQuestionBankIntegrity(params: {
  questions: Question[];
  legacyIds?: Set<string>;
  extendedIds?: Set<string>;
  lessons: Lesson[];
  units: Unit[];
  objectives: LearningObjective[];
  sources: CurriculumSource[];
  publicSnapshot?: PublicQuestion[];
}): QuestionBankAuditReport {
  const normalized = params.questions.map(normalizeQuestionDefaults);
  const lessonMap = new Map(params.lessons.map((l) => [l.id, l]));
  const unitMap = new Map(params.units.map((u) => [u.id, u]));
  const objMap = new Map(params.objectives.map((o) => [o.id, o]));
  const srcMap = new Map(params.sources.map((s) => [s.id, s]));

  const idCounts = new Map<string, number>();
  for (const q of normalized) {
    idCounts.set(q.id, (idCounts.get(q.id) ?? 0) + 1);
  }
  const duplicateIds = Array.from(idCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([id]) => id);

  const lessonLinkIssues: QuestionLinkIssue[] = [];
  const objectiveIssues: QuestionObjectiveIssue[] = [];
  const typePayloadIssues: QuestionTypePayloadIssue[] = [];
  const sourceVerificationIssues: QuestionSourceIssue[] = [];
  const scientificIssues: { questionId: string; errorsAr: string[]; warningsAr: string[] }[] = [];

  const coverageBySubject: Record<SubjectId, { total: number; approved: number }> = {
    physics: { total: 0, approved: 0 },
    chemistry: { total: 0, approved: 0 },
    biology: { total: 0, approved: 0 },
    math: { total: 0, approved: 0 },
    islamic: { total: 0, approved: 0 },
    arabic: { total: 0, approved: 0 },
    english: { total: 0, approved: 0 },
    social_studies: { total: 0, approved: 0 },
    german: { total: 0, approved: 0 },
  };
  const coverageByDifficulty: Record<DifficultyLevel, { total: number; approved: number }> = {
    foundation: { total: 0, approved: 0 },
    basic_application: { total: 0, approved: 0 },
    intermediate: { total: 0, approved: 0 },
    advanced: { total: 0, approved: 0 },
    olympiad: { total: 0, approved: 0 },
  };
  const coverageByType = Object.fromEntries(
    ALL_QUESTION_TYPES_LIST.map((t) => [t, { total: 0, approved: 0 }])
  ) as Record<QuestionType, { total: number; approved: number }>;

  const approvedPerLesson = new Map<string, number>();

  for (const q of normalized) {
    const isApproved = isQuestionDeliverableToStudent(q);
    coverageBySubject[q.subjectId].total += 1;
    coverageByDifficulty[q.difficulty].total += 1;
    coverageByType[q.questionType].total += 1;
    if (isApproved) {
      coverageBySubject[q.subjectId].approved += 1;
      coverageByDifficulty[q.difficulty].approved += 1;
      coverageByType[q.questionType].approved += 1;
      approvedPerLesson.set(q.lessonId, (approvedPerLesson.get(q.lessonId) ?? 0) + 1);
    }

    // 1. Lesson & Unit link validation
    const lesson = lessonMap.get(q.lessonId);
    if (!lesson) {
      lessonLinkIssues.push({
        questionId: q.id,
        issue: 'missing_lesson',
        detailAr: `الدرس المرتبط (${q.lessonId}) غير موجود في قائمة الدروس.`,
      });
    } else {
      if (lesson.subjectId !== q.subjectId) {
        lessonLinkIssues.push({
          questionId: q.id,
          issue: 'subject_mismatch',
          detailAr: `مادة السؤال (${q.subjectId}) لا تطابق مادة الدرس (${lesson.subjectId}).`,
        });
      }
      if (lesson.unitId !== q.unitId) {
        lessonLinkIssues.push({
          questionId: q.id,
          issue: 'unit_mismatch',
          detailAr: `وحدة السؤال (${q.unitId}) لا تطابق وحدة الدرس (${lesson.unitId}).`,
        });
      }
      if (lesson.semester !== q.semester) {
        lessonLinkIssues.push({
          questionId: q.id,
          issue: 'semester_mismatch',
          detailAr: `فصل السؤال (${q.semester}) لا يطابق فصل الدرس (${lesson.semester}).`,
        });
      }
    }
    if (!unitMap.has(q.unitId)) {
      lessonLinkIssues.push({
        questionId: q.id,
        issue: 'missing_unit',
        detailAr: `الوحدة المرتبطة (${q.unitId}) غير مسجلة في فهرس الوحدات.`,
      });
    }

    // 2. Learning objective validation
    if (!q.learningObjectiveId) {
      objectiveIssues.push({ questionId: q.id, issue: 'missing_objective' });
    } else {
      const obj = objMap.get(q.learningObjectiveId);
      if (!obj) {
        objectiveIssues.push({
          questionId: q.id,
          issue: 'unknown_objective',
          learningObjectiveId: q.learningObjectiveId,
        });
      } else if (obj.subjectId !== q.subjectId || obj.unitId !== q.unitId) {
        objectiveIssues.push({
          questionId: q.id,
          issue: 'objective_scope_mismatch',
          learningObjectiveId: q.learningObjectiveId,
        });
      }
    }

    // 3. Question type payload validation (all 12 types)
    if (q.questionType === 'mcq' && (!q.optionsAr || q.optionsAr.length < 3)) {
      typePayloadIssues.push({
        questionId: q.id,
        questionType: q.questionType,
        issueAr: 'سؤال الاختيار من متعدد يتطلب ٣ خيارات على الأقل.',
      });
    }
    if (
      q.questionType === 'multi_select' &&
      ((!q.optionsAr || q.optionsAr.length < 3) || (!q.correctAnswers || q.correctAnswers.length < 1))
    ) {
      typePayloadIssues.push({
        questionId: q.id,
        questionType: q.questionType,
        issueAr: 'سؤال الاختيار متعدد الإجابات يتطلب خيارات ومصفوفة correctAnswers.',
      });
    }
    if (q.questionType === 'true_false' && !['صواب', 'خطأ', 'صح'].includes(q.correctAnswer.trim())) {
      typePayloadIssues.push({
        questionId: q.id,
        questionType: q.questionType,
        issueAr: 'إجابة سؤال صح/خطأ يجب أن تكون «صواب» أو «خطأ».',
      });
    }
    if (q.questionType === 'numeric' && parseNumericOrMathValue(q.correctAnswer).value === null) {
      typePayloadIssues.push({
        questionId: q.id,
        questionType: q.questionType,
        issueAr: 'السؤال الرقمي لا يحتوي قيمة عددية قابلة للتحقق.',
      });
    }
    if (q.questionType === 'matching' && (!q.matchingPairs || q.matchingPairs.length < 2)) {
      typePayloadIssues.push({
        questionId: q.id,
        questionType: q.questionType,
        issueAr: 'سؤال المزاوجة يتطلب زوجين مترابطين على الأقل في matchingPairs.',
      });
    }
    if (q.questionType === 'ordering' && (!q.orderingItemsAr || q.orderingItemsAr.length < 2)) {
      typePayloadIssues.push({
        questionId: q.id,
        questionType: q.questionType,
        issueAr: 'سؤال الترتيب يتطلب عنصرين على الأقل في orderingItemsAr.',
      });
    }
    if (
      (q.questionType === 'scientific_explanation' || q.questionType === 'structured_long') &&
      (!q.rubricAr || q.rubricAr.trim().length < 5)
    ) {
      typePayloadIssues.push({
        questionId: q.id,
        questionType: q.questionType,
        issueAr: 'السؤال المقالي/التفسيري يتطلب سلم تقدير rubricAr واضحاً.',
      });
    }

    // 4. Source & verification checks
    if (!q.sourceId) {
      sourceVerificationIssues.push({
        questionId: q.id,
        issue: 'missing_source_id',
        origin: q.origin,
        verificationStatus: q.verificationStatus,
      });
    } else if (!srcMap.has(q.sourceId)) {
      sourceVerificationIssues.push({
        questionId: q.id,
        issue: 'unknown_source_id',
        origin: q.origin,
        verificationStatus: q.verificationStatus,
        sourceId: q.sourceId,
      });
    }
    if (
      q.origin === 'OFFICIAL_PAST_EXAM' &&
      (!q.sourceId || !srcMap.has(q.sourceId) || !q.sourceRefAr)
    ) {
      sourceVerificationIssues.push({
        questionId: q.id,
        issue: 'official_without_verified_source',
        origin: q.origin,
        verificationStatus: q.verificationStatus,
        sourceId: q.sourceId,
      });
    }
    if (q.origin === 'TEACHER_RESOURCE' && (!q.sourceRefAr || q.sourceRefAr.trim().length < 3)) {
      sourceVerificationIssues.push({
        questionId: q.id,
        issue: 'teacher_without_attribution',
        origin: q.origin,
        verificationStatus: q.verificationStatus,
      });
    }
    if (
      q.origin === 'AI_GENERATED' &&
      q.verificationStatus === 'APPROVED' &&
      !q.lastReviewedAtIso
    ) {
      sourceVerificationIssues.push({
        questionId: q.id,
        issue: 'ai_approved_without_review_timestamp',
        origin: q.origin,
        verificationStatus: q.verificationStatus,
        sourceId: q.sourceId,
      });
    }

    // 5. Scientific check
    const sci = validateQuestionScientifically(q);
    if (!sci.isValid || sci.warningsAr.length > 0) {
      scientificIssues.push({
        questionId: q.id,
        errorsAr: sci.errorsAr,
        warningsAr: sci.warningsAr,
      });
    }
  }

  // Public/Private protection checks
  const publicRecords = normalized.map(toPublicQuestion);
  const privateKeys = normalized.map(toPrivateAnswerKey);
  const publicLeakCheckPassed = publicRecords.every((pub) => {
    const keys = Object.keys(pub as unknown as Record<string, unknown>);
    return !keys.some((k) => PRIVATE_KEY_FIELDS_FOR_AUDIT.has(k));
  });
  const pubIdSet = new Set(publicRecords.map((p) => p.id));
  const privIdSet = new Set(privateKeys.map((k) => k.questionId));
  const publicPrivateParityPassed =
    publicRecords.length === privateKeys.length &&
    pubIdSet.size === privIdSet.size &&
    Array.from(pubIdSet).every((id) => privIdSet.has(id));

  let publicClientSyncPassed: boolean | undefined;
  if (params.publicSnapshot) {
    const deliverableServerIds = normalized
      .filter((q) => isQuestionDeliverableToStudent(q))
      .map((q) => q.id);
    const snapshotIds = params.publicSnapshot.map((p) => p.id);
    const snapshotNoLeaks = params.publicSnapshot.every((pub) => {
      const keys = Object.keys(pub as unknown as Record<string, unknown>);
      return !keys.some((k) => PRIVATE_KEY_FIELDS_FOR_AUDIT.has(k));
    });
    publicClientSyncPassed =
      snapshotNoLeaks &&
      deliverableServerIds.length === snapshotIds.length &&
      deliverableServerIds.every((id, idx) => snapshotIds[idx] === id);
  }

  return {
    generatedAtIso: new Date().toISOString(),
    counts: {
      legacy: params.legacyIds ? normalized.filter((q) => params.legacyIds!.has(q.id)).length : 0,
      extended: params.extendedIds ? normalized.filter((q) => params.extendedIds!.has(q.id)).length : 0,
      total: normalized.length,
      approvedDeliverable: normalized.filter((q) => isQuestionDeliverableToStudent(q)).length,
      needsReview: normalized.filter((q) => q.verificationStatus === 'NEEDS_REVIEW').length,
      pendingReview: normalized.filter((q) => q.verificationStatus === 'PENDING_REVIEW').length,
      needsCorrection: normalized.filter((q) => q.verificationStatus === 'NEEDS_CORRECTION').length,
      rejected: normalized.filter((q) => q.verificationStatus === 'REJECTED').length,
      outdated: normalized.filter((q) => q.verificationStatus === 'OUTDATED').length,
    },
    uniqueIdCheckPassed: duplicateIds.length === 0,
    duplicateIds,
    duplicateMatches: detectQuestionDuplicates(normalized),
    lessonLinkIssues,
    objectiveIssues,
    typePayloadIssues,
    sourceVerificationIssues,
    scientificIssues,
    coverageBySubject,
    coverageByDifficulty,
    coverageByType,
    lessonsWithZeroApproved: params.lessons
      .filter((l) => (approvedPerLesson.get(l.id) ?? 0) === 0)
      .map((l) => l.id),
    publicLeakCheckPassed,
    publicPrivateParityPassed,
    publicClientSyncPassed,
  };
}
