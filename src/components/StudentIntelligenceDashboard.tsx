import React from 'react';
import { Subject, Lesson, ExamAttempt, LessonProgress, LearningObjective } from '../types/curriculum';
import {
  computeObjectiveMastery,
  detectStudentWeaknesses,
  calculateExamReadiness,
  generatePersonalizedRecommendations,
} from '../utils/intelligenceEngine';

interface Props {
  userId: string;
  subjects: Subject[];
  lessons: Lesson[];
  attempts: ExamAttempt[];
  progressMap: Record<string, LessonProgress>;
  objectives: LearningObjective[];
  onOpenLesson: (lesson: Lesson) => void;
  onOpenQuestionBank: () => void;
  onNavigateTab: (tab: string) => void;
}

export const StudentIntelligenceDashboard: React.FC<Props> = ({
  userId,
  subjects,
  lessons,
  attempts,
  progressMap,
  objectives,
  onOpenLesson,
  onOpenQuestionBank,
  onNavigateTab,
}) => {
  const masteryRecords = React.useMemo(
    () => computeObjectiveMastery(userId, attempts, objectives),
    [userId, attempts, objectives]
  );

  const weaknesses = React.useMemo(
    () => detectStudentWeaknesses(userId, attempts, lessons),
    [userId, attempts, lessons]
  );

  const examReadinessList = React.useMemo(
    () => subjects.map((subj) => calculateExamReadiness(subj.id, attempts, progressMap, lessons)),
    [subjects, attempts, progressMap, lessons]
  );

  const recommendations = React.useMemo(
    () => generatePersonalizedRecommendations(userId, weaknesses, examReadinessList),
    [userId, weaknesses, examReadinessList]
  );

  const masteredCount = masteryRecords.filter((m) => m.masteryState === 'MASTERED').length;
  const learningCount = masteryRecords.filter((m) => m.masteryState === 'LEARNING' || m.masteryState === 'DEVELOPING').length;
  const needsPracticeCount = masteryRecords.filter((m) => m.masteryState === 'NEEDS_PRACTICE').length;

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <span className="inline-block bg-white/20 text-emerald-100 text-xs font-bold px-3 py-1 rounded-full mb-3">
            المحطة الذكية لتطوير الأداء الأكاديمي · 2026–2027
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            لوحة التوجيه والذكاء الشخصي للطالب
          </h1>
          <p className="text-emerald-50 text-sm sm:text-base leading-relaxed">
            نظام تحليلي متكامل يرصد مستواك، يكشف نقاط الضعف، يوجهك نحو مراجعة الدروس المستهدفة، ويقيس جاهزيتك لاختبارات الثانوية العامة في سلطنة عُمان.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={() => onNavigateTab('planner')}
              className="bg-white text-emerald-900 font-bold px-5 py-2.5 rounded-xl text-sm shadow-md hover:bg-emerald-50 transition-colors cursor-pointer"
            >
              عرض خطة الدراسة اليومية
            </button>
            <button
              onClick={() => onNavigateTab('revision')}
              className="bg-emerald-800/60 hover:bg-emerald-800 text-white font-semibold px-5 py-2.5 rounded-xl text-sm backdrop-blur-md transition-colors cursor-pointer border border-emerald-400/30"
            >
              مهام المراجعة الذكية ({weaknesses.length})
            </button>
          </div>
        </div>
      </div>

      {/* Quick Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">الأهداف المتقنة</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
              {masteredCount}
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-3">
            {masteredCount} من {objectives.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">أهداف تعليمية حققت إتقان كامل</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">قيد التطوير والتعلم</span>
            <span className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
              {learningCount}
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-3">{learningCount}</p>
          <p className="text-xs text-slate-500 mt-1">أهداف قيد التقدم والممارسة المستمرة</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">نقاط الضعف المكتشفة</span>
            <span className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-sm">
              {weaknesses.length}
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-3">{weaknesses.length}</p>
          <p className="text-xs text-slate-500 mt-1">مواضيع تحتاج تدريب ومراجعة مكثفة</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">سجلات الاختبارات</span>
            <span className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-sm">
              {attempts.length}
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-3">{attempts.length}</p>
          <p className="text-xs text-slate-500 mt-1">إجمالي محاولات الاختبار والتمارين</p>
        </div>
      </div>

      {/* Examination Readiness Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">جاهزية اختبارات الثانوية العامة</h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-6">
          مؤشر الجاهزية لكل مادة مستند إلى دقة الإجابات، نتائج الاختبارات، ومدى إتقان الأهداف التعليمية.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {examReadinessList.map((readiness) => {
            const subject = subjects.find((s) => s.id === readiness.subjectId);
            const badgeColor =
              readiness.readinessState === 'STRONG_PREPARATION'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
                : readiness.readinessState === 'GOOD_PREPARATION'
                ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300'
                : readiness.readinessState === 'DEVELOPING'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300';

            const stateText =
              readiness.readinessState === 'STRONG_PREPARATION'
                ? 'جاهزية قوية ومتينة'
                : readiness.readinessState === 'GOOD_PREPARATION'
                ? 'جاهزية جيدة'
                : readiness.readinessState === 'DEVELOPING'
                ? 'قيد التطوير والتقدم'
                : 'يحتاج تحضير ومراجعة';

            return (
              <div
                key={readiness.subjectId}
                className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between bg-slate-50/50 dark:bg-slate-950/50"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-900 dark:text-white">{subject?.titleAr ?? readiness.subjectId}</h3>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${badgeColor}`}>
                      {stateText}
                    </span>
                  </div>
                  <div className="my-3">
                    <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      <span>مؤشر الاستعداد</span>
                      <span>{readiness.readinessScorePercent}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${readiness.readinessScorePercent}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    {readiness.recommendedActionAr}
                  </p>
                </div>
                <button
                  onClick={onOpenQuestionBank}
                  className="w-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs py-2 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  تدريب أسئلة المادة
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations & Weaknesses Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Personalized Recommendations */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">التوصيات الذكية المخصصة لك</h2>
            <span className="text-xs bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-3 py-1 rounded-full">
              {recommendations.length} توصيات
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-6">مستنتجة تلقائياً بناءً على تحليل أخطائك ومستواك في الاختبارات.</p>

          {recommendations.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">لا توجد توصيات عاجلة حالياً</p>
              <p className="text-xs text-slate-500">قم بحل المزيد من الاختبارات والتمارين لتظهر لك التوصيات المخصصة.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec) => {
                const subj = subjects.find((s) => s.id === rec.subjectId);
                return (
                  <div
                    key={rec.id}
                    className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {subj?.titleAr ?? rec.subjectId}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">{rec.titleAr}</h3>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{rec.explanationAr}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (rec.lessonId) {
                          const l = lessons.find((x) => x.id === rec.lessonId);
                          if (l) onOpenLesson(l);
                        } else {
                          onOpenQuestionBank();
                        }
                      }}
                      className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
                    >
                      {rec.actionLabelAr}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detected Weaknesses */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">نقاط الضعف المكتشفة</h2>
            <span className="text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold px-3 py-1 rounded-full">
              {weaknesses.length} مواضيع
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-6">الدروس والمواضيع التي تتطلب منك تركيزاً إضافياً ومراجعة شاملة.</p>

          {weaknesses.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">لم يتم رصد نقاط ضعف حرجة</p>
              <p className="text-xs text-slate-500">أداؤك متوازن وممتاز عبر الدروس المسجلة.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {weaknesses.map((w) => {
                const lesson = lessons.find((l) => l.id === w.lessonId);
                const subj = subjects.find((s) => s.id === w.subjectId);
                return (
                  <div key={w.id} className="border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 bg-amber-50/40 dark:bg-amber-950/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                        {subj?.titleAr ?? w.subjectId}
                      </span>
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        {w.severity === 'high' ? 'أولوية عالية للمعالجة' : 'أولوية متوسطة'}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{w.titleAr}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{w.evidenceAr}</p>
                    {lesson && (
                      <button
                        onClick={() => onOpenLesson(lesson)}
                        className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        الانتقال إلى الدرس: {lesson.titleAr} ←
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
