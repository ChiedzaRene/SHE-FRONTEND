import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios'; // Import standard axios directly to bypass endpoint blocks

const AuthContext = createContext(null);

// Get the base API URL from your React environment variables (fallback to localhost if missing)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

export function decodeToken(token) {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("JWT Decode error:", error);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const initUser = useCallback(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = decodeToken(token);
      if (payload) {
        setUser({ token, ...payload });
      } else {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { 
    initUser(); 
  }, [initUser]);

  const login = async (email, password) => {
    console.log("   👉 3. Inside AuthContext: login function triggered.");
    
    // 1. Build the mandatory OAuth2 form parameters for FastAPI
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    console.log(`   👉 4. Dispatching direct form-urlencoded request to: ${API_BASE_URL}/auth/login`);
    
    try {
      // 2. Fire the request explicitly bypassing endpoints wrapper
      const res = await axios.post(`${API_BASE_URL}/auth/login`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      console.log("   👉 5. Network request resolved successfully! Data:", res?.data);

      const { access_token } = res.data;
      localStorage.setItem('token', access_token);
      
      const payload = decodeToken(access_token);
      console.log("   👉 6. Decoded payload contents:", payload);

      if (!payload) {
        throw new Error("JWT payload decoding failed and returned null.");
      }

      setUser({ token: access_token, ...payload });
      return payload;
    } catch (apiError) {
      // 3. This will print the EXACT reason it's failing (CORS, 422, 401, etc.)
      console.error("   ❌ API NETWORK FAILURE DETAILED DIAGNOSTICS:");
      if (apiError.response) {
        console.error("   Status Code:", apiError.response.status);
        console.error("   Server Error Data Body:", apiError.response.data);
      } else if (apiError.request) {
        console.error("   No response received from backend. Is your server running or is there a CORS/Network blocking rule?");
      } else {
        console.error("   Request configuration error message:", apiError.message);
      }
      throw apiError; 
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}