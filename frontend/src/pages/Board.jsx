import React, { useState, useEffect } from 'react'; 
import { useParams, useNavigate } from 'react-router-dom'; 
import { useAuth } from '../context/AuthContext'; 
import API from '../services/api'; 
import toast from 'react-hot-toast'; 
 
const Board = () => { 
  const { id } = useParams(); 
  const navigate = useNavigate(); 
  const [board, setBoard] = useState(null); 
  const [loading, setLoading] = useState(true); 
 
  useEffect(() => { 
    fetchBoard(); 
  }, [id]); 
 
  const fetchBoard = async () => { 
    try { 
      const { data } = await API.get(`/boards/${id}`); 
      setBoard(data); 
    } catch (error) { 
      toast.error('Failed to load board'); 
      navigate('/dashboard'); 
    } finally { 
      setLoading(false); 
    } 
  }; 
 
  if (loading) { 
    return ( 
      <div className="min-h-screen flex items-center justify-center bg-gray-900"> 
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div> 
      </div> 
    ); 
  } 
 
  return ( 
    <div className="min-h-screen bg-gray-900"> 
      <div className="bg-gray-800 border-b border-gray-700 p-4"> 
        <div className="container mx-auto flex justify-between items-center"> 
          <h1 className="text-2xl font-bold text-white">{board?.title}</h1> 
          <button 
            onClick={() => navigate('/dashboard')} 
            className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600" 
          > 
            Back to Boards 
          </button> 
        </div> 
      </div> 
      <div className="container mx-auto p-6"> 
        <p className="text-gray-400">{board?.description}</p> 
      </div> 
    </div> 
  ); 
}; 
 
export default Board; 
