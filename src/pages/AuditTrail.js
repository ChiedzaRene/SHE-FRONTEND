import React from "react";
import AuditLogTab from "../components/settings/AuditLogTab";

// Everything that has happened in the portal, who did it and what changed (administrators only)
export default function AuditTrail() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Trail</h1>
          <p className="page-subtitle">
            Every sign-in and every record added, changed or deleted: who did it, when, from where, and what changed.
          </p>
        </div>
      </div>
      <AuditLogTab />
    </div>
  );
}
