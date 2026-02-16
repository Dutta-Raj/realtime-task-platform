import axios from 'axios'; 
 
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://task-platform-backend.onrender.com/api' 
  : 'http://localhost:5000/api'; 
 
const API = axios.create({ 
  baseURL: BASE_URL 
}); 
 
API.interceptors.request.use((config) =
  const token = localStorage.getItem('token'); 
  if (token) { 
    config.headers.Authorization = token; 
  } 
  return config; 
}); 
 
export default API; 
