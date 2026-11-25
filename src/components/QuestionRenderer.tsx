import React from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { GradedQuestionResult, PublicQuestion } from '../types/curriculum';
import {
  DIFFICULTY_LABELS_AR,
  ORIGIN_LABELS_AR,
  QUESTION_TYPE_LABELS_AR,
} from '../utils/questionEngine';
import { LessonDiagram } from './LessonDiagram';

interface QuestionRendererProps {
  question: PublicQuestion;
  index: number;
  subjectTitleAr?: string;
  answer: string;
  onChangeAnswer: (value: string) => void;
  disabled?: boolean;
  gradedResult?: GradedQuestionResult | null;
  fieldPrefix?: string;
}

function parseJsonStringArray(raw: string): string[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item));
    }
  } catch {
    // Fall back to pipe-delimited string
  }
  return raw
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseMatchingMap(raw: string): Record<string, string> {
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // Ignore malformed draft
  }
  return {};
}

export function QuestionRenderer({
  question,
  index,
  subjectTitleAr,
  answer,
  onChangeAnswer,
  disabled = false,
  gradedResult,
  fieldPrefix = 'q',
}: QuestionRendererProps) {
  const matchingMap = React.useMemo(() => parseMatchingMap(answer), [answer]);
  const selectedMulti = React.useMemo(() => parseJsonStringArray(answer), [answer]);
  const orderingItems = React.useMemo(() => {
    const saved = parseJsonStringArray(answer);
    if (saved.length > 0) return saved;
    return question.orderingItemsShuffledAr ?? [];
  }, [answer, question.orderingItemsShuffledAr]);

  const handleToggleMultiSelect = (option: string) => {
    if (disabled) return;
    const exists = selectedMulti.includes(option);
    const next = exists
      ? selectedMulti.filter((o) => o !== option)
      : [...selectedMulti, option];
    onChangeAnswer(JSON.stringify(next));
  };

  const handleMatchingChange = (leftAr: string, rightAr: string) => {
    if (disabled) return;
    const next = { ...matchingMap, [leftAr]: rightAr };
    onChangeAnswer(JSON.stringify(next));
  };

  const handleMoveOrderItem = (idx: number, direction: -1 | 1) => {
    if (disabled) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= orderingItems.length) return;
    const next = [...orderingItems];
    const [moved] = next.splice(idx, 1);
    next.splice(targetIdx, 0, moved);
    onChangeAnswer(JSON.stringify(next));
  };

  const renderInputSurface = () => {
    // 1. Multiple Choice (and Diagram/Data questions that provide radio options)
    if (
      (question.questionType === 'mcq' ||
        question.questionType === 'diagram_interpretation' ||
        question.questionType === 'data_graph_analysis') &&
      question.optionsAr &&
      question.optionsAr.length > 0
    ) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {question.optionsAr.map((opt) => {
            const selected = answer === opt;
            return (
              <label
                key={opt}
                className={`flex items-center gap-3 p-3 rounded-lg border text-sm transition-colors ${
                  disabled ? 'cursor-default opacity-90' : 'cursor-pointer'
                } ${
                  selected
                    ? 'border-sky-700 bg-sky-50 text-sky-950 dark:bg-sky-950/50 dark:border-sky-500 dark:text-sky-100'
                    : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name={`${fieldPrefix}-${question.id}`}
                  value={opt}
                  checked={selected}
                  disabled={disabled}
                  onChange={() => onChangeAnswer(opt)}
                  className="accent-sky-800"
                />
                <span className="leading-relaxed">{opt}</span>
              </label>
            );
          })}
        </div>
      );
    }

    // 2. True / False
    if (question.questionType === 'true_false') {
      const choices =
        question.optionsAr && question.optionsAr.length > 0
          ? question.optionsAr
          : ['صح', 'خطأ'];
      return (
        <div className="flex flex-wrap gap-3">
          {choices.map((opt) => {
            const selected = answer === opt;
            return (
              <label
                key={opt}
                className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                  disabled ? 'cursor-default opacity-90' : 'cursor-pointer'
                } ${
                  selected
                    ? 'border-sky-700 bg-sky-50 text-sky-950 dark:bg-sky-950/50 dark:border-sky-500 dark:text-sky-100'
                    : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name={`${fieldPrefix}-${question.id}`}
                  value={opt}
                  checked={selected}
                  disabled={disabled}
                  onChange={() => onChangeAnswer(opt)}
                  className="accent-sky-800"
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      );
    }

    // 3. Multi-Select Checkboxes
    if (question.questionType === 'multi_select' && question.optionsAr) {
      return (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            اختر جميع الإجابات الصحيحة المطبقة:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {question.optionsAr.map((opt) => {
              const checked = selectedMulti.includes(opt);
              return (
                <label
                  key={opt}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-sm transition-colors ${
                    disabled ? 'cursor-default opacity-90' : 'cursor-pointer'
                  } ${
                    checked
                      ? 'border-sky-700 bg-sky-50 text-sky-950 dark:bg-sky-950/50 dark:border-sky-500 dark:text-sky-100'
                      : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => handleToggleMultiSelect(opt)}
                    className="accent-sky-800"
                  />
                  <span className="leading-relaxed">{opt}</span>
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    // 4. Matching Pairs (using shuffled right options from server projection)
    if (
      question.questionType === 'matching' &&
      question.matchingLeftsAr &&
      question.matchingRightsShuffledAr
    ) {
      return (
        <div className="space-y-2.5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            اربط كل عبارة في العمود الأول بما يناسبها من القائمة المقابلة:
          </p>
          <div className="space-y-2">
            {question.matchingLeftsAr.map((leftItem, lIdx) => (
              <div
                key={leftItem}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3"
              >
                <div className="sm:col-span-6 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                  <span className="font-mono text-sky-700 dark:text-sky-400 ml-1.5 tabular-nums">
                    {lIdx + 1}.
                  </span>
                  {leftItem}
                </div>
                <div className="sm:col-span-6">
                  <select
                    aria-label={`المقابل المناسب للعبارة ${lIdx + 1}`}
                    value={matchingMap[leftItem] ?? ''}
                    disabled={disabled}
                    onChange={(e) => handleMatchingChange(leftItem, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="">اختر الإجابة المقابلة...</option>
                    {question.matchingRightsShuffledAr?.map((rightOpt) => (
                      <option key={rightOpt} value={rightOpt}>
                        {rightOpt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 5. Ordering Sequence (using shuffled list + up/down controls)
    if (question.questionType === 'ordering' && orderingItems.length > 0) {
      return (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            رتّب الخطوات التالية من الأعلى إلى الأسفل بالترتيب الصحيح:
          </p>
          <div className="space-y-2">
            {orderingItems.map((item, idx) => (
              <div
                key={`${item}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                  <span className="font-mono font-bold text-sky-800 dark:text-sky-400 tabular-nums">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label={`تحريك العنصر ${idx + 1} للأعلى`}
                    disabled={disabled || idx === 0}
                    onClick={() => handleMoveOrderItem(idx, -1)}
                    className="p-1.5 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`تحريك العنصر ${idx + 1} للأسفل`}
                    disabled={disabled || idx === orderingItems.length - 1}
                    onClick={() => handleMoveOrderItem(idx, 1)}
                    className="p-1.5 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 6. Long Essay / Scientific Explanation
    if (
      question.questionType === 'scientific_explanation' ||
      question.questionType === 'structured_long'
    ) {
      return (
        <div className="space-y-1.5">
          <label
            htmlFor={`${fieldPrefix}-textarea-${question.id}`}
            className="block text-xs text-slate-500 dark:text-slate-400"
          >
            اكتب التفسير العلمي أو خطوات البرهان الكاملة (يُقارن بنموذج التصحيح الوزاري):
          </label>
          <textarea
            id={`${fieldPrefix}-textarea-${question.id}`}
            rows={4}
            disabled={disabled}
            value={answer}
            onChange={(e) => onChangeAnswer(e.target.value)}
            placeholder="اكتب إجابتك العلمية بالتفصيل..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-900 dark:text-white leading-relaxed"
          />
        </div>
      );
    }

    // 7. Numeric, Fill Blank, Short Answer, or Open Diagram/Data Response
    return (
      <div className="space-y-1.5">
        <label
          htmlFor={`${fieldPrefix}-input-${question.id}`}
          className="block text-xs text-slate-500 dark:text-slate-400"
        >
          {question.questionType === 'numeric'
            ? `أدخل القيمة النهائية${question.requiredUnit ? ` (الوحدة المطلوبة: ${question.requiredUnit})` : ''}:`
            : 'اكتب الإجابة المختصرة:'}
        </label>
        <input
          id={`${fieldPrefix}-input-${question.id}`}
          type="text"
          disabled={disabled}
          value={answer}
          onChange={(e) => onChangeAnswer(e.target.value)}
          placeholder={
            question.questionType === 'numeric'
              ? 'مثال: 4 أو 2.5 أو 3/4'
              : 'اكتب الإجابة النهائية...'
          }
          className="w-full sm:w-80 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-sm font-mono text-slate-900 dark:text-white"
        />
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
            #{index + 1}
          </span>
          {subjectTitleAr && (
            <>
              <span aria-hidden="true">·</span>
              <span>{subjectTitleAr}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>{DIFFICULTY_LABELS_AR[question.difficulty]}</span>
          <span aria-hidden="true">·</span>
          <span>{QUESTION_TYPE_LABELS_AR[question.questionType]}</span>
          {question.origin && (
            <>
              <span aria-hidden="true">·</span>
              <span>{ORIGIN_LABELS_AR[question.origin]}</span>
            </>
          )}
        </div>
        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
          {question.marks} درجات
        </span>
      </div>

      <p className="text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
        {question.promptAr}
      </p>

      {/* Optional Diagram for diagram_interpretation */}
      {question.diagramKind && (
        <LessonDiagram
          diagram={{
            id: `q-diag-${question.id}`,
            titleAr: question.conceptAr ?? 'شكل توضيحي للسؤال',
            captionAr: question.diagramCaptionAr ?? 'اقرأ المعطيات من الرسم ثم أجب.',
            svgKind: question.diagramKind,
          }}
        />
      )}

      {/* Optional Data Table for data_graph_analysis */}
      {question.dataTable && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {question.dataTable.titleAr}
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-right text-xs border-collapse tabular-nums">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                <tr>
                  {question.dataTable.headersAr.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className="px-3 py-2 font-bold border-b border-slate-200 dark:border-slate-700 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                {question.dataTable.rowsAr.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-3 py-2 text-slate-700 dark:text-slate-300 font-mono"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {question.dataTable.captionAr && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {question.dataTable.captionAr}
            </p>
          )}
        </div>
      )}

      {renderInputSurface()}

      {gradedResult && (
        <div
          className={`rounded-lg p-4 border text-sm space-y-2 ${
            gradedResult.needsManualGrading
              ? 'bg-amber-50 border-amber-200 text-amber-950 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200'
              : gradedResult.isCorrect
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-200 text-rose-950 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold flex items-center gap-2">
              {gradedResult.needsManualGrading ? (
                <>
                  <Info className="w-4 h-4 shrink-0" />
                  <span>سؤال مقالي يتطلب تقييماً ذاتياً وفق نموذج الإجابة</span>
                </>
              ) : gradedResult.isCorrect ? (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>إجابة صحيحة</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>إجابة غير صحيحة</span>
                </>
              )}
            </p>
            <span className="font-mono text-xs font-bold tabular-nums">
              {gradedResult.earnedMarks} / {gradedResult.maxMarks}
            </span>
          </div>

          <p className="text-xs font-semibold">
            الإجابة النموذجية المعتمدة: {gradedResult.correctAnswer}
          </p>

          <p className="text-xs leading-relaxed opacity-95">{gradedResult.explanationAr}</p>

          {gradedResult.solutionStepsAr && gradedResult.solutionStepsAr.length > 0 && (
            <ol className="text-xs space-y-1 pr-4 list-decimal opacity-95">
              {gradedResult.solutionStepsAr.map((st, sIdx) => (
                <li key={sIdx}>{st}</li>
              ))}
            </ol>
          )}

          {gradedResult.commonMistakeAr && (
            <p className="text-xs opacity-90 pt-1 border-t border-current/15">
              <strong>تنبيه شائع: </strong>
              {gradedResult.commonMistakeAr}
            </p>
          )}

          {gradedResult.rubricAr && (
            <p className="text-xs opacity-90">
              <strong>معيار التصحيح: </strong>
              {gradedResult.rubricAr}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
