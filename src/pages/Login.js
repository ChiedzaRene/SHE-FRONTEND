import React, { useState } from 'react';
<<<<<<< HEAD
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
=======
import { homeFor } from '../utils/home';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// 1. Import the verified logo file
import { apiError } from '../utils/apiError';
import { SESSION_NOTICE_KEY } from '../api/axios';
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
import logo from '../assets/glow-logo-1.jpg'; 

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
<<<<<<< HEAD
=======
  // Set when the app signed the user out because their session ended
  const [notice] = useState(() => {
    try {
      const msg = sessionStorage.getItem(SESSION_NOTICE_KEY);
      sessionStorage.removeItem(SESSION_NOTICE_KEY);
      return msg || '';
    } catch (e) {
      return '';
    }
  });
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
<<<<<<< HEAD
    
=======
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
    setError('');
    setIsLoading(true);

    try {
<<<<<<< HEAD
      
      const res = await login(email, password);
      

      // Verify payload existence before proceeding
      if (!res) {
        throw new Error("Invalid response from server or authentication failed.");
      }

      // Safe role normalization
      const rawRole = res?.role || res?.user?.role || res?.data?.role || '';
      const role = String(rawRole).toLowerCase().trim();

      console.log("Normalized role detected:", role);

      switch (role) {
        case 'super_admin':
          console.log("Routing to: /admin/users");
          navigate('/admin/users', { replace: true });
          break;
        case 'admin': 
          console.log("Routing to: /admin");
          navigate('/admin', { replace: true }); 
          break;
        case 'she_team': 
          console.log("Routing to: /she-dashboard");
          navigate('/she-dashboard', { replace: true }); 
          break;
        case 'site_manager': 
          console.log("Routing to: /site-dashboard");
          navigate('/site-dashboard', { replace: true }); 
          break;
        default: 
          
          // DO NOT NAVIGATE — Stop invalid users here
          setError("Account does not have a valid assigned role. Please contact your administrator.");
      }
    } catch (err) {
      
      setError(
        err?.response?.data?.detail || 
        err?.message || 
        'Invalid email or password. Please try again.'
      );
    } finally {

=======
      const payload = await login(email, password);
      // Temporary password set by an admin: go straight to choosing a new one
      if (payload.mcp) {
        navigate('/settings');
        return;
      }
      // Route based on role
      navigate(homeFor(payload.role) === '/login' ? '/' : homeFor(payload.role));
    } catch (err) {
      setError(apiError(err, 'Invalid email or password. Please try again.'));
    } finally {
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
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
<<<<<<< HEAD
              marginBottom: '16px',
              display: 'inline-block'
=======
              marginBottom: '16px' 
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
            }} 
          />
          <h1 className="login-logo-title" style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>
            SHE Portal
          </h1>
          <p className="login-logo-sub" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Safety, Health, Environment
          </p>
        </div>

<<<<<<< HEAD
=======
        {notice && !error && (
          <div role="status" style={{
            backgroundColor: '#eff6ff', color: '#1e40af', padding: '10px', borderRadius: '6px',
            marginBottom: '20px', fontSize: '0.85rem', textAlign: 'center', fontWeight: '600'
          }}>
            {notice}
          </div>
        )}

>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
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
<<<<<<< HEAD
            <label className="form-label">Email Address</label>
            <input
=======
            <label className="form-label" htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              autoComplete="username"
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. manager@glowpetroleum.co.zw"
              required
<<<<<<< HEAD
              style={{
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: error ? 'var(--danger)' : '#ccc'
              }}
=======
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
            />
          </div>

          <div className="form-group" style={{ marginBottom: '32px' }}>
<<<<<<< HEAD
            <label className="form-label">Password</label>
            <input
=======
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              autoComplete="current-password"
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
<<<<<<< HEAD
              style={{
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: error ? 'var(--danger)' : '#ccc'
              }}
=======
>>>>>>> 5efc5de2c5b042e318673e7ef2a45614b01d5ba9
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