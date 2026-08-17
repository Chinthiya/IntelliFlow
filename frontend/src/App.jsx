import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  History,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  Loader2
} from "lucide-react";
import "./App.css";

const API = "http://localhost:5000";

function App() {
  const getInitialPage = () => {
    const page = window.history.state?.page;
    return page || "dashboard";
  };

  const [active, setActiveState] = useState(getInitialPage);
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);

  const setActive = (page) => {
    if (page === active) return;

    window.history.pushState(
      { page },
      "",
      window.location.pathname
    );

    setActiveState(page);
  };

  useEffect(() => {
    if (!window.history.state?.page) {
      window.history.replaceState(
        { page: "dashboard" },
        "",
        window.location.pathname
      );
    }

    const handlePopState = (event) => {
      const page = event.state?.page || "dashboard";

      setActiveState(
        page === "review-detail" ? "review" :
        page === "audit-detail" ? "audit" :
        page
      );

      window.dispatchEvent(
        new CustomEvent("intelliflow-navigation", {
          detail: { page }
        })
      );
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const processDocument = async (selectedFile) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setProcessing(true);
    setResult(null);

    const formData = new FormData();
    formData.append("document", selectedFile);

    try {
      const response = await fetch(`${API}/api/process`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Processing failed");
      }

      setResult(data);
      setActive("result");
    } catch (error) {
      console.error(error);
      alert("Unable to process document.");
    } finally {
      setProcessing(false);
    }
  };

  const handleFile = (e) => {
    processDocument(e.target.files[0]);
  };

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "process", label: "Process Document", icon: FileText },
    { id: "review", label: "Review Queue", icon: AlertTriangle },
    { id: "result", label: "Decision Center", icon: ClipboardCheck },
    { id: "audit", label: "Audit Trail", icon: History }
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">I</div>
          <div>
            <h1>IntelliFlow</h1>
            <span>AI OPERATIONS</span>
          </div>
        </div>

        <nav>
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={
                active === id
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => setActive(id)}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="secure">
            <ShieldCheck size={18} />
            <div>
              <strong>Secure Workspace</strong>
              <small>Audit logging enabled</small>
            </div>
          </div>

          <div className="version">
            Prototype v1.0
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              FINANCIAL OPERATIONS
            </p>

            <h2>
              {active === "dashboard" &&
                "Operations Dashboard"}

              {active === "process" &&
                "Process a Document"}

              {active === "review" &&
                "Review Queue"}

              {active === "result" &&
                "Decision Center"}

              {active === "audit" &&
                "Audit Trail"}
            </h2>
          </div>

          <div className="status">
            <span></span>
            System Operational
          </div>
        </header>

        {active === "dashboard" && (
          <Dashboard
            setActive={setActive}
            result={result}
          />
        )}

        {active === "process" && (
          <Process
            dragging={dragging}
            setDragging={setDragging}
            handleFile={handleFile}
            processing={processing}
            file={file}
          />
        )}

        {active === "review" && (
          <ReviewQueue />
        )}

        {active === "result" && (
          <Decision
            result={result}
            setActive={setActive}
          />
        )}

        {active === "audit" && (
          <Audit />
        )}
      </main>
    </div>
  );
}

/* =========================
   DASHBOARD
========================= */

function Dashboard({ setActive, result }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/stats`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) =>
        console.error("Stats loading failed:", err)
      );
  }, [result]);

  return (
    <div className="content">
      <section className="hero">
        <div>
          <p className="eyebrow yellow">
            INTELLIGENT DOCUMENT PROCESSING
          </p>

          <h3>
            Turn documents into decisions.
          </h3>

          <p>
            IntelliFlow AI extracts, validates and routes
            financial documents automatically — while
            sending uncertain cases to human review.
          </p>

          <button
            className="primary"
            onClick={() => setActive("process")}
          >
            <Upload size={18} />
            Process New Document
          </button>
        </div>

        <div className="hero-flow">
          <div>DOCUMENT</div>
          <ArrowRight />
          <div>OCR</div>
          <ArrowRight />
          <div>DECISION</div>
        </div>
      </section>

      <div className="metrics">
        <Metric
          icon={<FileText />}
          label="Documents Processed"
          value={stats ? stats.total : "—"}
        />

        <Metric
          icon={<CheckCircle2 />}
          label="Auto-Processed"
          value={
            stats ? stats.autoProcessed : "—"
          }
        />

        <Metric
          icon={<AlertTriangle />}
          label="Human Review"
          value={
            stats ? stats.humanReview : "—"
          }
        />

        <Metric
          icon={<ShieldCheck />}
          label="Avg. Confidence"
          value={
            stats
              ? `${stats.averageConfidence}%`
              : "—"
          }
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">WORKFLOW</p>
            <h3>How IntelliFlow works</h3>
          </div>
        </div>

        <div className="workflow">
          {[
            ["01", "Upload", "Receive document"],
            ["02", "Extract", "OCR + field extraction"],
            ["03", "Validate", "Business rules"],
            ["04", "Decide", "Auto-route or review"]
          ].map((x, i) => (
            <div
              className="workflow-step"
              key={x[0]}
            >
              <span>{x[0]}</span>

              <div>
                <strong>{x[1]}</strong>
                <small>{x[2]}</small>
              </div>

              {i < 3 && (
                <ArrowRight
                  className="flow-arrow"
                  size={18}
                />
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="metric">
      <div className="metric-icon">
        {icon}
      </div>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

/* =========================
   PROCESS DOCUMENT
========================= */

function Process({
  dragging,
  setDragging,
  handleFile,
  processing,
  file
}) {
  return (
    <div className="content narrow">
      <div className="intro">
        <p>
          Upload a financial document. IntelliFlow will
          extract structured fields, validate them against
          business rules and generate a routing decision.
        </p>
      </div>

      <label
        className={
          dragging
            ? "dropzone dragging"
            : "dropzone"
        }
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() =>
          setDragging(false)
        }
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);

          handleFile({
            target: {
              files: e.dataTransfer.files
            }
          });
        }}
      >
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.pdf"
          onChange={handleFile}
          hidden
        />

        {processing ? (
          <>
            <Loader2
              className="spinner"
              size={42}
            />

            <h3>
              Processing document...
            </h3>

            <p>
              OCR → Extraction → Validation → Decision
            </p>
          </>
        ) : (
          <>
            <div className="upload-icon">
              <Upload size={28} />
            </div>

            <h3>
              Drop your document here
            </h3>

            <p>
              or click to browse
            </p>

            <span>
              PNG, JPG or PDF • Secure processing
            </span>
          </>
        )}
      </label>

      {file && !processing && (
        <div className="file-card">
          <FileText size={22} />

          <div>
            <strong>{file.name}</strong>
            <small>
              Ready for analysis
            </small>
          </div>

          <CheckCircle2 className="success" />
        </div>
      )}
    </div>
  );
}

/* =========================
   DECISION CENTER
========================= */

function Decision({ result, setActive }) {
  const [detail, setDetail] = useState(result);
  const [loading, setLoading] = useState(!result);

  useEffect(() => {
    if (result) {
      setDetail(result);
      setLoading(false);
      return;
    }

    const loadLatest = async () => {
      try {
        const response = await fetch(
          `${API}/api/audits`
        );

        const data = await response.json();

        if (
          data.success &&
          data.audits &&
          data.audits.length > 0
        ) {
          const latest = data.audits[0];

          const detailResponse =
            await fetch(
              `${API}/api/audits/${latest._id}`
            );

          const detailData =
            await detailResponse.json();

          if (detailData.success) {
            const audit =
              detailData.audit;

            setDetail({
              filename: audit.filename,

              extractedText:
                audit.extractedText,

              fields:
                audit.fields || {},

              validation: {
                checks:
                  audit.validationChecks || {},

                passed:
                  audit.validationPassed || 0,

                total:
                  audit.validationTotal || 0,

                valid:
                  audit.validationValid || false
              },

              confidence:
                audit.confidence,

              decision: {
                status:
                  audit.decision,

                reason:
                  audit.decision ===
                  "AUTO-PROCESS"
                    ? "All required fields passed validation and confidence is above threshold."
                    : "Validation or confidence threshold requires human verification."
              }
            });
          }
        }
      } catch (error) {
        console.error(
          "Latest decision loading failed:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadLatest();
  }, [result]);

  if (loading) {
    return (
      <div className="content empty">
        <Loader2
          className="spinner"
          size={42}
        />

        <h3>
          Loading latest decision...
        </h3>

        <p>
          Retrieving the latest processed document.
        </p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="content empty">
        <ClipboardCheck size={42} />

        <h3>
          No documents processed yet
        </h3>

        <p>
          Process a document to see the
          intelligent decision.
        </p>

        <button
          className="primary"
          onClick={() =>
            setActive("process")
          }
        >
          Process Document
        </button>
      </div>
    );
  }

  const auto =
    detail.decision.status ===
    "AUTO-PROCESS";

  return (
    <div className="content">
      <div
        className={
          auto
            ? "decision approved"
            : "decision review"
        }
      >
        {auto ? (
          <CheckCircle2 size={38} />
        ) : (
          <AlertTriangle size={38} />
        )}

        <div>
          <span>
            ROUTING DECISION
          </span>

          <h3>
            {detail.decision.status}
          </h3>

          <p>
            {detail.decision.reason}
          </p>
        </div>

        <div className="confidence">
          <small>CONFIDENCE</small>

          <strong>
            {detail.confidence}%
          </strong>
        </div>
      </div>

      <div className="result-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">
                EXTRACTED DATA
              </p>

              <h3>
                {detail.filename}
              </h3>
            </div>
          </div>

          <div className="fields">
            {Object.entries(
              detail.fields || {}
            ).map(([key, value]) => (
              <div
                className="field"
                key={key}
              >
                <span>
                  {formatKey(key)}
                </span>

                <strong>
                  {value ||
                    "Not detected"}
                </strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">
                VALIDATION
              </p>

              <h3>
                Business Rules
              </h3>
            </div>
          </div>

          {Object.entries(
            detail.validation?.checks ||
              {}
          ).map(
            ([key, passed]) => (
              <div
                className="check"
                key={key}
              >
                {passed ? (
                  <CheckCircle2
                    size={18}
                    className="success"
                  />
                ) : (
                  <AlertTriangle
                    size={18}
                    className="danger"
                  />
                )}

                <span>
                  {formatKey(key)}
                </span>

                <strong>
                  {passed
                    ? "Passed"
                    : "Review"}
                </strong>
              </div>
            )
          )}

          <div className="validation-summary">
            {detail.validation?.passed ||
              0}
            /
            {detail.validation?.total ||
              0}{" "}
            checks passed
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">
              PROCESSING TRACE
            </p>

            <h3>
              Audit Events
            </h3>
          </div>
        </div>

        <div className="timeline">
          {[
            "Document uploaded",
            "OCR extraction completed",
            "Fields structured",
            "Validation rules executed",
            `Decision generated: ${detail.decision.status}`
          ].map(
            (event, i) => (
              <div
                className="timeline-item"
                key={event}
              >
                <span>
                  {String(i + 1).padStart(
                    2,
                    "0"
                  )}
                </span>

                <div>
                  <strong>
                    {event}
                  </strong>

                  <small>
                    {i === 0
                      ? "Input received"
                      : "Completed successfully"}
                  </small>
                </div>
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}

/* =========================
   REVIEW QUEUE
========================= */

function ReviewQueue() {
  const [reviews, setReviews] =
    useState([]);

  const [selected, setSelected] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const loadReviews = async () => {
    try {
      const response =
        await fetch(
          `${API}/api/reviews`
        );

      const data =
        await response.json();

      setReviews(
        data.reviews || []
      );
    } catch (error) {
      console.error(
        "Review queue loading failed:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  useEffect(() => {
    const handleNavigation =
      (event) => {
        if (
          event.detail.page ===
          "review"
        ) {
          setSelected(null);
        }
      };

    window.addEventListener(
      "intelliflow-navigation",
      handleNavigation
    );

    return () => {
      window.removeEventListener(
        "intelliflow-navigation",
        handleNavigation
      );
    };
  }, []);

  const resolveReview =
    async (id, action) => {
      try {
        const response =
          await fetch(
            `${API}/api/reviews/${id}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json"
              },
              body: JSON.stringify({
                action
              })
            }
          );

        const data =
          await response.json();

        if (data.success) {
          setSelected(null);

          window.history.back();

          loadReviews();
        }
      } catch (error) {
        console.error(
          "Review resolution failed:",
          error
        );
      }
    };

  if (selected) {
    return (
      <DocumentDetail
        record={selected}
        onBack={() => {
          setSelected(null);

          if (
            window.history.state?.page ===
            "review-detail"
          ) {
            window.history.back();
          }
        }}
        reviewMode={true}
        onResolve={resolveReview}
      />
    );
  }

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">
              HUMAN-IN-THE-LOOP
            </p>

            <h3>
              Review Queue
            </h3>
          </div>

          <span className="queue-count">
            {reviews.length} pending
          </span>
        </div>

        {loading ? (
          <p>
            Loading review queue...
          </p>
        ) : reviews.length ===
          0 ? (
          <div className="empty-queue">
            <CheckCircle2 size={35} />

            <strong>
              Queue is clear
            </strong>

            <span>
              No documents require
              human review.
            </span>
          </div>
        ) : (
          <div className="review-list">
            {reviews.map(
              (review) => (
                <div
                  className="review-card"
                  key={review._id}
                >
                  <div className="review-file">
                    <div className="review-icon">
                      <FileText size={20} />
                    </div>

                    <div>
                      <strong>
                        {review.filename}
                      </strong>

                      <small>
                        {
                          review.applicationId
                        }
                      </small>
                    </div>
                  </div>

                  <div className="review-detail">
                    <span>
                      Customer
                    </span>

                    <strong>
                      {
                        review.customerName
                      }
                    </strong>
                  </div>

                  <div className="review-detail">
                    <span>
                      Confidence
                    </span>

                    <strong className="warning-text">
                      {
                        review.confidence
                      }%
                    </strong>
                  </div>

                  <div className="review-detail">
                    <span>
                      Validation
                    </span>

                    <strong>
                      {
                        review.validationPassed
                      }
                      /
                      {
                        review.validationTotal
                      }
                    </strong>
                  </div>

                  <button
                    className="review-button"
                    onClick={() => {
                      window.history.pushState(
                        {
                          page:
                            "review-detail"
                        },
                        "",
                        window.location.pathname
                      );

                      setSelected(
                        review
                      );
                    }}
                  >
                    Review
                    <ArrowRight
                      size={14}
                    />
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </section>

      <section className="review-explanation">
        <AlertTriangle size={19} />

        <div>
          <strong>
            Why human review?
          </strong>

          <p>
            IntelliFlow stops
            straight-through
            processing when
            validation fails or
            confidence falls below
            the decision threshold.
          </p>
        </div>
      </section>
    </div>
  );
}

/* =========================
   DOCUMENT DETAIL
========================= */

function DocumentDetail({
  record,
  onBack,
  reviewMode = false,
  onResolve
}) {
  const [detail, setDetail] =
    useState(record);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const loadDetail =
      async () => {
        try {
          const response =
            await fetch(
              `${API}/api/audits/${record._id}`
            );

          const data =
            await response.json();

          if (data.success) {
            setDetail(
              data.audit
            );
          }
        } catch (error) {
          console.error(
            "Document detail loading failed:",
            error
          );
        } finally {
          setLoading(false);
        }
      };

    loadDetail();
  }, [record._id]);

  if (loading) {
    return (
      <div className="content">
        <button
          className="back-button"
          onClick={onBack}
        >
          ← Back
        </button>

        <section className="panel">
          <p>
            Loading document verification...
          </p>
        </section>
      </div>
    );
  }

  const checks =
    detail.validationChecks ||
    {};

  const fields =
    detail.fields || {};

  return (
    <div className="content">
      <button
        className="back-button"
        onClick={onBack}
      >
        ← Back
      </button>

      <div className="document-header">
        <div>
          <p className="eyebrow">
            {reviewMode
              ? "CASE UNDER REVIEW"
              : "DOCUMENT VERIFICATION"}
          </p>

          <h3>
            {detail.filename}
          </h3>

          <p className="document-subtitle">
            {detail.applicationId ||
              "Application ID unavailable"}
          </p>
        </div>

        <div
          className={
            detail.decision ===
            "AUTO-PROCESS"
              ? "detail-decision auto"
              : "detail-decision review"
          }
        >
          <small>
            DECISION
          </small>

          <strong>
            {detail.decision}
          </strong>
        </div>
      </div>

      <div className="verification-layout">

        {/* DOCUMENT */}

        <section className="panel document-preview-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">
                SOURCE DOCUMENT
              </p>

              <h3>
                Original File
              </h3>
            </div>

            {detail.documentUrl && (
              <a
                href={`${API}${detail.documentUrl}`}
                target="_blank"
                rel="noreferrer"
                className="open-document"
              >
                Open
              </a>
            )}
          </div>

          {detail.documentUrl ? (
            <div className="document-preview">
              <img
                src={`${API}${detail.documentUrl}`}
                alt={detail.filename}
              />
            </div>
          ) : (
            <div className="document-unavailable">
              <FileText size={32} />

              <strong>
                Document preview unavailable
              </strong>

              <span>
                This record was created
                before document archiving
                was enabled.
              </span>
            </div>
          )}
        </section>

        {/* SUMMARY */}

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">
                PROCESSING SUMMARY
              </p>

              <h3>
                Decision Context
              </h3>
            </div>
          </div>

          <div className="summary-grid">
            <div className="field">
              <span>
                Customer Name
              </span>

              <strong>
                {detail.customerName ||
                  "Not detected"}
              </strong>
            </div>

            <div className="field">
              <span>
                Application ID
              </span>

              <strong>
                {detail.applicationId ||
                  "Not detected"}
              </strong>
            </div>

            <div className="field">
              <span>
                Confidence
              </span>

              <strong
                className={
                  detail.confidence >=
                  90
                    ? "success-text"
                    : "warning-text"
                }
              >
                {detail.confidence}%
              </strong>
            </div>

            <div className="field">
              <span>
                Validation
              </span>

              <strong>
                {
                  detail.validationPassed
                }
                /
                {
                  detail.validationTotal
                }{" "}
                passed
              </strong>
            </div>
          </div>
        </section>
      </div>

      {/* EXTRACTED FIELDS */}

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">
              STRUCTURED EXTRACTION
            </p>

            <h3>
              Extracted Fields
            </h3>
          </div>
        </div>

        <div className="fields">
          {Object.entries(
            fields
          ).map(
            ([key, value]) => (
              <div
                className="field"
                key={key}
              >
                <span>
                  {formatKey(key)}
                </span>

                <strong>
                  {value ||
                    "Not detected"}
                </strong>
              </div>
            )
          )}
        </div>
      </section>

      {/* VALIDATION */}

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">
              RULE ENGINE
            </p>

            <h3>
              Validation Results
            </h3>
          </div>

          <strong className="validation-count">
            {
              detail.validationPassed
            }
            /
            {
              detail.validationTotal
            }{" "}
            passed
          </strong>
        </div>

        <div className="verification-checks">
          {Object.entries(
            checks
          ).map(
            ([key, passed]) => (
              <div
                className="verification-check"
                key={key}
              >
                {passed ? (
                  <CheckCircle2
                    size={20}
                    className="success"
                  />
                ) : (
                  <AlertTriangle
                    size={20}
                    className="danger"
                  />
                )}

                <div>
                  <strong>
                    {formatKey(key)}
                  </strong>

                  <small>
                    {passed
                      ? "Rule passed"
                      : "Rule failed — verification required"}
                  </small>
                </div>

                <span
                  className={
                    passed
                      ? "check-status pass"
                      : "check-status fail"
                  }
                >
                  {passed
                    ? "PASSED"
                    : "FAILED"}
                </span>
              </div>
            )
          )}
        </div>
      </section>

      {/* OCR */}

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">
              OCR TRACE
            </p>

            <h3>
              Extracted Text
            </h3>
          </div>
        </div>

        <pre className="ocr-text">
          {detail.extractedText ||
            "OCR text unavailable."}
        </pre>
      </section>

      {/* HUMAN REVIEW */}

      {reviewMode &&
        detail.decision ===
          "HUMAN REVIEW" && (
          <section className="review-action-panel">
            <div>
              <p className="eyebrow">
                HUMAN-IN-THE-LOOP
              </p>

              <h3>
                Manual verification required
              </h3>

              <p>
                Review the original
                document and failed
                validation rules before
                making a final processing
                decision.
              </p>
            </div>

            <div className="review-actions">
              <button
                className="reject-button"
                onClick={() =>
                  onResolve(
                    detail._id,
                    "REJECT"
                  )
                }
              >
                Reject Document
              </button>

              <button
                className="approve-button"
                onClick={() =>
                  onResolve(
                    detail._id,
                    "APPROVE"
                  )
                }
              >
                Approve & Continue
              </button>
            </div>
          </section>
        )}
    </div>
  );
}

/* =========================
   AUDIT TRAIL
========================= */

function Audit() {
  const [audits, setAudits] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [selected, setSelected] =
    useState(null);

  const loadAudits = async () => {
    try {
      const response =
        await fetch(
          `${API}/api/audits`
        );

      const data =
        await response.json();

      setAudits(
        data.audits || []
      );
    } catch (error) {
      console.error(
        "Audit loading failed:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudits();
  }, []);

  useEffect(() => {
    const handleNavigation =
      (event) => {
        if (
          event.detail.page ===
          "audit"
        ) {
          setSelected(null);
        }
      };

    window.addEventListener(
      "intelliflow-navigation",
      handleNavigation
    );

    return () => {
      window.removeEventListener(
        "intelliflow-navigation",
        handleNavigation
      );
    };
  }, []);

  if (selected) {
    return (
      <DocumentDetail
        record={selected}
        onBack={() => {
          setSelected(null);

          if (
            window.history.state?.page ===
            "audit-detail"
          ) {
            window.history.back();
          }
        }}
        reviewMode={false}
      />
    );
  }

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">
              PERSISTENT AUDIT LOG
            </p>

            <h3>
              Document Processing History
            </h3>
          </div>

          <button
            className="refresh"
            onClick={loadAudits}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p>
            Loading audit history...
          </p>
        ) : audits.length === 0 ? (
          <p>
            No documents processed yet.
          </p>
        ) : (
          <div className="audit-table">
            <div className="audit-row header">
              <span>TIME</span>
              <span>DOCUMENT</span>
              <span>DECISION</span>
              <span></span>
            </div>

            {audits.map(
              (audit) => (
                <div
                  className="audit-row"
                  key={audit._id}
                >
                  <span>
                    {new Date(
                      audit.processedAt
                    ).toLocaleTimeString()}
                  </span>

                  <strong>
                    {audit.filename}
                  </strong>

                  <span
                    className={
                      audit.decision ===
                      "AUTO-PROCESS"
                        ? "pill"
                        : "pill review-pill"
                    }
                  >
                    {audit.decision}
                  </span>

                  <button
                    className="audit-view-button"
                    onClick={() => {
                      window.history.pushState(
                        {
                          page:
                            "audit-detail"
                        },
                        "",
                        window.location.pathname
                      );

                      setSelected(
                        audit
                      );
                    }}
                  >
                    View
                    <ArrowRight
                      size={14}
                    />
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* =========================
   HELPERS
========================= */

function formatKey(key) {
  return key
    .replace(
      /([A-Z])/g,
      " $1"
    )
    .replace(
      /^./,
      (s) =>
        s.toUpperCase()
    );
}

export default App;