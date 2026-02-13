
/**
 * QUEST PROTOCOL | MONGODB CLUSTER NODE v1.9.10
 * SIMPLIFIED SEQUENTIAL CONSENSUS + DPOS TALLY + AUTO ONBOARDING
 */

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
    PEER_URLS: argv.peers ? argv.peers.toString().split(',') : [],
    MAX_WITNESSES: 21,
    MAX_SUPPLY: 1000000000,
    GENESIS_VALIDATOR: 'tekraze',
    DEFAULT_NODES: ['tekraze', 'kamranrkploy', 'node_gamma'],
    TREASURY: 'PROTOCOL_TREASURY',
    CHAIN_ID: 'quest_mainnet_v1',
    BLOCK_INTERVAL: 3000,
    WELCOME_BONUS: 1000
};

const SEEN_TX_IDS = new Set();
const SEEN_BLOCK_HASHES = new Set();
const CACHE_LIMIT = 5000;

let db, client;
let currentWitnessSchedule = [...CONFIG.DEFAULT_NODES];
let activePeers = new Map(); 
let pendingConnections = new Set();
let isStandalone = false;

async function initMongo() {
    try {
        client = new MongoClient(CONFIG.MONGO_URI);
        await client.connect();
        db = client.db(CONFIG.DB_NAME);
        
        try {
            const isMaster = await db.command({ isMaster: 1 });
            isStandalone = !isMaster.setName;
        } catch (e) { isStandalone = true; }

        await db.collection('blocks').createIndex({ index: 1 }, { unique: true });
        await db.collection('accounts').createIndex({ username: 1 }, { unique: true });
        await db.collection('nfts').createIndex({ id: 1 }, { unique: true });
        await db.collection('voter_prefs').createIndex({ username: 1 }, { unique: true });
        await db.collection('witness_stats').createIndex({ username: 1 }, { unique: true });

        // Ensure Treasury
        const treasury = await db.collection('accounts').findOne({ username: CONFIG.TREASURY });
        if (!treasury) {
            await db.collection('accounts').insertOne({ username: CONFIG.TREASURY, balance: 500000000, staked: 0 });
        }

        await updateWitnessSchedule();
        CONFIG.PEER_URLS.forEach(url => connectToPeer(url.trim()));
        
        setInterval(attemptBlockProduction, CONFIG.BLOCK_INTERVAL);
        setInterval(checkConnections, 30000);
        setInterval(cleanupCaches, 60000); 
        console.log(`[NODE] Quest Protocol v1.9.10 [AUTO_WELCOME]: @${CONFIG.WITNESS_NAME}`);
    } catch (e) {
        process.exit(1);
    }
}

function cleanupCaches() {
    if (SEEN_TX_IDS.size > CACHE_LIMIT) SEEN_TX_IDS.clear();
    if (SEEN_BLOCK_HASHES.size > CACHE_LIMIT) SEEN_BLOCK_HASHES.clear();
}

async function updateWitnessSchedule() {
    try {
        const topWitnesses = await db.collection('witness_stats').find({ total_votes: { $gt: 0 } }).sort({ total_votes: -1, username: 1 }).limit(CONFIG.MAX_WITNESSES).toArray();
        const names = topWitnesses.map(w => w.username);
        const combined = Array.from(new Set([...names, ...CONFIG.DEFAULT_NODES]));
        currentWitnessSchedule = combined.slice(0, CONFIG.MAX_WITNESSES);
    } catch (e) { currentWitnessSchedule = [...CONFIG.DEFAULT_NODES]; }
}

async function attemptBlockProduction() {
    try {
        const lastBlock = await db.collection('blocks').findOne({}, { sort: { index: -1 } });
        const nextIndex = (lastBlock ? lastBlock.index : 0) + 1;
        
        if (!currentWitnessSchedule || currentWitnessSchedule.length === 0) return;

        const scheduleIndex = (nextIndex - 1) % currentWitnessSchedule.length;
        const expectedLeader = currentWitnessSchedule[scheduleIndex];

        if (expectedLeader === CONFIG.WITNESS_NAME) {
            const collision = await db.collection('blocks').findOne({ index: nextIndex });
            if (collision) return;

            console.log(`🧭 Height ${nextIndex} → Leader: ${expectedLeader} (Me)`);
            await produceBlock(nextIndex, lastBlock ? lastBlock.hash : '0'.repeat(64));
        }
    } catch (e) {
        console.error("[PRODUCER_ERROR]", e);
    }
}

async function produceBlock(index, prevHash) {
    const pendingTxs = await db.collection('transactions').find({ block_index: null }).limit(50).toArray();
    const block = { 
        index, 
        previousHash: prevHash, 
        timestamp: Date.now(), 
        validator: CONFIG.WITNESS_NAME, 
        chainId: CONFIG.CHAIN_ID, 
        transactions: pendingTxs 
    };
    block.hash = simpleHash(JSON.stringify(block));
    
    if (await processIncomingBlock(block)) {
        SEEN_BLOCK_HASHES.add(block.hash);
        broadcast({ type: 'NEW_BLOCK', block, witnesses: currentWitnessSchedule });
    }
}

async function processIncomingBlock(block) {
    if (!block || !block.hash || SEEN_BLOCK_HASHES.has(block.hash)) return true;
    
    const latestBlock = await db.collection('blocks').findOne({}, { sort: { index: -1 } });
    const localHeight = latestBlock ? latestBlock.index : 0;
    
    if (block.index !== localHeight + 1) return false;

    const scheduleIndex = (block.index - 1) % currentWitnessSchedule.length;
    const expectedLeader = currentWitnessSchedule[scheduleIndex];
    if (block.validator !== expectedLeader) return false;

    const session = !isStandalone ? client.startSession() : null;
    try {
        if (session) await session.withTransaction(async () => { await executeBlockLogic(block, session); });
        else await executeBlockLogic(block, null);
        SEEN_BLOCK_HASHES.add(block.hash);
        await updateWitnessSchedule();
        return true;
    } catch (e) { return e.code === 11000; } 
    finally { if (session) await session.endSession(); }
}

async function executeBlockLogic(block, session) {
    const opts = session ? { session } : {};
    await db.collection('blocks').insertOne({ ...block }, opts);
    
    const total = await db.collection('accounts').aggregate([{ $group: { _id: null, sum: { $sum: { $add: ["$balance", "$staked"] } } } }], opts).toArray();
    const currentSupply = total[0]?.sum || 0;

    if (block.transactions) {
        for (const tx of block.transactions) {
            try {
                const user = await db.collection('accounts').findOne({ username: tx.from }, opts);
                const voterStake = user ? (user.staked || 0) : 0;

                if (tx.type === 'TRANSFER' || tx.type === 'MINT' || tx.type === 'REWARD') {
                    if (currentSupply >= CONFIG.MAX_SUPPLY && (tx.type === 'MINT' || tx.type === 'REWARD')) continue;
                    await db.collection('accounts').updateOne({ username: tx.from }, { $inc: { balance: -tx.amount } }, opts);
                    await db.collection('accounts').updateOne({ username: tx.to }, { $inc: { balance: tx.amount } }, { ...opts, upsert: true });
                } else if (tx.type === 'STAKE') {
                    await db.collection('accounts').updateOne({ username: tx.from }, { $inc: { balance: -tx.amount, staked: tx.amount } }, opts);
                    const pref = await db.collection('voter_prefs').findOne({ username: tx.from }, opts);
                    if (pref) await db.collection('witness_stats').updateOne({ username: pref.witness }, { $inc: { total_votes: tx.amount } }, { ...opts, upsert: true });
                } else if (tx.type === 'UNSTAKE') {
                    await db.collection('accounts').updateOne({ username: tx.from }, { $inc: { balance: tx.amount, staked: -tx.amount } }, opts);
                    const pref = await db.collection('voter_prefs').findOne({ username: tx.from }, opts);
                    if (pref) await db.collection('witness_stats').updateOne({ username: pref.witness }, { $inc: { total_votes: -tx.amount } }, opts);
                } else if (tx.type === 'VOTE') {
                    const oldVote = await db.collection('voter_prefs').findOne({ username: tx.from }, opts);
                    if (oldVote) await db.collection('witness_stats').updateOne({ username: oldVote.witness }, { $inc: { total_votes: -voterStake } }, opts);
                    await db.collection('voter_prefs').updateOne({ username: tx.from }, { $set: { witness: tx.to } }, { ...opts, upsert: true });
                    await db.collection('witness_stats').updateOne({ username: tx.to }, { $inc: { total_votes: voterStake } }, { ...opts, upsert: true });
                } else if (tx.type === 'UPDATE_SIGNER') {
                    await db.collection('accounts').updateOne({ username: tx.from }, { $set: { signer_key: tx.to } }, opts);
                }

                if (tx.memo && tx.memo.startsWith('NFT_MINT:')) {
                    const [_, type, subType, value] = tx.memo.split(':');
                    await db.collection('nfts').insertOne({ id: `nft_${generateId()}`, owner: tx.to, type, subType, rarity: 'COMMON', level: 1, xp: 0, value: Number(value) }, opts);
                    if (subType === 'GAME_PASS') await db.collection('accounts').updateOne({ username: tx.to }, { $set: { has_pass: true } }, opts);
                }
                
                await db.collection('transactions').updateOne({ id: tx.id }, { $set: { ...tx, block_index: block.index } }, { ...opts, upsert: true });
                SEEN_TX_IDS.add(tx.id);
            } catch (err) {}
        }
    }
    
    if (currentSupply < CONFIG.MAX_SUPPLY) {
        await db.collection('accounts').updateOne({ username: CONFIG.TREASURY }, { $inc: { balance: -50 } }, opts);
        await db.collection('accounts').updateOne({ username: block.validator }, { $inc: { balance: 50 } }, { ...opts, upsert: true });
    }
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
                const inventory = await db.collection('nfts').find({ owner: rpc.username }).toArray();
                
                // Welcome Bonus Logic
                if (!user && rpc.username && !rpc.username.includes(' ')) {
                    const welcomeTx = {
                        id: `welcome_${generateId()}`,
                        from: CONFIG.TREASURY,
                        to: rpc.username,
                        amount: CONFIG.WELCOME_BONUS,
                        type: 'REWARD',
                        timestamp: Date.now(),
                        memo: 'Welcome Bonus'
                    };
                    await db.collection('transactions').updateOne({ id: welcomeTx.id }, { $setOnInsert: { ...welcomeTx, block_index: null } }, { upsert: true });
                    broadcast({ type: 'PUSH_TX', tx: welcomeTx }, ws);
                }

                ws.send(JSON.stringify({ type: 'STATE_RESPONSE', user, inventory }));
            }
            if (rpc.type === 'NEW_BLOCK') { if (await processIncomingBlock(rpc.block)) broadcast(rpc, ws); }
            if (rpc.type === 'PUSH_TX') {
                if (!SEEN_TX_IDS.has(rpc.tx.id)) {
                    const res = await db.collection('transactions').updateOne({ id: rpc.tx.id }, { $setOnInsert: { ...rpc.tx, block_index: null } }, { upsert: true });
                    if (res.upsertedCount > 0) broadcast(rpc, ws);
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
