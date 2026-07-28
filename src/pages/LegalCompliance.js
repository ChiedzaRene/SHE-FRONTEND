import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { scorecardApi } from "../api/endpoints";
import { LEGAL_REQUIREMENT_DEFS } from "../constants/legalRequirements";
import { ClipboardCheck } from "lucide-react";

const LegalCompliance = () => {
  const { user } = useAuth();
  const siteId = user?.site_id;

  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatest = async () => {
      if (!siteId) {
        setLoading(false);
        return;
      }
      try {
        const res = await scorecardApi.getSiteLatest(siteId);
        const notesById = {};
        res.data.items.forEach((item) => {
          notesById[item.requirement_id] = item.notes || "";
        });
        setNotes(notesById);
      } catch (err) {
        if (err?.response?.status !== 404) console.error("Error fetching:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLatest();
  }, [siteId]);

  return (
    <div style={{ padding: "40px 20px", display: "flex", justifyContent: "center", width: "100%" }}>
      <div style={{ maxWidth: "800px", width: "100%", margin: "0 auto" }}>
        <div className="page-header legal-compliance-header" style={{ marginBottom: "24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#6366f1", fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", marginBottom: "6px" }}>
            <ClipboardCheck size={14} /> Glow Petroleum SHE
          </div>
          <h1 className="page-title" style={{ margin: 0 }}>Legal Compliance Requirements</h1>
          <p className="page-subtitle" style={{ marginTop: "6px" }}>Inspection and Compliance Tracking</p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div className="spinner"></div>
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
            {LEGAL_REQUIREMENT_DEFS.map((req, idx) => (
              <li
                key={req.id}
                style={{
                  padding: "20px",
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  display: "flex",
                  gap: "14px",
                }}
              >
                <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: "0.95rem" }}>
                  {idx + 1}.
                </span>
                <div>
                  <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>
                    {req.title}
                  </div>
                  {req.description && (
                    <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px", lineHeight: "1.5" }}>
                      {req.description}
                    </div>
                  )}
                  {notes[req.id] && (
                    <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: "8px", fontStyle: "italic" }}>
                      <strong>Note:</strong> {notes[req.id]}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default LegalCompliance;