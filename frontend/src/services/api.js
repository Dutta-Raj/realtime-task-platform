import axios from 'axios';

// Use your Render backend URL
const BASE_URL = 'https://realtime-task-platform.onrender.com/api';

console.log('🔗 API Base URL:', BASE_URL);

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add token to every request - FIXED VERSION
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log(`📤 ${config.method.toUpperCase()} request to: ${config.url}`);
    console.log('Raw token from storage:', token);
    
    if (token) {
      // Try different token formats
      // Format 1: Just the token
      config.headers.Authorization = token;
      console.log('✅ Token added without Bearer');
    }
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
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
    
    if (error.response?.status === 400) {
      console.log('🔒 Token might be invalid. Trying alternative format...');
      
      // Try alternative token format
      const token = localStorage.getItem('token');
      if (token && !token.startsWith('Bearer ')) {
        localStorage.setItem('token', `Bearer ${token}`);
        console.log('✅ Token updated to Bearer format');
      }
    }
    
    return Promise.reject(error);
  }
);

export default API;