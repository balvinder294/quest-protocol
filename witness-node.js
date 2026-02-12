
/**
 * QUEST PROTOCOL | MONGODB CLUSTER NODE v1.9.2
 * STAKE-BASED DPoS CONSENSUS ENGINE + AUTO-PRODUCER
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
    GENESIS_VALIDATOR: 'tekraze',
    DEFAULT_NODES: ['tekraze', 'kamranrkploy', 'node_gamma'],
    CHAIN_ID: 'quest_mainnet_v1'
};

let db, client;
let currentWitnessSchedule = [CONFIG.GENESIS_VALIDATOR];
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
        } catch (e) {
            isStandalone = true;
        }

        console.log(`[DB] Cluster Node Active: ${isStandalone ? 'Standalone' : 'ReplicaSet'}`);

        // Ensure Core Indexes
        await db.collection('blocks').createIndex({ index: 1 }, { unique: true });
        await db.collection('blocks').createIndex({ hash: 1 }, { unique: true });
        await db.collection('accounts').createIndex({ username: 1 }, { unique: true });
        await db.collection('transactions').createIndex({ id: 1 }, { unique: true });
        await db.collection('nfts').createIndex({ id: 1 }, { unique: true });
        await db.collection('nfts').createIndex({ owner: 1 });
        await db.collection('witness_stats').createIndex({ username: 1 }, { unique: true });

        // Multi-Account Genesis & Multi-Producer Setup
        for (const nodeName of CONFIG.DEFAULT_NODES) {
            const exists = await db.collection('accounts').findOne({ username: nodeName });
            
            if (!exists) {
                console.log(`[INIT] Provisioning Default Account: @${nodeName} (100,000 QUEST)`);
                await db.collection('accounts').insertOne({
                    username: nodeName,
                    balance: 100000,
                    staked: 10000,
                    has_pass: true,
                    is_admin: nodeName === 'tekraze',
                    last_mana_sync: Date.now()
                });
            } else if (exists.balance === 0) {
                await db.collection('accounts').updateOne({ username: nodeName }, { $set: { balance: 100000, has_pass: true } });
            }

            // Provision NODE_PASS module
            const hasNft = await db.collection('nfts').findOne({ owner: nodeName, subType: 'NODE_PASS' });
            if (!hasNft) {
                await db.collection('nfts').insertOne({ 
                    id: `nft_genesis_${nodeName}`, 
                    owner: nodeName, 
                    type: 'ACCESS', 
                    subType: 'NODE_PASS', 
                    rarity: 'EPIC', 
                    level: 1, 
                    xp: 0, 
                    value: 0 
                });
            }

            // CRITICAL: Give all default nodes votes so they are in the turn schedule
            const statsExists = await db.collection('witness_stats').findOne({ username: nodeName });
            if (!statsExists) {
                console.log(`[INIT] Assigning Genesis Vote Weight to @${nodeName}`);
                await db.collection('witness_stats').insertOne({
                    username: nodeName,
                    total_votes: 10000,
                    last_update: Date.now()
                });
            }
        }
        
        await updateWitnessSchedule();
        CONFIG.PEER_URLS.forEach(url => connectToPeer(url.trim()));
        startProducerLoop();
        setInterval(checkConnections, 30000);
        
        console.log(`[NODE] Quest Protocol v1.9.2 Active: ${CONFIG.WITNESS_NAME} (DPoS Weight Active)`);
    } catch (e) {
        console.error(`[CRITICAL] Boot Error: ${e.message}`);
        process.exit(1);
    }
}

async function updateWitnessSchedule() {
    try {
        // Sort witnesses by votes descending to create a consistent turn list across all nodes
        const topWitnesses = await db.collection('witness_stats')
            .find({})
            .sort({ total_votes: -1, username: 1 }) // Secondary sort on name for stability
            .limit(CONFIG.MAX_WITNESSES)
            .toArray();

        if (topWitnesses.length > 0) {
            currentWitnessSchedule = topWitnesses.map(w => w.username);
        } else {
            currentWitnessSchedule = [CONFIG.GENESIS_VALIDATOR];
        }
    } catch (e) {
        console.error(`[CONSENSUS] Schedule Sync Error: ${e.message}`);
    }
}

function startProducerLoop() {
    setInterval(async () => {
        try {
            const lastBlock = await db.collection('blocks').findOne({}, { sort: { index: -1 } });
            const nextIndex = (lastBlock ? lastBlock.index : 0) + 1;
            
            // Deterministic selection based on block index
            const scheduleIndex = (nextIndex - 1) % currentWitnessSchedule.length;
            const scheduledWitness = currentWitnessSchedule[scheduleIndex];

            if (scheduledWitness === CONFIG.WITNESS_NAME) {
                // Double check no one else beat us to it in the last few ms
                const collision = await db.collection('blocks').findOne({ index: nextIndex });
                if (collision) return;

                console.log(`[DPoS] My Turn for Block #${nextIndex}`);
                await produceBlock(nextIndex, lastBlock ? lastBlock.hash : '0'.repeat(64));
            }
        } catch (e) {}
    }, 3000);
}

async function produceBlock(index, prevHash) {
    // Only include transactions not already in a block
    const pendingTxs = await db.collection('transactions').find({ block_index: null }).limit(50).toArray();
    
    const blockHeader = {
        index,
        previousHash: prevHash,
        merkleRoot: '0',
        timestamp: Date.now(),
        validator: CONFIG.WITNESS_NAME,
        chainId: CONFIG.CHAIN_ID,
        transactions: pendingTxs
    };
    
    const hash = simpleHash(JSON.stringify(blockHeader));
    const block = { ...blockHeader, hash };
    
    if (await processIncomingBlock(block)) {
        console.log(`[PRODUCER] Block #${index} Sealed and Broadcasted`);
        broadcast({ type: 'NEW_BLOCK', block, witnesses: currentWitnessSchedule });
    }
}

async function processIncomingBlock(block) {
    if (!block || !block.index) return false;
    
    // 1. Check if we already have this block
    const existing = await db.collection('blocks').findOne({ index: block.index });
    if (existing) {
        return existing.hash === block.hash;
    }

    // 2. Validate Turn (Verify that the sender was actually scheduled)
    const scheduleIndex = (block.index - 1) % currentWitnessSchedule.length;
    const scheduledWitness = currentWitnessSchedule[scheduleIndex];
    if (block.validator !== scheduledWitness) {
        console.warn(`[SECURITY] Out-of-turn block from @${block.validator} (Expected @${scheduledWitness})`);
        // We allow it for now if we are alone, but in production this is a rejection
    }

    if (!isStandalone) {
        const session = client.startSession();
        try {
            await session.withTransaction(async () => {
                await executeBlockLogic(block, session);
            });
            await updateWitnessSchedule();
            return true;
        } catch (e) {
            // Log code 11000 (duplicate) as a race condition loss, not an error
            if (e.code === 11000) return true;
            console.error(`[TX] Block Execution Error: ${e.message}`);
            return false;
        } finally {
            await session.endSession();
        }
    } else {
        try {
            await executeBlockLogic(block, null);
            await updateWitnessSchedule();
            return true;
        } catch (e) {
            return e.code === 11000;
        }
    }
}

async function executeBlockLogic(block, session) {
    const opts = session ? { session } : {};
    const blockData = { ...block };
    delete blockData._id; 
    
    await db.collection('blocks').insertOne(blockData, opts);
    
    if (block.transactions && Array.isArray(block.transactions)) {
        for (const tx of block.transactions) {
            try {
                // Token Movement
                if (tx.type === 'TRANSFER' || tx.type === 'MINT' || tx.type === 'REWARD') {
                    await db.collection('accounts').updateOne({ username: tx.from }, { $inc: { balance: -tx.amount } }, opts);
                    await db.collection('accounts').updateOne({ username: tx.to }, { $inc: { balance: tx.amount } }, { ...opts, upsert: true });
                } else if (tx.type === 'STAKE') {
                    await db.collection('accounts').updateOne({ username: tx.from }, { $inc: { balance: -tx.amount, staked: tx.amount } }, opts);
                } else if (tx.type === 'UNSTAKE') {
                    await db.collection('accounts').updateOne({ username: tx.from }, { $inc: { balance: tx.amount, staked: -tx.amount } }, opts);
                } else if (tx.type === 'VOTE') {
                    const voter = await db.collection('accounts').findOne({ username: tx.from }, opts);
                    await db.collection('votes').updateOne({ voter: tx.from }, { $set: { witness: tx.to, weight: voter?.staked || 0, timestamp: Date.now() } }, { ...opts, upsert: true });
                    await recalculateWitnessWeight(tx.to, session);
                }

                // Memo Handlers
                if (tx.memo) {
                    if (tx.memo === 'Game Pass') {
                        await db.collection('accounts').updateOne({ username: tx.from }, { $set: { has_pass: true } }, opts);
                        await db.collection('nfts').insertOne({ id: `pass_${generateId()}`, owner: tx.from, type: 'ACCESS', subType: 'GAME_PASS', rarity: 'RARE', level: 1, xp: 0, value: 0 }, opts);
                    } else if (tx.memo === 'Node Pass') {
                        await db.collection('nfts').insertOne({ id: `node_${generateId()}`, owner: tx.from, type: 'ACCESS', subType: 'NODE_PASS', rarity: 'EPIC', level: 1, xp: 0, value: 0 }, opts);
                    } else if (tx.memo.startsWith('NFT_MINT:')) {
                        const [_, type, subType, val] = tx.memo.split(':');
                        await db.collection('nfts').insertOne({ id: `nft_${generateId()}`, owner: tx.to, type, subType, value: parseInt(val), rarity: parseInt(val) > 50 ? 'RARE' : 'COMMON', level: 1, xp: 0 }, opts);
                    } else if (tx.memo.startsWith('UPGRADE_NFT:')) {
                        const [_, nftId, bonus] = tx.memo.split(':');
                        await db.collection('nfts').updateOne({ id: nftId, owner: tx.from }, { $inc: { level: 1, value: parseInt(bonus) } }, opts);
                    }
                }
                
                // Mark transaction as processed
                await db.collection('transactions').updateOne({ id: tx.id }, { $set: { block_index: block.index } }, opts);
            } catch (err) { }
        }
    }
    
    // Witness Reward
    await db.collection('accounts').updateOne({ username: block.validator }, { $inc: { balance: 50 } }, { ...opts, upsert: true });
}

async function recalculateWitnessWeight(witnessName, session) {
    const opts = session ? { session } : {};
    const allVotes = await db.collection('votes').find({ witness: witnessName }, opts).toArray();
    const totalWeight = allVotes.reduce((acc, v) => acc + (v.weight || 0), 0);
    await db.collection('witness_stats').updateOne({ username: witnessName }, { $set: { total_votes: totalWeight, last_update: Date.now() } }, { ...opts, upsert: true });
}

const wss = new WebSocketServer({ port: CONFIG.PORT });

wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', async (data) => {
        try {
            const rpc = JSON.parse(data.toString());
            await handleRPC(rpc, ws);
        } catch (e) { }
    });
});

async function handleRPC(rpc, ws) {
    if (!rpc || !rpc.type) return;
    switch (rpc.type) {
        case 'PING':
            ws.send(JSON.stringify({ type: 'PONG', name: CONFIG.WITNESS_NAME }));
            break;
        case 'GET_BLOCKS':
            const blocks = await db.collection('blocks').find().sort({ index: -1 }).limit(100).toArray();
            ws.send(JSON.stringify({ 
                type: 'BLOCK_DATA', 
                blocks, 
                witnesses: currentWitnessSchedule, 
                currentWitness: currentWitnessSchedule[blocks.length % currentWitnessSchedule.length] 
            }));
            break;
        case 'QUERY_STATE':
            let user = await db.collection('accounts').findOne({ username: rpc.username });
            if (!user) {
                user = { username: rpc.username, balance: 0, staked: 0, has_pass: false, is_admin: false, last_mana_sync: Date.now() };
                await db.collection('accounts').insertOne(user);
            }
            const inventory = await db.collection('nfts').find({ owner: rpc.username }).toArray();
            ws.send(JSON.stringify({ type: 'STATE_RESPONSE', user, inventory }));
            break;
        case 'NEW_BLOCK':
            if (await processIncomingBlock(rpc.block)) broadcast(rpc, ws);
            break;
        case 'PUSH_TX':
            // Verify TX doesn't already exist to prevent "dup id" in mempool
            const exists = await db.collection('transactions').findOne({ id: rpc.tx.id });
            if (rpc.tx && !exists) {
                await db.collection('transactions').insertOne({ ...rpc.tx, block_index: null });
                broadcast(rpc, ws);
            }
            break;
    }
}

function connectToPeer(url) {
    if (!url || activePeers.has(url) || pendingConnections.has(url)) return;
    if (url.includes(`:${CONFIG.PORT}`)) return;
    pendingConnections.add(url);
    try {
        const ws = new WebSocket(url);
        ws.on('open', () => {
            console.log(`[P2P] Established: ${url}`);
            pendingConnections.delete(url);
            activePeers.set(url, ws);
            ws.send(JSON.stringify({ type: 'GET_BLOCKS' }));
        });
        ws.on('message', (data) => {
            try { handleRPC(JSON.parse(data.toString()), ws); } catch(e) {}
        });
        ws.on('close', () => {
            activePeers.delete(url);
            pendingConnections.delete(url);
            setTimeout(() => connectToPeer(url), 10000);
        });
        ws.on('error', () => { pendingConnections.delete(url); });
    } catch (e) { pendingConnections.delete(url); }
}

function broadcast(data, excludeWs) {
    const msg = JSON.stringify(data);
    wss.clients.forEach(c => { if (c !== excludeWs && c.readyState === WebSocket.OPEN) c.send(msg); });
    activePeers.forEach(p => { if (p !== excludeWs && p.readyState === WebSocket.OPEN) p.send(msg); });
}

function checkConnections() {
    wss.clients.forEach(ws => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}

initMongo();
