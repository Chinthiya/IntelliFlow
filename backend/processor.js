const RULES = {
  confidenceThreshold: 90,

  requiredFields: [
    "applicationId",
    "customerName",
    "loanAmount",
    "date",
    "pan"
  ]
};

const FIELD_LABELS = {
  applicationId: ["Application Id", "Application ID", "Application No", "Application Number"],
  customerName: ["Customer Name", "Applicant Name"],
  loanAmount: ["Loan Amount", "Sanctioned Amount"],
  pan: ["PAN", "PAN Number"],
  date: ["Application Date", "Date"]
};

const ALL_LABELS = Object.values(FIELD_LABELS).flat();

function normalizeOcrText(text) {
  return String(text || "")
    .replace(/\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createLabelPattern(labels) {
  return labels
    .sort((left, right) => right.length - left.length)
    .map((label) => label.replace(/\s+/g, "\\s+"))
    .join("|");
}

function cleanValue(value) {
  return value
    .replace(/^[\s:#-]+/, "")
    .replace(/^(?:is|as)\s*[:#-]?\s*/i, "")
    .replace(/[|]+/g, " ")
    .trim();
}

function getLabeledValue(text, labels) {
  const matcher = new RegExp(
    `(?:${createLabelPattern(labels)})\\s*[:#-]?\\s*`,
    "gi"
  );
  const nextLabel = new RegExp(
    `(?:${createLabelPattern(ALL_LABELS)})\\s*[:#-]?\\s*`,
    "gi"
  );

  for (const match of text.matchAll(matcher)) {
    const start = match.index + match[0].length;
    nextLabel.lastIndex = start;
    const following = nextLabel.exec(text);
    const candidate = cleanValue(
      text.slice(start, following ? following.index : start + 160)
    );

    if (candidate && !/^\d+\.\s+[A-Za-z]/.test(candidate)) {
      return { value: candidate, rule: match[0].trim() };
    }
  }

  return { value: null, rule: null };
}

function extractNumber(value) {
  const match = value?.match(/(?:₹|Rs\.?|INR)?\s*([\d][\d,]*(?:\.\d{1,2})?)/i);
  return match ? match[1].replace(/,/g, "") : null;
}

function extractApplicationId(value) {
  const match = value?.match(/\b([A-Z]{1,5}[-\s]?\d{3,}(?:[-\s]?\d+)*)\b/i);
  return match ? match[1].replace(/\s+/g, "-").toUpperCase() : null;
}

function extractPan(value) {
  const match = value?.replace(/\s+/g, "").toUpperCase().match(/[A-Z]{5}\d{4}[A-Z]/);
  return match ? match[0] : null;
}

function extractDate(value) {
  const match = value?.match(
    /\b(\d{1,2}\s*[/-]\s*\d{1,2}\s*[/-]\s*\d{2,4}|\d{4}\s*[/-]\s*\d{1,2}\s*[/-]\s*\d{1,2}|\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*\d{4})\b/i
  );
  return match ? match[1].replace(/\s*([/-])\s*/g, "$1").trim() : null;
}

function extractFields(text) {
  const clean = normalizeOcrText(text);
  const labeled = Object.fromEntries(
    Object.entries(FIELD_LABELS).map(([key, labels]) => [
      key,
      getLabeledValue(clean, labels)
    ])
  );

  const fields = {
    applicationId: extractApplicationId(labeled.applicationId.value),
    customerName: labeled.customerName.value,
    loanAmount: extractNumber(labeled.loanAmount.value),
    date: extractDate(labeled.date.value),
    pan: extractPan(labeled.pan.value)
  };

  console.log(
    "Mandatory extraction:",
    Object.fromEntries(
      Object.keys(FIELD_LABELS).map((key) => [key, {
        detected: fields[key] !== null,
        rule: labeled[key].rule
      }])
    )
  );

  // Preserve additional recognized fields without
  // pretending that arbitrary text is validated.
  const optionalPatterns = {
    address: ["Address"],
    employer: ["Employer"],
    employmentType: ["Employment Type"],
    monthlyIncome: ["Monthly Income"],
    phone: ["Phone Number", "Phone"],
    email: ["Email"]
  };

  for (const [key, labels] of Object.entries(optionalPatterns)) {
    const labeledValue = getLabeledValue(clean, labels);
    if (labeledValue.value) {
      fields[key] = key === "monthlyIncome"
        ? extractNumber(labeledValue.value)
        : labeledValue.value;
    }
  }

  return fields;
}


function validateFields(fields) {
  const checks = {};

  // Required-field checks
  checks.applicationId =
    !!fields.applicationId &&
    /^LN-\d{4}-\d+$/i.test(fields.applicationId);

  checks.customerName =
    !!fields.customerName &&
    fields.customerName.length >= 2;

  checks.loanAmount =
    !!fields.loanAmount &&
    Number(fields.loanAmount.replace(/,/g, "")) > 0;

  checks.date =
    !!fields.date &&
    /^(?:\d{1,2}[-\/]\d{1,2}[-\/]\d{4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*\d{4})$/i.test(fields.date);

  checks.pan =
    !!fields.pan &&
    /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(fields.pan.toUpperCase());

  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;

  return {
    checks,
    passed,
    total,
    valid: passed === total,
    requiredFields: RULES.requiredFields
  };
}


function calculateConfidence(fields, validation) {
  const extracted = RULES.requiredFields.filter(
    (field) => fields[field] !== null && fields[field] !== ""
  ).length;
  const extractionCompleteness =
    (extracted / RULES.requiredFields.length) * 100;
  const validationCompleteness =
    (validation.passed / validation.total) * 100;

  let confidence =
    extractionCompleteness * 0.8 + validationCompleteness * 0.2;

  // Small positive signal for a structurally valid PAN.
  if (
    fields.pan &&
    /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(fields.pan.toUpperCase())
  ) {
    confidence += 2;
  }

  return Math.min(
    Math.round(confidence * 10) / 10,
    99.9
  );
}


function decide(confidence, validation) {
  if (
    validation.valid &&
    confidence >= RULES.confidenceThreshold
  ) {
    return {
      status: "AUTO-PROCESS",
      reason:
        "All required fields passed validation and confidence is above threshold."
    };
  }

  return {
    status: "HUMAN REVIEW",
    reason:
      "Validation or confidence threshold requires human verification."
  };
}


module.exports = {
  RULES,
  extractFields,
  validateFields,
  calculateConfidence,
  decide
};