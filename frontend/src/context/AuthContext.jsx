import React, { createContext, useState, useContext, useEffect } from 'react';
import API from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      // Fetch user details if needed
      setUser({ name: 'User' });
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      console.log('Attempting login with:', { email, password });
      const response = await API.post('/auth/login', { email, password });
      console.log('Login response:', response.data);
      
      const { token, userId } = response.data;
      localStorage.setItem('token', token);
      setToken(token);
      setUser({ id: userId, email, name: email.split('@')[0] });
      toast.success('Login successful! 🎉');
      return true;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || 'Login failed';
      toast.error(errorMsg);
      return false;
    }
  };

  const signup = async (name, email, password) => {
    try {
      console.log('Attempting signup with:', { name, email, password });
      const response = await API.post('/auth/signup', { name, email, password });
      console.log('Signup response:', response.data);
      
      toast.success('Account created successfully! Please login.');
      return true;
    } catch (error) {
      console.error('Signup error:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || 'Signup failed';
      toast.error(errorMsg);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    toast.success('Logged out');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
};