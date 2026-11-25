import React from 'react';
import { ArrowLeft, ArrowRight, Bookmark, CheckCircle2, Clock, FileText } from 'lucide-react';
import type {
  Lesson,
  LessonProgress,
  PublicQuestion,
  Semester,
  Subject,
  SubjectId,
  Unit,
} from '../types/curriculum';
import { computeSubjectProgress } from '../utils/curriculumEngine';

interface SubjectExplorerProps {
  subjects: Subject[];
  units: Unit[];
  lessons: Lesson[];
  questions: PublicQuestion[];
  selectedSubjectId: SubjectId;
  onSelectSubject: (id: SubjectId) => void;
  activeSemester: Semester | 'all';
  onChangeSemester: (sem: Semester | 'all') => void;
  progressMap: Record<string, LessonProgress>;
  onOpenLesson: (lesson: Lesson) => void;
  onBackDashboard: () => void;
}

export function SubjectExplorer({
  subjects,
  units,
  lessons,
  questions,
  selectedSubjectId,
  onSelectSubject,
  activeSemester,
  onChangeSemester,
  progressMap,
  onOpenLesson,
  onBackDashboard,
}: SubjectExplorerProps) {
  const subject = subjects.find((s) => s.id === selectedSubjectId) ?? subjects[0];
  const subjSummary = React.useMemo(
    () => computeSubjectProgress(subject.id, lessons, progressMap),
    [subject.id, lessons, progressMap]
  );

  const visibleUnits = React.useMemo(
    () =>
      units
        .filter(
          (u) =>
            u.subjectId === subject.id &&
            (activeSemester === 'all' || u.semester === activeSemester)
        )
        .sort((a, b) => a.unitNumber - b.unitNumber),
    [units, subject.id, activeSemester]
  );

  return (
    <div className="space-y-8">
      {/* Subject Selector Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackDashboard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>لوحة الطالب</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            المواد الدراسية
          </span>
        </div>

        <div
          role="tablist"
          aria-label="اختيار المادة الدراسية"
          className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
        >
          {subjects.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === subject.id}
              onClick={() => onSelectSubject(s.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                s.id === subject.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {s.titleAr}
            </button>
          ))}
        </div>
      </div>

      {/* Subject Overview Header */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2 tabular-nums">
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                {subject.code}
              </span>
              <span aria-hidden="true">·</span>
              <span>الصف الثاني عشر العلمي</span>
              <span aria-hidden="true">·</span>
              <span>{subjSummary.totalLessons} دروس معتمدة</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-3">
              {subject.titleAr}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              {subject.descriptionAr}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-6 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
              <span>
                المكتمل:{' '}
                <strong className="text-slate-900 dark:text-white font-mono">
                  {subjSummary.completedLessons}/{subjSummary.totalLessons}
                </strong>
              </span>
              <span>
                نسبة الإنجاز:{' '}
                <strong className="text-slate-900 dark:text-white font-mono">
                  {subjSummary.completionPercent}%
                </strong>
              </span>
              <span>
                متوسط التقييم:{' '}
                <strong className="text-slate-900 dark:text-white font-mono">
                  {subjSummary.averageScore}%
                </strong>
              </span>
            </div>

            <div
              role="group"
              aria-label="الفصل الدراسي"
              className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
            >
              {[
                { value: 'all' as const, label: 'كامل المنهج' },
                { value: 1 as const, label: 'الفصل الأول' },
                { value: 2 as const, label: 'الفصل الثاني' },
              ].map((tab) => (
                <button
                  key={String(tab.value)}
                  type="button"
                  onClick={() => onChangeSemester(tab.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeSemester === tab.value
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 min-h-[200px] bg-slate-900">
          <img
            src={subject.imageUrl}
            alt={subject.titleAr}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* Units & Lessons List */}
      <section className="space-y-6">
        {visibleUnits.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              لا توجد وحدات مطابقة للفصل الدراسي المحدد.
            </p>
          </div>
        ) : (
          visibleUnits.map((unit) => {
            const unitLessons = lessons
              .filter((l) => l.unitId === unit.id && l.isPublished)
              .sort((a, b) => a.order - b.order);

            return (
              <div
                key={unit.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
              >
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                    <span>الوحدة {unit.unitNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span>{unit.semester === 1 ? 'الفصل الأول' : 'الفصل الثاني'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{unitLessons.length} دروس</span>
                  </div>

                  <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {unit.titleAr}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                    {unit.summaryAr}
                  </p>

                  {unit.objectivesAr.length > 0 && (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      {unit.objectivesAr.map((obj, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-sky-700 dark:text-sky-400 font-bold">•</span>
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {unitLessons.length === 0 ? (
                  <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
                    سيتم إضافة دروس تفصيلية إضافية لهذه الوحدة ضمن التحديثات القادمة.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {unitLessons.map((lesson) => {
                      const prog = progressMap[lesson.id];
                      const lessonQCount = questions.filter(
                        (q) => q.lessonId === lesson.id
                      ).length;
                      const isCompleted = prog?.status === 'completed';

                      return (
                        <div
                          key={lesson.id}
                          className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span className="font-semibold tabular-nums">
                                الدرس {lesson.order}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 tabular-nums">
                                <Clock className="w-3.5 h-3.5" />
                                {lesson.estimatedMinutes} دقيقة
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 tabular-nums">
                                <FileText className="w-3.5 h-3.5" />
                                {lessonQCount} أسئلة تقييم
                              </span>
                              {isCompleted && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    مكتمل
                                  </span>
                                </>
                              )}
                              {prog?.bookmarked && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
                                    <Bookmark className="w-3.5 h-3.5" />
                                    محفوظ
                                  </span>
                                </>
                              )}
                            </div>

                            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                              {lesson.titleAr}
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 max-w-2xl">
                              {lesson.summaryAr}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {prog && prog.bestExamScore > 0 && (
                              <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                                أفضل نتيجة: {prog.bestExamScore}%
                              </span>
                            )}
                            <button
                              type="button"
                              aria-label={`فتح درس: ${lesson.titleAr}`}
                              onClick={() => onOpenLesson(lesson)}
                              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <span>فتح الدرس</span>
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
