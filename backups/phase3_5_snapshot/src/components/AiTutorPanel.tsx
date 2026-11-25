import React from 'react';
import { Send, Sparkles, BookOpen, Calculator, RefreshCw } from 'lucide-react';
import type {
  DifficultyLevel,
  GeneratedPracticeQuestion,
  Lesson,
  Subject,
  TutorMessage,
  Unit,
} from '../types/curriculum';
import { buildLessonTutorContext } from '../utils/curriculumEngine';

interface AiTutorPanelProps {
  subjects: Subject[];
  units: Unit[];
  lessons: Lesson[];
  initialLessonId?: string;
}

export function AiTutorPanel({
  subjects,
  units,
  lessons,
  initialLessonId,
}: AiTutorPanelProps) {
  const [selectedLessonId, setSelectedLessonId] = React.useState<string>(
    initialLessonId ?? lessons[0]?.id ?? ''
  );
  const [mode, setMode] = React.useState<'explain' | 'solve' | 'general'>('explain');
  const [input, setInput] = React.useState('');
  const [messages, setMessages] = React.useState<TutorMessage[]>([]);
  const [loadingChat, setLoadingChat] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [genDifficulty, setGenDifficulty] = React.useState<DifficultyLevel>('intermediate');
  const [generatedQuestions, setGeneratedQuestions] = React.useState<
    GeneratedPracticeQuestion[]
  >([]);
  const [loadingGen, setLoadingGen] = React.useState(false);
  const [revealedGenAnswers, setRevealedGenAnswers] = React.useState<Record<number, boolean>>(
    {}
  );

  React.useEffect(() => {
    if (initialLessonId) {
      setSelectedLessonId(initialLessonId);
    }
  }, [initialLessonId]);

  const activeLesson =
    lessons.find((l) => l.id === selectedLessonId) ?? lessons[0];
  const activeSubject = subjects.find((s) => s.id === activeLesson?.subjectId);
  const activeUnit = units.find((u) => u.id === activeLesson?.unitId);

  const lessonContext = React.useMemo(() => {
    if (!activeLesson || !activeSubject || !activeUnit) return '';
    return buildLessonTutorContext(activeSubject, activeUnit, activeLesson);
  }, [activeLesson, activeSubject, activeUnit]);

  const postTutorJson = async (url: string, payload: unknown) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const rawText = await response.text();
      let data: Record<string, unknown> = {};
      if (rawText) {
        try {
          data = JSON.parse(rawText) as Record<string, unknown>;
        } catch {
          data = {};
        }
      }
      return { response, data };
    } finally {
      clearTimeout(timer);
    }
  };

  const sendMessage = async (promptText: string, overrideMode?: 'explain' | 'solve' | 'general') => {
    const trimmed = promptText.trim();
    if (!trimmed || !activeLesson || !activeSubject) return;

    const chosenMode = overrideMode ?? mode;
    const userMsg: TutorMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
      mode: chosenMode,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setErrorMsg(null);
    setLoadingChat(true);

    try {
      const { response, data } = await postTutorJson('/api/tutor/chat', {
        message: trimmed,
        mode: chosenMode,
        lessonTitle: activeLesson.titleAr,
        subjectTitle: activeSubject.titleAr,
        lessonContext,
        history: messages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      if (!response.ok || typeof data.reply !== 'string') {
        setErrorMsg(
          typeof data.error === 'string'
            ? data.error
            : 'تعذر الحصول على رد من المعلم الذكي.'
        );
        return;
      }

      const assistantMsg: TutorMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
        mode: chosenMode,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setErrorMsg('استغرق الاتصال بالمعلم الذكي وقتاً أطول من المعتاد. يرجى المحاولة مرة أخرى.');
      } else {
        setErrorMsg('تعذر الاتصال بخادم المعلم الذكي. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setLoadingChat(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!activeLesson || !activeSubject) return;
    setLoadingGen(true);
    setErrorMsg(null);
    setRevealedGenAnswers({});

    try {
      const { response, data } = await postTutorJson('/api/tutor/generate-questions', {
        lessonTitle: activeLesson.titleAr,
        subjectTitle: activeSubject.titleAr,
        difficulty: genDifficulty,
        count: 3,
        lessonContext,
      });

      if (!response.ok) {
        setErrorMsg(
          typeof data.error === 'string' ? data.error : 'تعذر توليد أسئلة إضافية.'
        );
        return;
      }
      setGeneratedQuestions(
        Array.isArray(data.questions) ? (data.questions as GeneratedPracticeQuestion[]) : []
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setErrorMsg('انتهت مهلة طلب توليد الأسئلة. يرجى المحاولة مجدداً.');
      } else {
        setErrorMsg('تعذر الاتصال بالخادم لتوليد الأسئلة.');
      }
    } finally {
      setLoadingGen(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left/Top Context & Practice Generator */}
      <aside className="lg:col-span-4 space-y-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-700 dark:text-sky-400" />
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              سياق الدرس المعتمد
            </h2>
          </div>

          <div>
            <label
              htmlFor="tutor-lesson-select"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              اختر الدرس المستهدف من المنهج العُماني:
            </label>
            <select
              id="tutor-lesson-select"
              value={selectedLessonId}
              onChange={(e) => {
                setSelectedLessonId(e.target.value);
                setMessages([]);
                setGeneratedQuestions([]);
                setErrorMsg(null);
              }}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            >
              {lessons.map((l) => {
                const s = subjects.find((subj) => subj.id === l.subjectId);
                return (
                  <option key={l.id} value={l.id}>
                    {s?.titleAr} — {l.titleAr}
                  </option>
                );
              })}
            </select>
          </div>

          {activeLesson && (
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {activeLesson.officialRef}
              </p>
              <p className="leading-relaxed">{activeLesson.summaryAr}</p>
            </div>
          )}
        </div>

        {/* AI Question Generator anchored to lesson */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            توليد أسئلة تدريبية إضافية
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            يولّد المعلم الذكي أسئلة جديدة مبنية على مادة الدرس المعتمدة دون الخروج عن المنهج.
          </p>

          <div>
            <label
              htmlFor="gen-difficulty"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              مستوى الصعوبة:
            </label>
            <select
              id="gen-difficulty"
              value={genDifficulty}
              onChange={(e) => setGenDifficulty(e.target.value as DifficultyLevel)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="foundation">تأسيسي</option>
              <option value="intermediate">متوسط</option>
              <option value="advanced">متقدم</option>
              <option value="olympiad">قدرات عليا</option>
            </select>
          </div>

          <button
            type="button"
            disabled={loadingGen}
            onClick={() => void handleGenerateQuestions()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingGen ? 'animate-spin' : ''}`} />
            <span>{loadingGen ? 'جاري توليد الأسئلة...' : 'توليد ٣ أسئلة تدريبية'}</span>
          </button>

          {generatedQuestions.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              {generatedQuestions.map((gq, i) => (
                <div
                  key={i}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2 text-xs"
                >
                  <p className="font-semibold text-slate-900 dark:text-white leading-relaxed">
                    {i + 1}. {gq.promptAr}
                  </p>
                  {gq.optionsAr && gq.optionsAr.length > 0 && (
                    <ul className="space-y-1 text-slate-600 dark:text-slate-300 pr-3">
                      {gq.optionsAr.map((o, oi) => (
                        <li key={oi}>• {o}</li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setRevealedGenAnswers((prev) => ({ ...prev, [i]: !prev[i] }))
                    }
                    className="text-sky-700 dark:text-sky-400 font-semibold hover:underline cursor-pointer"
                  >
                    {revealedGenAnswers[i] ? 'إخفاء الحل' : 'عرض الإجابة والشرح'}
                  </button>
                  {revealedGenAnswers[i] && (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded p-2.5 space-y-1 text-slate-700 dark:text-slate-200">
                      <p className="font-bold text-emerald-700 dark:text-emerald-400">
                        الإجابة: {gq.correctAnswer}
                      </p>
                      <p className="leading-relaxed">{gq.explanationAr}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Workspace */}
      <section className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col min-h-[560px]">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-700 dark:text-sky-400" />
              <span>المعلم الذكي — STUDY CORE</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              مربوط حالياً بدرس: {activeLesson?.titleAr}
            </p>
          </div>

          <div
            role="group"
            aria-label="وضع المعلم الذكي"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start"
          >
            {[
              { id: 'explain' as const, label: 'شرح مبسط' },
              { id: 'solve' as const, label: 'حل خطوة بخطوة' },
              { id: 'general' as const, label: 'سؤال مفتوح' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === m.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Body */}
        <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[480px]">
          {messages.length === 0 ? (
            <div className="py-10 text-center space-y-5">
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                اطرح أي سؤال حول مفاهيم الدرس أو اطلب حل مسألة خطوة بخطوة مع توضيح القوانين
                والوحدات المعتمدة.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void sendMessage(
                      `اشرح لي الفكرة الأساسية في درس "${activeLesson?.titleAr}" بأسلوب مبسط مع مثال.`,
                      'explain'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>اشرح لي الفكرة الأساسية</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void sendMessage(
                      `قدّم لي مسألة نموذجية على درس "${activeLesson?.titleAr}" وحلها خطوة بخطوة.`,
                      'solve'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>حل مسألة خطوة بخطوة</span>
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-7 whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-sky-800 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}

          {loadingChat && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              المعلم الذكي يجهز الإجابة...
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 p-3.5 text-xs text-rose-900 dark:text-rose-200"
            >
              {errorMsg}
            </div>
          )}
        </div>

        {/* Input Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(input);
          }}
          className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3"
        >
          <input
            type="text"
            aria-label="اكتب سؤالك للمعلم الذكي"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب سؤالك أو نص المسألة هنا..."
            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-sky-700"
          />
          <button
            type="submit"
            disabled={loadingChat || input.trim().length < 2}
            aria-label="إرسال السؤال"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>إرسال</span>
          </button>
        </form>
      </section>
    </div>
  );
}
