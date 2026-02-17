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
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [members, setMembers] = useState([]);
  const [memberEmail, setMemberEmail] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activities, setActivities] = useState([]);
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    if (id) {
      fetchBoardData();
      fetchActivityHistory();
    }
  }, [id]);

  const fetchBoardData = async () => {
    try {
      setLoading(true);
      
      // Fetch board details
      const boardRes = await API.get(`/boards/${id}`);
      setBoard(boardRes.data);
      setMembers(boardRes.data.members || []);

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
      
    } catch (error) {
      console.error("Error loading board:", error);
      toast.error("Failed to load board");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  // ========================
  // ACTIVITY HISTORY - FIXED LAYOUT
  // ========================
  const fetchActivityHistory = async (page = 1) => {
    try {
      const response = await API.get(`/boards/${id}/activity?page=${page}&limit=10`);
      if (page === 1) {
        setActivities(response.data.activities);
      } else {
        setActivities([...activities, ...response.data.activities]);
      }
      setHasMoreActivities(response.data.hasMore);
      setActivityPage(page);
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  };

  const loadMoreActivities = () => {
    if (hasMoreActivities) {
      fetchActivityHistory(activityPage + 1);
    }
  };

  const addActivity = (action) => {
    const newActivity = {
      action,
      timestamp: new Date().toISOString(),
      user: { name: "You" }
    };
    setActivities([newActivity, ...activities].slice(0, 20));
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
      const response = await API.post("/lists", {
        title: newListTitle,
        boardId: id,
        order: lists.length
      });
      
      setLists([...lists, response.data]);
      setTasks({ ...tasks, [response.data._id]: [] });
      setNewListTitle("");
      setShowListModal(false);
      
      addActivity(`Created list "${newListTitle}"`);
      toast.success("List created");
    } catch (error) {
      toast.error("Failed to create list");
    }
  };

  const deleteList = async (listId, listTitle) => {
    if (!window.confirm(`Delete list "${listTitle}" and all its tasks?`)) return;
    
    try {
      const response = await API.delete(`/lists/${listId}`);
      
      if (response.data.success) {
        setLists(lists.filter(l => l._id !== listId));
        const newTasks = { ...tasks };
        delete newTasks[listId];
        setTasks(newTasks);
        
        addActivity(`Deleted list "${listTitle}"`);
        toast.success("List deleted");
      }
    } catch (error) {
      toast.error("Failed to delete list");
    }
  };

  // ========================
  // TASK OPERATIONS (CREATE, UPDATE, DELETE)
  // ========================
  const createTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      toast.error("Task title is required");
      return;
    }
    if (!currentListId) return;

    try {
      const response = await API.post("/tasks", {
        title: newTask.title,
        description: newTask.description,
        listId: currentListId,
        boardId: id,
        order: tasks[currentListId]?.length || 0
      });
      
      setTasks(prev => ({
        ...prev,
        [currentListId]: [...(prev[currentListId] || []), response.data]
      }));
      
      setNewTask({ title: "", description: "" });
      setShowTaskModal(false);
      setCurrentListId(null);
      
      addActivity(`Created task "${newTask.title}"`);
      toast.success("Task created");
    } catch (error) {
      toast.error("Failed to create task");
    }
  };

  const updateTask = async (e) => {
    e.preventDefault();
    if (!editingTask.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    try {
      const response = await API.put(`/tasks/${editingTask._id}`, {
        title: editingTask.title,
        description: editingTask.description
      });
      
      setTasks(prev => ({
        ...prev,
        [editingTask.list]: prev[editingTask.list]?.map(t => 
          t._id === editingTask._id ? response.data : t
        )
      }));
      
      setShowEditModal(false);
      setEditingTask(null);
      
      addActivity(`Updated task "${response.data.title}"`);
      toast.success("Task updated");
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const deleteTask = async (taskId, listId, taskTitle) => {
    if (!window.confirm(`Delete task "${taskTitle}"?`)) return;
    
    try {
      await API.delete(`/tasks/${taskId}`);
      setTasks(prev => ({
        ...prev,
        [listId]: prev[listId]?.filter(t => t._id !== taskId)
      }));
      
      addActivity(`Deleted task "${taskTitle}"`);
      toast.success("Task deleted");
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  // ========================
  // ASSIGN USERS TO TASKS
  // ========================
  const assignUserToTask = async (taskId, listId, userId) => {
    try {
      const task = tasks[listId].find(t => t._id === taskId);
      const assignedTo = task.assignedTo || [];
      
      if (assignedTo.includes(userId)) {
        // Remove user
        await API.put(`/tasks/${taskId}`, {
          assignedTo: assignedTo.filter(id => id !== userId)
        });
      } else {
        // Add user
        await API.put(`/tasks/${taskId}`, {
          assignedTo: [...assignedTo, userId]
        });
      }
      
      // Refresh tasks
      fetchBoardData();
      addActivity(`Updated task assignment`);
    } catch (error) {
      toast.error("Failed to assign user");
    }
  };

  // ========================
  // MEMBER OPERATIONS
  // ========================
  const addMember = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim()) {
      toast.error("Email is required");
      return;
    }

    try {
      const response = await API.post(`/boards/${id}/members`, { email: memberEmail });
      setMembers([...members, response.data.member]);
      setMemberEmail("");
      
      addActivity(`Added member ${response.data.member.name}`);
      toast.success("Member added");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add member");
    }
  };

  const removeMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from board?`)) return;
    
    try {
      await API.delete(`/boards/${id}/members/${memberId}`);
      setMembers(members.filter(m => m._id !== memberId));
      
      addActivity(`Removed member ${memberName}`);
      toast.success("Member removed");
    } catch (error) {
      toast.error("Failed to remove member");
    }
  };

  // ========================
  // DRAG AND DROP
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
        addActivity(`Reordered lists`);
      } catch (error) {
        console.error("Failed to update list order:", error);
      }
      return;
    }

    // Handle task reordering
    const sourceListId = source.droppableId;
    const destListId = destination.droppableId;

    const sourceTasks = Array.from(tasks[sourceListId] || []);
    const destTasks = sourceListId === destListId ? sourceTasks : Array.from(tasks[destListId] || []);
    
    const [movedTask] = sourceTasks.splice(source.index, 1);
    const taskTitle = movedTask.title;
    
    destTasks.splice(destination.index, 0, {
      ...movedTask,
      list: destListId
    });

    if (sourceListId === destListId) {
      setTasks({
        ...tasks,
        [sourceListId]: destTasks.map((task, index) => ({ ...task, order: index }))
      });
    } else {
      setTasks({
        ...tasks,
        [sourceListId]: sourceTasks.map((task, index) => ({ ...task, order: index })),
        [destListId]: destTasks.map((task, index) => ({ ...task, order: index }))
      });
    }

    try {
      await API.put(`/tasks/${movedTask._id}`, {
        listId: destListId,
        order: destination.index
      });
      addActivity(`Moved task "${taskTitle}"`);
    } catch (error) {
      console.error("Failed to update task position:", error);
    }
  };

  // ========================
  // SEARCH FUNCTIONALITY
  // ========================
  const filteredTasks = (listId) => {
    if (!searchTerm) return tasks[listId] || [];
    return (tasks[listId] || []).filter(task =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
            {board?.title}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "6px 12px 6px 30px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                fontSize: "13px",
                width: "200px"
              }}
              placeholder="Search tasks..."
            />
            <span style={{ position: "absolute", left: "8px", top: "6px" }}>🔍</span>
          </div>

          {/* Members Button */}
          <button
            onClick={() => setShowMembersModal(true)}
            style={{
              background: "#4CAF50",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            👥 Members ({members.length})
          </button>
        </div>
      </div>

      {/* Main Content - Fixed Two-Column Layout */}
      <div style={{ 
        maxWidth: "1400px", 
        margin: "32px auto", 
        padding: "0 16px",
        display: "grid",
        gridTemplateColumns: "1fr 300px", // Fixed width for activity sidebar
        gap: "24px"
      }}>
        {/* Left Column - Lists (Takes remaining space) */}
        <div style={{ 
          minWidth: 0, // Prevents overflow
        }}>
          <DragDropContext onDragEnd={handleDragEnd}>
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
                          {/* List Header */}
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
                                {filteredTasks(list._id).length}
                              </span>
                              <button
                                onClick={() => deleteList(list._id, list.title)}
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

                          {/* Tasks */}
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
                                {filteredTasks(list._id).map((task, taskIndex) => (
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
                                        <div>
                                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                            <h4 style={{ fontWeight: "600", fontSize: "14px", color: "#333" }}>
                                              {task.title}
                                            </h4>
                                            <div>
                                              <button
                                                onClick={() => {
                                                  setEditingTask(task);
                                                  setShowEditModal(true);
                                                }}
                                                style={{
                                                  background: "none",
                                                  border: "none",
                                                  color: "#4CAF50",
                                                  marginRight: "8px",
                                                  cursor: "pointer",
                                                  fontSize: "14px"
                                                }}
                                              >
                                                ✏️
                                              </button>
                                              <button
                                                onClick={() => deleteTask(task._id, list._id, task.title)}
                                                style={{
                                                  background: "none",
                                                  border: "none",
                                                  color: "#f44336",
                                                  cursor: "pointer",
                                                  fontSize: "16px"
                                                }}
                                              >
                                                ×
                                              </button>
                                            </div>
                                          </div>
                                          {task.description && (
                                            <p style={{ fontSize: "12px", color: "#666" }}>
                                              {task.description}
                                            </p>
                                          )}
                                          {/* Assigned users avatars */}
                                          {task.assignedTo?.length > 0 && (
                                            <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
                                              {task.assignedTo.map((user, i) => (
                                                <span
                                                  key={i}
                                                  style={{
                                                    width: "24px",
                                                    height: "24px",
                                                    borderRadius: "50%",
                                                    background: "#4CAF50",
                                                    color: "white",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "10px"
                                                  }}
                                                >
                                                  {user.name?.[0] || 'U'}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                                {filteredTasks(list._id).length === 0 && (
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
          </DragDropContext>
        </div>

        {/* Right Column - Activity History (Fixed Width) */}
        <div style={{ 
          width: "300px",
          background: "white",
          borderRadius: "8px",
          padding: "20px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          height: "fit-content",
          maxHeight: "calc(100vh - 200px)",
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
              No activity yet
            </p>
          ) : (
            <>
              {activities.map((activity, index) => (
                <div
                  key={index}
                  style={{
                    padding: "10px",
                    borderBottom: "1px solid #f0f0f0",
                    fontSize: "12px"
                  }}
                >
                  <div style={{ fontWeight: "500", color: "#333" }}>
                    {activity.action}
                  </div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    color: "#999",
                    fontSize: "10px",
                    marginTop: "4px"
                  }}>
                    <span>{activity.user?.name || "You"}</span>
                    <span>{new Date(activity.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {hasMoreActivities && (
                <button
                  onClick={loadMoreActivities}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#f5f5f5",
                    border: "none",
                    borderRadius: "4px",
                    color: "#4CAF50",
                    cursor: "pointer",
                    marginTop: "10px"
                  }}
                >
                  Load More
                </button>
              )}
            </>
          )}
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

      {/* Edit Task Modal */}
      {showEditModal && editingTask && (
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
        }} onClick={() => setShowEditModal(false)}>
          <div style={{ 
            background: "white", 
            borderRadius: "8px", 
            maxWidth: "400px", 
            width: "90%", 
            padding: "24px" 
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Edit Task</h3>
            <form onSubmit={updateTask}>
              <input
                type="text"
                value={editingTask.title}
                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
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
                value={editingTask.description || ''}
                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
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
                  onClick={() => setShowEditModal(false)}
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
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && (
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
        }} onClick={() => setShowMembersModal(false)}>
          <div style={{ 
            background: "white", 
            borderRadius: "8px", 
            maxWidth: "400px", 
            width: "90%", 
            padding: "24px" 
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Board Members</h3>
            
            <div style={{ maxHeight: "200px", overflowY: "auto", marginBottom: "16px" }}>
              {members.map(member => (
                <div
                  key={member._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px",
                    borderBottom: "1px solid #eee"
                  }}
                >
                  <div>
                    <strong>{member.name}</strong>
                    <div style={{ fontSize: "12px", color: "#666" }}>{member.email}</div>
                  </div>
                  {member._id !== board?.owner && (
                    <button
                      onClick={() => removeMember(member._id, member.name)}
                      style={{
                        background: "#f44336",
                        color: "white",
                        border: "none",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={addMember}>
              <input
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  marginBottom: "8px"
                }}
                placeholder="Enter email to add member"
              />
              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Add Member
              </button>
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