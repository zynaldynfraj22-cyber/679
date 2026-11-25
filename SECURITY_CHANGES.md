# STUDY CORE — Phase 3.5 Security Hardening Changelog

## 1. Threat Mitigations Implemented

| Vulnerability / Gap (Pre-Phase 3.5) | Remediation Applied | Verification Evidence |
|---|---|---|
| Answer keys (`correctAnswer`, `matchingPairs`, `explanationAr`) bundled inside client JS (`src/data/questionBankExtended.ts`) and `/questionBank` Firestore docs | Deleted `src/data/questionBankExtended.ts`; split into server-only `/server/data/*` + sanitized `/src/data/questionBankPublic.ts`; moved grading to `/server/gradingEngine.ts` | `dist/assets/*.js` grep confirms zero bundled answers; `npm test` asserts 0 private keys on `PUBLIC_QUESTION_BANK` and `GET /api/questions` |
| Unauthenticated access to `/api/tutor/chat`, `/api/tutor/generate-questions`, `/api/admin/assist` | Enforced Firebase ID token verification via `server/firebaseAdmin.ts` (`requireVerifiedUser` for student endpoints, `requireAdministrator` for admin endpoints) | Integration tests assert `401` (missing/bad token), `403` (unverified email & non-admin calling admin routes), `200` (authorized) |
| Legacy questions without explicit `verificationStatus` auto-defaulted to `APPROVED` | Updated `normalizeQuestionDefaults()` in `src/utils/questionEngine.ts`: legacy -> `NEEDS_REVIEW`, AI -> `PENDING_REVIEW`; `isQuestionDeliverableToStudent()` requires `isPublished && APPROVED` | Unit tests + `GET /api/questions` deliver only 42 `APPROVED` items; `/api/practice/answer` returns `404` for unapproved items |
| Client-side exam scoring (`gradeAssessment`) & client-forged `recordExamAttempt` / `bestExamScore` writes | Removed client grading & `recordExamAttempt`; added `/api/exams/start` + `/api/exams/submit` with session `uid` ownership and replay lock; locked `attempts` and `bestExamScore` in `firestore.rules` | Tests confirm cross-user submit -> `403`, replay submit -> `409`, and `firestore.rules` regex + ESLint security validation |
| Unbounded API requests & unvalidated JSON payloads | Added Zod schemas (`server/app.ts`) and per-UID/IP sliding-window rate limiters (`server/rateLimiter.ts`) returning `429` + `Retry-After` | Tests verify `400` on invalid input and `429` + `Retry-After` when sliding window limit is exceeded |
| `AdminCmsView.tsx` calling `/api/admin/assist` without `Authorization` header | Replaced raw `fetch` with `requestAdminAssistApi()` from `src/services/firestoreService.ts` attaching Firebase Bearer token | Verified via TypeScript compilation and `AdminCmsView.tsx` integration |

---

## 2. Modified & Added Security Files

- **Server Auth & Middleware**: `/server/firebaseAdmin.ts`
- **Rate Limiting**: `/server/rateLimiter.ts`
- **Server Question Isolation & Sessions**: `/server/questionStore.ts`, `/server/data/legacyQuestions.ts`, `/server/data/extendedQuestions.ts`
- **Server Grading Engine**: `/server/gradingEngine.ts`
- **Express Security Routes & Zod Validation**: `/server/app.ts`, `/server.ts`
- **Firestore Security Rules & Schema**: `/firestore.rules`, `/firebase-blueprint.json`, `/security_spec.md`
- **Client Auth Headers & Sanitized Projections**: `/src/services/firestoreService.ts`, `/src/data/questionBankPublic.ts`, `/src/data/questionBank.ts`, `/src/utils/questionEngine.ts`
- **Environment & Lint Config**: `/.env.example`, `/eslint.config.js`, `/tsconfig.json`
- **Security Test Suite**: `/src/utils/phase35Security.test.ts`

---

## 3. Admin Role Resolution Defense-in-Depth

1. Client UI checks (`checkUserIsAdmin`) are strictly presentational. All privileged routes enforce role authorization server-side in `requireAdministrator` and in Firestore via `isAdmin()`.
2. Unverified accounts (`email_verified !== true`) are rejected (`403`) even if their email matches the bootstrap admin address.
3. Custom claims (`admin: true` / `role: 'admin'`) and `/admins/{uid}` registry documents are checked first, with `BOOTSTRAP_ADMIN_EMAIL` (`zynaldynfraj22@gmail.com`) acting only as a verified-email transitional fallback.
