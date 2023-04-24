const fs = require('fs')
const path = require('path')
const express = require('express')
const WebSocket = require('ws')
const cors = require('cors')
const multer = require('multer')
const multerS3 = require('multer-s3');
const {S3Client} = require('@aws-sdk/client-s3');

const app = express()
app.use(cors())

require('dotenv').config();

const REGION = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    contentLength: 5000000000000,
    contentDisposition: 'inline',
    key: function(req, file, cb) {
      const date = new Date()
          .toISOString()
          .replace(/[-T:\.Z]/g, '')
          .replace(/\d{3}$/, '');
      cb(null, `test/${date}-${file.originalname}`);
    },
  }),
});


const wss = new WebSocket.Server({ noServer: true })
const maxClients = 3
const maxQueue = 2
let queuedClients = []
let nonManagerClientsCount = 0

const messages = [] // Store messages here
const managerSockets = new Set() // Store manager WebSocket connections

app.use(express.static('public'))

const logErrors = (err, req, res, next) => {
  console.error(err.stack);
  next(err);
};

app.post('/api/1.0/upload', logErrors, upload.single('file'), (req, res) => {
  console.log(`File received: ${req.file.originalname}`);
  console.log(req.file.location);
  res.json({ filePath: req.file.location }); // Send the file URL in the response
});


app.get('/api/1.0/check_connection', (req, res) => {
  if (wss.clients.size < maxClients) {
    res.json({ canConnect: true })
  } else {
    res.json({ canConnect: false })
  }
})

const server = app.listen(4000, () => {
  console.log('Server listening on port 4000')
})

server.on('upgrade', (request, socket, head) => {
  const isManager = request.url === '/manager'

  if (isManager) {
    wss.handleUpgrade(request, socket, head, ws => {
      wss.emit('connection', ws, request)
    })
  } else if (nonManagerClientsCount < maxClients) {
    wss.handleUpgrade(request, socket, head, ws => {
      wss.emit('connection', ws, request)
    })
  } else if (queuedClients.length < maxQueue) {
    queuedClients.push({ request, socket, head })
  } else {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
    socket.destroy()
  }
})

wss.on('connection', (ws, req) => {
  if (req.url === '/manager') {
    console.log('Manager connected')
    managerSockets.add(ws)
  } else {
    console.log('Client connected')
    nonManagerClientsCount++
  }

  ws.on('message', message => {
    const messageObj = JSON.parse(message.toString('utf8'))
    console.log(
      `Message sender: ${messageObj.sender}, Message content: ${messageObj.content}`
    )

    if (messageObj.type === 'managerReply') {
      const targetClient = [...wss.clients].find(
        client => client !== ws && client.userName === messageObj.receiver
      )

      if (targetClient) {
        const replyMessage = {
          type: 'reply',
          sender: 'Manager',
          content: messageObj.content,
          imageURL: messageObj.imageURL
        }
        console.log(
          `Message sender: ${replyMessage.sender}, Message content: ${replyMessage.content}`
        )
        targetClient.send(JSON.stringify(replyMessage))
      }

      return
    }

    if (req.url === '/manager') {
      return
    }

    if (messageObj.sender) {
      ws.userName = messageObj.sender
    }
    const newMessage = {
      sender: messageObj.sender,
      content: messageObj.content,
      imageURL: messageObj.imageURL
    } // Add imageURL to the message object
    messages.push(newMessage)

    managerSockets.forEach(managerSocket => {
      if (managerSocket.readyState === WebSocket.OPEN) {
        managerSocket.send(JSON.stringify(newMessage))
      }
    })
  })

  ws.on('close', () => {
    console.log('Client disconnected')
    if (!managerSockets.has(ws)) {
      nonManagerClientsCount--
    }
    if (queuedClients.length > 0) {
      const nextClient = queuedClients.shift()
      wss.handleUpgrade(
        nextClient.request,
        nextClient.socket,
        nextClient.head,
        ws => {
          wss.emit('connection', ws, nextClient.request)
        }
      )
    }
  })
})

app.get('/api/1.0/messages', (req, res) => {
  res.json(messages)
})
