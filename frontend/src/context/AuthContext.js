import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api';

const API = API_BASE_URL;

const AuthContext = createContext(null);

// Set auth token on all axios requests
const setAuthToken = (token) => {
  if (typeof window === 'undefined') {
    return;
  }
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('krishi_token', token);
  } else {
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('krishi_token');
  }
};

// Restore token on page load
const savedToken = typeof window !== 'undefined' ? localStorage.getItem('krishi_token') : null;
if (savedToken) {
  setAuthToken(savedToken);
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('krishi_token') : null;
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setAuthToken(token);
      const response = await axios.get(`${API}/api/auth/me`);
      setUser(response.data);
    } catch (error) {
      setAuthToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/api/auth/login`, { email, password });
    const data = response.data;
    setAuthToken(data.access_token);
    const userObj = { id: data.id, name: data.name, email: data.email, role: data.role };
    setUser(userObj);
    return userObj;
  };

  const register = async (name, email, password, phone) => {
    const response = await axios.post(`${API}/api/auth/register`, { name, email, password, phone });
    const data = response.data;
    setAuthToken(data.access_token);
    const userObj = { id: data.id, name: data.name, email: data.email, role: data.role };
    setUser(userObj);
    return userObj;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/api/auth/logout`);
    } catch (_) {}
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
