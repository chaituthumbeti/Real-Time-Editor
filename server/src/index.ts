import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer } from 'ws';
// @ts-ignore
import { setupWSConnection } from 'y-websocket/bin/utils';
import axios from 'axios'; 
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

app.get('/health', (req, res) => {
  res.send('Server is healthy and awake!');
});

app.post('/execute', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).send('No code provided.');
  }

  const options = {
    method: 'POST',
    url: 'https://judge0-ce.p.rapidapi.com/submissions',
    params: { base64_encoded: 'false', fields: '*' },
    headers: {
      'content-type': 'application/json',
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
    },
    data: {
      language_id: 63,
      source_code: code,
    }
  };

  try {
    const response = await axios.request(options);
    const token = response.data.token;

    setTimeout(async () => {
      try {
        const resultResponse = await axios.get(`https://judge0-ce.p.rapidapi.com/submissions/${token}`, {
          headers: {
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
          }
        });
        res.send(resultResponse.data);
      } catch (error) {
        console.error('Error getting execution result:', error);
        res.status(500).send('Error getting execution result.');
      }
    }, 2000); 

  } catch (error) {
    console.error('Error submitting to Judge0:', error);
    res.status(500).send('Error executing code.');
  }
});

const wss = new WebSocketServer({ server });

wss.on('connection', (conn, req) => {
  const roomName = req.url?.slice(1).split('?')[0];
  console.log(`Connection attempt to room: "${roomName}"`);
  setupWSConnection(conn, req, { docName: roomName });
});

server.listen(PORT, () => {
  console.log(`✅ Server is listening on port ${PORT}`);
});