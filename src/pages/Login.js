import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    padding: '48px 40px 40px 40px',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logoBar: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  logoAccent: {
    display: 'inline-block',
    width: '10px',
    height: '36px',
    backgroundColor: '#c8102e',
    borderRadius: '3px',
    marginRight: '12px',
  },
  companyName: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#0a2e6e',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  companyTag: {
    fontSize: '11px',
    color: '#6b7a99',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: '32px',
    marginTop: '2px',
  },
  divider: {
    width: '48px',
    height: '3px',
    backgroundColor: '#c8102e',
    borderRadius: '2px',
    marginBottom: '28px',
  },
  heading: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0a2e6e',
    marginBottom: '6px',
    textAlign: 'center',
  },
  subheading: {
    fontSize: '13px',
    color: '#6b7a99',
    marginBottom: '28px',
    textAlign: 'center',
  },
  fieldGroup: {
    width: '100%',
    marginBottom: '18px',
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#0a2e6e',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    fontSize: '15px',
    border: '1.5px solid #d0d8ec',
    borderRadius: '5px',
    color: '#1a2340',
    backgroundColor: '#f8f9fc',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  inputFocus: {
    borderColor: '#0a2e6e',
    backgroundColor: '#fff',
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#fff0f2',
    border: '1px solid #f5c2c9',
    borderLeft: '4px solid #c8102e',
    borderRadius: '4px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#a0001a',
    marginBottom: '18px',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '13px',
    backgroundColor: '#0a2e6e',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '700',
    letterSpacing: '0.04em',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginTop: '6px',
    transition: 'background-color 0.2s',
  },
  buttonHover: {
    backgroundColor: '#c8102e',
  },
  buttonLoading: {
    backgroundColor: '#6b7a99',
    cursor: 'not-allowed',
  },
  footer: {
    marginTop: '32px',
    fontSize: '11px',
    color: '#aab2c8',
    textAlign: 'center',
    letterSpacing: '0.04em',
  },
  footerAccent: {
    color: '#c8102e',
    fontWeight: '700',
  },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [btnHover, setBtnHover] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const payload = await login(email, password);

      // Route based on role from JWT payload
      const role = payload?.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'she_team') navigate('/she');
      else if (role === 'site_manager') navigate('/site');
      else navigate('/dashboard');
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        'Incorrect email or password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo / Branding */}
        <div style={styles.logoBar}>
          <span style={styles.logoAccent} />
          <span style={styles.companyName}>Glow Petroleum</span>
        </div>
        <div style={styles.companyTag}>SHE Management System</div>

        <div style={styles.divider} />

        <div style={styles.heading}>Sign in to your account</div>
        <div style={styles.subheading}>
          Enter your credentials to access the portal
        </div>

        {/* Error message */}
        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@glowpetroleum.co.zw"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              style={{
                ...styles.input,
                ...(emailFocused ? styles.inputFocus : {}),
              }}
              disabled={loading}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              style={{
                ...styles.input,
                ...(passwordFocused ? styles.inputFocus : {}),
              }}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={{
              ...styles.button,
              ...(loading
                ? styles.buttonLoading
                : btnHover
                ? styles.buttonHover
                : {}),
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div style={styles.footer}>
          <span style={styles.footerAccent}>Glow Petroleum (Pvt) Ltd</span>
          {' · '}Internal Use Only
        </div>
      </div>
    </div>
  );
}