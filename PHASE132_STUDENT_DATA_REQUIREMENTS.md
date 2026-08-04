# Phase 132 Student Data Requirements

## 1. Student Schema Analysis
The pipeline depends on the `Student` table in the database to reconcile unstructured payment names with formal accounting identities.
Key required fields in the `Student` table:
- `id` (UUID)
- `firstName` / `lastName`
- `admissionNumber` / `enrollmentNo`

## 2. Student Matching Logic
When an email arrives, `StudentPaymentExtractor` extracts `rawStudentName` and (optionally) `admissionNumber`. The system's `StudentMatcher` searches the `Student` table to find an exact or fuzzy match.
- If matched: `StudentPaymentCandidate.status` becomes `MATCHED` and `studentId` is populated.
- If not matched: `StudentPaymentCandidate.status` becomes `MANUAL_REVIEW_REQUIRED`.

## 3. Required Database Records for UAT
To prevent all test emails from routing to `MANUAL_REVIEW`, we must seed the `Student` table with at least one record that matches the name in the test email.

### Required Seeding (Example)
```sql
INSERT INTO "Student" ("id", "firstName", "lastName", "admissionNumber", "status")
VALUES ('uuid-1234', 'John', 'Doe', 'ADM1001', 'ACTIVE');
```

## 4. Readiness Checklist
- **MISSING CONFIGURATION**: The UAT database is currently empty/cleaned. We must seed the `Student` table before sending test emails.
- **READY**: The extraction, matching, and fallback logic are fully implemented.
