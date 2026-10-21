import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { incidentsApi, sitesApi } from "../api/endpoints";

<<<<<<< HEAD
=======
// "YYYY-MM-DDTHH:mm" in the user's local time, the format <input type="datetime-local"> uses
const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
export default function LogIncidentModal({
  isOpen,
  onClose,
  onIncidentLogged,
  prefill = null,
}) {
  const [site, setSite] = useState(null);
<<<<<<< HEAD

  // Helper to get standard YYYY-MM-DD string
  const formatDateForInput = (dateInput) => {
    if (!dateInput) return new Date().toISOString().split("T")[0];
    const parsed = new Date(dateInput);
    return Number.isNaN(parsed.getTime())
      ? new Date().toISOString().split("T")[0]
      : parsed.toISOString().split("T")[0];
  };

=======
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
  const [formData, setFormData] = useState({
    type: "injury",
    description: "",
    severity: "low",
    lost_time_days: "",
<<<<<<< HEAD
    occurred_at: formatDateForInput(),
  });

=======
    injured_person: "",
    action_plan: "",
    occurred_at: nowLocal(),
  });
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
<<<<<<< HEAD
=======
    // Pre-fill if follow-up, otherwise reset
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
    setFormData({
      type: prefill?.type || "injury",
      description: prefill?.description || "",
      severity: prefill?.severity || "low",
<<<<<<< HEAD
      lost_time_days: prefill?.lost_time_days || "",
      occurred_at: formatDateForInput(prefill?.occurred_at),
    });
    setError("");
  }, [isOpen, prefill]);

  // Fetch Site Details
=======
      lost_time_days: "",
      injured_person: "",
      action_plan: "",
      occurred_at: nowLocal(),
    });
    setError("");
  }, [isOpen, prefill?.type, prefill?.description, prefill?.severity]);

>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
  useEffect(() => {
    if (!isOpen) return;
    const fetchSite = async () => {
      try {
<<<<<<< HEAD
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
=======
        // Get site_id from token
        const token = localStorage.getItem("token");
        const payload = JSON.parse(atob(token.split(".")[1]));
        const siteId = payload.site_id;

        if (siteId) {
          const res = await sitesApi.getOne(siteId);
          setSite(res.data);
        }
      } catch (err) {
        console.error("Could not fetch site", err);
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
      }
    };
    fetchSite();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
<<<<<<< HEAD

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
=======
    setLoading(true);

    try {
      const payload = {
        site_id: site?.id,
        type: formData.type,
        description: formData.description,
        action_plan: formData.action_plan.trim() || undefined,
        severity: formData.severity,
        resolved: false,
        lost_time_days: parseInt(formData.lost_time_days || 0, 10),
        occurred_at: formData.occurred_at || undefined,
        // only injuries have someone hurt
        injured_person: formData.type === "injury" ? formData.injured_person.trim() || undefined : undefined,
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
      };

      await incidentsApi.create(payload);
      onIncidentLogged();
      onClose();
    } catch (err) {
<<<<<<< HEAD
      console.error("Error logging incident:", err.response?.data?.detail);
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(`${detail[0]?.loc?.join(" -> ")}: ${detail[0]?.msg}`);
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Failed to log incident. Please check input data.");
      }
=======
      console.error("Error:", err.response?.data?.detail);
      setError("Failed to log incident. Please try again.");
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
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
<<<<<<< HEAD
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
=======
            <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>
          )}
          <form id="incident-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="incident-site">Site</label>
              <input id="incident-site"
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
                type="text"
                className="form-control"
                value={site ? site.name : "Loading site..."}
                disabled
                style={{ background: "#f1f5f9", cursor: "not-allowed" }}
              />
            </div>

            <div className="two-col">
              <div className="form-group">
<<<<<<< HEAD
                <label className="form-label">Incident Type</label>
                <select
=======
                <label className="form-label" htmlFor="incident-incident-type">Incident Type</label>
                <select id="incident-incident-type"
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
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
<<<<<<< HEAD

              <div className="form-group">
                <label className="form-label">Severity</label>
                <select
=======
              <div className="form-group">
                <label className="form-label" htmlFor="incident-severity">Severity</label>
                <select id="incident-severity"
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
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

<<<<<<< HEAD
            {/* INCIDENT DATE INPUT FIELD */}
            <div className="form-group" style={{ marginTop: "12px" }}>
              <label className="form-label">Incident Date (Occurred At)</label>
              <input
                type="date"
                className="form-control"
                value={formData.occurred_at}
=======
            <div className="form-group">
              <label className="form-label" htmlFor="incident-when-did-it-happen">When did it happen?</label>
              <input id="incident-when-did-it-happen"
                type="datetime-local"
                className="form-control"
                value={formData.occurred_at}
                max={nowLocal()}
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
                onChange={(e) =>
                  setFormData({ ...formData, occurred_at: e.target.value })
                }
                required
              />
            </div>

<<<<<<< HEAD
            <div className="form-group" style={{ marginTop: "12px" }}>
              <label className="form-label">Description</label>
              <textarea
=======
            <div className="form-group">
              <label className="form-label" htmlFor="incident-description">Description</label>
              <textarea id="incident-description"
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
                className="form-control"
                placeholder="Detailed description of the incident..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
                rows={4}
              />
<<<<<<< HEAD
            </div>

            {isInjury && (
              <div className="form-group" style={{ marginTop: "12px" }}>
                <label className="form-label">Lost Time Days</label>
                <input
=======
              <small style={{ color: "#64748b" }}>The description can't be changed once the incident is logged.</small>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="incident-action-plan-new">Action plan (optional)</label>
              <textarea id="incident-action-plan-new"
                className="form-control"
                placeholder="What will be done about it, by whom and by when (can be added or updated later)"
                value={formData.action_plan}
                maxLength={5000}
                onChange={(e) => setFormData({ ...formData, action_plan: e.target.value })}
                rows={3}
              />
            </div>

            {isInjury && (
              <div className="form-group">
                <label className="form-label" htmlFor="incident-injured-person">Name of injured person</label>
                <input
                  id="incident-injured-person"
                  type="text"
                  className="form-control"
                  value={formData.injured_person}
                  maxLength={150}
                  autoComplete="off"
                  onChange={(e) => setFormData({ ...formData, injured_person: e.target.value })}
                  placeholder="e.g. Farai Moyo (leave blank if not known yet)"
                />
              </div>
            )}

            {isInjury && (
              <div className="form-group">
                <label className="form-label" htmlFor="incident-lost-time-days">Lost Time Days</label>
                <input id="incident-lost-time-days"
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
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
<<<<<<< HEAD
}
=======
}
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
