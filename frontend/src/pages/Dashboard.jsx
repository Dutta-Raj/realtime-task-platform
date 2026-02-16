import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [boards, setBoards] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newBoard, setNewBoard] = useState({ title: '', description: '', background: '#667eea' });
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const { data } = await API.get('/boards');
      setBoards(data);
    } catch (error) {
      toast.error('Failed to fetch boards');
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post('/boards', newBoard);
      setBoards([...boards, data]);
      setShowModal(false);
      setNewBoard({ title: '', description: '', background: '#667eea' });
      toast.success('Board created successfully! 🎉');
    } catch (error) {
      toast.error('Failed to create board');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold gradient-text">TaskFlow</h1>
              <div className="hidden md:flex space-x-4">
                <span className="text-gray-600">Dashboard</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">Boards</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="member-avatar">
                  {user?.name?.[0] || 'U'}
                </div>
                <span className="text-gray-700 font-medium hidden md:block">
                  {user?.name || 'User'}
                </span>
              </div>
              <button 
                onClick={logout} 
                className="btn-secondary"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Your Boards</h2>
            <p className="text-gray-600">Manage your projects and tasks efficiently</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New Board
          </button>
        </div>

        {/* Boards Grid */}
        {boards.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V5m12 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No boards yet</h3>
            <p className="text-gray-500 mb-6">Create your first board to get started</p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary"
            >
              Create Your First Board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {boards.map((board, index) => (
              <Link to={`/board/${board._id}`} key={board._id} style={{ animationDelay: `${index * 0.1}s` }} className="fade-in">
                <div className="board-card group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: board.background || '#667eea' }}></div>
                    <div className="flex -space-x-2">
                      {board.members?.slice(0, 3).map((member, i) => (
                        <div
                          key={i}
                          className="member-avatar"
                          title={member?.name}
                        >
                          {member?.name?.[0] || 'U'}
                        </div>
                      ))}
                      {(board.members?.length || 0) > 3 && (
                        <div className="member-avatar bg-gray-400">
                          +{board.members.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-indigo-600 transition">
                    {board.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{board.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {new Date(board.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span className="text-indigo-600 font-medium group-hover:translate-x-2 transition-transform">
                      View Board →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Board Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Create New Board</h3>
            <form onSubmit={createBoard}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Board Title
                </label>
                <input
                  type="text"
                  value={newBoard.title}
                  onChange={(e) => setNewBoard({ ...newBoard, title: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Project Management"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newBoard.description}
                  onChange={(e) => setNewBoard({ ...newBoard, description: e.target.value })}
                  className="input-field"
                  placeholder="What's this board about?"
                  rows="3"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Board Color
                </label>
                <input
                  type="color"
                  value={newBoard.background}
                  onChange={(e) => setNewBoard({ ...newBoard, background: e.target.value })}
                  className="w-full h-12 rounded-lg border-2 border-gray-200 cursor-pointer"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;