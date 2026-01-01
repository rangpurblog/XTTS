import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(res.data);
        } catch (e) {
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      if (adminToken) {
        setAdmin({ token: adminToken });
      }
      setLoading(false);
    };
    initAuth();
  }, [token, adminToken]);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (email, password, name) => {
    const res = await axios.post(`${API}/auth/register`, { email, password, name });
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const adminLogin = async (email, password, secretKey) => {
    const res = await axios.post(`${API}/admin/auth/login`, { 
      email, 
      password, 
      secret_key: secretKey 
    });
    localStorage.setItem('adminToken', res.data.token);
    setAdminToken(res.data.token);
    setAdmin(res.data.admin);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const adminLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    setAdmin(null);
  };

  const refreshUser = async () => {
    if (token) {
      const res = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      admin,
      token,
      adminToken,
      loading,
      isAdmin: !!admin,
      login,
      register,
      adminLogin,
      logout,
      adminLogout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
