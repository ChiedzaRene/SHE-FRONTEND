import React, { useEffect, useState } from "react";
import { settingsApi } from "../../api/endpoints";
import { invalidateSafetyTargets } from "../../hooks/useSafetyTargets";
import { apiError } from "../../utils/apiError";

export default function TargetsTab() {
  const [targets, setTargets] = useState(null);
  const [trir, setTrir] = useState("");
  const [ltifr, setLtifr] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    settingsApi
      .getTargets()
      .then((res) => {
        setTargets(res.data);
        setTrir(String(res.data.trir_limit));
        setLtifr(String(res.data.ltifr_limit));
      })
      .catch((err) => setResult({ ok: false, text: apiError(err, "Could not load the targets.") }));
  }, []);

  const trirNum = Number(trir);
  const ltifrNum = Number(ltifr);
  const valid = trirNum > 0 && trirNum <= 100 && ltifrNum > 0 && ltifrNum <= 100;
  const unchanged = targets && trirNum === targets.trir_limit && ltifrNum === targets.ltifr_limit;

  const save = async (e) => {
    e.preventDefault();
    setResult(null);
    setSaving(true);
    try {
      const res = await settingsApi.saveTargets({ trir_limit: trirNum, ltifr_limit: ltifrNum });
      invalidateSafetyTargets();
      setTargets(res.data);
      setResult({ ok: true, text: "Saved. The dashboards and reports now use these limits." });
    } catch (err) {
      setResult({ ok: false, text: apiError(err, "Could not save the targets.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
      <div className="card">
        <div className="card-header"><div className="card-title">Warning limits</div></div>
        <form onSubmit={save} style={{ padding: 20 }}>
          <p style={{ marginTop: 0, color: "#475569", fontSize: "0.9rem" }}>
            A site is flagged <strong>Action required</strong> when its rate is above either limit.
            Both are per {targets ? targets.rate_basis_hours.toLocaleString() : "200,000"} hours worked.
          </p>
          <div className="form-group">
            <label className="form-label" htmlFor="limit-trir">TRIR limit</label>
            <input id="limit-trir" type="number" step="0.1" min="0.1" max="100" className="form-control"
              value={trir} onChange={(e) => setTrir(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="limit-ltifr">LTIFR limit</label>
            <input id="limit-ltifr" type="number" step="0.1" min="0.1" max="100" className="form-control"
              value={ltifr} onChange={(e) => setLtifr(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving || !valid || unchanged || !targets}>
            {saving ? "Saving..." : "Save limits"}
          </button>
          {result && (
            <div role={result.ok ? "status" : "alert"} style={{
              marginTop: 12, padding: "10px 12px", borderRadius: 8, fontSize: "0.9rem",
              background: result.ok ? "#f0fdf4" : "#fef2f2", color: result.ok ? "#166534" : "#991B1B",
            }}>{result.text}</div>
          )}
        </form>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">How the rates are calculated</div></div>
        <div style={{ padding: 20, color: "#334155", fontSize: "0.9rem", lineHeight: 1.6 }}>
          <p style={{ marginTop: 0 }}>These rules are fixed so every screen and report agrees:</p>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            <li><strong>TRIR</strong> = recordable incidents × {targets ? targets.rate_basis_hours.toLocaleString() : "200,000"} ÷ hours worked</li>
            <li><strong>LTIFR</strong> = lost-time injuries × {targets ? targets.rate_basis_hours.toLocaleString() : "200,000"} ÷ hours worked</li>
            <li>{targets ? targets.recordable_rule : "An incident of type 'injury' is recordable."}</li>
            <li>{targets ? targets.lost_time_rule : "A lost-time injury is a recordable injury with lost days above 0."}</li>
            <li>Only months with hours entered (Hours Worked page) are counted. A site with no hours shows N/A.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
