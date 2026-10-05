import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const monthName = (ym) => {
  const [y, m] = String(ym).split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
};

const list = (items) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

// TRIR/LTIFR only count injuries in months that have hours worked entered. Say so when injuries are left out,
// instead of the rates quietly reading N/A or 0.00.
export default function RateCoverageNotice({ metrics }) {
  const { user } = useAuth();
  const count = metrics?.uncounted_injuries || 0;
  if (!count) return null;
  const months = list((metrics.months_missing_hours || []).map(monthName));
  const canEnter = ["admin", "super_admin", "she_team"].includes(user?.role);
  return (
    <div role="status" className="rate-notice">
      <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <strong>
          {count} injur{count === 1 ? "y is" : "ies are"} not counted in TRIR/LTIFR yet
        </strong>{" "}
        because no hours worked have been entered for {months || "that month"}. The rates only include months with hours.{" "}
        {canEnter ? (
          <Link to="/site-hours">Enter hours worked</Link>
        ) : (
          "Ask the SHE team to enter the hours worked."
        )}
      </div>
    </div>
  );
}
