import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
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
  
  // Activity History States
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (id) {
      console.log("Board ID from URL:", id);
      fetchBoardData();
    }
  }, [id]);

  const fetchBoardData = async () => {
    try {
      setLoading(true);
      
      // Fetch board details
      const boardRes = await API.get(`/boards/${id}`);
      setBoard(boardRes.data);

      // Fetch lists
      const listsRes = await API.get(`/lists/board/${id}`);
      setLists(listsRes.data.sort((a, b) => a.order - b.order));

      // Fetch tasks for each list
      const tasksData = {};
      await Promise.all(listsRes.data.map(async (list) => {
        try {
          const tasksRes = await API.get(`/tasks/list/${list._id}`);
          tasksData[list._id] = tasksRes.data.sort((a, b) => a.order - b.order);
        } catch {
          tasksData[list._id] = [];
        }
      }));
      setTasks(tasksData);
      
      // Add initial activity
      addActivity("Opened board");
      
    } catch (error) {
      console.error("Error loading board:", error);
      toast.error("Failed to load board");
    } finally {
      setLoading(false);
    }
  };

  // ========================
  // ACTIVITY HISTORY FUNCTIONS
  // ========================
  const addActivity = (action) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newActivity = {
      id: Date.now(),
      action: action,
      time: timeString,
      timestamp: now
    };
    
    setActivities(prev => [newActivity, ...prev].slice(0, 20));
  };

  // ========================
  // LIST OPERATIONS
  // ========================
  const createList = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim()) {
      toast.error("List title is required");
      return;
    }

    try {
      console.log("Creating list:", newListTitle);
      const response = await API.post("/lists", {
        title: newListTitle,
        boardId: id,
        order: lists.length
      });
      
      console.log("List created:", response.data);
      setLists([...lists, response.data]);
      setTasks({ ...tasks, [response.data._id]: [] });
      setNewListTitle("");
      setShowListModal(false);
      
      addActivity(`✅ Created list: "${newListTitle}"`);
      toast.success("List created");
    } catch (error) {
      console.error("Error creating list:", error);
      toast.error("Failed to create list");
    }
  };

  // ========================
  // FIXED DELETE LIST FUNCTION
  // ========================
  const deleteList = async (listId, listTitle) => {
    if (!window.confirm(`Delete list "${listTitle}" and all its tasks?`)) return;
    
    try {
      console.log("🗑️ Deleting list with ID:", listId);
      
      const response = await API.delete(`/lists/${listId}`);
      console.log("Delete response:", response.data);
      
      if (response.data.success) {
        // Remove from UI
        setLists(lists.filter(l => l._id !== listId));
        
        // Remove tasks for this list
        const newTasks = { ...tasks };
        delete newTasks[listId];
        setTasks(newTasks);
        
        addActivity(`❌ Deleted list: "${listTitle}"`);
        toast.success("List deleted successfully");
      }
    } catch (error) {
      console.error("Delete list error:", error);
      toast.error(error.response?.data?.message || "Failed to delete list");
    }
  };

  // ========================
  // TASK OPERATIONS
  // ========================
  const createTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      toast.error("Task title is required");
      return;
    }
    if (!currentListId) return;

    try {
      console.log("Creating task:", newTask);
      const response = await API.post("/tasks", {
        title: newTask.title,
        description: newTask.description,
        listId: currentListId,
        boardId: id,
        order: tasks[currentListId]?.length || 0
      });
      
      console.log("Task created:", response.data);
      setTasks(prev => ({
        ...prev,
        [currentListId]: [...(prev[currentListId] || []), response.data]
      }));
      
      setNewTask({ title: "", description: "" });
      setShowTaskModal(false);
      setCurrentListId(null);
      
      addActivity(`📝 Created task: "${newTask.title}"`);
      toast.success("Task created");
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    }
  };

  const deleteTask = async (taskId, listId, taskTitle) => {
    if (!window.confirm(`Delete task "${taskTitle}"?`)) return;
    
    try {
      console.log("Deleting task:", taskId);
      await API.delete(`/tasks/${taskId}`);
      setTasks(prev => ({
        ...prev,
        [listId]: prev[listId]?.filter(t => t._id !== taskId)
      }));
      
      addActivity(`🗑️ Deleted task: "${taskTitle}"`);
      toast.success("Task deleted");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  // ========================
  // DRAG AND DROP HANDLER
  // ========================
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

    // Handle list reordering
    if (type === 'list') {
      const newLists = Array.from(lists);
      const [removed] = newLists.splice(source.index, 1);
      newLists.splice(destination.index, 0, removed);

      const updatedLists = newLists.map((list, index) => ({
        ...list,
        order: index
      }));
      setLists(updatedLists);

      try {
        await API.put(`/lists/${removed._id}`, { order: destination.index });
        addActivity(`🔄 Reordered lists`);
      } catch (error) {
        console.error("Failed to update list order:", error);
      }
      return;
    }

    // Handle task reordering (within same list or between lists)
    const sourceListId = source.droppableId;
    const destListId = destination.droppableId;
    const taskId = result.draggableId;

    // Get the task being moved
    const sourceTasks = Array.from(tasks[sourceListId] || []);
    const [movedTask] = sourceTasks.splice(source.index, 1);
    const taskTitle = movedTask.title;

    // If moving to same list
    if (sourceListId === destListId) {
      sourceTasks.splice(destination.index, 0, movedTask);
      setTasks({
        ...tasks,
        [sourceListId]: sourceTasks.map((task, index) => ({ ...task, order: index }))
      });
    } 
    // If moving to different list
    else {
      const destTasks = Array.from(tasks[destListId] || []);
      destTasks.splice(destination.index, 0, { ...movedTask, list: destListId });
      
      setTasks({
        ...tasks,
        [sourceListId]: sourceTasks.map((task, index) => ({ ...task, order: index })),
        [destListId]: destTasks.map((task, index) => ({ ...task, order: index }))
      });
    }

    // Update in backend
    try {
      await API.put(`/tasks/${movedTask._id}`, {
        listId: destListId,
        order: destination.index
      });
      addActivity(`🔄 Moved task: "${taskTitle}"`);
    } catch (error) {
      console.error("Failed to update task position:", error);
    }
  };

  // ========================
  // RENDER
  // ========================
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
              cursor: "pointer"
            }}
          >
            ← Back
          </button>
          <span style={{ fontSize: "20px", fontWeight: "bold", color: "#4CAF50" }}>
            {board?.title || "Board"}
          </span>
        </div>
      </div>

      {/* Drag and Drop Context */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ 
          maxWidth: "1400px", 
          margin: "32px auto", 
          padding: "0 16px",
          display: "flex",
          gap: "24px"
        }}>
          {/* Left Column - Lists */}
          <div style={{ flex: 3 }}>
            <Droppable droppableId="all-lists" direction="horizontal" type="list">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{ 
                    display: "flex", 
                    gap: "20px", 
                    overflowX: "auto",
                    padding: "8px 0 16px",
                    minHeight: "500px"
                  }}
                >
                  {lists.map((list, index) => (
                    <Draggable key={list._id} draggableId={list._id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          style={{
                            background: "white",
                            borderRadius: "8px",
                            width: "300px",
                            flexShrink: 0,
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                            display: "flex",
                            flexDirection: "column",
                            maxHeight: "calc(100vh - 200px)",
                            ...provided.draggableProps.style
                          }}
                        >
                          {/* List Header with Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            style={{
                              padding: "16px",
                              borderBottom: "1px solid #eee",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: "#f8f9fa",
                              cursor: "grab"
                            }}
                          >
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
                                onClick={() => deleteList(list._id, list.title)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#f44336",
                                  fontSize: "18px",
                                  cursor: "pointer",
                                  padding: "0 4px",
                                  fontWeight: "bold"
                                }}
                                title="Delete list"
                              >
                                ×
                              </button>
                            </div>
                          </div>

                          {/* Tasks Container with Droppable */}
                          <Droppable droppableId={list._id} type="task">
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                style={{
                                  padding: "12px",
                                  overflowY: "auto",
                                  flex: 1,
                                  minHeight: "200px"
                                }}
                              >
                                {tasks[list._id]?.map((task, taskIndex) => (
                                  <Draggable
                                    key={task._id}
                                    draggableId={task._id}
                                    index={taskIndex}
                                  >
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        style={{
                                          background: "#f9f9f9",
                                          padding: "12px",
                                          borderRadius: "6px",
                                          marginBottom: "8px",
                                          border: "1px solid #eee",
                                          cursor: "grab",
                                          ...provided.draggableProps.style
                                        }}
                                      >
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                          <h4 style={{ fontWeight: "600", fontSize: "14px", color: "#333" }}>
                                            {task.title}
                                          </h4>
                                          <button
                                            onClick={() => deleteTask(task._id, list._id, task.title)}
                                            style={{
                                              background: "none",
                                              border: "none",
                                              color: "#f44336",
                                              cursor: "pointer",
                                              fontSize: "16px",
                                              fontWeight: "bold"
                                            }}
                                            title="Delete task"
                                          >
                                            ×
                                          </button>
                                        </div>
                                        {task.description && (
                                          <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                                            {task.description}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                                {(!tasks[list._id] || tasks[list._id].length === 0) && (
                                  <p style={{ textAlign: "center", color: "#999", fontSize: "13px", padding: "20px 0" }}>
                                    No tasks yet
                                  </p>
                                )}
                              </div>
                            )}
                          </Droppable>

                          {/* Add Task Button */}
                          <div style={{ padding: "12px", borderTop: "1px solid #eee" }}>
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
                              + Add task
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

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
                      gap: "4px",
                      height: "fit-content"
                    }}
                  >
                    + Add list
                  </button>
                </div>
              )}
            </Droppable>
          </div>

          {/* Right Column - Activity History */}
          <div style={{ 
            flex: 1,
            background: "white",
            borderRadius: "8px",
            padding: "20px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            height: "fit-content",
            maxHeight: "500px",
            overflowY: "auto",
            position: "sticky",
            top: "20px"
          }}>
            <h3 style={{ 
              marginBottom: "16px", 
              color: "#333",
              borderBottom: "2px solid #4CAF50",
              paddingBottom: "8px",
              fontSize: "16px",
              fontWeight: "600"
            }}>
              Activity History
            </h3>
            
            {activities.length === 0 ? (
              <p style={{ color: "#999", textAlign: "center", padding: "20px" }}>
                No activity yet. Create lists and tasks to see activity!
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    style={{
                      padding: "10px",
                      background: "#f8f9fa",
                      borderRadius: "4px",
                      borderLeft: "3px solid #4CAF50"
                    }}
                  >
                    <div style={{ fontWeight: "500", fontSize: "13px", color: "#333" }}>
                      {activity.action}
                    </div>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      fontSize: "11px",
                      color: "#999",
                      marginTop: "4px"
                    }}>
                      <span>You</span>
                      <span>{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DragDropContext>

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
                  marginBottom: "16px",
                  border: "1px solid #ddd",
                  borderRadius: "4px"
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
                    cursor: "pointer"
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
                    cursor: "pointer"
                  }}
                >
                  Create
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
                  marginBottom: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px"
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
                  marginBottom: "16px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  minHeight: "80px"
                }}
                placeholder="Description (optional)"
              />
              <div style={{ display: "flex", gap: "12px" }}>
                <button 
                  type="button" 
                  onClick={() => setShowTaskModal(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    border: "1px solid #ddd",
                    background: "white",
                    borderRadius: "4px",
                    cursor: "pointer"
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
                    cursor: "pointer"
                  }}
                >
                  Create
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