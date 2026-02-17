import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

export default function Board() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [tasks, setTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [showListModal, setShowListModal] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [currentListId, setCurrentListId] = useState(null);
  const [newTask, setNewTask] = useState({ title: "", description: "" });

  useEffect(() => {
    fetchBoardData();
  }, [id]);

  const fetchBoardData = async () => {
    try {
      setLoading(true);
      console.log("📋 Fetching board data for ID:", id);
      
      const boardRes = await API.get(`/boards/${id}`);
      console.log("✅ Board fetched:", boardRes.data);
      setBoard(boardRes.data);

      const listsRes = await API.get(`/lists/board/${id}`);
      console.log("✅ Lists fetched:", listsRes.data);
      setLists(listsRes.data);

      const tasksData = {};
      await Promise.all(listsRes.data.map(async (list) => {
        try {
          const tasksRes = await API.get(`/tasks/list/${list._id}`);
          tasksData[list._id] = tasksRes.data;
        } catch {
          tasksData[list._id] = [];
        }
      }));
      setTasks(tasksData);
      
    } catch (error) {
      console.error("❌ Error fetching board:", error);
      toast.error("Failed to load board");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const createList = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim()) {
      toast.error("List title is required");
      return;
    }

    try {
      console.log("➕ Creating list:", newListTitle);
      const response = await API.post("/lists", {
        title: newListTitle,
        boardId: id,
        order: lists.length
      });
      console.log("✅ List created:", response.data);
      
      setLists([...lists, response.data]);
      setTasks({ ...tasks, [response.data._id]: [] });
      setNewListTitle("");
      setShowListModal(false);
      toast.success("List created");
    } catch (error) {
      console.error("❌ Error creating list:", error);
      toast.error("Failed to create list");
    }
  };

  const deleteList = async (listId) => {
    if (!window.confirm("Are you sure you want to delete this list?")) return;
    
    try {
      console.log("🗑️ Deleting list:", listId);
      await API.delete(`/lists/${listId}`);
      
      setLists(lists.filter(l => l._id !== listId));
      const newTasks = { ...tasks };
      delete newTasks[listId];
      setTasks(newTasks);
      
      toast.success("List deleted");
    } catch (error) {
      console.error("❌ Error deleting list:", error);
      toast.error("Failed to delete list");
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      toast.error("Task title is required");
      return;
    }
    if (!currentListId) return;

    try {
      console.log("➕ Creating task in list:", currentListId);
      const response = await API.post("/tasks", {
        title: newTask.title,
        description: newTask.description,
        listId: currentListId,
        boardId: id,
        order: tasks[currentListId]?.length || 0
      });
      console.log("✅ Task created:", response.data);
      
      setTasks(prev => ({
        ...prev,
        [currentListId]: [...(prev[currentListId] || []), response.data]
      }));
      
      setNewTask({ title: "", description: "" });
      setShowTaskModal(false);
      setCurrentListId(null);
      toast.success("Task created");
    } catch (error) {
      console.error("❌ Error creating task:", error);
      toast.error("Failed to create task");
    }
  };

  const deleteTask = async (taskId, listId) => {
    if (!window.confirm("Delete this task?")) return;
    
    try {
      console.log("🗑️ Deleting task:", taskId);
      await API.delete(`/tasks/${taskId}`);
      
      setTasks(prev => ({
        ...prev,
        [listId]: prev[listId]?.filter(t => t._id !== taskId)
      }));
      
      toast.success("Task deleted");
    } catch (error) {
      console.error("❌ Error deleting task:", error);
      toast.error("Failed to delete task");
    }
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
          <p style={{ color: "#6b7280" }}>Loading board...</p>
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
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              background: "none",
              border: "none",
              color: "white",
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            ← Back to Dashboard
          </button>
          <div>
            <span style={{ fontSize: "20px", fontWeight: "bold", color: "#4CAF50" }}>
              {board?.title}
            </span>
            <span style={{ fontSize: "14px", color: "#ccc", marginLeft: "12px" }}>
              {board?.description}
            </span>
          </div>
        </div>
      </div>

      {/* Board Content */}
      <div style={{ 
        maxWidth: "1400px", 
        margin: "32px auto", 
        padding: "0 16px",
        overflowX: "auto" 
      }}>
        <div style={{ 
          display: "flex", 
          gap: "20px", 
          padding: "8px 0 16px"
        }}>
          {/* Lists */}
          {lists.map((list) => (
            <div
              key={list._id}
              style={{
                background: "white",
                borderRadius: "8px",
                width: "300px",
                flexShrink: 0,
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                display: "flex",
                flexDirection: "column",
                maxHeight: "calc(100vh - 200px)"
              }}
            >
              {/* List Header */}
              <div style={{
                padding: "16px",
                borderBottom: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#333" }}>
                  {list.title}
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    background: "#e5e7eb",
                    color: "#4b5563",
                    fontSize: "12px",
                    padding: "2px 8px",
                    borderRadius: "12px"
                  }}>
                    {tasks[list._id]?.length || 0}
                  </span>
                  <button
                    onClick={() => deleteList(list._id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#f44336",
                      fontSize: "18px",
                      cursor: "pointer",
                      padding: "0 4px"
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Tasks Container */}
              <div style={{
                padding: "12px",
                overflowY: "auto",
                flex: 1,
                minHeight: "200px"
              }}>
                {tasks[list._id]?.map((task) => (
                  <div
                    key={task._id}
                    style={{
                      background: "#f9f9f9",
                      padding: "12px",
                      borderRadius: "6px",
                      marginBottom: "8px",
                      border: "1px solid #eee",
                      position: "relative"
                    }}
                  >
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start"
                    }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#333",
                          marginBottom: "4px"
                        }}>{task.title}</h4>
                        {task.description && (
                          <p style={{
                            fontSize: "12px",
                            color: "#666",
                            lineHeight: "1.5"
                          }}>{task.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteTask(task._id, list._id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#999",
                          fontSize: "16px",
                          cursor: "pointer",
                          padding: "0 4px"
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                {(!tasks[list._id] || tasks[list._id].length === 0) && (
                  <p style={{
                    textAlign: "center",
                    color: "#999",
                    fontSize: "13px",
                    padding: "20px 0"
                  }}>
                    No tasks yet
                  </p>
                )}
              </div>

              {/* Add Task Button */}
              <div style={{
                padding: "12px",
                borderTop: "1px solid #eee"
              }}>
                <button
                  onClick={() => {
                    setCurrentListId(list._id);
                    setShowTaskModal(true);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    color: "#666",
                    fontSize: "13px",
                    cursor: "pointer",
                    padding: "6px"
                  }}
                >
                  + Add a task
                </button>
              </div>
            </div>
          ))}

          {/* Add List Button */}
          <button
            onClick={() => setShowListModal(true)}
            style={{
              background: "white",
              border: "2px dashed #ccc",
              borderRadius: "8px",
              width: "300px",
              flexShrink: 0,
              padding: "16px",
              color: "#666",
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px"
            }}
          >
            + Add another list
          </button>
        </div>
      </div>

      {/* Create List Modal */}
      {showListModal && (
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
        }} onClick={() => setShowListModal(false)}>
          <div style={{ 
            background: "white", 
            borderRadius: "8px", 
            maxWidth: "400px", 
            width: "90%", 
            padding: "24px" 
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Create New List</h3>
            <form onSubmit={createList}>
              <input
                type="text"
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  marginBottom: "16px"
                }}
                placeholder="List title"
                autoFocus
              />
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowListModal(false)}
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
                  Create List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showTaskModal && (
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
        }} onClick={() => setShowTaskModal(false)}>
          <div style={{ 
            background: "white", 
            borderRadius: "8px", 
            maxWidth: "400px", 
            width: "90%", 
            padding: "24px" 
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Create New Task</h3>
            <form onSubmit={createTask}>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  marginBottom: "12px"
                }}
                placeholder="Task title"
                autoFocus
              />
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  marginBottom: "16px",
                  minHeight: "80px"
                }}
                placeholder="Task description (optional)"
              />
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    setCurrentListId(null);
                    setNewTask({ title: "", description: "" });
                  }}
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
                  Create Task
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