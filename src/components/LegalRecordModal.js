import React, { useEffect, useState } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { legalApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  site_id: "",
  requirements: "",
  expiry_date: "",
  score: 100,
  status: "pending",
  notes: "",
};

const LegalRecordModal = ({
  isOpen,
  onClose,
  sites,
  onSuccess,
  editRecord = null,
}) => {
  const { user } = useAuth();
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (isSiteManager && !editRecord) {
      setFormData({ ...emptyForm, site_id: getTokenSiteId() });
    } else if (editRecord) {
      setFormData({
        site_id: editRecord.site_id ?? "",
        requirements: editRecord.requirements ?? "",
        expiry_date: editRecord.expiry_date
          ? String(editRecord.expiry_date).split("T")[0]
          : "",
        score: editRecord.score ?? 100,
        status: editRecord.status ?? "pending",
        notes: editRecord.notes ?? "",
      });
    } else {
      setFormData(emptyForm);
    }

    setError("");
  }, [isOpen, editRecord]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...formData,
        site_id: parseInt(formData.site_id, 10),
        score: parseInt(formData.score, 10),
      };

      if (editRecord?.id) {
        await legalApi.update(editRecord.id, payload);
      } else {
        await legalApi.create(payload);
      }

      if (onSuccess) {
        await onSuccess();
      }
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Failed to save record. Check all fields.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: "600px" }}>
        <div className="modal-header">
          <h2 className="modal-title">
            {editRecord ? "Edit Requirement" : "Add Compliance Requirement"}
          </h2>
          <button
            onClick={onClose}
            className="btn btn-outline btn-icon"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div
                className="error-msg"
                style={{
                  color: "#ef4444",
                  backgroundColor: "#fef2f2",
                  padding: "10px",
                  borderRadius: "6px",
                  marginBottom: "15px",
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertCircle size={16} /> {String(error)}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Requirement Title</label>
              <input
                type="text"
                className="form-control"
                required
                value={formData.requirements}
                onChange={(e) =>
                  setFormData({ ...formData, requirements: e.target.value })
                }
              />
            </div>

            <div className="two-col">
              <div className="form-group">
                <label className="form-label">Target Site</label>
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
                    <option value="">Select a site...</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={formData.expiry_date}
                  onChange={(e) =>
                    setFormData({ ...formData, expiry_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="two-col">
              <div className="form-group">
                <label className="form-label">Compliance Score (%)</label>
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  max="100"
                  value={formData.score}
                  onChange={(e) =>
                    setFormData({ ...formData, score: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-control"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="compliant">Compliant</option>
                  <option value="non_compliant">Non-Compliant</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows="3"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              <Save size={18} />
              {loading
                ? "Saving..."
                : editRecord
                  ? "Update Record"
                  : "Add Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { LegalRecordModal };
export default LegalRecordModal;
