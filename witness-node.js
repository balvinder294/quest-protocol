
/**
 * QUEST PROTOCOL | STANDALONE WITNESS NODE
 * 
 * Instructions:
 * 1. Install dependencies: npm install ws sqlite3
 * 2. Run: node witness-node.js
 */

const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const CONFIG = {
    PORT: 8080,
    DB_PATH: './chain-data.db',
    WITNESS_NAME: process.env.WITNESS_NAME || 'tekraze',
    SIDECHAIN_ID: 'quest_protocol_v1'
};

const db = new sqlite3.Database(CONFIG.DB_PATH);

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

const wss = new WebSocket.Server({ port: CONFIG.PORT });

wss.on('connection', function connection(ws) {
    console.log('[P2P] Peer connected');
    
    ws.on('message', function incoming(message) {
        const data = JSON.parse(message);
        console.log('[P2P] Received:', data.type);
        
        switch(data.type) {
            case 'GET_BLOCKS':
                // Send blocks to peer
                db.all("SELECT * FROM blocks ORDER BY index_id DESC LIMIT 10", (err, rows) => {
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
    if (!block.hash || !block.validator) return callback(false);
    callback(true);
}

function saveBlock(block) {
    db.run(`INSERT INTO blocks (index_id, hash, prev_hash, validator, timestamp, witness_sig) 
            VALUES (?, ?, ?, ?, ?, ?)`, 
            [block.index, block.hash, block.previousHash, block.validator, block.timestamp, block.witnessSignature]);
}

console.log(`
=========================================
 QUEST PROTOCOL NODE ACTIVE
 Witness: ${CONFIG.WITNESS_NAME}
 P2P Port: ${CONFIG.PORT}
 Version: 1.2.0-STABLE
=========================================
`);
