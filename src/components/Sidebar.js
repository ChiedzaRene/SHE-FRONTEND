import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
<<<<<<< HEAD
=======
import emblem from "../assets/glow-emblem.png";
import NotificationBell from "./NotificationBell";
import { isReadOnly, ROLE_LABELS } from "../utils/roles";
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
import {
  LayoutDashboard,
  Factory,
  AlertTriangle,
  Wrench,
  ClipboardCheck,
<<<<<<< HEAD
  ClipboardList,
  GraduationCap,
  Scale,
  Users,
  LogOut,
  Droplets,
  ShieldCheck,
} from "lucide-react";

const getInitial = (user) => {
  if (!user) return '?';
  const rawIdentifier = user.email || user.name || user.username || (user.sub != null ? user.sub : '');
  const identifier = String(rawIdentifier).trim();
  if (identifier.length > 0) return identifier.charAt(0).toUpperCase();
  return 'U';
};

export default function Sidebar() {
  const { user, logout } = useAuth();

  const getLinks = () => {
    const role = user?.role;

    const baseLinks = [
      {
        to: role === "super_admin" || role === "admin"
            ? "/admin"
            : role === "she_team"
            ? "/she-dashboard"
            : "/site-dashboard",
=======
  GraduationCap,
  Scale,
  Users,
  Settings,
  LogOut,
  Clock,
  FolderOpen,
  FileText,
} from "lucide-react";

export default function Sidebar({ id }) {
  const { user, logout } = useAuth();

  const getLinks = () => {
    // super_admin sees the same navigation as admin
    const role = user?.role === "super_admin" ? "admin" : user?.role;
    // Operations and directors see what the SHE team sees, without changing it
    const oversight = isReadOnly(role);
    // The regional office works on the inspection NCs for its region, sees the all-sites dashboard and the reports,
    // and its own region's corrective actions, incidents, licences, talks, trainings and SHE files
    if (role === "regional_manager") {
      return [
        { to: "/she-dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/inspections", icon: ClipboardCheck, label: "Inspections" },
        { to: "/corrective-actions", icon: Wrench, label: "Corrective Actions" },
        { to: "/incidents", icon: AlertTriangle, label: "Incidents" },
        { to: "/legal", icon: Scale, label: "Legal" },
        { to: "/trainings", icon: GraduationCap, label: "Talks & Training" },
        { to: "/she-files", icon: FolderOpen, label: "SHE Files" },
        { to: "/reports", icon: FileText, label: "Reports" },
        { to: "/settings", icon: Settings, label: "Settings" },
      ];
    }
    const baseLinks = [
      {
        to:
          role === "admin"
            ? "/admin"
            : role === "she_team" || oversight
              ? "/she-dashboard"
              : "/site-dashboard",
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
        icon: LayoutDashboard,
        label: "Dashboard",
      },
      { to: "/incidents", icon: AlertTriangle, label: "Incidents" },
<<<<<<< HEAD
    ];

    // Site managers get read-only access to these pages
    if (role === "site_manager") {
      baseLinks.push(
        { to: "/corrective-actions", icon: Wrench, label: "Corrective Actions" },
        { to: "/audits", icon: ClipboardCheck, label: "Audits" },
        { to: "/legal", icon: Scale, label: "Legal Requirements" },
        { to: "/inspection", icon: ClipboardList, label: "Inspection Scorecard" },
        { to: "/trainings", icon: GraduationCap, label: "Trainings" }
      );
    }

    // Admin, SHE Team and Super Admin get full access
    if (role === "super_admin" || role === "admin" || role === "she_team") {
      baseLinks.push(
        { to: "/sites", icon: Factory, label: "Sites" },
        { to: "/corrective-actions", icon: Wrench, label: "Corrective Actions" },
        { to: "/audits", icon: ClipboardCheck, label: "Audits" },
        { to: "/legal", icon: Scale, label: "Legal Requirements" },
        { to: "/inspection", icon: ClipboardList, label: "Inspection Scorecard" },
        { to: "/trainings", icon: GraduationCap, label: "Trainings" }
      );
    }

    if (role === "super_admin" || role === "admin") {
      baseLinks.push({ to: "/users", icon: Users, label: "Users" });
    }

    if (role === "super_admin") {
      baseLinks.push({ to: "/audit-logs", icon: ShieldCheck, label: "Audit Logs" });
    }
=======
      { to: "/corrective-actions", icon: Wrench, label: "Corrective Actions" },
      { to: "/reports", icon: FileText, label: "Reports" },
    ];

    if (role === "admin" || role === "she_team" || role === "site_manager" || oversight) {
      baseLinks.push(
        { to: "/inspections", icon: ClipboardCheck, label: "Inspections" },
        { to: "/legal", icon: Scale, label: "Legal" },
        { to: "/trainings", icon: GraduationCap, label: "Talks & Training" },
      );
    }

    if (role === "admin" || role === "she_team" || oversight) {
      baseLinks.splice(1, 0, { to: "/sites", icon: Factory, label: "Sites" });
    }

    // Site managers enter their site's hours and headcount each month; SHE and admins can see them
    if (role === "admin" || role === "she_team" || role === "site_manager" || oversight) {
      baseLinks.push({ to: "/site-hours", icon: Clock, label: "Hours Worked" });
      baseLinks.push({ to: "/she-files", icon: FolderOpen, label: "SHE Files" });
    }

    if (role === "admin") {
      baseLinks.push(
        { to: "/users", icon: Users, label: "Users" },
      );
    }

    // Every role has a Settings page (at least "My account")
    baseLinks.push({ to: "/settings", icon: Settings, label: "Settings" });
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9

    return baseLinks;
  };

<<<<<<< HEAD
  const getDisplayName = () => {
    if (user?.full_name) return user.full_name;
    if (user?.sub) return String(user.sub);
=======
  const getInitial = () => {
    if (user?.full_name) return user.full_name.charAt(0).toUpperCase();
    if (user?.sub) return user.sub.charAt(0).toUpperCase();
    return "U";
  };

  const getDisplayName = () => {
    if (user?.full_name) return user.full_name;
    if (user?.sub) return user.sub;
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
    return "User";
  };

  const getRoleLabel = () => {
<<<<<<< HEAD
    return user?.role?.replace(/_/g, " ") || "User";
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "20px 16px" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "linear-gradient(135deg, #CC0000, #ff4444)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(204,0,0,0.3)" }}>
            <Droplets size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: "1rem", fontWeight: "800", color: "#fff", letterSpacing: "-0.3px", lineHeight: 1.2 }}>GLOW SHE</div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: "600" }}>Safety · Health · Environment</div>
=======
    return ROLE_LABELS[user?.role] || user?.role?.replace(/_/g, " ") || "User";
  };

  return (
    <div className="sidebar" id={id}>
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
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
          >
            <img src={emblem} alt="Glow Petroleum" width={34} height={34} style={{ display: "block" }} />
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
              Glow SHE
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
          <div style={{ marginLeft: "auto" }}>
            <NotificationBell placement="sidebar" />
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
          </div>
        </div>
      </div>

<<<<<<< HEAD
      <div className="sidebar-nav">
        {getLinks().map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <link.icon size={17} className="icon" />
            {link.label}
          </NavLink>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{getInitial(user)}</div>
=======
      {/* Nav Links */}
      <div className="sidebar-nav">
        {getLinks().map((link) => {
          // Temporary password: only Settings (where the new password is chosen) is usable
          const locked = user?.mcp && link.to !== "/settings";
          if (locked) {
            return (
              <span
                key={link.to}
                className="nav-link nav-link-disabled"
                aria-disabled="true"
                title="Choose a new password first"
              >
                <link.icon size={17} className="icon" />
                {link.label}
              </span>
            );
          }
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <link.icon size={17} className="icon" />
              {link.label}
            </NavLink>
          );
        })}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{getInitial()}</div>
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
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
<<<<<<< HEAD
}
=======
}
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
