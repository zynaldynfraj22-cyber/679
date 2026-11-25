# STUDY CORE — Phase 3.5 Repair, Security Hardening & Integration Report

**Academic Target**: Grade 12 Scientific Track — Sultanate of Oman (2026–2027)  
**Target Firebase Project**: `gen-lang-client-0653256287`  
**Target Firestore Database**: `ai-studio-d30907b4-392c-4f80-8fc4-06e7eccebc61`  
**Administrator Account**: `zynaldynfraj22@gmail.com`

---

## 1. Executive Summary of Repairs Performed

Phase 3.5 repaired critical security, data-integrity, and architectural gaps between the Phase 1–3 client bundle and backend services before Phase 4 expansion:

1. **Eliminated Client-Side Answer Key Leakage**:
   - Removed `/src/data/questionBankExtended.ts` from the client bundle so Vite no longer compiles `correctAnswer`, `correctAnswers`, `matchingPairs`, `orderingItemsAr`, `explanationAr`, `whyCorrectAr`, `solutionStepsAr`, `commonMistakeAr`, `rubricAr`, `numericTolerance`, or `aiMetadata` into browser JS assets.
   - Split question data on the server into `/server/data/legacyQuestions.ts` (53 legacy items) and `/server/data/extendedQuestions.ts` (44 Phase 4 items), totaling **97** unique server-side questions.
   - Created a strictly sanitized client projection `/src/data/questionBankPublic.ts` containing **42** explicitly `APPROVED` & `isPublished: true` `PublicQuestion` items. Verified built assets (`dist/assets/*.js`) contain zero bundled answer keys.

2. **Fixed Legacy Question Auto-Approval Vulnerability**:
   - Previously, legacy questions without explicit `verificationStatus` defaulted to `'APPROVED'` in `normalizeQuestionDefaults()`.
   - Repaired `normalizeQuestionDefaults()` in `/src/utils/questionEngine.ts`:
     - Legacy/manual items without explicit verification status now default to `'NEEDS_REVIEW'`.
     - AI-generated items (`origin === 'AI_GENERATED'` or having `aiMetadata`) default to `'PENDING_REVIEW'`.
     - `isQuestionDeliverableToStudent()` strictly requires `isPublished === true && verificationStatus === 'APPROVED'`.

3. **Enforced Firebase Authentication & Role Separation on Express API**:
   - Added `/server/firebaseAdmin.ts` verifying `Authorization: Bearer <Firebase ID Token>` via Firebase Admin SDK `verifyIdToken`.
   - Protected `/api/practice/start`, `/api/practice/answer`, `/api/exams/start`, `/api/exams/submit`, `/api/student/attempts`, and `/api/tutor/chat` with `requireVerifiedUser` (returns `401` when missing/invalid token, `403` when email is unverified).
   - Protected `/api/tutor/generate-questions`, `/api/admin/generate-questions`, `/api/admin/assist`, `/api/admin/questions`, `/api/admin/questions/:id/review`, and `/api/admin/migration/dry-run` with `requireAdministrator` (returns `403` for non-admin students).

4. **Replaced Client-Side Exam Grading with Server-Authoritative Assessment Engine**:
   - Removed client grading (`gradeAssessment` / `isQuestionAnswerCorrect`) and client `recordExamAttempt` writes.
   - Added `/server/gradingEngine.ts` and `/server/questionStore.ts` handling all **12 question types** (`mcq`, `multi_select`, `true_false`, `fill_blank`, `short_answer`, `numeric`, `matching`, `ordering`, `scientific_explanation`, `structured_long`, `diagram_interpretation`, `data_graph_analysis`) and **5 difficulty tiers** (`foundation`, `basic_application`, `intermediate`, `advanced`, `olympiad`).
   - Added session ownership checks (`403`), replay/double-submit protection (`409`), Zod schema validation (`400`), and sliding-window rate limiting (`429` + `Retry-After`) in `/server/rateLimiter.ts`.

5. **Completed UI Integration & Admin Question Governance Studio**:
   - Added `/src/components/QuestionRenderer.tsx` (Arabic RTL renderer for all 12 types, SVG diagrams, data tables, and post-submission server feedback) and `/src/components/ExamResultsView.tsx`.
   - Upgraded `/src/components/QuestionBankView.tsx` and `/src/components/LessonReader.tsx` to use server practice & timed exam APIs with `localStorage` draft resilience.
   - Fixed `/src/components/AdminCmsView.tsx` to attach Firebase Bearer tokens (`requestAdminAssistApi`) and added the **Question Bank Governance & Review Studio** (`questions` sub-tab) with KPI audit summary, filters across all 5 difficulties and 12 types, duplicate detection display, scientific validation alerts, one-click review (`APPROVED`, `NEEDS_CORRECTION`, `REJECTED`), upsert editor, AI draft generator, and dry-run migration trigger.

---

## 2. Pre-Repair Snapshot & Audit Metrics

- **Original Snapshot Backup Location**: `/backups/phase3_5_snapshot/`
- **Total Questions Audited**: `97` (`53` legacy + `44` extended)
- **Verification Breakdown After Normalization Fix**:
  - `APPROVED`: `42` (delivered to students via `/questionBank` and `GET /api/questions`)
  - `NEEDS_REVIEW`: `53` (unverified legacy items isolated server-side)
  - `PENDING_REVIEW`: `1` (AI-generated question awaiting review)
  - `NEEDS_CORRECTION`: `1` (flagged for correction)
  - `REJECTED`: `0`, `OUTDATED`: `0`
- **Lesson Coverage Breakdown**: `37 / 40` implemented lessons have at least 1 `APPROVED` question; `3` lessons (`chem-u1-l1`, `chem-u7-l1`, `math-u3-l2`) have only `NEEDS_REVIEW` legacy questions and await supervisor review.

---

## 3. Verification Summary

- `tsc --noEmit` (`npm run lint`): Passed (0 errors).
- `npx eslint firestore.rules`: Passed (0 warnings/errors).
- `npm test` (`src/utils/curriculumEngine.test.ts` + `src/utils/phase35Security.test.ts`): **20/20** tests passing.
- `npx tsx scripts/migrateQuestionsDryRun.ts`: Exited `0`, `Public Leak Check Passed: true`, `Public/Private ID Parity Passed: true`.
- `npm run build` / `compile_applet`: Succeeded with zero bundled answer keys in `dist/assets/*.js`.
- Playwright CLI live browser verification on `http://localhost:3000`: Verified Desktop (`1440x900`) and Mobile (`390x844`) layouts, clean console (`0` errors), `/api/questions` zero-leak payload, Question Bank 5 difficulties / 12 types, Lesson Exam & AI Tutor guest auth prompts, and Admin CMS Governance guard.
