import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  classifyGeminiError,
  isTransientGeminiError,
  parseAdminDraftJson,
  parseGeneratedQuestionsJson,
} from './src/utils/geminiHelpers';
import type { AdminAssistType } from './src/types/curriculum';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';
const GEMINI_TIMEOUT_MS = 25000;

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = GEMINI_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('GEMINI_TIMEOUT'));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function generateWithRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(fn());
    } catch (error) {
      lastError = error;
      if (!isTransientGeminiError(error) || attempt === maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    const hasGeminiKey = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    res.json({ ok: true, aiConfigured: hasGeminiKey });
  });

  app.post('/api/tutor/chat', async (req: Request, res: Response) => {
    try {
      const { message, mode, lessonTitle, subjectTitle, lessonContext, history } = req.body ?? {};

      if (typeof message !== 'string' || message.trim().length < 2 || message.length > 2000) {
        res.status(400).json({ error: 'يرجى كتابة سؤال واضح لا يتجاوز ٢٠٠٠ حرف.' });
        return;
      }

      const ai = createGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'مفتاح Gemini API غير مهيأ على الخادم حالياً. أضف GEMINI_API_KEY في لوحة الأسرار (Settings > Secrets) لتفعيل المعلم الذكي.',
        });
        return;
      }

      const safeMode = mode === 'solve' ? 'solve' : mode === 'explain' ? 'explain' : 'general';
      const safeContext = typeof lessonContext === 'string' ? lessonContext.slice(0, 8000) : '';
      const safeSubject = typeof subjectTitle === 'string' ? subjectTitle.slice(0, 120) : 'المسار العلمي';
      const safeLesson = typeof lessonTitle === 'string' ? lessonTitle.slice(0, 180) : 'المنهج العُماني';

      const systemInstruction = [
        'أنت المعلم الذكي الرسمي لمنصة STUDY CORE لطلبة الصف الثاني عشر المسار العلمي في سلطنة عُمان (2026–2027).',
        'تلتزم التزاماً تاماً بالمنهج الرسمي لوزارة التربية والتعليم العُمانية وبسياق الدرس المرفق أدناه.',
        'قواعد الإجابة:',
        '1. اكتب بلغة عربية علمية واضحة ودقيقة، واستخدم الرموز والوحدات الدولية (SI) بالاتجاه الصحيح.',
        '2. عند حل المسائل الحسابية أو العلمية، التزم بالخطوات المنهجية: المعطيات ← القانون ← التعويض ← الناتج النهائي مع الوحدة.',
        '3. إذا سأل الطالب عن شيء خارج سياق الدرس، وجّهه بلطف نحو مفاهيم المنهج العُماني ذات الصلة.',
        '4. مهم للتنسيق: لا تستخدم رموز LaTeX الخام مثل $ أو $$ أو \\frac أو \\text ولا علامات ### أو **؛ اكتب المعادلات بصيغة نصية واضحة ومقروءة بالرموز القياسية مثل g = (G × M) / r² وقوة الأُس مثل 10⁶ أو ^2.',
        `الوضع المطلوب: ${
          safeMode === 'solve'
            ? 'حل مسألة خطوة بخطوة مع التحقق من الوحدات'
            : safeMode === 'explain'
            ? 'شرح المفهوم وتبسيطه مع مثال تطبيقي من الدرس'
            : 'إرشاد تعليمي مباشر وموجز'
        }.`,
        `المادة: ${safeSubject} | الدرس: ${safeLesson}`,
        safeContext ? `سياق الدرس المعتمد:\n${safeContext}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const historyText = Array.isArray(history)
        ? history
            .slice(-6)
            .filter(
              (item): item is { role: string; content: string } =>
                Boolean(item) &&
                typeof item.role === 'string' &&
                typeof item.content === 'string'
            )
            .map((h) => `${h.role === 'user' ? 'الطالب' : 'المعلم'}: ${h.content.slice(0, 800)}`)
            .join('\n')
        : '';

      const prompt = historyText
        ? `سجل المحادثة السابق:\n${historyText}\n\nسؤال الطالب الحالي: ${message.trim()}`
        : message.trim();

      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            systemInstruction,
          },
        })
      );

      const reply = response.text?.trim();
      if (!reply) {
        res.status(502).json({ error: 'لم يتمكن المعلم الذكي من توليد إجابة صالحة. حاول مرة أخرى.' });
        return;
      }

      res.json({ reply });
    } catch (error) {
      const classified = classifyGeminiError(error, 'تعذر الاتصال بخدمة المعلم الذكي حالياً.');
      if (classified.httpStatus === 429 || classified.httpStatus === 503) {
        console.warn(`Gemini tutor chat throttled (${classified.httpStatus}):`, classified.userMessageAr);
      } else {
        console.error('Gemini tutor chat failure:', classified.httpStatus, error);
      }
      if (classified.retryAfterSeconds) {
        res.setHeader('Retry-After', String(classified.retryAfterSeconds));
      }
      res.status(classified.httpStatus).json({
        error: classified.userMessageAr,
        retryAfterSeconds: classified.retryAfterSeconds,
      });
    }
  });

  app.post('/api/tutor/generate-questions', async (req: Request, res: Response) => {
    try {
      const { lessonTitle, subjectTitle, difficulty, count, lessonContext } = req.body ?? {};

      if (
        typeof lessonTitle !== 'string' ||
        lessonTitle.trim().length < 2 ||
        typeof subjectTitle !== 'string' ||
        subjectTitle.trim().length < 2
      ) {
        res.status(400).json({ error: 'بيانات الدرس والمادة مطلوبة لتوليد الأسئلة.' });
        return;
      }

      const ai = createGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'مفتاح Gemini API غير مهيأ على الخادم حالياً. أضف GEMINI_API_KEY في لوحة الأسرار لتوليد أسئلة إضافية.',
        });
        return;
      }

      const safeCount = Math.max(1, Math.min(5, Number(count) || 3));
      const safeDifficulty =
        difficulty === 'foundation' ||
        difficulty === 'intermediate' ||
        difficulty === 'advanced' ||
        difficulty === 'olympiad'
          ? difficulty
          : 'intermediate';
      const safeContext = typeof lessonContext === 'string' ? lessonContext.slice(0, 8000) : '';

      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: `أنشئ ${safeCount} أسئلة تدريبية جديدة بمستوى (${safeDifficulty}) لدرس "${lessonTitle.slice(0, 180)}" في مادة "${subjectTitle.slice(0, 120)}" وفق المنهج العُماني للصف الثاني عشر العلمي.\n\nالمرجع المعتمد:\n${safeContext}`,
          config: {
            systemInstruction:
              'أنت واضع أسئلة امتحانات دبلوم التعليم العام في سلطنة عُمان. أعد الأسئلة باللغة العربية العلمية الدقيقة بصيغة JSON مطابقة للمخطط فقط، مع التأكد من صحة الخيارات الأربعة أو الإجابة الرقمية.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  promptAr: {
                    type: Type.STRING,
                    description: 'نص السؤال باللغة العربية واضحاً وكاملاً.',
                  },
                  questionType: {
                    type: Type.STRING,
                    description: 'إما mcq للاختيار من متعدد أو numeric للمسائل ذات الناتج الرقمي.',
                  },
                  difficulty: {
                    type: Type.STRING,
                    description: 'foundation أو intermediate أو advanced أو olympiad',
                  },
                  optionsAr: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'أربعة خيارات عند اختيار mcq، ومصفوفة فارغة عند اختيار numeric.',
                  },
                  correctAnswer: {
                    type: Type.STRING,
                    description: 'الإجابة الصحيحة مطابقة تماماً لأحد الخيارات في mcq أو القيمة الرقمية.',
                  },
                  explanationAr: {
                    type: Type.STRING,
                    description: 'تفسير الحل خطوة بخطوة باللغة العربية.',
                  },
                },
                required: [
                  'promptAr',
                  'questionType',
                  'difficulty',
                  'correctAnswer',
                  'explanationAr',
                ],
              },
            },
          },
        })
      );

      const rawText = response.text?.trim() ?? '';
      let questions;
      try {
        questions = parseGeneratedQuestionsJson(rawText, safeDifficulty);
      } catch {
        res.status(502).json({
          error: 'أعاد المعلم الذكي صيغة غير مكتملة للأسئلة. يرجى المحاولة مرة أخرى.',
        });
        return;
      }

      if (questions.length === 0) {
        res.status(502).json({
          error: 'لم يتمكن المعلم الذكي من توليد أسئلة صالحة لهذا الدرس. حاول مرة أخرى.',
        });
        return;
      }

      res.json({ questions });
    } catch (error) {
      const classified = classifyGeminiError(error, 'تعذر توليد الأسئلة الإضافية حالياً.');
      if (classified.httpStatus === 429 || classified.httpStatus === 503) {
        console.warn(
          `Gemini question generation throttled (${classified.httpStatus}):`,
          classified.userMessageAr
        );
      } else {
        console.error('Gemini question generation failure:', classified.httpStatus, error);
      }
      if (classified.retryAfterSeconds) {
        res.setHeader('Retry-After', String(classified.retryAfterSeconds));
      }
      res.status(classified.httpStatus).json({
        error: classified.userMessageAr,
        retryAfterSeconds: classified.retryAfterSeconds,
      });
    }
  });

  app.post('/api/admin/assist', async (req: Request, res: Response) => {
    try {
      const {
        assistType,
        subjectTitle,
        unitTitle,
        lessonTitle,
        semester,
        officialRef,
        existingContext,
        sourceSummary,
      } = req.body ?? {};

      const validTypes: ReadonlySet<AdminAssistType> = new Set([
        'explanation',
        'summary',
        'examples',
        'exercises',
        'objectives',
        'gap_analysis',
      ]);

      if (
        typeof assistType !== 'string' ||
        !validTypes.has(assistType as AdminAssistType) ||
        typeof subjectTitle !== 'string' ||
        subjectTitle.trim().length < 2 ||
        typeof lessonTitle !== 'string' ||
        lessonTitle.trim().length < 2
      ) {
        res.status(400).json({
          error: 'بيانات المساعدة الإدارية غير مكتملة: حدد نوع المسودة والمادة وعنوان الدرس.',
        });
        return;
      }

      const ai = createGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'مفتاح Gemini API غير مهيأ على الخادم حالياً. أضف GEMINI_API_KEY في لوحة الأسرار (Settings > Secrets).',
        });
        return;
      }

      const typedAssist = assistType as AdminAssistType;
      const safeSubject = subjectTitle.trim().slice(0, 120);
      const safeUnit = typeof unitTitle === 'string' ? unitTitle.trim().slice(0, 160) : 'وحدة منهجية';
      const safeLesson = lessonTitle.trim().slice(0, 180);
      const safeSemester = semester === 2 ? 'الفصل الثاني' : 'الفصل الأول';
      const safeRef = typeof officialRef === 'string' ? officialRef.trim().slice(0, 180) : '';
      const safeContext = typeof existingContext === 'string' ? existingContext.slice(0, 6000) : '';
      const safeSource = typeof sourceSummary === 'string' ? sourceSummary.slice(0, 1500) : '';

      const assistTaskMap: Record<AdminAssistType, string> = {
        explanation:
          'أنشئ مسودة شرح علمي مفصل للدرس مع استنتاج رئيسي وقائمة قوانين أو مفاهيم أساسية في itemsAr.',
        summary:
          'أنشئ مسودة ملخص شامل ومركز للدرس في contentAr ونقاط المراجعة السريعة في itemsAr.',
        examples:
          'أنشئ مسودة مثال محلول واضح للدرس يتضمن نص المسألة في contentAr، المعطيات في itemsAr، خطوات الحل في stepsAr، والناتج النهائي في answerAr.',
        exercises:
          'أنشئ مسودة تمرين تطبيقي متدرج للدرس مع التلميح والإجابة النموذجية.',
        objectives:
          'اقترح أهدافاً تعليمية دقيقة وقابلة للقياس للدرس في itemsAr وفق تصنيف بلوم.',
        gap_analysis:
          'حلل الفجوات التعليمية أو المفاهيم الناقصة مقارنة بالمنهج العُماني في contentAr واقترح توصيات استكمال في itemsAr.',
      };

      const prompt = [
        `المطلوب: ${assistTaskMap[typedAssist]}`,
        `المادة: ${safeSubject} | ${safeSemester}`,
        `الوحدة: ${safeUnit}`,
        `الدرس: ${safeLesson}`,
        safeRef ? `المرجع الرسمي: ${safeRef}` : '',
        safeSource ? `ملخص المصدر المعتمد:\n${safeSource}` : '',
        safeContext ? `سياق المحتوى الحالي:\n${safeContext}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            systemInstruction:
              'أنت مساعد تحرير مناهج في منصة STUDY CORE لوزارة التربية والتعليم العُمانية (الصف الثاني عشر العلمي 2026–2027). أنشئ مسودة عربية علمية دقيقة بصيغة JSON فقط بدون أي LaTeX خام، وتذكّر أن جميع المسودات تُصنف تلقائياً كمسودات بحاجة لمراجعة المشرف (NEEDS_REVIEW).',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                titleAr: { type: Type.STRING, description: 'عنوان المسودة بالعربية' },
                contentAr: { type: Type.STRING, description: 'النص الأساسي للمسودة أو نص المثال/التحليل' },
                itemsAr: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'نقاط المراجعة أو الأهداف أو المعطيات أو التوصيات',
                },
                keyTakeawayAr: { type: Type.STRING, description: 'الاستنتاج الرئيسي أو التلميح' },
                stepsAr: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'خطوات الحل المرتبة عند إنشاء مثال محلول',
                },
                answerAr: { type: Type.STRING, description: 'الناتج النهائي أو الإجابة النموذجية' },
              },
              required: ['titleAr', 'contentAr', 'itemsAr'],
            },
          },
        })
      );

      const rawText = response.text?.trim() ?? '';
      let draft;
      try {
        draft = parseAdminDraftJson(rawText, typedAssist);
      } catch {
        res.status(502).json({
          error: 'أعاد مساعد الذكاء الاصطناعي مسودة غير مكتملة الصياغة. حاول مرة أخرى.',
        });
        return;
      }

      res.json({ draft });
    } catch (error) {
      const classified = classifyGeminiError(
        error,
        'تعذر توليد مسودة المساعد الإداري حالياً.'
      );
      if (classified.httpStatus === 429 || classified.httpStatus === 503) {
        console.warn(`Gemini admin assist throttled (${classified.httpStatus}):`, classified.userMessageAr);
      } else {
        console.error('Gemini admin assist failure:', classified.httpStatus, error);
      }
      if (classified.retryAfterSeconds) {
        res.setHeader('Retry-After', String(classified.retryAfterSeconds));
      }
      res.status(classified.httpStatus).json({
        error: classified.userMessageAr,
        retryAfterSeconds: classified.retryAfterSeconds,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`STUDY CORE full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
