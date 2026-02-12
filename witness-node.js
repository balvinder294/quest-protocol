
/**
 * QUEST PROTOCOL | MONGODB CLUSTER NODE v1.8.1
 * STAKE-BASED DPoS CONSENSUS ENGINE
 */

import { WebSocketServer, WebSocket } from 'ws';
import { MongoClient } from 'mongodb';
import minimist from 'minimist';

const argv = minimist(process.argv.slice(2));
const CONFIG = {
    PORT: argv.port || 8089,
    MONGO_URI: argv.mongo || 'mongodb://localhost:27017',
    DB_NAME: `quest_protocol_${argv.name || 'node'}`,
    WITNESS_NAME: argv.name || 'anonymous_node',
    PEER_PORTS: argv.peers ? argv.peers.toString().split(',') : [],
    MAX_WITNESSES: 21,
    GENESIS_VALIDATOR: 'tekraze'
};

let db, client;
let currentWitnessSchedule = [CONFIG.GENESIS_VALIDATOR];

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
        console.log("[MONGO] Genesis autonomous state provisioned.");
    }
    
    await updateWitnessSchedule();
    console.log(`[NODE] Quest Sidechain Engine Active for ${CONFIG.WITNESS_NAME}`);
}

async function updateWitnessSchedule() {
    // Top accounts by "Staked Weight Received" from votes
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
        } catch (e) { console.error("[RPC] Error:", e.message); }
    });
});

async function handleRPC(rpc, ws) {
    if (!rpc || !rpc.type) return;

    const lastBlock = await db.collection('blocks').findOne({}, { sort: { index: -1 } });
    const currentHeight = lastBlock ? lastBlock.index : 0;
    const currentWitness = currentWitnessSchedule[currentHeight % currentWitnessSchedule.length];

    switch (rpc.type) {
        case 'GET_BLOCKS':
            const blocks = await db.collection('blocks').find().sort({ index: -1 }).limit(50).toArray();
            ws.send(JSON.stringify({ 
                type: 'BLOCK_DATA', 
                blocks, 
                witnesses: currentWitnessSchedule, 
                currentWitness 
            }));
            break;

        case 'QUERY_STATE':
            let user = await db.collection('accounts').findOne({ username: rpc.username });
            if (!user) {
                // Initialize new account automatically (On-chain logic)
                user = {
                    username: rpc.username,
                    balance: 0,
                    staked: 0,
                    has_pass: false,
                    is_admin: false,
                    last_mana_sync: Date.now()
                };
                await db.collection('accounts').insertOne(user);
            }
            const inventory = await db.collection('nfts').find({ owner: rpc.username }).toArray();
            ws.send(JSON.stringify({ 
                type: 'STATE_RESPONSE', 
                user: user,
                inventory: inventory || []
            }));
            break;

        case 'NEW_BLOCK':
            // Consensus Enforcer
            if (rpc.block.validator !== currentWitness) {
                console.log(`[CONSENSUS] Block Rejected: Expected ${currentWitness}, got ${rpc.block.validator}`);
                return;
            }
            const success = await processIncomingBlock(rpc.block);
            if (success) {
                await updateWitnessSchedule();
                broadcast({ 
                    ...rpc, 
                    witnesses: currentWitnessSchedule, 
                    currentWitness: currentWitnessSchedule[(rpc.block.index) % currentWitnessSchedule.length] 
                }, ws);
            }
            break;

        case 'PUSH_TX':
            if (rpc.tx) {
              await db.collection('transactions').updateOne(
                  { id: rpc.tx.id },
                  { $set: { ...rpc.tx, block_index: null } },
                  { upsert: true }
              );
              broadcast(rpc, ws);
            }
            break;

        case 'PING':
            ws.send(JSON.stringify({ type: 'PONG', name: CONFIG.WITNESS_NAME }));
            break;
    }
}

async function processIncomingBlock(block) {
    const session = client.startSession();
    try {
        await session.withTransaction(async () => {
            await db.collection('blocks').insertOne(block, { session });

            if (block.transactions) {
                for (const tx of block.transactions) {
                    if (tx.type === 'TRANSFER') {
                        await db.collection('accounts').updateOne({ username: tx.from }, { $inc: { balance: -tx.amount } }, { session });
                        await db.collection('accounts').updateOne({ username: tx.to }, { $inc: { balance: tx.amount } }, { session, upsert: true });
                        
                        // Handle XP Gain rewards via Transfer Logic (Meta-TX)
                        if (tx.memo && tx.memo.startsWith('XP_GAIN:')) {
                            const [_, nftId, xpAmount] = tx.memo.split(':');
                            await db.collection('nfts').updateOne({ id: nftId }, { $inc: { xp: parseInt(xpAmount) } }, { session });
                            // Logic for auto-level up can be added here
                        }
                    } 
                    else if (tx.type === 'STAKE') {
                        await db.collection('accounts').updateOne({ username: tx.from }, { $inc: { balance: -tx.amount, staked: tx.amount } }, { session });
                    }
                    else if (tx.type === 'UNSTAKE') {
                        await db.collection('accounts').updateOne({ username: tx.from }, { $inc: { balance: tx.amount, staked: -tx.amount } }, { session });
                    }
                    else if (tx.type === 'VOTE') {
                        const voter = await db.collection('accounts').findOne({ username: tx.from });
                        const weight = voter ? voter.staked : 0;
                        await db.collection('votes').updateOne(
                            { voter: tx.from }, 
                            { $set: { witness: tx.to, weight: weight, timestamp: Date.now() } }, 
                            { session, upsert: true }
                        );
                        await recalculateWitnessWeight(tx.to, session);
                    }
                    else if (tx.type === 'MINT' && tx.memo && tx.memo.startsWith('NFT_MINT:')) {
                        const [_, type, subType, value] = tx.memo.split(':');
                        const nft = {
                            id: tx.id,
                            owner: tx.to,
                            type: type,
                            subType: subType,
                            value: parseInt(value),
                            rarity: 'COMMON',
                            level: 1,
                            xp: 0
                        };
                        await db.collection('nfts').insertOne(nft, { session });
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
    const allVotesForWitness = await db.collection('votes').find({ witness: witnessName }).toArray();
    const totalWeight = allVotesForWitness.reduce((acc, v) => acc + (v.weight || 0), 0);
    
    await db.collection('witness_stats').updateOne(
        { username: witnessName },
        { $set: { total_votes: totalWeight, last_update: Date.now() } },
        { session, upsert: true }
    );
}

function broadcast(data, excludeWs) {
    const msg = JSON.stringify(data);
    wss.clients.forEach(c => { if (c !== excludeWs && c.readyState === WebSocket.OPEN) c.send(msg); });
}

initMongo();
