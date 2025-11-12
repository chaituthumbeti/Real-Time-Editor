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
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

app.get('/health', (req, res) => {
  res.send('Server is healthy and awake!');
});

const LANGUAGE_IDS: Record<string, number> = {
  javascript: 63,
  js: 63,
  python: 71,
  py: 71,
  cpp: 54,
  'c++': 54,
  c: 50,
  java: 62,
};

function getLanguageId(lang: string): number {
  const normalized = (lang || '').toLowerCase().trim();
  return LANGUAGE_IDS[normalized] || 63; // default to JavaScript
}

// REST API endpoint for execution (using Judge0)
app.post('/execute', async (req, res) => {
  console.log('[Judge0] POST /execute received:', {
    hasCode: !!req.body.code,
    language: req.body.language,
  });

  const { code, language, stdin } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'No code provided.' });
  }

  const languageId = getLanguageId(language);
  const rapidApiKey = process.env.RAPIDAPI_KEY;

  if (!rapidApiKey) {
    return res.status(500).json({ error: 'RAPIDAPI_KEY not configured' });
  }

  try {
    console.log(`[Judge0] Submitting code (languageId: ${languageId})...`);

    // Step 1: Submit code to Judge0
    const submitResponse = await axios.post(
      'https://judge0-ce.p.rapidapi.com/submissions',
      {
        language_id: languageId,
        source_code: code,
        stdin: stdin || '',
      },
      {
        headers: {
          'content-type': 'application/json',
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        },
        timeout: 10000,
      }
    );

    const token = submitResponse.data.token;
    console.log(`[Judge0] Submission token: ${token}`);

    // Step 2: Poll for result
    let result = null;
    let attempts = 0;
    const maxAttempts = 30; // ~30 seconds with 1s delays

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

      const statusResponse = await axios.get(
        `https://judge0-ce.p.rapidapi.com/submissions/${token}`,
        {
          headers: {
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          },
        }
      );

      result = statusResponse.data;

      if (result.status.id > 2) {
        // Status > 2 means execution finished
        console.log(`[Judge0] Execution completed with status: ${result.status.description}`);
        break;
      }

      attempts++;
    }

    if (!result || result.status.id <= 2) {
      return res.status(408).json({ error: 'Execution timeout' });
    }

    // Step 3: Return result
    const response = {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      compile_output: result.compile_output || '',
      exit_code: result.exit_code || 0,
    };

    res.json(response);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Judge0] Execution error:', errorMsg);
    res.status(500).json({
      error: 'Execution failed',
      details: errorMsg,
    });
  }
});

// WebSocket for document collaboration (Yjs)
const wss = new WebSocketServer({ noServer: true });
wss.on('connection', (conn, req) => {
  const rawUrl = req.url || '';
  const tokenMatch = rawUrl.match(/[?&]token=([^&]+)/);
  let token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : undefined;

  const pathPart = rawUrl.split('?')[0] || '/';
  let roomName = pathPart !== '/' && pathPart.length > 1 ? pathPart.slice(1) : '';

  if (!roomName && token && token.includes('/')) {
    const parts = token.split('/');
    token = parts.shift();
    roomName = parts.join('/') || '';
  }

  if (!token) {
    console.error('Connection rejected: No token provided');
    conn.close(1011, 'No token provided');
    return;
  }

  try {
    console.log(`Connection accepted for room "${roomName}" with token provided.`);
    setupWSConnection(conn, req, { docName: roomName || undefined });
  } catch (error) {
    console.error('Token verification / connection setup failed:', error);
    conn.close(1011, 'Invalid token');
  }
});

// Upgrade HTTP to WebSocket
server.on('upgrade', (req, ws, head) => {
  console.log('[Upgrade] URL:', req.url);

  const tokenMatch = req.url?.match(/[?&]token=([^&]+)/);
  if (!tokenMatch) {
    console.error('[Upgrade] Connection rejected: No token provided for', req.url);
    ws.destroy();
    return;
  }

  wss.handleUpgrade(req, ws as any, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

server.listen(PORT, () => {
  console.log(`✅ Server is listening on port ${PORT}`);
});