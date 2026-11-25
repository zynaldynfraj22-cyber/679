import { SubjectId, Semester, DifficultyLevel, QuestionType } from './curriculum';

export type MasteryState =
  | 'NOT_STARTED'
  | 'LEARNING'
  | 'NEEDS_PRACTICE'
  | 'DEVELOPING'
  | 'MASTERED'
  | 'NEEDS_REVISION';

export interface ObjectiveMasteryRecord {
  userId: string;
  objectiveId: string;
  subjectId: SubjectId;
  lessonId: string;
  totalAttempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  accuracyPercent: number;
  highestDifficultyPassed: DifficultyLevel;
  lastPracticedIso: string;
  masteryState: MasteryState;
  reviewCount: number;
  nextReviewDateIso?: string;
}

export type WeaknessCategory =
  | 'CONCEPTUAL'
  | 'CALCULATION'
  | 'APPLICATION'
  | 'TERMINOLOGY'
  | 'EXAM_TECHNIQUE';

export interface DetectedWeakness {
  id: string;
  userId: string;
  subjectId: SubjectId;
  lessonId?: string;
  objectiveId?: string;
  category: WeaknessCategory;
  titleAr: string;
  evidenceAr: string;
  recommendedActionAr: string;
  severity: 'high' | 'medium' | 'low';
  detectedAtIso: string;
}

export type RevisionActivityType =
  | 'READ_EXPLANATION'
  | 'REVIEW_SUMMARY'
  | 'STUDY_EXAMPLES'
  | 'COMPLETE_EXERCISES'
  | 'RETRY_INCORRECT'
  | 'DIAGNOSTIC_TEST';

export interface RevisionTask {
  id: string;
  userId: string;
  subjectId: SubjectId;
  unitId?: string;
  lessonId: string;
  objectiveId?: string;
  reasonAr: string;
  recommendedActivity: RevisionActivityType;
  recommendedActivityAr: string;
  durationMinutes: number;
  priority: 'high' | 'medium' | 'normal';
  dueDateIso: string;
  isCompleted: boolean;
  completedAtIso?: string;
  isPostponed?: boolean;
}

export interface SpacedRepetitionItem {
  id: string;
  userId: string;
  lessonId: string;
  subjectId: SubjectId;
  objectiveId?: string;
  intervalDays: number;
  repetitionNumber: number;
  easeFactor: number;
  lastReviewedIso: string;
  nextReviewIso: string;
  status: 'due_today' | 'upcoming' | 'overdue' | 'completed';
}

export interface StudyPlanTask {
  id: string;
  titleAr: string;
  subjectId: SubjectId;
  lessonId?: string;
  activityType: RevisionActivityType;
  durationMinutes: number;
  isCompleted: boolean;
  scheduledTime?: string;
}

export interface DailyStudyPlan {
  userId: string;
  dateIso: string;
  availableMinutes: number;
  tasks: StudyPlanTask[];
  isCompleted: boolean;
}

export interface WeeklyStudyPlan {
  userId: string;
  weekStartingIso: string;
  days: DailyStudyPlan[];
  weeklyGoalAr: string;
  completedTasksCount: number;
  totalTasksCount: number;
}

export type StudySessionActivityType =
  | 'LESSON_READING'
  | 'SUMMARY_REVIEW'
  | 'SOLVED_EXAMPLES'
  | 'EXERCISES'
  | 'QUESTION_BANK'
  | 'EXAMINATION'
  | 'SPACED_REVISION'
  | 'PERSONAL_STUDY';

export interface StudySessionRecord {
  id: string;
  userId: string;
  subjectId: SubjectId;
  lessonId?: string;
  activityType: StudySessionActivityType;
  startTimeIso: string;
  endTimeIso?: string;
  durationSeconds: number;
  questionsAttempted: number;
  questionsCorrect: number;
  outcomeAr: string;
}

export interface StudentGoal {
  id: string;
  userId: string;
  titleAr: string;
  subjectId?: SubjectId;
  targetCount: number;
  currentCount: number;
  deadlineIso: string;
  isCompleted: boolean;
  category: 'lesson_completion' | 'exercise_count' | 'objective_mastery' | 'exam_passing' | 'revision_streak';
}

export interface AchievementRecord {
  id: string;
  userId: string;
  titleAr: string;
  descriptionAr: string;
  iconName: string;
  unlockedAtIso: string;
  category: 'streak' | 'mastery' | 'exam' | 'revision' | 'completion';
}

export type NotificationType =
  | 'REVISION_DUE'
  | 'UPCOMING_EXAM'
  | 'GOAL_REMINDER'
  | 'RECOMMENDATION'
  | 'ACHIEVEMENT_UNLOCKED';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  titleAr: string;
  messageAr: string;
  createdAtIso: string;
  isRead: boolean;
  actionRoute?: string;
}

export type ExamReadinessState =
  | 'NOT_ENOUGH_DATA'
  | 'NEEDS_PREPARATION'
  | 'DEVELOPING'
  | 'GOOD_PREPARATION'
  | 'STRONG_PREPARATION';

export interface SubjectExamReadiness {
  subjectId: SubjectId;
  readinessState: ExamReadinessState;
  readinessScorePercent: number;
  strongTopicsAr: string[];
  weakTopicsAr: string[];
  unassessedTopicsCount: number;
  recommendedActionAr: string;
}

export interface PersonalizedRecommendation {
  id: string;
  userId: string;
  subjectId: SubjectId;
  lessonId?: string;
  titleAr: string;
  explanationAr: string;
  actionType: RevisionActivityType;
  actionLabelAr: string;
  priority: 'high' | 'medium' | 'normal';
}

export interface PerformanceReport {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDateIso: string;
  endDateIso: string;
  totalStudyMinutes: number;
  sessionsCount: number;
  questionsAttempted: number;
  accuracyPercent: number;
  revisionsCompleted: number;
  improvedAreasAr: string[];
  weakAreasAr: string[];
  recommendedPrioritiesAr: string[];
}
