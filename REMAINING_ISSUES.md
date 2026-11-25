# STUDY CORE — Remaining Known Issues & Pending Actions (Post Phase 3.5)

This document lists open items that intentionally await administrator approval, external cloud provisioning, or Phase 4 curriculum authoring.

---

## 1. Security Rules Deployment Pending Approval
- **Item**: `/firestore.rules` and `/firebase-blueprint.json` have been updated and validated (`npx eslint firestore.rules` passed with 0 errors), but **have NOT been deployed** to live project `gen-lang-client-0653256287`.
- **Risk Until Deployed**: Old live rules may still govern the production Firestore database until deployed.
- **Required Action**: Review `/DATABASE_MIGRATION_PLAN.md` and deploy rules (`deploy_firebase` or `firebase deploy --only firestore:rules`), followed by migrating existing `/questionBank` docs to remove any legacy answer keys.

---

## 2. Firebase Admin SDK Firestore IAM (`roles/datastore.user`)
- **Item**: The preview runtime service account (`ais-sandbox@ais-europe-west1-984c117bc28c4.iam.gserviceaccount.com`) does not automatically receive `roles/datastore.user` IAM permissions on user-owned GCP project `gen-lang-client-0653256287` unless granted by the project owner.
- **Current Behavior**:
  - `verifyIdToken` authentication enforcement works without Firestore IAM.
  - Server-side Firestore writes (`/users/{uid}/attempts`, `/users/{uid}/practiceLogs`, server `bestExamScore` updates, and admin Firestore writes to `/questionAnswerKeys`) catch `PERMISSION_DENIED`, degrade gracefully with `persistedToFirestore: false` + honest Arabic `persistenceNoticeAr`, and retain state in server memory during the active process.
- **Required Action**: Grant `roles/datastore.user` per `/FIREBASE_CONFIGURATION_GUIDE_AR.md` for persistent production Cloud Firestore writes from the Express backend.

---

## 3. Legacy Question Verification & Uncovered Lesson Gaps
- **Legacy Unverified Questions**: `53` questions in `/server/data/legacyQuestions.ts` lack explicit `sourceId` citations and are strictly held in `'NEEDS_REVIEW'` status (`isDeliverableToStudent === false`).
- **Uncovered Lessons Among Implemented 40 Lessons**:
  - `37 / 40` implemented lessons currently have `APPROVED` questions visible to students.
  - `3` lessons (`chem-u1-l1`, `chem-u7-l1`, `math-u3-l2`) have only `NEEDS_REVIEW` legacy questions and therefore display 0 student-visible exam questions until reviewed and approved in the CMS Question Governance tab (`إدارة ومراجعة بنك الأسئلة`) or supplemented in Phase 4.
- **Missing Official Catalog Lessons**: `107 / 147` official Ministry of Education catalog lesson slots remain unimplemented as full 6-part lessons (`40 / 147` currently implemented, carried forward from Phase 3 audit for Phase 4+).

---

## 4. Gemini API Quota & Model Availability
- **Item**: Free-tier Gemini API keys (`gemini-4-hydrogen`) are subject to strict RPM/RPD limits (`429 RESOURCE_EXHAUSTED`).
- **Mitigation Applied**: Backend rate limiters (`server/rateLimiter.ts`), 25s timeout, no burst retries on `429`, and structured Arabic retry messages with `Retry-After` headers.
- **Pending Requirement**: Production traffic should use a billed Gemini API key configured exclusively in server environment secrets (`GEMINI_API_KEY`).
