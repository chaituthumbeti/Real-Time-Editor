import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer } from 'ws';
// @ts-ignore
import { setupWSConnection } from 'y-websocket/bin/utils';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));

const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

const wss = new WebSocketServer({ server });

wss.on('connection', (conn, req) => {
  // Get the room name from the URL the client is connecting to
  const roomName = req.url?.slice(1).split('?')[0];

  console.log(`Connection attempt to room: "${roomName}"`);

  setupWSConnection(conn, req, { docName: roomName });
});

server.listen(PORT, () => {
  console.log(`✅ Server is listening on port ${PORT}`);
});