import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to your Render backend
    const socketConnection = io('https://realtime-task-platform.onrender.com', {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    setSocket(socketConnection);

    socketConnection.on('connect', () => {
      console.log('🔌 Socket connected:', socketConnection.id);
    });

    socketConnection.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    return () => {
      socketConnection.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};