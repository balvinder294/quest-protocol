
/**
 * QUEST PROTOCOL | MONGODB CLUSTER NODE v1.9.15
 * ROBUST ED25519 CONSENSUS + VERBOSE DEBUG LOGGING
 */

import 'dotenv/config';
import { WebSocketServer, WebSocket } from 'ws';
import { MongoClient } from 'mongodb';
import minimist from 'minimist';
import nacl from 'tweetnacl';
import pkg from 'tweetnacl-util';
const { decodeBase64, encodeBase64 } = pkg;
import { simpleHash, generateId } from './services/chainUtils.js';

const argv = minimist(process.argv.slice(2));
const CONFIG = {
    PORT: argv.port || 8089,
    MONGO_URI: argv.mongo || 'mongodb://localhost:27017',
    DB_NAME: `quest_protocol_${argv.db || 'node'}`,
    WITNESS_NAME: argv.name || 'tekraze',
    // Support both CLI flag and Environment Variable
    PRIVATE_KEY: (argv.key || process.env.QUEST_PRIVATE_KEY || '').trim(), 
    PEER_URLS: argv.peers ? argv.peers.toString().split(',') : [],
    MAX_WITNESSES: 21,
    MAX_SUPPLY: 1000000000,
    TREASURY: 'PROTOCOL_TREASURY',
    CHAIN_ID: 'quest_mainnet_v1',
    BLOCK_INTERVAL: 3000,
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

// Canonical Serializer for Deterministic Hashing
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

// Utility to ensure we always have a 64-byte Ed25519 Secret Key
function processPrivateKey(base64Key) {
    if (!base64Key) return null;
    try {
        let bytes = decodeBase64(base64Key);
        
        // Case A: 32-byte seed provided -> Expand to 64-byte keypair
        if (bytes.length === 32) {
            return nacl.sign.keyPair.fromSeed(bytes).secretKey;
        }
        
        // Case B: 66-byte or longer (often contains metadata prefix) -> Slice to 64
        if (bytes.length >= 64) {
            return bytes.slice(0, 64);
        }
        
        console.error(`[CRYPTO] Unsupported key length: ${bytes.length} bytes`);
        return null;
    } catch (e) {
        console.error(`[CRYPTO] Failed to decode private key Base64`);
        return null;
    }
}

async function initMongo() {
    try {
        console.log(`[INIT] Connecting to MongoDB: ${CONFIG.MONGO_URI}`);
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

        const treasury = await db.collection('accounts').findOne({ username: CONFIG.TREASURY });
        if (!treasury) {
            await db.collection('accounts').insertOne({ username: CONFIG.TREASURY, balance: 500000000, staked: 0 });
        }

        // AUTO-REGISTER SIGNER KEY
        const secretKey = processPrivateKey(CONFIG.PRIVATE_KEY);
        if (secretKey) {
            const pubKeyBase64 = encodeBase64(secretKey.slice(32));
            await db.collection('accounts').updateOne(
                { username: CONFIG.WITNESS_NAME },
                { $set: { signer_key: pubKeyBase64 } },
                { upsert: true }
            );
            console.log(`[AUTH] Public key derived for @${CONFIG.WITNESS_NAME}: ${pubKeyBase64}`);
        } else if (CONFIG.PRIVATE_KEY) {
            console.error(`[AUTH] FATAL: Invalid key format for @${CONFIG.WITNESS_NAME}`);
        }

        await updateWitnessSchedule();
        CONFIG.PEER_URLS.forEach(url => connectToPeer(url.trim()));
        
        setInterval(attemptBlockProduction, CONFIG.BLOCK_INTERVAL);
        setInterval(checkConnections, 30000);
        setInterval(cleanupCaches, 60000); 
        console.log(`[NODE] Quest Protocol v1.9.15 [DEBUG_MODE]: @${CONFIG.WITNESS_NAME}`);
    } catch (e) {
        console.error("[INIT_ERROR]", e);
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
        const combined = Array.from(new Set([...names, 'tekraze', 'kamranrkploy', 'node_gamma']));
        currentWitnessSchedule = combined.slice(0, CONFIG.MAX_WITNESSES);
        console.log(`[CONSENSUS] Schedule Updated: [${currentWitnessSchedule.join(', ')}]`);
    } catch (e) { 
        console.error(`[CONSENSUS] Failed to update schedule: ${e.message}`);
    }
}

async function maybeUpdateSchedule(blockHeight) {
    if (blockHeight % CONFIG.EPOCH_LENGTH !== 0) return;
    console.log(`[EPOCH] Reaching block ${blockHeight}. Refreshing witness schedule.`);
    await updateWitnessSchedule();
}

async function attemptBlockProduction() {
    try {
        if (!CONFIG.PRIVATE_KEY) {
            console.warn(`[PRODUCER] Block production attempt skipped: No private key found for @${CONFIG.WITNESS_NAME}`);
            return;
        }

        const lastBlock = await db.collection('blocks').findOne({}, { sort: { index: -1 } });
        const nextIndex = (lastBlock ? lastBlock.index : 0) + 1;
        
        if (!currentWitnessSchedule || currentWitnessSchedule.length === 0) {
            console.error(`[PRODUCER] Stalled: Witness schedule is empty.`);
            return;
        }

        const scheduleIndex = nextIndex % currentWitnessSchedule.length;
        const expectedLeader = currentWitnessSchedule[scheduleIndex];

        // Detailed leader tracking
        if (expectedLeader === CONFIG.WITNESS_NAME) {
            console.log(`[DEBUG] It is my turn! Height: ${nextIndex} | Schedule Index: ${scheduleIndex} | Schedule Len: ${currentWitnessSchedule.length}`);
            
            const collision = await db.collection('blocks').findOne({ index: nextIndex });
            if (collision) {
                console.log(`[DEBUG] Collision detected: Block #${nextIndex} already exists in DB.`);
                return;
            }

            console.log(`🧭 Height ${nextIndex} → Producing block...`);
            await produceBlock(nextIndex, lastBlock ? lastBlock.hash : '0'.repeat(64));
        } else {
            // Optional: Comment out if too noisy, but useful to see if the nodes agree on whose turn it is
            // console.log(`[DEBUG] Idle. Height: ${nextIndex} | Next Leader: @${expectedLeader} | Me: @${CONFIG.WITNESS_NAME}`);
        }
    } catch (e) {
        console.error("[PRODUCER_ERROR]", e);
    }
}

async function produceBlock(index, prevHash) {
    try {
        const pendingTxs = await db.collection('transactions').find({ block_index: null }).limit(50).toArray();
        console.log(`[PRODUCER] Sealing block #${index} with ${pendingTxs.length} transactions.`);
        
        const block = { 
            index, 
            previousHash: prevHash, 
            timestamp: Date.now(), 
            validator: CONFIG.WITNESS_NAME, 
            chainId: CONFIG.CHAIN_ID, 
            transactions: pendingTxs 
        };
        
        block.hash = canonicalBlockHash(block);
        
        // ED25519 SIGNING
        const secretKey = processPrivateKey(CONFIG.PRIVATE_KEY);
        if (!secretKey) throw new Error("Invalid private key during production");
        
        const hashBytes = Buffer.from(block.hash);
        const signature = nacl.sign.detached(new Uint8Array(hashBytes), new Uint8Array(secretKey));
        block.witnessSignature = encodeBase64(signature);
        
        console.log(`[PRODUCER] Block #${index} signed. Local Hash: ${block.hash.substring(0, 16)}...`);
        
        const success = await processIncomingBlock(block);
        if (success) {
            console.log(`[PRODUCER] Block #${index} locally committed. Broadcasting to ${activePeers.size} peers.`);
            broadcast({ type: 'NEW_BLOCK', block, witnesses: currentWitnessSchedule });
        } else {
            console.error(`[PRODUCER] Block #${index} failed local commit logic.`);
        }
    } catch (e) {
        console.error(`❌ SIGNING_FAILED for Block #${index}: ${e.message}`);
    }
}

async function processIncomingBlock(block) {
    if (!block || !block.hash) return false;
    
    // Check if we've already handled this specific hash recently
    if (SEEN_BLOCK_HASHES.has(block.hash)) return true;
    
    const latestBlock = await db.collection('blocks').findOne({}, { sort: { index: -1 } });
    const localHeight = latestBlock ? latestBlock.index : 0;
    
    console.log(`[SYNC] Processing Incoming: #${block.index} from @${block.validator} | Local Height: ${localHeight}`);

    if (block.index > localHeight + 1) {
        console.log(`[SYNC] Gap detected! Received #${block.index}, but local height is ${localHeight}. Requesting sync.`);
        broadcast({ type: 'GET_BLOCKS' });
        return false;
    }
    
    if (block.index <= localHeight) {
        console.log(`[SYNC] Block #${block.index} is old. Ignoring.`);
        return true; 
    }

    // Leader Math Validation
    const scheduleIndex = block.index % currentWitnessSchedule.length;
    const expectedLeader = currentWitnessSchedule[scheduleIndex];
    if (block.validator !== expectedLeader) {
        console.error(`[CONSENSUS] REJECTED: Block #${block.index} validator mismatch. Expected: @${expectedLeader}, Got: @${block.validator}`);
        return false;
    }

    // ED25519 SIGNATURE VERIFICATION
    const validatorAccount = await db.collection('accounts').findOne({ username: block.validator });
    if (validatorAccount && validatorAccount.signer_key) {
        if (!block.witnessSignature) {
            console.error(`❌ BLOCK_REJECTED: Missing signature for block #${block.index}`);
            return false;
        }
        try {
            const publicKeyBytes = decodeBase64(validatorAccount.signer_key);
            const signatureBytes = decodeBase64(block.witnessSignature);
            const hashBytes = Buffer.from(block.hash);
            
            const isValid = nacl.sign.detached.verify(
                new Uint8Array(hashBytes), 
                new Uint8Array(signatureBytes), 
                new Uint8Array(publicKeyBytes)
            );
            
            if (!isValid) {
                console.error(`❌ BLOCK_REJECTED: Invalid Ed25519 Signature for #${block.index}`);
                return false;
            }
        } catch (err) {
            console.error(`❌ BLOCK_REJECTED: Signature Decode Error for #${block.index}`);
            return false;
        }
    } else {
        console.warn(`[CONSENSUS] Warning: No signer_key found for validator @${block.validator}. Allowing block (Identity bootstrapping).`);
    }

    const session = !isStandalone ? client.startSession() : null;
    try {
        if (session) {
            await session.withTransaction(async () => { 
                await executeBlockLogic(block, session); 
            });
        } else {
            await executeBlockLogic(block, null);
        }
        
        SEEN_BLOCK_HASHES.add(block.hash);
        console.log(`✅ Block #${block.index} SEALED successfully by @${block.validator}`);
        
        await maybeUpdateSchedule(block.index);
        return true;
    } catch (e) { 
        console.error(`[CONSENSUS] Failed to commit block #${block.index}: ${e.message}`);
        return e.code === 11000; 
    } 
    finally { 
        if (session) await session.endSession(); 
    }
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
            console.log(`[P2P] Connected to Peer: ${url}`);
            ws.send(JSON.stringify({ type: 'GET_BLOCKS' }));
        });
        ws.on('close', () => { 
            activePeers.delete(url); 
            console.log(`[P2P] Peer Disconnected: ${url}. Retrying in 10s...`);
            setTimeout(() => connectToPeer(url), 10000); 
        });
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
