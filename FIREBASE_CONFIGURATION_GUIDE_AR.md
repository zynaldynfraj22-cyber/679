# دليل تهيئة Firebase والصلاحيات الأمنية لمنصة STUDY CORE (العربية)

هذا الدليل يوضح الخطوات الدقيقة لربط وتهيئة مشروع Firebase وقاعدة بيانات Cloud Firestore في وضعي **Starter Tier (الطبقة المجانية/المعاينة)** و**User-Owned Project (المشروع المملوك للمستخدم مع صلاحيات IAM)**، دون كشف أي مفاتيح سرية داخل الشيفرة المصدرية.

---

## 1. المعرفات الأساسية للمنصة

- **معرّف مشروع Firebase (`Project ID`)**: `gen-lang-client-0653256287`
- **معرّف قاعدة بيانات Cloud Firestore (`Database ID`)**: `ai-studio-d30907b4-392c-4f80-8fc4-06e7eccebc61`
- **حساب المشرف المبدئي (`Bootstrap Admin Email`)**: `zynaldynfraj22@gmail.com`
- **حساب الخدمة لبيئة التشغيل الحالية (`Preview Runtime Service Account`)**:  
  `ais-sandbox@ais-europe-west1-984c117bc28c4.iam.gserviceaccount.com`

---

## 2. متغيرات البيئة المطلوبة (`.env` / لوحة الأسرار Settings > Secrets)

لا تحفظ هذه القيم داخل مستودع الشيفرة (Git). أضفها في لوحة الأسرار في Google AI Studio أو في ملف `.env` محلياً فقط:

```env
GEMINI_API_KEY="مفتاح_جيميني_السري_على_الخادم"
FIREBASE_PROJECT_ID="gen-lang-client-0653256287"
FIREBASE_FIRESTORE_DATABASE_ID="ai-studio-d30907b4-392c-4f80-8fc4-06e7eccebc61"
BOOTSTRAP_ADMIN_EMAIL="zynaldynfraj22@gmail.com"
PORT=3000
```

> **ملاحظة**: يجب أن يكون `GEMINI_API_KEY` على الخادم فقط (وليس `VITE_GEMINI_API_KEY`) حتى لا ينكشف في المتصفح.

---

## 3. التمييز بين وضع المعاينة (Starter Tier) والمشروع المملوك (User-Owned IAM)

### أولاً: التحقق من هوية المستخدم (`Firebase Auth ID Token`)
- يعمل `verifyIdToken` عبر `firebase-admin` باستخدام معرّف المشروع `gen-lang-client-0653256287` تلقائياً لتحقق الخادم من توكنات الدخول الصادرة للطلبة والمشرفين.
- شروط التفعيل الأساسية في Firebase Console:
  1. تفعيل **Authentication > Sign-in method > Google**.
  2. إضافة نطاق المعاينة والنطاق الإنتاجي ضمن **Authentication > Settings > Authorized domains** (بالإضافة إلى `localhost`).

### ثانياً: صلاحيات الكتابة من الخادم إلى Cloud Firestore (`Admin SDK IAM`)
- عند تصحيح اختبار أو تمرين تفاعلي على الخادم، يحاول الخادم حفظ:
  - محاولة الطالب في `/users/{uid}/attempts/{attemptId}`
  - تحديث أعلى درجة في `/users/{uid}/progress/{lessonId}` (`bestExamScore`)
  - سجل التدريب في `/users/{uid}/practiceLogs/{logId}`
  - مفاتيح الإجابة في `/questionAnswerKeys/{questionId}`
- **في بيئة المعاينة المقيدة بدون IAM (`Starter Tier`)**: قد يعيد Firestore Admin SDK خطأ `PERMISSION_DENIED` لأن حساب الخدمة (`ais-sandbox@...`) لا يملك دور IAM بعد. في هذه الحالة:
  - يتعامل الخادم بأمان تام (**Fail-Closed**): يستمر في تصحيح الاختبار وإرجاع النتيجة الموثقة مع إشعار واضح للطالب (`persistedToFirestore: false`)، ويحتفظ بالمحاولة في ذاكرة الجلسة عبر `/api/student/attempts`.
- **لتفعيل الحفظ الكامل في الإنتاج (`User-Owned GCP Project`)**:
  1. افتح Google Cloud Console للمشروع `gen-lang-client-0653256287`.
  2. انتقل إلى **IAM & Admin > IAM**.
  3. امنح حساب الخدمة المستخدم لتشغيل الخادم (`ais-sandbox@ais-europe-west1-984c117bc28c4.iam.gserviceaccount.com` في بيئة AI Studio، أو حساب خدمة Cloud Run في الإنتاج) الدور التالي:
     - `Cloud Datastore User` (`roles/datastore.user`)
  4. أو استخدم ملف حساب خدمة خاص بالمشروع عبر `GOOGLE_APPLICATION_CREDENTIALS` في بيئة الخادم الإنتاجية فقط (دون رفعه إلى Git).

---

## 4. نشر قواعد الأمان المحدّثة (`firestore.rules`)

**تنبيه مهم**: تم تحديث ملف `/firestore.rules` وفحصه بنجاح عبر `npx eslint firestore.rules` (صفر أخطاء)، ولم يُنشر تلقائياً بانتظار موافقة المشرف.

لنشر القواعد بعد المراجعة:
1. راجع قواعد الأمان الجديدة التي تمنع قراءة `/questionAnswerKeys/*` من المتصفح، وتمنع تزوير `attempts` أو `bestExamScore` من جهة الطالب.
2. نفّذ النشر من خلال لوحة AI Studio Firebase أو عبر الأمر:
   ```bash
   firebase deploy --only firestore:rules --project gen-lang-client-0653256287
   ```
3. بعد نشر القواعد، يمكن للمشرف استخدام حساب `zynaldynfraj22@gmail.com` أو إضافة أي مشرفين إضافيين في مجموعة `/admins/{uid}` أو عبر Custom Claims (`admin: true`).

---

## 5. الترقية التدريجية لحسابات المشرفين (Admins)

- يعتمد النظام حالياً على التحقق من البريد الموثق `zynaldynfraj22@gmail.com` كمشرف مبدئي (`bootstrap_email`).
- يُوصى في البيئة الإنتاجية بإنشاء وثيقة لكل مشرف في `/admins/{uid}` مع تعيين Custom Claim (`admin: true`) عبر Firebase Admin SDK، ثم إزالة الاعتماد على البريد المبدئي لاحقاً.
