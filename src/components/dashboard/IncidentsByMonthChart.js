import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Incident types in a fixed order with fixed colours, so a type keeps its colour whatever the filter shows.
// Validated for colour-blind separation between neighbouring segments; anything else folds into "other".
export const INCIDENT_TYPES = [
  { key: "injury", label: "Injury", color: "#2a78d6" },
  { key: "near-miss", label: "Near-miss", color: "#eb6834" },
  { key: "spill", label: "Spill", color: "#1baf7a" },
  { key: "fire", label: "Fire", color: "#eda100" },
  { key: "environmental", label: "Environmental", color: "#e87ba4" },
  { key: "other", label: "Other", color: "#008300" },
];
const KNOWN = new Set(INCIDENT_TYPES.map((t) => t.key));
export const typeKey = (name) => {
  const k = String(name || "other").trim().toLowerCase();
  return KNOWN.has(k) ? k : "other";
};

const RADIUS = 4;

const monthTick = (ym) => {
  const [y, m] = String(ym).split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
};

// Stacked segment: a 2px surface gap between segments, and only the top segment of each bar is rounded
const Segment = ({ x, y, width, height, fill, payload, dataKey, topKey }) => {
  if (!height || height <= 0) return null;
  const gap = 2;
  const h = Math.max(height - gap, 1);
  const r = topKey(payload) === dataKey ? Math.min(RADIUS, width / 2, h) : 0;
  const top = y + gap;
  const d = r
    ? `M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + width - r} Q${x + width},${top} ${x + width},${top + r} V${top + h} Z`
    : `M${x},${top} H${x + width} V${top + h} H${x} Z`;
  return <path d={d} fill={fill} />;
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value > 0);
  const total = rows.reduce((n, p) => n + p.value, 0);
  return (
    <div className="dash-tooltip">
      <div className="dash-tooltip-title">{monthTick(label)} · {total} incident{total === 1 ? "" : "s"}</div>
      {rows.slice().reverse().map((p) => (
        <div key={p.dataKey} className="dash-tooltip-row">
          <span className="dash-swatch" style={{ background: p.color }} aria-hidden="true" />
          <span>{INCIDENT_TYPES.find((t) => t.key === p.dataKey)?.label}</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

// months: [{ month: "YYYY-MM", injury: 2, spill: 1, ... }]; counts: { injury: 3, ... } for the legend
export default function IncidentsByMonthChart({ months, counts }) {
  const data = months.map((row) => {
    const out = { month: row.month };
    INCIDENT_TYPES.forEach((t) => { out[t.key] = 0; });
    Object.entries(row).forEach(([k, v]) => {
      if (k !== "month") out[typeKey(k)] += v;
    });
    return out;
  });
  // only the types that occur get a series (and a legend entry); their colours never change
  const shown = INCIDENT_TYPES.filter((t) => data.some((d) => d[t.key] > 0));
  const topKey = (row) => {
    for (let i = shown.length - 1; i >= 0; i -= 1) if (row[shown[i].key] > 0) return shown[i].key;
    return null;
  };

  if (shown.length === 0) {
    return <div className="dash-empty">No incidents recorded in this period</div>;
  }

  return (
    <div className="dash-chart">
      <ul className="dash-legend" aria-label="Incident types">
        {shown.map((t) => (
          <li key={t.key}>
            <span className="dash-swatch" style={{ background: t.color }} aria-hidden="true" />
            {t.label} ({counts[t.key] || 0})
          </li>
        ))}
      </ul>
      {/* grows to fill the card when the table beside it is taller, so the chart isn't stuck at the top */}
      <div className="dash-chart-plot">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 500, height: 260 }}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="#eef2f6" />
            <XAxis dataKey="month" tickFormatter={monthTick} tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
            {shown.map((t) => (
              <Bar key={t.key} dataKey={t.key} stackId="incidents" fill={t.color} isAnimationActive={false}
                shape={(props) => <Segment {...props} dataKey={t.key} topKey={topKey} />} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
