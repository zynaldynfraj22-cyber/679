import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  AcademicYearRecord,
  AdminAssistDraft,
  AdminAssistType,
  CurriculumSource,
  DifficultyLevel,
  DuplicateMatch,
  ExamAttempt,
  ExamBlueprintType,
  ExamStartResponse,
  ExamSubmitResponse,
  LearningObjective,
  Lesson,
  LessonProgress,
  MigrationReport,
  PracticeAnswerResponse,
  PracticeStartResponse,
  PublicQuestion,
  Question,
  QuestionAuditSummary,
  QuestionFilter,
  QuestionReviewRecord,
  QuestionType,
  QuestionVerificationState,
  QuestionVersionRecord,
  Semester,
  SemesterRecord,
  Subject,
  SubjectId,
  Unit,
  UserProfile,
  VerificationRecord,
} from '../types/curriculum';
import { sanitizeDisplayName, sanitizeUserNotes } from '../utils/curriculumEngine';

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const current = auth.currentUser;
  if (current) {
    try {
      const token = await current.getIdToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Let backend return 401 cleanly if token retrieval fails
    }
  }
  return headers;
}

async function parseApiResponse<T>(response: Response, fallbackErrorAr: string): Promise<T> {
  const rawText = await response.text();
  let data: Record<string, unknown> = {};
  if (rawText) {
    try {
      data = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      data = {};
    }
  }
  if (!response.ok) {
    const errMsg = typeof data.error === 'string' ? data.error : fallbackErrorAr;
    const error = new Error(errMsg) as Error & { status?: number; retryAfterSeconds?: number };
    error.status = response.status;
    if (typeof data.retryAfterSeconds === 'number') {
      error.retryAfterSeconds = data.retryAfterSeconds;
    }
    throw error;
  }
  return data as T;
}

export async function checkUserIsAdmin(user: User): Promise<boolean> {
  if (!user.emailVerified) return false;
  if (user.email === 'zynaldynfraj22@gmail.com') return true;
  try {
    const tokenResult = await user.getIdTokenResult();
    if (tokenResult.claims?.admin === true || tokenResult.claims?.role === 'admin') {
      return true;
    }
  } catch {
    // Fall back to Firestore registry check
  }
  try {
    const adminSnap = await getDoc(doc(db, 'admins', user.uid));
    return adminSnap.exists();
  } catch {
    return false;
  }
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    const profilePayload = {
      userId: user.uid,
      displayName: sanitizeDisplayName(user.displayName ?? user.email?.split('@')[0] ?? 'طالب'),
      email: (user.email ?? '').slice(0, 200),
      governorate: 'مسقط',
      activeSemester: 1 as Semester,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(userRef, profilePayload).catch(() => {});
    return {
      userId: profilePayload.userId,
      displayName: profilePayload.displayName,
      email: profilePayload.email,
      governorate: profilePayload.governorate,
      activeSemester: profilePayload.activeSemester,
    };
  } catch (error) {
    console.warn('Firestore offline fallback for ensureUserProfile:', error);
    return {
      userId: user.uid,
      displayName: sanitizeDisplayName(user.displayName ?? user.email?.split('@')[0] ?? 'طالب'),
      email: user.email ?? '',
      governorate: 'مسقط',
      activeSemester: 1,
    };
  }
}

export async function updateUserActiveSemester(
  userId: string,
  _profile: UserProfile,
  activeSemester: Semester
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, {
      activeSemester,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Firestore offline warning in updateUserActiveSemester:', error);
  }
}

export function subscribeUserProgress(
  userId: string,
  onData: (progressMap: Record<string, LessonProgress>) => void
): Unsubscribe {
  const path = `users/${userId}/progress`;
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const next: Record<string, LessonProgress> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as LessonProgress;
        next[data.lessonId] = data;
      });
      onData(next);
    },
    (error) => {
      console.warn('Firestore offline warning in subscribeUserProgress:', error);
    }
  );
}

export function subscribeUserAttempts(
  userId: string,
  onData: (attempts: ExamAttempt[]) => void
): Unsubscribe {
  const path = `users/${userId}/attempts`;
  const q = query(
    collection(db, path),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: ExamAttempt[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<ExamAttempt, 'id' | 'createdAtIso'> & {
          createdAt?: { toDate?: () => Date };
        };
        list.push({
          id: docSnap.id,
          userId: data.userId,
          lessonId: data.lessonId,
          subjectId: data.subjectId,
          mode: data.mode,
          totalQuestions: data.totalQuestions,
          correctCount: data.correctCount,
          scorePercent: data.scorePercent,
          gradingSource: data.gradingSource ?? 'server',
          createdAtIso: data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : new Date().toISOString(),
        });
      });
      onData(list);
    },
    (error) => {
      console.warn('Firestore offline warning in subscribeUserAttempts:', error);
    }
  );
}

/**
 * Saves student status, bookmark, and personal study notes ONLY.
 * bestExamScore is strictly locked server-side in Firestore rules and cannot be forged by clients.
 */
export async function saveLessonProgress(
  userId: string,
  progress: Omit<LessonProgress, 'userId' | 'updatedAt' | 'bestExamScore'>
): Promise<void> {
  const docRef = doc(db, 'users', userId, 'progress', progress.lessonId);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, {
        status: progress.status,
        bookmarked: Boolean(progress.bookmarked),
        notesAr: sanitizeUserNotes(progress.notesAr ?? ''),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        userId,
        lessonId: progress.lessonId,
        subjectId: progress.subjectId,
        status: progress.status,
        bookmarked: Boolean(progress.bookmarked),
        bestExamScore: 0,
        notesAr: sanitizeUserNotes(progress.notesAr ?? ''),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.warn('Firestore offline warning in saveLessonProgress:', error);
  }
}

export async function fetchPublishedCurriculumFromFirestore(): Promise<{
  subjects: Subject[];
  units: Unit[];
  lessons: Lesson[];
  questions: PublicQuestion[];
  sources: CurriculumSource[];
  objectives: LearningObjective[];
} | null> {
  try {
    const subjectsSnap = await getDocs(
      query(collection(db, 'subjects'), where('isPublished', '==', true))
    );
    if (subjectsSnap.empty) return null;

    const [unitsSnap, lessonsSnap, questionsSnap, sourcesSnap, objectivesSnap] =
      await Promise.all([
        getDocs(query(collection(db, 'units'), where('isPublished', '==', true))),
        getDocs(query(collection(db, 'lessons'), where('isPublished', '==', true))),
        getDocs(
          query(
            collection(db, 'questionBank'),
            where('isPublished', '==', true),
            where('verificationStatus', '==', 'APPROVED')
          )
        ).catch(() => null),
        getDocs(collection(db, 'sources')).catch(() => null),
        getDocs(collection(db, 'learningObjectives')).catch(() => null),
      ]);

    return {
      subjects: subjectsSnap.docs.map((d) => d.data() as Subject),
      units: unitsSnap.docs.map((d) => d.data() as Unit),
      lessons: lessonsSnap.docs.map((d) => d.data() as Lesson),
      questions: questionsSnap
        ? questionsSnap.docs
            .map((d) => d.data() as PublicQuestion)
            .filter((q) => q.isPublished && q.verificationStatus === 'APPROVED')
        : [],
      sources: sourcesSnap ? sourcesSnap.docs.map((d) => d.data() as CurriculumSource) : [],
      objectives: objectivesSnap
        ? objectivesSnap.docs.map((d) => d.data() as LearningObjective)
        : [],
    };
  } catch (error) {
    console.warn('Curriculum Firestore fetch skipped, using preloaded MOE bundle:', error);
    return null;
  }
}

// --- Server-Side Authoritative Assessment, Practice & Admin Governance API Clients ---

export async function fetchPublicQuestionsFromApi(
  filter: QuestionFilter = {}
): Promise<PublicQuestion[]> {
  const params = new URLSearchParams();
  if (filter.subjectId && filter.subjectId !== 'all') params.set('subjectId', filter.subjectId);
  if (filter.unitId && filter.unitId !== 'all') params.set('unitId', filter.unitId);
  if (filter.lessonId && filter.lessonId !== 'all') params.set('lessonId', filter.lessonId);
  if (filter.semester && filter.semester !== 'all') params.set('semester', String(filter.semester));
  if (filter.difficulty && filter.difficulty !== 'all') params.set('difficulty', filter.difficulty);
  if (filter.questionType && filter.questionType !== 'all') params.set('questionType', filter.questionType);
  if (filter.searchQuery?.trim()) params.set('searchQuery', filter.searchQuery.trim());

  const qs = params.toString();
  const response = await fetch(`/api/questions${qs ? `?${qs}` : ''}`);
  const data = await parseApiResponse<{ questions: PublicQuestion[] }>(
    response,
    'تعذر تحميل بنك الأسئلة المعتمد من الخادم.'
  );
  return Array.isArray(data.questions) ? data.questions : [];
}

export async function startPracticeSessionApi(params: {
  subjectId?: SubjectId | 'all';
  unitId?: string;
  lessonId?: string;
  semester?: Semester | 'all';
  difficulty?: DifficultyLevel | 'all';
  questionType?: QuestionType | 'all';
  limit?: number;
}): Promise<PracticeStartResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/practice/start', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return parseApiResponse<PracticeStartResponse>(
    response,
    'تعذر بدء جلسة التدريب التفاعلي. يرجى التحقق من تسجيل الدخول.'
  );
}

export async function submitPracticeAnswerApi(params: {
  sessionId?: string;
  questionId: string;
  answer: string;
}): Promise<PracticeAnswerResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/practice/answer', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return parseApiResponse<PracticeAnswerResponse>(
    response,
    'تعذر تصحيح الإجابة على الخادم. يرجى المحاولة مرة أخرى.'
  );
}

export async function startExamSessionApi(params: {
  mode: ExamBlueprintType | 'lesson_exam' | 'question_bank';
  titleAr: string;
  subjectId: SubjectId | 'all';
  unitIds?: string[];
  lessonIds?: string[];
  semester?: Semester | 'all';
  difficulty?: DifficultyLevel | 'all';
  questionType?: QuestionType | 'all';
  questionCount?: number;
  durationMinutes?: number;
  passingScorePercent?: number;
  randomizeOrder?: boolean;
}): Promise<ExamStartResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/exams/start', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return parseApiResponse<ExamStartResponse>(
    response,
    'تعذر بدء جلسة الاختبار المعتمد.'
  );
}

export async function submitExamSessionApi(params: {
  sessionId: string;
  answers: Record<string, string>;
}): Promise<ExamSubmitResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/exams/submit', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return parseApiResponse<ExamSubmitResponse>(
    response,
    'تعذر تصحيح الاختبار وحفظ النتيجة على الخادم.'
  );
}

export async function fetchServerAttemptsApi(): Promise<ExamAttempt[]> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/student/attempts', { headers });
  const data = await parseApiResponse<{ attempts: ExamAttempt[] }>(
    response,
    'تعذر استرجاع محاولات الاختبار.'
  );
  return Array.isArray(data.attempts) ? data.attempts : [];
}

export async function sendTutorChatApi(payload: {
  message: string;
  mode: 'explain' | 'solve' | 'general';
  lessonTitle: string;
  subjectTitle: string;
  lessonContext: string;
  history: { role: 'user' | 'assistant'; content: string }[];
}): Promise<{ reply: string }> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/tutor/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return parseApiResponse<{ reply: string }>(
    response,
    'تعذر الحصول على رد من المعلم الذكي.'
  );
}

export async function generateAdminQuestionsApi(payload: {
  subjectId: SubjectId;
  unitId: string;
  lessonId: string;
  semester: Semester;
  lessonTitle: string;
  subjectTitle: string;
  difficulty: DifficultyLevel;
  questionType: QuestionType;
  count: number;
  lessonContext: string;
  learningObjectiveId?: string;
}): Promise<{ questions: Question[] }> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/admin/generate-questions', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return parseApiResponse<{ questions: Question[] }>(
    response,
    'تعذر توليد مسودات الأسئلة.'
  );
}

export async function requestAdminAssistApi(payload: {
  assistType: AdminAssistType;
  subjectTitle: string;
  unitTitle: string;
  lessonTitle: string;
  semester: Semester;
  officialRef: string;
  existingContext: string;
  sourceSummary: string;
}): Promise<{ draft: AdminAssistDraft }> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/admin/assist', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return parseApiResponse<{ draft: AdminAssistDraft }>(
    response,
    'تعذر توليد المسودة بالذكاء الاصطناعي.'
  );
}

export async function fetchAdminQuestionsApi(filter: QuestionFilter = {}): Promise<{
  questions: Question[];
  auditSummary: QuestionAuditSummary;
  integrityReport?: import('../types/curriculum').QuestionBankAuditReport;
  duplicates: DuplicateMatch[];
  reviews: QuestionReviewRecord[];
  versions: QuestionVersionRecord[];
}> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (filter.subjectId && filter.subjectId !== 'all') params.set('subjectId', filter.subjectId);
  if (filter.lessonId && filter.lessonId !== 'all') params.set('lessonId', filter.lessonId);
  if (filter.difficulty && filter.difficulty !== 'all') params.set('difficulty', filter.difficulty);
  if (filter.questionType && filter.questionType !== 'all') params.set('questionType', filter.questionType);
  if (filter.origin && filter.origin !== 'all') params.set('origin', filter.origin);
  if (filter.verificationStatus && filter.verificationStatus !== 'all') {
    params.set('verificationStatus', filter.verificationStatus);
  }
  if (filter.searchQuery?.trim()) params.set('searchQuery', filter.searchQuery.trim());

  const qs = params.toString();
  const response = await fetch(`/api/admin/questions${qs ? `?${qs}` : ''}`, { headers });
  return parseApiResponse(response, 'تعذر تحميل سجل مراجعة بنك الأسئلة.');
}

export async function upsertAdminQuestionApi(payload: {
  question: Question;
  changeSummaryAr: string;
}): Promise<{
  question: Question;
  persistedToFirestore: boolean;
  totalQuestions: number;
  publicCount: number;
}> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/admin/questions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...payload.question,
      changeSummaryAr: payload.changeSummaryAr,
    }),
  });
  return parseApiResponse(response, 'تعذر حفظ السؤال في بنك الأسئلة.');
}

export async function reviewAdminQuestionApi(
  questionId: string,
  payload: { status: QuestionVerificationState; notesAr: string }
): Promise<{ question: Question; persistedToFirestore: boolean }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/admin/questions/${encodeURIComponent(questionId)}/review`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return parseApiResponse(response, 'تعذر تسجيل قرار المراجعة.');
}

export async function runDryRunMigrationApi(): Promise<{ report: MigrationReport }> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/admin/migration/dry-run', {
    method: 'POST',
    headers,
  });
  return parseApiResponse(response, 'تعذر تشغيل فحص الترحيل الآمن.');
}

// --- CMS Direct Lesson/Unit/Source/Objective Persistence ---

function buildLessonFirestorePayload(l: Lesson) {
  return {
    id: l.id,
    subjectId: l.subjectId,
    unitId: l.unitId,
    semester: l.semester,
    order: l.order,
    titleAr: l.titleAr,
    estimatedMinutes: l.estimatedMinutes,
    officialRef: l.officialRef,
    academicYearId: l.academicYearId ?? '2026-2027',
    summaryAr: l.summaryAr,
    keyPointsAr: l.keyPointsAr ?? [],
    keyFormulas: l.keyFormulas ?? [],
    introduction: l.introduction ?? null,
    sections: l.sections ?? [],
    comprehensiveSummary: l.comprehensiveSummary ?? null,
    solvedExamples: l.solvedExamples ?? [],
    exercises: l.exercises ?? [],
    review: l.review ?? null,
    sourceIds: l.sourceIds ?? [],
    verificationStatus: l.verificationStatus ?? 'NEEDS_REVIEW',
    aiGenerated: Boolean(l.aiGenerated),
    classificationNoteAr: l.classificationNoteAr ?? '',
    isPublished: l.isPublished,
    updatedAt: serverTimestamp(),
  };
}

export async function saveCmsLessonToFirestore(lesson: Lesson): Promise<void> {
  const path = `lessons/${lesson.id}`;
  try {
    await setDoc(doc(db, 'lessons', lesson.id), buildLessonFirestorePayload(lesson));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveCmsUnitToFirestore(unit: Unit): Promise<void> {
  const path = `units/${unit.id}`;
  try {
    await setDoc(doc(db, 'units', unit.id), {
      id: unit.id,
      subjectId: unit.subjectId,
      semester: unit.semester,
      unitNumber: unit.unitNumber,
      titleAr: unit.titleAr,
      summaryAr: unit.summaryAr,
      objectivesAr: unit.objectivesAr ?? [],
      officialLessonCount: unit.officialLessonCount ?? 0,
      sourceId: unit.sourceId ?? '',
      verificationStatus: unit.verificationStatus ?? 'NEEDS_REVIEW',
      isPublished: unit.isPublished,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveCmsSourceToFirestore(source: CurriculumSource): Promise<void> {
  const path = `sources/${source.id}`;
  try {
    await setDoc(doc(db, 'sources', source.id), {
      ...source,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveCmsObjectiveToFirestore(obj: LearningObjective): Promise<void> {
  const path = `learningObjectives/${obj.id}`;
  try {
    await setDoc(doc(db, 'learningObjectives', obj.id), {
      ...obj,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveVerificationRecordToFirestore(
  rec: VerificationRecord
): Promise<void> {
  const path = `verificationRecords/${rec.id}`;
  try {
    await setDoc(doc(db, 'verificationRecords', rec.id), {
      ...rec,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Seeds public curriculum catalog & strictly public question projections (ZERO answer keys).
 */
export async function seedCurriculumToFirestore(
  subjects: Subject[],
  units: Unit[],
  lessons: Lesson[],
  questions: PublicQuestion[],
  extra?: {
    academicYear?: AcademicYearRecord;
    semesters?: SemesterRecord[];
    sources?: CurriculumSource[];
    objectives?: LearningObjective[];
    verificationRecords?: VerificationRecord[];
  }
): Promise<number> {
  let count = 0;
  try {
    const batch1 = writeBatch(db);
    if (extra?.academicYear) {
      batch1.set(doc(db, 'academicYears', extra.academicYear.id), {
        ...extra.academicYear,
        updatedAt: serverTimestamp(),
      });
      count += 1;
    }
    for (const sem of extra?.semesters ?? []) {
      batch1.set(doc(db, 'semesters', sem.id), {
        ...sem,
        updatedAt: serverTimestamp(),
      });
      count += 1;
    }
    for (const s of subjects) {
      batch1.set(doc(db, 'subjects', s.id), {
        id: s.id,
        titleAr: s.titleAr,
        titleEn: s.titleEn,
        code: s.code,
        descriptionAr: s.descriptionAr,
        accentColor: s.accentColor,
        order: s.order,
        totalUnits: s.totalUnits,
        totalLessons: s.totalLessons,
        verificationStatus: s.verificationStatus ?? 'VERIFIED',
        isPublished: true,
        updatedAt: serverTimestamp(),
      });
      count += 1;
    }
    for (const u of units) {
      batch1.set(doc(db, 'units', u.id), {
        id: u.id,
        subjectId: u.subjectId,
        semester: u.semester,
        unitNumber: u.unitNumber,
        titleAr: u.titleAr,
        summaryAr: u.summaryAr,
        objectivesAr: u.objectivesAr,
        officialLessonCount: u.officialLessonCount ?? 0,
        sourceId: u.sourceId ?? '',
        verificationStatus: u.verificationStatus ?? 'VERIFIED',
        isPublished: true,
        updatedAt: serverTimestamp(),
      });
      count += 1;
    }
    for (const src of extra?.sources ?? []) {
      batch1.set(doc(db, 'sources', src.id), {
        ...src,
        updatedAt: serverTimestamp(),
      });
      count += 1;
    }
    for (const obj of extra?.objectives ?? []) {
      batch1.set(doc(db, 'learningObjectives', obj.id), {
        ...obj,
        updatedAt: serverTimestamp(),
      });
      count += 1;
    }
    for (const rec of extra?.verificationRecords ?? []) {
      batch1.set(doc(db, 'verificationRecords', rec.id), {
        ...rec,
        updatedAt: serverTimestamp(),
      });
      count += 1;
    }
    await batch1.commit();

    for (let i = 0; i < lessons.length; i += 350) {
      const lBatch = writeBatch(db);
      for (const l of lessons.slice(i, i + 350)) {
        lBatch.set(doc(db, 'lessons', l.id), buildLessonFirestorePayload(l));
        count += 1;
      }
      await lBatch.commit();
    }

    // Write strictly public fields ONLY to /questionBank (answer keys remain server-only)
    for (let i = 0; i < questions.length; i += 400) {
      const qBatch = writeBatch(db);
      for (const q of questions.slice(i, i + 400)) {
        const publicDoc: Record<string, unknown> = {
          id: q.id,
          subjectId: q.subjectId,
          unitId: q.unitId,
          lessonId: q.lessonId,
          semester: q.semester,
          difficulty: q.difficulty,
          questionType: q.questionType,
          promptAr: q.promptAr,
          marks: q.marks,
          verificationStatus: q.verificationStatus ?? 'APPROVED',
          isPublished: Boolean(q.isPublished),
          updatedAt: serverTimestamp(),
        };
        if (q.optionsAr) publicDoc.optionsAr = q.optionsAr;
        if (q.matchingLeftsAr) publicDoc.matchingLeftsAr = q.matchingLeftsAr;
        if (q.matchingRightsShuffledAr) {
          publicDoc.matchingRightsShuffledAr = q.matchingRightsShuffledAr;
        }
        if (q.orderingItemsShuffledAr) {
          publicDoc.orderingItemsShuffledAr = q.orderingItemsShuffledAr;
        }
        if (q.requiredUnit) publicDoc.requiredUnit = q.requiredUnit;
        if (q.diagramKind) publicDoc.diagramKind = q.diagramKind;
        if (q.diagramCaptionAr) publicDoc.diagramCaptionAr = q.diagramCaptionAr;
        if (q.dataTable) publicDoc.dataTable = q.dataTable;
        if (q.conceptAr) publicDoc.conceptAr = q.conceptAr;
        if (q.learningObjectiveId) publicDoc.learningObjectiveId = q.learningObjectiveId;
        if (q.sourceId) publicDoc.sourceId = q.sourceId;
        if (q.sourceRefAr) publicDoc.sourceRefAr = q.sourceRefAr;
        if (q.origin) publicDoc.origin = q.origin;

        qBatch.set(doc(db, 'questionBank', q.id), publicDoc);
        count += 1;
      }
      await qBatch.commit();
    }

    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'curriculum-seed');
  }
}
