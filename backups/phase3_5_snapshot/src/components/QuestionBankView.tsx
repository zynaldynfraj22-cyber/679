import React from 'react';
import { CheckCircle2, RotateCcw, Search } from 'lucide-react';
import type {
  AssessmentResult,
  DifficultyLevel,
  Lesson,
  Question,
  QuestionFilter,
  QuestionType,
  Semester,
  Subject,
  SubjectId,
  Unit,
} from '../types/curriculum';
import { filterQuestions, gradeAssessment } from '../utils/curriculumEngine';

interface QuestionBankViewProps {
  subjects: Subject[];
  units: Unit[];
  lessons: Lesson[];
  questions: Question[];
  onRecordBankAttempt: (subjectId: SubjectId, result: AssessmentResult) => Promise<void>;
}

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  foundation: 'تأسيسي',
  intermediate: 'متوسط',
  advanced: 'متقدم',
  olympiad: 'قدرات عليا',
};

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'اختيار من متعدد',
  numeric: 'مسألة رقمية',
  short_answer: 'إجابة قصيرة',
};

export function QuestionBankView({
  subjects,
  units,
  lessons,
  questions,
  onRecordBankAttempt,
}: QuestionBankViewProps) {
  const [filter, setFilter] = React.useState<QuestionFilter>({
    subjectId: 'all',
    unitId: 'all',
    lessonId: 'all',
    semester: 'all',
    difficulty: 'all',
    questionType: 'all',
    searchQuery: '',
  });
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [result, setResult] = React.useState<AssessmentResult | null>(null);

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

  const handleGradeAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (matchingQuestions.length === 0) return;
    const graded = gradeAssessment(matchingQuestions, answers);
    setResult(graded);
    const primarySubject =
      filter.subjectId && filter.subjectId !== 'all'
        ? filter.subjectId
        : matchingQuestions[0].subjectId;
    await onRecordBankAttempt(primarySubject, graded);
  };

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
    setAnswers({});
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
              بنك الأسئلة المركزي
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              مجموعة أسئلة مصنفة حسب المادة والوحدة والدرس ومستوى الصعوبة ونوع السؤال وفق منهج
              سلطنة عُمان.
            </p>
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
            <span>النتائج المطابقة: </span>
            <span className="font-mono">{matchingQuestions.length}</span>
            <span> من </span>
            <span className="font-mono">{questions.length}</span>
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
              مستوى الصعوبة
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
              <option value="all">كل المستويات</option>
              <option value="foundation">تأسيسي</option>
              <option value="intermediate">متوسط</option>
              <option value="advanced">متقدم</option>
              <option value="olympiad">قدرات عليا</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="qb-type"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              نوع السؤال
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
              <option value="all">كل الأنواع</option>
              <option value="mcq">اختيار من متعدد</option>
              <option value="numeric">مسألة رقمية</option>
              <option value="short_answer">إجابة قصيرة</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
      </div>

      {result && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                تم تصحيح مجموعة التدريب وحفظ المحاولة
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                الإجابات الصحيحة: {result.correctCount} من {result.totalQuestions} · الدرجات:{' '}
                {result.earnedMarks} / {result.totalMarks}
              </p>
            </div>
          </div>
          <div className="font-mono text-2xl font-extrabold text-sky-800 dark:text-sky-400 tabular-nums">
            {result.scorePercent}%
          </div>
        </div>
      )}

      {matchingQuestions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            لا توجد أسئلة مطابقة لمعايير البحث الحالية.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 cursor-pointer"
          >
            عرض جميع الأسئلة
          </button>
        </div>
      ) : (
        <form onSubmit={(e) => void handleGradeAll(e)} className="space-y-4">
          {matchingQuestions.map((q, index) => {
            const subj = subjects.find((s) => s.id === q.subjectId);
            const graded = result?.breakdown.find((b) => b.questionId === q.id);

            return (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      #{index + 1}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{subj?.titleAr ?? q.subjectId}</span>
                    <span aria-hidden="true">·</span>
                    <span>{DIFFICULTY_LABELS[q.difficulty]}</span>
                    <span aria-hidden="true">·</span>
                    <span>{TYPE_LABELS[q.questionType]}</span>
                  </div>
                  <span className="font-mono tabular-nums">{q.marks} درجات</span>
                </div>

                <p className="text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                  {q.promptAr}
                </p>

                {q.questionType === 'mcq' && q.optionsAr ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.optionsAr.map((opt) => {
                      const selected = answers[q.id] === opt;
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
                            name={`qb-${q.id}`}
                            value={opt}
                            checked={selected}
                            onChange={() =>
                              setAnswers((prev) => ({ ...prev, [q.id]: opt }))
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
                    <input
                      type="text"
                      aria-label={`إجابة السؤال ${index + 1}`}
                      value={answers[q.id] ?? ''}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      placeholder="اكتب الإجابة النهائية..."
                      className="w-full sm:w-72 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-sm font-mono text-slate-900 dark:text-white"
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

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 cursor-pointer"
            >
              تصحيح جميع الأسئلة المعروضة
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
