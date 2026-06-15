import React, { useEffect, useState } from "react";
import { ClipboardCheck, Search, RefreshCw } from "lucide-react";
import { scorecardApi, sitesApi } from "../api/endpoints";

const ScorecardOverview = () => {
  const [scores, setScores] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- Filters ---
  const [siteFilter, setSiteFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchSites = async () => {
    try {
      const res = await sitesApi.getAll();
      setSites(res.data);
    } catch (err) {
      console.error("Error fetching sites:", err);
    }
  };

  const fetchScores = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (siteFilter !== "all") params.site_id = siteFilter;
      if (minScore !== "") params.min_score = minScore;
      if (maxScore !== "") params.max_score = maxScore;
      if (startDate !== "") params.start_date = startDate;
      if (endDate !== "") params.end_date = endDate;

      const res = await scorecardApi.getAllLatest(params);
      setScores(res.data);
    } catch (err) {
      console.error("Error fetching scorecard overview:", err);
      setError(err?.response?.data?.detail || "Failed to load scorecard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  useEffect(() => {
    fetchScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteFilter, minScore, maxScore, startDate, endDate]);

  const getScorePill = (pct) => {
    let colors = { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" };
    if (pct >= 90)
      colors = { bg: "#ecfdf5", text: "#059669", border: "#10b981" };
    else if (pct >= 75)
      colors = { bg: "#f0fdf4", text: "#16a34a", border: "#4ade80" };
    else if (pct >= 50)
      colors = { bg: "#fffbeb", text: "#d97706", border: "#fbbf24" };
    else colors = { bg: "#fef2f2", text: "#dc2626", border: "#f87171" };

    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "2px 10px",
          borderRadius: "999px",
          fontSize: "0.8rem",
          fontWeight: "700",
          backgroundColor: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.border}`,
        }}
      >
        {pct}%
      </div>
    );
  };

  const filteredScores = scores.filter((s) =>
    (s.site_name || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div style={{ padding: "20px" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Site Legal Compliance Scores</h1>
          <p className="page-subtitle">
            Latest legal requirements scorecard for each site
          </p>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar" style={{ flexWrap: "wrap", gap: "10px" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              placeholder="Search by site name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control"
              style={{ paddingLeft: 36 }}
            />
          </div>

          <select
            className="form-control"
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            style={{ minWidth: 160 }}
          >
            <option value="all">All Sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={0}
            max={5}
            step={0.1}
            placeholder="Min score (0-5)"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            className="form-control"
            style={{ width: 140 }}
          />

          <input
            type="number"
            min={0}
            max={5}
            step={0.1}
            placeholder="Max score (0-5)"
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            className="form-control"
            style={{ width: 140 }}
          />

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="form-control"
            style={{ width: 160 }}
            title="Submitted from"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="form-control"
            style={{ width: 160 }}
            title="Submitted to"
          />

          <button
            className="btn btn-outline"
            onClick={fetchScores}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {error && (
          <div
            style={{
              color: "#dc2626",
              backgroundColor: "#fef2f2",
              padding: "10px",
              borderRadius: "6px",
              margin: "12px 0",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}

        <div className="table-wrap">
          <table style={{ borderCollapse: "separate", borderSpacing: "0 8px" }}>
            <thead>
              <tr style={{ backgroundColor: "transparent" }}>
                <th style={{ padding: "12px" }}>Site</th>
                <th>Overall Score</th>
                <th>Score (%)</th>
                <th>Submitted By</th>
                <th>Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{ textAlign: "center", padding: "40px" }}
                  >
                    <div className="spinner"></div>
                  </td>
                </tr>
              ) : filteredScores.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#64748b",
                    }}
                  >
                    No scorecard submissions found.
                  </td>
                </tr>
              ) : (
                filteredScores.map((s) => (
                  <tr
                    key={s.id}
                    style={{
                      backgroundColor: "white",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    }}
                  >
                    <td
                      style={{ padding: "15px", borderRadius: "8px 0 0 8px" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <ClipboardCheck size={16} color="#475569" />
                        <span style={{ fontWeight: 700, color: "#1e293b" }}>
                          {s.site_name || `Site #${s.site_id}`}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: "#1e293b" }}>
                      {s.overall_score.toFixed(2)} / 5
                    </td>
                    <td>{getScorePill(s.overall_percent)}</td>
                    <td style={{ fontSize: "0.85rem", color: "#64748b" }}>
                      {s.submitted_by_name || `User #${s.submitted_by}`}
                    </td>
                    <td
                      style={{
                        fontSize: "0.85rem",
                        borderRadius: "0 8px 8px 0",
                      }}
                    >
                      {s.submitted_at
                        ? new Date(s.submitted_at).toLocaleString()
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

export default ScorecardOverview;
