/**
 * QUEST PROTOCOL | STANDALONE WITNESS NODE
 * 
 * Instructions:
 * 1. Install dependencies: npm install ws sqlite3
 * 2. Run: node witness-node.js
 */

import { WebSocketServer, WebSocket } from 'ws';
import sqlite3 from 'sqlite3';
import fs from 'fs';

const CONFIG = {
    PORT: 8080,
    DB_PATH: './chain-data.db',
    WITNESS_NAME: process.env.WITNESS_NAME || 'tekraze',
    SIDECHAIN_ID: 'quest_protocol_v1'
};

// Initialize SQLite with verbose logging
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
        witness_sig TEXT
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
                    // Send blocks to peer
                    db.all("SELECT * FROM blocks ORDER BY index_id DESC LIMIT 10", (err, rows) => {
                        if (err) return console.error(err);
                        ws.send(JSON.stringify({ type: 'BLOCK_DATA', data: rows }));
                    });
                    break;
                case 'NEW_BLOCK':
                    // Validate and save block
                    validateBlock(data.block, (isValid) => {
                        if (isValid) {
                            saveBlock(data.block);
                            broadcast(message); // Propagate
                        }
                    });
                    break;
            }
        } catch (e) {
            console.error('[P2P] Parse Error:', e.message);
        }
    });
});

function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

function validateBlock(block, callback) {
    // Basic verification
    if (!block || !block.hash || !block.validator) return callback(false);
    callback(true);
}

function saveBlock(block) {
    db.run(`INSERT INTO blocks (index_id, hash, prev_hash, validator, timestamp, witness_sig) 
            VALUES (?, ?, ?, ?, ?, ?)`, 
            [block.index, block.hash, block.previousHash, block.validator, block.timestamp, block.witnessSignature],
            (err) => {
                if (err) console.error('[DB] Insert Error:', err.message);
            });
}

console.log(`
=========================================
 QUEST PROTOCOL NODE ACTIVE
 Witness: ${CONFIG.WITNESS_NAME}
 P2P Port: ${CONFIG.PORT}
 Version: 1.2.0-STABLE
=========================================
`);
