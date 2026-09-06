# IntelliFlow Architecture

This diagram represents the current local IntelliFlow prototype. The backend performs document processing and routing, while the React frontend presents the Decision Center, derives the displayed AI findings from processed document data, and provides the human review actions.

```mermaid
flowchart TD
    User([User])

    subgraph Frontend[React/Vite Frontend]
        Upload[Document Upload]
        DecisionCenter[Decision Center]
        Findings[AI Findings / Issue Detection<br/>derived from processed document data]
        ReviewQueue[Human Review Queue]
        Actions[Approve<br/>Request Clarification<br/>Reject]
        AuditView[Audit Trail / Review History]
    end

    subgraph Backend[Node.js/Express API]
        UploadHandler[Document upload handling]
        PDF[PDF rendering<br/>PDF.js + @napi-rs/canvas]
        ImagePrep[Image input preparation]
        OCR[Tesseract OCR<br/>eng trained data]
        Text[Document text extraction]
        Fields[Required-field extraction<br/>Application ID<br/>Customer Name<br/>Loan Amount<br/>Date<br/>PAN]
        Rules[Validation and confidence logic]
        Routing{Decision routing}
        Auto[AUTO-PROCESS]
        Human[HUMAN REVIEW]
        ReviewAPI[Review action handling]
        Archive[Processed document storage<br/>backend/documents/]
    end

    Mongo[(MongoDB<br/>Audit records)]

    User --> Upload
    Upload -->|PDF or image document| UploadHandler
    UploadHandler -->|PDF input| PDF
    UploadHandler -->|Image input| ImagePrep
    PDF --> ImagePrep
    ImagePrep --> OCR
    OCR --> Text
    Text --> Fields
    Fields --> Rules
    Rules --> Routing
    Routing -->|All required fields valid<br/>and confidence is sufficient| Auto
    Routing -->|Validation or confidence<br/>requires verification| Human

    Auto --> Archive
    Human --> Archive
    Archive --> Mongo

    Auto --> DecisionCenter
    Human --> DecisionCenter
    DecisionCenter --> Findings
    Human --> ReviewQueue
    ReviewQueue --> Actions
    Actions --> ReviewAPI
    ReviewAPI --> Mongo

    Mongo --> AuditView
    Mongo --> DecisionCenter
    AuditView --> User
    DecisionCenter --> User
    ReviewQueue --> User

    classDef frontend fill:#e8f1ff,stroke:#2563eb,color:#172554
    classDef backend fill:#ecfdf5,stroke:#059669,color:#064e3b
    classDef storage fill:#fff7ed,stroke:#ea580c,color:#7c2d12
    class Upload,DecisionCenter,Findings,ReviewQueue,Actions,AuditView frontend
    class UploadHandler,PDF,ImagePrep,OCR,Text,Fields,Rules,Routing,Auto,Human,ReviewAPI,Archive backend
    class Mongo storage
```

## Flow Notes

- PDF files are rendered into page images before OCR; image uploads go directly through the image-processing path.
- Tesseract OCR produces document text, which the backend uses for required-field extraction and validation.
- Routing produces either `AUTO-PROCESS` or `HUMAN REVIEW`. The latter is used when required fields, validation, or confidence need human verification.
- AI findings and issue detection are displayed in the frontend from the processed document data; the prototype does not call an external AI service.
- Review Queue actions update the stored audit record, and the Audit Trail displays the persistent processing and review history from MongoDB.
