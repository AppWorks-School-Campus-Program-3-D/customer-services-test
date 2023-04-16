import React, { useState, useEffect } from 'react';

const ManagerDashboard = () => {
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const response = await fetch('/api/messages');
      const data = await response.json();
      setMessages(data);
    };

    fetchMessages();
  }, []);

  useEffect(() => {
    const newSocket = new WebSocket(`ws://localhost:4000/manager`);
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (socket) {
      socket.addEventListener('message', (event) => {
        const newMessage = JSON.parse(event.data);
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      });
    }
  }, [socket]);

  return (
    <div className="manager-dashboard">
      <h2>Manager Dashboard</h2>
      <ul>
        {messages.map((msg, index) => (
          <li key={index}>
            <strong>{msg.sender}:</strong> {msg.content}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ManagerDashboard;
