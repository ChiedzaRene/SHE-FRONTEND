import React, { useEffect, useState } from "react";
import { accountApi } from "../../api/endpoints";
import { apiError } from "../../utils/apiError";

const ROLE_LABEL = {
  super_admin: "Super admin",
  admin: "Admin",
  she_team: "SHE team",
  site_manager: "Site manager",
};

const Message = ({ result }) =>
  result ? (
    <div
      role={result.ok ? "status" : "alert"}
      style={{
        marginTop: 12, padding: "10px 12px", borderRadius: 8, fontSize: "0.9rem",
        background: result.ok ? "#f0fdf4" : "#fef2f2",
        color: result.ok ? "#166534" : "#991B1B",
      }}
    >
      {result.text}
    </div>
  ) : null;

export default function AccountTab() {
  const [me, setMe] = useState(null);
  const loaded = me !== null; // the forms stay disabled until then, so loading can't overwrite what you type
  const [name, setName] = useState("");
  const [nameResult, setNameResult] = useState(null);
  const [savingName, setSavingName] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwResult, setPwResult] = useState(null);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    accountApi
      .me()
      .then((res) => {
        setMe(res.data);
        setName(res.data.full_name || "");
      })
      .catch((err) => setNameResult({ ok: false, text: apiError(err, "Could not load your account.") }));
  }, []);

  const saveName = async (e) => {
    e.preventDefault();
    setNameResult(null);
    setSavingName(true);
    try {
      const res = await accountApi.updateMe({ full_name: name });
      setMe(res.data);
      setName(res.data.full_name || "");
      setNameResult({ ok: true, text: "Name saved." });
    } catch (err) {
      setNameResult({ ok: false, text: apiError(err, "Could not save your name.") });
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwResult(null);
    if (next.length < 8) return setPwResult({ ok: false, text: "The new password must be at least 8 characters." });
    if (next !== confirm) return setPwResult({ ok: false, text: "The new password and its confirmation don't match." });
    if (next === current) return setPwResult({ ok: false, text: "The new password must be different from the current one." });
    setSavingPw(true);
    try {
      await accountApi.changePassword({ current_password: current, new_password: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      setPwResult({ ok: true, text: "Password changed. Use the new password next time you sign in." });
    } catch (err) {
      setPwResult({ ok: false, text: apiError(err, "Could not change the password.") });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
      <div className="card">
        <div className="card-header"><div className="card-title">Your details</div></div>
        <form onSubmit={saveName} style={{ padding: 20 }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-control" value={me?.email || ""} disabled readOnly />
            <small style={{ color: "#64748b" }}>Your email and role are managed by an administrator.</small>
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <input className="form-control" value={me ? ROLE_LABEL[me.role] || me.role : ""} disabled readOnly />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="account-name">Full name</label>
            <input id="account-name" className="form-control" value={name} maxLength={150} required disabled={!loaded}
              onChange={(e) => setName(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={!loaded || savingName || !name.trim() || name.trim() === (me?.full_name || "")}>
            {savingName ? "Saving..." : "Save name"}
          </button>
          <Message result={nameResult} />
        </form>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Change password</div></div>
        <form onSubmit={savePassword} style={{ padding: 20 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="pw-current">Current password</label>
            <input id="pw-current" type="password" className="form-control" autoComplete="current-password"
              value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="pw-new">New password</label>
            <input id="pw-new" type="password" className="form-control" autoComplete="new-password" minLength={8}
              maxLength={128} value={next} onChange={(e) => setNext(e.target.value)} required />
            <small style={{ color: "#64748b" }}>At least 8 characters.</small>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="pw-confirm">Confirm new password</label>
            <input id="pw-confirm" type="password" className="form-control" autoComplete="new-password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={savingPw}>
            {savingPw ? "Changing..." : "Change password"}
          </button>
          <Message result={pwResult} />
          <p style={{ color: "#64748b", fontSize: "0.8rem", marginTop: 12 }}>
            Changing your password does not sign out other devices; those sessions end on their own after 8 hours.
          </p>
        </form>
      </div>
    </div>
  );
}
