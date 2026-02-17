import React, { useState, useEffect } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newBoard, setNewBoard] = useState({
    title: "",
    description: "",
    background: "#3b82f6"
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    fetchBoards();
  }, [navigate]);

  const fetchBoards = async () => {
    try {
      console.log("📋 Fetching boards...");
      const response = await API.get("/boards");
      console.log("✅ Boards fetched:", response.data);
      setBoards(response.data);
    } catch (error) {
      console.error("❌ Fetch error:", error);
      toast.error("Failed to fetch boards");
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async (e) => {
    e.preventDefault();
    if (!newBoard.title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      console.log("➕ Creating board:", newBoard);
      const response = await API.post("/boards", newBoard);
      console.log("✅ Board created:", response.data);
      setBoards([...boards, response.data]);
      setShowModal(false);
      setNewBoard({ title: "", description: "", background: "#3b82f6" });
      toast.success("Board created successfully");
    } catch (error) {
      console.error("❌ Create error:", error);
      toast.error("Failed to create board");
    }
  };

  const deleteBoard = async (boardId) => {
    if (!window.confirm("Are you sure you want to delete this board?")) return;
    
    try {
      console.log("🗑️ Attempting to delete board:", boardId);
      
      const response = await API.delete(`/boards/${boardId}`);
      console.log("✅ Delete response:", response.data);
      
      setBoards(boards.filter(b => b._id !== boardId));
      toast.success("Board deleted successfully");
      
    } catch (error) {
      console.error("❌ Delete error:", error);
      console.error("Error response:", error.response?.data);
      
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        localStorage.removeItem("token");
        setTimeout(() => navigate("/login"), 2000);
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to delete this board");
      } else if (error.response?.status === 404) {
        toast.error("Board not found. It may have been already deleted.");
        fetchBoards();
      } else {
        toast.error(error.response?.data?.message || "Failed to delete board");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        background: "#f5f5f5" 
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ 
            width: "48px", 
            height: "48px", 
            border: "4px solid #e5e7eb", 
            borderTopColor: "#3b82f6", 
            borderRadius: "50%", 
            animation: "spin 1s linear infinite", 
            margin: "0 auto 16px" 
          }}></div>
          <p style={{ color: "#6b7280" }}>Loading your boards...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      {/* Header */}
      <div style={{ 
        background: "#1e3c72", 
        color: "white", 
        padding: "16px 32px", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center" 
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "24px", fontWeight: "bold", color: "#4CAF50" }}>TaskFlow</span>
          <span style={{ fontSize: "14px", color: "#ccc" }}>| Dashboard</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "14px" }}>Welcome, User!</span>
          <button 
            onClick={handleLogout} 
            style={{ 
              background: "#f44336", 
              color: "white", 
              border: "none", 
              padding: "6px 16px", 
              borderRadius: "4px", 
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: "1200px", margin: "32px auto", padding: "0 16px" }}>
        {/* Welcome Card */}
        <div style={{ 
          background: "white", 
          padding: "32px", 
          borderRadius: "8px", 
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)", 
          marginBottom: "24px" 
        }}>
          <h1 style={{ fontSize: "28px", fontWeight: "600", color: "#1e3c72", marginBottom: "8px" }}>
            Welcome back, User!
          </h1>
          <p style={{ color: "#666" }}>Here's what's happening with your projects today.</p>
        </div>

        {/* Total Boards */}
        <div style={{ 
          background: "white", 
          padding: "24px", 
          borderRadius: "8px", 
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)", 
          marginBottom: "32px" 
        }}>
          <h3 style={{ color: "#666", fontSize: "16px", marginBottom: "8px" }}>Total Boards</h3>
          <p style={{ fontSize: "32px", fontWeight: "bold", color: "#4CAF50" }}>{boards.length}</p>
        </div>

        {/* Your Boards Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: "16px" 
        }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1e3c72" }}>Your Boards</h2>
          <button 
            onClick={() => setShowModal(true)} 
            style={{ 
              background: "#4CAF50", 
              color: "white", 
              border: "none", 
              padding: "8px 20px", 
              borderRadius: "4px", 
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            + New Board
          </button>
        </div>

        {/* Boards Grid */}
        {boards.length === 0 ? (
          <div style={{ 
            background: "white", 
            padding: "48px", 
            textAlign: "center", 
            border: "2px dashed #ccc", 
            borderRadius: "8px" 
          }}>
            <p style={{ color: "#999", marginBottom: "16px" }}>No boards yet. Create your first board!</p>
            <button 
              onClick={() => setShowModal(true)} 
              style={{ 
                background: "#4CAF50", 
                color: "white", 
                border: "none", 
                padding: "10px 24px", 
                borderRadius: "4px", 
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              Create First Board
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
            {boards.map((board) => (
              <div 
                key={board._id} 
                style={{ 
                  background: "white", 
                  borderRadius: "8px", 
                  overflow: "hidden", 
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  position: "relative"
                }}
              >
                <Link to={`/board/${board._id}`} style={{ textDecoration: "none" }}>
                  <div style={{ 
                    height: "120px", 
                    background: board.background || "#3b82f6" 
                  }}></div>
                  <div style={{ padding: "16px" }}>
                    <h3 style={{ 
                      fontSize: "18px", 
                      fontWeight: "600", 
                      color: "#333", 
                      marginBottom: "8px" 
                    }}>
                      {board.title}
                    </h3>
                    <p style={{ 
                      fontSize: "14px", 
                      color: "#666", 
                      marginBottom: "12px" 
                    }}>
                      {board.description || "No description"}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => deleteBoard(board._id)}
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    background: "#f44336",
                    color: "white",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "500",
                    zIndex: 10
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Board Modal */}
      {showModal && (
        <div style={{ 
          position: "fixed", 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: "rgba(0,0,0,0.5)", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          zIndex: 1000 
        }} onClick={() => setShowModal(false)}>
          <div style={{ 
            background: "white", 
            borderRadius: "8px", 
            maxWidth: "450px", 
            width: "90%", 
            padding: "24px" 
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>Create New Board</h3>
            <form onSubmit={createBoard}>
              <input 
                type="text" 
                value={newBoard.title} 
                onChange={(e) => setNewBoard({...newBoard, title: e.target.value})} 
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  marginBottom: "16px", 
                  border: "1px solid #ddd", 
                  borderRadius: "4px",
                  fontSize: "14px"
                }} 
                placeholder="Board title" 
                required 
              />
              <textarea 
                value={newBoard.description} 
                onChange={(e) => setNewBoard({...newBoard, description: e.target.value})} 
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  marginBottom: "16px", 
                  border: "1px solid #ddd", 
                  borderRadius: "4px",
                  fontSize: "14px",
                  minHeight: "80px" 
                }} 
                placeholder="Description (optional)" 
              />
              <div style={{ display: "flex", gap: "12px" }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  style={{ 
                    flex: 1, 
                    padding: "10px", 
                    border: "1px solid #ddd", 
                    background: "white", 
                    borderRadius: "4px", 
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ 
                    flex: 1, 
                    padding: "10px", 
                    background: "#4CAF50", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "4px", 
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 
          to { transform: rotate(360deg); } 
        }
      `}</style>
    </div>
  );
}