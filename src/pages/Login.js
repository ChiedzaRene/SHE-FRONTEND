import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/glow-logo-1.jpg'; 

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const payload = await login(email, password);
      
      switch (payload.role) {
        case 'admin': 
          navigate('/admin'); 
          break;
        case 'she_team': 
          navigate('/she-dashboard'); 
          break;
        case 'site_manager': 
          navigate('/site-dashboard'); 
          break;
        default: 
          navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* --- BRAND LOGO --- */}
        <div className="login-logo" style={{ textAlign: 'center', paddingBottom: '20px' }}>
          <img 
            src={logo} 
            alt="Glow Petroleum" 
            style={{ 
              maxWidth: '220px', 
              height: 'auto', 
              marginBottom: '16px',
              display: 'inline-block'
            }} 
          />
          <h1 className="login-logo-title" style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>
            SHE Portal
          </h1>
          <p className="login-logo-sub" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Safety, Health, Environment
          </p>
        </div>

        {error && (
          <div className="error-msg" style={{ 
            backgroundColor: 'var(--danger-light)', 
            color: 'var(--danger)', 
            padding: '10px', 
            borderRadius: '6px', 
            marginBottom: '20px',
            fontSize: '0.85rem',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. manager@glowpetroleum.co.zw"
              required
              style={{
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: error ? 'var(--danger)' : '#ccc'
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: error ? 'var(--danger)' : '#ccc'
              }}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={isLoading}>
            {isLoading ? (
              <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', margin: '0 auto' }} />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-light)' }}>
          © {new Date().getFullYear()} Glow Petroleum Ltd.
        </div>
      </div>
    </div>
  );
}