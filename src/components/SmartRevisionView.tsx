import React from 'react';
import { Subject, Lesson } from '../types/curriculum';
import { SpacedRepetitionItem } from '../types/intelligence';

interface Props {
  subjects: Subject[];
  lessons: Lesson[];
  onOpenLesson: (lesson: Lesson) => void;
  onOpenQuestionBank: () => void;
}

export const SmartRevisionView: React.FC<Props> = ({
  lessons,
  onOpenLesson,
  onOpenQuestionBank,
}) => {
  const [revisions, setRevisions] = React.useState<SpacedRepetitionItem[]>([
    {
      id: 'rev-1',
      userId: 'user',
      lessonId: lessons[0]?.id ?? 'l1',
      subjectId: 'physics',
      intervalDays: 3,
      repetitionNumber: 2,
      easeFactor: 2.5,
      lastReviewedIso: '2026-11-22',
      nextReviewIso: '2026-11-25',
      status: 'due_today',
    },
    {
      id: 'rev-2',
      userId: 'user',
      lessonId: lessons[1]?.id ?? 'l2',
      subjectId: 'chemistry',
      intervalDays: 7,
      repetitionNumber: 3,
      easeFactor: 2.6,
      lastReviewedIso: '2026-11-18',
      nextReviewIso: '2026-11-25',
      status: 'due_today',
    },
    {
      id: 'rev-3',
      userId: 'user',
      lessonId: lessons[2]?.id ?? 'l3',
      subjectId: 'biology',
      intervalDays: 14,
      repetitionNumber: 4,
      easeFactor: 2.7,
      lastReviewedIso: '2026-11-11',
      nextReviewIso: '2026-11-28',
      status: 'upcoming',
    },
  ]);

  const handleCompleteReview = (id: string) => {
    setRevisions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'completed' as const } : r))
    );
  };

  const dueCount = revisions.filter((r) => r.status === 'due_today' || r.status === 'overdue').length;

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
          نظام المراجعة الذكية والتكرار المتباعد
        </span>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
          جدول المراجعات المستحقة لتثبيت المعلومات بالذاكرة طويلة المدى
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          يستخدم النظام خوارزميات التكرار المتباعد لتذكيرك بالدروس في الوقت المثالي قبل نسيانها.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-500">مراجعات مستحقة اليوم</span>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{dueCount}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-500">مراجعات قادمة</span>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {revisions.filter((r) => r.status === 'upcoming').length}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-500">مراجعات مكتملة</span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {revisions.filter((r) => r.status === 'completed').length}
            </p>
          </div>
        </div>
      </div>

      {/* Revision Cards List */}
      <div className="space-y-4">
        {revisions.map((rev) => {
          const lesson = lessons.find((l) => l.id === rev.lessonId);
          const isDue = rev.status === 'due_today' || rev.status === 'overdue';
          return (
            <div
              key={rev.id}
              className={`border rounded-3xl p-6 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs ${
                isDue
                  ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      isDue
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {isDue ? 'مستحقة للمراجعة اليوم' : 'قادمة في الموعد'}
                  </span>
                  <span className="text-xs text-slate-500">الفترة الفاصلة: {rev.intervalDays} أيام</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {lesson?.titleAr ?? 'درس مراجعة'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">الموعد المحدد للمراجعة: {rev.nextReviewIso}</p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {lesson && (
                  <button
                    onClick={() => onOpenLesson(lesson)}
                    className="flex-1 sm:flex-initial bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    مراجعة الملخص والدرس
                  </button>
                )}
                {rev.status !== 'completed' && (
                  <button
                    onClick={() => handleCompleteReview(rev.id)}
                    className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    تمت المراجعة بنجاح ✓
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
