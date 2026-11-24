# STUDY CORE — Phase 2 Audit & Verification Walkthrough

# Security Summary

## 1. Firebase Security Rules (`firestore.rules`)
- **Static Rules Validation**: `npx eslint firestore.rules` exited with code `0` (no syntax or static validation errors).
- **Default-Deny Posture**: Global catch-all `match /{document=**} { allow read, write: if false; }` is enforced at lines 5–7.
- **Role & Ownership Separation**:
  - Centralized curriculum collections (`/subjects`, `/units`, `/lessons`, `/questionBank`) are public-read for `isPublished == true` documents and restricted to `isAdmin()` (`isBootstrappedAdmin()` or verified `/admins/{uid}`) for writes.
  - Student private records (`/users/{userId}`, `/users/{userId}/progress/{lessonId}`, `/users/{userId}/attempts/{attemptId}`) enforce ownership (`request.auth.uid == userId`) and strict schema/type/field-allowlist checks (`hasOnly`) on writes.
  - Exam attempts (`/users/{userId}/attempts/{attemptId}`) are immutable (`allow update: if false;` on line 244; `allow delete` restricted to `isAdmin()`).
- **Unpublished Findings in `firestore.rules`** *(Not modified or redeployed because Java / Firebase Emulator is unavailable in this environment, per the requirement not to publish untested rules)*:
  1. **Delete Missing Email Verification (`firestore.rules:235`)**: `match /users/{userId}/progress/{lessonId}` `allow delete` checks `isOwner(userId) || isAdmin()` without `isVerifiedUser()`, unlike `allow create` (line 222) and `allow update` (line 225).
  2. **Read Rules Missing `isVerifiedUser()` (`firestore.rules:205-206, 220-221, 239-240, 251`)**: `get`/`list` checks on student PII and `/admins/{userId}` check `isOwner`/`isSignedIn` without `isVerifiedUser()`. Currently mitigated because only Google OAuth is configured in the client (`googleProvider`), which normally provides verified emails.
  3. **Schema Field Omissions (`firestore.rules:77, 96`)**: `isValidLesson` `hasOnly` omits `keyPointsAr` and `exercises`; `isValidQuestion` `hasOnly` omits `numericTolerance` and `sourceRefAr`. Those fields are currently preserved locally in `src/App.tsx` during Firestore merge rather than persisted via `seedCurriculumToFirestore`.
  4. **Admin UI Alignment (`src/App.tsx:341-343`)**: `isAdminUser` in the client UI checks only `user?.emailVerified && user.email === 'zynaldynfraj22@gmail.com'`, so admins added dynamically via `/admins/{uid}` have Firestore write permissions but will not see the admin seeding control in `DashboardView` unless the client also checks `/admins/{uid}`.

## 2. Client-Side Firestore Sync & Auth Hardening
- **Fixed `updateUserActiveSemester` (`src/services/firestoreService.ts:62-77`)**: Replaced `setDoc(..., { merge: true })` (which resent `createdAt: profile.createdAt ?? serverTimestamp()` and violated `firestore.rules:214,216` immutability and `affectedKeys()` restrictions on newly created profiles) with `updateDoc(userRef, { activeSemester, updatedAt: serverTimestamp() })`.
- **Preserved Preloaded Lesson & Question Fields (`src/App.tsx:88-126`)**: Merged remote Firestore curriculum documents with preloaded `keyPointsAr`, `keyFormulas`, `sections`, `solvedExamples`, `exercises`, `numericTolerance`, and `sourceRefAr` fallbacks so partial remote documents cannot break rendering or numeric tolerance grading.
- **Auth Domain Restriction Observed (`auth/unauthorized-domain`)**: Clicking `تسجيل الدخول` on `http://localhost:3000` threw `Firebase: Error (auth/unauthorized-domain)` in the browser console; the error was caught gracefully and surfaced via the accessible `role="alert"` notice without crashing the UI. Production/preview domains (`ais-dev-*`, `ais-pre-*`, custom domains) must be added under Firebase Console → Authentication → Settings → Authorized domains.

## 3. Server-Side Gemini AI Hardening (`server.ts`, `src/utils/geminiHelpers.ts`, `src/components/AiTutorPanel.tsx`)
- **API Key Isolation**: `GEMINI_API_KEY` is read strictly on the Node/Express backend (`server.ts`) and never exposed in client bundles or `VITE_*` variables.
- **429 Quota & Transient Error Handling**:
  - Separated transient retryable errors (`503`, `UNAVAILABLE`, network timeouts) from `429 RESOURCE_EXHAUSTED` quota limits (`isTransientGeminiError`) so `429` responses are never burst-retried.
  - Added `GEMINI_TIMEOUT_MS = 25000` backend deadline (`withTimeout`) and `30000ms` client `AbortController` timeout (`postTutorJson`).
  - Normalized upstream failures (`429` with `Retry-After` header, `504` timeout, `503` missing/invalid key or unavailability, `502` upstream error) into clean Arabic JSON messages without leaking raw Google error payloads.
- **Formatting & Input Validation**: Added `lessonTitle`/`subjectTitle` non-empty checks, Markdown/LaTeX-free plain-text/Unicode math instructions in `server.ts`, and `parseGeneratedQuestionsJson` fence stripping and field validation.

## 4. Dependency Advisories (`bun audit`)
- Two transitive advisories remain in `@grpc/grpc-js@1.9.16` (`GHSA-m9gg-hp2v-232j` High, `GHSA-f596-whhp-79r4` Low) pulled in via `firebase > @firebase/firestore-compat > @firebase/firestore`.

---

## PoC Verification

1. **Build, Typecheck & Unit Tests (Executed After Final Code Edits)**:
   - `compile_applet`: **Passed** (`Build succeeded - the applet is compiled`).
   - `lint_applet` (`tsc --noEmit`): **Passed** (`Linting completed successfully`).
   - `npx --yes tsx --test src/utils/curriculumEngine.test.ts`: **8 / 8 tests passed** (covering `normalizeAnswer`, `filterQuestions`, `gradeAssessment`, `computeSubjectProgress`, `sanitizeUserNotes`, `isTransientGeminiError`, `classifyGeminiError`, `parseGeneratedQuestionsJson`).
   - `npx eslint firestore.rules`: **Passed** (exit code `0`).

2. **Live Server & Gemini Endpoint Verification**:
   - `GET /api/health` → `HTTP 200` `{"ok":true,"aiConfigured":true}`.
   - `POST /api/tutor/chat` with short invalid prompt `'؟'` → `HTTP 400` clean Arabic validation error.
   - `POST /api/tutor/generate-questions` with empty `lessonTitle` → `HTTP 400` clean Arabic validation error.
   - `POST /api/tutor/chat` (live Physics numeric problem, `mode: "solve"`) → `HTTP 200` with accurate step-by-step Arabic derivation (`r = 6.97×10⁶ m`, `g = 8.20 N/kg`).
   - `POST /api/tutor/generate-questions` (live) → Encountered project Free-Tier quota exhaustion (`HTTP 429`, `Retry-After: 70748`); confirmed graceful Arabic error handling without server crash.

3. **Real Browser Audit (`playwright-cli` against `http://localhost:3000` after final restart)**:
   - **Desktop (`1440×900`) & Mobile (`390×844`)**: `dir="rtl"`, `lang="ar"`, `desktopOverflow=false`, `mobileOverflow=false`.
   - **Interactive Flows Verified**: Dark mode toggle, hidden admin seed controls when signed out, subject/semester switching, all 5 `LessonReader` tabs (`explanation`, `summary`, `examples`, `exercises` with note saving staying on the active tab, and `exam` grading), bookmark/completion state updating Dashboard KPIs (`1 من 24`), confirmation that guest progress resets to `0 من 24` on reload, Question Bank multi-filter (`math` = `7 من 31`, `short_answer` empty state, reset, grading), AI Tutor input/mode validation, and mobile navigation drawer.
   - **Auth Popup Verification**: Clicking `تسجيل الدخول` triggered `auth/unauthorized-domain` on `localhost`, caught and displayed in `role="alert"` (`تعذر إتمام تسجيل الدخول عبر نافذة جوجل. يمكنك المتابعة في التصفح.`).
   - **Emulator Limitation**: Firebase Emulator Suite could not run in this container because `java` is not installed (`java: not found`, `~/.cache/firebase/emulators` absent). Live Firestore `Listen/channel` requests returned `HTTP 200`.
