import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import '../styles/Client.css'

const Client = () => {
  const [userName, setUserName] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [message, setMessage] = useState('')
  const [socket, setSocket] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [messages, setMessages] = useState([])
  const [showMessages, setShowMessages] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const fileInputRef = useRef()

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

  const handleImageChange = e => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImageFile({ data: reader.result, name: file.name })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSendMessage = async e => {
    e.preventDefault()
    if (socket && (message || imageFile)) {
      const msgToSend = {
        type: 'clientMessage',
        sender: userName,
        content: message,
        imageURL: null
      }

      if (imageFile) {
        const formData = new FormData()
        formData.append('file', new File([imageFile], imageFile.name))

        const { data } = await axios.post(
          'http://localhost:4000/upload',
          formData
        )
        msgToSend.imageURL = data.filePath
      }

      socket.send(JSON.stringify(msgToSend))
      setMessage('')
      setImageFile(null)
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
              const serverMessage = JSON.parse(event.data)
              if (serverMessage.type === 'error') {
                setErrorMessage(serverMessage.content)
                newSocket.close()
              } else if (
                serverMessage.type === 'reply' ||
                !serverMessage.type ||
                serverMessage.sender === 'Manager'
              ) {
                setMessages(prevMessages => [...prevMessages, serverMessage])
              }
            })

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

  const toggleMessages = () => {
    setShowMessages(prevShowMessages => !prevShowMessages)
  }

  return (
    <div className='client'>
      <button className='message-icon' onClick={toggleMessages}>
        <img src='/chat.png' alt='chat' />
      </button>
      {showMessages && (
        <div className='message-box'>
          {!isLoggedIn ? (
            <div className='login-container'>
              <form onSubmit={handleLogin} className='login-form'>
                <label htmlFor='userName'>請輸入您的大名：</label>
                <input
                  type='text'
                  id='userName'
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder='Erin'
                  className='username-input'
                  required
                />
                <button
                  type='submit'
                  className='login-button'
                >
                  開始詢問
                </button>
              </form>
            </div>
          ) : errorMessage ? (
            <div>{errorMessage}</div>
          ) : (
            <>
              <div className='message-box-top'>
                <div className='username-display'>{userName}</div>
                <div className='close-button-wrapper'>
                  <button onClick={handleLogout}>
                    <img
                      src='/wrong.png'
                      alt='close'
                      className='close-button'
                    />
                  </button>
                </div>
              </div>
              <div className='client-messages'>
                <ul>
                  {messages.map((msg, index) => (
                    <li
                      key={index}
                      className={msg.sender === userName ? 'sent' : 'received'}
                    >
                      {msg.content ? (
                        msg.content
                      ) : (
                        <img
                          src={`${msg.imageURL}`}
                          alt='Uploaded content'
                          style={{ maxWidth: '100px', maxHeight: '100px' }}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <form onSubmit={handleSendMessage} className='message-container'>
                <input
                  type='text'
                  id='message'
                  value={message}
                  onChange={handleMessageChange}
                  placeholder='Say something...'
                  className='message-input'
                />
                <input
                  type='file'
                  id='image'
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
                <button
                  type='button'
                  onClick={() => fileInputRef.current.click()}
                  className='file-button'
                >
                  <img src='/clip.png' alt='Upload' />
                </button>
                <button type='submit' className='send-button'>
                  <img src='/send.png' alt='Send' />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default Client
