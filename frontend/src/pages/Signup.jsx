import React, { useState } from 'react'; 
import { useAuth } from '../context/AuthContext'; 
import { useNavigate, Link } from 'react-router-dom'; 
 
const Signup = () => { 
  const [name, setName] = useState(''); 
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [loading, setLoading] = useState(false); 
  const { signup } = useAuth(); 
  const navigate = useNavigate(); 
 
  const handleSubmit = async (e) => { 
    e.preventDefault(); 
    setLoading(true); 
    const success = await signup(name, email, password); 
    setLoading(false); 
    if (success) { 
      navigate('/login'); 
    } 
  }; 
 
  return ( 
    <div className="min-h-screen flex items-center justify-center bg-gray-900"> 
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-lg shadow-xl"> 
        <h2 className="text-3xl font-bold text-center text-white">Sign Up</h2> 
        <form onSubmit={handleSubmit} className="space-y-6"> 
          <div> 
            <label className="block text-sm font-medium text-gray-300">Name</label> 
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
              required 
            /> 
          </div> 
          <div> 
            <label className="block text-sm font-medium text-gray-300">Email</label> 
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
              required 
            /> 
          </div> 
          <div> 
            <label className="block text-sm font-medium text-gray-300">Password</label> 
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
              required 
            /> 
          </div> 
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50" 
          > 
            {loading ? 'Loading...' : 'Sign Up'} 
          </button> 
        </form> 
        <p className="text-center text-gray-400"> 
          Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300">Login</Link> 
        </p> 
      </div> 
    </div> 
  ); 
}; 
 
export default Signup; 
