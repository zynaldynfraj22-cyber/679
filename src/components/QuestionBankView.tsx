import React from 'react';
import {
  CheckCircle2,
  Clock,
  LogIn,
  Play,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
} from 'lucide-react';
import type {
  DifficultyLevel,
  ExamStartResponse,
  ExamSubmitResponse,
  GradedQuestionResult,
  Lesson,
  PublicQuestion,
  QuestionFilter,
  QuestionType,
  Semester,
  Subject,
  SubjectId,
  Unit,
} from '../types/curriculum';
import { filterQuestions } from '../utils/curriculumEngine';
import { DIFFICULTY_LABELS_AR, QUESTION_TYPE_LABELS_AR } from '../utils/questionEngine';
import {
  startExamSessionApi,
  startPracticeSessionApi,
  submitExamSessionApi,
  submitPracticeAnswerApi,
} from '../services/firestoreService';
import { QuestionRenderer } from './QuestionRenderer';
import { ExamResultsView } from './ExamResultsView';

interface QuestionBankViewProps {
  subjects: Subject[];
  units: Unit[];
  lessons: Lesson[];
  questions: PublicQuestion[];
  isAuthenticated: boolean;
  onSignIn: () => void;
  onServerAttemptRecorded: (response: ExamSubmitResponse) => void;
}

type BankMode = 'practice' | 'exam';

const PAGE_SIZE = 10;

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

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function QuestionBankView({
  subjects,
  units,
  lessons,
  questions,
  isAuthenticated,
  onSignIn,
  onServerAttemptRecorded,
}: QuestionBankViewProps) {
  const [mode, setMode] = React.useState<BankMode>('practice');
  const [filter, setFilter] = React.useState<QuestionFilter>({
    subjectId: 'all',
    unitId: 'all',
    lessonId: 'all',
    semester: 'all',
    difficulty: 'all',
    questionType: 'all',
    searchQuery: '',
  });
  const [page, setPage] = React.useState(1);

  // Practice mode state
  const [practiceSessionId, setPracticeSessionId] = React.useState<string | undefined>(undefined);
  const [practiceAnswers, setPracticeAnswers] = React.useState<Record<string, string>>({});
  const [practiceGraded, setPracticeGraded] = React.useState<
    Record<string, GradedQuestionResult>
  >({});
  const [checkingId, setCheckingId] = React.useState<string | null>(null);
  const [practiceNotice, setPracticeNotice] = React.useState<string | null>(null);

  // Timed exam mode state
  const [examSession, setExamSession] = React.useState<ExamStartResponse | null>(null);
  const [examAnswers, setExamAnswers] = React.useState<Record<string, string>>({});
  const [examResultResponse, setExamResultResponse] =
    React.useState<ExamSubmitResponse | null>(null);
  const [secondsRemaining, setSecondsRemaining] = React.useState<number>(0);
  const [examBusy, setExamBusy] = React.useState(false);
  const [examError, setExamError] = React.useState<string | null>(null);

  const filteredUnits = React.useMemo(() => {
    if (!filter.subjectId || filter.subjectId === 'all') return units;
    return units.filter((u) => u.subjectId === filter.subjectId);
  }, [units, filter.subjectId]);

  const filteredLessons = React.useMemo(() => {
    return lessons.filter((l) => {
      if (filter.subjectId && filter.subjectId !== 'all' && l.subjectId !== filter.subjectId) {
        return false;
      }
      if (filter.unitId && filter.unitId !== 'all' && l.unitId !== filter.unitId) {
        return false;
      }
      return true;
    });
  }, [lessons, filter.subjectId, filter.unitId]);

  const matchingQuestions = React.useMemo(
    () => filterQuestions(questions, filter),
    [questions, filter]
  );

  const totalPages = Math.max(1, Math.ceil(matchingQuestions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedQuestions = React.useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return matchingQuestions.slice(start, start + PAGE_SIZE);
  }, [matchingQuestions, safePage]);

  React.useEffect(() => {
    setPage(1);
  }, [
    filter.subjectId,
    filter.unitId,
    filter.lessonId,
    filter.semester,
    filter.difficulty,
    filter.questionType,
    filter.searchQuery,
  ]);

  // Countdown timer for active exam session
  React.useEffect(() => {
    if (!examSession || examResultResponse) return;
    if (secondsRemaining <= 0) return;
    const id = window.setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [examSession, examResultResponse, secondsRemaining]);

  // Persist exam draft answers locally while exam is running
  React.useEffect(() => {
    if (!examSession || examResultResponse) return;
    try {
      window.localStorage.setItem(
        `studycore_exam_draft_${examSession.sessionId}`,
        JSON.stringify(examAnswers)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [examSession, examAnswers, examResultResponse]);

  const resetFilters = () => {
    setFilter({
      subjectId: 'all',
      unitId: 'all',
      lessonId: 'all',
      semester: 'all',
      difficulty: 'all',
      questionType: 'all',
      searchQuery: '',
    });
    setPage(1);
  };

  const handleCheckSinglePractice = async (q: PublicQuestion) => {
    if (!isAuthenticated) {
      setPracticeNotice('سجّل دخولك أولاً للتحقق من الإجابة على الخادم وحفظ سجل تدريبك.');
      return;
    }

    const answer = practiceAnswers[q.id] ?? '';
    if (!answer.trim()) {
      setPracticeNotice('أدخل إجابتك أولاً قبل الضغط على التحقق.');
      return;
    }

    setPracticeNotice(null);
    setCheckingId(q.id);
    try {
      let sid = practiceSessionId;
      if (!sid) {
        const started = await startPracticeSessionApi({
          subjectId: filter.subjectId ?? 'all',
          unitId: filter.unitId ?? 'all',
          lessonId: filter.lessonId ?? 'all',
          semester: filter.semester ?? 'all',
          difficulty: filter.difficulty ?? 'all',
          questionType: filter.questionType ?? 'all',
          limit: 20,
        });
        sid = started.sessionId;
        setPracticeSessionId(sid);
      }

      const graded = await submitPracticeAnswerApi({
        sessionId: sid,
        questionId: q.id,
        answer,
      });

      setPracticeGraded((prev) => ({
        ...prev,
        [q.id]: {
          questionId: q.id,
          questionType: q.questionType,
          difficulty: q.difficulty,
          learningObjectiveId: q.learningObjectiveId,
          isCorrect: graded.isCorrect,
          needsManualGrading: graded.needsManualGrading,
          userAnswer: answer,
          correctAnswer: graded.correctAnswer,
          earnedMarks: graded.earnedMarks,
          maxMarks: graded.maxMarks,
          explanationAr: graded.explanationAr,
          whyCorrectAr: graded.whyCorrectAr,
          solutionStepsAr: graded.solutionStepsAr,
          commonMistakeAr: graded.commonMistakeAr,
          rubricAr: graded.rubricAr,
        },
      }));
    } catch (err) {
      setPracticeNotice(
        err instanceof Error ? err.message : 'تعذر تصحيح السؤال على الخادم حالياً.'
      );
    } finally {
      setCheckingId(null);
    }
  };

  const handleStartTimedExam = async () => {
    if (!isAuthenticated) {
      setExamError('يرجى تسجيل الدخول لبدء اختبار مؤقت ومصحح على الخادم.');
      return;
    }
    setExamError(null);
    setExamBusy(true);
    try {
      const subjectLabel =
        filter.subjectId && filter.subjectId !== 'all'
          ? subjects.find((s) => s.id === filter.subjectId)?.titleAr ?? 'بنك الأسئلة'
          : 'بنك الأسئلة الشامل';
      const started = await startExamSessionApi({
        mode: 'question_bank',
        titleAr: `اختبار تدريبي من ${subjectLabel}`,
        subjectId: filter.subjectId ?? 'all',
        unitIds: filter.unitId && filter.unitId !== 'all' ? [filter.unitId] : [],
        lessonIds: filter.lessonId && filter.lessonId !== 'all' ? [filter.lessonId] : [],
        semester: filter.semester ?? 'all',
        difficulty: filter.difficulty ?? 'all',
        questionType: filter.questionType ?? 'all',
        questionCount: Math.min(15, Math.max(1, matchingQuestions.length)),
        durationMinutes: Math.max(10, Math.min(45, matchingQuestions.length * 2)),
        passingScorePercent: 60,
        randomizeOrder: true,
      });
      setExamSession(started);
      setExamAnswers({});
      setExamResultResponse(null);
      setSecondsRemaining(started.durationSeconds);
    } catch (err) {
      setExamError(
        err instanceof Error ? err.message : 'تعذر بدء جلسة الاختبار على الخادم.'
      );
    } finally {
      setExamBusy(false);
    }
  };

  const handleSubmitTimedExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examSession) return;
    setExamError(null);
    setExamBusy(true);
    try {
      const response = await submitExamSessionApi({
        sessionId: examSession.sessionId,
        answers: examAnswers,
      });
      setExamResultResponse(response);
      onServerAttemptRecorded(response);
      try {
        window.localStorage.removeItem(`studycore_exam_draft_${examSession.sessionId}`);
      } catch {
        // Ignore storage cleanup error
      }
    } catch (err) {
      setExamError(
        err instanceof Error ? err.message : 'تعذر تسليم الاختبار على الخادم.'
      );
    } finally {
      setExamBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
              بنك الأسئلة المركزي المعتمد
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              الأسئلة المعتمدة للطلبة فقط عبر المستويات الخمسة وجميع الأنماط الـ ١٢، مع تصحيح
              آمن على الخادم.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              role="tablist"
              aria-label="وضع بنك الأسئلة"
              className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'practice'}
                onClick={() => setMode('practice')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'practice'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                تدريب فوري (سؤال بسؤال)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'exam'}
                onClick={() => setMode('exam')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'exam'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                اختبار مؤقت ومعتمد
              </button>
            </div>

            <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
              <span>المطابقة: </span>
              <span className="font-mono">{matchingQuestions.length}</span>
              <span> / </span>
              <span className="font-mono">{questions.length}</span>
            </div>
          </div>
        </div>

        {/* Multi-dimensional filter controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label
              htmlFor="qb-subject"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              المادة
            </label>
            <select
              id="qb-subject"
              value={filter.subjectId ?? 'all'}
              onChange={(e) =>
                setFilter((prev) => ({
                  ...prev,
                  subjectId: e.target.value as SubjectId | 'all',
                  unitId: 'all',
                  lessonId: 'all',
                }))
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="all">جميع المواد</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.titleAr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="qb-unit"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              الوحدة
            </label>
            <select
              id="qb-unit"
              value={filter.unitId ?? 'all'}
              onChange={(e) =>
                setFilter((prev) => ({
                  ...prev,
                  unitId: e.target.value,
                  lessonId: 'all',
                }))
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="all">جميع الوحدات</option>
              {filteredUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  الوحدة {u.unitNumber}: {u.titleAr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="qb-lesson"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              الدرس
            </label>
            <select
              id="qb-lesson"
              value={filter.lessonId ?? 'all'}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, lessonId: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="all">جميع الدروس</option>
              {filteredLessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.titleAr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="qb-semester"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              الفصل الدراسي
            </label>
            <select
              id="qb-semester"
              value={String(filter.semester ?? 'all')}
              onChange={(e) =>
                setFilter((prev) => ({
                  ...prev,
                  semester:
                    e.target.value === 'all' ? 'all' : (Number(e.target.value) as Semester),
                }))
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="all">الفصلان</option>
              <option value="1">الفصل الأول</option>
              <option value="2">الفصل الثاني</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="qb-difficulty"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              مستوى الصعوبة (٥ مستويات)
            </label>
            <select
              id="qb-difficulty"
              value={filter.difficulty ?? 'all'}
              onChange={(e) =>
                setFilter((prev) => ({
                  ...prev,
                  difficulty: e.target.value as DifficultyLevel | 'all',
                }))
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="all">كل المستويات (٥)</option>
              {DIFFICULTY_OPTIONS.map((diff) => (
                <option key={diff} value={diff}>
                  {DIFFICULTY_LABELS_AR[diff]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="qb-type"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              نوع السؤال (١٢ نمطاً)
            </label>
            <select
              id="qb-type"
              value={filter.questionType ?? 'all'}
              onChange={(e) =>
                setFilter((prev) => ({
                  ...prev,
                  questionType: e.target.value as QuestionType | 'all',
                }))
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="all">كل الأنواع (١٢)</option>
              {QUESTION_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {QUESTION_TYPE_LABELS_AR[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="بحث في نص الأسئلة"
              value={filter.searchQuery ?? ''}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, searchQuery: e.target.value }))
              }
              placeholder="ابحث بكلمة مفتاحية (مثال: الجاذبية، كولوم، الاتزان، التكامل)..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pr-9 pl-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة ضبط التصفية</span>
          </button>
        </div>

        {!isAuthenticated && (
          <div className="rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-sky-950 dark:text-sky-200">
              يتم تصحيح الأسئلة والاختبارات على الخادم لحفظ الإجابات النموذجية. سجّل دخولك بحساب
              جوجل لتفعيل التصحيح الفوري وحفظ نتائجك.
            </p>
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>تسجيل الدخول</span>
            </button>
          </div>
        )}
      </div>

      {/* Mode A: Practice Mode */}
      {mode === 'practice' && (
        <>
          {practiceNotice && (
            <div
              role="alert"
              className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3.5 text-xs text-amber-950 dark:text-amber-200"
            >
              {practiceNotice}
            </div>
          )}

          {matchingQuestions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                لا توجد أسئلة معتمدة مطابقة لمعايير البحث الحالية.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 cursor-pointer"
              >
                عرض جميع الأسئلة المعتمدة
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedQuestions.map((q, idx) => {
                const subj = subjects.find((s) => s.id === q.subjectId);
                const globalIndex = (safePage - 1) * PAGE_SIZE + idx;
                const graded = practiceGraded[q.id];
                return (
                  <div key={q.id} className="space-y-2">
                    <QuestionRenderer
                      question={q}
                      index={globalIndex}
                      subjectTitleAr={subj?.titleAr}
                      answer={practiceAnswers[q.id] ?? ''}
                      onChangeAnswer={(val) =>
                        setPracticeAnswers((prev) => ({ ...prev, [q.id]: val }))
                      }
                      gradedResult={graded}
                      fieldPrefix="prac"
                    />
                    <div className="flex items-center justify-end gap-2 px-1">
                      <button
                        type="button"
                        disabled={checkingId === q.id}
                        onClick={() => void handleCheckSinglePractice(q)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {checkingId === q.id ? 'جاري التصحيح...' : 'تحقق من الإجابة'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3.5 py-1.5 font-semibold rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                  >
                    الصفحة السابقة
                  </button>
                  <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    صفحة {safePage} من {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3.5 py-1.5 font-semibold rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                  >
                    الصفحة التالية
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Mode B: Timed Server-Verified Exam Mode */}
      {mode === 'exam' && (
        <div className="space-y-5">
          {!examSession ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-800 dark:text-sky-400">
                <ShieldCheck className="w-4 h-4" />
                <span>جلسة اختبار محمية ومصححة على الخادم</span>
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                توليد اختبار مؤقت من الأسئلة المطابقة ({Math.min(15, matchingQuestions.length)}{' '}
                أسئلة)
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                عند بدء الاختبار، يُنشئ الخادم جلسة موثقة بوقت محدد ولا تظهر الإجابات النموذجية أو
                الشروحات إلا بعد التسليم النهائي.
              </p>

              {examError && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-900 dark:text-rose-200"
                >
                  {examError}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={examBusy || matchingQuestions.length === 0 || !isAuthenticated}
                  onClick={() => void handleStartTimedExam()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>{examBusy ? 'جاري تجهيز الجلسة...' : 'بدء الاختبار الآن'}</span>
                </button>
                {!isAuthenticated && (
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>سجّل دخولك لبدء الاختبار</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Active Exam Header Bar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    {examSession.titleAr}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    عدد الأسئلة: {examSession.questions.length} · درجة النجاح:{' '}
                    {examSession.passingScorePercent}%
                  </p>
                </div>

                {!examResultResponse && (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    <Clock className="w-4 h-4 text-sky-700 dark:text-sky-400" />
                    <span>{formatTimer(secondsRemaining)}</span>
                  </div>
                )}
              </div>

              {examError && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-900 dark:text-rose-200"
                >
                  {examError}
                </div>
              )}

              {examResultResponse && (
                <ExamResultsView
                  titleAr={examSession.titleAr}
                  result={examResultResponse.result}
                  persistedToFirestore={examResultResponse.persistedToFirestore}
                  persistenceNoticeAr={examResultResponse.persistenceNoticeAr}
                  onRetry={() => {
                    setExamSession(null);
                    setExamResultResponse(null);
                    setExamAnswers({});
                  }}
                />
              )}

              <form onSubmit={(e) => void handleSubmitTimedExam(e)} className="space-y-4">
                {examSession.questions.map((q, idx) => {
                  const subj = subjects.find((s) => s.id === q.subjectId);
                  const graded = examResultResponse?.result.breakdown.find(
                    (b) => b.questionId === q.id
                  );
                  return (
                    <QuestionRenderer
                      key={q.id}
                      question={q}
                      index={idx}
                      subjectTitleAr={subj?.titleAr}
                      answer={examAnswers[q.id] ?? ''}
                      onChangeAnswer={(val) =>
                        setExamAnswers((prev) => ({ ...prev, [q.id]: val }))
                      }
                      disabled={Boolean(examResultResponse)}
                      gradedResult={graded}
                      fieldPrefix="qb-exam"
                    />
                  );
                })}

                {!examResultResponse && (
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={examBusy}
                      className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {examBusy ? 'جاري التصحيح على الخادم...' : 'تسليم وتصحيح الاختبار'}
                      </span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
