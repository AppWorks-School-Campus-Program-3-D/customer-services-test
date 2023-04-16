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
  if (wss.clients.size < maxClients) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else if (queuedClients.length < maxQueue) {
    queuedClients.push({ request, socket, head });
  } else {
    ws.send(JSON.stringify({ type: 'error', content: 'sorry, reaching max client number' }));
    ws.close();
    socket.destroy();
  }
});

wss.on('connection', (ws, req) => {
  if (req.url === '/manager') {
    console.log('Manager connected');
    managerSockets.add(ws);
    ws.on('close', () => {
      managerSockets.delete(ws);
    });
    return;
  }

  console.log('Client connected');

  ws.on('message', (message) => {
    console.log(message);
    const messageStr = JSON.parse(message.toString('utf8'));
    console.log(messageStr);
    console.log(`Message sender: ${messageStr.sender}, Message content: ${messageStr.content}`);

    // Store the message with a sender (for simplicity, we use a generic sender name)
    const newMessage = { sender: messageStr.sender, content: messageStr.content };
    messages.push(newMessage);

    // Send the message to manager WebSocket connections only
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