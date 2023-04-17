import React, { useState, useEffect, useRef } from 'react';
import '../styles/ManagerDashboard.css';

const ManagerDashboard = () => {
  const [messages, setMessages] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [reply, setReply] = useState('');
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

  const handleReplyChange = (e) => {
    setReply(e.target.value);
  };

  const handleReply = (e) => {
    e.preventDefault();
    if (selectedUser && reply) {
      const replyMessage = {
        sender: 'Manager',
        content: reply,
      };

      setMessages((prevMessages) => {
        const userMessages = prevMessages[selectedUser] || [];
        return {
          ...prevMessages,
          [selectedUser]: [...userMessages, replyMessage],
        };
      });

      socket.current.send(
        JSON.stringify({
          type: 'managerReply',
          receiver: selectedUser,
          content: reply,
        }),
      );
      setReply('');
    }
  };

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
                <li key={index}>
                  <strong>{msg.sender}:</strong> {msg.content}
                </li>
              ))}
            </ul>
            <form onSubmit={handleReply}>
              <label htmlFor="reply">Reply:</label>
              <input
                type="text"
                id="reply"
                value={reply}
                onChange={handleReplyChange}
              />
              <button type="submit">Send</button>
            </form>
          </div>
        ) : (
          <p>Select a user to see their messages and reply</p>
        )}
      </div>
    </div>
  );
};

export default ManagerDashboard;
