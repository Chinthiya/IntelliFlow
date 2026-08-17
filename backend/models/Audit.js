const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema(
  {
    filename: String,

    documentUrl: String,

    extractedText: String,

    fields: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    validationChecks: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    validationPassed: Number,
    validationTotal: Number,
    validationValid: Boolean,

    applicationId: String,
    customerName: String,

    confidence: Number,

    decision: String,

    processedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Audit", auditSchema);