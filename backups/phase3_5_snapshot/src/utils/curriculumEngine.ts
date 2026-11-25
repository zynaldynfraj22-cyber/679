import type {
  AssessmentResult,
  ExamAttempt,
  Lesson,
  LessonProgress,
  Question,
  QuestionFilter,
  Subject,
  SubjectId,
  Unit,
} from '../types/curriculum';
import {
  filterBankQuestions,
  gradeBankAssessment,
  gradeSingleBankQuestion,
  normalizeTextToken,
} from './questionEngine';

export function normalizeAnswer(raw: string): string {
  return normalizeTextToken(raw);
}

export function filterQuestions(
  questions: Question[],
  filter: QuestionFilter
): Question[] {
  return filterBankQuestions(questions, filter);
}

export function isQuestionAnswerCorrect(question: Question, rawAnswer: string): boolean {
  return gradeSingleBankQuestion(question, rawAnswer).isCorrect;
}

export function gradeAssessment(
  questions: Question[],
  userAnswers: Record<string, string>
): AssessmentResult {
  return gradeBankAssessment(questions, userAnswers);
}

export interface SubjectProgressSummary {
  subjectId: SubjectId;
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  completionPercent: number;
  averageScore: number;
}

export function computeSubjectProgress(
  subjectId: SubjectId,
  lessons: Lesson[],
  progressMap: Record<string, LessonProgress>
): SubjectProgressSummary {
  const subjectLessons = lessons.filter((l) => l.subjectId === subjectId && l.isPublished);
  const totalLessons = subjectLessons.length;
  let completedLessons = 0;
  let inProgressLessons = 0;
  let scoreSum = 0;
  let scoredCount = 0;

  for (const lesson of subjectLessons) {
    const prog = progressMap[lesson.id];
    if (!prog) continue;
    if (prog.status === 'completed') completedLessons += 1;
    if (prog.status === 'in_progress') inProgressLessons += 1;
    if (prog.bestExamScore > 0) {
      scoreSum += prog.bestExamScore;
      scoredCount += 1;
    }
  }

  const completionPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const averageScore = scoredCount > 0 ? Math.round(scoreSum / scoredCount) : 0;

  return {
    subjectId,
    totalLessons,
    completedLessons,
    inProgressLessons,
    completionPercent,
    averageScore,
  };
}

export interface DashboardMetrics {
  totalLessons: number;
  completedLessons: number;
  bookmarkedCount: number;
  overallCompletionPercent: number;
  overallMasteryScore: number;
  totalAttempts: number;
  recommendedLesson: Lesson | null;
  subjectSummaries: Record<SubjectId, SubjectProgressSummary>;
}

export function computeOverallDashboardMetrics(
  subjects: Subject[],
  lessons: Lesson[],
  progressMap: Record<string, LessonProgress>,
  attempts: ExamAttempt[]
): DashboardMetrics {
  const publishedLessons = lessons.filter((l) => l.isPublished);
  const subjectSummaries = {} as Record<SubjectId, SubjectProgressSummary>;

  let completedLessons = 0;
  for (const subject of subjects) {
    const summary = computeSubjectProgress(subject.id, publishedLessons, progressMap);
    subjectSummaries[subject.id] = summary;
    completedLessons += summary.completedLessons;
  }

  const bookmarkedCount = Object.values(progressMap).filter((p) => p.bookmarked).length;
  const totalLessons = publishedLessons.length;
  const overallCompletionPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const scoredAttempts = attempts.filter((a) => typeof a.scorePercent === 'number');
  const overallMasteryScore =
    scoredAttempts.length > 0
      ? Math.round(
          scoredAttempts.reduce((acc, item) => acc + item.scorePercent, 0) /
            scoredAttempts.length
        )
      : 0;

  // Recommend first in-progress lesson, otherwise first uncompleted lesson
  const inProgressLesson =
    publishedLessons.find((l) => progressMap[l.id]?.status === 'in_progress') ?? null;
  const nextUnstartedLesson =
    publishedLessons.find((l) => progressMap[l.id]?.status !== 'completed') ??
    publishedLessons[0] ??
    null;

  return {
    totalLessons,
    completedLessons,
    bookmarkedCount,
    overallCompletionPercent,
    overallMasteryScore,
    totalAttempts: attempts.length,
    recommendedLesson: inProgressLesson ?? nextUnstartedLesson,
    subjectSummaries,
  };
}

export function sanitizeUserNotes(notes: string): string {
  return notes.trim().slice(0, 4000);
}

export function sanitizeDisplayName(name: string): string {
  const trimmed = name.trim().slice(0, 120);
  return trimmed.length > 0 ? trimmed : 'طالب الصف الثاني عشر';
}

export function normalizeLessonStandard(lesson: Lesson): Lesson {
  return {
    ...lesson,
    academicYearId: lesson.academicYearId ?? '2026-2027',
    keyPointsAr: Array.isArray(lesson.keyPointsAr) ? lesson.keyPointsAr : [],
    keyFormulas: Array.isArray(lesson.keyFormulas) ? lesson.keyFormulas : [],
    sections: Array.isArray(lesson.sections) ? lesson.sections : [],
    solvedExamples: Array.isArray(lesson.solvedExamples) ? lesson.solvedExamples : [],
    exercises: Array.isArray(lesson.exercises) ? lesson.exercises : [],
    sourceIds: Array.isArray(lesson.sourceIds) ? lesson.sourceIds : [],
    verificationStatus: lesson.verificationStatus ?? 'NEEDS_REVIEW',
    introduction: lesson.introduction ?? {
      overviewAr: lesson.summaryAr,
      objectivesAr:
        lesson.keyPointsAr.length > 0
          ? lesson.keyPointsAr.slice(0, 3)
          : [`فهم وتطبيق مفاهيم ${lesson.titleAr} وفق المنهج العُماني.`],
      prerequisitesAr: ['مراجعة المفاهيم التأسيسية في الوحدة السابقة.'],
      keyConceptsAr: [lesson.titleAr],
    },
    comprehensiveSummary: lesson.comprehensiveSummary ?? {
      detailedSummaryAr: lesson.summaryAr,
      quickRevisionAr: lesson.keyPointsAr,
      keyTermsAr: [],
      memorizePointsAr: lesson.keyPointsAr.slice(0, 3),
    },
    review: lesson.review ?? {
      keyTakeawaysAr: lesson.keyPointsAr.slice(0, 3),
      commonMistakesAr: ['إهمال التحقق من الوحدات الدولية (SI) قبل التعويض العددي.'],
      revisionChecklistAr: ['مراجعة القوانين، حل الأمثلة المغلقة، وإتمام اختبار الدرس.'],
    },
  };
}

export function buildLessonTutorContext(
  subject: Subject,
  unit: Unit,
  lesson: Lesson
): string {
  const normalized = normalizeLessonStandard(lesson);
  const introObjectives = normalized.introduction?.objectivesAr?.join('؛ ') ?? '';

  const formulasText = normalized.keyFormulas
    .map((f) => `- ${f.labelAr}: ${f.expression} (${f.variablesAr}، الوحدة: ${f.unit})`)
    .join('\n');

  const sectionsText = normalized.sections
    .map((s) => {
      const defs = s.definitionsAr?.map((d) => `تعريف ${d.termAr}: ${d.definitionAr}`).join(' | ');
      const laws = s.lawsAr?.join(' | ');
      return [
        `### ${s.titleAr}`,
        s.contentAr,
        defs ? `تعريفات: ${defs}` : '',
        laws ? `قوانين: ${laws}` : '',
        `الخلاصة: ${s.keyTakeawayAr}`,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');

  const detailedSummary = normalized.comprehensiveSummary?.detailedSummaryAr ?? normalized.summaryAr;

  return [
    `المادة: ${subject.titleAr} (${subject.code})`,
    `الفصل الدراسي: ${normalized.semester === 1 ? 'الفصل الأول' : 'الفصل الثاني'}`,
    `الوحدة ${unit.unitNumber}: ${unit.titleAr}`,
    `الدرس: ${normalized.titleAr}`,
    `المرجع الرسمي: ${normalized.officialRef}`,
    introObjectives ? `الأهداف التعليمية: ${introObjectives}` : '',
    `الملخص الشامل: ${detailedSummary}`,
    formulasText ? `القوانين الأساسية:\n${formulasText}` : '',
    sectionsText ? `محتوى الدرس المعتمد:\n${sectionsText}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

