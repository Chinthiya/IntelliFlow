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

function extractFields(text) {
  const clean = text.replace(/\r/g, "");

  const get = (regex) => {
    const match = clean.match(regex);
    return match ? match[1].trim() : null;
  };

  const fields = {
    applicationId: get(/Application ID:\s*(.+)/i),
    customerName: get(/Customer Name:\s*(.+)/i),
    loanAmount: get(/Loan Amount:\s*₹?\s*([\d,]+)/i),
    date: get(/Date:\s*(.+)/i),
    pan: get(/PAN:\s*([A-Z0-9]+)/i)
  };

  // Preserve additional recognized fields without
  // pretending that arbitrary text is validated.
  const optionalPatterns = {
    address: /Address:\s*(.+)/i,
    employer: /Employer:\s*(.+)/i,
    employmentType: /Employment Type:\s*(.+)/i,
    monthlyIncome: /Monthly Income:\s*₹?\s*([\d,]+)/i,
    phone: /Phone(?: Number)?:\s*(.+)/i,
    email: /Email:\s*(.+)/i
  };

  for (const [key, regex] of Object.entries(optionalPatterns)) {
    const match = clean.match(regex);

    if (match) {
      fields[key] = match[1].trim();
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
    /^\d{2}-\d{2}-\d{4}$/.test(fields.date);

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
  const completeness =
    (validation.passed / validation.total) * 100;

  let confidence = completeness;

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