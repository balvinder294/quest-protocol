
/**
 * QUEST PROTOCOL | MONGODB CLUSTER NODE v1.9.18
 * TIME-SLOT CONSENSUS (ANTI-STALL)
 */

import 'dotenv/config';
import { WebSocketServer, WebSocket } from 'ws';
import { MongoClient } from 'mongodb';
import minimist from 'minimist';
import { simpleHash, generateId } from './services/chainUtils.js';

const argv = minimist(process.argv.slice(2));
const CONFIG = {
    PORT: argv.port || 8089,
    MONGO_URI: argv.mongo || 'mongodb://localhost:27017',
    DB_NAME: `quest_protocol_${argv.db || 'node'}`,
    WITNESS_NAME: argv.name || 'tekraze',
    PRIVATE_KEY: (argv.key || process.env.QUEST_PRIVATE_KEY || '').trim(), 
    PEER_URLS: argv.peers ? argv.peers.toString().split(',') : [],
    MAX_WITNESSES: 21,
    MAX_SUPPLY: 1000000000,
    TREASURY: 'PROTOCOL_TREASURY',
    CHAIN_ID: 'quest_mainnet_v1',
    BLOCK_INTERVAL: 3000, // 3 second slots
    WELCOME_BONUS: 1000,
    EPOCH_LENGTH: 50
};

const SEEN_TX_IDS = new Set();
const SEEN_BLOCK_HASHES = new Set();
const CACHE_LIMIT = 5000;

let db, client;
let currentWitnessSchedule = ['tekraze', 'kamranrkploy', 'node_gamma'];
let activePeers = new Map(); 
let pendingConnections = new Set();
let isStandalone = false;

function canonicalBlockHash(block) {
    const payload =
        `${block.index}|` +
        `${block.previousHash}|` +
        `${block.timestamp}|` +
        `${block.validator}|` +
        `${block.chainId}|` +
        `${JSON.stringify(block.transactions)}`;

    return simpleHash(payload);
}

async function initMongo() {
    try {
        console.log(`[INIT] Starting Quest Protocol Node v1.9.18...`);
        console.log(`[INIT] Witness Name: @${CONFIG.WITNESS_NAME}`);
        
        client = new MongoClient(CONFIG.MONGO_URI);
        await client.connect();
        db = client.db(CONFIG.DB_NAME);
        
        try {
            const isMaster = await db.command({ isMaster: 1 });
            isStandalone = !isMaster.setName;
        } catch (e) { isStandalone = true; }

        await db.collection('blocks').createIndex({ index: 1 }, { unique: true });
        await db.collection('accounts').createIndex({ username: 1 }, { unique: true });
        
        if (CONFIG.PRIVATE_KEY) {
            await db.collection('accounts').updateOne(
                { username: CONFIG.WITNESS_NAME },
                { $set: { signer_key: CONFIG.PRIVATE_KEY } },
                { upsert: true }
            );
            console.log(`[AUTH] Local signer registered.`);
        }

        await updateWitnessSchedule();
        CONFIG.PEER_URLS.forEach(url => connectToPeer(url.trim()));
        
        // Block Production Heartbeat
        setInterval(attemptBlockProduction, 1000); // Check every second for slot alignment
        setInterval(checkConnections, 30000);
        setInterval(logHeartbeat, 10000); 
        
        console.log(`[NODE] ONLINE. Slot Interval: ${CONFIG.BLOCK_INTERVAL}ms`);
    } catch (e) {
        console.error("[INIT_FATAL]", e);
        process.exit(1);
    }
}

async function logHeartbeat() {
    try {
        const lastBlock = await db.collection('blocks').findOne({}, { sort: { index: -1 } });
        const height = lastBlock ? lastBlock.index : 0;
        
        // Slot Math
        const currentSlot = Math.floor(Date.now() / CONFIG.BLOCK_INTERVAL);
        const leaderIdx = currentSlot % currentWitnessSchedule.length;
        const leader = currentWitnessSchedule[leaderIdx];
        
        console.log(`[HEARTBEAT] H:${height} | Slot:${currentSlot} | Leader:@${leader} ${leader === CONFIG.WITNESS_NAME ? '(YOU)' : ''} | Peers:${activePeers.size}`);
    } catch (e) {}
}

async function updateWitnessSchedule() {
    try {
        const topWitnesses = await db.collection('witness_stats').find({ total_votes: { $gt: 0 } }).sort({ total_votes: -1, username: 1 }).limit(CONFIG.MAX_WITNESSES).toArray();
        const names = topWitnesses.map(w => w.username);
        const combined = Array.from(new Set([...names, 'tekraze', 'kamranrkploy', 'node_gamma']));
        currentWitnessSchedule = combined.slice(0, CONFIG.MAX_WITNESSES);
        console.log(`[CONSENSUS] Schedule: [${currentWitnessSchedule.join(', ')}]`);
    } catch (e) {}
}

async function attemptBlockProduction() {
    try {
        if (!CONFIG.PRIVATE_KEY) return;

        const now = Date.now();
        const currentSlot = Math.floor(now / CONFIG.BLOCK_INTERVAL);
        const scheduleIndex = currentSlot % currentWitnessSchedule.length;
        const expectedLeader = currentWitnessSchedule[scheduleIndex];

        if (expectedLeader === CONFIG.WITNESS_NAME) {
            const lastBlock = await db.collection('blocks').findOne({}, { sort: { index: -1 } });
            const nextIndex = (lastBlock ? lastBlock.index : 0) + 1;

            // Don't produce if we already saw a block for this slot or height
            const timeSinceLast = lastBlock ? (now - lastBlock.timestamp) : Infinity;
            if (timeSinceLast < CONFIG.BLOCK_INTERVAL) return;

            console.log(`[PRODUCER] My Slot! Producing Block #${nextIndex} (Slot ${currentSlot})`);
            await produceBlock(nextIndex, lastBlock ? lastBlock.hash : '0'.repeat(64), now);
        }
    } catch (e) {
        console.error("[PRODUCER_ERR]", e);
    }
}

async function produceBlock(index, prevHash, timestamp) {
    try {
        const pendingTxs = await db.collection('transactions').find({ block_index: null }).limit(50).toArray();
        const block = { 
            index, 
            previousHash: prevHash, 
            timestamp, 
            validator: CONFIG.WITNESS_NAME, 
            chainId: CONFIG.CHAIN_ID, 
            transactions: pendingTxs 
        };
        
        block.hash = canonicalBlockHash(block);
        block.witnessSignature = simpleHash(block.hash + CONFIG.PRIVATE_KEY);
        
        const success = await processIncomingBlock(block);
        if (success) {
            broadcast({ type: 'NEW_BLOCK', block, witnesses: currentWitnessSchedule });
        }
    } catch (e) {
        console.error(`[PRODUCER_FATAL] ${e.message}`);
    }
}

async function processIncomingBlock(block) {
    if (!block || !block.hash) return false;
    if (SEEN_BLOCK_HASHES.has(block.hash)) return true;
    
    const latestBlock = await db.collection('blocks').findOne({}, { sort: { index: -1 } });
    const localHeight = latestBlock ? latestBlock.index : 0;
    
    if (block.index > localHeight + 1) {
        broadcast({ type: 'GET_BLOCKS' });
        return false;
    }
    
    if (block.index <= localHeight) return true; 

    // Time-Slot Validation
    const blockSlot = Math.floor(block.timestamp / CONFIG.BLOCK_INTERVAL);
    const leaderIdx = blockSlot % currentWitnessSchedule.length;
    const expectedLeader = currentWitnessSchedule[leaderIdx];
    
    if (block.validator !== expectedLeader) {
        console.error(`[CONSENSUS] REJECTED: #${block.index} from @${block.validator}. Slot ${blockSlot} belongs to @${expectedLeader}`);
        return false;
    }

    // Signature Check
    const validatorAccount = await db.collection('accounts').findOne({ username: block.validator });
    if (validatorAccount && validatorAccount.signer_key) {
        const expectedSig = simpleHash(block.hash + validatorAccount.signer_key);
        if (block.witnessSignature !== expectedSig) {
            console.error(`[CONSENSUS] REJECTED: Invalid signature from @${block.validator}.`);
            return false;
        }
    }

    const session = !isStandalone ? client.startSession() : null;
    try {
        if (session) await session.withTransaction(async () => { await executeBlockLogic(block, session); });
        else await executeBlockLogic(block, null);
        
        SEEN_BLOCK_HASHES.add(block.hash);
        console.log(`[LEDGER] SEALED: #${block.index} by @${block.validator} (Slot: ${blockSlot})`);
        return true;
    } catch (e) { 
        console.error(`[LEDGER] FAILED #${block.index}: ${e.message}`);
        return e.code === 11000; 
    } 
    finally { 
        if (session) await session.endSession(); 
    }
}

async function executeBlockLogic(block, session) {
    const opts = session ? { session } : {};
    await db.collection('blocks').insertOne({ ...block }, opts);
    
    if (block.transactions) {
        for (const tx of block.transactions) {
            try {
                if (tx.type === 'TRANSFER' || tx.type === 'MINT' || tx.type === 'REWARD') {
                    await db.collection('accounts').updateOne({ username: tx.from }, { $inc: { balance: -tx.amount } }, opts);
                    await db.collection('accounts').updateOne({ username: tx.to }, { $inc: { balance: tx.amount } }, { ...opts, upsert: true });
                } else if (tx.type === 'UPDATE_SIGNER') {
                    await db.collection('accounts').updateOne({ username: tx.from }, { $set: { signer_key: tx.to } }, opts);
                }
                await db.collection('transactions').updateOne({ id: tx.id }, { $set: { ...tx, block_index: block.index } }, { ...opts, upsert: true });
                SEEN_TX_IDS.add(tx.id);
            } catch (err) {}
        }
    }
    
    await db.collection('accounts').updateOne({ username: CONFIG.TREASURY }, { $inc: { balance: -50 } }, opts);
    await db.collection('accounts').updateOne({ username: block.validator }, { $inc: { balance: 50 } }, { ...opts, upsert: true });
}

const wss = new WebSocketServer({ port: CONFIG.PORT });
wss.on('connection', (ws) => {
    ws.on('message', async (data) => {
        try {
            const rpc = JSON.parse(data.toString());
            if (rpc.type === 'PING') ws.send(JSON.stringify({ type: 'PONG', name: CONFIG.WITNESS_NAME }));
            if (rpc.type === 'GET_BLOCKS') {
                const blocks = await db.collection('blocks').find().sort({ index: -1 }).limit(100).toArray();
                ws.send(JSON.stringify({ type: 'BLOCK_DATA', blocks, witnesses: currentWitnessSchedule, currentWitness: currentWitnessSchedule[0] }));
            }
            if (rpc.type === 'QUERY_STATE') {
                let user = await db.collection('accounts').findOne({ username: rpc.username });
                ws.send(JSON.stringify({ type: 'STATE_RESPONSE', user }));
            }
            if (rpc.type === 'NEW_BLOCK') {
                await processIncomingBlock(rpc.block);
            }
            if (rpc.type === 'PUSH_TX') {
                if (!SEEN_TX_IDS.has(rpc.tx.id)) {
                    await db.collection('transactions').updateOne({ id: rpc.tx.id }, { $setOnInsert: { ...rpc.tx, block_index: null } }, { upsert: true });
                    broadcast(rpc, ws);
                }
            }
        } catch (e) {}
    });
});

function connectToPeer(url) {
    if (!url || activePeers.has(url) || pendingConnections.has(url)) return;
    pendingConnections.add(url);
    try {
        const ws = new WebSocket(url);
        ws.on('open', () => {
            activePeers.set(url, ws);
            pendingConnections.delete(url);
            console.log(`[P2P] Linked: ${url}`);
            ws.send(JSON.stringify({ type: 'GET_BLOCKS' }));
        });
        ws.on('close', () => { activePeers.delete(url); setTimeout(() => connectToPeer(url), 10000); });
        ws.on('error', () => { pendingConnections.delete(url); });
    } catch (e) { pendingConnections.delete(url); }
}

function checkConnections() {
    activePeers.forEach((ws, url) => {
        if (ws.readyState !== WebSocket.OPEN) {
            activePeers.delete(url);
            connectToPeer(url);
        }
    });
}

function broadcast(data, excludeWs) {
    const msg = JSON.stringify(data);
    wss.clients.forEach(c => { if (c !== excludeWs && c.readyState === WebSocket.OPEN) c.send(msg); });
    activePeers.forEach(p => { if (p !== excludeWs && p.readyState === WebSocket.OPEN) p.send(msg); });
}

initMongo();
