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
const os = require("os");

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

class ProcessingError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

function isPdf(file) {
  return (
    file.mimetype === "application/pdf" ||
    path.extname(file.originalname).toLowerCase() === ".pdf"
  );
}

function isSupportedDocument(file) {
  const extension = path.extname(file.originalname).toLowerCase();

  return isPdf(file) || [".png", ".jpg", ".jpeg"].includes(extension);
}

async function renderPdfPages(pdfPath) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { createCanvas } = require("@napi-rs/canvas");
  const pdfData = new Uint8Array(await fs.promises.readFile(pdfPath));
  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "intelliflow-pdf-")
  );
  let loadingTask;
  let pdf;

  try {
    loadingTask = pdfjs.getDocument({
      data: pdfData,
      disableWorker: true,
      useWorkerFetch: false,
      isEvalSupported: false
    });
    pdf = await loadingTask.promise;

    if (!pdf.numPages) {
      throw new ProcessingError("The PDF contains no pages.", 422);
    }

    const pagePaths = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = createCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height)
      );

      await page.render({ canvas, viewport }).promise;

      const pagePath = path.join(
        tempDir,
        `page-${String(pageNumber).padStart(4, "0")}.png`
      );

      await fs.promises.writeFile(pagePath, canvas.toBuffer("image/png"));
      pagePaths.push(pagePath);
      page.cleanup();
    }

    return { tempDir, pagePaths };
  } catch (error) {
    await fs.promises.rm(tempDir, { recursive: true, force: true });

    if (error instanceof ProcessingError) {
      throw error;
    }

    throw new ProcessingError(
      "Unable to render the uploaded PDF. Please upload a valid PDF.",
      422
    );
  } finally {
    if (pdf) {
      pdf.cleanup();
    }

    if (loadingTask) {
      await loadingTask.destroy();
    }
  }
}

async function safelyRemove(targetPath) {
  if (!targetPath) return;

  try {
    await fs.promises.rm(targetPath, { recursive: true, force: true });
  } catch (error) {
    console.error("Temporary-file cleanup failed:", error.message);
  }
}

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

  let worker;
  let renderedPdf;

  try {
    if (!isSupportedDocument(req.file)) {
      throw new ProcessingError(
        "Unsupported document type. Upload a PNG, JPG, JPEG, or PDF file.",
        415
      );
    }

    let ocrInputs = [req.file.path];

    if (isPdf(req.file)) {
      renderedPdf = await renderPdfPages(req.file.path);
      ocrInputs = renderedPdf.pagePaths;
    }

    worker = await createWorker("eng");
    const pageTexts = [];

    for (let index = 0; index < ocrInputs.length; index += 1) {
      try {
        const result = await worker.recognize(ocrInputs[index]);
        pageTexts.push(result.data.text);
      } catch (error) {
        throw new ProcessingError(
          `OCR could not read page ${index + 1} of the document.`,
          422
        );
      }
    }

    const text = pageTexts.join("\n\n");

    const fields = extractFields(text);
    const validation = validateFields(fields);
    const confidence = calculateConfidence(fields, validation);
    const decision = decide(confidence, validation);
    const safeFilename =
    `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const archivedPath = path.join(documentsDir, safeFilename);

    await fs.promises.copyFile(req.file.path, archivedPath);

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
    console.error("Document processing failed:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "OCR processing failed"
    });
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (error) {
        console.error("OCR worker cleanup failed:", error.message);
      }
    }

    await safelyRemove(renderedPdf?.tempDir);
    await safelyRemove(req.file?.path);
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

    const decisions = {
      APPROVE: "HUMAN-APPROVED",
      REQUEST_CLARIFICATION: "CLARIFICATION REQUESTED",
      REJECT: "HUMAN-REJECTED"
    };

    const newDecision = decisions[action];

    if (!newDecision) {
      return res.status(400).json({
        success: false,
        message: "Unsupported review action"
      });
    }

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
