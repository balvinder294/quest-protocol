/**
 * QUEST PROTOCOL | STANDALONE WITNESS NODE v1.6.2
 * 
 * Local Run:
 * 1. npm install ws sqlite3
 * 2. node witness-node.js
 * 
 * Deployment (Linux Server):
 * 1. Use PM2 to keep the process alive: `pm2 start witness-node.js --name quest-node`
 * 2. Set up Nginx as a Reverse Proxy to handle SSL (WSS):
 *    
 *    location / {
 *        proxy_pass http://localhost:8089;
 *        proxy_http_version 1.1;
 *        proxy_set_header Upgrade $http_upgrade;
 *        proxy_set_header Connection "Upgrade";
 *        proxy_set_header Host $host;
 *    }
 */

import { WebSocketServer, WebSocket } from 'ws';
import sqlite3 from 'sqlite3';

const CONFIG = {
    PORT: 8089,
    DB_PATH: './chain-data.db',
    WITNESS_NAME: process.env.WITNESS_NAME || 'tekraze',
    SIDECHAIN_ID: 'quest_protocol_v1'
};

// Initialize SQLite
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(CONFIG.DB_PATH);

// Init Schema
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS blocks (
        index_id INTEGER PRIMARY KEY,
        hash TEXT,
        prev_hash TEXT,
        validator TEXT,
        timestamp INTEGER,
        witness_sig TEXT,
        block_data TEXT
    )`);
    console.log(`[NODE] Database initialized at ${CONFIG.DB_PATH}`);
});

const wss = new WebSocketServer({ port: CONFIG.PORT });

wss.on('connection', function connection(ws) {
    console.log('[P2P] Peer connected');
    
    ws.on('message', function incoming(message) {
        try {
            const data = JSON.parse(message);
            console.log('[P2P] Received:', data.type);
            
            switch(data.type) {
                case 'GET_BLOCKS':
                    db.all("SELECT * FROM blocks ORDER BY index_id DESC LIMIT 50", (err, rows) => {
                        if (err) return console.error(err);
                        ws.send(JSON.stringify({ type: 'BLOCK_DATA', data: rows }));
                    });
                    break;
                case 'NEW_BLOCK':
                    saveBlock(data.block, () => {
                        broadcast(message, ws); // Relay to other peers
                    });
                    break;
                case 'NEW_TRANSACTION':
                    console.log(`[MEMPOOL] New TX from ${data.tx.from}`);
                    broadcast(message, ws); // Relay to other peers
                    break;
            }
        } catch (e) {
            console.error('[P2P] Parse Error:', e.message);
        }
    });
});

function broadcast(data, excludeWs) {
    const msgString = typeof data === 'string' ? data : JSON.stringify(data);
    wss.clients.forEach(function each(client) {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
            client.send(msgString);
        }
    });
}

function saveBlock(block, callback) {
    db.run(`INSERT OR IGNORE INTO blocks (index_id, hash, prev_hash, validator, timestamp, witness_sig, block_data) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`, 
            [block.index, block.hash, block.previousHash, block.validator, block.timestamp, block.witnessSignature || "", JSON.stringify(block.transactions || [])],
            (err) => {
                if (err) console.error('[DB] Insert Error:', err.message);
                if (callback) callback();
            });
}

console.log(`
=========================================
 QUEST PROTOCOL NODE ACTIVE
 Witness: ${CONFIG.WITNESS_NAME}
 P2P Port: ${CONFIG.PORT}
 Version: 1.6.2-PROD
=========================================
`);