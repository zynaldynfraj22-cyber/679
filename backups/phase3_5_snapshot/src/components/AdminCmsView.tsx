import React from 'react';
import {
  AlertTriangle,
  BookPlus,
  CheckCircle2,
  Database,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Table2,
  Trash2,
} from 'lucide-react';
import type {
  AdminAssistDraft,
  AdminAssistType,
  CurriculumSource,
  ExampleDifficulty,
  ExerciseTier,
  LearningObjective,
  Lesson,
  LessonDiagramKind,
  OfficialLessonCatalogItem,
  Semester,
  Subject,
  SubjectId,
  Unit,
  VerificationRecord,
  VerificationStatus,
} from '../types/curriculum';
import { normalizeLessonStandard } from '../utils/curriculumEngine';

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
  seedingStatus: string | null;
}

type CmsSubTab = 'editor' | 'structure' | 'sources';

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

      const response = await fetch('/api/admin/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistType,
          subjectTitle: subj?.titleAr ?? draftLesson.subjectId,
          unitTitle: unit?.titleAr ?? draftLesson.unitId,
          lessonTitle: draftLesson.titleAr,
          semester: draftLesson.semester,
          officialRef: draftLesson.officialRef,
          existingContext: draftLesson.summaryAr,
          sourceSummary: matchedSource?.notesAr ?? '',
        }),
      });

      const payload = (await response.json()) as { draft?: AdminAssistDraft; error?: string };
      if (!response.ok || !payload.draft) {
        setAssistError(payload.error ?? 'تعذر توليد المسودة بالذكاء الاصطناعي.');
        return;
      }

      setLastAiDraft(payload.draft);
    } catch {
      setAssistError('تعذر الاتصال بخدمة المساعد الإداري على الخادم.');
    } finally {
      setAssistLoading(false);
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
    </div>
  );
}
