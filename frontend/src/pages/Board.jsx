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
  
  // Edit Task States
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  
  // Activity History States
  const [activities, setActivities] = useState([]);
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);

  useEffect(() => {
    fetchBoardData();
    fetchActivityHistory();
  }, [id]);

  const fetchBoardData = async () => {
    try {
      setLoading(true);
      
      const boardRes = await API.get(`/boards/${id}`);
      setBoard(boardRes.data);

      const listsRes = await API.get(`/lists/board/${id}`);
      setLists(listsRes.data.sort((a, b) => a.order - b.order));

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
      toast.error("Failed to load board");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  // ========================
  // ACTIVITY HISTORY
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
      console.error("Failed to fetch activities:", error);
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
      user: "Current User"
    };
    setActivities([newActivity, ...activities]);
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
    if (!window.confirm("Delete this list and all its tasks?")) return;
    
    try {
      await API.delete(`/lists/${listId}`);
      setLists(lists.filter(l => l._id !== listId));
      const newTasks = { ...tasks };
      delete newTasks[listId];
      setTasks(newTasks);
      
      addActivity(`Deleted list "${listTitle}"`);
      toast.success("List deleted");
    } catch (error) {
      toast.error("Failed to delete list");
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

  // ========================
  // UPDATE TASK - ADDED
  // ========================
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
      
      setShowEditTaskModal(false);
      setEditingTask(null);
      
      addActivity(`Updated task "${response.data.title}"`);
      toast.success("Task updated");
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const deleteTask = async (taskId, listId, taskTitle) => {
    if (!window.confirm("Delete this task?")) return;
    
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
  // DRAG AND DROP
  // ========================
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

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

    const sourceListId = source.droppableId;
    const destListId = destination.droppableId;
    const taskId = result.draggableId;

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
      </div>

      {/* Main Content - Two Columns */}
      <div style={{ 
        maxWidth: "1400px", 
        margin: "32px auto", 
        padding: "0 16px",
        display: "flex",
        gap: "24px"
      }}>
        {/* Left Column - Lists */}
        <div style={{ flex: 3 }}>
          <DragDropContext onDragEnd={handleDragEnd}>
            <div style={{ overflowX: "auto" }}>
              <Droppable droppableId="all-lists" direction="horizontal" type="list">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{ 
                      display: "flex", 
                      gap: "20px", 
                      padding: "8px 0 16px"
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
                                cursor: "grab",
                                background: "#f8f9fa"
                              }}
                            >
                              <h3>{list.title}</h3>
                              <button
                                onClick={() => deleteList(list._id, list.title)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#f44336",
                                  fontSize: "18px",
                                  cursor: "pointer"
                                }}
                              >
                                ×
                              </button>
                            </div>

                            {/* Tasks */}
                            <Droppable droppableId={list._id} type="task">
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  style={{
                                    padding: "12px",
                                    minHeight: "100px"
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
                                          <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                              <h4 style={{ fontWeight: "600" }}>{task.title}</h4>
                                              <div>
                                                {/* Edit Task Button */}
                                                <button
                                                  onClick={() => {
                                                    setEditingTask(task);
                                                    setShowEditTaskModal(true);
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
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
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
                                  background: "none",
                                  border: "none",
                                  color: "#666",
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
                        padding: "16px",
                        color: "#666",
                        cursor: "pointer"
                      }}
                    >
                      + Add list
                    </button>
                  </div>
                )}
              </Droppable>
            </div>
          </DragDropContext>
        </div>

        {/* Right Column - Activity History */}
        <div style={{ 
          flex: 1,
          background: "white",
          borderRadius: "8px",
          padding: "20px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          height: "fit-content",
          maxHeight: "600px",
          overflowY: "auto"
        }}>
          <h3 style={{ 
            marginBottom: "16px", 
            color: "#333",
            borderBottom: "2px solid #4CAF50",
            paddingBottom: "8px"
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
                    padding: "12px",
                    borderBottom: "1px solid #eee",
                    fontSize: "13px"
                  }}
                >
                  <div style={{ fontWeight: "500", marginBottom: "4px" }}>
                    {activity.action}
                  </div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    color: "#999",
                    fontSize: "11px"
                  }}>
                    <span>{activity.user || "User"}</span>
                    <span>
                      {new Date(activity.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
              
              {hasMoreActivities && (
                <button
                  onClick={loadMoreActivities}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "#f5f5f5",
                    border: "none",
                    borderRadius: "4px",
                    color: "#4CAF50",
                    cursor: "pointer",
                    marginTop: "12px",
                    fontWeight: "500"
                  }}
                >
                  Load More Activities
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
            <h3>Create New List</h3>
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
                <button type="button" onClick={() => setShowListModal(false)}>Cancel</button>
                <button type="submit">Create</button>
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
            <h3>Create New Task</h3>
            <form onSubmit={createTask}>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Task title"
                style={{
                  width: "100%",
                  padding: "10px",
                  marginBottom: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px"
                }}
                autoFocus
              />
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Description"
                style={{
                  width: "100%",
                  padding: "10px",
                  marginBottom: "16px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  minHeight: "80px"
                }}
              />
              <div style={{ display: "flex", gap: "12px" }}>
                <button type="button" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditTaskModal && editingTask && (
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
        }} onClick={() => setShowEditTaskModal(false)}>
          <div style={{ 
            background: "white", 
            borderRadius: "8px", 
            maxWidth: "400px", 
            width: "90%", 
            padding: "24px" 
          }} onClick={e => e.stopPropagation()}>
            <h3>Edit Task</h3>
            <form onSubmit={updateTask}>
              <input
                type="text"
                value={editingTask.title}
                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                placeholder="Task title"
                style={{
                  width: "100%",
                  padding: "10px",
                  marginBottom: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px"
                }}
                autoFocus
              />
              <textarea
                value={editingTask.description || ''}
                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                placeholder="Description"
                style={{
                  width: "100%",
                  padding: "10px",
                  marginBottom: "16px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  minHeight: "80px"
                }}
              />
              <div style={{ display: "flex", gap: "12px" }}>
                <button type="button" onClick={() => setShowEditTaskModal(false)}>Cancel</button>
                <button type="submit">Update Task</button>
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