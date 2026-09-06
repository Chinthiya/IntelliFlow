# IntelliFlow End-to-End Workflow

This flowchart represents the current IntelliFlow document-processing prototype, from upload through automated routing or human review and audit history.

```mermaid
flowchart TD
    Start([START]) --> Upload[User uploads document]
    Upload --> Receive[Backend receives document]
    Receive --> Supported{Determine supported document type}

    Supported -->|Unsupported| UnsupportedDoc[Return unsupported document type error]
    Supported -->|PDF| Render[Render PDF pages<br/>PDF.js + @napi-rs/canvas]
    Supported -->|PNG, JPG, or JPEG| Image[Use image input]

    Render --> OCR[Tesseract OCR]
    Image --> OCR
    OCR --> Text[Extract document text]
    Text --> Fields[Extract document fields<br/>Application ID<br/>Customer Name<br/>Loan Amount<br/>Date<br/>PAN]
    Fields --> Validate[Validate five required fields]
    Validate --> Confidence[Calculate confidence<br/>and validation result]
    Confidence --> Route{Decision routing}

    Route -->|Requirements pass<br/>and confidence is sufficient| Auto[AUTO-PROCESS]
    Auto --> AutoHistory[Persist processing result]
    AutoHistory --> Audit[Audit Trail / Review History]

    Route -->|Requirements or confidence<br/>require verification| Human[HUMAN REVIEW]
    Human --> Findings[AI Findings / Issue Detection]
    Findings --> Severity{Finding severity}
    Severity --> Critical[Critical findings]
    Severity --> Warning[Warning findings]
    Severity --> Info[Info findings]
    Critical --> Queue[Review Queue]
    Warning --> Queue
    Info --> Queue

    Queue --> Reviewer{Human reviewer chooses}
    Reviewer --> Approve[Approve<br/>HUMAN-APPROVED]
    Reviewer --> Clarify[Request Clarification<br/>CLARIFICATION REQUESTED]
    Reviewer --> Reject[Reject<br/>HUMAN-REJECTED]
    Approve --> ReviewHistory[Persist review outcome]
    Clarify --> ReviewHistory
    Reject --> ReviewHistory
    ReviewHistory --> Audit

    classDef start fill:#172554,stroke:#172554,color:#ffffff
    classDef process fill:#e8f1ff,stroke:#2563eb,color:#172554
    classDef decision fill:#fff7ed,stroke:#ea580c,color:#7c2d12
    classDef human fill:#fef2f2,stroke:#dc2626,color:#7f1d1d
    classDef storage fill:#ecfdf5,stroke:#059669,color:#064e3b

    class Start start
    class Upload,Receive,Render,Image,OCR,Text,Fields,Validate,Confidence,Auto,Findings,Critical,Warning,Info,Approve,Clarify,Reject,UnsupportedDoc process
    class Supported,Route,Severity,Reviewer decision
    class Human,Queue human
    class AutoHistory,ReviewHistory,Audit storage
```

## Implementation Notes

- Supported uploads are PDF, PNG, JPG, and JPEG files.
- PDF inputs are rendered page by page before being sent to Tesseract OCR. Image inputs proceed directly to OCR.
- The backend extracts and validates Application ID, Customer Name, Loan Amount, Date, and PAN, then calculates confidence and produces either `AUTO-PROCESS` or `HUMAN REVIEW`.
- AI findings are derived from the processed document data in the frontend and are grouped as Critical, Warnings, or Info. They are displayed as document risk analysis; no external AI service is represented here.
- Human review actions update the stored decision as `HUMAN-APPROVED`, `CLARIFICATION REQUESTED`, or `HUMAN-REJECTED`.
- Processing results and review outcomes are persisted in MongoDB and shown through the Audit Trail / Review History.
