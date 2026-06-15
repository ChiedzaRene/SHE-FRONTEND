import React, { useEffect, useState, useCallback } from "react";
import { Plus, UserCheck, Users } from "lucide-react";
import { trainingsApi, sitesApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

const Trainings = () => {
  const { user } = useAuth();
  const isSiteManager = user?.role === "site_manager";

  const getTokenSiteId = useCallback(() => {
    try {
      const token = localStorage.getItem("token");
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.site_id ? String(payload.site_id) : "";
    } catch {
      return "";
    }
  }, []);

  const [trainings, setTrainings] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    site_id: "",
    training_module: "",
    personnel: "",
    trained_employees: 0,
    total_employees: 0,
    type: "Safety",
    trainer_name: "",
    trainer_position: "",
    comments: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trainingsRes, sitesRes] = await Promise.all([
        trainingsApi.getAll(),
        sitesApi.getAll().catch(() => ({ data: [] })),
      ]);
      setTrainings(trainingsRes.data || []);
      setSites(sitesRes.data || []);
    } catch (err) {
      console.error("Error fetching trainings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-fill site_id for site managers when form opens
  useEffect(() => {
    if (showAddForm && isSiteManager) {
      setFormData((prev) => ({ ...prev, site_id: getTokenSiteId() }));
    }
  }, [showAddForm, isSiteManager, getTokenSiteId]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        site_id: parseInt(formData.site_id),
        trained_employees: parseInt(formData.trained_employees),
        total_employees: parseInt(formData.total_employees),
      };

      await trainingsApi.create(payload);
      setShowAddForm(false);
      setFormData({
        site_id: isSiteManager ? getTokenSiteId() : "",
        training_module: "",
        personnel: "",
        trained_employees: 0,
        total_employees: 0,
        type: "Safety",
        trainer_name: "",
        trainer_position: "",
        comments: "",
      });
      fetchData();
    } catch (err) {
      alert(
        "Error saving record. Check if backend model includes trainer fields.",
      );
    }
  };

  const getSiteName = (siteId) =>
    sites.find((s) => s.id === siteId)?.name || "Unknown";

  const filteredTrainings = trainings.filter((t) => {
    const query = search.toLowerCase();
    return (
      (t.training_module || "").toLowerCase().includes(query) ||
      (t.trainer_name || "").toLowerCase().includes(query) ||
      getSiteName(t.site_id).toLowerCase().includes(query)
    );
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Personnel Training</h1>
          <p className="page-subtitle">Track headcounts and certifications</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={18} /> {showAddForm ? "Close" : "Assign Training"}
        </button>
      </div>

      {showAddForm && (
        <div
          className="card"
          style={{ marginBottom: "24px", background: "#F8FAFC" }}
        >
          <form onSubmit={handleAddSubmit} style={{ padding: "20px" }}>
            <div className="two-col">
              <div className="form-group">
                <label className="form-label">Training Module</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formData.training_module}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      training_module: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Target Personnel</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formData.personnel}
                  onChange={(e) =>
                    setFormData({ ...formData, personnel: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="two-col">
              <div className="form-group">
                <label className="form-label">Trainer Name</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formData.trainer_name}
                  onChange={(e) =>
                    setFormData({ ...formData, trainer_name: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Trainer Position</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formData.trainer_position}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      trainer_position: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="two-col">
              <div className="form-group">
                <label className="form-label">Site</label>
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
                    <option value="">Select...</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Number of Staff Trained</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.trained_employees}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      trained_employees: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
                marginTop: "10px",
              }}
            >
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Record
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Training & Site</th>
                <th>Trainer Information</th>
                <th>Staff Trained</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center">
                    Loading...
                  </td>
                </tr>
              ) : (
                filteredTrainings.map((training) => (
                  <tr key={training.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "#1e293b" }}>
                        {training.training_module}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        {getSiteName(training.site_id)} • {training.personnel}
                      </div>
                    </td>
                    <td>
                      {training.trainer_name ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              backgroundColor: "#f1f5f9",
                              padding: "6px",
                              borderRadius: "4px",
                            }}
                          >
                            <UserCheck size={14} color="#64748b" />
                          </div>
                          <div>
                            <div
                              style={{ fontWeight: 600, fontSize: "0.85rem" }}
                            >
                              {training.trainer_name}
                            </div>
                            <div
                              style={{ fontSize: "0.7rem", color: "#94a3b8" }}
                            >
                              {training.trainer_position}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span
                          style={{
                            color: "#cbd5e1",
                            fontSize: "0.8rem italic",
                          }}
                        >
                          No trainer info
                        </span>
                      )}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontWeight: "600",
                        }}
                      >
                        <Users size={14} color="#007ACC" />
                        {training.trained_employees}
                      </div>
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>
                      {training.date
                        ? new Date(training.date).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Trainings;
