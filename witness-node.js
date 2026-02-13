
/**
 * QUEST PROTOCOL | MONGODB CLUSTER NODE v1.9.22
 * ABSOLUTE SLOT CONSENSUS + SIMPLE HASH SIGNING
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
    TREASURY: 'PROTOCOL_TREASURY',
    CHAIN_ID: 'quest_mainnet_v1',
    BLOCK_INTERVAL: 3000, 
    GENESIS_MINT: 1000000
};

let db, client;
let currentWitnessSchedule = ['tekraze', 'kamranrkploy', 'node_gamma', 'zahidsun'];
let activePeers = new Map(); 
let pendingConnections = new Set();
let isStandalone = false;

function canonicalBlockHash(block) {
    const payload = `${block.index}|${block.previousHash}|${block.timestamp}|${block.validator}|${block.chainId}|${JSON.stringify(block.transactions)}`;
    return simpleHash(payload);
}

async function initMongo() {
    try {
        console.log(`[INIT] Quest Protocol Node v1.9.22 Starting...`);
        client = new MongoClient(CONFIG.MONGO_URI);
        await client.connect();
        db = client.db(CONFIG.DB_NAME);
        
        try {
            const isMaster = await db.command({ isMaster: 1 });
            isStandalone = !isMaster.setName;
        } catch (e) { isStandalone = true; }

        await db.collection('blocks').createIndex({ index: 1 }, { unique: true });
        await db.collection('accounts').createIndex({ username: 1 }, { unique: true });
        await db.collection('transactions').createIndex({ id: 1 }, { unique: true });
        
        const treasury = await db.collection('accounts').findOne({ username: CONFIG.TREASURY });
        if (!treasury) {
            await db.collection('accounts').insertOne({ username: CONFIG.TREASURY, balance: CONFIG.GENESIS_MINT, staked: 0 });
        }

        await updateWitnessSchedule();
        CONFIG.PEER_URLS.forEach(url => connectToPeer(url.trim()));
        
        setInterval(attemptBlockProduction, 1000); 
        setInterval(checkConnections, 30000);
        setInterval(logHeartbeat, 10000); 
        
        console.log(`[NODE] ONLINE. Signer: @${CONFIG.CONFIG_NAME || CONFIG.WITNESS_NAME}`);
    } catch (e) {
        console.error("[INIT_FATAL]", e);
        process.exit(1);
    }
}

function getCurrentSlotInfo() {
    const now = Date.now();
    const slot = Math.floor(now / CONFIG.BLOCK_INTERVAL);
    const leaderIdx = slot % currentWitnessSchedule.length;
    return {
        slot,
        leader: currentWitnessSchedule[leaderIdx],
        timestamp: now
    };
}

async function logHeartbeat() {
    try {
        const lastBlock = await db.collection('blocks').findOne({}, { sort: { index: -1 } });
        const { slot, leader } = getCurrentSlotInfo();
        const height = lastBlock ? lastBlock.index : 0;
        console.log(`[HEARTBEAT] H:${height} | Slot:${slot} | Leader:@${leader} | Peers:${activePeers.size}`);
    } catch (e) {}
}

async function updateWitnessSchedule() {
    try {
        const topWitnesses = await db.collection('witness_stats').find({ total_votes: { $gt: 0 } }).sort({ total_votes: -1, username: 1 }).limit(CONFIG.MAX_WITNESSES).toArray();
        const names = topWitnesses.map(w => w.username);
        const combined = Array.from(new Set([...names, 'tekraze', 'kamranrkploy', 'node_gamma', 'zahidsun']));
        currentWitnessSchedule = combined.slice(0, CONFIG.MAX_WITNESSES);
    } catch (e) {}
}

async function attemptBlockProduction() {
    try {
        if (!CONFIG.PRIVATE_KEY) return;
        const { slot, leader, timestamp } = getCurrentSlotInfo();

        if (leader === CONFIG.WITNESS_NAME) {
            const lastBlock = await db.collection('blocks').findOne({}, { sort: { index: -1 } });
            const nextIndex = (lastBlock ? lastBlock.index : 0) + 1;

            // Prevent double-signing same height or same slot
            const collisionHeight = await db.collection('blocks').findOne({ index: nextIndex });
            if (collisionHeight) return;

            const timeSinceLast = lastBlock ? (timestamp - lastBlock.timestamp) : Infinity;
            if (timeSinceLast < CONFIG.BLOCK_INTERVAL) return;

            console.log(`[PRODUCER] My Slot (${slot})! Producing Block #${nextIndex}`);
            await produceBlock(nextIndex, lastBlock ? lastBlock.hash : '0'.repeat(64), timestamp);
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
    
    // Check height collision
    const collision = await db.collection('blocks').findOne({ index: block.index });
    if (collision) return true;

    const latestBlock = await db.collection('blocks').findOne({}, { sort: { index: -1 } });
    const localHeight = latestBlock ? latestBlock.index : 0;
    
    if (block.index > localHeight + 1) { 
        broadcast({ type: 'GET_BLOCKS' }); 
        return false; 
    }
    
    if (block.index <= localHeight) return true; 

    // Slot-based Consensus Verification
    const blockSlot = Math.floor(block.timestamp / CONFIG.BLOCK_INTERVAL);
    const expectedLeaderIdx = blockSlot % currentWitnessSchedule.length;
    const expectedLeader = currentWitnessSchedule[expectedLeaderIdx];

    if (block.validator !== expectedLeader) {
        console.warn(`[CONSENSUS] REJECT: #${block.index} from @${block.validator}. Slot ${blockSlot} belongs to @${expectedLeader}`);
        return false;
    }

    const session = !isStandalone ? client.startSession() : null;
    try {
        if (session) await session.withTransaction(async () => { await executeBlockLogic(block, session); });
        else await executeBlockLogic(block, null);
        
        console.log(`[LEDGER] SEALED: #${block.index} by @${block.validator}`);
        return true;
    } catch (e) { 
        console.error(`[LEDGER] ERROR: ${e.message}`);
        return e.code === 11000; 
    } 
    finally { if (session) await session.endSession(); }
}

async function executeBlockLogic(block, session) {
    const opts = session ? { session } : {};
    await db.collection('blocks').insertOne({ ...block }, opts);
    if (block.transactions) {
        for (const tx of block.transactions) {
            try {
                // Fix: Robust Game Pass Memo Check
                if (tx.memo && (tx.memo.includes('GAME_PASS') || tx.memo.includes('ACCESS:GAME_PASS'))) {
                    console.log(`[LEDGER] License Granted: @${tx.from}`);
                    await db.collection('accounts').updateOne({ username: tx.from }, { $set: { has_pass: true } }, opts);
                }

                if (tx.type === 'TRANSFER' || tx.type === 'MINT' || tx.type === 'REWARD') {
                    await db.collection('accounts').updateOne({ username: tx.from }, { $inc: { balance: -tx.amount } }, opts);
                    await db.collection('accounts').updateOne({ username: tx.to }, { $inc: { balance: tx.amount } }, { ...opts, upsert: true });
                } else if (tx.type === 'UPDATE_SIGNER') {
                    await db.collection('accounts').updateOne({ username: tx.from }, { $set: { pub_key: tx.to } }, opts);
                }
                await db.collection('transactions').updateOne({ id: tx.id }, { $set: { ...tx, block_index: block.index } }, { ...opts, upsert: true });
            } catch (err) {}
        }
    }
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
                const { leader } = getCurrentSlotInfo();
                ws.send(JSON.stringify({ type: 'BLOCK_DATA', blocks, witnesses: currentWitnessSchedule, currentWitness: leader }));
            }
            if (rpc.type === 'QUERY_STATE') {
                let userAccount = await db.collection('accounts').findOne({ username: rpc.username });
                ws.send(JSON.stringify({ type: 'STATE_RESPONSE', user: userAccount }));
            }
            if (rpc.type === 'NEW_BLOCK') await processIncomingBlock(rpc.block);
            if (rpc.type === 'PUSH_TX') {
                const existing = await db.collection('transactions').findOne({ id: rpc.tx.id });
                if (!existing) {
                    await db.collection('transactions').insertOne({ ...rpc.tx, block_index: null });
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
