
/**
 * QUEST PROTOCOL | MONGODB CLUSTER NODE v1.8.2
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
    CHAIN_ID: 'quest_mainnet_v1'
};

let db, client;
let currentWitnessSchedule = [CONFIG.GENESIS_VALIDATOR];
let activePeers = new Set();

async function initMongo() {
    client = new MongoClient(CONFIG.MONGO_URI);
    await client.connect();
    db = client.db(CONFIG.DB_NAME);
    
    // Core Indexes
    await db.collection('blocks').createIndex({ index: 1 }, { unique: true });
    await db.collection('accounts').createIndex({ username: 1 }, { unique: true });
    await db.collection('nfts').createIndex({ id: 1 }, { unique: true });
    await db.collection('transactions').createIndex({ id: 1 }, { unique: true });
    await db.collection('votes').createIndex({ voter: 1, witness: 1 }, { unique: true });
    await db.collection('witness_stats').createIndex({ username: 1 }, { unique: true });

    // Genesis setup
    const genesisUser = await db.collection('accounts').findOne({ username: CONFIG.GENESIS_VALIDATOR });
    if (!genesisUser) {
        await db.collection('accounts').insertOne({
            username: CONFIG.GENESIS_VALIDATOR,
            balance: 1000000,
            staked: 10000,
            has_pass: true,
            is_admin: true,
            last_mana_sync: Date.now()
        });
    }
    
    await updateWitnessSchedule();
    connectToPeers();
    startProducerLoop();
    console.log(`[NODE] Quest Sidechain Engine Active: ${CONFIG.WITNESS_NAME} on Port ${CONFIG.PORT}`);
}

/**
 * Headless Production Loop
 * Check every 3 seconds if it's this node's turn to produce a block.
 */
async function startProducerLoop() {
    setInterval(async () => {
        const lastBlock = await db.collection('blocks').findOne({}, { sort: { index: -1 } });
        const nextIndex = lastBlock ? lastBlock.index + 1 : 1;
        const currentWitness = currentWitnessSchedule[(nextIndex - 1) % currentWitnessSchedule.length];

        if (currentWitness === CONFIG.WITNESS_NAME) {
            console.log(`[PRODUCER] It is my turn (${CONFIG.WITNESS_NAME}). Assembling Block #${nextIndex}...`);
            await produceBlock(nextIndex, lastBlock ? lastBlock.hash : '0'.repeat(64));
        }
    }, 3000);
}

async function produceBlock(index, prevHash) {
    // Get pending transactions (not yet in a block)
    const pendingTxs = await db.collection('transactions').find({ block_index: null }).limit(50).toArray();
    
    const blockHeader = {
        index,
        previousHash: prevHash,
        merkleRoot: '0', // Simplified
        timestamp: Date.now(),
        validator: CONFIG.WITNESS_NAME,
        chainId: CONFIG.CHAIN_ID,
        transactions: pendingTxs
    };

    const hash = simpleHash(JSON.stringify(blockHeader));
    const block = { ...blockHeader, hash };

    const success = await processIncomingBlock(block);
    if (success) {
        console.log(`[PRODUCER] Successfully sealed Block #${index}`);
        broadcast({ type: 'NEW_BLOCK', block });
    }
}

async function updateWitnessSchedule() {
    const topWitnesses = await db.collection('witness_stats').find({})
        .sort({ total_votes: -1 })
        .limit(CONFIG.MAX_WITNESSES)
        .toArray();

    if (topWitnesses.length === 0) {
        currentWitnessSchedule = [CONFIG.GENESIS_VALIDATOR];
    } else {
        currentWitnessSchedule = topWitnesses.map(w => w.username);
    }
}

const wss = new WebSocketServer({ port: CONFIG.PORT });

wss.on('connection', (ws) => {
    ws.on('message', async (data) => {
        try {
            const rpc = JSON.parse(data.toString());
            await handleRPC(rpc, ws);
        } catch (e) { }
    });
});

function connectToPeers() {
    CONFIG.PEER_URLS.forEach(url => {
        const ws = new WebSocket(url);
        ws.on('open', () => {
            console.log(`[P2P] Linked to peer: ${url}`);
            activePeers.add(ws);
            ws.send(JSON.stringify({ type: 'GET_BLOCKS' }));
        });
        ws.on('message', (data) => handleRPC(JSON.parse(data.toString()), ws));
        ws.on('close', () => {
            activePeers.delete(ws);
            setTimeout(() => connectToPeers(), 5000);
        });
        ws.on('error', () => {});
    });
}

async function handleRPC(rpc, ws) {
    if (!rpc || !rpc.type) return;

    switch (rpc.type) {
        case 'GET_BLOCKS':
            const blocks = await db.collection('blocks').find().sort({ index: -1 }).limit(50).toArray();
            ws.send(JSON.stringify({ 
                type: 'BLOCK_DATA', 
                blocks, 
                witnesses: currentWitnessSchedule 
            }));
            break;

        case 'QUERY_STATE':
            let user = await db.collection('accounts').findOne({ username: rpc.username });
            if (!user) {
                user = { username: rpc.username, balance: 0, staked: 0, has_pass: false, is_admin: false, last_mana_sync: Date.now() };
                await db.collection('accounts').insertOne(user);
            }
            const nfts = await db.collection('nfts').find({ owner: rpc.username }).toArray();
            ws.send(JSON.stringify({ type: 'STATE_RESPONSE', user, inventory: nfts }));
            break;

        case 'NEW_BLOCK':
            const success = await processIncomingBlock(rpc.block);
            if (success) {
                await updateWitnessSchedule();
                broadcast(rpc, ws);
            }
            break;

        case 'PUSH_TX':
            if (rpc.tx) {
              const exists = await db.collection('transactions').findOne({ id: rpc.tx.id });
              if (!exists) {
                await db.collection('transactions').insertOne({ ...rpc.tx, block_index: null });
                broadcast(rpc, ws);
              }
            }
            break;
    }
}

async function processIncomingBlock(block) {
    const exists = await db.collection('blocks').findOne({ index: block.index });
    if (exists) return false;

    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            await db.collection('blocks').insertOne(block, { session });
            if (block.transactions) {
                for (const tx of block.transactions) {
                    if (tx.type === 'TRANSFER') {
                        await db.collection('accounts').updateOne({ username: tx.from }, { $inc: { balance: -tx.amount } }, { session });
                        await db.collection('accounts').updateOne({ username: tx.to }, { $inc: { balance: tx.amount } }, { session, upsert: true });
                    } else if (tx.type === 'STAKE') {
                        await db.collection('accounts').updateOne({ username: tx.from }, { $inc: { balance: -tx.amount, staked: tx.amount } }, { session });
                    } else if (tx.type === 'UNSTAKE') {
                        await db.collection('accounts').updateOne({ username: tx.from }, { $inc: { balance: tx.amount, staked: -tx.amount } }, { session });
                    } else if (tx.type === 'VOTE') {
                        const voter = await db.collection('accounts').findOne({ username: tx.from });
                        await db.collection('votes').updateOne({ voter: tx.from }, { $set: { witness: tx.to, weight: voter?.staked || 0, timestamp: Date.now() } }, { session, upsert: true });
                        await recalculateWitnessWeight(tx.to, session);
                    }
                    await db.collection('transactions').updateOne({ id: tx.id }, { $set: { block_index: block.index } }, { session });
                }
            }
            await db.collection('accounts').updateOne({ username: block.validator }, { $inc: { balance: 50 } }, { session });
        });
        return true;
    } catch (e) {
        return false;
    } finally {
        await session.endSession();
    }
}

async function recalculateWitnessWeight(witnessName, session) {
    const allVotes = await db.collection('votes').find({ witness: witnessName }).toArray();
    const totalWeight = allVotes.reduce((acc, v) => acc + (v.weight || 0), 0);
    await db.collection('witness_stats').updateOne({ username: witnessName }, { $set: { total_votes: totalWeight, last_update: Date.now() } }, { session, upsert: true });
}

function broadcast(data, excludeWs) {
    const msg = JSON.stringify(data);
    wss.clients.forEach(c => { if (c !== excludeWs && c.readyState === WebSocket.OPEN) c.send(msg); });
    activePeers.forEach(p => { if (p !== excludeWs && p.readyState === WebSocket.OPEN) p.send(msg); });
}

initMongo();
