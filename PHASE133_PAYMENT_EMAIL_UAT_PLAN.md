# Phase 133 Payment Email UAT Plan

## 1. Real UAT Execution Checklist
To strictly test the pipeline without manual database injection, we must trigger the workflow by sending a real email to the configured `GMAIL_ADDRESS`.

## 2. Email Template
Send an email from any external account to the test inbox using the following format:

**Subject:** Payment Confirmation - Razorpay
**Body:**
```
Dear Parent,
We have successfully received your fee payment.

Student Name: Arunesh UAT Student
Admission No: ADM-UAT-1001
Amount: INR 1500.00
Gateway: Razorpay
Transaction ID: Txn ID: pay_UAT889900
Payment Date: 2024-06-15

Thank you for your prompt payment.
```

## 3. Extraction Validation
The `StudentPaymentExtractor` regex engines require specific formatting:
- The amount MUST be prefixed with `INR` or `Rs.` (e.g., `INR 1500.00`).
- The transaction ID MUST be prefixed with `Txn ID:`, `Transaction ID:`, or `Reference:`.
- The gateway MUST explicitly mention `razorpay` (case insensitive) to trigger the `RAZORPAY` enum fallback.
- The name MUST follow `Name:` or `Student:`.

By sending this exact text, we bypass the Gemini AI fallback and test the high-speed regex extractor.
