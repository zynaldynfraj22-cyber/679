import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterQuestions,
  computeSubjectProgress,
  computeOverallDashboardMetrics,
  normalizeAnswer,
  sanitizeUserNotes,
  normalizeLessonStandard,
} from './curriculumEngine';
import { gradeBankAssessment } from '../../server/gradingEngine';
import { getAllServerQuestions } from '../../server/questionStore';
import {
  classifyGeminiError,
  isTransientGeminiError,
  parseGeneratedQuestionsJson,
  parseAdminDraftJson,
} from './geminiHelpers';
import {
  computeCurriculumCoverage,
  detectCurriculumAnomalies,
  isLessonStandardComplete,
} from './coverageEngine';
import { OMAN_SUBJECTS, OMAN_UNITS } from '../data/subjectsAndUnits';
import { PRELOADED_LESSONS, CENTRAL_QUESTION_BANK } from '../data/questionBank';
import {
  INITIAL_VERIFICATION_RECORDS,
  OFFICIAL_CURRICULUM_CATALOG,
  OMAN_CURRICULUM_SOURCES,
} from '../data/sourcesAndCatalog';
import type { Lesson, LessonProgress, Question, Subject } from '../types/curriculum';

const sampleQuestions: Question[] = [
  {
    id: 'q1',
    subjectId: 'physics',
    unitId: 'phys-u1',
    lessonId: 'phys-u1-l1',
    semester: 1,
    difficulty: 'foundation',
    questionType: 'mcq',
    promptAr: 'ما وحدة قياس شدة المجال الكهربائي؟',
    optionsAr: ['N/C', 'J/C', 'N.m', 'C/s'],
    correctAnswer: 'N/C',
    explanationAr: 'شدة المجال الكهربائي تساوي القوة مقسومة على الشحنة N/C.',
    marks: 2,
    verificationStatus: 'APPROVED',
    isPublished: true,
  },
  {
    id: 'q2',
    subjectId: 'physics',
    unitId: 'phys-u1',
    lessonId: 'phys-u1-l1',
    semester: 1,
    difficulty: 'advanced',
    questionType: 'numeric',
    promptAr: 'احسب شدة المجال عند شحنة 2C تتأثر بقوة 10N.',
    correctAnswer: '5',
    numericTolerance: 0.05,
    explanationAr: 'E = F / q = 10 / 2 = 5 N/C.',
    marks: 3,
    verificationStatus: 'APPROVED',
    isPublished: true,
  },
  {
    id: 'q3',
    subjectId: 'chemistry',
    unitId: 'chem-u1',
    lessonId: 'chem-u1-l1',
    semester: 1,
    difficulty: 'intermediate',
    questionType: 'short_answer',
    promptAr: 'ما تأثير زيادة الضغط على موضع الاتزان عند تساوي عدد المولات الغازية؟',
    correctAnswer: 'لا يتأثر',
    explanationAr: 'عند تساوي عدد مولات الغازات في الطرفين لا ينزاح الاتزان بتغير الضغط.',
    marks: 2,
    verificationStatus: 'APPROVED',
    isPublished: true,
  },
];

test('normalizeAnswer converts Arabic-Indic digits and trims spaces', () => {
  assert.equal(normalizeAnswer('  ٥٫٢٥  '), '5.25');
  assert.equal(normalizeAnswer('N/C '), 'n/c');
});

test('filterQuestions filters by subject, difficulty, and search query', () => {
  const phys = filterQuestions(sampleQuestions, { subjectId: 'physics' });
  assert.equal(phys.length, 2);

  const adv = filterQuestions(sampleQuestions, {
    subjectId: 'physics',
    difficulty: 'advanced',
  });
  assert.equal(adv.length, 1);
  assert.equal(adv[0].id, 'q2');

  const searched = filterQuestions(sampleQuestions, { searchQuery: 'الضغط' });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].id, 'q3');
});

test('gradeBankAssessment scores MCQ, Arabic-Indic numeric, and short answers accurately on server', () => {
  const result = gradeBankAssessment(sampleQuestions, {
    q1: 'N/C',
    q2: '٥',
    q3: 'يتأثر',
  });

  assert.equal(result.totalQuestions, 3);
  assert.equal(result.correctCount, 2);
  assert.equal(result.earnedMarks, 5);
  assert.equal(result.totalMarks, 7);
  assert.equal(result.scorePercent, 71);
});

test('computeSubjectProgress and overall metrics aggregate completion accurately', () => {
  const subjects: Subject[] = [
    {
      id: 'physics',
      titleAr: 'الفيزياء',
      titleEn: 'Physics',
      code: 'PHYS-12',
      descriptionAr: 'الفيزياء للصف الثاني عشر',
      accentColor: '#0F4C81',
      imageUrl: '/phys.jpg',
      order: 1,
      totalUnits: 2,
      totalLessons: 2,
      isPublished: true,
    },
  ];

  const lessons: Lesson[] = [
    {
      id: 'l1',
      subjectId: 'physics',
      unitId: 'u1',
      semester: 1,
      order: 1,
      titleAr: 'الدرس الأول',
      estimatedMinutes: 25,
      officialRef: 'كتاب الفيزياء ص ١٢',
      summaryAr: 'ملخص الدرس الأول',
      keyPointsAr: [],
      keyFormulas: [],
      sections: [],
      solvedExamples: [],
      exercises: [],
      isPublished: true,
    },
    {
      id: 'l2',
      subjectId: 'physics',
      unitId: 'u1',
      semester: 1,
      order: 2,
      titleAr: 'الدرس الثاني',
      estimatedMinutes: 30,
      officialRef: 'كتاب الفيزياء ص ٢٤',
      summaryAr: 'ملخص الدرس الثاني',
      keyPointsAr: [],
      keyFormulas: [],
      sections: [],
      solvedExamples: [],
      exercises: [],
      isPublished: true,
    },
  ];

  const progressMap: Record<string, LessonProgress> = {
    l1: {
      userId: 'u1',
      lessonId: 'l1',
      subjectId: 'physics',
      status: 'completed',
      bookmarked: true,
      bestExamScore: 90,
      notesAr: '',
    },
    l2: {
      userId: 'u1',
      lessonId: 'l2',
      subjectId: 'physics',
      status: 'in_progress',
      bookmarked: false,
      bestExamScore: 0,
      notesAr: '',
    },
  };

  const subjSummary = computeSubjectProgress('physics', lessons, progressMap);
  assert.equal(subjSummary.completedLessons, 1);
  assert.equal(subjSummary.completionPercent, 50);
  assert.equal(subjSummary.averageScore, 90);

  const dashboard = computeOverallDashboardMetrics(subjects, lessons, progressMap, [
    {
      id: 'a1',
      userId: 'u1',
      lessonId: 'l1',
      subjectId: 'physics',
      mode: 'lesson_exam',
      totalQuestions: 5,
      correctCount: 4,
      scorePercent: 80,
      createdAtIso: '2026-11-24T00:00:00Z',
    },
  ]);

  assert.equal(dashboard.bookmarkedCount, 1);
  assert.equal(dashboard.overallCompletionPercent, 50);
  assert.equal(dashboard.overallMasteryScore, 80);
  assert.equal(dashboard.recommendedLesson?.id, 'l2');
});

test('sanitizeUserNotes enforces 4000 char Firestore blueprint ceiling', () => {
  const longText = 'أ'.repeat(4500);
  assert.equal(sanitizeUserNotes(longText).length, 4000);
});

test('isTransientGeminiError retries 503/network errors but never burst-retries 429 quota', () => {
  assert.equal(isTransientGeminiError(new Error('503 UNAVAILABLE')), true);
  assert.equal(
    isTransientGeminiError(new Error('429 RESOURCE_EXHAUSTED retry in 53s')),
    false
  );
});

test('classifyGeminiError extracts retry delay and returns clean Arabic errors', () => {
  const quotaErr = classifyGeminiError(
    new Error('{"error":{"code":429,"message":"Please retry in 51.4s.","status":"RESOURCE_EXHAUSTED"}}')
  );
  assert.equal(quotaErr.httpStatus, 429);
  assert.equal(quotaErr.retryAfterSeconds, 52);
  assert.match(quotaErr.userMessageAr, /52 ثانية/);

  const dailyQuotaErr = classifyGeminiError(
    new Error('{"error":{"code":429,"message":"Please retry in 70748s.","status":"RESOURCE_EXHAUSTED"}}')
  );
  assert.equal(dailyQuotaErr.httpStatus, 429);
  assert.match(dailyQuotaErr.userMessageAr, /20 ساعة/);

  const timeoutErr = classifyGeminiError(new Error('GEMINI_TIMEOUT'));
  assert.equal(timeoutErr.httpStatus, 504);

  const authErr = classifyGeminiError(new Error('API_KEY_INVALID 403'));
  assert.equal(authErr.httpStatus, 503);
});

test('parseGeneratedQuestionsJson strips markdown fences and filters malformed items', () => {
  const raw = '```json\n' +
    JSON.stringify([
      {
        promptAr: 'احسب شدة المجال عند مسافة 2R.',
        questionType: 'numeric',
        difficulty: 'intermediate',
        optionsAr: [],
        correctAnswer: '2.5',
        explanationAr: 'بما أن شدة المجال تتناسب عكسياً مع مربع المسافة.',
      },
      {
        promptAr: 'سؤال ناقص بدون خيارات',
        questionType: 'mcq',
        optionsAr: [],
        correctAnswer: 'أ',
        explanationAr: 'شرح',
      },
    ]) +
    '\n```';

  const parsed = parseGeneratedQuestionsJson(raw, 'advanced');
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].correctAnswer, '2.5');
});

test('parseAdminDraftJson always marks drafts as aiGenerated and NEEDS_REVIEW', () => {
  const raw = '```json\n' +
    JSON.stringify({
      titleAr: 'شرح مقترح لقاعدة السلسلة',
      contentAr: 'تُستخدم قاعدة السلسلة لإيجاد مشتقة الدالة المركبة.',
      itemsAr: ['تحديد الدالة الخارجية', 'تحديد الدالة الداخلية'],
      keyTakeawayAr: 'مشتقة الدالة المركبة = مشتقة الخارجية × مشتقة الداخلية',
      verificationStatus: 'VERIFIED',
    }) +
    '\n```';

  const draft = parseAdminDraftJson(raw, 'explanation');
  assert.equal(draft.aiGenerated, true);
  assert.equal(draft.verificationStatus, 'NEEDS_REVIEW');
  assert.equal(draft.assistType, 'explanation');
  assert.equal(draft.itemsAr.length, 2);
});

test('Oman Grade 12 preloaded bundle has 34 units, 40 complete lessons, and 147 official catalog slots with zero semester mismatches', () => {
  assert.equal(OMAN_SUBJECTS.length, 4);
  assert.equal(OMAN_UNITS.length, 34);
  assert.equal(PRELOADED_LESSONS.length, 40);
  assert.equal(OFFICIAL_CURRICULUM_CATALOG.length, 147);
  assert.ok(CENTRAL_QUESTION_BANK.length >= 40);
  assert.equal(getAllServerQuestions().length, 97);

  for (const lesson of PRELOADED_LESSONS) {
    assert.equal(
      isLessonStandardComplete(lesson),
      true,
      `Lesson ${lesson.id} should satisfy 6-part standard`
    );
  }

  const anomalies = detectCurriculumAnomalies(OMAN_UNITS, PRELOADED_LESSONS);
  const semesterMismatches = anomalies.filter((a) => a.kind === 'semester_mismatch');
  assert.equal(semesterMismatches.length, 0);

  const summary = computeCurriculumCoverage(
    OMAN_SUBJECTS,
    OMAN_UNITS,
    PRELOADED_LESSONS,
    OFFICIAL_CURRICULUM_CATALOG,
    OMAN_CURRICULUM_SOURCES,
    INITIAL_VERIFICATION_RECORDS
  );

  assert.equal(summary.totalUnits, 34);
  assert.equal(summary.implementedLessonsCount, 40);
  assert.equal(summary.missingLessonsCount, 107);
  assert.equal(summary.overallCoveragePercent, 27);
  assert.equal(summary.incompleteLessonsCount, 0);
  assert.equal(summary.sourcesNeedingVerificationCount, 1);

  const normalizedFallback = normalizeLessonStandard({
    ...PRELOADED_LESSONS[0],
    introduction: undefined,
    comprehensiveSummary: undefined,
    review: undefined,
  });
  assert.ok(normalizedFallback.introduction);
  assert.ok(normalizedFallback.comprehensiveSummary);
  assert.ok(normalizedFallback.review);
});

