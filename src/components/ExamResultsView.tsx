import React from 'react';
import { Award, CheckCircle2, Clock, RotateCcw, ShieldCheck } from 'lucide-react';
import type { AssessmentResult } from '../types/curriculum';

interface ExamResultsViewProps {
  titleAr: string;
  result: AssessmentResult;
  persistedToFirestore: boolean;
  persistenceNoticeAr?: string;
  onRetry: () => void;
}

export function ExamResultsView({
  titleAr,
  result,
  persistedToFirestore,
  persistenceNoticeAr,
  onRetry,
}: ExamResultsViewProps) {
  const passed = Boolean(result.passed);

  return (
    <section
      aria-label="ملخص نتيجة التقييم"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-800 dark:text-sky-400">
            <ShieldCheck className="w-4 h-4" />
            <span>نتيجة مصححة ومعتمدة على الخادم</span>
          </div>
          <h2 className="font-display text-xl font-extrabold text-slate-900 dark:text-white">
            {titleAr}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {persistedToFirestore
              ? 'تم حفظ المحاولة وأعلى درجة في سجل الطالب السحابي.'
              : persistenceNoticeAr ?? 'تم التصحيح على الخادم وحفظ النتيجة في الجلسة الحالية.'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-left">
            <p className="text-xs text-slate-500 dark:text-slate-400">النسبة المئوية</p>
            <p
              className={`font-mono text-3xl font-extrabold tabular-nums ${
                passed
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {result.scorePercent}%
            </p>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>محاولة جديدة</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
          <p className="text-slate-500 dark:text-slate-400 mb-1">حالة الاجتياز</p>
          <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            {passed ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>ناجح</span>
              </>
            ) : (
              <>
                <Award className="w-4 h-4 text-amber-600" />
                <span>بحاجة لمراجعة</span>
              </>
            )}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
          <p className="text-slate-500 dark:text-slate-400 mb-1">الإجابات الصحيحة</p>
          <p className="font-mono text-base font-bold text-slate-900 dark:text-white">
            {result.correctCount} / {result.totalQuestions}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
          <p className="text-slate-500 dark:text-slate-400 mb-1">الدرجات المحققة</p>
          <p className="font-mono text-base font-bold text-slate-900 dark:text-white">
            {result.earnedMarks} / {result.totalMarks}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
          <p className="text-slate-500 dark:text-slate-400 mb-1">الزمن المستغرق</p>
          <p className="font-mono text-base font-bold text-slate-900 dark:text-white flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{result.timeSpentSeconds ?? 1} ث</span>
          </p>
        </div>
      </div>

      {result.difficultyBreakdown && result.difficultyBreakdown.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            الأداء حسب مستوى الصعوبة:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs tabular-nums">
            {result.difficultyBreakdown.map((stat) => (
              <div
                key={stat.key}
                className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-1"
              >
                <p className="font-semibold text-slate-800 dark:text-slate-200">{stat.labelAr}</p>
                <p className="font-mono text-slate-600 dark:text-slate-400">
                  {stat.correct}/{stat.total} ({stat.accuracyPercent}%)
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
