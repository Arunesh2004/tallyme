# Student Review Queue UI Report

## Interface Mapping
Route: `/student-review`

Consumes: `GET /review/student`

## Display Architecture
- **Payment Correlation Matrix**: Visually links the parsed Razorpay ID against the target ERP Enrollment string.
- **Confidence Output**: Explicitly exposes the extracted matching score.
- **Exception Handle**: Highlights failed allocations flagged by the backend (e.g. `MANUAL_REVIEW_REQUIRED`) for an operator to resolve manually in the ERP.
