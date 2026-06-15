import React from "react";
import { useAuth } from "../context/AuthContext";
import { Activity, AlertTriangle, ClipboardCheck, Users } from "lucide-react";

export default function CommandCenter() {
  const { user } = useAuth();

  const tiles = [
    {
      label: "Active Incidents",
      value: "--",
      icon: AlertTriangle,
      color: "#ef4444",
      note: "Live incident queue",
    },
    {
      label: "Open Actions",
      value: "--",
      icon: ClipboardCheck,
      color: "#f59e0b",
      note: "Corrective tasks pending",
    },
    {
      label: "Site Coverage",
      value: "--",
      icon: Activity,
      color: "#6366f1",
      note: "Operational overview",
    },
    {
      label: "Users Online",
      value: "--",
      icon: Users,
      color: "#10b981",
      note: "Team access status",
    },
  ];

  return (
    <div style={{ padding: "20px" }}>
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <h1 className="page-title">Command Center</h1>
          <p className="page-subtitle">
            Central operations view for {user?.role || "your"} workspace
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.label}
              className="card"
              style={{
                borderTop: `4px solid ${tile.color}`,
                padding: "18px",
                minHeight: "140px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "18px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    display: "grid",
                    placeItems: "center",
                    background: `${tile.color}15`,
                    color: tile.color,
                  }}
                >
                  <Icon size={20} />
                </div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  Live
                </div>
              </div>
              <div
                style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a" }}
              >
                {tile.value}
              </div>
              <div
                style={{ fontWeight: 700, marginTop: "4px", color: "#334155" }}
              >
                {tile.label}
              </div>
              <div
                style={{
                  marginTop: "6px",
                  fontSize: "0.85rem",
                  color: "#64748b",
                }}
              >
                {tile.note}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding: "20px" }}>
        <h2 style={{ marginTop: 0, marginBottom: "12px", fontSize: "1.1rem" }}>
          Operations Snapshot
        </h2>
        <p style={{ margin: 0, color: "#64748b", lineHeight: 1.6 }}>
          This page is now available so the `/command-center` route resolves
          correctly. You can replace these placeholder panels with live data
          once the backend metrics are ready.
        </p>
      </div>
    </div>
  );
}
