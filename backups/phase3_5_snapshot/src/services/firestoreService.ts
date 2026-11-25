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
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  AcademicYearRecord,
  CurriculumSource,
  ExamAttempt,
  LearningObjective,
  Lesson,
  LessonProgress,
  Question,
  Semester,
  SemesterRecord,
  Subject,
  SubjectId,
  Unit,
  UserProfile,
  VerificationRecord,
} from '../types/curriculum';
import { sanitizeDisplayName, sanitizeUserNotes } from '../utils/curriculumEngine';

export async function checkUserIsAdmin(user: User): Promise<boolean> {
  if (!user.emailVerified) return false;
  if (user.email === 'zynaldynfraj22@gmail.com') return true;
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
      const data = snap.data() as UserProfile;
      return data;
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
    await setDoc(userRef, profilePayload);
    return {
      userId: profilePayload.userId,
      displayName: profilePayload.displayName,
      email: profilePayload.email,
      governorate: profilePayload.governorate,
      activeSemester: profilePayload.activeSemester,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserActiveSemester(
  userId: string,
  _profile: UserProfile,
  activeSemester: Semester
): Promise<void> {
  const path = `users/${userId}`;
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, {
      activeSemester,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
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
      handleFirestoreError(error, OperationType.LIST, path);
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
          createdAtIso: data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : new Date().toISOString(),
        });
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveLessonProgress(
  userId: string,
  progress: Omit<LessonProgress, 'userId' | 'updatedAt'>
): Promise<void> {
  const path = `users/${userId}/progress/${progress.lessonId}`;
  const docRef = doc(db, 'users', userId, 'progress', progress.lessonId);
  try {
    await setDoc(docRef, {
      userId,
      lessonId: progress.lessonId,
      subjectId: progress.subjectId,
      status: progress.status,
      bookmarked: Boolean(progress.bookmarked),
      bestExamScore: Math.max(0, Math.min(100, Math.round(progress.bestExamScore))),
      notesAr: sanitizeUserNotes(progress.notesAr ?? ''),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function recordExamAttempt(
  userId: string,
  attempt: {
    attemptId: string;
    lessonId: string;
    subjectId: SubjectId;
    mode: 'lesson_exam' | 'question_bank';
    totalQuestions: number;
    correctCount: number;
    scorePercent: number;
  }
): Promise<void> {
  const path = `users/${userId}/attempts/${attempt.attemptId}`;
  const docRef = doc(db, 'users', userId, 'attempts', attempt.attemptId);
  try {
    await setDoc(docRef, {
      userId,
      lessonId: attempt.lessonId,
      subjectId: attempt.subjectId,
      mode: attempt.mode,
      totalQuestions: Math.max(1, Math.min(100, Math.round(attempt.totalQuestions))),
      correctCount: Math.max(
        0,
        Math.min(attempt.totalQuestions, Math.round(attempt.correctCount))
      ),
      scorePercent: Math.max(0, Math.min(100, Math.round(attempt.scorePercent))),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchPublishedCurriculumFromFirestore(): Promise<{
  subjects: Subject[];
  units: Unit[];
  lessons: Lesson[];
  questions: Question[];
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
        getDocs(query(collection(db, 'questionBank'), where('isPublished', '==', true))),
        getDocs(collection(db, 'sources')).catch(() => null),
        getDocs(collection(db, 'learningObjectives')).catch(() => null),
      ]);

    return {
      subjects: subjectsSnap.docs.map((d) => d.data() as Subject),
      units: unitsSnap.docs.map((d) => d.data() as Unit),
      lessons: lessonsSnap.docs.map((d) => d.data() as Lesson),
      questions: questionsSnap.docs.map((d) => d.data() as Question),
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

export async function seedCurriculumToFirestore(
  subjects: Subject[],
  units: Unit[],
  lessons: Lesson[],
  questions: Question[],
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

    // Chunk lessons in batches of 350
    for (let i = 0; i < lessons.length; i += 350) {
      const lBatch = writeBatch(db);
      for (const l of lessons.slice(i, i + 350)) {
        lBatch.set(doc(db, 'lessons', l.id), buildLessonFirestorePayload(l));
        count += 1;
      }
      await lBatch.commit();
    }

    // Chunk question bank in batches of 400
    for (let i = 0; i < questions.length; i += 400) {
      const qBatch = writeBatch(db);
      for (const q of questions.slice(i, i + 400)) {
        qBatch.set(doc(db, 'questionBank', q.id), {
          id: q.id,
          subjectId: q.subjectId,
          unitId: q.unitId,
          lessonId: q.lessonId,
          semester: q.semester,
          difficulty: q.difficulty,
          questionType: q.questionType,
          promptAr: q.promptAr,
          optionsAr: q.optionsAr ?? [],
          correctAnswer: q.correctAnswer,
          explanationAr: q.explanationAr,
          marks: q.marks,
          isPublished: true,
        });
        count += 1;
      }
      await qBatch.commit();
    }

    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'curriculum-seed');
  }
}
