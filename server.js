const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());
const upload = multer({ dest: 'uploads/' });

const wss = new WebSocket.Server({ noServer: true });
const maxClients = 2;
const maxQueue = 2;
let queuedClients = [];

const messages = []; // Store messages here
const managerSockets = new Set(); // Store manager WebSocket connections

app.use(express.static('public'));

app.post('/upload', upload.single('file'), (req, res) => {
  console.log(`File received: ${req.file.originalname}`);
  res.sendStatus(200);
});

app.get('/api/check_connection', (req, res) => {
  if (wss.clients.size < maxClients) {
    res.json({ canConnect: true });
  } else {
    res.json({ canConnect: false });
  }
});

const server = app.listen(4000, () => {
  console.log('Server listening on port 4000');
});

server.on('upgrade', (request, socket, head) => {
  const isManager = request.url === '/manager';
  
  // Calculate the number of non-manager clients
  let nonManagerClients = 0;
  wss.clients.forEach(client => {
    if (!managerSockets.has(client)) {
      nonManagerClients++;
    }
  });

  if (isManager) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else if (nonManagerClients < maxClients) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else if (queuedClients.length < maxQueue) {
    queuedClients.push({ request, socket, head });
  } else {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
  }
});

wss.on('connection', (ws, req) => {
  if (req.url === '/manager') {
    console.log('Manager connected');
    managerSockets.add(ws);
  } else {
    console.log('Client connected');
  }

  ws.on('message', (message) => {
    const messageObj = JSON.parse(message.toString('utf8'));
    console.log(`Message sender: ${messageObj.sender}, Message content: ${messageObj.content}`);

    if (messageObj.type === 'managerReply') {
      const targetClient = [...wss.clients].find(
        (client) => client !== ws && client.userName === messageObj.receiver
      );
    
      if (targetClient) {
        const replyMessage = { type: 'reply', sender: 'Manager', content: messageObj.content };
        console.log(`Message sender: ${replyMessage.sender}, Message content: ${replyMessage.content}`);
        targetClient.send(JSON.stringify(replyMessage));
      }
    
      return;
    }
    
    if (req.url === '/manager') {
      return;
    }

    if (messageObj.sender) {
      ws.userName = messageObj.sender;
    }
    const newMessage = { sender: messageObj.sender, content: messageObj.content };
    messages.push(newMessage);

    managerSockets.forEach((managerSocket) => {
      if (managerSocket.readyState === WebSocket.OPEN) {
        managerSocket.send(JSON.stringify(newMessage));
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (queuedClients.length > 0) {
      const nextClient = queuedClients.shift();
      wss.handleUpgrade(
        nextClient.request,
        nextClient.socket,
        nextClient.head,
        (ws) => {
          wss.emit('connection', ws, nextClient.request);
        }
      );
    }
  });
});

app.get('/api/messages', (req, res) => {
  res.json(messages);
});
