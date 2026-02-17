# 🚀 Real-Time Task Collaboration Platform

A full-stack Trello/Notion-like task management application with real-time updates, drag-and-drop functionality, and team collaboration features.

![Dashboard Screenshot](https://via.placeholder.com/800x400?text=Dashboard+Screenshot)

## ✨ Features

### ✅ User Authentication
- Secure signup/login with JWT tokens
- Password hashing with bcrypt
- Protected routes for authenticated users

### 📊 Board Management
- Create multiple boards for different projects
- Customize board backgrounds
- View all boards in dashboard

### 📋 List Management
- Create lists within boards (To Do, In Progress, Done)
- Drag and drop lists to reorder
- Delete lists with all tasks

### ✅ Task Management
- Create tasks with title and description
- Update task details
- Delete tasks
- Drag and drop tasks between lists
- Real-time sync across all users

### 👥 Team Collaboration
- Add members to boards by email
- View all board members
- Remove members from boards

### 🔄 Real-time Updates
- Live changes using Socket.IO
- Instant sync when tasks are created/updated/deleted
- See other users' actions in real-time

### 📈 Activity Tracking
- Complete activity history
- Timestamps for all actions
- Pagination to load more activities

### 🔍 Search & Filter
- Search tasks by title or description
- Real-time search filtering

## 🛠️ Tech Stack

### Frontend
- **React** - UI library
- **Vite** - Build tool
- **React Router** - Navigation
- **Axios** - HTTP client
- **Socket.IO Client** - Real-time updates
- **@hello-pangea/dnd** - Drag and drop
- **React Hot Toast** - Notifications

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Socket.IO** - Real-time communication
- **Bcrypt** - Password hashing

### Deployment
- **Frontend:** Netlify
- **Backend:** Render
- **Database:** MongoDB Atlas

## 🌐 Live Demo

| Component | URL |
|-----------|-----|
| **Frontend** | `https://your-site-name.netlify.app` |
| **Backend API** | `https://realtime-task-platform.onrender.com` |
| **Demo Credentials** | `raj@gmail.com` / `123456` |

## 🚀 Local Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account (or local MongoDB)
- npm or yarn
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/realtime-task-platform.git
cd realtime-task-platform
