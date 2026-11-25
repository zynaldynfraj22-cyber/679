import { SubjectId, Semester, DifficultyLevel, QuestionType } from './curriculum';

export type ExamRoleType =
  | 'OFFICIAL_FORMAT_SIMULATION'
  | 'CUSTOM_PRACTICE_EXAMINATION'
  | 'SEMESTER_1_MOCK'
  | 'SEMESTER_2_MOCK'
  | 'COMPREHENSIVE_SUBJECT'
  | 'PREVIOUS_MINISTRY_PAPER'
  | 'TARGETED_PRACTICE';

export interface OfficialExaminationSourceRef {
  id: string;
  titleAr: string;
  publisherAr: string;
  url: string;
  publicationYear: number;
  documentCode: string;
  version: string;
  verifiedAtIso: string;
}

export interface AssessmentObjectiveDistribution {
  ao1Marks: number; // Knowledge and understanding
  ao2Marks: number; // Application and reasoning
  ao3Marks?: number; // Practical/Inquiry (if applicable)
}

export interface DemandLevelDistribution {
  lowDemandMarks: number; // 40%
  mediumDemandMarks: number; // 40%
  highDemandMarks: number; // 20%
}

export interface UnitWeightDistribution {
  unitId: string;
  unitNumber: number;
  titleAr: string;
  weightPercent: number;
  allocatedMarks: number;
}

export interface ExamBlueprint {
  id: string;
  subjectId: SubjectId;
  semester: Semester | 'all';
  gradeAr: string;
  academicYear: string;
  titleAr: string;
  examRole: ExamRoleType;
  totalMarks: number;
  durationMinutes: number;
  questionCountRange: { min: number; max: number };
  mcqCount: number;
  shortResponseCount: number;
  extendedResponseCount: number;
  assessmentObjectives: AssessmentObjectiveDistribution;
  demandDistribution: DemandLevelDistribution;
  unitWeights: UnitWeightDistribution[];
  calculatorPolicyAr: string;
  permittedReferencesAr: string[];
  officialSourceId: string;
  isPublished: boolean;
  version: string;
  createdAtIso: string;
}

export interface MockExamPaperVersion {
  id: string;
  blueprintId: string;
  versionLabel: string; // 'Version A', 'Version B'
  titleAr: string;
  subjectId: SubjectId;
  semester: Semester | 'all';
  totalMarks: number;
  durationMinutes: number;
  questionIds: string[];
  markingSchemeId: string;
  createdAtIso: string;
  isPublished: boolean;
}

export interface StepMarkRubric {
  stepNumber: number;
  descriptionAr: string;
  marks: number;
  acceptedAnswersAr: string[];
  commonMistakeAr?: string;
}

export interface QuestionMarkingScheme {
  questionId: string;
  expectedAnswerAr: string;
  stepMarks: StepMarkRubric[];
  totalMarks: number;
  numericalTolerance?: number;
  requiredUnit?: string;
  explanationAr: string;
}

export interface ExamMarkingScheme {
  id: string;
  mockPaperId: string;
  questionSchemes: QuestionMarkingScheme[];
  createdAtIso: string;
}

export interface StudentExamAttemptRecord {
  id: string;
  userId: string;
  mockPaperId: string;
  blueprintId: string;
  subjectId: SubjectId;
  startedAtIso: string;
  submittedAtIso?: string;
  durationSpentSeconds: number;
  totalMarksObtained: number;
  maxMarks: number;
  percentage: number;
  isCompleted: boolean;
  answersMap: Record<string, string>; // questionId -> userAnswer
  scoreByUnit: Record<string, { earned: number; max: number }>;
  scoreByObjective: Record<string, { earned: number; max: number }>;
  scoreByDemand: Record<string, { earned: number; max: number }>;
  timeManagementNotesAr?: string;
}

export interface OfficialPastPaper {
  id: string;
  subjectId: SubjectId;
  academicYear: string;
  semester: Semester;
  sessionAr: string; // الدور الأول / الدور الثاني
  examPaperUrl: string;
  answerKeyUrl: string;
  officialSourceId: string;
  verificationStatus: 'VERIFIED' | 'NEEDS_REVIEW';
}
