# IntelliFlow Demo Documents

These sample documents can be used to demonstrate the IntelliFlow document-processing workflow.

## 1. test.png

This document contains:

- Application ID: LN-2026-1042
- Customer Name: Ravi Kumar
- Loan Amount: 500000
- Date: 15-08-2026
- PAN: ABCDE1234F

Use this document to demonstrate the successful document-processing path.

## 2. review.png

This document contains:

- Application ID: LN-2026-1043
- Customer Name: Priya Sharma
- Loan Amount: 750000
- Date: 15-08-2026
- PAN: INVALID123

Use this document to demonstrate the HUMAN REVIEW path because the PAN requires verification.

## How to test

1. Start local MongoDB.
2. Start the IntelliFlow backend.
3. Start the IntelliFlow frontend.
4. Open the frontend at `http://localhost:5173`.
5. Upload `test.png` to demonstrate the successful processing path.
6. Upload `review.png` to demonstrate the human-review path.
7. Review the Decision Center, Review Queue, and Audit Trail.