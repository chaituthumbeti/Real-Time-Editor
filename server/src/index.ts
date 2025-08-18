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
  setupWSConnection(conn, req);
});

server.listen(PORT, () => {
  console.log(`✅ Server is listening on port ${PORT}`);
});