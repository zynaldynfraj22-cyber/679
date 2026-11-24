import React from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, Bookmark, Sparkles, Database } from 'lucide-react';
import type {
  ExamAttempt,
  Lesson,
  LessonProgress,
  Semester,
  Subject,
  SubjectId,
} from '../types/curriculum';
import { computeOverallDashboardMetrics } from '../utils/curriculumEngine';

interface DashboardViewProps {
  subjects: Subject[];
  lessons: Lesson[];
  progressMap: Record<string, LessonProgress>;
  attempts: ExamAttempt[];
  activeSemester: Semester | 'all';
  onChangeSemester: (sem: Semester | 'all') => void;
  onOpenSubject: (subjectId: SubjectId) => void;
  onOpenLesson: (lesson: Lesson) => void;
  onOpenQuestionBank: () => void;
  onOpenTutor: () => void;
  questionCount: number;
  isAdminUser: boolean;
  onSeedFirestore?: () => Promise<void>;
  seedingStatus?: string | null;
}

export function DashboardView({
  subjects,
  lessons,
  progressMap,
  attempts,
  activeSemester,
  onChangeSemester,
  onOpenSubject,
  onOpenLesson,
  onOpenQuestionBank,
  onOpenTutor,
  questionCount,
  isAdminUser,
  onSeedFirestore,
  seedingStatus,
}: DashboardViewProps) {
  const [heroImgFailed, setHeroImgFailed] = React.useState(false);
  const metrics = React.useMemo(
    () => computeOverallDashboardMetrics(subjects, lessons, progressMap, attempts),
    [subjects, lessons, progressMap, attempts]
  );

  const recommendedSubject = subjects.find(
    (s) => s.id === metrics.recommendedLesson?.subjectId
  );

  const bookmarkedLessons = React.useMemo(
    () => lessons.filter((l) => progressMap[l.id]?.bookmarked),
    [lessons, progressMap]
  );

  return (
    <div className="space-y-10">
      {/* Hero Split Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
              <span>سلطنة عُمان · وزارة التربية والتعليم</span>
              <span aria-hidden="true">·</span>
              <span>الصف الثاني عشر العلمي (2026–2027)</span>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight mb-4">
              بوابتك المركزية لإتقان مواد المسار العلمي
            </h1>

            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mb-6">
              منهج عُماني مُهيأ مركزياً بالكامل يجمع الشرح المفصل، الملخصات السريعة، الأمثلة
              المحلولة، وبنك الأسئلة المعتمد مع معلم ذكي تفاعلي دون الحاجة لرفع أي ملفات.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            {metrics.recommendedLesson && (
              <button
                type="button"
                onClick={() => onOpenLesson(metrics.recommendedLesson!)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors cursor-pointer max-w-full whitespace-nowrap"
              >
                <span className="truncate">
                  متابعة الدرس: {metrics.recommendedLesson.titleAr}
                </span>
                <ArrowLeft className="w-4 h-4 shrink-0" />
              </button>
            )}
            <button
              type="button"
              onClick={onOpenQuestionBank}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span>استعراض بنك الأسئلة ({questionCount})</span>
            </button>
            <button
              type="button"
              onClick={onOpenTutor}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-sky-700 dark:text-sky-400" />
              <span>اسأل المعلم الذكي</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 min-h-[240px] bg-slate-900">
          {!heroImgFailed ? (
            <img
              src="/src/assets/images/hero_study_core_1795515795829.jpg"
              alt="مكتب دراسي علمي حديث في سلطنة عُمان"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="w-full h-full object-cover lg:h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-sky-950 p-8">
              <BookOpen className="w-12 h-12 text-sky-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent flex flex-col justify-end p-6">
            <p className="text-xs font-medium text-sky-200 mb-1">
              {recommendedSubject ? `${recommendedSubject.titleAr} · ${recommendedSubject.code}` : 'المسار العلمي'}
            </p>
            <p className="font-display text-lg font-bold text-white leading-snug">
              {metrics.recommendedLesson
                ? metrics.recommendedLesson.titleAr
                : 'منهج دبلوم التعليم العام 2026–2027'}
            </p>
          </div>
        </div>
      </section>

      {/* Full-width 4-Column KPI Strip */}
      <section aria-label="مؤشرات التقدم الدراسي" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            نسبة إنجاز المنهج
          </p>
          <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {metrics.overallCompletionPercent}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {metrics.completedLessons} من {metrics.totalLessons} درساً معتمداً
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            متوسط درجات الاختبارات
          </p>
          <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {metrics.overallMasteryScore}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {metrics.totalAttempts} محاولة تقييم مسجلة
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            بنك الأسئلة المركزي
          </p>
          <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {questionCount}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            سؤال مصنّف حسب الدرس والصعوبة
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            الدروس المحفوظة للمراجعة
          </p>
          <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {metrics.bookmarkedCount}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            جاهزة للوصول السريع قبل الاختبار
          </p>
        </div>
      </section>

      {/* Core Subjects Section */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              المواد الدراسية الأساسية
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              اختر المادة لاستعراض الوحدات والدروس المقررة في الفصلين الأول والثاني.
            </p>
          </div>

          <div
            role="group"
            aria-label="تصفية حسب الفصل الدراسي"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg self-start"
          >
            {[
              { value: 'all' as const, label: 'الفصلان' },
              { value: 1 as const, label: 'الفصل الأول' },
              { value: 2 as const, label: 'الفصل الثاني' },
            ].map((tab) => (
              <button
                key={String(tab.value)}
                type="button"
                onClick={() => onChangeSemester(tab.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeSemester === tab.value
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subjects.map((subject) => {
            const subjSummary = metrics.subjectSummaries[subject.id];
            const filteredLessonsCount =
              activeSemester === 'all'
                ? lessons.filter((l) => l.subjectId === subject.id).length
                : lessons.filter(
                    (l) => l.subjectId === subject.id && l.semester === activeSemester
                  ).length;

            return (
              <article
                key={subject.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 h-full">
                  <div className="sm:col-span-5 relative min-h-[170px] bg-slate-900">
                    <img
                      src={subject.imageUrl}
                      alt={subject.titleAr}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="sm:col-span-7 p-5 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5 tabular-nums">
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {subject.code}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{subject.totalUnits} وحدات</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {filteredLessonsCount} درساً متاحاً (من {subject.totalLessons} رسمياً)
                        </span>
                      </div>

                      <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-2">
                        {subject.titleAr}
                      </h3>

                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                        {subject.descriptionAr}
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                        <span>
                          الإنجاز: {subjSummary?.completedLessons ?? 0} /{' '}
                          {subjSummary?.totalLessons ?? 0}
                        </span>
                        <span className="font-mono font-semibold">
                          {subjSummary?.completionPercent ?? 0}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-300 rounded-full"
                          style={{
                            width: `${subjSummary?.completionPercent ?? 0}%`,
                            backgroundColor: subject.accentColor,
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenSubject(subject.id)}
                        className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors cursor-pointer"
                      >
                        <span>دخول مادة {subject.titleAr}</span>
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Bookmarks & Recent Activity Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              الدروس المحفوظة للمراجعة
            </h2>
            <Bookmark className="w-4 h-4 text-slate-400" />
          </div>

          {bookmarkedLessons.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
              لم تحفظ أي درس بعد. يمكنك حفظ الدروس المهمة من داخل قارئ الدرس للرجوع إليها سريعاً.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {bookmarkedLessons.slice(0, 5).map((lesson) => (
                <li key={lesson.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {lesson.titleAr}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {subjects.find((s) => s.id === lesson.subjectId)?.titleAr} · الفصل{' '}
                      {lesson.semester === 1 ? 'الأول' : 'الثاني'}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`فتح درس: ${lesson.titleAr}`}
                    onClick={() => onOpenLesson(lesson)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    فتح الدرس
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              أحدث نتائج الاختبارات
            </h2>
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
          </div>

          {attempts.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
              لا توجد محاولات اختبار مسجلة بعد. ابدأ بأحد اختبارات الدروس أو بنك الأسئلة.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {attempts.slice(0, 5).map((att) => {
                const subj = subjects.find((s) => s.id === att.subjectId);
                return (
                  <li key={att.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {att.mode === 'lesson_exam' ? 'اختبار درس' : 'تدريب بنك الأسئلة'} ·{' '}
                        {subj?.titleAr ?? att.subjectId}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {att.correctCount} من {att.totalQuestions} إجابات صحيحة
                      </p>
                    </div>
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                      {att.scorePercent}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Admin Central Curriculum Sync (only visible to verified admin email) */}
      {isAdminUser && onSeedFirestore && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                إدارة المحتوى المركزي (صلاحية المشرف)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                مزامنة المواد والوحدات والدروس وبنك الأسئلة العُماني المعتمد إلى Cloud Firestore.
                {seedingStatus ? ` — ${seedingStatus}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void onSeedFirestore()}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            نشر المنهج إلى Firestore
          </button>
        </section>
      )}
    </div>
  );
}
