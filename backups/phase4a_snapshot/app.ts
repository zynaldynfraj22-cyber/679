import express, { type Express, type Request, type Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import {
  classifyGeminiError,
  isTransientGeminiError,
  parseAdminDraftJson,
  parseAdminGeneratedQuestionsWithZod,
} from '../src/utils/geminiHelpers';
import {
  isQuestionDeliverableToStudent,
  shuffleQuestions,
} from '../src/utils/questionEngine';
import { OFFICIAL_LEARNING_OBJECTIVES } from '../src/data/sourcesAndCatalog';
import type {
  AdminAssistType,
  DifficultyLevel,
  ExamAttempt,
  ExamStartResponse,
  ExamSubmitResponse,
  PracticeAnswerResponse,
  PracticeStartResponse,
  Question,
  QuestionType,
  Semester,
  SubjectId,
} from '../src/types/curriculum';
import {
  createAuthMiddlewares,
  getAdminFirestore,
  getAdminFirestoreStatus,
  markAdminFirestoreUnavailable,
  type AuthenticatedRequest,
  type TokenVerifier,
} from './firebaseAdmin';
import {
  adminAiLimiter,
  assessmentApiLimiter,
  createRateLimitMiddleware,
  studentTutorHourLimiter,
  studentTutorMinuteLimiter,
} from './rateLimiter';
import { gradeBankAssessment, gradeQuestionWithAnswerKey } from './gradingEngine';
import {
  buildMigrationDryRunReport,
  cacheServerAttemptForUser,
  createExamSession,
  createPracticeSession,
  getAllServerQuestions,
  getCachedServerAttemptsForUser,
  getExamSession,
  getPublicQuestionsByIds,
  getServerQuestionAndKey,
  listAdminQuestionsWithAudit,
  listPublicQuestionsForStudents,
  markExamSessionSubmitted,
  registerGeneratedAiQuestionsForReview,
  reviewQuestionStatusAsAdmin,
  upsertQuestionAsAdmin,
} from './questionStore';

const MODEL_NAME = 'gemini-4-hydrogen';
const GEMINI_TIMEOUT_MS = 25_000;

const SUBJECT_ENUM = z.enum(['physics', 'chemistry', 'biology', 'math']);
const DIFFICULTY_ENUM = z.enum([
  'foundation',
  'basic_application',
  'intermediate',
  'advanced',
  'olympiad',
]);
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
const QUESTION_STATUS_ENUM = z.enum([
  'PENDING_REVIEW',
  'NEEDS_REVIEW',
  'APPROVED',
  'REJECTED',
  'NEEDS_CORRECTION',
  'OUTDATED',
]);
const ORIGIN_ENUM = z.enum([
  'OFFICIAL_PAST_EXAM',
  'TEACHER_RESOURCE',
  'AI_GENERATED',
  'ADMIN_CREATED',
]);

const TutorChatBodySchema = z.object({
  message: z.string().trim().min(2).max(2000),
  mode: z.enum(['explain', 'solve', 'general']).optional().default('explain'),
  lessonTitle: z.string().trim().max(180).optional().default('المنهج العُماني'),
  subjectTitle: z.string().trim().max(120).optional().default('المسار العلمي'),
  lessonContext: z.string().max(8000).optional().default(''),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(800),
      })
    )
    .max(6)
    .optional()
    .default([]),
});

const AdminGenerateQuestionsBodySchema = z.object({
  subjectId: SUBJECT_ENUM.optional().default('physics'),
  unitId: z.string().trim().min(2).max(128).optional().default('phys-u1'),
  lessonId: z.string().trim().min(2).max(128).optional().default('phys-u1-l1'),
  semester: z.union([z.literal(1), z.literal(2)]).optional().default(1),
  lessonTitle: z.string().trim().min(2).max(180),
  subjectTitle: z.string().trim().min(2).max(120),
  difficulty: DIFFICULTY_ENUM.optional().default('intermediate'),
  questionType: QUESTION_TYPE_ENUM.optional().default('mcq'),
  count: z.number().int().min(1).max(5).optional().default(3),
  lessonContext: z.string().max(8000).optional().default(''),
  learningObjectiveId: z.string().trim().max(128).optional(),
});

const AdminAssistBodySchema = z.object({
  assistType: z.enum([
    'explanation',
    'summary',
    'examples',
    'exercises',
    'objectives',
    'gap_analysis',
  ]),
  subjectTitle: z.string().trim().min(2).max(120),
  unitTitle: z.string().trim().max(160).optional().default('وحدة منهجية'),
  lessonTitle: z.string().trim().min(2).max(180),
  semester: z.union([z.literal(1), z.literal(2)]).optional().default(1),
  officialRef: z.string().trim().max(180).optional().default(''),
  existingContext: z.string().max(6000).optional().default(''),
  sourceSummary: z.string().max(1500).optional().default(''),
});

const PracticeStartBodySchema = z.object({
  subjectId: z.union([SUBJECT_ENUM, z.literal('all')]).optional().default('all'),
  unitId: z.string().trim().max(128).optional().default('all'),
  lessonId: z.string().trim().max(128).optional().default('all'),
  semester: z.union([z.literal(1), z.literal(2), z.literal('all')]).optional().default('all'),
  difficulty: z.union([DIFFICULTY_ENUM, z.literal('all')]).optional().default('all'),
  questionType: z.union([QUESTION_TYPE_ENUM, z.literal('all')]).optional().default('all'),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

const PracticeAnswerBodySchema = z.object({
  sessionId: z.string().trim().max(128).optional(),
  questionId: z.string().trim().min(2).max(128),
  answer: z.string().max(4000),
});

const ExamStartBodySchema = z.object({
  mode: z
    .enum([
      'lesson_exam',
      'question_bank',
      'lesson_test',
      'unit_test',
      'semester_test',
      'comprehensive_subject',
      'mock_final',
      'custom_practice',
    ])
    .optional()
    .default('lesson_exam'),
  titleAr: z.string().trim().min(2).max(180).optional().default('اختبار تقييمي'),
  subjectId: z.union([SUBJECT_ENUM, z.literal('all')]).optional().default('all'),
  unitIds: z.array(z.string().trim().min(2).max(128)).max(50).optional().default([]),
  lessonIds: z.array(z.string().trim().min(2).max(128)).max(100).optional().default([]),
  semester: z.union([z.literal(1), z.literal(2), z.literal('all')]).optional().default('all'),
  difficulty: z.union([DIFFICULTY_ENUM, z.literal('all')]).optional().default('all'),
  questionType: z.union([QUESTION_TYPE_ENUM, z.literal('all')]).optional().default('all'),
  questionCount: z.number().int().min(1).max(60).optional().default(10),
  durationMinutes: z.number().int().min(1).max(180).optional().default(15),
  passingScorePercent: z.number().int().min(10).max(100).optional().default(60),
  randomizeOrder: z.boolean().optional().default(false),
});

const ExamSubmitBodySchema = z.object({
  sessionId: z.string().trim().min(4).max(128),
  answers: z.record(z.string(), z.string().max(4000)),
});

const AdminQuestionUpsertSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2)
    .max(128)
    .regex(/^[a-zA-Z0-9_\-]+$/),
  subjectId: SUBJECT_ENUM,
  unitId: z.string().trim().min(2).max(128),
  lessonId: z.string().trim().min(2).max(128),
  learningObjectiveId: z.string().trim().max(128).optional(),
  semester: z.union([z.literal(1), z.literal(2)]),
  difficulty: DIFFICULTY_ENUM,
  questionType: QUESTION_TYPE_ENUM,
  promptAr: z.string().trim().min(8).max(1500),
  optionsAr: z.array(z.string().trim().max(400)).max(8).optional(),
  correctAnswer: z.string().trim().min(1).max(2000),
  correctAnswers: z.array(z.string().trim().max(400)).max(8).optional(),
  matchingPairs: z
    .array(
      z.object({
        leftAr: z.string().trim().min(1).max(400),
        rightAr: z.string().trim().min(1).max(400),
      })
    )
    .max(8)
    .optional(),
  orderingItemsAr: z.array(z.string().trim().min(1).max(400)).max(10).optional(),
  rubricAr: z.string().trim().max(1200).optional(),
  numericTolerance: z.number().min(0).max(10000).optional(),
  requiredUnit: z.string().trim().max(60).optional(),
  explanationAr: z.string().trim().min(5).max(2000),
  whyCorrectAr: z.string().trim().max(1500).optional(),
  solutionStepsAr: z.array(z.string().trim().max(600)).max(15).optional(),
  commonMistakeAr: z.string().trim().max(800).optional(),
  conceptAr: z.string().trim().max(300).optional(),
  marks: z.number().int().min(1).max(20),
  estimatedSeconds: z.number().int().min(15).max(1200).optional(),
  origin: ORIGIN_ENUM.optional().default('ADMIN_CREATED'),
  verificationStatus: QUESTION_STATUS_ENUM.optional().default('NEEDS_REVIEW'),
  sourceId: z.string().trim().max(128).optional(),
  sourceRefAr: z.string().trim().max(400).optional(),
  isPublished: z.boolean().optional().default(false),
  changeSummaryAr: z.string().trim().max(300).optional().default('تحديث إداري للسؤال'),
});

const AdminReviewBodySchema = z.object({
  status: QUESTION_STATUS_ENUM,
  notesAr: z.string().trim().min(2).max(1000),
});

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = GEMINI_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('GEMINI_TIMEOUT'));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function generateWithRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(fn());
    } catch (error) {
      lastError = error;
      if (!isTransientGeminiError(error) || attempt === maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw lastError;
}

export interface CreateAppOptions {
  tokenVerifier?: TokenVerifier;
  geminiClientOverride?: GoogleGenAI | null;
}

export function createServerApp(options: CreateAppOptions = {}): Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const { requireVerifiedUser, requireAdministrator } = createAuthMiddlewares(
    options.tokenVerifier
  );

  const studentTutorRateGuard = [
    createRateLimitMiddleware(
      studentTutorMinuteLimiter,
      'tutor-min',
      'تم تجاوز الحد الأقصى لرسائل المعلم الذكي في الدقيقة.'
    ),
    createRateLimitMiddleware(
      studentTutorHourLimiter,
      'tutor-hr',
      'تم تجاوز الحد الأقصى الساعي لطلبات المعلم الذكي.'
    ),
  ];

  const adminAiRateGuard = createRateLimitMiddleware(
    adminAiLimiter,
    'admin-ai',
    'تم تجاوز الحد المسموح لطلبات التوليد الإداري بالذكاء الاصطناعي.'
  );

  const assessmentRateGuard = createRateLimitMiddleware(
    assessmentApiLimiter,
    'assessment',
    'تم إرسال طلبات تقييم كثيرة خلال وقت قصير.'
  );

  // Health Check
  app.get('/api/health', (_req: Request, res: Response) => {
    const hasGeminiKey = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    const firestoreStatus = getAdminFirestoreStatus();
    res.json({
      ok: true,
      aiConfigured: hasGeminiKey,
      firestoreAdminAvailable: firestoreStatus.available,
    });
  });

  // Public student-safe question catalog (strictly APPROVED && isPublished, NO answer keys)
  app.get('/api/questions', (req: Request, res: Response) => {
    const subjectRaw = typeof req.query.subjectId === 'string' ? req.query.subjectId : 'all';
    const unitId = typeof req.query.unitId === 'string' ? req.query.unitId : 'all';
    const lessonId = typeof req.query.lessonId === 'string' ? req.query.lessonId : 'all';
    const semRaw = typeof req.query.semester === 'string' ? req.query.semester : 'all';
    const difficultyRaw = typeof req.query.difficulty === 'string' ? req.query.difficulty : 'all';
    const typeRaw = typeof req.query.questionType === 'string' ? req.query.questionType : 'all';
    const searchQuery = typeof req.query.searchQuery === 'string' ? req.query.searchQuery : '';

    const semester: Semester | 'all' =
      semRaw === '1' ? 1 : semRaw === '2' ? 2 : 'all';

    const questions = listPublicQuestionsForStudents({
      subjectId: SUBJECT_ENUM.safeParse(subjectRaw).success ? (subjectRaw as SubjectId) : 'all',
      unitId,
      lessonId,
      semester,
      difficulty: DIFFICULTY_ENUM.safeParse(difficultyRaw).success
        ? (difficultyRaw as DifficultyLevel)
        : 'all',
      questionType: QUESTION_TYPE_ENUM.safeParse(typeRaw).success
        ? (typeRaw as QuestionType)
        : 'all',
      searchQuery,
    });

    res.json({ questions, total: questions.length });
  });

  // Start practice session (Authenticated Student)
  app.post(
    '/api/practice/start',
    requireVerifiedUser,
    assessmentRateGuard,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = PracticeStartBodySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ error: 'بيانات بدء التدريب غير صالحة.' });
        return;
      }

      const pool = listPublicQuestionsForStudents({
        subjectId: parsed.data.subjectId,
        unitId: parsed.data.unitId,
        lessonId: parsed.data.lessonId,
        semester: parsed.data.semester,
        difficulty: parsed.data.difficulty,
        questionType: parsed.data.questionType,
      });

      const selected = pool.slice(0, parsed.data.limit);
      const session = createPracticeSession(
        req.authUser!.uid,
        selected.map((q) => q.id)
      );

      const payload: PracticeStartResponse = {
        sessionId: session.sessionId,
        questions: selected,
        totalAvailable: pool.length,
      };
      res.json(payload);
    }
  );

  // Server-side single-question practice grading (Authenticated Student)
  app.post(
    '/api/practice/answer',
    requireVerifiedUser,
    assessmentRateGuard,
    async (req: AuthenticatedRequest, res: Response) => {
      const parsed = PracticeAnswerBodySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ error: 'صيغة إجابة التدريب غير صالحة.' });
        return;
      }

      const record = await getServerQuestionAndKey(parsed.data.questionId);
      if (!record || !isQuestionDeliverableToStudent(record.question)) {
        res.status(404).json({ error: 'السؤال المطلوب غير متاح للتدريب حالياً.' });
        return;
      }

      const graded = gradeQuestionWithAnswerKey(
        record.question,
        record.answerKey,
        parsed.data.answer
      );

      let persistedToFirestore = false;
      const { db } = getAdminFirestore();
      if (db) {
        try {
          await db
            .collection('users')
            .doc(req.authUser!.uid)
            .collection('practiceLogs')
            .add({
              userId: req.authUser!.uid,
              questionId: record.question.id,
              lessonId: record.question.lessonId,
              subjectId: record.question.subjectId,
              isCorrect: graded.isCorrect,
              needsManualGrading: Boolean(graded.needsManualGrading),
              earnedMarks: graded.earnedMarks,
              maxMarks: graded.maxMarks,
              answeredAt: FieldValue.serverTimestamp(),
            });
          persistedToFirestore = true;
        } catch (err) {
          markAdminFirestoreUnavailable(err);
        }
      }

      const responsePayload: PracticeAnswerResponse = {
        questionId: graded.questionId,
        isCorrect: graded.isCorrect,
        needsManualGrading: Boolean(graded.needsManualGrading),
        earnedMarks: graded.earnedMarks,
        maxMarks: graded.maxMarks,
        correctAnswer: graded.correctAnswer,
        explanationAr: graded.explanationAr,
        whyCorrectAr: graded.whyCorrectAr,
        solutionStepsAr: graded.solutionStepsAr,
        commonMistakeAr: graded.commonMistakeAr,
        rubricAr: graded.rubricAr,
        persistedToFirestore,
      };
      res.json(responsePayload);
    }
  );

  // Start server-controlled exam session (Authenticated Student)
  app.post(
    '/api/exams/start',
    requireVerifiedUser,
    assessmentRateGuard,
    (req: AuthenticatedRequest, res: Response) => {
      const parsed = ExamStartBodySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ error: 'معايير بدء الاختبار غير صالحة.' });
        return;
      }

      const {
        mode,
        titleAr,
        subjectId,
        unitIds,
        lessonIds,
        semester,
        difficulty,
        questionType,
        questionCount,
        durationMinutes,
        passingScorePercent,
        randomizeOrder,
      } = parsed.data;

      let pool = listPublicQuestionsForStudents({
        subjectId,
        semester,
        difficulty,
        questionType,
      });

      if (unitIds.length > 0) {
        const unitSet = new Set(unitIds);
        pool = pool.filter((q) => unitSet.has(q.unitId));
      }
      if (lessonIds.length > 0) {
        const lessonSet = new Set(lessonIds);
        pool = pool.filter((q) => lessonSet.has(q.lessonId));
      }

      if (pool.length === 0) {
        res.status(404).json({
          error: 'لا توجد أسئلة معتمدة كافية تطابق نطاق هذا الاختبار حالياً.',
        });
        return;
      }

      const ordered = randomizeOrder ? shuffleQuestions(pool) : pool;
      const selected = ordered.slice(0, questionCount);
      const startedAtMs = Date.now();
      const durationSeconds = durationMinutes * 60;
      const primarySubject: SubjectId =
        subjectId !== 'all' ? subjectId : selected[0].subjectId;
      const primaryLesson =
        lessonIds.length === 1 ? lessonIds[0] : selected[0].lessonId;

      const session = createExamSession({
        uid: req.authUser!.uid,
        mode,
        titleAr,
        subjectId: primarySubject,
        lessonId: primaryLesson,
        questionIds: selected.map((q) => q.id),
        startedAtMs,
        durationSeconds,
        passingScorePercent,
      });

      const payload: ExamStartResponse = {
        sessionId: session.sessionId,
        mode: session.mode,
        titleAr: session.titleAr,
        startedAtMs,
        durationSeconds,
        passingScorePercent,
        questions: selected,
      };
      res.json(payload);
    }
  );

  // Server-authoritative exam grading & persistence (Authenticated Student)
  app.post(
    '/api/exams/submit',
    requireVerifiedUser,
    assessmentRateGuard,
    async (req: AuthenticatedRequest, res: Response) => {
      const parsed = ExamSubmitBodySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ error: 'بيانات تسليم الاختبار غير صالحة.' });
        return;
      }

      const session = getExamSession(parsed.data.sessionId);
      if (!session) {
        res.status(404).json({ error: 'جلسة الاختبار غير موجودة أو انتهت صلاحيتها.' });
        return;
      }

      if (session.uid !== req.authUser!.uid) {
        res.status(403).json({ error: 'لا يمكنك تسليم جلسة اختبار تخص مستخدماً آخر.' });
        return;
      }

      if (session.submitted) {
        res.status(409).json({ error: 'تم تسليم وتصحيح هذه المحاولة مسبقاً.' });
        return;
      }

      const resolvedQuestions: Question[] = [];
      for (const qid of session.questionIds) {
        const entry = await getServerQuestionAndKey(qid);
        if (entry) {
          resolvedQuestions.push(entry.question);
        }
      }

      if (resolvedQuestions.length === 0) {
        res.status(500).json({ error: 'تعذر تحميل مفاتيح التصحيح على الخادم.' });
        return;
      }

      const elapsedSeconds = Math.max(
        1,
        Math.min(
          session.durationSeconds + 60,
          Math.round((Date.now() - session.startedAtMs) / 1000)
        )
      );

      // Authoritative server-only grading (client scores are never accepted)
      const result = gradeBankAssessment(resolvedQuestions, parsed.data.answers, {
        passingScorePercent: session.passingScorePercent,
        timeSpentSeconds: elapsedSeconds,
        objectives: OFFICIAL_LEARNING_OBJECTIVES,
      });

      markExamSessionSubmitted(session.sessionId);

      const attemptId = `srv-att-${Date.now()}`;
      const attempt: ExamAttempt = {
        id: attemptId,
        userId: req.authUser!.uid,
        lessonId: session.lessonId,
        subjectId: session.subjectId,
        mode: session.mode,
        examTitleAr: session.titleAr,
        totalQuestions: result.totalQuestions,
        correctCount: result.correctCount,
        unansweredCount: result.unansweredCount,
        scorePercent: result.scorePercent,
        timeSpentSeconds: elapsedSeconds,
        passed: result.passed,
        gradingSource: 'server',
        createdAtIso: new Date().toISOString(),
      };

      cacheServerAttemptForUser(req.authUser!.uid, attempt);

      let persistedToFirestore = false;
      let persistenceNoticeAr: string | undefined;

      const { db, unavailableReason } = getAdminFirestore();
      if (db) {
        try {
          const userRef = db.collection('users').doc(req.authUser!.uid);
          const attemptRef = userRef.collection('attempts').doc(attemptId);
          await attemptRef.set({
            userId: attempt.userId,
            lessonId: attempt.lessonId,
            subjectId: attempt.subjectId,
            mode: attempt.mode === 'lesson_exam' || attempt.mode === 'question_bank' ? attempt.mode : 'question_bank',
            totalQuestions: attempt.totalQuestions,
            correctCount: attempt.correctCount,
            scorePercent: attempt.scorePercent,
            gradingSource: 'server',
            createdAt: FieldValue.serverTimestamp(),
          });

          if (session.mode === 'lesson_exam' || session.mode === 'lesson_test') {
            const progRef = userRef.collection('progress').doc(session.lessonId);
            const existingSnap = await progRef.get();
            const existingData = existingSnap.exists
              ? (existingSnap.data() as { bestExamScore?: number; status?: string; bookmarked?: boolean; notesAr?: string })
              : {};
            const prevBest = typeof existingData.bestExamScore === 'number' ? existingData.bestExamScore : 0;
            const nextBest = Math.max(prevBest, result.scorePercent);
            const nextStatus =
              result.scorePercent >= 60
                ? 'completed'
                : existingData.status === 'completed'
                ? 'completed'
                : 'in_progress';

            await progRef.set(
              {
                userId: req.authUser!.uid,
                lessonId: session.lessonId,
                subjectId: session.subjectId,
                status: nextStatus,
                bookmarked: Boolean(existingData.bookmarked),
                bestExamScore: nextBest,
                notesAr: typeof existingData.notesAr === 'string' ? existingData.notesAr : '',
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          }

          persistedToFirestore = true;
        } catch (err) {
          persistenceNoticeAr = markAdminFirestoreUnavailable(err);
        }
      } else if (unavailableReason) {
        persistenceNoticeAr =
          'تم التصحيح بأمان على الخادم، ولم يُحفظ في قاعدة Cloud Firestore لأن صلاحية Admin IAM غير مفعّلة بعد.';
      }

      const payload: ExamSubmitResponse = {
        sessionId: session.sessionId,
        attempt,
        result,
        persistedToFirestore,
        persistenceNoticeAr,
      };
      res.json(payload);
    }
  );

  // Student's server-verified attempt history
  app.get(
    '/api/student/attempts',
    requireVerifiedUser,
    (req: AuthenticatedRequest, res: Response) => {
      res.json({ attempts: getCachedServerAttemptsForUser(req.authUser!.uid) });
    }
  );

  // Student AI Tutor Chat (Authenticated Verified User + Student Rate Limit + Zod Validation)
  app.post(
    '/api/tutor/chat',
    requireVerifiedUser,
    ...studentTutorRateGuard,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const parsedBody = TutorChatBodySchema.safeParse(req.body ?? {});
        if (!parsedBody.success) {
          res.status(400).json({ error: 'يرجى كتابة سؤال واضح لا يتجاوز ٢٠٠٠ حرف.' });
          return;
        }

        const ai =
          options.geminiClientOverride !== undefined
            ? options.geminiClientOverride
            : createGeminiClient();
        if (!ai) {
          res.status(503).json({
            error:
              'مفتاح Gemini API غير مهيأ على الخادم حالياً. أضف GEMINI_API_KEY في لوحة الأسرار (Settings > Secrets) لتفعيل المعلم الذكي.',
          });
          return;
        }

        const { message, mode, lessonTitle, subjectTitle, lessonContext, history } =
          parsedBody.data;

        const systemInstruction = [
          'أنت المعلم الذكي الرسمي لمنصة STUDY CORE لطلبة الصف الثاني عشر المسار العلمي في سلطنة عُمان (2026–2027).',
          'تلتزم التزاماً تاماً بالمنهج الرسمي لوزارة التربية والتعليم العُمانية وبسياق الدرس المرفق أدناه.',
          'قواعد الإجابة:',
          '1. اكتب بلغة عربية علمية واضحة ودقيقة، واستخدم الرموز والوحدات الدولية (SI) بالاتجاه الصحيح.',
          '2. عند حل المسائل الحسابية أو العلمية، التزم بالخطوات المنهجية: المعطيات ← القانون ← التعويض ← الناتج النهائي مع الوحدة.',
          '3. إذا سأل الطالب عن شيء خارج سياق الدرس، وجّهه بلطف نحو مفاهيم المنهج العُماني ذات الصلة.',
          '4. مهم للتنسيق: لا تستخدم رموز LaTeX الخام مثل $ أو $$ أو \\frac أو \\text ولا علامات ### أو **؛ اكتب المعادلات بصيغة نصية واضحة ومقروءة بالرموز القياسية مثل g = (G × M) / r² وقوة الأُس مثل 10⁶ أو ^2.',
          `الوضع المطلوب: ${
            mode === 'solve'
              ? 'حل مسألة خطوة بخطوة مع التحقق من الوحدات'
              : mode === 'explain'
              ? 'شرح المفهوم وتبسيطه مع مثال تطبيقي من الدرس'
              : 'إرشاد تعليمي مباشر وموجز'
          }.`,
          `المادة: ${subjectTitle} | الدرس: ${lessonTitle}`,
          lessonContext ? `سياق الدرس المعتمد:\n${lessonContext}` : '',
        ]
          .filter(Boolean)
          .join('\n\n');

        const historyText = history
          .map((h) => `${h.role === 'user' ? 'الطالب' : 'المعلم'}: ${h.content}`)
          .join('\n');

        const prompt = historyText
          ? `سجل المحادثة السابق:\n${historyText}\n\nسؤال الطالب الحالي: ${message}`
          : message;

        const response = await generateWithRetry(() =>
          ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
              systemInstruction,
              maxOutputTokens: 1200,
            },
          })
        );

        const reply = response.text?.trim();
        if (!reply) {
          res
            .status(502)
            .json({ error: 'لم يتمكن المعلم الذكي من توليد إجابة صالحة. حاول مرة أخرى.' });
          return;
        }

        res.json({ reply });
      } catch (error) {
        const classified = classifyGeminiError(
          error,
          'تعذر الاتصال بخدمة المعلم الذكي حالياً.'
        );
        if (classified.retryAfterSeconds) {
          res.setHeader('Retry-After', String(classified.retryAfterSeconds));
        }
        res.status(classified.httpStatus).json({
          error: classified.userMessageAr,
          retryAfterSeconds: classified.retryAfterSeconds,
        });
      }
    }
  );

  // Admin AI Question Generation (Strictly Administrator Only)
  async function handleAdminGenerateQuestions(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const parsedBody = AdminGenerateQuestionsBodySchema.safeParse(req.body ?? {});
      if (!parsedBody.success) {
        res.status(400).json({
          error: 'بيانات الدرس والمادة ونوع السؤال مطلوبة لتوليد مسودات الأسئلة.',
        });
        return;
      }

      const ai =
        options.geminiClientOverride !== undefined
          ? options.geminiClientOverride
          : createGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'مفتاح Gemini API غير مهيأ على الخادم حالياً. أضف GEMINI_API_KEY في لوحة الأسرار لتوليد الأسئلة.',
        });
        return;
      }

      const {
        subjectId,
        unitId,
        lessonId,
        semester,
        lessonTitle,
        subjectTitle,
        difficulty,
        questionType,
        count,
        lessonContext,
        learningObjectiveId,
      } = parsedBody.data;

      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: `أنشئ ${count} أسئلة تدريبية جديدة من النوع (${questionType}) وبمستوى (${difficulty}) لدرس "${lessonTitle}" في مادة "${subjectTitle}" وفق المنهج العُماني للصف الثاني عشر العلمي.\n\nالمرجع المعتمد:\n${lessonContext}`,
          config: {
            systemInstruction:
              'أنت واضع أسئلة امتحانات دبلوم التعليم العام في سلطنة عُمان. أعد مصفوفة JSON فقط مطابقة للمخطط بدون LaTeX خام، وتذكر أن جميع الأسئلة تُحفظ كمسودات بانتظار مراجعة المشرف (PENDING_REVIEW).',
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  promptAr: { type: Type.STRING },
                  questionType: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  optionsAr: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  correctAnswers: { type: Type.ARRAY, items: { type: Type.STRING } },
                  solutionStepsAr: { type: Type.ARRAY, items: { type: Type.STRING } },
                  explanationAr: { type: Type.STRING },
                  conceptAr: { type: Type.STRING },
                  rubricAr: { type: Type.STRING },
                  commonMistakeAr: { type: Type.STRING },
                  requiredUnit: { type: Type.STRING },
                  sourceContextAr: { type: Type.STRING },
                },
                required: [
                  'promptAr',
                  'questionType',
                  'difficulty',
                  'correctAnswer',
                  'solutionStepsAr',
                  'explanationAr',
                  'conceptAr',
                  'sourceContextAr',
                ],
              },
            },
          },
        })
      );

      const rawText = response.text?.trim() ?? '';
      let parsedQuestions: Question[];
      try {
        parsedQuestions = parseAdminGeneratedQuestionsWithZod(rawText, {
          subjectId,
          unitId,
          lessonId,
          semester,
          learningObjectiveId,
          modelName: MODEL_NAME,
          defaultMarks: difficulty === 'olympiad' || difficulty === 'advanced' ? 3 : 2,
          defaultSeconds: 120,
        });
      } catch {
        res.status(502).json({
          error: 'أعاد مساعد الذكاء الاصطناعي صيغة غير مكتملة للأسئلة. يرجى المحاولة مرة أخرى.',
        });
        return;
      }

      const registered = registerGeneratedAiQuestionsForReview(parsedQuestions);
      res.json({ questions: registered });
    } catch (error) {
      const classified = classifyGeminiError(
        error,
        'تعذر توليد مسودات الأسئلة حالياً.'
      );
      if (classified.retryAfterSeconds) {
        res.setHeader('Retry-After', String(classified.retryAfterSeconds));
      }
      res.status(classified.httpStatus).json({
        error: classified.userMessageAr,
        retryAfterSeconds: classified.retryAfterSeconds,
      });
    }
  }

  app.post(
    '/api/tutor/generate-questions',
    requireAdministrator,
    adminAiRateGuard,
    handleAdminGenerateQuestions
  );

  app.post(
    '/api/admin/generate-questions',
    requireAdministrator,
    adminAiRateGuard,
    handleAdminGenerateQuestions
  );

  // Admin Content Assist (Strictly Administrator Only)
  app.post(
    '/api/admin/assist',
    requireAdministrator,
    adminAiRateGuard,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const parsedBody = AdminAssistBodySchema.safeParse(req.body ?? {});
        if (!parsedBody.success) {
          res.status(400).json({
            error: 'بيانات المساعدة الإدارية غير مكتملة: حدد نوع المسودة والمادة وعنوان الدرس.',
          });
          return;
        }

        const ai =
          options.geminiClientOverride !== undefined
            ? options.geminiClientOverride
            : createGeminiClient();
        if (!ai) {
          res.status(503).json({
            error:
              'مفتاح Gemini API غير مهيأ على الخادم حالياً. أضف GEMINI_API_KEY في لوحة الأسرار (Settings > Secrets).',
          });
          return;
        }

        const {
          assistType,
          subjectTitle,
          unitTitle,
          lessonTitle,
          semester,
          officialRef,
          existingContext,
          sourceSummary,
        } = parsedBody.data;

        const assistTaskMap: Record<AdminAssistType, string> = {
          explanation:
            'أنشئ مسودة شرح علمي مفصل للدرس مع استنتاج رئيسي وقائمة قوانين أو مفاهيم أساسية في itemsAr.',
          summary:
            'أنشئ مسودة ملخص شامل ومركز للدرس في contentAr ونقاط المراجعة السريعة في itemsAr.',
          examples:
            'أنشئ مسودة مثال محلول واضح للدرس يتضمن نص المسألة في contentAr، المعطيات في itemsAr، خطوات الحل في stepsAr، والناتج النهائي في answerAr.',
          exercises:
            'أنشئ مسودة تمرين تطبيقي متدرج للدرس مع التلميح والإجابة النموذجية.',
          objectives:
            'اقترح أهدافاً تعليمية دقيقة وقابلة للقياس للدرس في itemsAr وفق تصنيف بلوم.',
          gap_analysis:
            'حلل الفجوات التعليمية أو المفاهيم الناقصة مقارنة بالمنهج العُماني في contentAr واقترح توصيات استكمال في itemsAr.',
        };

        const prompt = [
          `المطلوب: ${assistTaskMap[assistType]}`,
          `المادة: ${subjectTitle} | ${semester === 2 ? 'الفصل الثاني' : 'الفصل الأول'}`,
          `الوحدة: ${unitTitle}`,
          `الدرس: ${lessonTitle}`,
          officialRef ? `المرجع الرسمي: ${officialRef}` : '',
          sourceSummary ? `ملخص المصدر المعتمد:\n${sourceSummary}` : '',
          existingContext ? `سياق المحتوى الحالي:\n${existingContext}` : '',
        ]
          .filter(Boolean)
          .join('\n\n');

        const response = await generateWithRetry(() =>
          ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
              systemInstruction:
                'أنت مساعد تحرير مناهج في منصة STUDY CORE لوزارة التربية والتعليم العُمانية (الصف الثاني عشر العلمي 2026–2027). أنشئ مسودة عربية علمية دقيقة بصيغة JSON فقط بدون أي LaTeX خام، وتذكّر أن جميع المسودات تُصنف تلقائياً كمسودات بحاجة لمراجعة المشرف (NEEDS_REVIEW).',
              maxOutputTokens: 1600,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  titleAr: { type: Type.STRING },
                  contentAr: { type: Type.STRING },
                  itemsAr: { type: Type.ARRAY, items: { type: Type.STRING } },
                  keyTakeawayAr: { type: Type.STRING },
                  stepsAr: { type: Type.ARRAY, items: { type: Type.STRING } },
                  answerAr: { type: Type.STRING },
                },
                required: ['titleAr', 'contentAr', 'itemsAr'],
              },
            },
          })
        );

        const rawText = response.text?.trim() ?? '';
        let draft;
        try {
          draft = parseAdminDraftJson(rawText, assistType);
        } catch {
          res.status(502).json({
            error: 'أعاد مساعد الذكاء الاصطناعي مسودة غير مكتملة الصياغة. حاول مرة أخرى.',
          });
          return;
        }

        res.json({ draft });
      } catch (error) {
        const classified = classifyGeminiError(
          error,
          'تعذر توليد مسودة المساعد الإداري حالياً.'
        );
        if (classified.retryAfterSeconds) {
          res.setHeader('Retry-After', String(classified.retryAfterSeconds));
        }
        res.status(classified.httpStatus).json({
          error: classified.userMessageAr,
          retryAfterSeconds: classified.retryAfterSeconds,
        });
      }
    }
  );

  // Admin Question Bank Review & Management Routes
  app.get(
    '/api/admin/questions',
    requireAdministrator,
    (req: AuthenticatedRequest, res: Response) => {
      const subjectRaw = typeof req.query.subjectId === 'string' ? req.query.subjectId : 'all';
      const lessonId = typeof req.query.lessonId === 'string' ? req.query.lessonId : 'all';
      const statusRaw =
        typeof req.query.verificationStatus === 'string' ? req.query.verificationStatus : 'all';
      const difficultyRaw = typeof req.query.difficulty === 'string' ? req.query.difficulty : 'all';
      const typeRaw = typeof req.query.questionType === 'string' ? req.query.questionType : 'all';
      const originRaw = typeof req.query.origin === 'string' ? req.query.origin : 'all';
      const searchQuery = typeof req.query.searchQuery === 'string' ? req.query.searchQuery : '';

      const data = listAdminQuestionsWithAudit({
        subjectId: SUBJECT_ENUM.safeParse(subjectRaw).success ? (subjectRaw as SubjectId) : 'all',
        lessonId,
        difficulty: DIFFICULTY_ENUM.safeParse(difficultyRaw).success
          ? (difficultyRaw as DifficultyLevel)
          : 'all',
        questionType: QUESTION_TYPE_ENUM.safeParse(typeRaw).success
          ? (typeRaw as QuestionType)
          : 'all',
        origin: ORIGIN_ENUM.safeParse(originRaw).success ? (originRaw as Question['origin']) : 'all',
        verificationStatus: QUESTION_STATUS_ENUM.safeParse(statusRaw).success
          ? (statusRaw as Question['verificationStatus'])
          : 'all',
        searchQuery,
      });

      res.json(data);
    }
  );

  app.post(
    '/api/admin/questions',
    requireAdministrator,
    async (req: AuthenticatedRequest, res: Response) => {
      const parsed = AdminQuestionUpsertSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({
          error: 'بيانات السؤال غير مكتملة أو غير مطابقة للمخطط.',
          issues: parsed.error.issues.map((i) => i.message),
        });
        return;
      }

      const { changeSummaryAr, ...questionData } = parsed.data;
      const result = await upsertQuestionAsAdmin({
        question: questionData as Question,
        editorAr: req.authUser?.email || 'مشرف المنهج',
        changeSummaryAr,
      });

      res.json({
        question: result.question,
        persistedToFirestore: result.persistedToFirestore,
        totalQuestions: getAllServerQuestions().length,
        publicCount: getPublicQuestionsByIds(getAllServerQuestions().map((q) => q.id)).length,
      });
    }
  );

  app.post(
    '/api/admin/questions/:id/review',
    requireAdministrator,
    async (req: AuthenticatedRequest, res: Response) => {
      const parsed = AdminReviewBodySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ error: 'بيانات قرار المراجعة غير صالحة.' });
        return;
      }

      const result = await reviewQuestionStatusAsAdmin({
        questionId: req.params.id,
        newStatus: parsed.data.status,
        reviewerAr: req.authUser?.email || 'مشرف المنهج',
        notesAr: parsed.data.notesAr,
      });

      if (!result.question) {
        res.status(404).json({ error: 'السؤال غير موجود.' });
        return;
      }

      res.json(result);
    }
  );

  app.post(
    '/api/admin/migration/dry-run',
    requireAdministrator,
    (_req: AuthenticatedRequest, res: Response) => {
      const { report } = buildMigrationDryRunReport();
      res.json({ report });
    }
  );

  return app;
}
