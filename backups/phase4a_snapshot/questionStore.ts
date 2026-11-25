import type {
  DuplicateMatch,
  ExamAttempt,
  ExamBlueprintType,
  MigrationReport,
  PublicQuestion,
  Question,
  QuestionAnswerKey,
  QuestionAuditSummary,
  QuestionFilter,
  QuestionReviewRecord,
  QuestionVerificationState,
  QuestionVersionRecord,
  SubjectId,
} from '../src/types/curriculum';
import {
  detectQuestionDuplicates,
  filterBankQuestions,
  isQuestionDeliverableToStudent,
  normalizeQuestionDefaults,
  toPrivateAnswerKey,
  toPublicQuestion,
  validateQuestionScientifically,
} from '../src/utils/questionEngine';
import { LEGACY_QUESTION_BANK } from './data/legacyQuestions';
import { EXTENDED_QUESTION_BANK } from './data/extendedQuestions';
import { getAdminFirestore, markAdminFirestoreUnavailable } from './firebaseAdmin';

export interface ActiveExamSession {
  sessionId: string;
  uid: string;
  mode: ExamBlueprintType | 'lesson_exam' | 'question_bank';
  titleAr: string;
  subjectId: SubjectId;
  lessonId: string;
  questionIds: string[];
  startedAtMs: number;
  durationSeconds: number;
  passingScorePercent: number;
  submitted: boolean;
}

export interface ActivePracticeSession {
  sessionId: string;
  uid: string;
  questionIds: string[];
  createdAtMs: number;
}

const legacyIds = new Set(LEGACY_QUESTION_BANK.map((q) => q.id));
const extendedIds = new Set(EXTENDED_QUESTION_BANK.map((q) => q.id));

const questionMap = new Map<string, Question>();
for (const raw of [...LEGACY_QUESTION_BANK, ...EXTENDED_QUESTION_BANK]) {
  const normalized = normalizeQuestionDefaults(raw);
  const validation = validateQuestionScientifically(normalized);
  questionMap.set(normalized.id, {
    ...normalized,
    scientificValidation: validation,
  });
}

const reviewHistory: QuestionReviewRecord[] = [];
const versionHistory: QuestionVersionRecord[] = [];
const examSessions = new Map<string, ActiveExamSession>();
const practiceSessions = new Map<string, ActivePracticeSession>();
const serverAttemptCache = new Map<string, ExamAttempt[]>();

export function getAllServerQuestions(): Question[] {
  return Array.from(questionMap.values());
}

export function listPublicQuestionsForStudents(filter: QuestionFilter = {}): PublicQuestion[] {
  const safeFilter: QuestionFilter = {
    ...filter,
    includeUnapproved: false,
  };
  const publicList = getAllServerQuestions()
    .filter((q) => isQuestionDeliverableToStudent(q))
    .map(toPublicQuestion);
  return filterBankQuestions(publicList, safeFilter);
}

export function getPublicQuestionsByIds(ids: string[]): PublicQuestion[] {
  const result: PublicQuestion[] = [];
  for (const id of ids) {
    const q = questionMap.get(id);
    if (q && isQuestionDeliverableToStudent(q)) {
      result.push(toPublicQuestion(q));
    }
  }
  return result;
}

export async function getServerQuestionAndKey(
  questionId: string
): Promise<{ question: Question; answerKey: QuestionAnswerKey } | null> {
  // Prefer Admin Firestore answer key + public doc if IAM is available
  const { db } = getAdminFirestore();
  if (db) {
    try {
      const [pubSnap, keySnap] = await Promise.all([
        db.collection('questionBank').doc(questionId).get(),
        db.collection('questionAnswerKeys').doc(questionId).get(),
      ]);
      if (pubSnap.exists && keySnap.exists) {
        const pub = pubSnap.data() as PublicQuestion;
        const key = keySnap.data() as QuestionAnswerKey;
        const merged: Question = normalizeQuestionDefaults({
          ...pub,
          correctAnswer: key.correctAnswer,
          correctAnswers: key.correctAnswers,
          matchingPairs: key.matchingPairs,
          orderingItemsAr: key.orderingItemsAr,
          rubricAr: key.rubricAr,
          numericTolerance: key.numericTolerance,
          requiredUnit: key.requiredUnit,
          explanationAr: key.explanationAr,
          whyCorrectAr: key.whyCorrectAr,
          solutionStepsAr: key.solutionStepsAr,
          commonMistakeAr: key.commonMistakeAr,
          conceptAr: key.conceptAr ?? pub.conceptAr,
          aiMetadata: key.aiMetadata,
          scientificValidation: key.scientificValidation,
        });
        return { question: merged, answerKey: key };
      }
    } catch (err) {
      markAdminFirestoreUnavailable(err);
    }
  }

  const local = questionMap.get(questionId);
  if (!local) return null;
  return {
    question: local,
    answerKey: toPrivateAnswerKey(local),
  };
}

export function getAdminAuditSummary(): QuestionAuditSummary {
  const all = getAllServerQuestions();
  const duplicates = detectQuestionDuplicates(all);
  return {
    totalQuestions: all.length,
    approvedCount: all.filter((q) => q.verificationStatus === 'APPROVED').length,
    needsReviewCount: all.filter((q) => q.verificationStatus === 'NEEDS_REVIEW').length,
    pendingReviewCount: all.filter((q) => q.verificationStatus === 'PENDING_REVIEW').length,
    needsCorrectionCount: all.filter((q) => q.verificationStatus === 'NEEDS_CORRECTION').length,
    rejectedCount: all.filter((q) => q.verificationStatus === 'REJECTED').length,
    outdatedCount: all.filter((q) => q.verificationStatus === 'OUTDATED').length,
    duplicatePairsCount: duplicates.length,
    missingSourceCount: all.filter((q) => !q.sourceId).length,
  };
}

export function listAdminQuestionsWithAudit(filter: QuestionFilter = {}): {
  questions: Question[];
  auditSummary: QuestionAuditSummary;
  duplicates: DuplicateMatch[];
  reviews: QuestionReviewRecord[];
  versions: QuestionVersionRecord[];
} {
  const all = getAllServerQuestions();
  const query = filter.searchQuery?.trim().toLowerCase() ?? '';
  const filtered = all.filter((q) => {
    if (filter.subjectId && filter.subjectId !== 'all' && q.subjectId !== filter.subjectId) return false;
    if (filter.unitId && filter.unitId !== 'all' && q.unitId !== filter.unitId) return false;
    if (filter.lessonId && filter.lessonId !== 'all' && q.lessonId !== filter.lessonId) return false;
    if (filter.semester && filter.semester !== 'all' && q.semester !== filter.semester) return false;
    if (filter.difficulty && filter.difficulty !== 'all' && q.difficulty !== filter.difficulty) return false;
    if (filter.questionType && filter.questionType !== 'all' && q.questionType !== filter.questionType) return false;
    if (filter.origin && filter.origin !== 'all' && q.origin !== filter.origin) return false;
    if (filter.verificationStatus && filter.verificationStatus !== 'all' && q.verificationStatus !== filter.verificationStatus) {
      return false;
    }
    if (query) {
      const hay = `${q.promptAr} ${q.explanationAr} ${q.conceptAr ?? ''} ${q.sourceRefAr ?? ''} ${q.id}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  return {
    questions: filtered,
    auditSummary: getAdminAuditSummary(),
    duplicates: detectQuestionDuplicates(all),
    reviews: reviewHistory.slice(0, 100),
    versions: versionHistory.slice(0, 100),
  };
}

export async function reviewQuestionStatusAsAdmin(params: {
  questionId: string;
  newStatus: QuestionVerificationState;
  reviewerAr: string;
  notesAr: string;
}): Promise<{ question: Question | null; persistedToFirestore: boolean }> {
  const existing = questionMap.get(params.questionId);
  if (!existing) {
    return { question: null, persistedToFirestore: false };
  }

  const nowIso = new Date().toISOString();
  const previousStatus = existing.verificationStatus ?? 'NEEDS_REVIEW';
  const nextPublished = params.newStatus === 'APPROVED';

  const updated: Question = normalizeQuestionDefaults({
    ...existing,
    verificationStatus: params.newStatus,
    isPublished: nextPublished,
    lastReviewedAtIso: nowIso,
  });
  updated.scientificValidation = validateQuestionScientifically(updated);

  questionMap.set(updated.id, updated);

  const reviewRec: QuestionReviewRecord = {
    id: `qrev-${Date.now()}`,
    questionId: updated.id,
    previousStatus,
    newStatus: params.newStatus,
    reviewerAr: params.reviewerAr,
    notesAr: params.notesAr,
    reviewedAtIso: nowIso,
  };
  reviewHistory.unshift(reviewRec);

  let persistedToFirestore = false;
  const { db } = getAdminFirestore();
  if (db) {
    try {
      const pub = toPublicQuestion(updated);
      const priv = toPrivateAnswerKey(updated);
      const batch = db.batch();
      batch.set(db.collection('questionBank').doc(updated.id), pub, { merge: true });
      batch.set(db.collection('questionAnswerKeys').doc(updated.id), priv, { merge: true });
      batch.set(db.collection('questionReviews').doc(reviewRec.id), reviewRec);
      await batch.commit();
      persistedToFirestore = true;
    } catch (err) {
      markAdminFirestoreUnavailable(err);
    }
  }

  return { question: updated, persistedToFirestore };
}

export async function upsertQuestionAsAdmin(params: {
  question: Question;
  editorAr: string;
  changeSummaryAr: string;
}): Promise<{ question: Question; persistedToFirestore: boolean }> {
  const existing = questionMap.get(params.question.id);
  const nowIso = new Date().toISOString();
  const nextVersion = existing ? (existing.version ?? 1) + 1 : 1;

  const normalized = normalizeQuestionDefaults({
    ...params.question,
    createdAtIso: existing?.createdAtIso ?? params.question.createdAtIso ?? nowIso,
    lastReviewedAtIso: nowIso,
    version: nextVersion,
    isPublished: params.question.verificationStatus === 'APPROVED' && params.question.isPublished,
  });
  normalized.scientificValidation = validateQuestionScientifically(normalized);

  questionMap.set(normalized.id, normalized);

  const verRec: QuestionVersionRecord = {
    id: `qver-${Date.now()}-${normalized.id}`,
    questionId: normalized.id,
    version: nextVersion,
    editorAr: params.editorAr,
    changeSummaryAr: params.changeSummaryAr,
    snapshotPromptAr: normalized.promptAr,
    snapshotAnswer: normalized.correctAnswer,
    editedAtIso: nowIso,
  };
  versionHistory.unshift(verRec);

  let persistedToFirestore = false;
  const { db } = getAdminFirestore();
  if (db) {
    try {
      const pub = toPublicQuestion(normalized);
      const priv = toPrivateAnswerKey(normalized);
      const batch = db.batch();
      batch.set(db.collection('questionBank').doc(normalized.id), pub);
      batch.set(db.collection('questionAnswerKeys').doc(normalized.id), priv);
      batch.set(db.collection('questionVersions').doc(verRec.id), verRec);
      await batch.commit();
      persistedToFirestore = true;
    } catch (err) {
      markAdminFirestoreUnavailable(err);
    }
  }

  return { question: normalized, persistedToFirestore };
}

export function registerGeneratedAiQuestionsForReview(questions: Question[]): Question[] {
  const stored: Question[] = [];
  for (const raw of questions) {
    const safe: Question = normalizeQuestionDefaults({
      ...raw,
      origin: 'AI_GENERATED',
      verificationStatus: 'PENDING_REVIEW',
      isPublished: false,
    });
    safe.scientificValidation = validateQuestionScientifically(safe);
    questionMap.set(safe.id, safe);
    stored.push(safe);
  }
  return stored;
}

export function createPracticeSession(uid: string, questionIds: string[]): ActivePracticeSession {
  const session: ActivePracticeSession = {
    sessionId: `prac-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    uid,
    questionIds,
    createdAtMs: Date.now(),
  };
  practiceSessions.set(session.sessionId, session);
  return session;
}

export function createExamSession(session: Omit<ActiveExamSession, 'sessionId' | 'submitted'>): ActiveExamSession {
  const full: ActiveExamSession = {
    ...session,
    sessionId: `exam-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    submitted: false,
  };
  examSessions.set(full.sessionId, full);
  return full;
}

export function getExamSession(sessionId: string): ActiveExamSession | undefined {
  return examSessions.get(sessionId);
}

export function markExamSessionSubmitted(sessionId: string): void {
  const sess = examSessions.get(sessionId);
  if (sess) {
    sess.submitted = true;
    examSessions.set(sessionId, sess);
  }
}

export function cacheServerAttemptForUser(uid: string, attempt: ExamAttempt): void {
  const list = serverAttemptCache.get(uid) ?? [];
  serverAttemptCache.set(uid, [attempt, ...list].slice(0, 100));
}

export function getCachedServerAttemptsForUser(uid: string): ExamAttempt[] {
  return serverAttemptCache.get(uid) ?? [];
}

const PRIVATE_FORBIDDEN_KEYS = new Set([
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

export function buildMigrationDryRunReport(): {
  report: MigrationReport;
  publicRecords: PublicQuestion[];
  privateKeyRecords: QuestionAnswerKey[];
} {
  const allRaw = [...LEGACY_QUESTION_BANK, ...EXTENDED_QUESTION_BANK];
  const normalized = allRaw.map((raw) => normalizeQuestionDefaults(raw));

  const publicRecords = normalized.map(toPublicQuestion);
  const privateKeyRecords = normalized.map(toPrivateAnswerKey);

  const statusBreakdown: Record<QuestionVerificationState, number> = {
    PENDING_REVIEW: 0,
    NEEDS_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
    NEEDS_CORRECTION: 0,
    OUTDATED: 0,
  };

  const incompleteOrMissingSourceIds: string[] = [];

  for (const q of normalized) {
    const status = q.verificationStatus ?? 'NEEDS_REVIEW';
    statusBreakdown[status] = (statusBreakdown[status] ?? 0) + 1;
    if (!q.sourceId) {
      incompleteOrMissingSourceIds.push(q.id);
    }
  }

  const publicLeakCheckPassed = publicRecords.every((pub) => {
    const keys = Object.keys(pub as unknown as Record<string, unknown>);
    return !keys.some((k) => PRIVATE_FORBIDDEN_KEYS.has(k));
  });

  const publicIdSet = new Set(publicRecords.map((p) => p.id));
  const privateIdSet = new Set(privateKeyRecords.map((k) => k.questionId));
  const parityCheckPassed =
    publicRecords.length === privateKeyRecords.length &&
    publicIdSet.size === privateIdSet.size &&
    Array.from(publicIdSet).every((id) => privateIdSet.has(id));

  const duplicateMatches = detectQuestionDuplicates(normalized);
  const warningsAr: string[] = [];

  if (statusBreakdown.NEEDS_REVIEW > 0) {
    warningsAr.push(
      `يوجد ${statusBreakdown.NEEDS_REVIEW} سؤالاً موروثاً بدون توثيق مصدر صريح (sourceId) وتُصنف كـ NEEDS_REVIEW لحين اعتماد المشرف.`
    );
  }
  if (statusBreakdown.PENDING_REVIEW > 0 || statusBreakdown.NEEDS_CORRECTION > 0) {
    warningsAr.push(
      `يوجد ${statusBreakdown.PENDING_REVIEW} مسودة بانتظار المراجعة و ${statusBreakdown.NEEDS_CORRECTION} سؤال بحاجة لتصحيح ولن تظهر للطلبة.`
    );
  }
  if (duplicateMatches.length > 0) {
    warningsAr.push(`رُصد ${duplicateMatches.length} تشابه نصي محتمل لمراجعة المشرف.`);
  }

  return {
    publicRecords,
    privateKeyRecords,
    report: {
      dryRun: true,
      generatedAtIso: new Date().toISOString(),
      totalScanned: normalized.length,
      legacyCount: allRaw.filter((q) => legacyIds.has(q.id)).length,
      extendedCount: allRaw.filter((q) => extendedIds.has(q.id)).length,
      publicDocsPrepared: publicRecords.length,
      privateAnswerKeyDocsPrepared: privateKeyRecords.length,
      statusBreakdown,
      publicLeakCheckPassed,
      parityCheckPassed,
      incompleteOrMissingSourceIds,
      duplicateMatches,
      warningsAr,
    },
  };
}
