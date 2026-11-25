import React from 'react';
import {
  AlertTriangle,
  BookPlus,
  CheckCircle2,
  Database,
  FileSearch,
  Filter,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Table2,
  Trash2,
  XCircle,
} from 'lucide-react';
import type {
  AdminAssistDraft,
  AdminAssistType,
  CurriculumSource,
  DifficultyLevel,
  DuplicateMatch,
  ExampleDifficulty,
  ExerciseTier,
  LearningObjective,
  Lesson,
  LessonDiagramKind,
  MigrationReport,
  OfficialLessonCatalogItem,
  Question,
  QuestionAuditSummary,
  QuestionFilter,
  QuestionOrigin,
  QuestionReviewRecord,
  QuestionType,
  QuestionVerificationState,
  Semester,
  Subject,
  SubjectId,
  Unit,
  VerificationRecord,
  VerificationStatus,
} from '../types/curriculum';
import { normalizeLessonStandard } from '../utils/curriculumEngine';
import {
  DIFFICULTY_LABELS_AR,
  ORIGIN_LABELS_AR,
  QUESTION_TYPE_LABELS_AR,
  VERIFICATION_STATE_LABELS_AR,
  validateQuestionScientifically,
} from '../utils/questionEngine';
import {
  fetchAdminQuestionsApi,
  generateAdminQuestionsApi,
  requestAdminAssistApi,
  reviewAdminQuestionApi,
  runDryRunMigrationApi,
  upsertAdminQuestionApi,
} from '../services/firestoreService';

interface AdminCmsViewProps {
  subjects: Subject[];
  units: Unit[];
  lessons: Lesson[];
  sources: CurriculumSource[];
  objectives: LearningObjective[];
  verificationRecords: VerificationRecord[];
  isAdminUser: boolean;
  initialLessonId?: string;
  initialCatalogDraft?: OfficialLessonCatalogItem | null;
  onSaveLesson: (lesson: Lesson) => Promise<void>;
  onSaveUnit: (unit: Unit) => Promise<void>;
  onSaveSource: (source: CurriculumSource) => Promise<void>;
  onSaveObjective: (obj: LearningObjective) => Promise<void>;
  onRecordVerification: (
    entityType: 'lesson' | 'source',
    entityId: string,
    status: VerificationStatus,
    notesAr: string
  ) => Promise<void>;
  onSeedFirestore: () => Promise<void>;
  onQuestionBankUpdated?: () => Promise<void>;
  seedingStatus: string | null;
}

type CmsSubTab = 'editor' | 'questions' | 'structure' | 'sources';

const DIFFICULTY_OPTIONS: DifficultyLevel[] = [
  'foundation',
  'basic_application',
  'intermediate',
  'advanced',
  'olympiad',
];

const QUESTION_TYPE_OPTIONS: QuestionType[] = [
  'mcq',
  'multi_select',
  'true_false',
  'fill_blank',
  'short_answer',
  'numeric',
  'matching',
  'ordering',
  'scientific_explanation',
  'structured_long',
  'diagram_interpretation',
  'data_graph_analysis',
];

const ORIGIN_OPTIONS: QuestionOrigin[] = [
  'OFFICIAL_PAST_EXAM',
  'TEACHER_RESOURCE',
  'ADMIN_CREATED',
  'AI_GENERATED',
];

const VERIFICATION_OPTIONS: QuestionVerificationState[] = [
  'NEEDS_REVIEW',
  'PENDING_REVIEW',
  'NEEDS_CORRECTION',
  'APPROVED',
  'REJECTED',
  'OUTDATED',
];

const MATH_HELPERS = ['²', '³', '√()', '×10⁻', '→', '⇌', 'Δ', 'θ', 'π', 'λ', '∫', 'μ'];

const DIAGRAM_OPTIONS: { value: LessonDiagramKind; labelAr: string }[] = [
  { value: 'gravity_orbit', labelAr: 'مدار الجاذبية (فيزياء)' },
  { value: 'kirchhoff_loop', labelAr: 'حلقة كيرشوف (فيزياء)' },
  { value: 'electric_capacitor', labelAr: 'المكثف الكهربائي (فيزياء)' },
  { value: 'wave_interference', labelAr: 'تداخل الموجات والشق المزدوج' },
  { value: 'photoelectric', labelAr: 'التأثير الكهروضوئي' },
  { value: 'born_haber', labelAr: 'دورة بورن-هابر (كيمياء)' },
  { value: 'equilibrium_acid', labelAr: 'الاتزان الأيوني والأحماض' },
  { value: 'electrochemical_cell', labelAr: 'الخلية الجلفانية' },
  { value: 'dna_replication', labelAr: 'تضاعف DNA شبه المحافظ' },
  { value: 'action_potential', labelAr: 'جهد الفعل العصبي' },
  { value: 'calvin_cycle', labelAr: 'دورة كالفن (البناء الضوئي)' },
  { value: 'unit_circle_radian', labelAr: 'دائرة الوحدة والراديان' },
  { value: 'derivative_tangent', labelAr: 'المشتقة والمماس' },
  { value: 'integral_area', labelAr: 'التكامل والمساحة تحت المنحنى' },
  { value: 'normal_curve', labelAr: 'منحنى التوزيع الطبيعي' },
  { value: 'custom_image', labelAr: 'صورة تعليمية برابط خارجي' },
];

export function AdminCmsView({
  subjects,
  units,
  lessons,
  sources,
  objectives,
  verificationRecords,
  isAdminUser,
  initialLessonId,
  initialCatalogDraft,
  onSaveLesson,
  onSaveUnit,
  onSaveSource,
  onSaveObjective,
  onRecordVerification,
  onSeedFirestore,
  onQuestionBankUpdated,
  seedingStatus,
}: AdminCmsViewProps) {
  const [subTab, setSubTab] = React.useState<CmsSubTab>('editor');
  const [selectedLessonId, setSelectedLessonId] = React.useState<string>(
    initialLessonId ?? lessons[0]?.id ?? ''
  );
  const [draftLesson, setDraftLesson] = React.useState<Lesson>(() =>
    normalizeLessonStandard(
      lessons.find((l) => l.id === (initialLessonId ?? lessons[0]?.id)) ?? lessons[0]
    )
  );
  const [saveNotice, setSaveNotice] = React.useState<string | null>(null);

  // AI Admin Assist state
  const [assistLoading, setAssistLoading] = React.useState(false);
  const [assistError, setAssistError] = React.useState<string | null>(null);
  const [lastAiDraft, setLastAiDraft] = React.useState<AdminAssistDraft | null>(null);

  // Table row/column builder state for first section
  const [tableTitle, setTableTitle] = React.useState('جدول مقارنة علمي');
  const [tableHeadersText, setTableHeadersText] = React.useState('المفهوم | الصيغة / الوصف | الوحدة');
  const [tableRowsText, setTableRowsText] = React.useState(
    'الكمية الأساسية | العلاقة الرياضية | SI\nالكمية المشتقة | التطبيق العملي | SI'
  );

  // Unit & Objective creation state
  const [newUnitSubject, setNewUnitSubject] = React.useState<SubjectId>('physics');
  const [newUnitSemester, setNewUnitSemester] = React.useState<Semester>(1);
  const [newUnitTitle, setNewUnitTitle] = React.useState('');
  const [newUnitSummary, setNewUnitSummary] = React.useState('');
  const [newObjCode, setNewObjCode] = React.useState('OM12-NEW-1');
  const [newObjStatement, setNewObjStatement] = React.useState('');

  // Source registration state
  const [newSourceTitle, setNewSourceTitle] = React.useState('');
  const [newSourceUrl, setNewSourceUrl] = React.useState('https://ict.moe.gov.om/');
  const [newSourceSubject, setNewSourceSubject] = React.useState<SubjectId>('chemistry');
  const [newSourceSemester, setNewSourceSemester] = React.useState<Semester>(2);
  const [newSourceNotes, setNewSourceNotes] = React.useState('');

  // Question Governance Studio state
  const [qFilter, setQFilter] = React.useState<QuestionFilter>({
    subjectId: 'all',
    lessonId: 'all',
    difficulty: 'all',
    questionType: 'all',
    origin: 'all',
    verificationStatus: 'all',
    searchQuery: '',
  });
  const [adminQuestions, setAdminQuestions] = React.useState<Question[]>([]);
  const [auditSummary, setAuditSummary] = React.useState<QuestionAuditSummary | null>(null);
  const [duplicates, setDuplicates] = React.useState<DuplicateMatch[]>([]);
  const [questionReviews, setQuestionReviews] = React.useState<QuestionReviewRecord[]>([]);
  const [qLoading, setQLoading] = React.useState(false);
  const [qError, setQError] = React.useState<string | null>(null);
  const [qNotice, setQNotice] = React.useState<string | null>(null);
  const [reviewingId, setReviewingId] = React.useState<string | null>(null);

  // Question Upsert / Edit form state
  const [editingQuestionId, setEditingQuestionId] = React.useState<string>('');
  const [qFormSubject, setQFormSubject] = React.useState<SubjectId>('physics');
  const [qFormLessonId, setQFormLessonId] = React.useState<string>(lessons[0]?.id ?? '');
  const [qFormDifficulty, setQFormDifficulty] = React.useState<DifficultyLevel>('intermediate');
  const [qFormType, setQFormType] = React.useState<QuestionType>('mcq');
  const [qFormOrigin, setQFormOrigin] = React.useState<QuestionOrigin>('ADMIN_CREATED');
  const [qFormStatus, setQFormStatus] = React.useState<QuestionVerificationState>('APPROVED');
  const [qFormPublished, setQFormPublished] = React.useState(true);
  const [qFormSourceId, setQFormSourceId] = React.useState<string>(sources[0]?.id ?? '');
  const [qFormPrompt, setQFormPrompt] = React.useState('');
  const [qFormOptionsText, setQFormOptionsText] = React.useState('');
  const [qFormCorrectAnswer, setQFormCorrectAnswer] = React.useState('');
  const [qFormExplanation, setQFormExplanation] = React.useState('');
  const [qFormChangeSummary, setQFormChangeSummary] = React.useState('تحديث السؤال من لوحة المشرف');
  const [qSaving, setQSaving] = React.useState(false);

  // Admin AI Draft Question Generator + Dry-Run Migration state
  const [aiGenLessonId, setAiGenLessonId] = React.useState<string>(lessons[0]?.id ?? '');
  const [aiGenDiff, setAiGenDiff] = React.useState<DifficultyLevel>('intermediate');
  const [aiGenType, setAiGenType] = React.useState<QuestionType>('mcq');
  const [aiGenCount, setAiGenCount] = React.useState<number>(2);
  const [aiGenLoading, setAiGenLoading] = React.useState(false);
  const [aiGenDrafts, setAiGenDrafts] = React.useState<Question[]>([]);
  const [migrationLoading, setMigrationLoading] = React.useState(false);
  const [migrationReport, setMigrationReport] = React.useState<MigrationReport | null>(null);

  React.useEffect(() => {
    if (initialCatalogDraft) {
      setSubTab('editor');
      const generatedId = `cms-${initialCatalogDraft.id}`;
      const existing = lessons.find(
        (l) => l.id === initialCatalogDraft.linkedLessonId || l.id === generatedId
      );
      if (existing) {
        setSelectedLessonId(existing.id);
        setDraftLesson(normalizeLessonStandard(existing));
      } else {
        const freshLesson = normalizeLessonStandard({
          id: generatedId,
          subjectId: initialCatalogDraft.subjectId,
          unitId: initialCatalogDraft.unitId,
          semester: initialCatalogDraft.semester,
          order: initialCatalogDraft.order,
          titleAr: initialCatalogDraft.titleAr,
          estimatedMinutes: 30,
          officialRef: `منهج عُمان الرسمي (${initialCatalogDraft.titleAr})`,
          academicYearId: '2026-2027',
          summaryAr: `ملخص علمي مبدئي لدرس ${initialCatalogDraft.titleAr} وفق المنهج العُماني.`,
          keyPointsAr: ['النقطة المفاهيمية الأولى', 'النقطة التطبيقية الثانية'],
          keyFormulas: [],
          introduction: {
            overviewAr: `مقدمة تعريفية لدرس ${initialCatalogDraft.titleAr} في المسار العلمي.`,
            objectivesAr: [`فهم وتطبيق مفاهيم ${initialCatalogDraft.titleAr}.`],
            prerequisitesAr: ['مراجعة المفاهيم السابقة في الوحدة.'],
            keyConceptsAr: [initialCatalogDraft.titleAr],
          },
          sections: [
            {
              id: `${generatedId}-s1`,
              titleAr: 'الأساس النظري والتطبيق العلمي',
              contentAr: `اكتب هنا الشرح المفصل لدرس ${initialCatalogDraft.titleAr} مع التعريفات والقوانين.`,
              keyTakeawayAr: 'الخلاصة العلمية الرئيسية للقسم.',
              examTipAr: 'تحقق من الوحدات الدولية في أسئلة دبلوم التعليم العام.',
            },
          ],
          comprehensiveSummary: {
            detailedSummaryAr: `ملخص شامل لدرس ${initialCatalogDraft.titleAr}.`,
            quickRevisionAr: ['مراجعة التعريف الأساسي', 'مراجعة العلاقة الرياضية'],
            keyTermsAr: [],
            memorizePointsAr: ['العلاقة الأساسية والوحدة الدولية'],
          },
          solvedExamples: [
            {
              id: `${generatedId}-ex1`,
              titleAr: 'مثال تطبيقي أساسي',
              difficulty: 'basic',
              problemAr: 'نص المسألة النموذجية للدرس.',
              givenAr: ['المعطى الأول'],
              stepsAr: ['الخطوة الأولى: كتابة القانون والتعويض المباشر.'],
              finalAnswerAr: 'الناتج النهائي مع الوحدة.',
            },
          ],
          exercises: [
            {
              id: `${generatedId}-q1`,
              tier: 'easy',
              promptAr: 'تمرين تدريبي أول للتحقق من الفهم.',
              hintAr: 'استخدم القانون الأساسي للدرس.',
              answerAr: 'الإجابة النموذجية.',
            },
          ],
          review: {
            keyTakeawaysAr: [`إتقان المفهوم الأساسي في ${initialCatalogDraft.titleAr}.`],
            commonMistakesAr: ['إهمال تحويل الوحدات قبل الحساب.'],
            revisionChecklistAr: ['مراجعة الشرح وحل المثال والتمارين.'],
          },
          sourceIds: [initialCatalogDraft.sourceId],
          verificationStatus: 'NEEDS_REVIEW',
          isPublished: true,
        });
        setSelectedLessonId(freshLesson.id);
        setDraftLesson(freshLesson);
      }
      return;
    }

    if (initialLessonId) {
      const match = lessons.find((l) => l.id === initialLessonId);
      if (match) {
        setSelectedLessonId(match.id);
        setDraftLesson(normalizeLessonStandard(match));
        setSubTab('editor');
      }
    }
  }, [initialLessonId, initialCatalogDraft, lessons]);

  const handleSelectExistingLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    const found = lessons.find((l) => l.id === lessonId);
    if (found) {
      setDraftLesson(normalizeLessonStandard(found));
      setLastAiDraft(null);
      setAssistError(null);
    }
  };

  const insertMathSymbol = (symbol: string) => {
    setDraftLesson((prev) => {
      const firstSection = prev.sections[0];
      if (!firstSection) return prev;
      const updatedSections = prev.sections.map((sec, idx) =>
        idx === 0 ? { ...sec, contentAr: `${sec.contentAr} ${symbol}` } : sec
      );
      return { ...prev, sections: updatedSections };
    });
  };

  const handleAppendStructuredTable = () => {
    const headers = tableHeadersText
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    const rows = tableRowsText
      .split('\n')
      .map((line) =>
        line
          .split('|')
          .map((cell) => cell.trim())
          .filter(Boolean)
      )
      .filter((r) => r.length > 0);

    if (headers.length === 0 || rows.length === 0) return;

    setDraftLesson((prev) => {
      if (prev.sections.length === 0) return prev;
      const updatedSections = prev.sections.map((sec, idx) => {
        if (idx !== 0) return sec;
        return {
          ...sec,
          tables: [
            ...(sec.tables ?? []),
            {
              id: `tbl-${Date.now()}`,
              titleAr: tableTitle.trim() || 'جدول مقارنات',
              headersAr: headers,
              rowsAr: rows,
            },
          ],
        };
      });
      return { ...prev, sections: updatedSections };
    });
    setSaveNotice('تمت إضافة الجدول المنظم إلى القسم الأول من الدرس.');
  };

  const handleRequestAdminAssist = async (assistType: AdminAssistType) => {
    setAssistLoading(true);
    setAssistError(null);
    try {
      const subj = subjects.find((s) => s.id === draftLesson.subjectId);
      const unit = units.find((u) => u.id === draftLesson.unitId);
      const matchedSource = sources.find((s) => draftLesson.sourceIds?.includes(s.id));

      const payload = await requestAdminAssistApi({
        assistType,
        subjectTitle: subj?.titleAr ?? draftLesson.subjectId,
        unitTitle: unit?.titleAr ?? draftLesson.unitId,
        lessonTitle: draftLesson.titleAr,
        semester: draftLesson.semester,
        officialRef: draftLesson.officialRef,
        existingContext: draftLesson.summaryAr,
        sourceSummary: matchedSource?.notesAr ?? '',
      });

      setLastAiDraft(payload.draft);
    } catch (error) {
      setAssistError(
        error instanceof Error
          ? error.message
          : 'تعذر الاتصال بخدمة المساعد الإداري على الخادم.'
      );
    } finally {
      setAssistLoading(false);
    }
  };

  const loadAdminQuestions = React.useCallback(async () => {
    if (!isAdminUser) return;
    setQLoading(true);
    setQError(null);
    try {
      const data = await fetchAdminQuestionsApi(qFilter);
      setAdminQuestions(data.questions);
      setAuditSummary(data.auditSummary);
      setDuplicates(data.duplicates);
      setQuestionReviews(data.reviews);
    } catch (error) {
      setQError(
        error instanceof Error ? error.message : 'تعذر تحميل سجل الأسئلة الإداري.'
      );
    } finally {
      setQLoading(false);
    }
  }, [isAdminUser, qFilter]);

  React.useEffect(() => {
    if (subTab === 'questions' && isAdminUser) {
      void loadAdminQuestions();
    }
  }, [subTab, isAdminUser, loadAdminQuestions]);

  const handleReviewQuestion = async (
    questionId: string,
    status: QuestionVerificationState,
    notesAr: string
  ) => {
    setReviewingId(questionId);
    setQError(null);
    setQNotice(null);
    try {
      const res = await reviewAdminQuestionApi(questionId, { status, notesAr });
      setQNotice(
        `تم تحديث حالة السؤال (${questionId}) إلى ${VERIFICATION_STATE_LABELS_AR[status]}${
          res.persistedToFirestore ? ' وحفظه في Firestore.' : ' في ذاكرة الخادم.'
        }`
      );
      await loadAdminQuestions();
      if (onQuestionBankUpdated) {
        await onQuestionBankUpdated();
      }
    } catch (error) {
      setQError(error instanceof Error ? error.message : 'تعذر تسجيل قرار المراجعة.');
    } finally {
      setReviewingId(null);
    }
  };

  const handleLoadQuestionForEdit = (q: Question) => {
    setEditingQuestionId(q.id);
    setQFormSubject(q.subjectId);
    setQFormLessonId(q.lessonId);
    setQFormDifficulty(q.difficulty);
    setQFormType(q.questionType);
    setQFormOrigin(q.origin ?? 'ADMIN_CREATED');
    setQFormStatus(q.verificationStatus ?? 'NEEDS_REVIEW');
    setQFormPublished(Boolean(q.isPublished));
    setQFormSourceId(q.sourceId ?? sources[0]?.id ?? '');
    setQFormPrompt(q.promptAr);
    setQFormOptionsText((q.optionsAr ?? []).join('\n'));
    setQFormCorrectAnswer(q.correctAnswer);
    setQFormExplanation(q.explanationAr);
    setQFormChangeSummary('مراجعة وتحديث بيانات السؤال');
  };

  const handleResetQuestionForm = () => {
    setEditingQuestionId('');
    setQFormPrompt('');
    setQFormOptionsText('');
    setQFormCorrectAnswer('');
    setQFormExplanation('');
    setQFormChangeSummary('إضافة سؤال جديد إلى بنك الأسئلة');
  };

  const handleSaveQuestionForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qFormPrompt.trim() || !qFormCorrectAnswer.trim() || !qFormExplanation.trim()) return;
    const lessonObj = lessons.find((l) => l.id === qFormLessonId) ?? lessons[0];
    const parsedOpts = qFormOptionsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const questionId = editingQuestionId.trim() || `q-cms-${Date.now()}`;
    const payload: Question = {
      id: questionId,
      subjectId: lessonObj.subjectId,
      unitId: lessonObj.unitId,
      lessonId: lessonObj.id,
      semester: lessonObj.semester,
      difficulty: qFormDifficulty,
      questionType: qFormType,
      promptAr: qFormPrompt.trim(),
      optionsAr: parsedOpts.length > 0 ? parsedOpts : undefined,
      correctAnswer: qFormCorrectAnswer.trim(),
      explanationAr: qFormExplanation.trim(),
      marks: qFormType === 'structured_long' ? 4 : qFormType === 'numeric' ? 2 : 1,
      origin: qFormOrigin,
      verificationStatus: qFormStatus,
      sourceId: qFormSourceId.trim() || undefined,
      sourceRefAr:
        sources.find((s) => s.id === qFormSourceId)?.titleAr ?? lessonObj.officialRef,
      isPublished: qFormPublished,
    };

    setQSaving(true);
    setQError(null);
    setQNotice(null);
    try {
      const res = await upsertAdminQuestionApi({
        question: payload,
        changeSummaryAr: qFormChangeSummary.trim() || 'تحديث إداري للسؤال',
      });
      setQNotice(
        `تم حفظ السؤال (${res.question.id}) — إجمالي البنك: ${res.totalQuestions}، المعتمد للطلبة: ${res.publicCount}.`
      );
      handleResetQuestionForm();
      await loadAdminQuestions();
      if (onQuestionBankUpdated) {
        await onQuestionBankUpdated();
      }
    } catch (error) {
      setQError(error instanceof Error ? error.message : 'تعذر حفظ السؤال.');
    } finally {
      setQSaving(false);
    }
  };

  const handleGenerateAdminQuestions = async () => {
    const targetLesson = lessons.find((l) => l.id === aiGenLessonId) ?? lessons[0];
    const targetSubj = subjects.find((s) => s.id === targetLesson.subjectId);
    setAiGenLoading(true);
    setQError(null);
    try {
      const res = await generateAdminQuestionsApi({
        subjectId: targetLesson.subjectId,
        unitId: targetLesson.unitId,
        lessonId: targetLesson.id,
        semester: targetLesson.semester,
        lessonTitle: targetLesson.titleAr,
        subjectTitle: targetSubj?.titleAr ?? targetLesson.subjectId,
        difficulty: aiGenDiff,
        questionType: aiGenType,
        count: aiGenCount,
        lessonContext: targetLesson.summaryAr,
      });
      setAiGenDrafts(res.questions);
      setQNotice(`تم توليد ${res.questions.length} مسودة أسئلة بحالة PENDING_REVIEW بانتظار الاعتماد.`);
    } catch (error) {
      setQError(error instanceof Error ? error.message : 'تعذر توليد مسودات الأسئلة.');
    } finally {
      setAiGenLoading(false);
    }
  };

  const handleRunDryRunMigration = async () => {
    setMigrationLoading(true);
    setQError(null);
    try {
      const res = await runDryRunMigrationApi();
      setMigrationReport(res.report);
    } catch (error) {
      setQError(error instanceof Error ? error.message : 'تعذر تنفيذ فحص الترحيل الآمن.');
    } finally {
      setMigrationLoading(false);
    }
  };

  const handleApplyAiDraftToLesson = () => {
    if (!lastAiDraft) return;
    setDraftLesson((prev) => {
      const base: Lesson = {
        ...prev,
        aiGenerated: true,
        verificationStatus: 'NEEDS_REVIEW',
      };

      if (lastAiDraft.assistType === 'explanation') {
        return {
          ...base,
          sections: [
            ...base.sections,
            {
              id: `ai-sec-${Date.now()}`,
              titleAr: lastAiDraft.titleAr,
              contentAr: lastAiDraft.contentAr,
              keyTakeawayAr:
                lastAiDraft.keyTakeawayAr ??
                (lastAiDraft.itemsAr[0] || 'مسودة تحتاج مراجعة المشرف'),
            },
          ],
        };
      }

      if (lastAiDraft.assistType === 'summary') {
        return {
          ...base,
          summaryAr: lastAiDraft.contentAr,
          comprehensiveSummary: {
            detailedSummaryAr: lastAiDraft.contentAr,
            quickRevisionAr:
              lastAiDraft.itemsAr.length > 0
                ? lastAiDraft.itemsAr
                : (base.comprehensiveSummary?.quickRevisionAr ?? []),
            keyTermsAr: base.comprehensiveSummary?.keyTermsAr ?? [],
            memorizePointsAr: base.comprehensiveSummary?.memorizePointsAr ?? [],
          },
        };
      }

      if (lastAiDraft.assistType === 'objectives') {
        return {
          ...base,
          introduction: {
            overviewAr: base.introduction?.overviewAr ?? base.summaryAr,
            objectivesAr:
              lastAiDraft.itemsAr.length > 0
                ? lastAiDraft.itemsAr
                : (base.introduction?.objectivesAr ?? []),
            prerequisitesAr: base.introduction?.prerequisitesAr ?? [],
            keyConceptsAr: base.introduction?.keyConceptsAr ?? [],
          },
        };
      }

      if (lastAiDraft.assistType === 'examples') {
        return {
          ...base,
          solvedExamples: [
            ...base.solvedExamples,
            {
              id: `ai-ex-${Date.now()}`,
              titleAr: lastAiDraft.titleAr,
              difficulty: 'intermediate',
              problemAr: lastAiDraft.contentAr,
              givenAr: lastAiDraft.itemsAr,
              stepsAr: lastAiDraft.stepsAr ?? [lastAiDraft.contentAr],
              finalAnswerAr: lastAiDraft.answerAr ?? 'يُراجع الناتج من قِبل المشرف',
            },
          ],
        };
      }

      if (lastAiDraft.assistType === 'exercises') {
        return {
          ...base,
          exercises: [
            ...base.exercises,
            {
              id: `ai-q-${Date.now()}`,
              tier: 'application',
              promptAr: lastAiDraft.contentAr,
              hintAr: lastAiDraft.keyTakeawayAr ?? 'راجع قانون الدرس الأساسي.',
              answerAr: lastAiDraft.answerAr ?? 'تُراجع الإجابة النموذجية.',
            },
          ],
        };
      }

      return base;
    });
    setSaveNotice('تم إدراج مسودة الذكاء الاصطناعي وتصنيف الدرس تلقائياً كـ NEEDS_REVIEW.');
  };

  const handleSaveEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveLesson(draftLesson);
    setSaveNotice(
      isAdminUser
        ? 'تم حفظ الدرس ونشره في الجلسة وCloud Firestore بنجاح.'
        : 'تم حفظ التعديلات في الجلسة المحلية للمعاينة (سجّل كمشرف لحفظها في Firestore).'
    );
    setTimeout(() => setSaveNotice(null), 4000);
  };

  const subjectUnits = units.filter((u) => u.subjectId === draftLesson.subjectId);

  return (
    <div className="space-y-6">
      {/* Admin Access Notice + Firestore Sync */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-800 dark:text-sky-400">
            <ShieldCheck className="w-4 h-4" />
            <span>نظام إدارة المحتوى التعليمي المركزي (STUDY CORE CMS)</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {isAdminUser
              ? 'أنت مسجل كمشرف معتمد: جميع التعديلات والمصادر تُحفظ مباشرة في Cloud Firestore.'
              : 'وضع المعاينة الإدارية: يمكنك تجربة تحرير الدروس والجداول ومسودات الذكاء الاصطناعي محلياً، ويتطلب الحفظ الدائم في قاعدة البيانات تسجيل الدخول بحساب المشرف المعتمد.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {seedingStatus && (
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {seedingStatus}
            </span>
          )}
          <button
            type="button"
            disabled={!isAdminUser}
            onClick={() => void onSeedFirestore()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 disabled:opacity-50 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            <span>مزامنة المنهج الكامل إلى Firestore</span>
          </button>
        </div>
      </section>

      {/* Sub-tabs */}
      <div
        role="tablist"
        aria-label="أقسام نظام إدارة المحتوى"
        className="flex w-full sm:w-fit max-w-full items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto"
      >
        {[
          { id: 'editor' as const, label: 'محرر الدروس الستة والرسوم' },
          { id: 'questions' as const, label: 'إدارة ومراجعة بنك الأسئلة' },
          { id: 'structure' as const, label: 'إدارة الوحدات والأهداف التعليمية' },
          { id: 'sources' as const, label: 'سجل المصادر ومراجعة الاعتماد' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={subTab === tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === tab.id
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab 1: Rich 6-Part Lesson Editor */}
      {subTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={(e) => void handleSaveEditor(e)}
            className="lg:col-span-8 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800 min-w-0">
              <div className="flex-1 min-w-0">
                <label
                  htmlFor="cms-lesson-select"
                  className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
                >
                  اختر درساً للتحرير أو التحديث ({lessons.length} درساً)
                </label>
                <select
                  id="cms-lesson-select"
                  value={selectedLessonId}
                  onChange={(e) => handleSelectExistingLesson(e.target.value)}
                  className="w-full max-w-full min-w-0 truncate rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
                >
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {subjects.find((s) => s.id === l.subjectId)?.titleAr} — {l.titleAr}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 shrink-0 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ وتحديث الدرس</span>
              </button>
            </div>

            {saveNotice && (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5 text-xs font-medium text-emerald-900 dark:text-emerald-200">
                {saveNotice}
              </div>
            )}

            {/* Metadata Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="cms-lesson-title"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
                >
                  عنوان الدرس
                </label>
                <input
                  id="cms-lesson-title"
                  type="text"
                  required
                  value={draftLesson.titleAr}
                  onChange={(e) =>
                    setDraftLesson((prev) => ({ ...prev, titleAr: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="cms-lesson-unit"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
                >
                  الوحدة الدراسية
                </label>
                <select
                  id="cms-lesson-unit"
                  value={draftLesson.unitId}
                  onChange={(e) => {
                    const nextUnit = units.find((u) => u.id === e.target.value);
                    setDraftLesson((prev) => ({
                      ...prev,
                      unitId: e.target.value,
                      semester: nextUnit?.semester ?? prev.semester,
                    }));
                  }}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
                >
                  {subjectUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      الوحدة {u.unitNumber}: {u.titleAr} (ف{u.semester})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="cms-lesson-ref"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
                >
                  المرجع الرسمي (كتاب الطالب / الدليل)
                </label>
                <input
                  id="cms-lesson-ref"
                  type="text"
                  required
                  value={draftLesson.officialRef}
                  onChange={(e) =>
                    setDraftLesson((prev) => ({ ...prev, officialRef: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="cms-lesson-status"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
                >
                  حالة التدقيق والاعتماد
                </label>
                <select
                  id="cms-lesson-status"
                  value={draftLesson.verificationStatus ?? 'NEEDS_REVIEW'}
                  onChange={(e) =>
                    setDraftLesson((prev) => ({
                      ...prev,
                      verificationStatus: e.target.value as VerificationStatus,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
                >
                  <option value="VERIFIED">موثق ومعتمد (VERIFIED)</option>
                  <option value="NEEDS_REVIEW">يحتاج مراجعة (NEEDS_REVIEW)</option>
                  <option value="OUTDATED">قديم (OUTDATED)</option>
                  <option value="UNAVAILABLE">غير متاح (UNAVAILABLE)</option>
                </select>
              </div>
            </div>

            {/* Section A: Introduction */}
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                أ. مقدمة الدرس والأهداف التعليمية
              </h2>
              <textarea
                rows={2}
                aria-label="نظرة عامة على الدرس"
                value={draftLesson.introduction?.overviewAr ?? ''}
                onChange={(e) =>
                  setDraftLesson((prev) => ({
                    ...prev,
                    introduction: {
                      ...(prev.introduction ?? {
                        overviewAr: '',
                        objectivesAr: [],
                        prerequisitesAr: [],
                        keyConceptsAr: [],
                      }),
                      overviewAr: e.target.value,
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-900 dark:text-white"
              />
              <div>
                <label
                  htmlFor="cms-objectives"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
                >
                  الأهداف التعليمية (سطر لكل هدف)
                </label>
                <textarea
                  id="cms-objectives"
                  rows={3}
                  value={(draftLesson.introduction?.objectivesAr ?? []).join('\n')}
                  onChange={(e) =>
                    setDraftLesson((prev) => ({
                      ...prev,
                      introduction: {
                        ...(prev.introduction ?? {
                          overviewAr: prev.summaryAr,
                          objectivesAr: [],
                          prerequisitesAr: [],
                          keyConceptsAr: [],
                        }),
                        objectivesAr: e.target.value
                          .split('\n')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Section B: Detailed Explanation + Math Helpers + Diagram + Table Builder */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  ب. الشرح التفصيلي والرموز والجداول
                </h2>
                <div className="flex flex-wrap items-center gap-1">
                  {MATH_HELPERS.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => insertMathSymbol(sym)}
                      className="px-2 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950 cursor-pointer"
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              {draftLesson.sections[0] && (
                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <input
                    type="text"
                    aria-label="عنوان القسم الأول"
                    value={draftLesson.sections[0].titleAr}
                    onChange={(e) =>
                      setDraftLesson((prev) => ({
                        ...prev,
                        sections: prev.sections.map((sec, i) =>
                          i === 0 ? { ...sec, titleAr: e.target.value } : sec
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white"
                  />
                  <textarea
                    rows={4}
                    aria-label="نص الشرح المفصل"
                    value={draftLesson.sections[0].contentAr}
                    onChange={(e) =>
                      setDraftLesson((prev) => ({
                        ...prev,
                        sections: prev.sections.map((sec, i) =>
                          i === 0 ? { ...sec, contentAr: e.target.value } : sec
                        ),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 text-sm text-slate-900 dark:text-white leading-relaxed"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="cms-diagram-select"
                        className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
                      >
                        المخطط العلمي (SVG)
                      </label>
                      <select
                        id="cms-diagram-select"
                        value={draftLesson.sections[0].diagram?.svgKind ?? ''}
                        onChange={(e) => {
                          const val = e.target.value as LessonDiagramKind | '';
                          setDraftLesson((prev) => ({
                            ...prev,
                            sections: prev.sections.map((sec, i) =>
                              i === 0
                                ? {
                                    ...sec,
                                    diagram: val
                                      ? {
                                          id: sec.diagram?.id ?? `diag-${Date.now()}`,
                                          titleAr: sec.diagram?.titleAr ?? prev.titleAr,
                                          captionAr:
                                            sec.diagram?.captionAr ??
                                            'رسم توضيحي لمفهوم الدرس الرئيسي.',
                                          svgKind: val,
                                        }
                                      : undefined,
                                  }
                                : sec
                            ),
                          }));
                        }}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="">بدون مخطط</option>
                        {DIAGRAM_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.labelAr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Table Row/Column Builder */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Table2 className="w-4 h-4 text-sky-700" />
                  <span>منشئ الجداول العلمية والمقارنات (افصل الأعمدة بعلامة |)</span>
                </div>
                <input
                  type="text"
                  aria-label="عنوان الجدول العلمي"
                  value={tableTitle}
                  onChange={(e) => setTableTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs"
                />
                <input
                  type="text"
                  aria-label="رؤوس أعمدة الجدول"
                  value={tableHeadersText}
                  onChange={(e) => setTableHeadersText(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-mono"
                />
                <textarea
                  rows={2}
                  aria-label="صفوف الجدول"
                  value={tableRowsText}
                  onChange={(e) => setTableRowsText(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleAppendStructuredTable}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-sky-700 text-sky-800 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إدراج الجدول في الدرس</span>
                </button>
              </div>
            </div>

            {/* Section C: Comprehensive Summary */}
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                ج. الملخص الشامل والملخص السريع
              </h2>
              <textarea
                rows={3}
                aria-label="الملخص الشامل للدرس"
                value={draftLesson.comprehensiveSummary?.detailedSummaryAr ?? draftLesson.summaryAr}
                onChange={(e) =>
                  setDraftLesson((prev) => ({
                    ...prev,
                    summaryAr: e.target.value,
                    comprehensiveSummary: {
                      ...(prev.comprehensiveSummary ?? {
                        detailedSummaryAr: e.target.value,
                        quickRevisionAr: prev.keyPointsAr,
                        keyTermsAr: [],
                        memorizePointsAr: [],
                      }),
                      detailedSummaryAr: e.target.value,
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-900 dark:text-white"
              />
            </div>

            {/* Section D & E & F counts summary + quick add */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                <p className="font-bold text-slate-900 dark:text-white">
                  د. الأمثلة المحلولة ({draftLesson.solvedExamples.length})
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setDraftLesson((prev) => ({
                      ...prev,
                      solvedExamples: [
                        ...prev.solvedExamples,
                        {
                          id: `ex-${Date.now()}`,
                          titleAr: 'مثال تطبيقي جديد',
                          difficulty: 'intermediate' as ExampleDifficulty,
                          problemAr: 'نص المسألة الجديدة...',
                          givenAr: ['المعطى ١'],
                          stepsAr: ['الخطوة ١: كتابة القانون والتعويض.'],
                          finalAnswerAr: 'الناتج النهائي',
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1 text-sky-800 dark:text-sky-400 font-semibold hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة مثال محلول</span>
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                <p className="font-bold text-slate-900 dark:text-white">
                  هـ. التمارين المتدرجة ({draftLesson.exercises.length})
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setDraftLesson((prev) => ({
                      ...prev,
                      exercises: [
                        ...prev.exercises,
                        {
                          id: `q-${Date.now()}`,
                          tier: 'medium' as ExerciseTier,
                          promptAr: 'سؤال تدريبي جديد...',
                          hintAr: 'تلميح الحل',
                          answerAr: 'الإجابة النموذجية',
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1 text-sky-800 dark:text-sky-400 font-semibold hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة تمرين</span>
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                <p className="font-bold text-slate-900 dark:text-white">
                  و. المراجعة والمصادر ({draftLesson.sourceIds?.length ?? 0})
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  {draftLesson.review?.commonMistakesAr.length ?? 0} أخطاء شائعة مسجلة
                </p>
              </div>
            </div>
          </form>

          {/* Right Column: Gemini Admin Assist */}
          <aside className="lg:col-span-4 min-w-0 space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-700 dark:text-sky-400" />
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  مساعد الذكاء الاصطناعي للمشرف
                </h2>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                يُولّد مسودات تعليمية مقترحة استناداً إلى سياق الدرس ومصادر الوزارة. تُوسم كل مسودة
                تلقائياً بـ <strong>aiGenerated: true</strong> وحالة{' '}
                <strong>NEEDS_REVIEW</strong> ولا تُعتمد إلا بعد مراجعتك.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'explanation' as const, label: 'مسودة شرح' },
                  { id: 'summary' as const, label: 'مسودة ملخص' },
                  { id: 'examples' as const, label: 'مثال محلول' },
                  { id: 'exercises' as const, label: 'تمرين متدرج' },
                  { id: 'objectives' as const, label: 'أهداف تعليمية' },
                  { id: 'gap_analysis' as const, label: 'تحليل الفجوات' },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    disabled={assistLoading}
                    onClick={() => void handleRequestAdminAssist(btn.id)}
                    className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {assistLoading && (
                <div className="flex items-center gap-2 text-xs text-sky-700 dark:text-sky-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إعداد المسودة من السياق المعتمد...</span>
                </div>
              )}

              {assistError && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-900 dark:text-rose-200"
                >
                  {assistError}
                </div>
              )}

              {lastAiDraft && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-300">
                    <span>{lastAiDraft.titleAr}</span>
                    <span>NEEDS_REVIEW</span>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                    {lastAiDraft.contentAr}
                  </p>
                  {lastAiDraft.itemsAr.length > 0 && (
                    <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                      {lastAiDraft.itemsAr.map((it, idx) => (
                        <li key={idx}>• {it}</li>
                      ))}
                    </ul>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleApplyAiDraftToLesson}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 cursor-pointer"
                    >
                      إدراج كمسودة في الدرس
                    </button>
                    <button
                      type="button"
                      onClick={() => setLastAiDraft(null)}
                      aria-label="تجاهل المسودة"
                      className="p-1.5 text-xs text-slate-500 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Sub-tab 2: Units & Learning Objectives Manager */}
      {subTab === 'structure' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newUnitTitle.trim()) return;
              const nextNumber =
                units.filter((u) => u.subjectId === newUnitSubject).length + 1;
              void onSaveUnit({
                id: `${newUnitSubject}-u${Date.now()}`,
                subjectId: newUnitSubject,
                semester: newUnitSemester,
                unitNumber: nextNumber,
                titleAr: newUnitTitle.trim(),
                summaryAr:
                  newUnitSummary.trim() || `وحدة إضافية في ${newUnitTitle.trim()}`,
                objectivesAr: [],
                verificationStatus: 'NEEDS_REVIEW',
                isPublished: true,
              });
              setNewUnitTitle('');
              setNewUnitSummary('');
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <BookPlus className="w-4 h-4 text-sky-700" />
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                إضافة وحدة دراسية جديدة
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <select
                aria-label="المادة للوحدة الجديدة"
                value={newUnitSubject}
                onChange={(e) => setNewUnitSubject(e.target.value as SubjectId)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.titleAr}
                  </option>
                ))}
              </select>
              <select
                aria-label="الفصل للوحدة الجديدة"
                value={String(newUnitSemester)}
                onChange={(e) => setNewUnitSemester(Number(e.target.value) as Semester)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="1">الفصل الأول</option>
                <option value="2">الفصل الثاني</option>
              </select>
            </div>

            <input
              type="text"
              required
              placeholder="عنوان الوحدة الدراسية..."
              value={newUnitTitle}
              onChange={(e) => setNewUnitTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            />
            <textarea
              rows={2}
              placeholder="ملخص الوحدة..."
              value={newUnitSummary}
              onChange={(e) => setNewUnitSummary(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 cursor-pointer"
            >
              إضافة الوحدة
            </button>
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newObjStatement.trim()) return;
              const targetUnit =
                units.find((u) => u.subjectId === draftLesson.subjectId) ?? units[0];
              void onSaveObjective({
                id: `obj-${Date.now()}`,
                subjectId: draftLesson.subjectId,
                unitId: draftLesson.unitId || targetUnit.id,
                lessonId: draftLesson.id,
                code: newObjCode.trim() || 'OM12-OBJ',
                statementAr: newObjStatement.trim(),
                bloomLevel: 'apply',
                verificationStatus: 'NEEDS_REVIEW',
              });
              setNewObjStatement('');
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              ربط هدف تعليمي جديد ({objectives.length} مسجل)
            </h2>
            <input
              type="text"
              placeholder="رمز الهدف (مثال: PH12-3.5)"
              value={newObjCode}
              onChange={(e) => setNewObjCode(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono"
            />
            <textarea
              rows={2}
              required
              placeholder="صياغة الهدف التعليمي القابل للقياس..."
              value={newObjStatement}
              onChange={(e) => setNewObjStatement(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 cursor-pointer"
            >
              حفظ الهدف التعليمي
            </button>
          </form>
        </div>
      )}

      {/* Sub-tab 3: Sources & Approval Review Queue */}
      {subTab === 'sources' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              قائمة مراجعة الدروس والمصادر ({verificationRecords.length} سجل)
            </h2>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {lessons
                .filter((l) => l.verificationStatus !== 'VERIFIED' || l.aiGenerated)
                .map((l) => (
                  <div
                    key={l.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {l.titleAr}
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>
                          {l.verificationStatus ?? 'NEEDS_REVIEW'}
                          {l.aiGenerated ? ' · مسودة ذكاء اصطناعي' : ''}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          void onRecordVerification(
                            'lesson',
                            l.id,
                            'VERIFIED',
                            'تم التحقق واعتماد الدرس من المشرف في CMS.'
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>اعتماد موثق</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectExistingLesson(l.id);
                          setSubTab('editor');
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        مراجعة المحتوى
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newSourceTitle.trim() || !newSourceUrl.trim()) return;
              void onSaveSource({
                id: `src-cms-${Date.now()}`,
                titleAr: newSourceTitle.trim(),
                publisherAr: 'وزارة التربية والتعليم — سلطنة عُمان',
                publicationYear: 2026,
                url: newSourceUrl.trim(),
                subjectId: newSourceSubject,
                semester: newSourceSemester,
                sourceType: 'moe_textbook',
                verificationStatus: 'NEEDS_REVIEW',
                notesAr: newSourceNotes.trim() || 'مرجع مضاف عبر CMS بانتظار التحقق النهائي.',
              });
              setNewSourceTitle('');
              setNewSourceNotes('');
            }}
            className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 self-start"
          >
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              إضافة مصدر رسمي جديد
            </h2>
            <input
              type="text"
              required
              placeholder="عنوان المصدر / الكتاب..."
              value={newSourceTitle}
              onChange={(e) => setNewSourceTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            />
            <input
              type="url"
              required
              dir="ltr"
              placeholder="https://ict.moe.gov.om/..."
              value={newSourceUrl}
              onChange={(e) => setNewSourceUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                aria-label="المادة للمصدر"
                value={newSourceSubject}
                onChange={(e) => setNewSourceSubject(e.target.value as SubjectId)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.titleAr}
                  </option>
                ))}
              </select>
              <select
                aria-label="الفصل للمصدر"
                value={String(newSourceSemester)}
                onChange={(e) => setNewSourceSemester(Number(e.target.value) as Semester)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
              >
                <option value="1">الفصل الأول</option>
                <option value="2">الفصل الثاني</option>
              </select>
            </div>
            <textarea
              rows={2}
              placeholder="ملاحظات التحقق..."
              value={newSourceNotes}
              onChange={(e) => setNewSourceNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-xs"
            />
            <button
              type="submit"
              className="w-full px-4 py-2 text-xs font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 cursor-pointer"
            >
              تسجيل المصدر في السجل
            </button>
          </form>
        </div>
      )}
      {/* Sub-tab 4: Question Bank Governance, Review Queue, AI Drafts & Dry-Run Migration */}
      {subTab === 'questions' && (
        <div className="space-y-6">
          {!isAdminUser ? (
            <div
              role="alert"
              className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-6 space-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4" />
                <span>صلاحية المشرف مطلوبة لإدارة بنك الأسئلة ومفاتيح الإجابة</span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                لأسباب أمنية صارمة، لا يتم تحميل مفاتيح الإجابة أو قرارات المراجعة أو مسودات الذكاء الاصطناعي أو تقارير الترحيل إلى المتصفح إلا بعد تسجيل الدخول بحساب المشرف المعتمد والتحقق منه على الخادم.
              </p>
            </div>
          ) : (
            <>
              {/* Audit Summary KPIs + Dry-Run Migration Trigger */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                      حوكمة بنك الأسئلة والمراجعة العلمية
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      تظهر للطلبة الأسئلة المعتمدة (APPROVED) والمنشورة فقط، بينما تبقى الأسئلة قيد المراجعة معزولة على الخادم.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRunDryRunMigration()}
                      disabled={migrationLoading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-sky-700 text-sky-800 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950 disabled:opacity-50 cursor-pointer"
                    >
                      <FileSearch className="w-3.5 h-3.5" />
                      <span>{migrationLoading ? 'جاري الفحص...' : 'فحص الترحيل الآمن (Dry-Run)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void loadAdminQuestions()}
                      disabled={qLoading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-slate-800 hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${qLoading ? 'animate-spin' : ''}`} />
                      <span>تحديث السجل</span>
                    </button>
                  </div>
                </div>

                {auditSummary && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">الإجمالي</p>
                      <p className="font-mono text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                        {auditSummary.totalQuestions}
                      </p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">معتمد للطلبة</p>
                      <p className="font-mono text-lg font-bold text-emerald-800 dark:text-emerald-300 tabular-nums">
                        {auditSummary.approvedCount}
                      </p>
                    </div>
                    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3">
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">يحتاج مراجعة</p>
                      <p className="font-mono text-lg font-bold text-amber-800 dark:text-amber-300 tabular-nums">
                        {auditSummary.needsReviewCount}
                      </p>
                    </div>
                    <div className="rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 p-3">
                      <p className="text-[11px] text-sky-700 dark:text-sky-400">بانتظار الاعتماد</p>
                      <p className="font-mono text-lg font-bold text-sky-800 dark:text-sky-300 tabular-nums">
                        {auditSummary.pendingReviewCount}
                      </p>
                    </div>
                    <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 p-3">
                      <p className="text-[11px] text-rose-700 dark:text-rose-400">بحاجة لتصحيح</p>
                      <p className="font-mono text-lg font-bold text-rose-800 dark:text-rose-300 tabular-nums">
                        {auditSummary.needsCorrectionCount}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">تكرار محتمل</p>
                      <p className="font-mono text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                        {auditSummary.duplicatePairsCount}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">مصدر ناقص</p>
                      <p className="font-mono text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                        {auditSummary.missingSourceCount}
                      </p>
                    </div>
                  </div>
                )}

                {migrationReport && (
                  <div className="rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/20 p-4 text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-sky-900 dark:text-sky-200">
                      <span>نتيجة فحص الترحيل الآمن (Dry-Run)</span>
                      <span className="font-mono tabular-nums">
                        فحص التسريب: {migrationReport.publicLeakCheckPassed ? 'ناجح' : 'فشل'} · تطابق المعرفات: {migrationReport.parityCheckPassed ? 'متطابق' : 'مختلف'}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">
                      إجمالي المفحوص: {migrationReport.totalScanned} (قديم: {migrationReport.legacyCount} · موسع: {migrationReport.extendedCount}) · وثائق عامة للطلبة: {migrationReport.publicDocsPrepared} · مفاتيح إجابة خاصة: {migrationReport.privateAnswerKeyDocsPrepared} · عناصر بدون مصدر كامل: {migrationReport.incompleteOrMissingSourceIds.length}
                    </p>
                    {migrationReport.warningsAr.length > 0 && (
                      <ul className="list-disc list-inside text-amber-800 dark:text-amber-300 space-y-0.5">
                        {migrationReport.warningsAr.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {qNotice && (
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5 text-xs font-medium text-emerald-900 dark:text-emerald-200">
                    {qNotice}
                  </div>
                )}
                {qError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 px-4 py-2.5 text-xs font-medium text-rose-900 dark:text-rose-200"
                  >
                    {qError}
                  </div>
                )}
              </div>

              {/* Filter Bar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Filter className="w-3.5 h-3.5 text-sky-700" />
                  <span>تصفية الأسئلة للمراجعة والاعتماد</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                  <select
                    aria-label="تصفية المادة في الإدارة"
                    value={qFilter.subjectId ?? 'all'}
                    onChange={(e) =>
                      setQFilter((prev) => ({
                        ...prev,
                        subjectId: e.target.value as SubjectId | 'all',
                        lessonId: 'all',
                      }))
                    }
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
                  >
                    <option value="all">كل المواد</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.titleAr}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="تصفية حالة التحقق"
                    value={qFilter.verificationStatus ?? 'all'}
                    onChange={(e) =>
                      setQFilter((prev) => ({
                        ...prev,
                        verificationStatus: e.target.value as QuestionVerificationState | 'all',
                      }))
                    }
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
                  >
                    <option value="all">كل حالات التحقق</option>
                    {VERIFICATION_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {VERIFICATION_STATE_LABELS_AR[st]}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="تصفية مستوى الصعوبة"
                    value={qFilter.difficulty ?? 'all'}
                    onChange={(e) =>
                      setQFilter((prev) => ({
                        ...prev,
                        difficulty: e.target.value as DifficultyLevel | 'all',
                      }))
                    }
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
                  >
                    <option value="all">كل مستويات الصعوبة (٥)</option>
                    {DIFFICULTY_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {DIFFICULTY_LABELS_AR[d]}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="تصفية نوع السؤال"
                    value={qFilter.questionType ?? 'all'}
                    onChange={(e) =>
                      setQFilter((prev) => ({
                        ...prev,
                        questionType: e.target.value as QuestionType | 'all',
                      }))
                    }
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
                  >
                    <option value="all">كل الأنواع (١٢)</option>
                    {QUESTION_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {QUESTION_TYPE_LABELS_AR[t]}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="تصفية مصدر السؤال"
                    value={qFilter.origin ?? 'all'}
                    onChange={(e) =>
                      setQFilter((prev) => ({
                        ...prev,
                        origin: e.target.value as QuestionOrigin | 'all',
                      }))
                    }
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
                  >
                    <option value="all">كل المصادر</option>
                    {ORIGIN_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {ORIGIN_LABELS_AR[o]}
                      </option>
                    ))}
                  </select>

                  <input
                    type="search"
                    aria-label="بحث في نص السؤال"
                    placeholder="بحث في السؤال أو المعرف..."
                    value={qFilter.searchQuery ?? ''}
                    onChange={(e) =>
                      setQFilter((prev) => ({ ...prev, searchQuery: e.target.value }))
                    }
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Main 2-column Question Governance Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Questions List + Review Actions */}
                <div className="lg:col-span-7 space-y-3">
                  {duplicates.length > 0 && (
                    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 p-4 text-xs space-y-1">
                      <p className="font-bold text-amber-900 dark:text-amber-300">
                        تنبيه تشابه/تكرار محتمل ({duplicates.length})
                      </p>
                      {duplicates.slice(0, 4).map((dup, i) => (
                        <p key={i} className="text-amber-800 dark:text-amber-200 font-mono">
                          {dup.questionAId} ↔ {dup.questionBId}: {dup.reasonAr} ({dup.similarityScore})
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
                    <div className="px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>الأسئلة المطابقة ({adminQuestions.length})</span>
                      <span className="font-normal text-slate-500">
                        سجل المراجعات المسجل: {questionReviews.length}
                      </span>
                    </div>

                    {adminQuestions.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                        {qLoading ? 'جاري تحميل الأسئلة...' : 'لا توجد أسئلة مطابقة لمعايير التصفية الحالية.'}
                      </div>
                    ) : (
                      adminQuestions.slice(0, 30).map((q) => {
                        const sciReport =
                          q.scientificValidation ?? validateQuestionScientifically(q);
                        const status = q.verificationStatus ?? 'NEEDS_REVIEW';
                        const statusBadgeColor =
                          status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800'
                            : status === 'REJECTED' || status === 'NEEDS_CORRECTION'
                            ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800'
                            : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800';

                        return (
                          <div key={q.id} className="p-4 space-y-2.5 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {q.id}
                                </span>
                                <span className={`px-2 py-0.5 rounded border font-semibold ${statusBadgeColor}`}>
                                  {VERIFICATION_STATE_LABELS_AR[status]}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {DIFFICULTY_LABELS_AR[q.difficulty]}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {QUESTION_TYPE_LABELS_AR[q.questionType]}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500">
                                {ORIGIN_LABELS_AR[q.origin ?? 'ADMIN_CREATED']}
                              </span>
                            </div>

                            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                              {q.promptAr}
                            </p>

                            <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 space-y-1">
                              <p className="text-emerald-800 dark:text-emerald-300">
                                <strong>الإجابة المعتمدة:</strong> {q.correctAnswer}
                              </p>
                              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                <strong>التفسير:</strong> {q.explanationAr}
                              </p>
                              <p className="text-slate-500 dark:text-slate-400">
                                <strong>المصدر:</strong> {q.sourceId || 'غير مرتبط'} {q.sourceRefAr ? `(${q.sourceRefAr})` : ''}
                              </p>
                            </div>

                            {(sciReport.errorsAr.length > 0 || sciReport.warningsAr.length > 0) && (
                              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 p-2 text-[11px] text-amber-900 dark:text-amber-300 space-y-0.5">
                                {sciReport.errorsAr.map((err, idx) => (
                                  <p key={`e-${idx}`}>خطأ تدقيق: {err}</p>
                                ))}
                                {sciReport.warningsAr.map((warn, idx) => (
                                  <p key={`w-${idx}`}>ملاحظة علمية: {warn}</p>
                                ))}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <button
                                type="button"
                                disabled={reviewingId === q.id}
                                onClick={() =>
                                  void handleReviewQuestion(
                                    q.id,
                                    'APPROVED',
                                    'اعتماد علمي ونشر للطلبة من لوحة الحوكمة.'
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>اعتماد ونشر</span>
                              </button>
                              <button
                                type="button"
                                disabled={reviewingId === q.id}
                                onClick={() =>
                                  void handleReviewQuestion(
                                    q.id,
                                    'NEEDS_CORRECTION',
                                    'يحتاج تعديلاً أو توثيق مصدر من المشرف.'
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-amber-600 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950 cursor-pointer"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                <span>يحتاج تصحيح</span>
                              </button>
                              <button
                                type="button"
                                disabled={reviewingId === q.id}
                                onClick={() =>
                                  void handleReviewQuestion(
                                    q.id,
                                    'REJECTED',
                                    'مرفوض وغير صالح للعرض.'
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-rose-600 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>رفض</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleLoadQuestionForEdit(q)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>تعديل</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Sidebar: Create/Edit Question + AI Question Generator */}
                <div className="lg:col-span-5 space-y-5">
                  <form
                    onSubmit={(e) => void handleSaveQuestionForm(e)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                        {editingQuestionId
                          ? `تعديل سؤال (${editingQuestionId})`
                          : 'إضافة سؤال جديد إلى البنك'}
                      </h3>
                      {editingQuestionId && (
                        <button
                          type="button"
                          onClick={handleResetQuestionForm}
                          className="text-xs text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          سؤال جديد
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <select
                        aria-label="الدرس المرتبط بالسؤال"
                        value={qFormLessonId}
                        onChange={(e) => {
                          const found = lessons.find((l) => l.id === e.target.value);
                          setQFormLessonId(e.target.value);
                          if (found) setQFormSubject(found.subjectId);
                        }}
                        className="sm:col-span-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
                      >
                        {lessons.map((l) => (
                          <option key={l.id} value={l.id}>
                            {subjects.find((s) => s.id === l.subjectId)?.titleAr} — {l.titleAr}
                          </option>
                        ))}
                      </select>

                      <select
                        aria-label="مستوى صعوبة السؤال"
                        value={qFormDifficulty}
                        onChange={(e) => setQFormDifficulty(e.target.value as DifficultyLevel)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
                      >
                        {DIFFICULTY_OPTIONS.map((d) => (
                          <option key={d} value={d}>
                            {DIFFICULTY_LABELS_AR[d]}
                          </option>
                        ))}
                      </select>

                      <select
                        aria-label="نوع السؤال في المحرر"
                        value={qFormType}
                        onChange={(e) => setQFormType(e.target.value as QuestionType)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
                      >
                        {QUESTION_TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {QUESTION_TYPE_LABELS_AR[t]}
                          </option>
                        ))}
                      </select>

                      <select
                        aria-label="مصدر السؤال في المحرر"
                        value={qFormOrigin}
                        onChange={(e) => setQFormOrigin(e.target.value as QuestionOrigin)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
                      >
                        {ORIGIN_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {ORIGIN_LABELS_AR[o]}
                          </option>
                        ))}
                      </select>

                      <select
                        aria-label="حالة اعتماد السؤال"
                        value={qFormStatus}
                        onChange={(e) => setQFormStatus(e.target.value as QuestionVerificationState)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
                      >
                        {VERIFICATION_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {VERIFICATION_STATE_LABELS_AR[st]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <select
                      aria-label="المرجع المنهجي للسؤال"
                      value={qFormSourceId}
                      onChange={(e) => setQFormSourceId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
                    >
                      <option value="">بدون مصدر محدد</option>
                      {sources
                        .filter((s) => s.subjectId === qFormSubject)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.titleAr}
                          </option>
                        ))}
                    </select>

                    <textarea
                      rows={3}
                      required
                      aria-label="نص السؤال"
                      placeholder="اكتب نص السؤال العلمي باللغة العربية..."
                      value={qFormPrompt}
                      onChange={(e) => setQFormPrompt(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs"
                    />

                    {(qFormType === 'mcq' ||
                      qFormType === 'multi_select' ||
                      qFormType === 'diagram_interpretation' ||
                      qFormType === 'data_graph_analysis') && (
                      <textarea
                        rows={3}
                        aria-label="خيارات الاختيار"
                        placeholder="الخيارات (خيار واحد في كل سطر)..."
                        value={qFormOptionsText}
                        onChange={(e) => setQFormOptionsText(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs"
                      />
                    )}

                    <input
                      type="text"
                      required
                      aria-label="الإجابة الصحيحة"
                      placeholder="الإجابة النموذجية الصحيحة..."
                      value={qFormCorrectAnswer}
                      onChange={(e) => setQFormCorrectAnswer(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
                    />

                    <textarea
                      rows={2}
                      required
                      aria-label="التفسير العلمي للحل"
                      placeholder="التفسير العلمي وخطوات الحل..."
                      value={qFormExplanation}
                      onChange={(e) => setQFormExplanation(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs"
                    />

                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={qFormPublished}
                        onChange={(e) => setQFormPublished(e.target.checked)}
                      />
                      <span>نشر السؤال للطلبة (يظهر فعلياً فقط عند حالة APPROVED)</span>
                    </label>

                    <button
                      type="submit"
                      disabled={qSaving}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{qSaving ? 'جاري الحفظ...' : 'حفظ السؤال وتسجيل الإصدار'}</span>
                    </button>
                  </form>

                  {/* Admin-only AI Question Draft Generator */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-700 dark:text-sky-400" />
                      <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                        توليد مسودات أسئلة بالذكاء الاصطناعي (للمشرف)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      تُحفظ المسودات على الخادم بحالة <strong>PENDING_REVIEW</strong> ولا تصل للطلبة إلا بعد مراجعتها واعتمادها.
                    </p>
                    <select
                      aria-label="درس توليد المسودات"
                      value={aiGenLessonId}
                      onChange={(e) => setAiGenLessonId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-xs"
                    >
                      {lessons.map((l) => (
                        <option key={l.id} value={l.id}>
                          {subjects.find((s) => s.id === l.subjectId)?.titleAr} — {l.titleAr}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        aria-label="صعوبة المسودة"
                        value={aiGenDiff}
                        onChange={(e) => setAiGenDiff(e.target.value as DifficultyLevel)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 text-xs"
                      >
                        {DIFFICULTY_OPTIONS.map((d) => (
                          <option key={d} value={d}>
                            {DIFFICULTY_LABELS_AR[d]}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label="نوع مسودة السؤال"
                        value={aiGenType}
                        onChange={(e) => setAiGenType(e.target.value as QuestionType)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 text-xs"
                      >
                        {QUESTION_TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {QUESTION_TYPE_LABELS_AR[t]}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={4}
                        aria-label="عدد المسودات"
                        value={aiGenCount}
                        onChange={(e) => setAiGenCount(Math.max(1, Math.min(4, Number(e.target.value))))}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 text-xs font-mono text-center"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={aiGenLoading}
                      onClick={() => void handleGenerateAdminQuestions()}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{aiGenLoading ? 'جاري التوليد...' : 'توليد مسودات أسئلة'}</span>
                    </button>

                    {aiGenDrafts.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        {aiGenDrafts.map((dq) => (
                          <div
                            key={dq.id}
                            className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs space-y-1.5"
                          >
                            <p className="font-semibold text-slate-900 dark:text-white">{dq.promptAr}</p>
                            <p className="text-emerald-800 dark:text-emerald-300">
                              الإجابة: {dq.correctAnswer}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                void handleReviewQuestion(
                                  dq.id,
                                  'APPROVED',
                                  'تمت مراجعة مسودة الذكاء الاصطناعي واعتمادها.'
                                )
                              }
                              className="px-2.5 py-1 rounded bg-emerald-700 text-white hover:bg-emerald-800 cursor-pointer"
                            >
                              اعتماد المسودة ونشرها
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
