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
// Simple cached resolver to find Judge0 language_id by name (tries /languages endpoint)
let languagesCache = null;
let languagesCacheFetchedAt = 0;
const LANG_CACHE_TTL = 1000 * 60 * 60; // 1 hour
async function resolveLanguageId(lang) {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey)
        return undefined;
    // refresh cache when expired
    if (!languagesCache || Date.now() - languagesCacheFetchedAt > LANG_CACHE_TTL) {
        try {
            const resp = await axios.get('https://judge0-ce.p.rapidapi.com/languages', {
                headers: {
                    'X-RapidAPI-Key': apiKey,
                    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
                }
            });
            const list = Array.isArray(resp.data) ? resp.data : [];
            languagesCache = {};
            list.forEach((l) => {
                // Ensure languagesCache is not null
                if (!languagesCache)
                    languagesCache = {};
                // map by name, lowercase name and any known slug/key
                if (l.name)
                    languagesCache[l.name.toLowerCase()] = l.id;
                if (l.slug)
                    languagesCache[l.slug.toLowerCase()] = l.id;
                if (l.language)
                    languagesCache[String(l.language).toLowerCase()] = l.id;
            });
            languagesCacheFetchedAt = Date.now();
        }
        catch (error) {
            console.error('Failed to fetch languages from Judge0:', error?.toString());
            languagesCache = languagesCache || {};
        }
    }
    const want = (lang || '').toLowerCase().trim();
    // exact matches first
    if (languagesCache) {
        if (languagesCache[want])
            return languagesCache[want];
        // try substring match
        for (const key of Object.keys(languagesCache)) {
            if (key.includes(want) || want.includes(key)) {
                return languagesCache[key];
            }
        }
    }
    return undefined;
}
app.post('/execute', async (req, res) => {
    console.log('POST /execute received:', {
        hasCode: !!req.body.code,
        language: req.body.language,
        language_id: req.body.language_id,
        hasStdin: typeof req.body.stdin === 'string' && req.body.stdin.length > 0
    });
    const { code, language, language_id, stdin } = req.body;
    if (!code) {
        return res.status(400).send('No code provided.');
    }
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
        return res.status(500).send('API key is not configured on the server.');
    }
    // Use provided language_id or resolve from language name
    let languageId = language_id;
    if (!languageId && language) {
        languageId = await resolveLanguageId(language);
    }
    // fallback default (Node.js)
    if (!languageId) {
        languageId = 63;
    }
    const options = {
        method: 'POST',
        url: 'https://judge0-ce.p.rapidapi.com/submissions',
        params: { base64_encoded: 'false', fields: '*' },
        headers: {
            'content-type': 'application/json',
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        },
        data: {
            language_id: languageId,
            source_code: code,
            // include stdin if provided (Judge0 accepts "stdin")
            ...(typeof stdin === 'string' && stdin.length > 0 ? { stdin } : {})
        }
    };
    try {
        const response = await axios.request(options);
        const token = response.data.token;
        setTimeout(async () => {
            try {
                const resultResponse = await axios.get(`https://judge0-ce.p.rapidapi.com/submissions/${token}`, {
                    headers: {
                        'X-RapidAPI-Key': apiKey,
                        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
                    },
                    params: { base64_encoded: 'false', fields: '*' }
                });
                res.send(resultResponse.data);
            }
            catch (error) {
                console.error('Error getting execution result:', error?.toString());
                res.status(500).send('Error getting execution result.');
            }
        }, 3000); // Increased timeout to 3 seconds
    }
    catch (error) {
        console.error('Error executing code:', error?.toString());
        res.status(500).send('Error executing code.');
    }
});
const wss = new WebSocketServer({ server });
wss.on('connection', (conn, req) => {
    // More robust parsing of room name and token from the request URL
    const rawUrl = req.url || '';
    // token may be in query string: ?token=...
    const tokenMatch = rawUrl.match(/[?&]token=([^&]+)/);
    let token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : undefined;
    // path part is everything before '?', remove leading '/'
    const pathPart = rawUrl.split('?')[0] || '/';
    let roomName = pathPart !== '/' && pathPart.length > 1 ? pathPart.slice(1) : '';
    // Fallback: some clients might embed room in token or path incorrectly
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
        // If you want to verify JWT, add jwt.verify(token, process.env.JWT_SECRET) here.
        setupWSConnection(conn, req, { docName: roomName || undefined });
    }
    catch (error) {
        console.error('Token verification / connection setup failed:', error);
        conn.close(1011, 'Invalid token');
    }
});
server.listen(PORT, () => {
    console.log(`✅ Server is listening on port ${PORT}`);
});
