const connectDB = require("./db");
const Audit = require("./models/Audit");
const {
  extractFields,
  validateFields,
  calculateConfidence,
  decide
} = require("./processor");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { createWorker } = require("tesseract.js");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
const documentsDir = path.join(__dirname, "documents");

if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir);
}

app.use("/documents", express.static(documentsDir));
const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
  res.json({ message: "IntelliFlow AI backend is running" });
});

app.post("/api/process", upload.single("document"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No document uploaded"
    });
  }

  try {
    const worker = await createWorker("eng");

    const result = await worker.recognize(req.file.path);

    await worker.terminate();

    const text = result.data.text;

    const fields = extractFields(text);
    const validation = validateFields(fields);
    const confidence = calculateConfidence(fields, validation);
    const decision = decide(confidence, validation);
    const safeFilename =
    `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const archivedPath = path.join(documentsDir, safeFilename);

    fs.copyFileSync(req.file.path, archivedPath);

    const documentUrl = `/documents/${safeFilename}`;

    await Audit.create({
  filename: req.file.originalname,

  documentUrl,

  extractedText: text,

  fields,

  validationChecks: validation.checks,
  validationPassed: validation.passed,
  validationTotal: validation.total,
  validationValid: validation.valid,

  applicationId: fields.applicationId,
  customerName: fields.customerName,

  confidence,
  decision: decision.status
});

    fs.unlinkSync(req.file.path);

    res.json({
    success: true,
    filename: req.file.originalname,
    extractedText: text,
    fields,
    validation,
    confidence,
    decision,
    processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "OCR processing failed"
    });
  }
});
connectDB();
app.get("/api/audits", async (req, res) => {
  try {
    const audits = await Audit.find()
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      audits
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to fetch audit records"
    });
  }
});

app.get("/api/stats", async (req, res) => {
  try {
    const total = await Audit.countDocuments();

    const autoProcessed = await Audit.countDocuments({
      decision: "AUTO-PROCESS"
    });

    const humanReview = await Audit.countDocuments({
      decision: "HUMAN REVIEW"
    });

    const confidenceResult = await Audit.aggregate([
      {
        $group: {
          _id: null,
          average: { $avg: "$confidence" }
        }
      }
    ]);

    const averageConfidence =
      confidenceResult.length > 0
        ? Math.round(confidenceResult[0].average * 10) / 10
        : 0;

    res.json({
      success: true,
      total,
      autoProcessed,
      humanReview,
      averageConfidence
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to calculate statistics"
    });
  }
});
app.get("/api/reviews", async (req, res) => {
  try {
    const reviews = await Audit.find({
      decision: "HUMAN REVIEW"
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to fetch review queue"
    });
  }
});

app.patch("/api/reviews/:id", async (req, res) => {
  try {
    const { action } = req.body;

    const newDecision =
      action === "APPROVE"
        ? "HUMAN-APPROVED"
        : "HUMAN-REJECTED";

    const audit = await Audit.findByIdAndUpdate(
      req.params.id,
      { decision: newDecision },
      { new: true }
    );

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: "Review case not found"
      });
    }

    res.json({
      success: true,
      audit
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to resolve review"
    });
  }
});

app.get("/api/audits/:id", async (req, res) => {
  try {
    const audit = await Audit.findById(req.params.id);

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: "Audit record not found"
      });
    }

    res.json({
      success: true,
      audit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to fetch audit record"
    });
  }
});

app.listen(PORT, () => {
  console.log(`IntelliFlow AI backend running at http://localhost:${PORT}`);
});