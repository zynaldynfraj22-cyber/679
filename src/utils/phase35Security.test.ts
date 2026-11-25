import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Server } from 'node:http';
import { createServerApp } from '../../server/app';
import { gradeBankAssessment, gradeSingleBankQuestion } from '../../server/gradingEngine';
import {
  buildMigrationDryRunReport,
  getAllServerQuestions,
  listPublicQuestionsForStudents,
} from '../../server/questionStore';
import { SlidingWindowLimiter } from '../../server/rateLimiter';
import {
  isQuestionDeliverableToStudent,
  normalizeQuestionDefaults,
  toPublicQuestion,
} from './questionEngine';
import { PUBLIC_QUESTION_BANK } from '../data/questionBankPublic';
import type { Question } from '../types/curriculum';

const STUDENT_USER = {
  uid: 'student-uid-1',
  email: 'student@moe.om',
  email_verified: true,
};

const OTHER_STUDENT = {
  uid: 'student-uid-2',
  email: 'student2@moe.om',
  email_verified: true,
};

const UNVERIFIED_USER = {
  uid: 'unverified-uid',
  email: 'unverified@example.com',
  email_verified: false,
};

const ADMIN_USER = {
  uid: 'admin-uid-1',
  email: 'zynaldynfraj22@gmail.com',
  email_verified: true,
  admin: true,
};

async function withTestServer(
  run: (baseUrl: string) => Promise<void>
): Promise<void> {
  const app = createServerApp({
    geminiClientOverride: null,
    tokenVerifier: async (token: string) => {
      if (token === 'student-token') return STUDENT_USER;
      if (token === 'other-student-token') return OTHER_STUDENT;
      if (token === 'unverified-token') return UNVERIFIED_USER;
      if (token === 'admin-token') return ADMIN_USER;
      throw new Error('INVALID_TOKEN');
    },
  });

  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
}

const PRIVATE_FORBIDDEN_FIELDS = [
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
];

test('Public question projection and GET /api/questions exclude all answer keys and unapproved items', async () => {
  for (const pub of PUBLIC_QUESTION_BANK) {
    assert.equal(pub.verificationStatus, 'APPROVED');
    assert.equal(pub.isPublished, true);
    for (const key of PRIVATE_FORBIDDEN_FIELDS) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(pub, key),
        false,
        `PublicQuestion ${pub.id} leaked forbidden field ${key}`
      );
    }
  }

  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/questions`);
    assert.equal(res.status, 200);
    const data = (await res.json()) as { questions: Record<string, unknown>[]; total: number };
    assert.ok(data.total >= 42);
    for (const q of data.questions) {
      assert.equal(q.verificationStatus, 'APPROVED');
      assert.equal(q.isPublished, true);
      for (const forbidden of PRIVATE_FORBIDDEN_FIELDS) {
        assert.equal(forbidden in q, false, `API leaked ${forbidden} on ${String(q.id)}`);
      }
    }
  });
});

test('toPublicQuestion deterministically shuffles matching rights and ordering steps', () => {
  const sampleMatch: Question = {
    id: 'test-match-shuffle',
    subjectId: 'physics',
    unitId: 'phys-u1',
    lessonId: 'phys-u1-l1',
    semester: 1,
    difficulty: 'foundation',
    questionType: 'matching',
    promptAr: 'صل المصطلح بالتعريف',
    matchingPairs: [
      { leftAr: 'أ', rightAr: '1' },
      { leftAr: 'ب', rightAr: '2' },
      { leftAr: 'ج', rightAr: '3' },
    ],
    correctAnswer: 'أ->1',
    explanationAr: 'شرح التوصيل',
    marks: 3,
    verificationStatus: 'APPROVED',
    isPublished: true,
  };
  const pubMatch = toPublicQuestion(sampleMatch);
  assert.deepEqual(pubMatch.matchingLeftsAr, ['أ', 'ب', 'ج']);
  assert.notDeepEqual(pubMatch.matchingRightsShuffledAr, ['1', '2', '3']);
  assert.deepEqual([...(pubMatch.matchingRightsShuffledAr ?? [])].sort(), ['1', '2', '3']);

  const sampleOrder: Question = {
    id: 'test-order-shuffle',
    subjectId: 'biology',
    unitId: 'bio-u1',
    lessonId: 'bio-u1-l1',
    semester: 1,
    difficulty: 'intermediate',
    questionType: 'ordering',
    promptAr: 'رتب الخطوات',
    orderingItemsAr: ['خطوة 1', 'خطوة 2', 'خطوة 3'],
    correctAnswer: 'خطوة 1|خطوة 2|خطوة 3',
    explanationAr: 'شرح الترتيب',
    marks: 3,
    verificationStatus: 'APPROVED',
    isPublished: true,
  };
  const pubOrder = toPublicQuestion(sampleOrder);
  assert.notDeepEqual(pubOrder.orderingItemsShuffledAr, ['خطوة 1', 'خطوة 2', 'خطوة 3']);
});

test('Legacy questions normalize to NEEDS_REVIEW and AI questions normalize to PENDING_REVIEW', () => {
  const legacyNormalized = normalizeQuestionDefaults({
    id: 'legacy-x',
    subjectId: 'physics',
    unitId: 'phys-u1',
    lessonId: 'phys-u1-l1',
    semester: 1,
    difficulty: 'foundation',
    questionType: 'mcq',
    promptAr: 'سؤال قديم بدون حالة تحقق صريحة',
    optionsAr: ['أ', 'ب', 'ج'],
    correctAnswer: 'أ',
    explanationAr: 'تفسير علمي مختصر',
    marks: 1,
    isPublished: true,
  });
  assert.equal(legacyNormalized.verificationStatus, 'NEEDS_REVIEW');
  assert.equal(isQuestionDeliverableToStudent(legacyNormalized), false);

  const aiNormalized = normalizeQuestionDefaults({
    id: 'ai-x',
    subjectId: 'chemistry',
    unitId: 'chem-u1',
    lessonId: 'chem-u1-l1',
    semester: 1,
    difficulty: 'intermediate',
    questionType: 'mcq',
    promptAr: 'سؤال مقترح من الذكاء الاصطناعي',
    optionsAr: ['أ', 'ب', 'ج'],
    correctAnswer: 'أ',
    explanationAr: 'تفسير مقترح',
    marks: 1,
    origin: 'AI_GENERATED',
    isPublished: true,
  });
  assert.equal(aiNormalized.verificationStatus, 'PENDING_REVIEW');
  assert.equal(isQuestionDeliverableToStudent(aiNormalized), false);
});

test('Auth middleware enforces 401/403 separation between guests, unverified users, students, and admins', async () => {
  await withTestServer(async (baseUrl) => {
    // Missing token -> 401
    const noAuthTutor = await fetch(`${baseUrl}/api/tutor/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'اشرح الجاذبية' }),
    });
    assert.equal(noAuthTutor.status, 401);

    const noAuthExam = await fetch(`${baseUrl}/api/exams/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId: 'physics' }),
    });
    assert.equal(noAuthExam.status, 401);

    // Invalid token -> 401
    const badToken = await fetch(`${baseUrl}/api/practice/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer forged-token',
      },
      body: JSON.stringify({}),
    });
    assert.equal(badToken.status, 401);

    // Unverified email -> 403
    const unverifiedRes = await fetch(`${baseUrl}/api/practice/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer unverified-token',
      },
      body: JSON.stringify({}),
    });
    assert.equal(unverifiedRes.status, 403);

    // Student accessing admin endpoints -> 403
    const studentAdminQuestions = await fetch(`${baseUrl}/api/admin/questions`, {
      headers: { Authorization: 'Bearer student-token' },
    });
    assert.equal(studentAdminQuestions.status, 403);

    const studentGenerate = await fetch(`${baseUrl}/api/tutor/generate-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer student-token',
      },
      body: JSON.stringify({ lessonTitle: 'الجاذبية', subjectTitle: 'الفيزياء' }),
    });
    assert.equal(studentGenerate.status, 403);

    // Admin accessing admin endpoint -> 200
    const adminQuestions = await fetch(`${baseUrl}/api/admin/questions`, {
      headers: { Authorization: 'Bearer admin-token' },
    });
    assert.equal(adminQuestions.status, 200);
    const adminPayload = (await adminQuestions.json()) as {
      questions: Question[];
      auditSummary: { totalQuestions: number; approvedCount: number; needsReviewCount: number };
    };
    assert.equal(adminPayload.auditSummary.totalQuestions, 97);
    assert.equal(adminPayload.auditSummary.needsReviewCount, 53);
  });
});

test('Server exam sessions enforce ownership, block double submission, and compute authoritative grades', async () => {
  await withTestServer(async (baseUrl) => {
    const startRes = await fetch(`${baseUrl}/api/exams/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer student-token',
      },
      body: JSON.stringify({
        mode: 'lesson_test',
        titleAr: 'اختبار تجريبي موثق',
        subjectId: 'physics',
        questionCount: 2,
        durationMinutes: 10,
      }),
    });
    assert.equal(startRes.status, 200);
    const started = (await startRes.json()) as {
      sessionId: string;
      questions: { id: string }[];
    };
    assert.ok(started.sessionId);
    assert.equal(started.questions.length, 2);

    // Different student cannot submit someone else's session -> 403
    const hijackRes = await fetch(`${baseUrl}/api/exams/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer other-student-token',
      },
      body: JSON.stringify({
        sessionId: started.sessionId,
        answers: {},
      }),
    });
    assert.equal(hijackRes.status, 403);

    // Valid owner submits exam -> 200 with server grading
    const submitRes = await fetch(`${baseUrl}/api/exams/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer student-token',
      },
      body: JSON.stringify({
        sessionId: started.sessionId,
        answers: {
          [started.questions[0].id]: 'wrong-answer',
        },
      }),
    });
    assert.equal(submitRes.status, 200);
    const submitted = (await submitRes.json()) as {
      attempt: { gradingSource: string; userId: string };
      result: { totalQuestions: number; breakdown: unknown[] };
    };
    assert.equal(submitted.attempt.gradingSource, 'server');
    assert.equal(submitted.attempt.userId, STUDENT_USER.uid);
    assert.equal(submitted.result.totalQuestions, 2);
    assert.equal(submitted.result.breakdown.length, 2);

    // Replay / double submission -> 409
    const replayRes = await fetch(`${baseUrl}/api/exams/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer student-token',
      },
      body: JSON.stringify({
        sessionId: started.sessionId,
        answers: {},
      }),
    });
    assert.equal(replayRes.status, 409);
  });
});

test('Zod validation returns 400 and unapproved questions return 404 on /api/practice/answer', async () => {
  await withTestServer(async (baseUrl) => {
    const invalidRes = await fetch(`${baseUrl}/api/practice/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer student-token',
      },
      body: JSON.stringify({ questionId: '' }),
    });
    assert.equal(invalidRes.status, 400);

    // Legacy NEEDS_REVIEW question must NOT be gradable or leaked via practice endpoint
    const unapproved = getAllServerQuestions().find((q) => q.verificationStatus === 'NEEDS_REVIEW');
    assert.ok(unapproved);
    const blockedRes = await fetch(`${baseUrl}/api/practice/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer student-token',
      },
      body: JSON.stringify({ questionId: unapproved.id, answer: unapproved.correctAnswer }),
    });
    assert.equal(blockedRes.status, 404);
  });
});

test('Server gradingEngine accurately grades all 12 question types including Arabic digits, fractions, scientific notation, and manual types', () => {
  assert.equal(
    gradeSingleBankQuestion(
      { id: 't1', questionType: 'mcq', marks: 1, correctAnswer: '9.8' },
      '9.8'
    ).isCorrect,
    true
  );
  assert.equal(
    gradeSingleBankQuestion(
      {
        id: 't2',
        questionType: 'multi_select',
        marks: 2,
        correctAnswer: 'أ|ج',
        correctAnswers: ['أ', 'ج'],
      },
      JSON.stringify(['ج', 'أ'])
    ).isCorrect,
    true
  );
  assert.equal(
    gradeSingleBankQuestion(
      { id: 't3', questionType: 'true_false', marks: 1, correctAnswer: 'صحيح' },
      'صحيح'
    ).isCorrect,
    true
  );
  assert.equal(
    gradeSingleBankQuestion(
      { id: 't4', questionType: 'fill_blank', marks: 1, correctAnswer: 'أوم|Ohm' },
      'ohm'
    ).isCorrect,
    true
  );
  assert.equal(
    gradeSingleBankQuestion(
      { id: 't5', questionType: 'short_answer', marks: 2, correctAnswer: '3/4' },
      '0.75'
    ).isCorrect,
    true
  );
  assert.equal(
    gradeSingleBankQuestion(
      {
        id: 't6',
        questionType: 'numeric',
        marks: 2,
        correctAnswer: '1500',
        numericTolerance: 1,
        requiredUnit: 'N/C',
      },
      '١.٥×10^3 N/C'
    ).isCorrect,
    true
  );
  assert.equal(
    gradeSingleBankQuestion(
      {
        id: 't6b',
        questionType: 'numeric',
        marks: 2,
        correctAnswer: '1500',
        numericTolerance: 1,
        requiredUnit: 'N/C',
      },
      '1500 J'
    ).isCorrect,
    false
  );
  assert.equal(
    gradeSingleBankQuestion(
      {
        id: 't7',
        questionType: 'matching',
        marks: 2,
        correctAnswer: 'الكل',
        matchingPairs: [
          { leftAr: 'الكتلة', rightAr: 'kg' },
          { leftAr: 'الشحنة', rightAr: 'C' },
        ],
      },
      JSON.stringify({ الكتلة: 'kg', الشحنة: 'C' })
    ).isCorrect,
    true
  );
  assert.equal(
    gradeSingleBankQuestion(
      {
        id: 't8',
        questionType: 'ordering',
        marks: 2,
        correctAnswer: '1|2|3',
        orderingItemsAr: ['1', '2', '3'],
      },
      JSON.stringify(['1', '2', '3'])
    ).isCorrect,
    true
  );
  const manual1 = gradeSingleBankQuestion(
    { id: 't9', questionType: 'scientific_explanation', marks: 3, correctAnswer: 'تفسير' },
    'لأن القوة تتناسب طردياً مع الشحنة'
  );
  assert.equal(manual1.needsManualGrading, true);
  assert.equal(manual1.earnedMarks, 0);

  const manual2 = gradeSingleBankQuestion(
    { id: 't10', questionType: 'structured_long', marks: 4, correctAnswer: 'حل طويل' },
    'خطوات الحل التفصيلية'
  );
  assert.equal(manual2.needsManualGrading, true);

  assert.equal(
    gradeSingleBankQuestion(
      { id: 't11', questionType: 'diagram_interpretation', marks: 2, correctAnswer: 'القمة الثانية' },
      'القمة الثانية'
    ).isCorrect,
    true
  );
  assert.equal(
    gradeSingleBankQuestion(
      { id: 't12', questionType: 'data_graph_analysis', marks: 2, correctAnswer: '0.5' },
      '0.5'
    ).isCorrect,
    true
  );

  // Full assessment excludes manual-pending marks from autoGradable denominator
  const mixed = gradeBankAssessment(
    [
      {
        id: 'm1',
        subjectId: 'physics',
        unitId: 'u1',
        lessonId: 'l1',
        semester: 1,
        difficulty: 'foundation',
        questionType: 'mcq',
        promptAr: 'سؤال',
        optionsAr: ['أ', 'ب'],
        correctAnswer: 'أ',
        explanationAr: 'شرح',
        marks: 2,
        isPublished: true,
      },
      {
        id: 'm2',
        subjectId: 'physics',
        unitId: 'u1',
        lessonId: 'l1',
        semester: 1,
        difficulty: 'advanced',
        questionType: 'structured_long',
        promptAr: 'اشرح',
        correctAnswer: 'نموذج',
        explanationAr: 'شرح',
        marks: 5,
        isPublished: true,
      },
    ],
    { m1: 'أ', m2: 'إجابة الطالب' }
  );
  assert.equal(mixed.scorePercent, 100);
  assert.equal(mixed.manualPendingCount, 1);
});

test('SlidingWindowLimiter blocks bursts cleanly with Retry-After seconds', () => {
  const limiter = new SlidingWindowLimiter({
    maxRequests: 2,
    windowMs: 60_000,
    messageAr: 'تجاوز',
  });
  assert.equal(limiter.check('uid:1', 1000).allowed, true);
  assert.equal(limiter.check('uid:1', 2000).allowed, true);
  const third = limiter.check('uid:1', 3000);
  assert.equal(third.allowed, false);
  assert.ok(third.retryAfterSeconds >= 58);
});

test('Dry-run migration report passes zero-leak and public/private ID parity checks across all 97 questions', () => {
  const { report, publicRecords, privateKeyRecords } = buildMigrationDryRunReport();
  assert.equal(report.totalScanned, 97);
  assert.equal(report.legacyCount, 53);
  assert.equal(report.extendedCount, 44);
  assert.equal(report.publicLeakCheckPassed, true);
  assert.equal(report.parityCheckPassed, true);
  assert.equal(publicRecords.length, 97);
  assert.equal(privateKeyRecords.length, 97);
  assert.equal(report.statusBreakdown.APPROVED, 42);
  assert.equal(report.statusBreakdown.NEEDS_REVIEW, 53);
  assert.equal(report.statusBreakdown.PENDING_REVIEW, 1);
  assert.equal(report.statusBreakdown.NEEDS_CORRECTION, 1);
  assert.equal(listPublicQuestionsForStudents().length, 42);
});

test('firestore.rules enforces zero client answer key reads, server-only attempts, and bestExamScore tamper lock', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  assert.match(rules, /match \/questionAnswerKeys\/\{questionId\}[\s\S]*allow read, write: if false;/);
  assert.match(rules, /match \/attempts\/\{attemptId\}[\s\S]*allow create, update: if false;/);
  assert.match(rules, /bestExamScore/);
  assert.match(rules, /!data\.keys\(\)\.hasAny\(/);
  assert.match(rules, /verificationStatus == 'APPROVED'/);
});
