import React from 'react';
import { Subject, Lesson, LessonProgress, ExamAttempt } from '../types/curriculum';
import { BookOpen, Award, CheckCircle2, Clock, ArrowLeft, Sparkles, Play } from 'lucide-react';

interface RedesignedDashboardProps {
  subjects: Subject[];
  lessons: Lesson[];
  progressMap: Record<string, LessonProgress>;
  attempts: ExamAttempt[];
  onOpenSubject: (subjectId: string) => void;
  onOpenLesson: (lesson: Lesson) => void;
  onOpenQuestionBank: () => void;
  onNavigateRoute: (route: string) => void;
  displayName?: string;
}

export const RedesignedDashboard: React.FC<RedesignedDashboardProps> = ({
  subjects,
  lessons,
  progressMap,
  attempts,
  onOpenSubject,
  onOpenLesson,
  onOpenQuestionBank,
  onNavigateRoute,
  displayName,
}) => {
  const completedLessonsCount = Object.values(progressMap).filter((p) => p.status === 'completed').length;
  const inProgressLessonsCount = Object.values(progressMap).filter((p) => p.status === 'in_progress').length;

  // Find last active lesson or default to first lesson
  const lastActiveLesson = lessons[0];

  return (
    <div className="space-y-8 pb-16 animate-fadeIn">
      {/* 1. Greeting Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-emerald-500/30 text-emerald-200 text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/30">
              العام الدراسي 2026–2027 · سلطنة عُمان
            </span>
            <span className="text-xs text-slate-300">الصف الثاني عشر (المسار العلمي)</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-3">
            مرحباً بك، {displayName ?? 'الطالب المتميز'}
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base leading-relaxed mb-6">
            «اقرأ، وربك الأكرم الذي علم بالقلم» — استمر في رحلتك نحو التميز الأكاديمي والتحضير الفائق لامتحانات الدبلوم العام.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigateRoute('diploma_exams')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-3 rounded-xl text-xs sm:text-sm shadow-md transition-colors cursor-pointer flex items-center gap-2"
            >
              <Award className="w-4 h-4" />
              <span>محاكي الامتحانات الوزارية</span>
            </button>
            <button
              onClick={() => onNavigateRoute('planner')}
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-3 rounded-xl text-xs sm:text-sm backdrop-blur-md transition-colors cursor-pointer border border-white/20 flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              <span>خطة الدراسة اليومية</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Continue Learning Card */}
      {lastActiveLesson && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-lg shrink-0 shadow-inner">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                متابعة التعلم من حيث توقفت
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1">
                {lastActiveLesson.titleAr}
              </h2>
              <p className="text-xs text-slate-500">
                المرجع الرسمي: {lastActiveLesson.officialRef} · الزمن المقدر: {lastActiveLesson.estimatedMinutes} دقيقة
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenLesson(lastActiveLesson)}
            className="whitespace-nowrap bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-2"
          >
            <span>متابعة الدرس</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Study Statistics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">المواد الدراسية</span>
            <BookOpen className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-3">8 مواد</p>
          <span className="text-[11px] text-slate-500 mt-1 block">الفصل الدراسي الأول المعتمد</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">الدروس المكتملة</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-3">{completedLessonsCount} درس</p>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">{inProgressLessonsCount} قيد الدراسة</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">الاختبارات والتمارين</span>
            <Award className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-3">{attempts.length} محاولة</p>
          <span className="text-[11px] text-slate-500 mt-1 block">تصحيح فوري على الخادم</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">المصادر الموثوقة</span>
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-3">2,000 مصدر</p>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">مكتبة زاويتي والكتب الوزارية</span>
        </div>
      </div>

      {/* 4. Eight Subjects Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">المواد الدراسية الثماني</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">المقررات الرسمية للصف الثاني عشر (الفصل الدراسي الأول)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {subjects.map((subject) => {
            return (
              <div
                key={subject.id}
                onClick={() => onOpenSubject(subject.id)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group"
              >
                {/* Subject Image Cover */}
                <div className="relative w-full h-44 bg-slate-900 overflow-hidden">
                  <img
                    src={subject.imageUrl}
                    alt={subject.titleAr}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between text-white">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-md">
                      {subject.code}
                    </span>
                    <span className="text-xs font-semibold">{subject.totalUnits} وحدات</span>
                  </div>
                </div>

                <div className="p-5 flex flex-col justify-between flex-1 gap-4">
                  <div>
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-white mb-1.5 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      {subject.titleAr}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {subject.descriptionAr}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <span>استعراض المنهج والدروس</span>
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
