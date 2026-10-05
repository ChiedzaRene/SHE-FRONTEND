import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserCircle, Target, ScrollText } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AccountTab from "../components/settings/AccountTab";
import TargetsTab from "../components/settings/TargetsTab";
import AuditLogTab from "../components/settings/AuditLogTab";
import { useFeedback } from "../components/Feedback";

const HOME = { admin: "/admin", super_admin: "/admin", she_team: "/she-dashboard", site_manager: "/site-dashboard" };

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notify } = useFeedback();
  const role = user?.role;
  // An administrator set a temporary password: nothing else works until the user chooses their own
  const forced = Boolean(user?.mcp);

  // The server enforces these too; hiding a tab here is only about not showing people what they can't use
  const tabs = useMemo(
    () =>
      [
        { id: "account", label: "My account", icon: UserCircle, show: true, Component: AccountTab },
        { id: "targets", label: "Safety targets", icon: Target, show: !forced && (role === "admin" || role === "super_admin"), Component: TargetsTab },
        { id: "audit", label: "Audit log", icon: ScrollText, show: !forced && role === "super_admin", Component: AuditLogTab },
      ].filter((t) => t.show),
    [role, forced],
  );
  const [active, setActive] = useState("account");
  const current = tabs.find((t) => t.id === active) || tabs[0];
  const Panel = current.Component;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Your account, the safety limits and the activity log</p>
        </div>
      </div>

      {forced && (
        <div role="alert" className="card" style={{ padding: 16, marginBottom: 20, background: "#FFFBEB", border: "1px solid #FCD34D", color: "#92400E" }}>
          <strong>Choose a new password to continue.</strong> An administrator set a temporary password for your
          account. Enter it below as the temporary password, then pick your own.
        </div>
      )}

      <div role="tablist" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={current.id === id} onClick={() => setActive(id)}
            className="card"
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600,
              border: current.id === id ? "2px solid #003B8E" : "1px solid #e2e8f0",
              background: current.id === id ? "#eff6ff" : "#fff", color: "#0f172a",
            }}>
            <Icon size={18} color="#003B8E" /> {label}
          </button>
        ))}
      </div>

      <Panel
        forced={forced}
        onPasswordChanged={
          forced
            ? () => {
                // the page changes straight away, so confirm it where it stays visible
                notify("Password changed. You can now use Glow SHE.", "success");
                navigate(HOME[role] || "/");
              }
            : undefined
        }
      />
    </div>
  );
}
