# STUDY CORE Security Specification (Phase 3)

## Data Invariants
1. **PII Isolation**: `/users/{userId}` and all subcollections (`progress`, `attempts`) contain personal student data and MUST be readable and writable only by `request.auth.uid == userId` (with `email_verified == true`) or verified admins.
2. **Centralized Read-Only Curriculum & Sources**: `/academicYears`, `/semesters`, `/subjects`, `/units`, `/lessons`, `/learningObjectives`, `/sources`, and `/questionBank` are centrally managed Omani Ministry of Education curriculum records. Students cannot create, modify, or delete them; only verified admins can mutate curriculum, source, or verification records.
3. **Admin Audit Registry**: `/verificationRecords/{recordId}` records admin verification and reclassification decisions and is restricted to verified admins (`isAdmin()`).
4. **Strict Ownership & Immutability**: Student `progress` and `attempts` documents must bind `userId == request.auth.uid` on creation, preserve `userId` and `createdAt` immutably, and enforce server timestamps (`request.time`).
5. **No Self-Assigned Roles**: Users cannot create or modify documents in `/admins/{userId}` or inject role/admin shadow fields into `/users/{userId}`.
6. **Volumetric Bounds & ID Hardening**: Every document ID path parameter matches `^[a-zA-Z0-9_\\-]+$` (`<= 128` chars), and every string/array field enforces strict `.size()` bounds.

## Dirty Dozen Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated write to `/users/student1`
2. Cross-user read on `/users/student2` by `student1`
3. Cross-user write to `/users/student2/progress/phys-u1-l1` with `userId: "student1"`
4. Shadow field injection (`isAdmin: true`) in `/users/student1`
5. Self-promotion write to `/admins/student1` by non-admin
6. Student attempt to write/overwrite a lesson in `/lessons/phys-u1-l1`
7. Student attempt to modify a source or verification status in `/sources/src-phys-moe-s1`
8. Student attempt to read/write `/verificationRecords/ver-1`
9. Spoofed timestamp (`createdAt: "2020-01-01T00:00:00Z"`) instead of server `request.time` on `/users/student1`
10. Oversized `notesAr` (> 4000 chars) on `/users/student1/progress/phys-u1-l1`
11. Invalid `bestExamScore` (> 100 or < 0) on `/users/student1/progress/phys-u1-l1`
12. Query scraping unpublished draft lessons (`/lessons` without `isPublished == true`) by non-admin
