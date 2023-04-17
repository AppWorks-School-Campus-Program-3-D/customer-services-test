import React, { useState, useEffect } from 'react'

const Client = () => {
  const [userName, setUserName] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [message, setMessage] = useState('')
  const [socket, setSocket] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [messages, setMessages] = useState([])

  const handleLogin = e => {
    e.preventDefault()
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    if (socket) {
      socket.close()
    }
    setIsLoggedIn(false)
    setUserName('')
  }

  const handleMessageChange = e => {
    setMessage(e.target.value)
  }

  const handleSendMessage = e => {
    e.preventDefault()
    if (socket && message) {
      const msgToSend = {
        sender: userName,
        content: message
      }
      socket.send(JSON.stringify(msgToSend))
      setMessage('')
      setMessages(prevMessages => [...prevMessages, msgToSend])
    }
  }

  useEffect(() => {
    if (isLoggedIn) {
      const checkConnection = async () => {
        try {
          const response = await fetch(
            'http://localhost:4000/api/check_connection'
          )
          const data = await response.json()

          if (data.canConnect) {
            const newSocket = new WebSocket(`ws://localhost:4000`)

            newSocket.addEventListener('message', event => {
              const serverMessage = JSON.parse(event.data);
              if (serverMessage.type === 'error') {
                setErrorMessage(serverMessage.content);
                newSocket.close();
              } else if (serverMessage.type === 'reply' || !serverMessage.type || serverMessage.sender === 'Manager') {
                setMessages(prevMessages => [...prevMessages, serverMessage]);
              }
            });
            

            setSocket(newSocket)

            return () => {
              newSocket.close()
            }
          } else {
            setErrorMessage('sorry, reaching max client number')
          }
        } catch (error) {
          console.error('Error checking connection:', error)
        }
      }

      checkConnection()
    }
  }, [isLoggedIn])

  return (
    <div className='client'>
      {!isLoggedIn ? (
        <form onSubmit={handleLogin}>
          <label htmlFor='userName'>User Name:</label>
          <input
            type='text'
            id='userName'
            value={userName}
            onChange={e => setUserName(e.target.value)}
            required
          />
          <button type='submit'>Login</button>
        </form>
      ) : errorMessage ? (
        <div>{errorMessage}</div>
      ) : (
        <>
          <form onSubmit={handleSendMessage}>
            <label htmlFor='message'>Message:</label>
            <input
              type='text'
              id='message'
              value={message}
              onChange={handleMessageChange}
            />
            <button type='submit'>Send</button>
          </form>
          <button onClick={handleLogout}>Logout</button>
          <div className='client-messages'>
            <h3>Messages</h3>
            <ul>
              {messages.map((msg, index) => (
                <li key={index}>
                  <strong>{msg.sender}:</strong> {msg.content}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

export default Client
