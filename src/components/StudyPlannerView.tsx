import React from 'react';
import { Subject, Lesson, SubjectId } from '../types/curriculum';
import { DailyStudyPlan, WeeklyStudyPlan } from '../types/intelligence';
import { generateDailyStudyPlan } from '../utils/intelligenceEngine';

interface Props {
  userId: string;
  subjects: Subject[];
  lessons: Lesson[];
  onOpenLesson: (lesson: Lesson) => void;
  onOpenQuestionBank: () => void;
}

export const StudyPlannerView: React.FC<Props> = ({
  userId,
  subjects,
  onOpenLesson,
  onOpenQuestionBank,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<SubjectId>('physics');
  const [dailyPlan, setDailyPlan] = React.useState<DailyStudyPlan>(() =>
    generateDailyStudyPlan(userId, 'physics', 60)
  );

  const handleToggleTask = (taskId: string) => {
    setDailyPlan((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t)),
    }));
  };

  const completedCount = dailyPlan.tasks.filter((t) => t.isCompleted).length;
  const progressPercent = Math.round((completedCount / dailyPlan.tasks.length) * 100);

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              التخطيط الدراسي اليومي والأسبوعي
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
              جدولك الدراسي المخصص لتفوق الصف الثاني عشر
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              نظم وقتك، تابع إنجاز المهام اليومية، وحقق أهدافك بكفاءة عالية.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {subjects.map((subj) => (
              <button
                key={subj.id}
                onClick={() => {
                  setSelectedSubjectId(subj.id);
                  setDailyPlan(generateDailyStudyPlan(userId, subj.id, 60));
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  selectedSubjectId === subj.id
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {subj.titleAr}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">نسبة إنجاز مهام اليوم</span>
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs text-slate-500 mt-3">
            <span>المهام المكتملة: {completedCount} من {dailyPlan.tasks.length}</span>
            <span>المدة الإجمالية المقترحة: {dailyPlan.availableMinutes} دقيقة</span>
          </div>
        </div>
      </div>

      {/* Daily Tasks List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">مهام اليوم المقترحة</h2>
        <div className="space-y-4">
          {dailyPlan.tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleToggleTask(task.id)}
              className={`border rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 transition-all cursor-pointer ${
                task.isCompleted
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                  : 'bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs border ${
                    task.isCompleted
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  {task.isCompleted ? '✓' : ''}
                </div>
                <div>
                  <h3
                    className={`font-bold text-sm ${
                      task.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {task.titleAr}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">المدة المقدرة: {task.durationMinutes} دقيقة</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenQuestionBank();
                }}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60"
              >
                بدء النشاط ←
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
