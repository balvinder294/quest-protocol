
/**
 * QUEST PROTOCOL | MONGODB CLUSTER NODE v1.8.5
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
let isStandalone = false;

async function initMongo() {
    try {
        client = new MongoClient(CONFIG.MONGO_URI);
        await client.connect();
        db = client.db(CONFIG.DB_NAME);
        
        // Check if replica set (for transactions)
        try {
            const isMaster = await db.command({ isMaster: 1 });
            isStandalone = !isMaster.setName;
        } catch (e) {
            isStandalone = true;
        }

        if (isStandalone) {
            console.warn(`[DB] WARN: Standalone MongoDB. Using linear processing (Standard Mode).`);
        }

        // Core Indexes
        await db.collection('blocks').createIndex({ index: 1 }, { unique: true });
        await db.collection('blocks').createIndex({ hash: 1 }, { unique: true });
        await db.collection('accounts').createIndex({ username: 1 }, { unique: true });
        await db.collection('nfts').createIndex({ id: 1 }, { unique: true });
        await db.collection('transactions').createIndex({ id: 1 }, { unique: true });
        await db.collection('votes').createIndex({ voter: 1, witness: 1 }, { unique: true });
        await db.collection('witness_stats').createIndex({ username: 1 }, { unique: true });

        // Genesis setup
        const genesisUser = await db.collection('accounts').findOne({ username: CONFIG.GENESIS_VALIDATOR });
        if (!genesisUser) {
            console.log(`[INIT] Provisioning Genesis Validator: @${CONFIG.GENESIS_VALIDATOR}`);
            await db.collection('accounts').insertOne({
                username: CONFIG.GENESIS_VALIDATOR,
                balance: 1000000,
                staked: 10000,
                has_pass: true,
                is_admin: true,
                last_mana_sync: Date.now()
            });
            await db.collection('witness_stats').insertOne({
                username: CONFIG.GENESIS_VALIDATOR,
                total_votes: 10000,
                last_update: Date.now()
            });
        }
        
        await updateWitnessSchedule();
        connectToPeers();
        startProducerLoop();
        console.log(`[NODE] Quest Sidechain Engine Active: ${CONFIG.WITNESS_NAME} on Port ${CONFIG.PORT}`);
    } catch (e) {
        console.error(`[CRITICAL] DB Initialization failed: ${e.message}`);
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

        if (topWitnesses.length > 0) {
            currentWitnessSchedule = topWitnesses.map(w => w.username);
        } else {
            currentWitnessSchedule = [CONFIG.GENESIS_VALIDATOR];
        }
        console.log(`[CONSENSUS] Witness Schedule Updated: ${currentWitnessSchedule.join(', ')}`);
    } catch (e) {
        console.error(`[CONSENSUS] Failed to update schedule: ${e.message}`);
    }
}

async function startProducerLoop() {
    setInterval(async () => {
        try {
            const lastBlock = await db.collection('blocks').findOne({}, { sort: { index: -1 } });
            const nextIndex = lastBlock ? lastBlock.index + 1 : 1;
            
            const scheduleIndex = (nextIndex - 1) % currentWitnessSchedule.length;
            const currentWitness = currentWitnessSchedule[scheduleIndex];

            if (currentWitness === CONFIG.WITNESS_NAME) {
                console.log(`[PRODUCER] My turn (${CONFIG.WITNESS_NAME}). Assembling Block #${nextIndex}...`);
                await produceBlock(nextIndex, lastBlock ? lastBlock.hash : '0'.repeat(64));
            }
        } catch (e) {
            console.error(`[PRODUCER] Loop error: ${e.message}`);
        }
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

    const success = await processIncomingBlock(block);
    if (success) {
        console.log(`[PRODUCER] Block #${index} Sealed [${hash.substring(0,8)}...]`);
        broadcast({ type: 'NEW_BLOCK', block });
    }
}

async function processIncomingBlock(block) {
    // Check by index OR hash to prevent duplicates/forks
    const exists = await db.collection('blocks').findOne({ 
        $or: [{ index: block.index }, { hash: block.hash }] 
    });
    
    if (exists) {
        if (exists.hash !== block.hash && exists.index === block.index) {
             console.warn(`[BLOCK] Fork rejected at #${block.index}. Local hash: ${exists.hash.substring(0,8)}, Peer hash: ${block.hash.substring(0,8)}`);
        }
        return false;
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
            console.error(`[BLOCK] Transaction failed: ${e.message}`);
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
            console.error(`[BLOCK] Linear processing failed: ${e.message}`);
            return false;
        }
    }
}

async function executeBlockLogic(block, session) {
    const opts = session ? { session } : {};
    
    // CRITICAL: Strip internal _id to prevent E11000 duplicate key errors during P2P sync
    const blockData = { ...block };
    delete blockData._id;
    
    await db.collection('blocks').insertOne(blockData, opts);
    
    if (block.transactions) {
        for (const tx of block.transactions) {
            try {
                if (tx.type === 'TRANSFER') {
                    await db.collection('accounts').updateOne({ username: tx.from }, { $inc: { balance: -tx.amount } }, opts);
                    await db.collection('accounts').updateOne({ username: tx.to }, { $inc: { balance: tx.amount } }, { ...opts, upsert: true });
                } else if (tx.type === 'STAKE') {
                    await db.collection('accounts').updateOne({ username: tx.from }, { $inc: { balance: -tx.amount, staked: tx.amount } }, opts);
                } else if (tx.type === 'UNSTAKE') {
                    await db.collection('accounts').updateOne({ username: tx.from }, { $inc: { balance: tx.amount, staked: -tx.amount } }, opts);
                } else if (tx.type === 'VOTE') {
                    const voter = await db.collection('accounts').findOne({ username: tx.from }, opts);
                    await db.collection('votes').updateOne(
                        { voter: tx.from }, 
                        { $set: { witness: tx.to, weight: voter?.staked || 0, timestamp: Date.now() } }, 
                        { ...opts, upsert: true }
                    );
                    await recalculateWitnessWeight(tx.to, session);
                }
                await db.collection('transactions').updateOne({ id: tx.id }, { $set: { block_index: block.index } }, opts);
            } catch (txError) {
                console.error(`[TX] Failed to process ${tx.id}: ${txError.message}`);
            }
        }
    }
    
    await db.collection('accounts').updateOne(
        { username: block.validator }, 
        { $inc: { balance: 50 } }, 
        { ...opts, upsert: true }
    );
}

async function recalculateWitnessWeight(witnessName, session) {
    const opts = session ? { session } : {};
    const allVotes = await db.collection('votes').find({ witness: witnessName }, opts).toArray();
    const totalWeight = allVotes.reduce((acc, v) => acc + (v.weight || 0), 0);
    await db.collection('witness_stats').updateOne(
        { username: witnessName }, 
        { $set: { total_votes: totalWeight, last_update: Date.now() } }, 
        { ...opts, upsert: true }
    );
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

async function handleRPC(rpc, ws) {
    if (!rpc || !rpc.type) return;

    switch (rpc.type) {
        case 'GET_BLOCKS':
            const blocks = await db.collection('blocks').find().sort({ index: -1 }).limit(50).toArray();
            ws.send(JSON.stringify({ 
                type: 'BLOCK_DATA', 
                blocks, 
                witnesses: currentWitnessSchedule,
                currentWitness: currentWitnessSchedule[(blocks.length) % currentWitnessSchedule.length]
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

function connectToPeers() {
    CONFIG.PEER_URLS.forEach(url => {
        if (!url) return;
        try {
            const ws = new WebSocket(url);
            ws.on('open', () => {
                console.log(`[P2P] Linked to peer: ${url}`);
                activePeers.add(ws);
                ws.send(JSON.stringify({ type: 'GET_BLOCKS' }));
            });
            ws.on('message', (data) => {
                try {
                    handleRPC(JSON.parse(data.toString()), ws);
                } catch(e) {}
            });
            ws.on('close', () => {
                activePeers.delete(ws);
                setTimeout(() => connectToPeers(), 5000);
            });
            ws.on('error', () => {});
        } catch (e) {}
    });
}

function broadcast(data, excludeWs) {
    const msg = JSON.stringify(data);
    wss.clients.forEach(c => { if (c !== excludeWs && c.readyState === WebSocket.OPEN) c.send(msg); });
    activePeers.forEach(p => { if (p !== excludeWs && p.readyState === WebSocket.OPEN) p.send(msg); });
}

initMongo();
