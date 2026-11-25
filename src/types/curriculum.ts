export type SubjectId = 'physics' | 'chemistry' | 'biology' | 'math';

export type Semester = 1 | 2;

// Phase 4 5-level Difficulty System (preserving Phase 1-3 slugs + adding basic_application for Level 2)
export type DifficultyLevel =
  | 'foundation'        // Level 1: Foundation (facts & basic understanding)
  | 'basic_application' // Level 2: Basic Application (direct application)
  | 'intermediate'      // Level 3: Intermediate (multi-step & connecting concepts)
  | 'advanced'          // Level 4: Advanced (deeper reasoning & unfamiliar applications)
  | 'olympiad';         // Level 5: Higher Order Thinking (complex synthesis & analysis)

export type DifficultyTier = 1 | 2 | 3 | 4 | 5;

// Phase 4 12 Question Types (preserving mcq, numeric, short_answer)
export type QuestionType =
  | 'mcq'
  | 'multi_select'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer'
  | 'numeric'
  | 'matching'
  | 'ordering'
  | 'scientific_explanation'
  | 'structured_long'
  | 'diagram_interpretation'
  | 'data_graph_analysis';

export type QuestionOrigin =
  | 'OFFICIAL_PAST_EXAM'
  | 'TEACHER_RESOURCE'
  | 'AI_GENERATED'
  | 'ADMIN_CREATED';

export type QuestionVerificationState =
  | 'PENDING_REVIEW'
  | 'NEEDS_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'NEEDS_CORRECTION'
  | 'OUTDATED';

export type LessonStatus = 'not_started' | 'in_progress' | 'completed';

export type VerificationStatus = 'VERIFIED' | 'NEEDS_REVIEW' | 'OUTDATED' | 'UNAVAILABLE';

export type ExerciseTier =
  | 'easy'
  | 'medium'
  | 'difficult'
  | 'application'
  | 'critical_thinking';

export type ExampleDifficulty = 'basic' | 'intermediate' | 'advanced';

export interface AcademicYearRecord {
  id: string;
  labelAr: string;
  trackAr: string;
  countryAr: string;
  isActive: boolean;
}

export interface SemesterRecord {
  id: string;
  academicYearId: string;
  semester: Semester;
  titleAr: string;
  isPublished: boolean;
}

export interface LearningObjective {
  id: string;
  subjectId: SubjectId;
  unitId: string;
  lessonId?: string;
  code: string;
  statementAr: string;
  bloomLevel: 'remember' | 'understand' | 'apply' | 'analyze';
  verificationStatus: VerificationStatus;
}

export interface CurriculumSource {
  id: string;
  titleAr: string;
  publisherAr: string;
  publicationYear: number;
  url: string;
  subjectId: SubjectId;
  semester: Semester;
  sourceType: 'moe_textbook' | 'moe_guide' | 'cambridge_spec' | 'portal_reference';
  verificationStatus: VerificationStatus;
  notesAr: string;
}

export interface VerificationRecord {
  id: string;
  entityType: 'subject' | 'unit' | 'lesson' | 'source';
  entityId: string;
  status: VerificationStatus;
  reviewerAr: string;
  reviewedAtIso: string;
  notesAr: string;
  sourceIds: string[];
}

export interface Subject {
  id: SubjectId;
  titleAr: string;
  titleEn: string;
  code: string;
  descriptionAr: string;
  accentColor: string;
  imageUrl: string;
  order: number;
  totalUnits: number;
  totalLessons: number;
  verificationStatus?: VerificationStatus;
  isPublished: boolean;
}

export interface Unit {
  id: string;
  subjectId: SubjectId;
  semester: Semester;
  unitNumber: number;
  titleAr: string;
  summaryAr: string;
  objectivesAr: string[];
  officialLessonCount?: number;
  sourceId?: string;
  verificationStatus?: VerificationStatus;
  isPublished: boolean;
}

export interface KeyFormula {
  labelAr: string;
  expression: string;
  variablesAr: string;
  unit: string;
}

export interface StructuredTable {
  id: string;
  titleAr: string;
  headersAr: string[];
  rowsAr: string[][];
  captionAr?: string;
}

export type LessonDiagramKind =
  | 'gravity_orbit'
  | 'electric_capacitor'
  | 'kirchhoff_loop'
  | 'wave_interference'
  | 'photoelectric'
  | 'nuclear_decay'
  | 'equilibrium_acid'
  | 'electrochemical_cell'
  | 'born_haber'
  | 'kinetics_arrhenius'
  | 'dna_replication'
  | 'action_potential'
  | 'calvin_cycle'
  | 'pcr_cycles'
  | 'unit_circle_radian'
  | 'derivative_tangent'
  | 'integral_area'
  | 'normal_curve'
  | 'custom_image';

export interface LessonDiagramSpec {
  id: string;
  titleAr: string;
  captionAr: string;
  svgKind: LessonDiagramKind;
  imageUrl?: string;
}

export interface LessonIntroduction {
  overviewAr: string;
  objectivesAr: string[];
  prerequisitesAr: string[];
  keyConceptsAr: string[];
}

export interface LessonTermDefinition {
  termAr: string;
  definitionAr: string;
}

export interface LessonSummaryComparison {
  topicAr: string;
  pointAAr: string;
  pointBAr: string;
}

export interface LessonComprehensiveSummary {
  detailedSummaryAr: string;
  quickRevisionAr: string[];
  keyTermsAr: LessonTermDefinition[];
  memorizePointsAr: string[];
  comparisonsAr?: LessonSummaryComparison[];
  importantLawsAr?: string[];
  examNotesAr?: string[];
}

export interface LessonReviewSection {
  keyTakeawaysAr: string[];
  commonMistakesAr: string[];
  revisionChecklistAr: string[];
}

export interface LessonSection {
  id: string;
  titleAr: string;
  contentAr: string;
  keyTakeawayAr: string;
  examTipAr?: string;
  learningObjectiveIds?: string[];
  definitionsAr?: LessonTermDefinition[];
  lawsAr?: string[];
  derivationsAr?: string[];
  practicalApplicationsAr?: string[];
  commonMisconceptionsAr?: string[];
  importantNotesAr?: string[];
  tables?: StructuredTable[];
  diagram?: LessonDiagramSpec;
}

export interface SolvedExample {
  id: string;
  titleAr: string;
  difficulty?: ExampleDifficulty;
  learningObjectiveId?: string;
  conceptOrLawAr?: string;
  problemAr: string;
  givenAr: string[];
  stepsAr: string[];
  finalAnswerAr: string;
  whyMethodWorksAr?: string;
  commonMistakeAr?: string;
}

export interface PracticeExercise {
  id: string;
  tier?: ExerciseTier;
  learningObjectiveId?: string;
  promptAr: string;
  hintAr: string;
  answerAr: string;
  explanationAr?: string;
  marks?: number;
}

export interface Lesson {
  id: string;
  subjectId: SubjectId;
  unitId: string;
  semester: Semester;
  order: number;
  titleAr: string;
  estimatedMinutes: number;
  officialRef: string;
  academicYearId?: string;
  summaryAr: string;
  keyPointsAr: string[];
  keyFormulas: KeyFormula[];
  introduction?: LessonIntroduction;
  sections: LessonSection[];
  comprehensiveSummary?: LessonComprehensiveSummary;
  solvedExamples: SolvedExample[];
  exercises: PracticeExercise[];
  review?: LessonReviewSection;
  sourceIds?: string[];
  verificationStatus?: VerificationStatus;
  aiGenerated?: boolean;
  classificationNoteAr?: string;
  isPublished: boolean;
}

export interface OfficialLessonCatalogItem {
  id: string;
  subjectId: SubjectId;
  unitId: string;
  semester: Semester;
  order: number;
  titleAr: string;
  linkedLessonId?: string;
  sourceId: string;
  verificationStatus: VerificationStatus;
  classificationNoteAr?: string;
}

export interface MatchingPair {
  leftAr: string;
  rightAr: string;
}

export interface ScientificValidationReport {
  isValid: boolean;
  checkedAtIso: string;
  warningsAr: string[];
  errorsAr: string[];
  deterministicChecks: string[];
}

export interface AiGenerationMetadata {
  model: string;
  generatedAtIso: string;
  sourceContextAr: string;
  reviewerNotesAr?: string;
}

export interface Question {
  id: string;
  titleAr?: string;
  academicYearId?: string;
  gradeAr?: string;
  trackAr?: string;
  subjectId: SubjectId;
  unitId: string;
  lessonId: string;
  learningObjectiveId?: string;
  semester: Semester;
  difficulty: DifficultyLevel;
  difficultyLevel?: DifficultyTier;
  questionType: QuestionType;
  promptAr: string;
  optionsAr?: string[];
  correctAnswer: string;
  correctAnswers?: string[];
  matchingPairs?: MatchingPair[];
  orderingItemsAr?: string[];
  rubricAr?: string;
  numericTolerance?: number;
  requiredUnit?: string;
  diagramKind?: LessonDiagramKind;
  diagramCaptionAr?: string;
  dataTable?: StructuredTable;
  explanationAr: string;
  whyCorrectAr?: string;
  solutionStepsAr?: string[];
  commonMistakeAr?: string;
  conceptAr?: string;
  marks: number;
  estimatedSeconds?: number;
  origin?: QuestionOrigin;
  verificationStatus?: QuestionVerificationState;
  sourceId?: string;
  sourceRefAr?: string;
  aiMetadata?: AiGenerationMetadata;
  scientificValidation?: ScientificValidationReport;
  createdAtIso?: string;
  lastReviewedAtIso?: string;
  version?: number;
  isPublished: boolean;
}

/**
 * Student-safe public question projection.
 * Strictly excludes correctAnswer, correctAnswers, matchingPairs, orderingItemsAr,
 * explanationAr, whyCorrectAr, solutionStepsAr, commonMistakeAr, rubricAr,
 * numericTolerance, and aiMetadata before submission.
 */
export interface PublicQuestion {
  id: string;
  titleAr?: string;
  academicYearId?: string;
  gradeAr?: string;
  trackAr?: string;
  subjectId: SubjectId;
  unitId: string;
  lessonId: string;
  learningObjectiveId?: string;
  semester: Semester;
  difficulty: DifficultyLevel;
  difficultyLevel?: DifficultyTier;
  questionType: QuestionType;
  promptAr: string;
  optionsAr?: string[];
  matchingLeftsAr?: string[];
  matchingRightsShuffledAr?: string[];
  orderingItemsShuffledAr?: string[];
  requiredUnit?: string;
  diagramKind?: LessonDiagramKind;
  diagramCaptionAr?: string;
  dataTable?: StructuredTable;
  conceptAr?: string;
  marks: number;
  estimatedSeconds?: number;
  origin?: QuestionOrigin;
  verificationStatus?: QuestionVerificationState;
  sourceId?: string;
  sourceRefAr?: string;
  createdAtIso?: string;
  lastReviewedAtIso?: string;
  version?: number;
  isPublished: boolean;
}

/**
 * Private server-only answer key & grading metadata stored in /questionAnswerKeys/{questionId}.
 */
export interface QuestionAnswerKey {
  questionId: string;
  correctAnswer: string;
  correctAnswers?: string[];
  matchingPairs?: MatchingPair[];
  orderingItemsAr?: string[];
  rubricAr?: string;
  numericTolerance?: number;
  requiredUnit?: string;
  explanationAr: string;
  whyCorrectAr?: string;
  solutionStepsAr?: string[];
  commonMistakeAr?: string;
  conceptAr?: string;
  origin?: QuestionOrigin;
  sourceId?: string;
  sourceRefAr?: string;
  aiMetadata?: AiGenerationMetadata;
  scientificValidation?: ScientificValidationReport;
  updatedAtIso?: string;
}

export interface QuestionReviewRecord {
  id: string;
  questionId: string;
  previousStatus: QuestionVerificationState;
  newStatus: QuestionVerificationState;
  reviewerAr: string;
  notesAr: string;
  reviewedAtIso: string;
}

export interface QuestionVersionRecord {
  id: string;
  questionId: string;
  version: number;
  editorAr: string;
  changeSummaryAr: string;
  snapshotPromptAr: string;
  snapshotAnswer: string;
  editedAtIso: string;
}

export interface DuplicateMatch {
  questionAId: string;
  questionBId: string;
  similarityScore: number;
  reason: 'exact_duplicate' | 'near_identical' | 'same_answer_reworded';
  reasonAr: string;
}

export type ExamBlueprintType =
  | 'lesson_test'
  | 'unit_test'
  | 'semester_test'
  | 'comprehensive_subject'
  | 'mock_final'
  | 'custom_practice';

export interface ExaminationBlueprint {
  id: string;
  titleAr: string;
  examType: ExamBlueprintType;
  subjectId: SubjectId;
  semester?: Semester | 'all';
  unitIds: string[];
  lessonIds: string[];
  learningObjectiveIds?: string[];
  questionCount: number;
  totalMarks: number;
  durationMinutes: number;
  passingScorePercent: number;
  randomizeOrder: boolean;
  showExplanationsImmediately: boolean;
  difficultyDistribution: Partial<Record<DifficultyLevel, number>>;
  allowedQuestionTypes?: QuestionType[];
  isOfficialBlueprint: boolean;
  sourceId?: string;
  sourceNoteAr: string;
  isPublished: boolean;
  createdAtIso: string;
}

export interface StudentAnswerDetail {
  questionId: string;
  questionType: QuestionType;
  difficulty: DifficultyLevel;
  learningObjectiveId?: string;
  userAnswer: string;
  isCorrect: boolean;
  needsManualGrading: boolean;
  earnedMarks: number;
  maxMarks: number;
  timeSpentSeconds?: number;
  flaggedDifficult?: boolean;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  governorate: string;
  activeSemester: Semester;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LessonProgress {
  userId: string;
  lessonId: string;
  subjectId: SubjectId;
  status: LessonStatus;
  bookmarked: boolean;
  bestExamScore: number;
  notesAr: string;
  updatedAt?: unknown;
}

export interface ExamAttempt {
  id: string;
  userId: string;
  lessonId: string;
  subjectId: SubjectId;
  mode: 'lesson_exam' | 'question_bank' | ExamBlueprintType;
  blueprintId?: string;
  examTitleAr?: string;
  totalQuestions: number;
  correctCount: number;
  unansweredCount?: number;
  scorePercent: number;
  timeSpentSeconds?: number;
  passed?: boolean;
  answerDetails?: StudentAnswerDetail[];
  gradingSource?: 'server';
  createdAtIso: string;
}

export interface SavedQuestionRecord {
  questionId: string;
  userId: string;
  flaggedDifficult: boolean;
  savedForRevision: boolean;
  personalNoteAr?: string;
  updatedAtIso: string;
}

export interface RevisionRecommendation {
  id: string;
  subjectId: SubjectId;
  lessonId?: string;
  learningObjectiveId?: string;
  reasonAr: string;
  recommendedActionAr: string;
  recommendedDifficulty: DifficultyLevel;
  questionIds: string[];
  priority: 'high' | 'medium' | 'normal';
}

export interface LessonCoverageTarget {
  lessonId: string;
  minQuestionsTarget: number;
  updatedAtIso: string;
}

export interface QuestionFilter {
  subjectId?: SubjectId | 'all';
  unitId?: string | 'all';
  lessonId?: string | 'all';
  learningObjectiveId?: string | 'all';
  semester?: Semester | 'all';
  difficulty?: DifficultyLevel | 'all';
  questionType?: QuestionType | 'all';
  origin?: QuestionOrigin | 'all';
  verificationStatus?: QuestionVerificationState | 'all';
  searchQuery?: string;
  includeUnapproved?: boolean;
  onlySavedIds?: string[];
  onlyIncorrectIds?: string[];
}

export interface GradedQuestionResult {
  questionId: string;
  questionType: QuestionType;
  difficulty: DifficultyLevel;
  learningObjectiveId?: string;
  isCorrect: boolean;
  needsManualGrading?: boolean;
  userAnswer: string;
  correctAnswer: string;
  earnedMarks: number;
  maxMarks: number;
  explanationAr: string;
  whyCorrectAr?: string;
  solutionStepsAr?: string[];
  commonMistakeAr?: string;
  conceptAr?: string;
  rubricAr?: string;
  sourceRefAr?: string;
}

export interface BreakdownStat {
  key: string;
  labelAr: string;
  total: number;
  correct: number;
  earnedMarks: number;
  maxMarks: number;
  accuracyPercent: number;
}

export interface AssessmentResult {
  totalQuestions: number;
  correctCount: number;
  incorrectCount?: number;
  unansweredCount?: number;
  manualPendingCount?: number;
  earnedMarks: number;
  totalMarks: number;
  scorePercent: number;
  timeSpentSeconds?: number;
  passed?: boolean;
  difficultyBreakdown?: BreakdownStat[];
  objectiveBreakdown?: BreakdownStat[];
  strongTopicsAr?: string[];
  weakTopicsAr?: string[];
  breakdown: GradedQuestionResult[];
}

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode?: 'explain' | 'solve' | 'general';
}

export interface GeneratedPracticeQuestion {
  promptAr: string;
  questionType: QuestionType;
  difficulty: DifficultyLevel;
  difficultyLevel?: DifficultyTier;
  optionsAr?: string[];
  matchingPairs?: MatchingPair[];
  orderingItemsAr?: string[];
  correctAnswer: string;
  correctAnswers?: string[];
  solutionStepsAr?: string[];
  explanationAr: string;
  conceptAr?: string;
  rubricAr?: string;
  marks?: number;
  estimatedSeconds?: number;
  learningObjectiveCode?: string;
  sourceContextAr?: string;
}

export type AdminAssistType =
  | 'explanation'
  | 'summary'
  | 'examples'
  | 'exercises'
  | 'objectives'
  | 'gap_analysis';

export interface AdminAssistDraft {
  assistType: AdminAssistType;
  aiGenerated: true;
  verificationStatus: 'NEEDS_REVIEW';
  generatedAtIso: string;
  titleAr: string;
  contentAr: string;
  itemsAr: string[];
  keyTakeawayAr?: string;
  stepsAr?: string[];
  answerAr?: string;
}

export interface PracticeStartResponse {
  sessionId: string;
  questions: PublicQuestion[];
  totalAvailable: number;
}

export interface PracticeAnswerResponse {
  questionId: string;
  isCorrect: boolean;
  needsManualGrading: boolean;
  earnedMarks: number;
  maxMarks: number;
  correctAnswer: string;
  explanationAr: string;
  whyCorrectAr?: string;
  solutionStepsAr?: string[];
  commonMistakeAr?: string;
  rubricAr?: string;
  persistedToFirestore: boolean;
}

export interface ExamStartResponse {
  sessionId: string;
  mode: ExamBlueprintType | 'lesson_exam' | 'question_bank';
  titleAr: string;
  startedAtMs: number;
  durationSeconds: number;
  passingScorePercent: number;
  questions: PublicQuestion[];
}

export interface ExamSubmitResponse {
  sessionId: string;
  attempt: ExamAttempt;
  result: AssessmentResult;
  persistedToFirestore: boolean;
  persistenceNoticeAr?: string;
}

export interface QuestionAuditSummary {
  totalQuestions: number;
  approvedCount: number;
  needsReviewCount: number;
  pendingReviewCount: number;
  needsCorrectionCount: number;
  rejectedCount: number;
  outdatedCount: number;
  duplicatePairsCount: number;
  missingSourceCount: number;
}

export interface QuestionLinkIssue {
  questionId: string;
  issue:
    | 'missing_lesson'
    | 'missing_unit'
    | 'subject_mismatch'
    | 'unit_mismatch'
    | 'semester_mismatch';
  detailAr: string;
}

export interface QuestionObjectiveIssue {
  questionId: string;
  issue: 'missing_objective' | 'unknown_objective' | 'objective_scope_mismatch';
  learningObjectiveId?: string;
}

export interface QuestionTypePayloadIssue {
  questionId: string;
  questionType: QuestionType;
  issueAr: string;
}

export interface QuestionSourceIssue {
  questionId: string;
  issue:
    | 'missing_source_id'
    | 'unknown_source_id'
    | 'official_without_verified_source'
    | 'teacher_without_attribution'
    | 'ai_approved_without_review_timestamp';
  origin?: QuestionOrigin;
  verificationStatus?: QuestionVerificationState;
  sourceId?: string;
}

export interface QuestionBankAuditReport {
  generatedAtIso: string;
  counts: {
    legacy: number;
    extended: number;
    total: number;
    approvedDeliverable: number;
    needsReview: number;
    pendingReview: number;
    needsCorrection: number;
    rejected: number;
    outdated: number;
  };
  uniqueIdCheckPassed: boolean;
  duplicateIds: string[];
  duplicateMatches: DuplicateMatch[];
  lessonLinkIssues: QuestionLinkIssue[];
  objectiveIssues: QuestionObjectiveIssue[];
  typePayloadIssues: QuestionTypePayloadIssue[];
  sourceVerificationIssues: QuestionSourceIssue[];
  scientificIssues: {
    questionId: string;
    errorsAr: string[];
    warningsAr: string[];
  }[];
  coverageBySubject: Record<SubjectId, { total: number; approved: number }>;
  coverageByDifficulty: Record<DifficultyLevel, { total: number; approved: number }>;
  coverageByType: Record<QuestionType, { total: number; approved: number }>;
  lessonsWithZeroApproved: string[];
  publicLeakCheckPassed: boolean;
  publicPrivateParityPassed: boolean;
  publicClientSyncPassed?: boolean;
}

export interface MigrationReport {
  dryRun: boolean;
  generatedAtIso: string;
  totalScanned: number;
  legacyCount: number;
  extendedCount: number;
  publicDocsPrepared: number;
  privateAnswerKeyDocsPrepared: number;
  statusBreakdown: Record<QuestionVerificationState, number>;
  uniqueIdCheckPassed: boolean;
  lessonLinkIssuesCount: number;
  objectiveMissingCount: number;
  objectiveInvalidCount: number;
  typePayloadIssuesCount: number;
  sourceIssuesCount: number;
  scientificErrorsCount: number;
  lessonsWithZeroApproved: string[];
  publicLeakCheckPassed: boolean;
  parityCheckPassed: boolean;
  incompleteOrMissingSourceIds: string[];
  duplicateMatches: DuplicateMatch[];
  warningsAr: string[];
}

export type LessonContentGapKind =
  | 'short_explanation'
  | 'insufficient_examples'
  | 'insufficient_exercises'
  | 'shallow_summary'
  | 'missing_objectives'
  | 'insufficient_question_bank'
  | 'needs_source_verification'
  | 'outdated_content';

export interface LessonDeepCoverageRow {
  lessonId: string;
  subjectId: SubjectId;
  unitId: string;
  semester: Semester;
  titleAr: string;
  verificationStatus: VerificationStatus;
  sectionsCount: number;
  explanationChars: number;
  detailedSummaryChars: number;
  quickRevisionCount: number;
  keyTermsCount: number;
  solvedExamplesCount: number;
  solvedExamplesTarget: number;
  exampleDifficultyCounts: Record<ExampleDifficulty, number>;
  exercisesCount: number;
  exercisesTarget: number;
  exerciseTierCounts: Record<ExerciseTier, number>;
  objectivesLinkedCount: number;
  objectivesTarget: number;
  approvedQuestionsCount: number;
  totalQuestionsCount: number;
  questionBankTarget: number;
  lessonTestTarget: number;
  contentCompletenessPercent: number;
  assessmentReadinessPercent: number;
  isContentComplete4B: boolean;
  isFullyAssessmentReady: boolean;
  gaps: LessonContentGapKind[];
  gapMessagesAr: string[];
}

export interface LearningObjectiveCoverageRow {
  objective: LearningObjective;
  lessonId?: string;
  lessonTitleAr?: string;
  coveredInExplanation: boolean;
  coveredInSummary: boolean;
  solvedExamplesCount: number;
  exercisesCount: number;
  approvedQuestionsCount: number;
  hasAssessmentCoverage: boolean;
  coverageStageAr: 'مكتمل التغطية' | 'مغطى بالدرس والتمارين' | 'تغطية جزئية' | 'غير مربوط بمحتوى';
}

export interface ComprehensiveCoverageMatrixReport {
  generatedAtIso: string;
  lessonsTotal: number;
  contentComplete4BCount: number;
  fullyAssessmentReadyCount: number;
  lessonsMeetingExamplesTarget: number;
  lessonsMeetingExercisesTarget: number;
  lessonsMeetingQuestionBankTarget: number;
  objectivesTotal: number;
  objectivesCoveredInContentCount: number;
  objectivesCoveredInQuestionsCount: number;
  avgContentCompletenessPercent: number;
  avgAssessmentReadinessPercent: number;
  lessonRows: LessonDeepCoverageRow[];
  objectiveRows: LearningObjectiveCoverageRow[];
}



