import { z } from 'zod';
import type {
  AdminAssistDraft,
  AdminAssistType,
  DifficultyLevel,
  GeneratedPracticeQuestion,
  Question,
  QuestionType,
  Semester,
  SubjectId,
} from '../types/curriculum';
import { DIFFICULTY_TIER_MAP, validateQuestionScientifically } from './questionEngine';

export interface ClassifiedGeminiError {
  httpStatus: number;
  isTransient: boolean;
  retryAfterSeconds?: number;
  userMessageAr: string;
}

export function extractRetryDelaySeconds(message: string): number | undefined {
  const match =
    message.match(/retry in\s+(\d+(?:\.\d+)?)s/i) ??
    message.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (!match) return undefined;
  const parsed = Math.ceil(Number(match[1]));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function isTransientGeminiError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  // Never blindly burst-retry 429 RESOURCE_EXHAUSTED quota errors in sub-second loops
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return false;
  }
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('fetch failed')
  );
}

export function classifyGeminiError(
  error: unknown,
  fallbackLabel = 'تعذر الاتصال بخدمة المعلم الذكي.'
): ClassifiedGeminiError {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes('GEMINI_TIMEOUT')) {
    return {
      httpStatus: 504,
      isTransient: true,
      userMessageAr: 'انتهت مهلة انتظار استجابة المعلم الذكي. يرجى المحاولة مرة أخرى بعد لحظات.',
    };
  }

  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    const retryAfterSeconds = extractRetryDelaySeconds(msg);
    let waitHint = 'يرجى الانتظار دقيقة واحدة قبل إعادة المحاولة';
    if (retryAfterSeconds) {
      if (retryAfterSeconds >= 3600) {
        const hours = Math.max(1, Math.round(retryAfterSeconds / 3600));
        waitHint = `تم استنفاد الحصة المجانية اليومية المؤقتة لخدمة الذكاء الاصطناعي، ويمكنك إعادة المحاولة بعد نحو ${hours} ساعة`;
      } else if (retryAfterSeconds >= 60) {
        const minutes = Math.ceil(retryAfterSeconds / 60);
        waitHint = `يرجى الانتظار نحو ${minutes} دقيقة قبل إعادة المحاولة`;
      } else {
        waitHint = `يرجى الانتظار نحو ${retryAfterSeconds} ثانية قبل إعادة المحاولة`;
      }
    }
    return {
      httpStatus: 429,
      isTransient: false,
      retryAfterSeconds,
      userMessageAr: `تم بلوغ الحد الأقصى المؤقت لطلبات المعلم الذكي. ${waitHint}، ويمكنك خلال ذلك متابعة دراسة الدروس وبنك الأسئلة بشكل طبيعي.`,
    };
  }

  if (
    msg.includes('API_KEY_INVALID') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('403')
  ) {
    return {
      httpStatus: 503,
      isTransient: false,
      userMessageAr:
        'تعذر التحقق من صلاحية مفتاح Gemini API. يرجى مراجعة إعدادات GEMINI_API_KEY في لوحة الأسرار (Settings > Secrets).',
    };
  }

  if (msg.includes('NOT_FOUND') || msg.includes('404')) {
    return {
      httpStatus: 502,
      isTransient: false,
      userMessageAr: 'نموذج الذكاء الاصطناعي المحدد غير متاح حالياً. يرجى تحديث الإعدادات على الخادم.',
    };
  }

  if (msg.includes('503') || msg.includes('UNAVAILABLE')) {
    return {
      httpStatus: 503,
      isTransient: true,
      userMessageAr: 'خدمة المعلم الذكي مشغولة مؤقتاً. يرجى إعادة المحاولة بعد بضع ثوانٍ.',
    };
  }

  return {
    httpStatus: 502,
    isTransient: false,
    userMessageAr: fallbackLabel,
  };
}

const VALID_DIFFICULTIES: ReadonlySet<DifficultyLevel> = new Set([
  'foundation',
  'basic_application',
  'intermediate',
  'advanced',
  'olympiad',
]);

export function parseGeneratedQuestionsJson(
  rawText: string,
  defaultDifficulty: DifficultyLevel = 'intermediate'
): GeneratedPracticeQuestion[] {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (!cleaned) {
    throw new Error('EMPTY_JSON_RESPONSE');
  }

  const parsed: unknown = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error('INVALID_JSON_ARRAY');
  }

  const normalized: GeneratedPracticeQuestion[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const promptAr = typeof record.promptAr === 'string' ? record.promptAr.trim() : '';
    const correctAnswer =
      typeof record.correctAnswer === 'string' ? record.correctAnswer.trim() : '';
    const explanationAr =
      typeof record.explanationAr === 'string' ? record.explanationAr.trim() : '';

    if (!promptAr || !correctAnswer || !explanationAr) continue;

    const rawType = record.questionType === 'numeric' ? 'numeric' : 'mcq';
    const rawOptions = Array.isArray(record.optionsAr)
      ? record.optionsAr
          .filter((opt): opt is string => typeof opt === 'string' && opt.trim().length > 0)
          .map((opt) => opt.trim())
      : [];

    if (rawType === 'mcq' && rawOptions.length < 2) {
      continue;
    }

    const diffCandidate = record.difficulty as DifficultyLevel;
    const difficulty = VALID_DIFFICULTIES.has(diffCandidate)
      ? diffCandidate
      : defaultDifficulty;

    normalized.push({
      promptAr,
      questionType: rawType,
      difficulty,
      optionsAr: rawType === 'mcq' ? rawOptions : [],
      correctAnswer,
      explanationAr,
    });
  }

  return normalized;
}

const QUESTION_TYPE_ENUM = z.enum([
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
]);

const DIFFICULTY_ENUM = z.enum([
  'foundation',
  'basic_application',
  'intermediate',
  'advanced',
  'olympiad',
]);

export const AdminGeneratedQuestionSchema = z.object({
  promptAr: z.string().trim().min(8).max(1500),
  questionType: QUESTION_TYPE_ENUM,
  difficulty: DIFFICULTY_ENUM,
  optionsAr: z.array(z.string().trim().min(1)).optional().default([]),
  correctAnswer: z.string().trim().min(1).max(600),
  correctAnswers: z.array(z.string().trim().min(1)).optional(),
  solutionStepsAr: z.array(z.string().trim().min(2)).min(1).max(12),
  explanationAr: z.string().trim().min(10).max(2000),
  conceptAr: z.string().trim().min(2).max(240),
  rubricAr: z.string().trim().max(800).optional(),
  commonMistakeAr: z.string().trim().max(500).optional(),
  requiredUnit: z.string().trim().max(40).optional(),
  marks: z.number().int().min(1).max(20).optional(),
  estimatedSeconds: z.number().int().min(30).max(900).optional(),
  learningObjectiveCode: z.string().trim().max(64).optional(),
  sourceContextAr: z.string().trim().min(3).max(500),
});

export const AdminGeneratedQuestionsBatchSchema = z.array(AdminGeneratedQuestionSchema).min(1).max(5);

export function parseAdminGeneratedQuestionsWithZod(
  rawText: string,
  meta: {
    subjectId: SubjectId;
    unitId: string;
    lessonId: string;
    semester: Semester;
    learningObjectiveId?: string;
    modelName: string;
    defaultMarks: number;
    defaultSeconds: number;
  }
): Question[] {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (!cleaned) {
    throw new Error('EMPTY_AI_QUESTIONS_JSON');
  }

  const rawParsed: unknown = JSON.parse(cleaned);
  const validated = AdminGeneratedQuestionsBatchSchema.parse(rawParsed);
  const nowIso = new Date().toISOString();

  return validated.map((item, idx) => {
    const qType: QuestionType = item.questionType;
    const base: Question = {
      id: `ai-q-${Date.now()}-${idx + 1}`,
      academicYearId: '2026-2027',
      gradeAr: 'الصف الثاني عشر',
      trackAr: 'المسار العلمي',
      subjectId: meta.subjectId,
      unitId: meta.unitId,
      lessonId: meta.lessonId,
      learningObjectiveId: meta.learningObjectiveId,
      semester: meta.semester,
      difficulty: item.difficulty,
      difficultyLevel: DIFFICULTY_TIER_MAP[item.difficulty],
      questionType: qType,
      promptAr: item.promptAr,
      optionsAr: item.optionsAr,
      correctAnswer: item.correctAnswer,
      correctAnswers: item.correctAnswers,
      solutionStepsAr: item.solutionStepsAr,
      explanationAr: item.explanationAr,
      whyCorrectAr: item.explanationAr,
      conceptAr: item.conceptAr,
      rubricAr: item.rubricAr,
      commonMistakeAr: item.commonMistakeAr,
      requiredUnit: item.requiredUnit,
      marks: item.marks ?? meta.defaultMarks,
      estimatedSeconds: item.estimatedSeconds ?? meta.defaultSeconds,
      // Mandatory safeguards: never auto-approved, never disguised as official exam
      origin: 'AI_GENERATED',
      verificationStatus: 'PENDING_REVIEW',
      sourceRefAr: `مسودة AI قيد المراجعة — السياق: ${item.sourceContextAr}`,
      aiMetadata: {
        model: meta.modelName,
        generatedAtIso: nowIso,
        sourceContextAr: item.sourceContextAr,
      },
      createdAtIso: nowIso,
      version: 1,
      isPublished: false,
    };

    const validation = validateQuestionScientifically(base);
    return {
      ...base,
      scientificValidation: validation,
    };
  });
}

export function parseAdminDraftJson(
  rawText: string,
  assistType: AdminAssistType
): AdminAssistDraft {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (!cleaned) {
    throw new Error('EMPTY_ADMIN_DRAFT');
  }

  const parsed: unknown = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('INVALID_ADMIN_DRAFT_OBJECT');
  }

  const record = parsed as Record<string, unknown>;
  const titleAr =
    typeof record.titleAr === 'string' && record.titleAr.trim().length > 0
      ? record.titleAr.trim()
      : 'مسودة محتوى تعليمي';
  const contentAr =
    typeof record.contentAr === 'string' && record.contentAr.trim().length > 0
      ? record.contentAr.trim()
      : '';

  if (!contentAr) {
    throw new Error('EMPTY_ADMIN_DRAFT_CONTENT');
  }

  const itemsAr = Array.isArray(record.itemsAr)
    ? record.itemsAr
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim())
    : [];

  const stepsAr = Array.isArray(record.stepsAr)
    ? record.stepsAr
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim())
    : undefined;

  // Always enforce aiGenerated: true and verificationStatus: 'NEEDS_REVIEW' regardless of model output
  return {
    assistType,
    aiGenerated: true,
    verificationStatus: 'NEEDS_REVIEW',
    generatedAtIso: new Date().toISOString(),
    titleAr,
    contentAr,
    itemsAr,
    keyTakeawayAr:
      typeof record.keyTakeawayAr === 'string' && record.keyTakeawayAr.trim().length > 0
        ? record.keyTakeawayAr.trim()
        : undefined,
    stepsAr,
    answerAr:
      typeof record.answerAr === 'string' && record.answerAr.trim().length > 0
        ? record.answerAr.trim()
        : undefined,
  };
}


