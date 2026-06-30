import React, { useEffect, useState } from "react";
import {
  ClipboardCheck,
  Save,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { scorecardApi } from "../api/endpoints";
import { LEGAL_REQUIREMENT_DEFS } from "../constants/legalRequirements";
import { getErrorMessage } from "../utils/errorMessage";

const LegalCompliance = () => {
  const { user } = useAuth();
  const siteId = user?.site_id;

  const [complianceScores, setComplianceScores] = useState(
    LEGAL_REQUIREMENT_DEFS.reduce((acc, req) => {
      acc[req.id] = "";
      return acc;
    }, {}),
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);

  useEffect(() => {
    const fetchLatest = async () => {
      if (!siteId) {
        setLoading(false);
        return;
      }
      try {
        const res = await scorecardApi.getSiteLatest(siteId);
        const scoresById = {};
        res.data.items.forEach((item) => {
          scoresById[item.requirement_id] = String(item.score);
        });
        setComplianceScores((prev) => ({ ...prev, ...scoresById }));
        setLastSavedAt(res.data.submitted_at);
      } catch (err) {
        if (err?.response?.status !== 404)
          console.error("Error fetching latest scorecard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLatest();
  }, [siteId]);

  const handleScoreChange = (id, value) => {
    if (value === "") {
      setComplianceScores((prev) => ({ ...prev, [id]: "" }));
      return;
    }
    if (!/^\d{0,1}(\.\d{0,1})?$/.test(value)) return;
    let num = parseFloat(value);
    if (!isNaN(num) && num > 5) return;
    setComplianceScores((prev) => ({ ...prev, [id]: value }));
  };

  const handleScoreBlur = (id) => {
    setComplianceScores((prev) => {
      let num = parseFloat(prev[id]);
      if (isNaN(num)) num = 0;
      if (num < 0) num = 0;
      if (num > 5) num = 5;
      return { ...prev, [id]: String(num) };
    });
  };

  const getOverallScore = () => {
    const values = Object.values(complianceScores).map((v) => {
      const n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    });
    if (!values.length) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const overallScore = getOverallScore();
  const overallPercent = Math.round((overallScore / 5) * 100);

  const getColors = (pct) => {
    if (pct >= 90) return { bg: "#ecfdf5", text: "#059669", border: "#10b981" };
    if (pct >= 75) return { bg: "#f0fdf4", text: "#16a34a", border: "#4ade80" };
    if (pct >= 50) return { bg: "#fffbeb", text: "#d97706", border: "#fbbf24" };
    return { bg: "#fef2f2", text: "#dc2626", border: "#f87171" };
  };

  const getScoreStatus = (score) => {
    const pct = Math.round((parseFloat(score) / 5) * 100);
    if (pct >= 90)
      return {
        label: "Excellent",
        icon: <CheckCircle2 size={14} />,
        color: "#059669",
        bg: "#ecfdf5",
      };
    if (pct >= 75)
      return {
        label: "Good",
        icon: <CheckCircle2 size={14} />,
        color: "#16a34a",
        bg: "#f0fdf4",
      };
    if (pct >= 50)
      return {
        label: "Fair",
        icon: <AlertTriangle size={14} />,
        color: "#d97706",
        bg: "#fffbeb",
      };
    return {
      label: "Poor",
      icon: <XCircle size={14} />,
      color: "#dc2626",
      bg: "#fef2f2",
    };
  };

  const getScorePill = (score) => {
    const colors = getColors(score);
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "2px 10px",
          borderRadius: "999px",
          fontSize: "0.8rem",
          fontWeight: "700",
          backgroundColor: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.border}`,
        }}
      >
        {score}%
      </div>
    );
  };

  const overallColors = getColors(overallPercent);

  const handleSave = async () => {
    if (!siteId) {
      setError("No site associated with this account.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const items = LEGAL_REQUIREMENT_DEFS.map((req) => {
        const raw = complianceScores[req.id];
        const num = raw === "" ? 0 : parseFloat(raw);
        return {
          requirement_id: req.id,
          requirement_title: req.title,
          score: isNaN(num) ? 0 : num,
        };
      });
      const res = await scorecardApi.submit({ site_id: siteId, items });
      setLastSavedAt(res.data.submitted_at);
      setSuccess("Scores saved successfully.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save scores."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Legal Compliance</h1>
          <p className="page-subtitle">
            Score each legal requirement out of 5 for this site
          </p>
        </div>
      </div>

      {lastSavedAt && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "#64748b",
            fontSize: "0.85rem",
            marginBottom: "12px",
          }}
        >
          <Clock size={14} /> Last saved:{" "}
          {new Date(lastSavedAt).toLocaleString()}
        </div>
      )}

      {/* --- SUMMARY SECTION --- */}
      {!loading && lastSavedAt && (
        <div className="card" style={{ marginBottom: "24px", padding: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "20px",
            }}
          >
            <TrendingUp size={20} color="#1e293b" />
            <h2
              style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "#1e293b",
              }}
            >
              Compliance Summary
            </h2>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "0.8rem",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Clock size={13} />{" "}
              {new Date(lastSavedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Overall score banner */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "10px",
              backgroundColor: overallColors.bg,
              border: `1px solid ${overallColors.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: overallColors.text,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Overall Compliance Score
              </div>
              <div
                style={{
                  fontSize: "1.8rem",
                  fontWeight: 900,
                  color: overallColors.text,
                  lineHeight: 1.2,
                }}
              >
                {overallScore.toFixed(2)}{" "}
                <span style={{ fontSize: "1rem", fontWeight: 600 }}>/ 5</span>
              </div>
            </div>
            {getScorePill(overallPercent)}
          </div>

          {/* Requirements table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      color: "#64748b",
                      textTransform: "uppercase",
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      color: "#64748b",
                      textTransform: "uppercase",
                    }}
                  >
                    Requirement
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "center",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      color: "#64748b",
                      textTransform: "uppercase",
                    }}
                  >
                    Score
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "center",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      color: "#64748b",
                      textTransform: "uppercase",
                    }}
                  >
                    %
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      color: "#64748b",
                      textTransform: "uppercase",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      color: "#64748b",
                      textTransform: "uppercase",
                    }}
                  >
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {LEGAL_REQUIREMENT_DEFS.map((req, idx) => {
                  const rawScore = complianceScores[req.id];
                  const num = parseFloat(rawScore) || 0;
                  const pct = Math.round((num / 5) * 100);
                  const status = getScoreStatus(rawScore);
                  return (
                    <tr
                      key={req.id}
                      style={{ borderBottom: "1px solid #f8fafc" }}
                    >
                      <td
                        style={{
                          padding: "12px",
                          color: "#94a3b8",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                        }}
                      >
                        {idx + 1}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div
                          style={{
                            fontWeight: 700,
                            color: "#1e293b",
                            fontSize: "0.88rem",
                          }}
                        >
                          {req.title}
                        </div>
                        <div
                          style={{
                            fontSize: "0.73rem",
                            color: "#94a3b8",
                            marginTop: "2px",
                          }}
                        >
                          {req.description}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "center",
                          fontWeight: 800,
                          fontSize: "1rem",
                          color: "#1e293b",
                        }}
                      >
                        {num.toFixed(1)}
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "#94a3b8",
                            fontWeight: 600,
                          }}
                        >
                          /5
                        </span>
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <div
                          style={{
                            height: "6px",
                            backgroundColor: "#f1f5f9",
                            borderRadius: "3px",
                            overflow: "hidden",
                            width: "60px",
                            margin: "0 auto 4px",
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              backgroundColor: status.color,
                              borderRadius: "3px",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: status.color,
                          }}
                        >
                          {pct}%
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            borderRadius: "20px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            backgroundColor: status.bg,
                            color: status.color,
                          }}
                        >
                          {status.icon} {status.label}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontSize: "0.8rem",
                          color: "#64748b",
                        }}
                      >
                        {lastSavedAt
                          ? new Date(lastSavedAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SCORECARD ENTRY --- */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <ClipboardCheck size={20} color="#1e293b" />
          <h2
            style={{
              margin: 0,
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "#1e293b",
            }}
          >
            Site Legal Requirements Scorecard
          </h2>
        </div>

        {error && (
          <div
            style={{
              color: "#dc2626",
              backgroundColor: "#fef2f2",
              padding: "10px",
              borderRadius: "6px",
              marginBottom: "12px",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
              color: "#16a34a",
              backgroundColor: "#f0fdf4",
              padding: "10px",
              borderRadius: "6px",
              marginBottom: "12px",
              fontSize: "0.875rem",
            }}
          >
            {success}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {LEGAL_REQUIREMENT_DEFS.map((req) => (
                <div
                  key={req.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "16px",
                    padding: "14px",
                    backgroundColor: "white",
                    borderRadius: "8px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: "#1e293b",
                        marginBottom: "4px",
                      }}
                    >
                      {req.title}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                      {req.description}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      flexShrink: 0,
                    }}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      value={complianceScores[req.id]}
                      onChange={(e) =>
                        handleScoreChange(req.id, e.target.value)
                      }
                      onBlur={() => handleScoreBlur(req.id)}
                      className="form-control"
                      style={{
                        width: "64px",
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    />
                    <span style={{ fontWeight: 700, color: "#64748b" }}>
                      / 5
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "16px",
                padding: "16px",
                borderRadius: "8px",
                backgroundColor: overallColors.bg,
                border: `1px solid ${overallColors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: overallColors.text,
                  fontSize: "1rem",
                }}
              >
                Overall Site Score
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "1.4rem",
                    color: overallColors.text,
                  }}
                >
                  {overallScore.toFixed(2)} / 5
                </div>
                {getScorePill(overallPercent)}
              </div>
            </div>

            <div
              style={{
                marginTop: "16px",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={18} /> {saving ? "Saving..." : "Save Scores"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LegalCompliance;
