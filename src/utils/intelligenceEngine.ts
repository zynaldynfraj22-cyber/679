import { ExamAttempt, LessonProgress, SubjectId, LearningObjective, Lesson } from '../types/curriculum';
import {
  MasteryState,
  ObjectiveMasteryRecord,
  DetectedWeakness,
  RevisionTask,
  SpacedRepetitionItem,
  DailyStudyPlan,
  WeeklyStudyPlan,
  StudySessionRecord,
  StudentGoal,
  SubjectExamReadiness,
  ExamReadinessState,
  PersonalizedRecommendation,
  PerformanceReport,
} from '../types/intelligence';

export function computeObjectiveMastery(
  userId: string,
  attempts: ExamAttempt[],
  objectives: LearningObjective[]
): ObjectiveMasteryRecord[] {
  const map = new Map<string, { total: number; correct: number; incorrect: number; difficulties: Set<string>; lastIso: string }>();

  for (const att of attempts) {
    if (!att.answerDetails) continue;
    for (const ans of att.answerDetails) {
      if (!ans.learningObjectiveId) continue;
      const cur = map.get(ans.learningObjectiveId) ?? {
        total: 0,
        correct: 0,
        incorrect: 0,
        difficulties: new Set<string>(),
        lastIso: att.createdAtIso,
      };
      cur.total += 1;
      if (ans.isCorrect) cur.correct += 1;
      else cur.incorrect += 1;
      cur.difficulties.add(ans.difficulty);
      if (att.createdAtIso > cur.lastIso) {
        cur.lastIso = att.createdAtIso;
      }
      map.set(ans.learningObjectiveId, cur);
    }
  }

  const results: ObjectiveMasteryRecord[] = [];

  for (const obj of objectives) {
    const stats = map.get(obj.id);
    if (!stats || stats.total === 0) {
      results.push({
        userId,
        objectiveId: obj.id,
        subjectId: obj.subjectId,
        lessonId: obj.lessonId ?? 'general',
        totalAttempts: 0,
        correctAttempts: 0,
        incorrectAttempts: 0,
        accuracyPercent: 0,
        highestDifficultyPassed: 'foundation',
        lastPracticedIso: new Date().toISOString(),
        masteryState: 'NOT_STARTED',
        reviewCount: 0,
      });
      continue;
    }

    const accuracy = Math.round((stats.correct / stats.total) * 100);
    let state: MasteryState = 'LEARNING';
    if (stats.total < 3) {
      state = 'LEARNING';
    } else if (accuracy >= 80 && stats.total >= 5) {
      state = 'MASTERED';
    } else if (accuracy >= 60) {
      state = 'DEVELOPING';
    } else {
      state = 'NEEDS_PRACTICE';
    }

    results.push({
      userId,
      objectiveId: obj.id,
      subjectId: obj.subjectId,
      lessonId: obj.lessonId ?? 'general',
      totalAttempts: stats.total,
      correctAttempts: stats.correct,
      incorrectAttempts: stats.incorrect,
      accuracyPercent: accuracy,
      highestDifficultyPassed: 'intermediate',
      lastPracticedIso: stats.lastIso,
      masteryState: state,
      reviewCount: stats.total,
    });
  }

  return results;
}

export function detectStudentWeaknesses(
  userId: string,
  attempts: ExamAttempt[],
  lessons: Lesson[]
): DetectedWeakness[] {
  const weaknesses: DetectedWeakness[] = [];
  const lessonMistakes = new Map<string, number>();

  for (const att of attempts) {
    if (!att.answerDetails) continue;
    for (const ans of att.answerDetails) {
      if (!ans.isCorrect) {
        const count = lessonMistakes.get(att.lessonId) ?? 0;
        lessonMistakes.set(att.lessonId, count + 1);
      }
    }
  }

  for (const [lessonId, count] of lessonMistakes.entries()) {
    if (count >= 2) {
      const lesson = lessons.find((l) => l.id === lessonId);
      weaknesses.push({
        id: `weak-${lessonId}-${Date.now()}`,
        userId,
        subjectId: lesson?.subjectId ?? 'physics',
        lessonId,
        category: 'CONCEPTUAL',
        titleAr: `صعوبة متكررة في درس: ${lesson?.titleAr ?? lessonId}`,
        evidenceAr: `تم تسجيل ${count} إجابات خاطئة في هذا الدرس عبر الاختبارات والتمارين.`,
        recommendedActionAr: `مراجعة ملخص الدرس ودراسة الأمثلة المحلولة بعناية.`,
        severity: count >= 4 ? 'high' : 'medium',
        detectedAtIso: new Date().toISOString(),
      });
    }
  }

  return weaknesses;
}

export function calculateExamReadiness(
  subjectId: SubjectId,
  attempts: ExamAttempt[],
  progressMap: Record<string, LessonProgress>,
  lessons: Lesson[]
): SubjectExamReadiness {
  const subjectLessons = lessons.filter((l) => l.subjectId === subjectId);
  const completedLessons = subjectLessons.filter((l) => progressMap[l.id]?.status === 'completed').length;
  const lessonRatio = subjectLessons.length > 0 ? completedLessons / subjectLessons.length : 0;

  const subjectAttempts = attempts.filter((a) => a.subjectId === subjectId);
  const totalAtt = subjectAttempts.length;
  const avgScore =
    totalAtt > 0
      ? Math.round(subjectAttempts.reduce((acc, curr) => acc + curr.scorePercent, 0) / totalAtt)
      : 0;

  let state: ExamReadinessState = 'NOT_ENOUGH_DATA';
  let scorePercent = 0;

  if (totalAtt === 0 && completedLessons === 0) {
    state = 'NOT_ENOUGH_DATA';
    scorePercent = 15;
  } else {
    scorePercent = Math.round(lessonRatio * 40 + (avgScore > 0 ? avgScore * 0.6 : 30));
    if (scorePercent >= 85) state = 'STRONG_PREPARATION';
    else if (scorePercent >= 70) state = 'GOOD_PREPARATION';
    else if (scorePercent >= 50) state = 'DEVELOPING';
    else state = 'NEEDS_PREPARATION';
  }

  return {
    subjectId,
    readinessState: state,
    readinessScorePercent: Math.min(100, Math.max(10, scorePercent)),
    strongTopicsAr: subjectLessons.slice(0, 2).map((l) => l.titleAr),
    weakTopicsAr: subjectLessons.slice(2, 4).map((l) => l.titleAr),
    unassessedTopicsCount: Math.max(0, subjectLessons.length - completedLessons),
    recommendedActionAr:
      state === 'STRONG_PREPARATION'
        ? 'مستوى ممتاز، يُنصح بحل اختبارات شاملة متقدمة.'
        : 'مراجعة الدروس غير المكتملة وحل تمارين إضافية لتعزيز الفهم.',
  };
}

export function generatePersonalizedRecommendations(
  userId: string,
  weaknesses: DetectedWeakness[],
  readinessList: SubjectExamReadiness[]
): PersonalizedRecommendation[] {
  const recs: PersonalizedRecommendation[] = [];

  for (const w of weaknesses.slice(0, 3)) {
    recs.push({
      id: `rec-${w.id}`,
      userId,
      subjectId: w.subjectId,
      lessonId: w.lessonId,
      titleAr: `معالجة نقطة الضعف: ${w.titleAr}`,
      explanationAr: w.evidenceAr,
      actionType: 'READ_EXPLANATION',
      actionLabelAr: 'مراجعة الدرس والأمثلة',
      priority: w.severity === 'high' ? 'high' : 'medium',
    });
  }

  for (const r of readinessList) {
    if (r.readinessState === 'NEEDS_PREPARATION' || r.readinessState === 'DEVELOPING') {
      recs.push({
        id: `rec-ready-${r.subjectId}`,
        userId,
        subjectId: r.subjectId,
        titleAr: `تحسين الاستعداد لمادة ${r.subjectId}`,
        explanationAr: r.recommendedActionAr,
        actionType: 'COMPLETE_EXERCISES',
        actionLabelAr: 'حل تمارين تقوية',
        priority: 'high',
      });
    }
  }

  return recs;
}

export function generateDailyStudyPlan(
  userId: string,
  subjectId: SubjectId,
  availableMinutes: number = 60
): DailyStudyPlan {
  return {
    userId,
    dateIso: new Date().toISOString().split('T')[0],
    availableMinutes,
    isCompleted: false,
    tasks: [
      {
        id: `task-1-${Date.now()}`,
        titleAr: 'مراجعة المفاهيم الأساسية والملخص السريع',
        subjectId,
        activityType: 'REVIEW_SUMMARY',
        durationMinutes: 20,
        isCompleted: false,
      },
      {
        id: `task-2-${Date.now()}`,
        titleAr: 'حل 4 تمارين تطبيقية ومقارنة النتائج',
        subjectId,
        activityType: 'COMPLETE_EXERCISES',
        durationMinutes: 25,
        isCompleted: false,
      },
      {
        id: `task-3-${Date.now()}`,
        titleAr: 'إعادة محاولة الأسئلة التي تم الخطأ فيها سابقاً',
        subjectId,
        activityType: 'RETRY_INCORRECT',
        durationMinutes: 15,
        isCompleted: false,
      },
    ],
  };
}
