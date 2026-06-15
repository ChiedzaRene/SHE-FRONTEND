import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auditsApi, sitesApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import {
  ClipboardCheck,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Calendar,
  MapPin,
  Eye,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

const AuditsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canAdd = true;
  const isSiteManager = user?.role === "site_manager";

  const getTokenSiteId = () => {
    try {
      const token = localStorage.getItem("token");
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.site_id ? String(payload.site_id) : "";
    } catch {
      return "";
    }
  };

  const [audits, setAudits] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [formData, setFormData] = useState({
    site_id: "",
    criteria: "",
    score: 0,
    findings: "",
    status: "open",
  });

  // Auto-fill site_id for site managers when form opens
  useEffect(() => {
    if (showAddForm && isSiteManager) {
      setFormData((prev) => ({ ...prev, site_id: getTokenSiteId() }));
    }
  }, [showAddForm, isSiteManager]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Individual try-catch inside Promise.all to prevent total failure
      const [auditsRes, sitesRes] = await Promise.all([
        auditsApi.getAll().catch((e) => ({ data: [] })),
        sitesApi.getAll().catch((e) => ({ data: [] })),
      ]);

      // Ensure we are handling different API response shapes
      const auditData = auditsRes.data || auditsRes || [];
      const siteData = sitesRes.data || sitesRes || [];

      setAudits(Array.isArray(auditData) ? auditData : []);
      setSites(Array.isArray(siteData) ? siteData : []);
    } catch (err) {
      console.error("Data loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Extra check: If sites are empty, try to fetch them again when form opens
  useEffect(() => {
    if (showAddForm && sites.length === 0) {
      sitesApi.getAll().then((res) => setSites(res.data || res || []));
    }
  }, [showAddForm, sites.length]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        site_id: parseInt(formData.site_id),
        score: parseInt(formData.score),
      };
      await auditsApi.create(payload);
      setShowAddForm(false);
      setFormData({
        site_id: "",
        criteria: "",
        score: 0,
        findings: "",
        status: "open",
      });
      fetchData();
    } catch (err) {
      alert(
        "Error saving audit record: " +
          (err.response?.data?.detail || "Connection lost"),
      );
    }
  };

  const getSiteName = (siteId) => {
    const site = sites.find((s) => String(s.id) === String(siteId));
    return site ? site.name : "Unassigned";
  };

  const getScoreStatus = (score) => {
    if (score >= 90) return { color: "#059669", label: "Excellent" };
    if (score >= 75) return { color: "#007ACC", label: "Good" };
    if (score >= 50) return { color: "#ea580c", label: "Fair" };
    return { color: "#ef4444", label: "Poor" };
  };

  const getStatusBadge = (status) => {
    const styles = {
      closed: {
        bg: "#ecfdf5",
        text: "#059669",
        icon: <CheckCircle2 size={12} />,
        label: "Compliant",
      },
      action_required: {
        bg: "#fff7ed",
        text: "#ea580c",
        icon: <AlertCircle size={12} />,
        label: "Action Needed",
      },
      open: {
        bg: "#eff6ff",
        text: "#2563eb",
        icon: <Clock size={12} />,
        label: "Under Review",
      },
    };
    const style = styles[status] || styles.open;
    return (
      <span
        style={{
          background: style.bg,
          color: style.text,
          border: `1px solid ${style.text}33`,
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          width: "fit-content",
          padding: "3px 10px",
          borderRadius: "20px",
          fontSize: "0.72rem",
          fontWeight: "700",
          lineHeight: 1,
        }}
      >
        {style.icon} {style.label}
      </span>
    );
  };

  const filteredAudits = Array.isArray(audits)
    ? audits.filter((a) =>
        (a.criteria || "").toLowerCase().includes(search.toLowerCase()),
      )
    : [];

  return (
    <div className="animate-fade-in" style={{ padding: "20px" }}>
      <div
        className="page-header"
        style={{
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1
            className="page-title"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              margin: 0,
            }}
          >
            <ClipboardCheck className="text-primary" size={28} /> Audit Log
          </h1>
          <p
            className="page-subtitle"
            style={{ color: "#64748b", margin: "4px 0 0 0" }}
          >
            Compliance scoring system
          </p>
        </div>
        {canAdd && (
          <button
            className="btn btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? <X size={18} /> : <Plus size={18} />}
            {showAddForm ? " Cancel" : " New Audit"}
          </button>
        )}
      </div>

      {showAddForm && (
        <div
          className="card shadow-sm animate-slide-down"
          style={{ marginBottom: "30px", borderLeft: "5px solid #007ACC" }}
        >
          <div
            className="card-header"
            style={{
              background: "#f8fafc",
              padding: "15px 24px",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <div className="card-title" style={{ fontWeight: "700" }}>
              Audit Documentation
            </div>
          </div>
          <form onSubmit={handleAddSubmit} style={{ padding: "24px" }}>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Site Location</label>
                {isSiteManager ? (
                  <input
                    type="text"
                    className="form-control"
                    value={
                      sites.find(
                        (s) => String(s.id) === String(formData.site_id),
                      )?.name || "Your Site"
                    }
                    disabled
                    style={{ background: "#f1f5f9", cursor: "not-allowed" }}
                  />
                ) : (
                  <select
                    className="form-control"
                    required
                    value={formData.site_id}
                    onChange={(e) =>
                      setFormData({ ...formData, site_id: e.target.value })
                    }
                  >
                    <option value="">
                      -- {sites.length > 0 ? "Select Site" : "Loading Sites..."}{" "}
                      --
                    </option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name || `Site ${site.id}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Compliance Score (%)</label>
                <input
                  type="number"
                  max="100"
                  min="0"
                  className="form-control"
                  required
                  value={formData.score}
                  onChange={(e) =>
                    setFormData({ ...formData, score: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Current Status</label>
                <select
                  className="form-control"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="open">Open Review</option>
                  <option value="action_required">Action Required</option>
                  <option value="closed">Closed / Compliant</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "20px" }}>
              <label className="form-label">Audit Criteria / Objective</label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="e.g. Health & Safety Compliance"
                value={formData.criteria}
                onChange={(e) =>
                  setFormData({ ...formData, criteria: e.target.value })
                }
              />
            </div>

            <div className="form-group" style={{ marginTop: "20px" }}>
              <label className="form-label">Detailed Findings</label>
              <textarea
                className="form-control"
                rows="3"
                value={formData.findings}
                onChange={(e) =>
                  setFormData({ ...formData, findings: e.target.value })
                }
              ></textarea>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "20px",
              }}
            >
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!formData.site_id}
              >
                Submit Audit Report
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card shadow-sm" style={{ overflow: "hidden" }}>
        <div
          className="card-header"
          style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9" }}
        >
          <div style={{ position: "relative", width: "300px" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              placeholder="Filter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control"
              style={{ paddingLeft: "38px", borderRadius: "20px" }}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table
            className="legal-table"
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <th
                  style={{
                    textAlign: "left",
                    padding: "14px 24px",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Date & Site
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "14px 12px",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Audit Criteria
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "14px 12px",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Score
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "14px 12px",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "14px 24px",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#94a3b8",
                    }}
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredAudits.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#94a3b8",
                    }}
                  >
                    No audit records found.
                  </td>
                </tr>
              ) : (
                filteredAudits.map((audit) => {
                  const scoreStatus = getScoreStatus(audit.score);
                  return (
                    <tr
                      key={audit.id}
                      className="table-row-hover"
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td style={{ padding: "16px 24px" }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "0.85rem",
                              fontWeight: "700",
                              color: "#1e293b",
                            }}
                          >
                            <Calendar size={13} color="#94a3b8" />
                            {new Date(
                              audit.created_at || audit.date,
                            ).toLocaleDateString()}
                          </span>
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "0.75rem",
                              color: "#64748b",
                            }}
                          >
                            <MapPin size={12} color="#94a3b8" />
                            {getSiteName(audit.site_id)}
                          </span>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "16px 12px",
                          fontWeight: "500",
                          color: "#334155",
                          fontSize: "0.9rem",
                        }}
                      >
                        {audit.criteria}
                      </td>
                      <td style={{ padding: "16px 12px" }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: "800",
                              color: "#1e293b",
                              fontSize: "0.95rem",
                            }}
                          >
                            {audit.score}%
                          </span>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: "700",
                              color: scoreStatus.color,
                            }}
                          >
                            {scoreStatus.label}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "16px 12px" }}>
                        {getStatusBadge(audit.status)}
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => {
                            setSelectedAudit(audit);
                            setShowDetailsModal(true);
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Eye size={14} /> Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL (UNCHANGED) */}
      {showDetailsModal && selectedAudit && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="modal-content animate-fade-in"
            style={{
              background: "white",
              width: "95%",
              maxWidth: "500px",
              borderRadius: "16px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                background: "#F8FAFC",
                borderBottom: "1px solid #E2E8F0",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontWeight: "700",
                }}
              >
                <ShieldCheck className="text-primary" size={20} /> Audit Summary
              </div>
              <X
                size={20}
                style={{ cursor: "pointer" }}
                onClick={() => setShowDetailsModal(false)}
              />
            </div>
            <div style={{ padding: "24px" }}>
              <div style={{ marginBottom: "20px" }}>
                <label className="form-label" style={{ fontSize: "0.65rem" }}>
                  Audit Criteria
                </label>
                <div
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: "700",
                    color: "#007ACC",
                  }}
                >
                  {selectedAudit.criteria}
                </div>
              </div>
              <div
                style={{
                  marginBottom: "24px",
                  background: "#F1F5F9",
                  padding: "20px",
                  borderRadius: "12px",
                }}
              >
                <p
                  style={{
                    fontSize: "0.95rem",
                    color: "#1e293b",
                    fontStyle: "italic",
                  }}
                >
                  "{selectedAudit.findings || "No specific findings recorded."}"
                </p>
              </div>
              <button
                className="btn btn-primary"
                style={{ width: "100%" }}
                onClick={() =>
                  navigate("/corrective-actions", {
                    state: {
                      fromAudit: true,
                      site_id: selectedAudit.site_id,
                      findings: selectedAudit.findings,
                      criteria: selectedAudit.criteria,
                    },
                  })
                }
              >
                Take Action <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditsList;