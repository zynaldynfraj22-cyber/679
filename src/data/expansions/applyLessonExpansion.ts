import type {
  Lesson,
  LessonComprehensiveSummary,
  LessonSection,
  LessonTermDefinition,
  PracticeExercise,
  SolvedExample,
} from '../../types/curriculum';

export interface SectionEnrichment {
  learningObjectiveIds?: string[];
  definitionsAr?: LessonTermDefinition[];
  lawsAr?: string[];
  derivationsAr?: string[];
  practicalApplicationsAr?: string[];
  commonMisconceptionsAr?: string[];
  importantNotesAr?: string[];
}

export interface LessonExpansionSpec {
  extraIntroObjectivesAr?: string[];
  extraIntroPrerequisitesAr?: string[];
  extraIntroConceptsAr?: string[];
  sectionEnrichments?: Record<string, SectionEnrichment>;
  extraSections: LessonSection[];
  comprehensiveSummary: LessonComprehensiveSummary;
  existingExampleEnrichments?: Record<
    string,
    Pick<
      SolvedExample,
      'learningObjectiveId' | 'conceptOrLawAr' | 'whyMethodWorksAr' | 'commonMistakeAr'
    >
  >;
  extraExamples: SolvedExample[];
  existingExerciseEnrichments?: Record<
    string,
    Pick<PracticeExercise, 'learningObjectiveId' | 'explanationAr' | 'marks'>
  >;
  extraExercises: PracticeExercise[];
  extraKeyTakeawaysAr?: string[];
  extraCommonMistakesAr?: string[];
  extraRevisionChecklistAr?: string[];
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function dedupeTerms(items: LessonTermDefinition[]): LessonTermDefinition[] {
  const seen = new Set<string>();
  const out: LessonTermDefinition[] = [];
  for (const item of items) {
    const key = item.termAr.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function applyLessonExpansion(lesson: Lesson, spec: LessonExpansionSpec): Lesson {
  const enrichedIntro = lesson.introduction
    ? {
        ...lesson.introduction,
        objectivesAr: dedupeStrings([
          ...lesson.introduction.objectivesAr,
          ...(spec.extraIntroObjectivesAr ?? []),
        ]),
        prerequisitesAr: dedupeStrings([
          ...lesson.introduction.prerequisitesAr,
          ...(spec.extraIntroPrerequisitesAr ?? []),
        ]),
        keyConceptsAr: dedupeStrings([
          ...lesson.introduction.keyConceptsAr,
          ...(spec.extraIntroConceptsAr ?? []),
        ]),
      }
    : undefined;

  const existingSectionIds = new Set(lesson.sections.map((s) => s.id));
  const mergedExistingSections = lesson.sections.map((sec) => {
    const enrich = spec.sectionEnrichments?.[sec.id];
    if (!enrich) return sec;
    return {
      ...sec,
      learningObjectiveIds: dedupeStrings([
        ...(sec.learningObjectiveIds ?? []),
        ...(enrich.learningObjectiveIds ?? []),
      ]),
      definitionsAr: dedupeTerms([
        ...(sec.definitionsAr ?? []),
        ...(enrich.definitionsAr ?? []),
      ]),
      lawsAr: dedupeStrings([...(sec.lawsAr ?? []), ...(enrich.lawsAr ?? [])]),
      derivationsAr: dedupeStrings([
        ...(sec.derivationsAr ?? []),
        ...(enrich.derivationsAr ?? []),
      ]),
      practicalApplicationsAr: dedupeStrings([
        ...(sec.practicalApplicationsAr ?? []),
        ...(enrich.practicalApplicationsAr ?? []),
      ]),
      commonMisconceptionsAr: dedupeStrings([
        ...(sec.commonMisconceptionsAr ?? []),
        ...(enrich.commonMisconceptionsAr ?? []),
      ]),
      importantNotesAr: dedupeStrings([
        ...(sec.importantNotesAr ?? []),
        ...(enrich.importantNotesAr ?? []),
      ]),
    };
  });

  const appendedSections = spec.extraSections.filter(
    (s) => !existingSectionIds.has(s.id)
  );

  const mergedSummary: LessonComprehensiveSummary = {
    detailedSummaryAr: spec.comprehensiveSummary.detailedSummaryAr,
    quickRevisionAr: dedupeStrings([
      ...(lesson.comprehensiveSummary?.quickRevisionAr ?? []),
      ...spec.comprehensiveSummary.quickRevisionAr,
    ]),
    keyTermsAr: dedupeTerms([
      ...(lesson.comprehensiveSummary?.keyTermsAr ?? []),
      ...spec.comprehensiveSummary.keyTermsAr,
    ]),
    memorizePointsAr: dedupeStrings([
      ...(lesson.comprehensiveSummary?.memorizePointsAr ?? []),
      ...spec.comprehensiveSummary.memorizePointsAr,
    ]),
    comparisonsAr: spec.comprehensiveSummary.comparisonsAr,
    importantLawsAr: spec.comprehensiveSummary.importantLawsAr,
    examNotesAr: spec.comprehensiveSummary.examNotesAr,
  };

  const existingExIds = new Set(lesson.solvedExamples.map((e) => e.id));
  const mergedExistingExamples = lesson.solvedExamples.map((ex) => {
    const enrich = spec.existingExampleEnrichments?.[ex.id];
    return enrich ? { ...ex, ...enrich } : ex;
  });
  const appendedExamples = spec.extraExamples.filter((e) => !existingExIds.has(e.id));

  const existingQIds = new Set(lesson.exercises.map((q) => q.id));
  const mergedExistingExercises = lesson.exercises.map((ex) => {
    const enrich = spec.existingExerciseEnrichments?.[ex.id];
    return enrich ? { ...ex, ...enrich } : ex;
  });
  const appendedExercises = spec.extraExercises.filter((q) => !existingQIds.has(q.id));

  const mergedReview = lesson.review
    ? {
        keyTakeawaysAr: dedupeStrings([
          ...lesson.review.keyTakeawaysAr,
          ...(spec.extraKeyTakeawaysAr ?? []),
        ]),
        commonMistakesAr: dedupeStrings([
          ...lesson.review.commonMistakesAr,
          ...(spec.extraCommonMistakesAr ?? []),
        ]),
        revisionChecklistAr: dedupeStrings([
          ...lesson.review.revisionChecklistAr,
          ...(spec.extraRevisionChecklistAr ?? []),
        ]),
      }
    : undefined;

  return {
    ...lesson,
    introduction: enrichedIntro,
    sections: [...mergedExistingSections, ...appendedSections],
    comprehensiveSummary: mergedSummary,
    solvedExamples: [...mergedExistingExamples, ...appendedExamples],
    exercises: [...mergedExistingExercises, ...appendedExercises],
    review: mergedReview,
  };
}

export function applyLessonExpansions(
  lessons: Lesson[],
  expansions: Record<string, LessonExpansionSpec>
): Lesson[] {
  return lessons.map((lesson) => {
    const spec = expansions[lesson.id];
    return spec ? applyLessonExpansion(lesson, spec) : lesson;
  });
}
