# STUDY CORE Security Specification (Phase 3.5)

## Data & API Security Invariants
1. **Strict Answer-Key Separation**: `/questionBank/{questionId}` stores ONLY `PublicQuestion` fields (`promptAr`, `optionsAr`, `matchingLeftsAr`, `matchingRightsShuffledAr`, `orderingItemsShuffledAr`, `marks`, `difficulty`, `questionType`, `verificationStatus`, `isPublished`). Private grading fields (`correctAnswer`, `correctAnswers`, `matchingPairs`, `orderingItemsAr`, `explanationAr`, `whyCorrectAr`, `solutionStepsAr`, `commonMistakeAr`, `rubricAr`, `numericTolerance`, `aiMetadata`) reside exclusively in `/questionAnswerKeys/{questionId}` (`allow read, write: if false;` on Firestore client SDKs) and `/server/data/` on the server.
2. **Delivery Gate (`APPROVED && isPublished`)**: Non-admin student reads (`GET /api/questions` and Firestore `questionBank` `get`/`list`) are strictly restricted to items where `isPublished == true && verificationStatus == 'APPROVED'`. Unverified legacy items (`NEEDS_REVIEW`), AI drafts (`PENDING_REVIEW`), `NEEDS_CORRECTION`, `REJECTED`, and `OUTDATED` items are never returned to student endpoints or public bundles.
3. **Server-Authoritative Exam & Practice Grading**: Students start timed sessions (`POST /api/exams/start`, `POST /api/practice/start`) and submit answers (`POST /api/exams/submit`, `POST /api/practice/answer`). Grading executes strictly on the server (`/server/gradingEngine.ts`), session ownership (`uid`) and single-submit invariants are enforced, and client-submitted scores are rejected.
4. **Tamper-Proof Student Attempts & Scores**: Firestore rules block client writes to `/users/{userId}/attempts/{attemptId}` and `/users/{userId}/practiceLogs/{logId}` (`allow create, update: if false;`), and prevent non-admin updates to `bestExamScore` in `/users/{userId}/progress/{lessonId}` (students must initialize `bestExamScore == 0` and cannot modify `bestExamScore` client-side).
5. **Firebase Admin Token Verification & RBAC**: All API routes for AI tutoring, practice checking, exam grading, and admin CMS operations require a valid Firebase ID token (`Authorization: Bearer <token>`) verified via `adminAuth.verifyIdToken(...)`. Admin endpoints (`/api/admin/*`, `/api/tutor/generate-questions`) additionally mandate `email_verified == true` and admin membership (`custom claim admin`, `/admins/{uid}`, or `BOOTSTRAP_ADMIN_EMAIL`).
6. **PII Isolation & Bounded Inputs**: `/users/{userId}` and subcollections are isolated to `request.auth.uid == userId` or verified admins. All server endpoints enforce strict Zod schema validation, Gemini timeouts (`25s`), bounded retries, and per-user sliding-window rate limits returning `429` + `Retry-After`.
7. **Admin Governance & Audit Trails**: `/verificationRecords/{recordId}`, `/questionReviews/{reviewId}`, and `/questionVersions/{versionId}` record admin curriculum decisions and edits, restricted to verified administrators.

## Dirty Dozen Payloads (Must Return PERMISSION_DENIED / 401 / 403 / 400)
1. Client read or list on `/questionAnswerKeys/{questionId}` -> `PERMISSION_DENIED`.
2. Client write to `/questionBank/{questionId}` injecting `correctAnswer` or `explanationAr` -> `PERMISSION_DENIED`.
3. Student read/list on `/questionBank` for a `NEEDS_REVIEW` or `PENDING_REVIEW` item -> `PERMISSION_DENIED`.
4. Student forging a high score by creating `/users/student1/attempts/fake-att` -> `PERMISSION_DENIED`.
5. Student forging `bestExamScore: 100` in `/users/student1/progress/phys-u1-l1` -> `PERMISSION_DENIED`.
6. Unauthenticated request to `POST /api/tutor/chat`, `POST /api/practice/answer`, or `POST /api/exams/submit` -> HTTP `401`.
7. Authenticated student calling `POST /api/admin/generate-questions`, `POST /api/tutor/generate-questions`, or `POST /api/admin/questions/:id/review` -> HTTP `403`.
8. Student submitting someone else's `sessionId` to `POST /api/exams/submit` -> HTTP `403`.
9. Replay/double submission of an already-submitted `sessionId` to `POST /api/exams/submit` -> HTTP `409`.
10. Admin email spoofing without `email_verified: true` -> `PERMISSION_DENIED` / HTTP `403`.
11. Self-promotion write to `/admins/student1` or shadow field `isAdmin: true` in `/users/student1` -> `PERMISSION_DENIED`.
12. Rate-limit burst or oversized/malformed prompt exceeding Zod bounds -> HTTP `429` / `400`.
