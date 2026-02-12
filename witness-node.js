
/**
 * QUEST PROTOCOL | MONGODB CLUSTER NODE v1.9.1
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

        // Multi-Account Genesis & Enforced Balance/Passes
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
                console.log(`[INIT] Enforcing balance for default node: @${nodeName}`);
                await db.collection('accounts').updateOne({ username: nodeName }, { $set: { balance: 100000, has_pass: true } });
            }

            // Ensure they have the NODE_PASS NFT so the UI unlocks
            const hasNft = await db.collection('nfts').findOne({ owner: nodeName, subType: 'NODE_PASS' });
            if (!hasNft) {
                console.log(`[INIT] Injecting Witness Module for @${nodeName}`);
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

            // Ensure Witness Stats exist
            const statsExists = await db.collection('witness_stats').findOne({ username: nodeName });
            if (!statsExists) {
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
        
        console.log(`[NODE] Quest Protocol v1.9.1 Online: ${CONFIG.WITNESS_NAME} (Port ${CONFIG.PORT})`);
    } catch (e) {
        console.error(`[CRITICAL] Boot Error: ${e.message}`);
        process.exit(1);
    }
}

async function updateWitnessSchedule() {
    try {
        const topWitnesses = await db.collection('witness_stats')
            .find({})
            .sort({ total_votes: -1 })
            .limit(CONFIG.MAX_WITNESSES)
            .toArray();

        currentWitnessSchedule = topWitnesses.length > 0 
            ? topWitnesses.map(w => w.username) 
            : [CONFIG.GENESIS_VALIDATOR];
    } catch (e) {
        console.error(`[CONSENSUS] Schedule Update Error: ${e.message}`);
    }
}

function startProducerLoop() {
    setInterval(async () => {
        try {
            const lastBlock = await db.collection('blocks').findOne({}, { sort: { index: -1 } });
            const nextIndex = (lastBlock ? lastBlock.index : 0) + 1;
            const scheduleIndex = (nextIndex - 1) % currentWitnessSchedule.length;
            const currentWitness = currentWitnessSchedule[scheduleIndex];

            if (currentWitness === CONFIG.WITNESS_NAME) {
                const collision = await db.collection('blocks').findOne({ index: nextIndex });
                if (collision) return;
                await produceBlock(nextIndex, lastBlock ? lastBlock.hash : '0'.repeat(64));
            }
        } catch (e) {}
    }, 3000);
}

async function produceBlock(index, prevHash) {
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
        console.log(`[PRODUCER] Block #${index} Sealed [${hash.substring(0,8)}]`);
        broadcast({ type: 'NEW_BLOCK', block, witnesses: currentWitnessSchedule });
    }
}

async function processIncomingBlock(block) {
    if (!block || !block.index) return false;
    const existing = await db.collection('blocks').findOne({ index: block.index });
    if (existing) return existing.hash === block.hash;

    if (!isStandalone) {
        const session = client.startSession();
        try {
            await session.withTransaction(async () => {
                await executeBlockLogic(block, session);
            });
            await updateWitnessSchedule();
            return true;
        } catch (e) {
            return e.code === 11000;
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
                // 1. Base Token Movement
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

                // 2. NFT & Pass Logic (Memo Parsing)
                if (tx.memo) {
                    if (tx.memo === 'Game Pass') {
                        await db.collection('accounts').updateOne({ username: tx.from }, { $set: { has_pass: true } }, opts);
                        const nftId = `pass_${generateId()}`;
                        await db.collection('nfts').insertOne({ id: nftId, owner: tx.from, type: 'ACCESS', subType: 'GAME_PASS', rarity: 'RARE', level: 1, xp: 0, value: 0 }, opts);
                    } else if (tx.memo === 'Node Pass') {
                        const nftId = `node_${generateId()}`;
                        await db.collection('nfts').insertOne({ id: nftId, owner: tx.from, type: 'ACCESS', subType: 'NODE_PASS', rarity: 'EPIC', level: 1, xp: 0, value: 0 }, opts);
                    } else if (tx.memo.startsWith('NFT_MINT:')) {
                        const parts = tx.memo.split(':');
                        const type = parts[1];
                        const subType = parts[2];
                        const val = parts[3];
                        const nftId = `nft_${generateId()}`;
                        await db.collection('nfts').insertOne({ id: nftId, owner: tx.to, type, subType, value: parseInt(val), rarity: parseInt(val) > 50 ? 'RARE' : 'COMMON', level: 1, xp: 0 }, opts);
                    } else if (tx.memo.startsWith('UPGRADE_NFT:')) {
                        const [_, nftId, bonus] = tx.memo.split(':');
                        await db.collection('nfts').updateOne({ id: nftId, owner: tx.from }, { $inc: { level: 1, value: parseInt(bonus) } }, opts);
                    } else if (tx.memo.startsWith('PROMOTE_NFT:')) {
                        const [_, nftId, newSubType] = tx.memo.split(':');
                        await db.collection('nfts').updateOne({ id: nftId, owner: tx.from }, { $set: { subType: newSubType, rarity: 'EPIC' } }, opts);
                    } else if (tx.memo.startsWith('XP_GAIN:')) {
                        const [_, nftId, amt] = tx.memo.split(':');
                        await db.collection('nfts').updateOne({ id: nftId }, { $inc: { xp: parseInt(amt) } }, opts);
                    }
                }
                await db.collection('transactions').updateOne({ id: tx.id }, { $set: { block_index: block.index } }, opts);
            } catch (err) {}
        }
    }
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
            ws.send(JSON.stringify({ type: 'BLOCK_DATA', blocks, witnesses: currentWitnessSchedule, currentWitness: currentWitnessSchedule[(blocks.length) % currentWitnessSchedule.length] }));
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
            if (rpc.tx && !(await db.collection('transactions').findOne({ id: rpc.tx.id }))) {
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
