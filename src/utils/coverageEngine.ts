import type {
  ComprehensiveCoverageMatrixReport,
  CurriculumSource,
  ExampleDifficulty,
  ExerciseTier,
  LearningObjective,
  LearningObjectiveCoverageRow,
  Lesson,
  LessonContentGapKind,
  LessonDeepCoverageRow,
  OfficialLessonCatalogItem,
  PublicQuestion,
  Semester,
  Subject,
  SubjectId,
  Unit,
  VerificationRecord,
  VerificationStatus,
} from '../types/curriculum';

export interface CoverageFilters {
  subjectId?: SubjectId | 'all';
  semester?: Semester | 'all';
  unitId?: string | 'all';
  verificationStatus?: VerificationStatus | 'all';
}

export interface SubjectCoverageBreakdown {
  subjectId: SubjectId;
  titleAr: string;
  code: string;
  officialUnitsCount: number;
  mappedUnitsCount: number;
  officialCatalogLessonsCount: number;
  implementedLessonsCount: number;
  verifiedLessonsCount: number;
  needsReviewLessonsCount: number;
  outdatedLessonsCount: number;
  missingLessonsCount: number;
  incompleteLessonsCount: number;
  coveragePercent: number;
}

export interface UnitCoverageBreakdown {
  unitId: string;
  subjectId: SubjectId;
  semester: Semester;
  unitNumber: number;
  titleAr: string;
  officialLessonCount: number;
  implementedCount: number;
  missingCount: number;
  verificationStatus: VerificationStatus;
  coveragePercent: number;
}

export interface CurriculumAnomaly {
  kind: 'duplicate_lesson_title' | 'semester_mismatch' | 'missing_sources' | 'incomplete_structure';
  entityId: string;
  subjectId: SubjectId;
  messageAr: string;
}

export interface CurriculumCoverageSummary {
  totalSubjects: number;
  verifiedSubjects: number;
  totalUnits: number;
  verifiedUnits: number;
  totalOfficialCatalogLessons: number;
  implementedLessonsCount: number;
  verifiedLessonsCount: number;
  needsReviewLessonsCount: number;
  outdatedLessonsCount: number;
  missingLessonsCount: number;
  incompleteLessonsCount: number;
  sourcesTotalCount: number;
  sourcesVerifiedCount: number;
  sourcesNeedingVerificationCount: number;
  overallCoveragePercent: number;
  subjectBreakdowns: SubjectCoverageBreakdown[];
  unitBreakdowns: UnitCoverageBreakdown[];
  filteredCatalog: OfficialLessonCatalogItem[];
  missingCatalogItems: OfficialLessonCatalogItem[];
  incompleteLessons: Lesson[];
  reviewQueueLessons: Lesson[];
  anomalies: CurriculumAnomaly[];
}

export function isLessonStandardComplete(lesson: Lesson): boolean {
  const hasIntro = Boolean(
    lesson.introduction &&
      lesson.introduction.overviewAr.trim().length >= 10 &&
      lesson.introduction.objectivesAr.length >= 1 &&
      lesson.introduction.prerequisitesAr.length >= 1 &&
      lesson.introduction.keyConceptsAr.length >= 1
  );
  const hasExplanation = lesson.sections.length >= 1;
  const hasSummary = Boolean(
    lesson.comprehensiveSummary &&
      lesson.comprehensiveSummary.detailedSummaryAr.trim().length >= 10 &&
      lesson.comprehensiveSummary.quickRevisionAr.length >= 1 &&
      lesson.comprehensiveSummary.keyTermsAr.length >= 1 &&
      lesson.comprehensiveSummary.memorizePointsAr.length >= 1
  );
  const hasExamples = lesson.solvedExamples.length >= 1;
  const hasExercises = lesson.exercises.length >= 1;
  const hasReview = Boolean(
    lesson.review &&
      lesson.review.keyTakeawaysAr.length >= 1 &&
      lesson.review.commonMistakesAr.length >= 1 &&
      lesson.review.revisionChecklistAr.length >= 1
  );
  const hasSources = Array.isArray(lesson.sourceIds) && lesson.sourceIds.length >= 1;

  return (
    hasIntro &&
    hasExplanation &&
    hasSummary &&
    hasExamples &&
    hasExercises &&
    hasReview &&
    hasSources
  );
}

export function detectCurriculumAnomalies(
  units: Unit[],
  lessons: Lesson[]
): CurriculumAnomaly[] {
  const anomalies: CurriculumAnomaly[] = [];
  const unitMap = new Map(units.map((u) => [u.id, u]));
  const titleMap = new Map<string, string>();

  for (const lesson of lessons) {
    const normalizedTitle = `${lesson.subjectId}::${lesson.titleAr.trim().toLowerCase()}`;
    const existingId = titleMap.get(normalizedTitle);
    if (existingId && existingId !== lesson.id) {
      anomalies.push({
        kind: 'duplicate_lesson_title',
        entityId: lesson.id,
        subjectId: lesson.subjectId,
        messageAr: `تكرار محتمل لعنوان الدرس "${lesson.titleAr}" مع (${existingId}).`,
      });
    } else {
      titleMap.set(normalizedTitle, lesson.id);
    }

    const parentUnit = unitMap.get(lesson.unitId);
    if (parentUnit && parentUnit.semester !== lesson.semester) {
      anomalies.push({
        kind: 'semester_mismatch',
        entityId: lesson.id,
        subjectId: lesson.subjectId,
        messageAr: `تعارض الفصل الدراسي للدرس "${lesson.titleAr}" مع الوحدة الأم (${parentUnit.titleAr}).`,
      });
    }

    if (!lesson.sourceIds || lesson.sourceIds.length === 0) {
      anomalies.push({
        kind: 'missing_sources',
        entityId: lesson.id,
        subjectId: lesson.subjectId,
        messageAr: `الدرس "${lesson.titleAr}" غير مربوط بمصدر رسمي في سجل المصادر.`,
      });
    }

    if (!isLessonStandardComplete(lesson)) {
      anomalies.push({
        kind: 'incomplete_structure',
        entityId: lesson.id,
        subjectId: lesson.subjectId,
        messageAr: `الدرس "${lesson.titleAr}" يفتقد أحد الأقسام القياسية الستة (A–F).`,
      });
    }
  }

  return anomalies;
}

export function computeCurriculumCoverage(
  subjects: Subject[],
  units: Unit[],
  lessons: Lesson[],
  catalog: OfficialLessonCatalogItem[],
  sources: CurriculumSource[],
  _verificationRecords: VerificationRecord[],
  filters: CoverageFilters = {}
): CurriculumCoverageSummary {
  const lessonById = new Map(lessons.map((l) => [l.id, l]));

  const filteredCatalog = catalog.filter((item) => {
    if (filters.subjectId && filters.subjectId !== 'all' && item.subjectId !== filters.subjectId) {
      return false;
    }
    if (filters.semester && filters.semester !== 'all' && item.semester !== filters.semester) {
      return false;
    }
    if (filters.unitId && filters.unitId !== 'all' && item.unitId !== filters.unitId) {
      return false;
    }
    if (filters.verificationStatus && filters.verificationStatus !== 'all') {
      const linked = item.linkedLessonId ? lessonById.get(item.linkedLessonId) : undefined;
      const effectiveStatus: VerificationStatus = linked?.verificationStatus ?? item.verificationStatus;
      if (effectiveStatus !== filters.verificationStatus) {
        return false;
      }
    }
    return true;
  });

  const filteredLessons = lessons.filter((l) => {
    if (filters.subjectId && filters.subjectId !== 'all' && l.subjectId !== filters.subjectId) {
      return false;
    }
    if (filters.semester && filters.semester !== 'all' && l.semester !== filters.semester) {
      return false;
    }
    if (filters.unitId && filters.unitId !== 'all' && l.unitId !== filters.unitId) {
      return false;
    }
    if (
      filters.verificationStatus &&
      filters.verificationStatus !== 'all' &&
      (l.verificationStatus ?? 'NEEDS_REVIEW') !== filters.verificationStatus
    ) {
      return false;
    }
    return true;
  });

  const missingCatalogItems = filteredCatalog.filter(
    (item) => !item.linkedLessonId || !lessonById.has(item.linkedLessonId)
  );

  const implementedCatalogItems = filteredCatalog.filter(
    (item) => item.linkedLessonId && lessonById.has(item.linkedLessonId)
  );

  const incompleteLessons = filteredLessons.filter((l) => !isLessonStandardComplete(l));
  const reviewQueueLessons = filteredLessons.filter(
    (l) => l.verificationStatus === 'NEEDS_REVIEW' || l.verificationStatus === 'OUTDATED' || l.aiGenerated
  );

  const verifiedLessonsCount = filteredLessons.filter(
    (l) => (l.verificationStatus ?? 'NEEDS_REVIEW') === 'VERIFIED'
  ).length;
  const needsReviewLessonsCount = filteredLessons.filter(
    (l) => (l.verificationStatus ?? 'NEEDS_REVIEW') === 'NEEDS_REVIEW'
  ).length;
  const outdatedLessonsCount = filteredLessons.filter(
    (l) => l.verificationStatus === 'OUTDATED'
  ).length;

  const totalOfficialCatalogLessons = filteredCatalog.length;
  const implementedLessonsCount = implementedCatalogItems.length;
  const missingLessonsCount = missingCatalogItems.length;

  const overallCoveragePercent =
    totalOfficialCatalogLessons > 0
      ? Math.round((implementedLessonsCount / totalOfficialCatalogLessons) * 100)
      : 0;

  const subjectBreakdowns: SubjectCoverageBreakdown[] = subjects
    .filter((s) => !filters.subjectId || filters.subjectId === 'all' || s.id === filters.subjectId)
    .map((subj) => {
      const subjUnits = units.filter(
        (u) =>
          u.subjectId === subj.id &&
          (!filters.semester || filters.semester === 'all' || u.semester === filters.semester)
      );
      const subjCatalog = filteredCatalog.filter((c) => c.subjectId === subj.id);
      const subjImplementedCatalog = subjCatalog.filter(
        (c) => c.linkedLessonId && lessonById.has(c.linkedLessonId)
      );
      const subjLessons = filteredLessons.filter((l) => l.subjectId === subj.id);

      const officialCatalogLessonsCount = subjCatalog.length;
      const implementedCount = subjImplementedCatalog.length;
      const missingCount = officialCatalogLessonsCount - implementedCount;

      return {
        subjectId: subj.id,
        titleAr: subj.titleAr,
        code: subj.code,
        officialUnitsCount: subjUnits.length,
        mappedUnitsCount: subjUnits.length,
        officialCatalogLessonsCount,
        implementedLessonsCount: implementedCount,
        verifiedLessonsCount: subjLessons.filter(
          (l) => (l.verificationStatus ?? 'NEEDS_REVIEW') === 'VERIFIED'
        ).length,
        needsReviewLessonsCount: subjLessons.filter(
          (l) => (l.verificationStatus ?? 'NEEDS_REVIEW') === 'NEEDS_REVIEW'
        ).length,
        outdatedLessonsCount: subjLessons.filter(
          (l) => l.verificationStatus === 'OUTDATED'
        ).length,
        missingLessonsCount: Math.max(0, missingCount),
        incompleteLessonsCount: subjLessons.filter((l) => !isLessonStandardComplete(l)).length,
        coveragePercent:
          officialCatalogLessonsCount > 0
            ? Math.round((implementedCount / officialCatalogLessonsCount) * 100)
            : 0,
      };
    });

  const unitBreakdowns: UnitCoverageBreakdown[] = units
    .filter((u) => {
      if (filters.subjectId && filters.subjectId !== 'all' && u.subjectId !== filters.subjectId) {
        return false;
      }
      if (filters.semester && filters.semester !== 'all' && u.semester !== filters.semester) {
        return false;
      }
      if (filters.unitId && filters.unitId !== 'all' && u.id !== filters.unitId) {
        return false;
      }
      return true;
    })
    .map((unit) => {
      const unitCatalog = catalog.filter((c) => c.unitId === unit.id);
      const totalOfficial = unitCatalog.length || unit.officialLessonCount || 0;
      const implementedCount = unitCatalog.filter(
        (c) => c.linkedLessonId && lessonById.has(c.linkedLessonId)
      ).length;
      const missingCount = Math.max(0, totalOfficial - implementedCount);
      return {
        unitId: unit.id,
        subjectId: unit.subjectId,
        semester: unit.semester,
        unitNumber: unit.unitNumber,
        titleAr: unit.titleAr,
        officialLessonCount: totalOfficial,
        implementedCount,
        missingCount,
        verificationStatus: unit.verificationStatus ?? 'VERIFIED',
        coveragePercent: totalOfficial > 0 ? Math.round((implementedCount / totalOfficial) * 100) : 0,
      };
    });

  const relevantSources = sources.filter((src) => {
    if (filters.subjectId && filters.subjectId !== 'all' && src.subjectId !== filters.subjectId) {
      return false;
    }
    if (filters.semester && filters.semester !== 'all' && src.semester !== filters.semester) {
      return false;
    }
    return true;
  });

  const sourcesVerifiedCount = relevantSources.filter(
    (s) => s.verificationStatus === 'VERIFIED'
  ).length;
  const sourcesNeedingVerificationCount = relevantSources.filter(
    (s) => s.verificationStatus !== 'VERIFIED'
  ).length;

  const activeUnits = units.filter((u) => {
    if (filters.subjectId && filters.subjectId !== 'all' && u.subjectId !== filters.subjectId) {
      return false;
    }
    if (filters.semester && filters.semester !== 'all' && u.semester !== filters.semester) {
      return false;
    }
    return true;
  });

  return {
    totalSubjects: subjectBreakdowns.length,
    verifiedSubjects: subjects.filter(
      (s) =>
        (!filters.subjectId || filters.subjectId === 'all' || s.id === filters.subjectId) &&
        (s.verificationStatus ?? 'VERIFIED') === 'VERIFIED'
    ).length,
    totalUnits: activeUnits.length,
    verifiedUnits: activeUnits.filter((u) => (u.verificationStatus ?? 'VERIFIED') === 'VERIFIED').length,
    totalOfficialCatalogLessons,
    implementedLessonsCount,
    verifiedLessonsCount,
    needsReviewLessonsCount,
    outdatedLessonsCount,
    missingLessonsCount,
    incompleteLessonsCount: incompleteLessons.length,
    sourcesTotalCount: relevantSources.length,
    sourcesVerifiedCount,
    sourcesNeedingVerificationCount,
    overallCoveragePercent,
    subjectBreakdowns,
    unitBreakdowns,
    filteredCatalog,
    missingCatalogItems,
    incompleteLessons,
    reviewQueueLessons,
    anomalies: detectCurriculumAnomalies(units, filteredLessons),
  };
}

export type CoverageQuestionRef = Pick<
  PublicQuestion,
  'id' | 'lessonId' | 'learningObjectiveId' | 'verificationStatus' | 'isPublished'
>;

export const PHASE4B_TARGETS = {
  minSections: 2,
  minExplanationChars: 450,
  minDetailedSummaryChars: 180,
  minQuickRevisionItems: 4,
  minKeyTerms: 3,
  minMemorizePoints: 4,
  minComparisons: 1,
  minSolvedExamples: 4,
  minExercises: 10,
  minQuestionBankApproved: 20,
  minLessonTestQuestions: 10,
} as const;

const ALL_EXAMPLE_DIFFICULTIES: ExampleDifficulty[] = ['basic', 'intermediate', 'advanced'];
const ALL_EXERCISE_TIERS: ExerciseTier[] = [
  'easy',
  'medium',
  'difficult',
  'application',
  'critical_thinking',
];

function isApprovedDeliverableQuestion(q: CoverageQuestionRef): boolean {
  return Boolean(q.isPublished) && (q.verificationStatus === 'APPROVED' || q.verificationStatus === undefined);
}

export function computeLessonDeepCoverage(
  lessons: Lesson[],
  objectives: LearningObjective[],
  questions: CoverageQuestionRef[]
): LessonDeepCoverageRow[] {
  return lessons.map((lesson) => {
    const sections = Array.isArray(lesson.sections) ? lesson.sections : [];
    const sectionsCount = sections.length;
    const explanationChars = sections.reduce(
      (sum, sec) => sum + (sec.contentAr ? sec.contentAr.trim().length : 0),
      0
    );

    const summary = lesson.comprehensiveSummary;
    const detailedSummaryChars = summary?.detailedSummaryAr?.trim().length ?? 0;
    const quickRevisionCount = summary?.quickRevisionAr?.length ?? 0;
    const keyTermsCount = summary?.keyTermsAr?.length ?? 0;
    const memorizePointsCount = summary?.memorizePointsAr?.length ?? 0;
    const comparisonsCount = summary?.comparisonsAr?.length ?? 0;

    const solvedExamples = Array.isArray(lesson.solvedExamples) ? lesson.solvedExamples : [];
    const exampleDifficultyCounts: Record<ExampleDifficulty, number> = {
      basic: 0,
      intermediate: 0,
      advanced: 0,
    };
    for (const ex of solvedExamples) {
      if (ex.difficulty && ex.difficulty in exampleDifficultyCounts) {
        exampleDifficultyCounts[ex.difficulty] += 1;
      }
    }

    const exercises = Array.isArray(lesson.exercises) ? lesson.exercises : [];
    const exerciseTierCounts: Record<ExerciseTier, number> = {
      easy: 0,
      medium: 0,
      difficult: 0,
      application: 0,
      critical_thinking: 0,
    };
    for (const item of exercises) {
      if (item.tier && item.tier in exerciseTierCounts) {
        exerciseTierCounts[item.tier] += 1;
      }
    }

    const lessonObjectives = objectives.filter(
      (obj) => obj.lessonId === lesson.id || (!obj.lessonId && obj.unitId === lesson.unitId)
    );
    const linkedObjectiveIds = new Set<string>();
    for (const sec of sections) {
      for (const objId of sec.learningObjectiveIds ?? []) {
        linkedObjectiveIds.add(objId);
      }
    }
    for (const ex of solvedExamples) {
      if (ex.learningObjectiveId) linkedObjectiveIds.add(ex.learningObjectiveId);
    }
    for (const q of exercises) {
      if (q.learningObjectiveId) linkedObjectiveIds.add(q.learningObjectiveId);
    }

    const validLinkedObjectives = lessonObjectives.filter((o) =>
      linkedObjectiveIds.has(o.id)
    ).length;
    const objectivesTarget = Math.max(1, lessonObjectives.length);
    const objectivesLinkedCount =
      lessonObjectives.length > 0 ? validLinkedObjectives : linkedObjectiveIds.size;

    const lessonQuestions = questions.filter((q) => q.lessonId === lesson.id);
    const approvedQuestionsCount = lessonQuestions.filter(isApprovedDeliverableQuestion).length;
    const totalQuestionsCount = lessonQuestions.length;

    const gaps: LessonContentGapKind[] = [];
    const gapMessagesAr: string[] = [];

    const hasDeepExplanation =
      sectionsCount >= PHASE4B_TARGETS.minSections &&
      explanationChars >= PHASE4B_TARGETS.minExplanationChars;
    if (!hasDeepExplanation) {
      gaps.push('short_explanation');
      gapMessagesAr.push(
        `الشرح يحتاج تعميقاً (${sectionsCount}/${PHASE4B_TARGETS.minSections} أقسام، ${explanationChars}/${PHASE4B_TARGETS.minExplanationChars} حرفاً)`
      );
    }

    const hasDeepSummary =
      detailedSummaryChars >= PHASE4B_TARGETS.minDetailedSummaryChars &&
      quickRevisionCount >= PHASE4B_TARGETS.minQuickRevisionItems &&
      keyTermsCount >= PHASE4B_TARGETS.minKeyTerms &&
      memorizePointsCount >= PHASE4B_TARGETS.minMemorizePoints &&
      comparisonsCount >= PHASE4B_TARGETS.minComparisons;
    if (!hasDeepSummary) {
      gaps.push('shallow_summary');
      gapMessagesAr.push('نظام الملخص الشامل غير مكتمل (الملخص المفصل/المراجعة السريعة/المصطلحات/المقارنات)');
    }

    const coversAllExampleDiffs = ALL_EXAMPLE_DIFFICULTIES.every(
      (d) => exampleDifficultyCounts[d] >= 1
    );
    const hasEnoughExamples =
      solvedExamples.length >= PHASE4B_TARGETS.minSolvedExamples && coversAllExampleDiffs;
    if (!hasEnoughExamples) {
      gaps.push('insufficient_examples');
      gapMessagesAr.push(
        `الأمثلة المحلولة (${solvedExamples.length}/${PHASE4B_TARGETS.minSolvedExamples}) أو مستويات الصعوبة الثلاثة غير مكتملة`
      );
    }

    const coversAllExerciseTiers = ALL_EXERCISE_TIERS.every((t) => exerciseTierCounts[t] >= 1);
    const hasEnoughExercises =
      exercises.length >= PHASE4B_TARGETS.minExercises && coversAllExerciseTiers;
    if (!hasEnoughExercises) {
      gaps.push('insufficient_exercises');
      gapMessagesAr.push(
        `التمارين المتدرجة (${exercises.length}/${PHASE4B_TARGETS.minExercises}) أو المستويات الخمسة غير مكتملة`
      );
    }

    const hasObjectivesLinked =
      lessonObjectives.length > 0 && validLinkedObjectives >= lessonObjectives.length;
    if (!hasObjectivesLinked) {
      gaps.push('missing_objectives');
      gapMessagesAr.push(
        `ربط الأهداف التعليمية (${objectivesLinkedCount}/${objectivesTarget})`
      );
    }

    const status = lesson.verificationStatus ?? 'NEEDS_REVIEW';
    if (status === 'OUTDATED') {
      gaps.push('outdated_content');
      gapMessagesAr.push('المحتوى موسوم كقديم (OUTDATED) ويحتاج مطابقة مع الطبعة المعتمدة');
    } else if (status === 'NEEDS_REVIEW' || status === 'UNAVAILABLE') {
      gaps.push('needs_source_verification');
      gapMessagesAr.push('الدرس بانتظار التحقق المصدري النهائي (NEEDS_REVIEW)');
    }

    if (approvedQuestionsCount < PHASE4B_TARGETS.minQuestionBankApproved) {
      gaps.push('insufficient_question_bank');
      gapMessagesAr.push(
        `بنك الأسئلة المعتمد (${approvedQuestionsCount}/${PHASE4B_TARGETS.minQuestionBankApproved}) قيد الاستكمال في المرحلة الفرعية 4C`
      );
    }

    // Partial credit weighted score for Subphase 4B lesson depth (0..100)
    const expScore =
      Math.min(1, sectionsCount / PHASE4B_TARGETS.minSections) * 12 +
      Math.min(1, explanationChars / PHASE4B_TARGETS.minExplanationChars) * 13;
    const sumScore =
      Math.min(1, detailedSummaryChars / PHASE4B_TARGETS.minDetailedSummaryChars) * 7 +
      Math.min(1, quickRevisionCount / PHASE4B_TARGETS.minQuickRevisionItems) * 5 +
      Math.min(1, keyTermsCount / PHASE4B_TARGETS.minKeyTerms) * 4 +
      (comparisonsCount >= 1 ? 4 : 0);
    const exScore =
      Math.min(1, solvedExamples.length / PHASE4B_TARGETS.minSolvedExamples) * 14 +
      (ALL_EXAMPLE_DIFFICULTIES.filter((d) => exampleDifficultyCounts[d] >= 1).length / 3) * 6;
    const qExScore =
      Math.min(1, exercises.length / PHASE4B_TARGETS.minExercises) * 15 +
      (ALL_EXERCISE_TIERS.filter((t) => exerciseTierCounts[t] >= 1).length / 5) * 10;
    const objScore = Math.min(1, objectivesLinkedCount / objectivesTarget) * 10;

    const contentCompletenessPercent = Math.min(
      100,
      Math.round(expScore + sumScore + exScore + qExScore + objScore)
    );

    const assessmentReadinessPercent = Math.min(
      100,
      Math.round((approvedQuestionsCount / PHASE4B_TARGETS.minQuestionBankApproved) * 100)
    );

    const isContentComplete4B =
      hasDeepExplanation &&
      hasDeepSummary &&
      hasEnoughExamples &&
      hasEnoughExercises &&
      hasObjectivesLinked;

    const isFullyAssessmentReady =
      isContentComplete4B &&
      approvedQuestionsCount >= PHASE4B_TARGETS.minQuestionBankApproved &&
      status === 'VERIFIED';

    return {
      lessonId: lesson.id,
      subjectId: lesson.subjectId,
      unitId: lesson.unitId,
      semester: lesson.semester,
      titleAr: lesson.titleAr,
      verificationStatus: status,
      sectionsCount,
      explanationChars,
      detailedSummaryChars,
      quickRevisionCount,
      keyTermsCount,
      solvedExamplesCount: solvedExamples.length,
      solvedExamplesTarget: PHASE4B_TARGETS.minSolvedExamples,
      exampleDifficultyCounts,
      exercisesCount: exercises.length,
      exercisesTarget: PHASE4B_TARGETS.minExercises,
      exerciseTierCounts,
      objectivesLinkedCount,
      objectivesTarget,
      approvedQuestionsCount,
      totalQuestionsCount,
      questionBankTarget: PHASE4B_TARGETS.minQuestionBankApproved,
      lessonTestTarget: PHASE4B_TARGETS.minLessonTestQuestions,
      contentCompletenessPercent,
      assessmentReadinessPercent,
      isContentComplete4B,
      isFullyAssessmentReady,
      gaps,
      gapMessagesAr,
    };
  });
}

export function computeComprehensiveCoverageMatrix(
  lessons: Lesson[],
  objectives: LearningObjective[],
  questions: CoverageQuestionRef[]
): ComprehensiveCoverageMatrixReport {
  const lessonRows = computeLessonDeepCoverage(lessons, objectives, questions);
  const lessonById = new Map(lessons.map((l) => [l.id, l]));

  const objectiveRows: LearningObjectiveCoverageRow[] = objectives.map((objective) => {
    const candidateLessons = objective.lessonId
      ? lessons.filter((l) => l.id === objective.lessonId)
      : lessons.filter((l) => l.unitId === objective.unitId);

    const primaryLesson =
      (objective.lessonId ? lessonById.get(objective.lessonId) : undefined) ??
      candidateLessons[0];

    const coveredInExplanation = candidateLessons.some((l) =>
      l.sections.some((s) => s.learningObjectiveIds?.includes(objective.id))
    );

    const coveredInSummary = Boolean(
      coveredInExplanation &&
        candidateLessons.some(
          (l) =>
            (l.comprehensiveSummary?.detailedSummaryAr?.trim().length ?? 0) >=
            PHASE4B_TARGETS.minDetailedSummaryChars
        )
    );

    const solvedExamplesCount = candidateLessons.reduce(
      (sum, l) =>
        sum + l.solvedExamples.filter((ex) => ex.learningObjectiveId === objective.id).length,
      0
    );

    const exercisesCount = candidateLessons.reduce(
      (sum, l) =>
        sum + l.exercises.filter((ex) => ex.learningObjectiveId === objective.id).length,
      0
    );

    const approvedQuestionsCount = questions.filter(
      (q) => q.learningObjectiveId === objective.id && isApprovedDeliverableQuestion(q)
    ).length;

    const hasAssessmentCoverage = approvedQuestionsCount >= 1;

    let coverageStageAr: LearningObjectiveCoverageRow['coverageStageAr'] = 'غير مربوط بمحتوى';
    if (
      coveredInExplanation &&
      coveredInSummary &&
      (solvedExamplesCount > 0 || exercisesCount > 0) &&
      hasAssessmentCoverage
    ) {
      coverageStageAr = 'مكتمل التغطية';
    } else if (
      coveredInExplanation &&
      coveredInSummary &&
      (solvedExamplesCount > 0 || exercisesCount > 0)
    ) {
      coverageStageAr = 'مغطى بالدرس والتمارين';
    } else if (
      coveredInExplanation ||
      solvedExamplesCount > 0 ||
      exercisesCount > 0 ||
      hasAssessmentCoverage
    ) {
      coverageStageAr = 'تغطية جزئية';
    }

    return {
      objective,
      lessonId: primaryLesson?.id,
      lessonTitleAr: primaryLesson?.titleAr,
      coveredInExplanation,
      coveredInSummary,
      solvedExamplesCount,
      exercisesCount,
      approvedQuestionsCount,
      hasAssessmentCoverage,
      coverageStageAr,
    };
  });

  const lessonsTotal = lessonRows.length;
  const objectivesTotal = objectiveRows.length;

  return {
    generatedAtIso: new Date().toISOString(),
    lessonsTotal,
    contentComplete4BCount: lessonRows.filter((r) => r.isContentComplete4B).length,
    fullyAssessmentReadyCount: lessonRows.filter((r) => r.isFullyAssessmentReady).length,
    lessonsMeetingExamplesTarget: lessonRows.filter(
      (r) => r.solvedExamplesCount >= r.solvedExamplesTarget
    ).length,
    lessonsMeetingExercisesTarget: lessonRows.filter(
      (r) => r.exercisesCount >= r.exercisesTarget
    ).length,
    lessonsMeetingQuestionBankTarget: lessonRows.filter(
      (r) => r.approvedQuestionsCount >= r.questionBankTarget
    ).length,
    objectivesTotal,
    objectivesCoveredInContentCount: objectiveRows.filter(
      (o) => o.coveredInExplanation && o.coveredInSummary && (o.solvedExamplesCount > 0 || o.exercisesCount > 0)
    ).length,
    objectivesCoveredInQuestionsCount: objectiveRows.filter((o) => o.hasAssessmentCoverage).length,
    avgContentCompletenessPercent:
      lessonsTotal > 0
        ? Math.round(
            lessonRows.reduce((acc, r) => acc + r.contentCompletenessPercent, 0) / lessonsTotal
          )
        : 0,
    avgAssessmentReadinessPercent:
      lessonsTotal > 0
        ? Math.round(
            lessonRows.reduce((acc, r) => acc + r.assessmentReadinessPercent, 0) / lessonsTotal
          )
        : 0,
    lessonRows,
    objectiveRows,
  };
}

