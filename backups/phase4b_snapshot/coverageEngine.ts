import type {
  CurriculumSource,
  Lesson,
  OfficialLessonCatalogItem,
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
