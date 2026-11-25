import React from 'react';
import { Subject } from '../types/curriculum';

interface Props {
  subjects: Subject[];
}

export const StudentReportsView: React.FC<Props> = ({ subjects }) => {
  const [reportType, setReportType] = React.useState<'daily' | 'weekly' | 'monthly'>('weekly');

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              تقارير الأداء والتحليل الشامل
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
              تقارير التحصيل الدراسي المستندة إلى الأداء الفعلي
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              اطلع على تقارير الأداء اليومية، الأسبوعية، والشهرية لمعرفة مستوى تطورك الأكاديمي.
            </p>
          </div>
          <div
            role="tablist"
            aria-label="نوع التقرير"
            className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl"
          >
            {(['daily', 'weekly', 'monthly'] as const).map((type) => {
              const label = type === 'daily' ? 'يومي' : type === 'weekly' ? 'أسبوعي' : 'شهري';
              return (
                <button
                  key={type}
                  role="tab"
                  aria-selected={reportType === type}
                  onClick={() => setReportType(type)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    reportType === type
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  تقرير {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Report Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-500">إجمالي وقت الدراسة</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">4 ساعات و 20 دقيقة</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-500">الأسئلة المحلولة</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">78 سؤالاً</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-500">دقة الإجابات</span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">84%</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-500">المراجعات المكتملة</span>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">12 جلسة</p>
          </div>
        </div>
      </div>

      {/* Detailed Analysis Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">تحليل الأداء حسب المادة</h2>
        <div className="space-y-4">
          {subjects.map((subj) => (
            <div
              key={subj.id}
              className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{subj.titleAr}</h3>
                <p className="text-xs text-slate-500">التقدم مستقر ويظهر تحسناً ملحوظاً في حل المسائل الحسابية.</p>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">معدل الإتقان:</span>
                <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-3 py-1 rounded-full text-xs">
                  88%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
