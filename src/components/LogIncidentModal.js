import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { incidentsApi, sitesApi } from "../api/endpoints";

export default function LogIncidentModal({
  isOpen,
  onClose,
  onIncidentLogged,
  prefill = null,
}) {
  const [site, setSite] = useState(null);

  // Helper to get standard YYYY-MM-DD string
  const formatDateForInput = (dateInput) => {
    if (!dateInput) return new Date().toISOString().split("T")[0];
    const parsed = new Date(dateInput);
    return Number.isNaN(parsed.getTime())
      ? new Date().toISOString().split("T")[0]
      : parsed.toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState({
    type: "injury",
    description: "",
    severity: "low",
    lost_time_days: "",
    occurred_at: formatDateForInput(),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setFormData({
      type: prefill?.type || "injury",
      description: prefill?.description || "",
      severity: prefill?.severity || "low",
      lost_time_days: prefill?.lost_time_days || "",
      occurred_at: formatDateForInput(prefill?.occurred_at),
    });
    setError("");
  }, [isOpen, prefill]);

  // Fetch Site Details
  useEffect(() => {
    if (!isOpen) return;
    const fetchSite = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const siteId = payload.site_id;

          if (siteId) {
            const res = await sitesApi.getOne(siteId);
            setSite(res.data);
          }
        }
      } catch (err) {
        console.error("Could not fetch site details:", err);
      }
    };
    fetchSite();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!site?.id) {
      setError("Site information is missing. Please re-login.");
      return;
    }

    if (formData.description.trim().length < 5) {
      setError("Description must be at least 5 characters long.");
      return;
    }

    setLoading(true);

    try {
      // Format as ISO Timestamp with explicit time to prevent timezone shift
      const formattedOccurredAt = formData.occurred_at
        ? new Date(`${formData.occurred_at}T12:00:00.000Z`).toISOString()
        : null;

      const payload = {
        site_id: site.id,
        type: formData.type,
        description: formData.description,
        severity: formData.severity,
        resolved: false,
        lost_time_days: parseInt(formData.lost_time_days || 0, 10),
        occurred_at: formattedOccurredAt, // <--- Sent explicitly to FastAPI
      };

      await incidentsApi.create(payload);
      onIncidentLogged();
      onClose();
    } catch (err) {
      console.error("Error logging incident:", err.response?.data?.detail);
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(`${detail[0]?.loc?.join(" -> ")}: ${detail[0]?.msg}`);
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Failed to log incident. Please check input data.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isInjury = formData.type === "injury";

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">
            {prefill ? "Log Follow-Up Incident" : "Log New Incident"}
          </div>
          <button onClick={onClose} className="btn-icon btn-outline">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div
              style={{
                color: "#ef4444",
                marginBottom: "12px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}
          <form id="incident-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Site</label>
              <input
                type="text"
                className="form-control"
                value={site ? site.name : "Loading site..."}
                disabled
                style={{ background: "#f1f5f9", cursor: "not-allowed" }}
              />
            </div>

            <div className="two-col">
              <div className="form-group">
                <label className="form-label">Incident Type</label>
                <select
                  className="form-control"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  required
                >
                  <option value="injury">Injury</option>
                  <option value="spill">Spill</option>
                  <option value="fire">Fire</option>
                  <option value="environmental">Environmental</option>
                  <option value="near-miss">Near-Miss</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Severity</label>
                <select
                  className="form-control"
                  value={formData.severity}
                  onChange={(e) =>
                    setFormData({ ...formData, severity: e.target.value })
                  }
                  required
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* INCIDENT DATE INPUT FIELD */}
            <div className="form-group" style={{ marginTop: "12px" }}>
              <label className="form-label">Incident Date (Occurred At)</label>
              <input
                type="date"
                className="form-control"
                value={formData.occurred_at}
                onChange={(e) =>
                  setFormData({ ...formData, occurred_at: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group" style={{ marginTop: "12px" }}>
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                placeholder="Detailed description of the incident..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
                rows={4}
              />
            </div>

            {isInjury && (
              <div className="form-group" style={{ marginTop: "12px" }}>
                <label className="form-label">Lost Time Days</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.lost_time_days}
                  onChange={(e) =>
                    setFormData({ ...formData, lost_time_days: e.target.value })
                  }
                  min="0"
                  placeholder="e.g. 3"
                />
              </div>
            )}
          </form>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="incident-form"
            className="btn btn-primary"
            disabled={loading || !site}
          >
            {loading ? "Logging..." : "Log Incident"}
          </button>
        </div>
      </div>
    </div>
  );
}