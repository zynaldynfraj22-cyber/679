# STUDY CORE — Database Migration Plan (Public/Private Question Split & Attempt Governance)

**Target Project**: `gen-lang-client-0653256287`  
**Target Database**: `ai-studio-d30907b4-392c-4f80-8fc4-06e7eccebc61`  
**Status**: Dry-Run Verified (`--execute` gated until admin confirms rules deployment & IAM)

---

## 1. Objective

Migrate Firestore from the legacy single-collection `/questionBank/{questionId}` schema (which previously stored `correctAnswer` and `explanationAr` inside student-readable documents) into a strict two-collection architecture:

1. **`/questionBank/{questionId}` (Public Student-Safe Projection)**  
   - Readable by any client ONLY when `isPublished == true && verificationStatus == 'APPROVED'`.
   - Writable only by verified Administrators or Firebase Admin SDK.
   - Security rules strictly forbid writing private fields (`correctAnswer`, `correctAnswers`, `matchingPairs`, `orderingItemsAr`, `explanationAr`, `whyCorrectAr`, `solutionStepsAr`, `commonMistakeAr`, `rubricAr`, `numericTolerance`, `aiMetadata`).
   - Stores pre-shuffled `matchingRightsShuffledAr` and `orderingItemsShuffledAr` so students cannot infer answers from option ordering.

2. **`/questionAnswerKeys/{questionId}` (Private Server-Only Answer Keys)**  
   - `allow read, write: if false;` in `firestore.rules` (completely inaccessible from browser clients, readable/writable only via Firebase Admin SDK on Express server).
   - Stores `correctAnswer`, `correctAnswers`, `matchingPairs`, `orderingItemsAr`, `rubricAr`, `numericTolerance`, `requiredUnit`, `explanationAr`, `whyCorrectAr`, `solutionStepsAr`, `commonMistakeAr`, `aiMetadata`, and `scientificValidation`.

3. **Supporting Governance & Audit Collections**:
   - `/questionReviews/{reviewId}`: Immutable audit trail of reviewer status transitions (`PENDING_REVIEW`, `NEEDS_REVIEW`, `APPROVED`, `NEEDS_CORRECTION`, `REJECTED`, `OUTDATED`).
   - `/questionVersions/{versionId}`: Version history snapshots created on question edits.
   - `/examinationBlueprints/{blueprintId}`: Published test/exam blueprints.
   - `/users/{userId}/attempts/{attemptId}`: Client `create`/`update` locked (`if false`), server-written after authoritative grading.
   - `/users/{userId}/practiceLogs/{logId}`: Read-only for student owner, written by server on practice checks.
   - `/users/{userId}/progress/{lessonId}`: Student may edit `status`, `bookmarked`, `notesAr`, but `bestExamScore` is immutable by client rules and updated exclusively by the server.

---

## 2. Dry-Run Verification Results

Executed via `npx tsx scripts/migrateQuestionsDryRun.ts`:

- **Total Questions Scanned**: `97` (`53` legacy + `44` extended)
- **Public Projections Prepared (`/questionBank`)**: `97`
- **Private Answer Key Documents Prepared (`/questionAnswerKeys`)**: `97`
- **Public Leak Check Passed**: `true` (0 forbidden answer/explanation fields in any public record)
- **Public/Private ID Parity Passed**: `true` (1:1 correspondence across all 97 IDs)
- **Verification Status Breakdown**:
  - `APPROVED`: `42`
  - `NEEDS_REVIEW`: `53`
  - `PENDING_REVIEW`: `1`
  - `NEEDS_CORRECTION`: `1`
  - `REJECTED`: `0`
  - `OUTDATED`: `0`
- **Incomplete/Missing `sourceId` Records**: `55` (53 legacy items + 2 extended drafts requiring source link before approval)
- **Potential Duplicate Pairs Flagged**: `0`

---

## 3. Safe Execution Sequence (Admin Approval Required)

1. **Step 1 — Backup Existing Firestore Collections**: Export current `/questionBank`, `/lessons`, `/users/*/attempts`, and `/users/*/progress` via GCP Firestore export (`gcloud firestore export`) or Firebase console before modifying live documents.
2. **Step 2 — Grant Preview/Server Service Account IAM Role**: Ensure the backend service account (`ais-sandbox@ais-europe-west1-984c117bc28c4.iam.gserviceaccount.com` or Cloud Run runtime service account) has `roles/datastore.user` (Cloud Datastore User) on project `gen-lang-client-0653256287`.
3. **Step 3 — Deploy Updated Security Rules**: Review `/firestore.rules` (passes `npx eslint firestore.rules`) and deploy via Firebase CLI (`firebase deploy --only firestore:rules`) or AI Studio `deploy_firebase`.
4. **Step 4 — Populate Split Collections**:
   - Run admin curriculum seed (`seedCurriculumToFirestore`) or an authorized server-side migration job to write sanitized `/questionBank/{questionId}` documents (removing legacy answer fields from `/questionBank`) and write full answer keys to `/questionAnswerKeys/{questionId}`.
5. **Step 5 — Post-Migration Smoke Check**:
   - Confirm unauthenticated/student reads on `/questionAnswerKeys/*` return `PERMISSION_DENIED`.
   - Confirm `/questionBank` queries with `verificationStatus == 'APPROVED'` return `42` documents without `correctAnswer`.
   - Complete an end-to-end timed exam as a verified student and confirm `/users/{uid}/attempts/{attemptId}` is created by the server and `bestExamScore` updates on `/users/{uid}/progress/{lessonId}`.
