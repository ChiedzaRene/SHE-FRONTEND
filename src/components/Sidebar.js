import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import emblem from "../assets/glow-emblem.png";
import NotificationBell from "./NotificationBell";
import { isReadOnly, isSheStaff, ROLE_LABELS } from "../utils/roles";
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
        { to: "/trainings", icon: GraduationCap, label: "SHE Talks & Training" },
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
            : isSheStaff(role) || oversight
              ? "/she-dashboard"
              : "/site-dashboard",
        icon: LayoutDashboard,
        label: "Dashboard",
      },
      { to: "/incidents", icon: AlertTriangle, label: "Incidents" },
      { to: "/corrective-actions", icon: Wrench, label: "Corrective Actions" },
      { to: "/reports", icon: FileText, label: "Reports" },
    ];

    if (role === "admin" || isSheStaff(role) || role === "site_manager" || oversight) {
      baseLinks.push(
        { to: "/inspections", icon: ClipboardCheck, label: "Inspections" },
        { to: "/legal", icon: Scale, label: "Legal" },
        { to: "/trainings", icon: GraduationCap, label: "SHE Talks & Training" },
      );
    }

    if (role === "admin" || isSheStaff(role) || oversight) {
      baseLinks.splice(1, 0, { to: "/sites", icon: Factory, label: "Sites" });
    }

    // Site managers enter their site's hours and headcount each month; SHE and admins can see them
    if (role === "admin" || isSheStaff(role) || role === "site_manager" || oversight) {
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
          </div>
        </div>
      </div>

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
