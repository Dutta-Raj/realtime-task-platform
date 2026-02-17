import axios from 'axios';

// Use environment variable or default to localhost for development
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://realtime-task-platform.onrender.com/api'
  : 'http://localhost:5000/api';

console.log('🔗 API Base URL:', BASE_URL);

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log(`📤 ${config.method.toUpperCase()} request to: ${config.url}`);
    console.log('Token from localStorage:', token ? 'Present' : 'Not found');
    
    if (token) {
      // Ensure token has Bearer prefix
      config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      console.log('✅ Token added to request headers');
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Handle response errors
API.interceptors.response.use(
  (response) => {
    console.log(`📥 Response received:`, response.status);
    return response;
  },
  (error) => {
    console.error('❌ Response error:', error.response?.status, error.response?.data);
    
    if (error.response?.status === 401) {
      console.log('🔒 Unauthorized! Token may be expired');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default API;