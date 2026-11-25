import React from 'react';
import { StudentGoal, AchievementRecord } from '../types/intelligence';

interface Props {
  userId: string;
}

export const StudentGoalsView: React.FC<Props> = () => {
  const [goals, setGoals] = React.useState<StudentGoal[]>([
    {
      id: 'g-1',
      userId: 'user',
      titleAr: 'إكمال 10 دروس فيزياء وسلطة الجاذبية',
      targetCount: 10,
      currentCount: 7,
      deadlineIso: '2026-12-01',
      isCompleted: false,
      category: 'lesson_completion',
    },
    {
      id: 'g-2',
      userId: 'user',
      titleAr: 'حل 30 تمريناً تفاعلياً في الكيمياء العضوية',
      targetCount: 30,
      currentCount: 30,
      deadlineIso: '2026-11-28',
      isCompleted: true,
      category: 'exercise_count',
    },
    {
      id: 'g-3',
      userId: 'user',
      titleAr: 'اجتياز اختبار وحدة التفاضل والتكامل بنجاح',
      targetCount: 1,
      currentCount: 0,
      deadlineIso: '2026-12-05',
      isCompleted: false,
      category: 'exam_passing',
    },
  ]);

  const achievements: AchievementRecord[] = [
    {
      id: 'ach-1',
      userId: 'user',
      titleAr: 'بطل التكرار المتباعد',
      descriptionAr: 'أتممت 5 مراجعات متتالية في موعدها المحدد دون تأخير.',
      iconName: '⭐',
      unlockedAtIso: '2026-11-20',
      category: 'revision',
    },
    {
      id: 'ach-2',
      userId: 'user',
      titleAr: 'خبير الكيمياء العضوية',
      descriptionAr: 'حققت نسبة إتقان 90% فأكثر في تمارين الكيمياء.',
      iconName: '🧪',
      unlockedAtIso: '2026-11-22',
      category: 'mastery',
    },
  ];

  const handleToggleGoal = (id: string) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, isCompleted: !g.isCompleted } : g))
    );
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
          الأهداف والإنجازات الشخصية
        </span>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
          حدد أهدافك الأكاديمية وحقق شارات التميز
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          ضع أهدافاً دراسية واضحة ومحددة بوقت لزيادة دافعيتك وتحصيلك في الصف الثاني عشر.
        </p>
      </div>

      {/* Goals Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">أهدافي الدراسية الحالية</h2>
        <div className="space-y-4">
          {goals.map((goal) => {
            const progress = Math.min(100, Math.round((goal.currentCount / goal.targetCount) * 100));
            return (
              <div
                key={goal.id}
                className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-950/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleGoal(goal.id)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs border cursor-pointer ${
                        goal.isCompleted
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      {goal.isCompleted ? '✓' : ''}
                    </button>
                    <h3
                      className={`font-bold text-sm ${
                        goal.isCompleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {goal.titleAr}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">الموعد النهائي: {goal.deadlineIso}</span>
                </div>
                <div className="my-3">
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    <span>التقدم الحالي: {goal.currentCount} من {goal.targetCount}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievements Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">شارات التميز والإنجازات</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className="border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl p-5 flex items-start gap-4"
            >
              <span className="text-3xl p-2 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-emerald-200 dark:border-emerald-800">
                {ach.iconName}
              </span>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{ach.titleAr}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-2">{ach.descriptionAr}</p>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                  تاريخ الحصول عليها: {ach.unlockedAtIso}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
