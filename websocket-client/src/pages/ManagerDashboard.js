import React, { useState, useEffect, useRef } from 'react';
import '../styles/ManagerDashboard.css'

const ManagerDashboard = () => {
  const [messages, setMessages] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const socket = useRef(null);

  useEffect(() => {
    socket.current = new WebSocket('ws://localhost:4000/manager');

    socket.current.onmessage = (event) => {
      const newMessage = JSON.parse(event.data);
      setMessages((prevMessages) => {
        const userMessages = prevMessages[newMessage.sender] || [];
        return {
          ...prevMessages,
          [newMessage.sender]: [...userMessages, newMessage],
        };
      });
    };

    return () => {
      socket.current.close();
    };
  }, []);

  const userList = Object.keys(messages);

  return (
    <div className="manager-dashboard">
      <div className="user-list">
        <h3>Users</h3>
        <ul>
          {userList.map((user) => (
            <li key={user} onClick={() => setSelectedUser(user)}>
              {user}
            </li>
          ))}
        </ul>
      </div>
      <div className="messages">
        <h3>Messages</h3>
        {selectedUser ? (
          <div>
            <h4>{selectedUser}:</h4>
            <ul>
              {messages[selectedUser].map((msg, index) => (
                <li key={index}>{msg.content}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p>Select a user to see their messages</p>
        )}
      </div>
    </div>
  );
};

export default ManagerDashboard;
