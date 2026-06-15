import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Factory,
  AlertTriangle,
  Wrench,
  ClipboardCheck,
  GraduationCap,
  Scale,
  Users,
  Settings,
  LogOut,
  Droplets,
} from "lucide-react";

export default function Sidebar() {
  const { user, logout } = useAuth();

  const getLinks = () => {
    const role = user?.role;
    const baseLinks = [
      {
        to:
          role === "admin"
            ? "/admin"
            : role === "she_team"
              ? "/she-dashboard"
              : "/site-dashboard",
        icon: LayoutDashboard,
        label: "Dashboard",
      },
      { to: "/incidents", icon: AlertTriangle, label: "Incidents" },
      { to: "/corrective-actions", icon: Wrench, label: "Corrective Actions" },
    ];

    if (role === "admin" || role === "she_team" || role === "site_manager") {
      baseLinks.push(
        { to: "/audits", icon: ClipboardCheck, label: "Audits" },
        { to: "/legal", icon: Scale, label: "Legal" },
        { to: "/trainings", icon: GraduationCap, label: "Trainings" },
      );
    }

    if (role === "admin" || role === "she_team") {
      baseLinks.splice(1, 0, { to: "/sites", icon: Factory, label: "Sites" });
    }

    if (role === "admin") {
      baseLinks.push(
        { to: "/users", icon: Users, label: "Users" },
        { to: "/settings", icon: Settings, label: "Settings" },
      );
    }

    return baseLinks;
  };

  const getInitial = () => {
    if (user?.full_name) return user.full_name.charAt(0).toUpperCase();
    if (user?.sub) return user.sub.charAt(0).toUpperCase();
    return "U";
  };

  const getDisplayName = () => {
    if (user?.full_name) return user.full_name;
    if (user?.sub) return user.sub;
    return "User";
  };

  const getRoleLabel = () => {
    return user?.role?.replace(/_/g, " ") || "User";
  };

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "20px 16px",
          }}
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #CC0000, #ff4444)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(204,0,0,0.3)",
            }}
          >
            <Droplets size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div
              style={{
                fontSize: "1rem",
                fontWeight: "800",
                color: "#fff",
                letterSpacing: "-0.3px",
                lineHeight: 1.2,
              }}
            >
              GLOW SHE
            </div>
            <div
              style={{
                fontSize: "0.6rem",
                color: "rgba(255,255,255,0.45)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: "600",
              }}
            >
              Safety · Health · Environment
            </div>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <div className="sidebar-nav">
        {getLinks().map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <link.icon size={17} className="icon" />
            {link.label}
          </NavLink>
        ))}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{getInitial()}</div>
          <div style={{ minWidth: 0 }}>
            <div className="user-name">{getDisplayName()}</div>
            <div className="user-role-badge">{getRoleLabel()}</div>
          </div>
        </div>
        <button onClick={logout} className="logout-btn">
          <LogOut size={15} /> Logout
        </button>
      </div>
    </div>
  );
}
