import React from 'react';
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Lightbulb,
  Save,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import type {
  AssessmentResult,
  CurriculumSource,
  ExampleDifficulty,
  ExerciseTier,
  Lesson,
  LessonProgress,
  Question,
  Subject,
  Unit,
  VerificationStatus,
} from '../types/curriculum';
import {
  gradeAssessment,
  normalizeLessonStandard,
  sanitizeUserNotes,
} from '../utils/curriculumEngine';
import { LessonDiagram } from './LessonDiagram';

type LessonTab = 'explanation' | 'summary' | 'examples' | 'exercises' | 'review' | 'exam';

interface LessonReaderProps {
  subject: Subject;
  unit: Unit;
  lesson: Lesson;
  lessonQuestions: Question[];
  sources?: CurriculumSource[];
  progress?: LessonProgress;
  onBackToSubject: () => void;
  onToggleBookmark: (lesson: Lesson) => Promise<void>;
  onToggleComplete: (lesson: Lesson) => Promise<void>;
  onSaveNotes: (lesson: Lesson, notes: string) => Promise<void>;
  onSubmitLessonExam: (lesson: Lesson, result: AssessmentResult) => Promise<void>;
  onAskTutorForLesson: (lesson: Lesson) => void;
}

const VERIFICATION_TEXT_MAP: Record<VerificationStatus, { labelAr: string; className: string }> = {
  VERIFIED: { labelAr: 'محتوى موثق', className: 'text-emerald-700 dark:text-emerald-400' },
  NEEDS_REVIEW: { labelAr: 'قيد المراجعة', className: 'text-amber-700 dark:text-amber-400' },
  OUTDATED: { labelAr: 'يحتاج تحديثاً منهجياً', className: 'text-rose-700 dark:text-rose-400' },
  UNAVAILABLE: { labelAr: 'غير متاح حالياً', className: 'text-slate-500 dark:text-slate-400' },
};

const EXAMPLE_DIFF_LABEL: Record<ExampleDifficulty, string> = {
  basic: 'أساسي',
  intermediate: 'متوسط',
  advanced: 'متقدم',
};

const EXERCISE_TIER_LABEL: Record<ExerciseTier, string> = {
  easy: 'سهل',
  medium: 'متوسط',
  difficult: 'صعب',
  application: 'تطبيقي',
  critical_thinking: 'تفكير ناقد',
};

export function LessonReader({
  subject,
  unit,
  lesson,
  lessonQuestions,
  sources = [],
  progress,
  onBackToSubject,
  onToggleBookmark,
  onToggleComplete,
  onSaveNotes,
  onSubmitLessonExam,
  onAskTutorForLesson,
}: LessonReaderProps) {
  const normalizedLesson = React.useMemo(() => normalizeLessonStandard(lesson), [lesson]);
  const [activeTab, setActiveTab] = React.useState<LessonTab>('explanation');
  const [revealedExamples, setRevealedExamples] = React.useState<Record<string, boolean>>({});
  const [revealedExerciseAnswers, setRevealedExerciseAnswers] = React.useState<
    Record<string, boolean>
  >({});
  const [notesDraft, setNotesDraft] = React.useState(progress?.notesAr ?? '');
  const [notesSavedNotice, setNotesSavedNotice] = React.useState<string | null>(null);

  // Lesson exam state
  const [examAnswers, setExamAnswers] = React.useState<Record<string, string>>({});
  const [examResult, setExamResult] = React.useState<AssessmentResult | null>(null);

  React.useEffect(() => {
    setExamAnswers({});
    setExamResult(null);
    setActiveTab('explanation');
  }, [lesson.id]);

  React.useEffect(() => {
    setNotesDraft(progress?.notesAr ?? '');
  }, [lesson.id, progress?.notesAr]);

  const isCompleted = progress?.status === 'completed';
  const isBookmarked = Boolean(progress?.bookmarked);

  const matchedSources = React.useMemo(() => {
    const ids = normalizedLesson.sourceIds ?? [];
    if (ids.length === 0) return [];
    return sources.filter((src) => ids.includes(src.id));
  }, [sources, normalizedLesson.sourceIds]);

  const statusMeta =
    VERIFICATION_TEXT_MAP[normalizedLesson.verificationStatus ?? 'NEEDS_REVIEW'];

  const tabs: { id: LessonTab; label: string }[] = [
    { id: 'explanation', label: 'أ. المقدمة ب. الشرح' },
    { id: 'summary', label: 'ج. الملخص والقوانين' },
    { id: 'examples', label: `د. الأمثلة (${normalizedLesson.solvedExamples.length})` },
    { id: 'exercises', label: `هـ. التمارين والملاحظات (${normalizedLesson.exercises.length})` },
    { id: 'review', label: 'و. المراجعة والمصادر' },
    { id: 'exam', label: `اختبار الدرس (${lessonQuestions.length})` },
  ];

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = sanitizeUserNotes(notesDraft);
    await onSaveNotes(lesson, cleaned);
    setNotesSavedNotice('تم حفظ الملاحظات بنجاح');
    setTimeout(() => setNotesSavedNotice(null), 3000);
  };

  const handleExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lessonQuestions.length === 0) return;
    const result = gradeAssessment(lessonQuestions, examAnswers);
    setExamResult(result);
    await onSubmitLessonExam(lesson, result);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Actions Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={onBackToSubject}
              className="inline-flex items-center gap-1.5 text-sky-800 dark:text-sky-400 font-semibold hover:underline cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>{subject.titleAr}</span>
            </button>
            <span aria-hidden="true">/</span>
            <span>
              الوحدة {unit.unitNumber}: {unit.titleAr}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void onToggleBookmark(lesson)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isBookmarked
                  ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{isBookmarked ? 'محفوظ في المراجعة' : 'حفظ للمراجعة'}</span>
            </button>

            <button
              type="button"
              onClick={() => void onToggleComplete(lesson)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isCompleted
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isCompleted ? 'مكتمل' : 'تحديد كمكتمل'}</span>
            </button>

            <button
              type="button"
              onClick={() => onAskTutorForLesson(lesson)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>اسأل المعلم الذكي</span>
            </button>
          </div>
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
          {normalizedLesson.titleAr}
        </h1>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>{normalizedLesson.officialRef}</span>
          <span aria-hidden="true">·</span>
          <span>{normalizedLesson.semester === 1 ? 'الفصل الأول' : 'الفصل الثاني'}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            مدة الدراسة التقديرية: {normalizedLesson.estimatedMinutes} دقيقة
          </span>
          <span aria-hidden="true">·</span>
          <span className={`inline-flex items-center gap-1 font-semibold ${statusMeta.className}`}>
            {normalizedLesson.verificationStatus === 'VERIFIED' ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            <span>{statusMeta.labelAr}</span>
          </span>
          {normalizedLesson.aiGenerated && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-amber-700 dark:text-amber-400">
                مسودة مُنشأة بمساعدة الذكاء الاصطناعي
              </span>
            </>
          )}
          {progress && progress.bestExamScore > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                أعلى درجة في الدرس: <span className="font-mono">{progress.bestExamScore}%</span>
              </span>
            </>
          )}
        </div>

        {normalizedLesson.classificationNoteAr && (
          <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 px-4 py-2.5 text-xs text-amber-950 dark:text-amber-200">
            <strong>ملاحظة التصنيف المنهجي: </strong>
            {normalizedLesson.classificationNoteAr}
          </div>
        )}
      </div>

      {/* Lesson Navigation Tabs */}
      <div
        role="tablist"
        aria-label="أقسام الدرس القياسية"
        className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Section A (Introduction) + Section B (Detailed Explanation) */}
      {activeTab === 'explanation' && (
        <div className="space-y-6">
          {/* Section A: Introduction */}
          {normalizedLesson.introduction && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
              <div>
                <p className="text-xs font-bold text-sky-800 dark:text-sky-400 mb-1">
                  القسم أ · مقدمة الدرس وأهدافه
                </p>
                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed">
                  {normalizedLesson.introduction.overviewAr}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <h2 className="text-xs font-bold text-slate-900 dark:text-white mb-2">
                    الأهداف التعليمية
                  </h2>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {normalizedLesson.introduction.objectivesAr.map((obj, idx) => (
                      <li key={idx}>• {obj}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <h2 className="text-xs font-bold text-slate-900 dark:text-white mb-2">
                    المعرفة السابقة المطلوبة
                  </h2>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {normalizedLesson.introduction.prerequisitesAr.map((pre, idx) => (
                      <li key={idx}>• {pre}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <h2 className="text-xs font-bold text-slate-900 dark:text-white mb-2">
                    المفاهيم المحورية
                  </h2>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {normalizedLesson.introduction.keyConceptsAr.map((concept, idx) => (
                      <li key={idx}>• {concept}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* Section B: Detailed Explanation */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-8">
            <p className="text-xs font-bold text-sky-800 dark:text-sky-400">
              القسم ب · الشرح العلمي المفصل والرسوم والجداول
            </p>
            {normalizedLesson.sections.map((section, idx) => (
              <section
                key={section.id}
                className={
                  idx > 0 ? 'pt-8 border-t border-slate-200 dark:border-slate-800' : ''
                }
              >
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-3">
                  {idx + 1}. {section.titleAr}
                </h2>
                <p className="text-base text-slate-700 dark:text-slate-300 leading-8 max-w-4xl mb-4">
                  {section.contentAr}
                </p>

                {section.definitionsAr && section.definitionsAr.length > 0 && (
                  <div className="my-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      تعريفات علمية مهمة
                    </p>
                    <dl className="space-y-1.5 text-sm">
                      {section.definitionsAr.map((def, dIdx) => (
                        <div key={dIdx} className="leading-relaxed">
                          <dt className="inline font-bold text-sky-800 dark:text-sky-300">
                            {def.termAr}:{' '}
                          </dt>
                          <dd className="inline text-slate-700 dark:text-slate-300">
                            {def.definitionAr}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {section.lawsAr && section.lawsAr.length > 0 && (
                  <div className="my-4 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20 p-4 space-y-1.5">
                    <p className="text-xs font-bold text-sky-900 dark:text-sky-300">
                      القوانين والعلاقات الأساسية
                    </p>
                    <ul className="space-y-1 text-sm font-mono text-slate-800 dark:text-slate-200">
                      {section.lawsAr.map((law, lIdx) => (
                        <li key={lIdx} dir="ltr" className="text-right">
                          {law}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {section.tables &&
                  section.tables.map((tbl) => (
                    <div key={tbl.id} className="my-5 space-y-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {tbl.titleAr}
                      </p>
                      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-right text-xs sm:text-sm border-collapse">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                            <tr>
                              {tbl.headersAr.map((header, hIdx) => (
                                <th
                                  key={hIdx}
                                  className="px-4 py-2.5 font-bold border-b border-slate-200 dark:border-slate-700 whitespace-nowrap"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {tbl.rowsAr.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                {row.map((cell, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className="px-4 py-2.5 text-slate-700 dark:text-slate-300 leading-relaxed"
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {tbl.captionAr && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {tbl.captionAr}
                        </p>
                      )}
                    </div>
                  ))}

                {section.diagram && <LessonDiagram diagram={section.diagram} />}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <p className="text-xs font-bold text-sky-800 dark:text-sky-300 mb-1">
                      الاستنتاج الأساسي
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {section.keyTakeawayAr}
                    </p>
                  </div>

                  {section.examTipAr && (
                    <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">
                        تنبيه امتحاني (منهج عُمان)
                      </p>
                      <p className="text-sm text-slate-800 dark:text-amber-100 leading-relaxed">
                        {section.examTipAr}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Section C (Comprehensive Summary & Formulas) */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
            <div>
              <p className="text-xs font-bold text-sky-800 dark:text-sky-400 mb-1">
                القسم ج · الملخص الشامل والمراجعة السريعة
              </p>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                الملخص العلمي المفصل
              </h2>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-7">
              {normalizedLesson.comprehensiveSummary?.detailedSummaryAr ??
                normalizedLesson.summaryAr}
            </p>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                نقاط المراجعة السريعة
              </h3>
              <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                {(
                  normalizedLesson.comprehensiveSummary?.quickRevisionAr ??
                  normalizedLesson.keyPointsAr
                ).map((pt, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="font-mono text-xs font-bold text-sky-700 dark:text-sky-400 mt-1 tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="leading-relaxed">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {normalizedLesson.comprehensiveSummary &&
              normalizedLesson.comprehensiveSummary.keyTermsAr.length > 0 && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                    المصطلحات الأساسية
                  </h3>
                  <dl className="space-y-2 text-xs">
                    {normalizedLesson.comprehensiveSummary.keyTermsAr.map((term, tIdx) => (
                      <div key={tIdx} className="leading-relaxed">
                        <dt className="inline font-bold text-slate-900 dark:text-white">
                          {term.termAr}:{' '}
                        </dt>
                        <dd className="inline text-slate-600 dark:text-slate-300">
                          {term.definitionAr}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

            {normalizedLesson.comprehensiveSummary &&
              normalizedLesson.comprehensiveSummary.memorizePointsAr.length > 0 && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                    نقاط يجب تثبيتها قبل الاختبار
                  </h3>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {normalizedLesson.comprehensiveSummary.memorizePointsAr.map((mp, mIdx) => (
                      <li key={mIdx}>• {mp}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>

          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              القوانين والعلاقات الأساسية
            </h2>
            {normalizedLesson.keyFormulas.length === 0 ? (
              <p className="text-sm text-slate-500">لا توجد قوانين رياضية محددة لهذا الدرس.</p>
            ) : (
              <div className="space-y-4">
                {normalizedLesson.keyFormulas.map((formula, idx) => (
                  <div
                    key={idx}
                    className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formula.labelAr}
                      </span>
                      <span>الوحدة: {formula.unit}</span>
                    </div>
                    <div className="formula-ltr bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-4 py-2.5 text-sm font-semibold text-sky-900 dark:text-sky-300 overflow-x-auto">
                      {formula.expression}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {formula.variablesAr}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Section D (Solved Examples) */}
      {activeTab === 'examples' && (
        <div className="space-y-5">
          {normalizedLesson.solvedExamples.map((ex) => {
            const isExpanded = revealedExamples[ex.id] ?? true;
            const diffLabel = ex.difficulty ? EXAMPLE_DIFF_LABEL[ex.difficulty] : 'قياسي';
            return (
              <article
                key={ex.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                      <span>مثال محلول</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-sky-800 dark:text-sky-400">
                        المستوى: {diffLabel}
                      </span>
                    </div>
                    <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-2">
                      {ex.titleAr}
                    </h2>
                    <p className="text-base text-slate-800 dark:text-slate-200 leading-relaxed">
                      {ex.problemAr}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setRevealedExamples((prev) => ({
                        ...prev,
                        [ex.id]: !isExpanded,
                      }))
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
                  >
                    <span>{isExpanded ? 'إخفاء الحل' : 'إظهار الحل'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                        المعطيات:
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs font-mono text-slate-700 dark:text-slate-300">
                        {ex.givenAr.map((g, idx) => (
                          <span
                            key={idx}
                            className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        خطوات الحل:
                      </p>
                      <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                        {ex.stepsAr.map((step, sIdx) => (
                          <li key={sIdx} className="flex items-start gap-2.5">
                            <span className="font-mono text-xs font-bold text-sky-700 dark:text-sky-400 mt-1 tabular-nums">
                              {sIdx + 1}.
                            </span>
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3.5">
                      <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                        النتيجة النهائية
                      </p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {ex.finalAnswerAr}
                      </p>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Tab 4: Section E (Practice Exercises & Personal Notes) */}
      {activeTab === 'exercises' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              تمارين الدرس المتدرجة للتحقق الذاتي
            </h2>
            {normalizedLesson.exercises.map((item, idx) => {
              const showAns = Boolean(revealedExerciseAnswers[item.id]);
              const tierLabel = item.tier ? EXERCISE_TIER_LABEL[item.tier] : 'تمرين';
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>تمرين {idx + 1}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-sky-800 dark:text-sky-400">
                      المستوى: {tierLabel}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                    {item.promptAr}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>تلميح: {item.hintAr}</span>
                  </p>
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedExerciseAnswers((prev) => ({
                          ...prev,
                          [item.id]: !showAns,
                        }))
                      }
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {showAns ? 'إخفاء الإجابة النموذجية' : 'عرض الإجابة النموذجية'}
                    </button>
                  </div>
                  {showAns && (
                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                      الإجابة: {item.answerAr}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <form
            onSubmit={(e) => void handleSaveNotes(e)}
            className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 self-start"
          >
            <div>
              <label
                htmlFor="lesson-notes-textarea"
                className="block font-display text-lg font-bold text-slate-900 dark:text-white mb-1"
              >
                ملاحظاتك الشخصية على الدرس
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تُحفظ ملاحظاتك في حسابك للرجوع إليها في المراجعة النهائية.
              </p>
            </div>
            <textarea
              id="lesson-notes-textarea"
              rows={7}
              maxLength={4000}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="دوّن القوانين المهمة أو النقاط التي تحتاج لمراجعتها..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-2 focus:outline-sky-700"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {notesDraft.length}/4000
              </span>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>حفظ الملاحظات</span>
              </button>
            </div>
            {notesSavedNotice && (
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {notesSavedNotice}
              </p>
            )}
          </form>
        </div>
      )}

      {/* Tab 5: Section F (Lesson Review & Verified Sources) */}
      {activeTab === 'review' && normalizedLesson.review && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                أهم الخلاصات للاستذكار
              </h2>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {normalizedLesson.review.keyTakeawaysAr.map((tk, idx) => (
                  <li key={idx}>• {tk}</li>
                ))}
              </ul>
            </section>

            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
              <h2 className="font-display text-base font-bold text-rose-800 dark:text-rose-300">
                الأخطاء الشائعة في الامتحانات
              </h2>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {normalizedLesson.review.commonMistakesAr.map((err, idx) => (
                  <li key={idx}>• {err}</li>
                ))}
              </ul>
            </section>

            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
              <h2 className="font-display text-base font-bold text-emerald-800 dark:text-emerald-300">
                قائمة التحقق قبل الاختبار
              </h2>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {normalizedLesson.review.revisionChecklistAr.map((chk, idx) => (
                  <li key={idx}>✓ {chk}</li>
                ))}
              </ul>
            </section>
          </div>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              المصادر والمراجع المعتمدة للدرس
            </h2>
            {matchedSources.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                المرجع المسجل: {normalizedLesson.officialRef}
              </p>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {matchedSources.map((src) => {
                  const srcMeta = VERIFICATION_TEXT_MAP[src.verificationStatus];
                  return (
                    <div
                      key={src.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {src.titleAr}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {src.publisherAr} · إصدار{' '}
                          <span className="font-mono tabular-nums">{src.publicationYear}</span> ·{' '}
                          <span className={`font-semibold ${srcMeta.className}`}>
                            {srcMeta.labelAr}
                          </span>
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{src.notesAr}</p>
                      </div>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-sky-800 dark:text-sky-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                      >
                        <span>رابط المرجع</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Tab 6: Lesson Examination */}
      {activeTab === 'exam' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                اختبار تقييم الدرس
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                أسئلة مستمدة من بنك الأسئلة المركزي ومربوطة بأهداف هذا الدرس.
              </p>
            </div>
            {examResult && (
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-4 py-2 text-left">
                <p className="text-xs text-slate-500 dark:text-slate-400">النتيجة المحققة</p>
                <p className="font-mono text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  {examResult.scorePercent}% ({examResult.correctCount}/{examResult.totalQuestions})
                </p>
              </div>
            )}
          </div>

          {lessonQuestions.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              لا توجد أسئلة مضافة لهذا الدرس حتى الآن في بنك الأسئلة.
            </p>
          ) : (
            <form onSubmit={(e) => void handleExamSubmit(e)} className="space-y-6">
              {lessonQuestions.map((q, index) => {
                const graded = examResult?.breakdown.find((b) => b.questionId === q.id);
                return (
                  <div
                    key={q.id}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        سؤال {index + 1} · {q.marks} درجات
                      </span>
                      <span>
                        {q.questionType === 'mcq' ? 'اختيار من متعدد' : 'مسألة رقمية'}
                      </span>
                    </div>

                    <p className="text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                      {q.promptAr}
                    </p>

                    {q.questionType === 'mcq' && q.optionsAr ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {q.optionsAr.map((opt) => {
                          const selected = examAnswers[q.id] === opt;
                          return (
                            <label
                              key={opt}
                              className={`flex items-center gap-3 p-3 rounded-lg border text-sm cursor-pointer transition-colors ${
                                selected
                                  ? 'border-sky-700 bg-sky-50 text-sky-950 dark:bg-sky-950/50 dark:border-sky-500 dark:text-sky-100'
                                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`exam-${q.id}`}
                                value={opt}
                                checked={selected}
                                onChange={() =>
                                  setExamAnswers((prev) => ({ ...prev, [q.id]: opt }))
                                }
                                className="accent-sky-800"
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div>
                        <label
                          htmlFor={`input-${q.id}`}
                          className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5"
                        >
                          أدخل القيمة النهائية:
                        </label>
                        <input
                          id={`input-${q.id}`}
                          type="text"
                          value={examAnswers[q.id] ?? ''}
                          onChange={(e) =>
                            setExamAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          placeholder="مثال: 4 أو 2.8"
                          className="w-full sm:w-64 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-sm font-mono text-slate-900 dark:text-white"
                        />
                      </div>
                    )}

                    {graded && (
                      <div
                        className={`rounded-lg p-3.5 border text-sm space-y-1 ${
                          graded.isCorrect
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200'
                            : 'bg-rose-50 border-rose-200 text-rose-950 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-200'
                        }`}
                      >
                        <p className="font-bold">
                          {graded.isCorrect
                            ? 'إجابة صحيحة'
                            : `إجابة غير صحيحة — الإجابة الصحيحة: ${graded.correctAnswer}`}
                        </p>
                        <p className="text-xs leading-relaxed opacity-90">
                          {graded.explanationAr}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 cursor-pointer"
                >
                  تصحيح وحفظ نتيجة الاختبار
                </button>
                {examResult && (
                  <button
                    type="button"
                    onClick={() => {
                      setExamAnswers({});
                      setExamResult(null);
                    }}
                    className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    إعادة المحاولة
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
