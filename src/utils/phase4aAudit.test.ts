import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createServerApp } from '../../server/app';
import {
  buildMigrationDryRunReport,
  getAllServerQuestions,
  getQuestionBankAuditReport,
} from '../../server/questionStore';
import { LEGACY_QUESTION_BANK } from '../../server/data/legacyQuestions';
import { EXTENDED_QUESTION_BANK } from '../../server/data/extendedQuestions';
import { LESSONS_PART_1 } from '../data/lessonsPart1';
import { LESSONS_PART_2 } from '../data/lessonsPart2';
import { LESSONS_PART_3 } from '../data/lessonsPart3';
import { PUBLIC_QUESTION_BANK } from '../data/questionBankPublic';
import { OFFICIAL_LEARNING_OBJECTIVES, OMAN_CURRICULUM_SOURCES } from '../data/sourcesAndCatalog';
import { OMAN_UNITS } from '../data/subjectsAndUnits';
import {
  auditQuestionBankIntegrity,
  deriveDefaultQuestionTitle,
  normalizeQuestionDefaults,
  toPublicQuestion,
} from './questionEngine';
import type { DifficultyLevel, PublicQuestion, Question, QuestionType } from '../types/curriculum';

const ALL_LESSONS = [...LESSONS_PART_1, ...LESSONS_PART_2, ...LESSONS_PART_3];

const STUDENT_USER = {
  uid: 'student-4a-1',
  email: 'student4a@moe.om',
  email_verified: true,
};

const ADMIN_USER = {
  uid: 'admin-4a-1',
  email: 'zynaldynfraj22@gmail.com',
  email_verified: true,
  admin: true,
};

async function withTestServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const app = createServerApp({
    geminiClientOverride: null,
    tokenVerifier: async (token: string) => {
      if (token === 'student-token') return STUDENT_USER;
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

test('Subphase 4A verified baseline counts: 53 legacy, 44 extended, 97 total, 42 approved deliverable', () => {
  assert.equal(LEGACY_QUESTION_BANK.length, 53);
  assert.equal(EXTENDED_QUESTION_BANK.length, 44);
  assert.equal(getAllServerQuestions().length, 97);
  assert.equal(PUBLIC_QUESTION_BANK.length, 42);

  const report = getQuestionBankAuditReport(true);
  assert.equal(report.counts.legacy, 53);
  assert.equal(report.counts.extended, 44);
  assert.equal(report.counts.total, 97);
  assert.equal(report.counts.approvedDeliverable, 42);
  assert.equal(report.counts.needsReview, 53);
  assert.equal(report.counts.pendingReview, 1);
  assert.equal(report.counts.needsCorrection, 1);
  assert.equal(report.counts.rejected, 0);
  assert.equal(report.counts.outdated, 0);
});

test('Subphase 4A integrity report confirms unique IDs, 0 link/payload issues, all 5 difficulties & 12 types, and sync parity', () => {
  const report = getQuestionBankAuditReport(true);

  assert.equal(report.uniqueIdCheckPassed, true);
  assert.deepEqual(report.duplicateIds, []);
  assert.deepEqual(report.duplicateMatches, []);
  assert.deepEqual(report.lessonLinkIssues, []);
  assert.deepEqual(report.typePayloadIssues, []);

  // All scientific validation checks should have 0 errors; qb-chem-21 false positive must be resolved
  const totalSciErrors = report.scientificIssues.reduce((acc, s) => acc + s.errorsAr.length, 0);
  assert.equal(totalSciErrors, 0);
  assert.equal(
    report.scientificIssues.some((s) => s.questionId === 'qb-chem-21'),
    false,
    'qb-chem-21 should not trigger false-positive equation warning'
  );

  // All 5 difficulties represented in both total and approved
  const difficulties: DifficultyLevel[] = [
    'foundation',
    'basic_application',
    'intermediate',
    'advanced',
    'olympiad',
  ];
  for (const d of difficulties) {
    assert.ok(report.coverageByDifficulty[d].total > 0, `Missing difficulty ${d}`);
    assert.ok(report.coverageByDifficulty[d].approved > 0, `No approved items for ${d}`);
  }

  // All 12 question types represented in total bank
  const allTypes: QuestionType[] = [
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
  for (const t of allTypes) {
    assert.ok(report.coverageByType[t].total > 0, `Missing question type ${t}`);
  }

  // Exact documented audit gap counts (to be addressed in Subphase 4B)
  const missingObj = report.objectiveIssues.filter((x) => x.issue === 'missing_objective');
  const invalidObj = report.objectiveIssues.filter((x) => x.issue !== 'missing_objective');
  assert.equal(missingObj.length, 78);
  assert.equal(invalidObj.length, 0);
  assert.equal(report.sourceVerificationIssues.length, 55);
  assert.deepEqual(report.lessonsWithZeroApproved, ['chem-u1-l1', 'chem-u7-l1', 'math-u3-l2']);

  // Zero-leak and parity checks
  assert.equal(report.publicLeakCheckPassed, true);
  assert.equal(report.publicPrivateParityPassed, true);
  assert.equal(report.publicClientSyncPassed, true);

  // Every server & public question gets titleAr + createdAtIso
  for (const q of getAllServerQuestions()) {
    assert.ok(q.titleAr && q.titleAr.trim().length >= 2, `Missing titleAr on ${q.id}`);
    assert.ok(q.createdAtIso && q.createdAtIso.length >= 10, `Missing createdAtIso on ${q.id}`);
  }
  for (const pub of PUBLIC_QUESTION_BANK) {
    assert.ok(pub.titleAr && pub.titleAr.trim().length >= 2, `Missing titleAr on public ${pub.id}`);
    assert.ok(pub.createdAtIso && pub.createdAtIso.length >= 10, `Missing createdAtIso on public ${pub.id}`);
  }
});

test('deriveDefaultQuestionTitle creates readable non-empty Arabic title from conceptAr or promptAr', () => {
  const title = deriveDefaultQuestionTitle({
    promptAr: 'ما مقدار شدة المجال الجاذبي على ارتفاع يساوي نصف قطر الأرض فوق سطحها؟',
    conceptAr: 'شدة مجال الجاذبية',
  });
  assert.equal(title, 'شدة مجال الجاذبية');

  const fallback = deriveDefaultQuestionTitle({
    promptAr: 'احسب قيمة المقاومة المكافئة في الدائرة الكهربائية الموضحة في الشكل المجاور.',
  });
  assert.ok(fallback.length >= 10 && fallback.length <= 76);
});

test('auditQuestionBankIntegrity detects synthetic duplicates, link mismatches, unverified AI/official items, and answer leaks', () => {
  const baseValid: Question = normalizeQuestionDefaults({
    id: 'syn-valid-1',
    subjectId: 'physics',
    unitId: 'phys-u1',
    lessonId: 'phys-u1-l1',
    semester: 1,
    difficulty: 'foundation',
    questionType: 'mcq',
    promptAr: 'ما وحدة قياس ثابت الجذب العام G في النظام الدولي؟',
    optionsAr: ['N·m²/kg²', 'N/kg', 'm/s²', 'J/kg'],
    correctAnswer: 'N·m²/kg²',
    explanationAr: 'من قانون نيوتن للجذب العام نشتق الوحدة الدولية للثابت G.',
    marks: 1,
    origin: 'OFFICIAL_PAST_EXAM',
    verificationStatus: 'APPROVED',
    sourceId: 'src-phys-s1-textbook-2026',
    sourceRefAr: 'كتاب الفيزياء ص ١٢',
    isPublished: true,
  });

  const duplicateIdQ: Question = {
    ...baseValid,
    promptAr: 'سؤال مكرر الهوية لاختبار الكشف عن التكرار.',
  };

  const linkMismatchQ: Question = {
    ...baseValid,
    id: 'syn-mismatch-1',
    subjectId: 'chemistry', // mismatches phys-u1-l1
    unitId: 'phys-u2', // mismatches phys-u1-l1
    semester: 2, // mismatches semester 1
  };

  const unverifiedAiApproved: Question = {
    ...baseValid,
    id: 'syn-ai-unreviewed',
    origin: 'AI_GENERATED',
    verificationStatus: 'APPROVED',
    lastReviewedAtIso: undefined,
    sourceId: undefined,
  };

  const leakedSnapshot: PublicQuestion[] = [
    {
      ...toPublicQuestion(baseValid),
      // Inject forbidden field via cast to simulate data leak
      correctAnswer: 'LEAKED',
    } as unknown as PublicQuestion,
  ];

  const audit = auditQuestionBankIntegrity({
    questions: [baseValid, duplicateIdQ, linkMismatchQ, unverifiedAiApproved],
    lessons: ALL_LESSONS,
    units: OMAN_UNITS,
    objectives: OFFICIAL_LEARNING_OBJECTIVES,
    sources: OMAN_CURRICULUM_SOURCES,
    publicSnapshot: leakedSnapshot,
  });

  assert.equal(audit.uniqueIdCheckPassed, false);
  assert.deepEqual(audit.duplicateIds, ['syn-valid-1']);
  assert.ok(audit.lessonLinkIssues.some((i) => i.questionId === 'syn-mismatch-1' && i.issue === 'subject_mismatch'));
  assert.ok(audit.lessonLinkIssues.some((i) => i.questionId === 'syn-mismatch-1' && i.issue === 'unit_mismatch'));
  assert.ok(audit.lessonLinkIssues.some((i) => i.questionId === 'syn-mismatch-1' && i.issue === 'semester_mismatch'));
  assert.ok(
    audit.sourceVerificationIssues.some(
      (i) => i.questionId === 'syn-ai-unreviewed' && i.issue === 'ai_approved_without_review_timestamp'
    )
  );
  assert.equal(audit.publicClientSyncPassed, false);
});

test('Migration dry-run report includes complete Phase 4A integrity counts', () => {
  const { report } = buildMigrationDryRunReport();
  assert.equal(report.dryRun, true);
  assert.equal(report.uniqueIdCheckPassed, true);
  assert.equal(report.lessonLinkIssuesCount, 0);
  assert.equal(report.objectiveMissingCount, 78);
  assert.equal(report.objectiveInvalidCount, 0);
  assert.equal(report.typePayloadIssuesCount, 0);
  assert.equal(report.sourceIssuesCount, 55);
  assert.equal(report.scientificErrorsCount, 0);
  assert.deepEqual(report.lessonsWithZeroApproved, ['chem-u1-l1', 'chem-u7-l1', 'math-u3-l2']);
});

test('GET /api/questions pagination & GET /api/admin/questions/audit authorization enforce security contracts', async () => {
  await withTestServer(async (baseUrl) => {
    const pagedRes = await fetch(`${baseUrl}/api/questions?page=1&limit=10`);
    assert.equal(pagedRes.status, 200);
    const pagedData = (await pagedRes.json()) as {
      questions: PublicQuestion[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
    assert.equal(pagedData.questions.length, 10);
    assert.equal(pagedData.total, 42);
    assert.equal(pagedData.page, 1);
    assert.equal(pagedData.pageSize, 10);
    assert.equal(pagedData.totalPages, 5);
    for (const q of pagedData.questions) {
      assert.ok(q.titleAr && q.titleAr.length >= 2);
      assert.equal('correctAnswer' in q, false);
    }

    // Unauthenticated audit request -> 401
    const unauthAudit = await fetch(`${baseUrl}/api/admin/questions/audit`);
    assert.equal(unauthAudit.status, 401);

    // Student audit request -> 403
    const studentAudit = await fetch(`${baseUrl}/api/admin/questions/audit`, {
      headers: { Authorization: 'Bearer student-token' },
    });
    assert.equal(studentAudit.status, 403);

    // Admin audit request -> 200 with report
    const adminAudit = await fetch(`${baseUrl}/api/admin/questions/audit`, {
      headers: { Authorization: 'Bearer admin-token' },
    });
    assert.equal(adminAudit.status, 200);
    const adminPayload = (await adminAudit.json()) as {
      report: { counts: { total: number; approvedDeliverable: number }; uniqueIdCheckPassed: boolean };
    };
    assert.equal(adminPayload.report.counts.total, 97);
    assert.equal(adminPayload.report.counts.approvedDeliverable, 42);
    assert.equal(adminPayload.report.uniqueIdCheckPassed, true);
  });
});
