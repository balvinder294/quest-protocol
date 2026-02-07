import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { 
  ChainState, Block, Transaction, UserState, SimulationNFT,
  ADMIN_USER, ADMIN_PREFIX, GAME_PASS_COST, NODE_PASS_COST,
  LOGIN_BONUS, CHAIN_ID, BURN_ACCOUNT, MANA_REGEN_HOURS, PROTOCOL_ID, P2P_GATEWAY
} from '../types';
import { simpleHash, generateId, calculateMerkleRoot, validateBlock } from '../services/chainUtils';
import { checkBlurtAccount, verifyBlurtTransaction, authenticateWithWhaleVault, anchorBlockToBlurt, fetchMainnetHistory } from '../services/blurtService';
import { initDB, saveDB, getDb, exportSnapshot, importSnapshot } from '../services/sqliteService';

type AuthMethod = 'WHALEVAULT' | 'POSTING_KEY' | 'MNEMONIC';

interface ChainContextType {
  chain: ChainState;
  user: UserState;
  isLoading: boolean;
  login: (username: string, method: AuthMethod, key?: string) => Promise<{success: boolean, msg: string}>;
  logout: () => void;
  sendTransaction: (to: string, amount: number, memo?: string) => void;
  mineBlock: () => Promise<void>;
  buyGamePass: () => void;
  mintNodePass: () => void;
  claimBlurtDeposit: (txId: string) => Promise<{success: boolean, msg: string}>;
  syncWithBlurt: () => Promise<void>;
  voteForWitness: (witness: string) => void;
  stakeTokens: (amount: number) => void;
  unstakeTokens: (amount: number) => void;
  addGameReward: (amount: number, game: string) => void;
  provisionNFT: (type: any, subType: string, value: number, cost?: number) => void;
  upgradeNFT: (nftId: string, cost: number, bonus: number) => void;
  promoteNFT: (nftId: string, newSubType: string, cost: number) => void;
  addNFTExperience: (nftId: string, amount: number) => void;
  activateNode: () => void;
  createSnapshot: () => void;
  restoreSnapshot: (file: File) => Promise<void>;
  swapTokens: (amount: number, direction: 'IN' | 'OUT') => void;
  mintTokens: (amount: number, to?: string) => void;
  authMethod: AuthMethod | null;
}

const ChainContext = createContext<ChainContextType | undefined>(undefined);

export const useChain = () => {
  const context = useContext(ChainContext);
  if (!context) throw new Error("useChain must be used within a ChainProvider");
  return context;
};

export const ChainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chain, setChain] = useState<ChainState>({
    blocks: [], pendingTransactions: [], totalSupply: 0, totalBurned: 0, accounts: {}, passes: {}, witnesses: [], currentWitness: '', isSyncing: false, isP2PConnected: false
  });

  const [user, setUser] = useState<UserState>({
    username: null, balance: 0, stakedBalance: 0, mana: 100, maxMana: 100, hasGamePass: false, isAdmin: false, inventory: [], nodeActiveUntil: 0
  });

  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const chainRef = useRef(chain);

  useEffect(() => {
    chainRef.current = chain;
  }, [chain]);

  const refreshState = () => {
    const db = getDb();
    if (!db) return;

    try {
      const usersRes = db.exec("SELECT * FROM users");
      const accounts: Record<string, number> = {};
      const passes: Record<string, boolean> = {};
      if (usersRes && usersRes.length > 0) {
        usersRes[0].values.forEach((row: any) => {
          accounts[row[0]] = (row[1] || 0) + (row[2] || 0);
          if (row[5] === 1) passes[row[0]] = true;
        });
      }

      const witnessesRes = db.exec("SELECT username FROM witnesses WHERE active = 1 ORDER BY votes DESC, username ASC");
      const witnesses = witnessesRes && witnessesRes.length > 0 ? witnessesRes[0].values.map(r => r[0] as string) : [ADMIN_USER];

      const blocksRes = db.exec("SELECT * FROM blocks ORDER BY index_id ASC");
      const blocks: Block[] = [];
      if (blocksRes && blocksRes.length > 0) {
        blocksRes[0].values.forEach((row: any) => {
          blocks.push({
            index: row[0], hash: row[1], previousHash: row[2], validator: row[3], timestamp: row[4], 
            merkleRoot: row[8], chainId: row[9], blurtAnchorId: row[6], transactions: JSON.parse(row[7] || '[]')
          });
        });
      }

      const pendingRes = db.exec("SELECT * FROM transactions WHERE block_index IS NULL");
      const pendingTransactions: Transaction[] = [];
      if (pendingRes?.[0]?.values) {
        pendingRes[0].values.forEach((row: any) => {
          pendingTransactions.push({ id: row[0], from: row[1], to: row[2], amount: row[3], type: row[4] as any, timestamp: row[5], memo: row[6], signature: row[7] });
        });
      }

      const burnedRes = db.exec(`SELECT balance FROM users WHERE username = '${BURN_ACCOUNT}'`);
      const totalBurnedCount = (burnedRes?.[0]?.values?.[0]) ? burnedRes[0].values[0][0] as number : 0;

      const activeUser = user.username || localStorage.getItem('quest_session_user');
      const inventory: SimulationNFT[] = [];
      if (activeUser) {
        const inventoryRes = db.exec(`SELECT * FROM nfts WHERE owner = '${activeUser}'`);
        if (inventoryRes?.[0]?.values) {
          inventoryRes[0].values.forEach((row: any) => {
            inventory.push({
              id: row[0], owner: row[1], type: row[2], subType: row[3], value: row[4], rarity: row[5], level: row[6], xp: row[7]
            });
          });
        }
      }

      const nextChain = {
        ...chainRef.current,
        blocks, pendingTransactions, totalBurned: totalBurnedCount, accounts, passes, witnesses,
        totalSupply: Object.values(accounts).reduce((a, b) => a + b, 0),
        currentWitness: witnesses[blocks.length % witnesses.length] || witnesses[0]
      };
      
      setChain(nextChain);

      if (activeUser) {
        const uRes = db.exec(`SELECT balance, staked_balance, mana, last_mana_sync, has_pass, is_admin, last_node_activation FROM users WHERE username = '${activeUser}'`);
        if (uRes?.[0]?.values?.[0]) {
          const row = uRes[0].values[0];
          const maxManaVal = Math.max(100, (row[0] as number) + (row[1] as number));
          const elapsed = (Date.now() - (row[3] as number)) / 1000;
          const currentMana = Math.min(maxManaVal, (row[2] as number) + (elapsed * (maxManaVal / (MANA_REGEN_HOURS * 3600))));
          
          setUser(prev => ({ 
            ...prev, username: activeUser, balance: row[0], stakedBalance: row[1], mana: currentMana, maxMana: maxManaVal,
            hasGamePass: row[4] === 1, isAdmin: row[5] === 1, nodeActiveUntil: (row[6] as number) + (24 * 3600 * 1000),
            inventory
          }));
        }
      }
    } catch (e) { console.error("Refresh Error", e); }
  };

  const connectP2P = () => {
    if (wsRef.current) wsRef.current.close();
    
    try {
      const ws = new WebSocket(P2P_GATEWAY);
      wsRef.current = ws;

      ws.onopen = () => {
        setChain(prev => ({ ...prev, isP2PConnected: true }));
        ws.send(JSON.stringify({ type: 'GET_BLOCKS' }));
      };

      ws.onclose = () => {
        setChain(prev => ({ ...prev, isP2PConnected: false }));
        setTimeout(connectP2P, 5000); 
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const db = getDb();
          if (!db) return;

          switch(msg.type) {
            case 'NEW_BLOCK':
              const lastBlock = chainRef.current.blocks[chainRef.current.blocks.length - 1];
              const validation = validateBlock(msg.block, lastBlock, chainRef.current.witnesses);
              
              if (validation.valid) {
                db.run(`INSERT OR IGNORE INTO blocks (index_id, hash, prev_hash, validator, timestamp, witness_sig, merkle_root, chain_id, tx_count, block_data) 
                        VALUES (${msg.block.index}, '${msg.block.hash}', '${msg.block.previousHash}', '${msg.block.validator}', ${msg.block.timestamp}, '${msg.block.witnessSignature || ""}', '${msg.block.merkleRoot}', '${msg.block.chainId}', ${msg.block.transactions.length}, '${JSON.stringify(msg.block.transactions)}')`);
                saveDB();
                refreshState();
              } else {
                console.warn("[P2P] Rejected Block:", validation.error);
              }
              break;
            case 'NEW_TRANSACTION':
              db.run(`INSERT OR IGNORE INTO transactions (id, from_user, to_user, amount, type, timestamp, memo) 
                      VALUES ('${msg.tx.id}', '${msg.tx.from}', '${msg.tx.to}', ${msg.tx.amount}, '${msg.tx.type}', ${msg.tx.timestamp}, '${msg.tx.memo || ""}')`);
              refreshState();
              break;
            case 'BLOCK_DATA':
              // Batch validation for sync
              let currentTip = chainRef.current.blocks[chainRef.current.blocks.length - 1];
              msg.data.sort((a: any, b: any) => a.index_id - b.index_id).forEach((block: any) => {
                 // Convert DB row format to block object for validator
                 const blockObj = {
                   index: block.index_id, hash: block.hash, previousHash: block.prev_hash,
                   validator: block.validator, timestamp: block.timestamp, merkleRoot: block.merkle_root,
                   chainId: block.chain_id, transactions: JSON.parse(block.block_data || '[]')
                 };
                 if (validateBlock(blockObj, currentTip, chainRef.current.witnesses).valid) {
                    db.run(`INSERT OR IGNORE INTO blocks (index_id, hash, prev_hash, validator, timestamp, witness_sig) 
                        VALUES (${block.index_id}, '${block.hash}', '${block.prev_hash}', '${block.validator}', ${block.timestamp}, '${block.witness_sig}')`);
                    currentTip = blockObj;
                 }
              });
              saveDB();
              refreshState();
              break;
          }
        } catch (e) { console.error("P2P Message Error", e); }
      };
    } catch (e) { console.error("P2P Connection Error", e); }
  };

  useEffect(() => {
    initDB().then(() => {
      const savedUser = localStorage.getItem('quest_session_user');
      if (savedUser) setUser(p => ({ ...p, username: savedUser }));
      setIsLoading(false);
      refreshState();
      connectP2P();
    });
  }, []);

  const syncWithBlurt = async () => {
    setChain(prev => ({ ...prev, isSyncing: true }));
    const db = getDb();
    if (!db) return;

    try {
      const targets = [ADMIN_USER, ...chainRef.current.witnesses];
      const uniqueTargets = Array.from(new Set(targets));
      let foundBlocks: any[] = [];

      for (const target of uniqueTargets) {
        const history = await fetchMainnetHistory(target);
        history.forEach(item => {
          const op = item[1].op;
          if (op[0] === 'custom_json' && op[1].id === PROTOCOL_ID) {
            try {
              const header = JSON.parse(op[1].json);
              header.blurtAnchorId = item[1].trx_id;
              foundBlocks.push(header);
            } catch (e) { }
          }
        });
      }

      // Sort by index and validate link before insert
      foundBlocks.sort((a, b) => a.index - b.index);
      let tip = chainRef.current.blocks[chainRef.current.blocks.length - 1];

      foundBlocks.forEach(block => {
        if (validateBlock(block, tip, chainRef.current.witnesses).valid) {
          db.run(`INSERT OR IGNORE INTO blocks (index_id, hash, prev_hash, validator, timestamp, witness_sig, merkle_root, chain_id, tx_count, block_data) 
                  VALUES (${block.index}, '${block.hash}', '${block.previousHash}', '${block.validator}', ${block.timestamp}, '${block.blurtAnchorId}', '${block.merkleRoot}', '${block.chainId}', ${block.transactions?.length || 0}, '${JSON.stringify(block.transactions || [])}')`);
          tip = block;
        }
      });

      saveDB();
      refreshState();
    } finally {
      setChain(prev => ({ ...prev, isSyncing: false }));
    }
  };

  const login = async (input: string, method: AuthMethod, key?: string): Promise<{success: boolean, msg: string}> => {
    setIsLoading(true);
    const db = getDb();
    if (!db) return { success: false, msg: "DB error" };

    try {
      const username = input.startsWith(ADMIN_PREFIX) ? input.substring(1).toLowerCase().trim() : input.toLowerCase().trim();
      let verified = false;

      if (method === 'WHALEVAULT') {
        const auth = await authenticateWithWhaleVault(username);
        if (auth.success) verified = true;
        else return { success: false, msg: auth.message };
      } else {
        const exists = await checkBlurtAccount(username);
        if (exists) verified = true;
        else return { success: false, msg: "Account not found on Blurt" };
      }

      if (verified) {
        db.run(`INSERT OR IGNORE INTO users (username, balance, mana, last_mana_sync, is_admin) VALUES ('${username}', ${LOGIN_BONUS}, 100, ${Date.now()}, ${username === ADMIN_USER ? 1 : 0})`);
        localStorage.setItem('quest_session_user', username);
        setAuthMethod(method);
        setUser(prev => ({ ...prev, username }));
        saveDB();
        refreshState();
        setTimeout(() => syncWithBlurt(), 500);
        return { success: true, msg: "Uplink Secure." };
      }
      return { success: false, msg: "Verification failed" };
    } catch (e: any) {
      return { success: false, msg: e.message || "Auth Error" };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('quest_session_user');
    window.location.reload();
  };

  const sendTransaction = (to: string, amount: number, memo: string = '') => {
    const db = getDb();
    if (!db || !user.username || user.balance < amount) return;

    const tx: Transaction = {
      id: `tx_${generateId()}`,
      from: user.username,
      to,
      amount,
      type: 'TRANSFER',
      timestamp: Date.now(),
      memo
    };

    db.run(`UPDATE users SET balance = balance - ${amount} WHERE username = '${user.username}'`);
    db.run(`UPDATE users SET balance = balance + ${amount} WHERE username = '${to}'`);
    db.run(`INSERT INTO transactions (id, from_user, to_user, amount, type, timestamp, memo) 
            VALUES ('${tx.id}', '${tx.from}', '${tx.to}', ${tx.amount}, '${tx.type}', ${tx.timestamp}, '${tx.memo}')`);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'NEW_TRANSACTION', tx }));
    }

    saveDB();
    refreshState();
  };

  const mineBlock = async () => {
    const db = getDb();
    if (!db || !user.username || user.username !== chain.currentWitness) return;

    const pendingRes = db.exec("SELECT * FROM transactions WHERE block_index IS NULL");
    const transactions: Transaction[] = (pendingRes?.[0]?.values || []).map((row: any) => ({
      id: row[0], from: row[1], to: row[2], amount: row[3], type: row[4], timestamp: row[5], memo: row[6], signature: row[7]
    }));

    const blockIndex = chainRef.current.blocks.length + 1;
    const prevHash = chainRef.current.blocks[chainRef.current.blocks.length - 1]?.hash || '0'.repeat(64);
    const merkleRoot = calculateMerkleRoot(transactions);
    const timestamp = Date.now();
    
    const blockHeader = {
      index: blockIndex,
      previousHash: prevHash,
      merkleRoot,
      timestamp,
      validator: user.username,
      chainId: CHAIN_ID
    };

    const hash = simpleHash(JSON.stringify(blockHeader));
    
    // Validate locally before anchoring
    const localValidation = validateBlock({ ...blockHeader, hash }, chainRef.current.blocks[chainRef.current.blocks.length - 1], chainRef.current.witnesses);
    if (!localValidation.valid) {
      alert("Mining Interrupted: " + localValidation.error);
      return;
    }

    const anchor = await anchorBlockToBlurt(user.username, { ...blockHeader, hash });
    if (!anchor.success) {
      alert(anchor.message);
      return;
    }

    const fullBlock: Block = { ...blockHeader, hash, witnessSignature: anchor.txId, transactions };

    db.run(`INSERT INTO blocks (index_id, hash, prev_hash, validator, timestamp, merkle_root, chain_id, witness_sig, tx_count, block_data) 
            VALUES (${blockIndex}, '${hash}', '${prevHash}', '${user.username}', ${timestamp}, '${merkleRoot}', '${CHAIN_ID}', '${anchor.txId || ""}', ${transactions.length}, '${JSON.stringify(transactions)}')`);
    
    db.run(`UPDATE transactions SET block_index = ${blockIndex} WHERE block_index IS NULL`);
    db.run(`UPDATE users SET balance = balance + 50 WHERE username = '${user.username}'`);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'NEW_BLOCK', block: fullBlock }));
    }

    saveDB();
    refreshState();
    alert(`Block #${blockIndex} ANCHORED to Blurt & Broadcasted to P2P.`);
  };

  const buyGamePass = () => {
    const db = getDb();
    if (!db || !user.username || user.balance < GAME_PASS_COST) return;
    db.run(`UPDATE users SET balance = balance - ${GAME_PASS_COST}, has_pass = 1 WHERE username = '${user.username}'`);
    db.run(`UPDATE users SET balance = balance + ${GAME_PASS_COST} WHERE username = 'PROTOCOL_TREASURY'`);
    db.run(`INSERT INTO transactions (id, from_user, to_user, amount, type, timestamp, memo) VALUES ('tx_${generateId()}', '${user.username}', 'PROTOCOL_TREASURY', ${GAME_PASS_COST}, 'FEE', ${Date.now()}, 'Game Pass')`);
    saveDB();
    refreshState();
  };

  const mintNodePass = () => {
    const db = getDb();
    if (!db || !user.username || user.balance < NODE_PASS_COST) return;
    db.run(`INSERT INTO nfts (id, owner, type, sub_type, value, rarity) VALUES ('NFT_${generateId()}', '${user.username}', 'ACCESS', 'NODE_PASS', 0, 'RARE')`);
    db.run(`UPDATE users SET balance = balance - ${NODE_PASS_COST} WHERE username = '${user.username}'`);
    saveDB();
    refreshState();
  };

  const claimBlurtDeposit = async (txId: string): Promise<{success: boolean, msg: string}> => {
    if (!user.username) return { success: false, msg: "Not logged in" };
    const verification = await verifyBlurtTransaction(txId, user.username);
    if (verification.success) {
      const db = getDb();
      if (!db) return { success: false, msg: "DB error" };
      const amount = verification.amount * 10;
      db.run(`UPDATE users SET balance = balance + ${amount} WHERE username = '${user.username}'`);
      db.run(`INSERT INTO transactions (id, from_user, to_user, amount, type, timestamp, memo) VALUES ('tx_${generateId()}', 'BRIDGE', '${user.username}', ${amount}, 'MINT', ${Date.now()}, 'Bridge Deposit: ${txId}')`);
      saveDB();
      refreshState();
      return { success: true, msg: `Verified! Credited ${amount} QUEST` };
    }
    return { success: false, msg: verification.message };
  };

  const voteForWitness = (witness: string) => {
    const db = getDb();
    if (!db || !user.username) return;
    db.run(`INSERT OR IGNORE INTO witnesses (username, votes) VALUES ('${witness}', 0)`);
    db.run(`UPDATE witnesses SET votes = votes + ${user.stakedBalance || 1} WHERE username = '${witness}'`);
    saveDB();
    refreshState();
  };

  const stakeTokens = (amount: number) => {
    const db = getDb();
    if (!db || !user.username || user.balance < amount) return;
    db.run(`UPDATE users SET balance = balance - ${amount}, staked_balance = staked_balance + ${amount} WHERE username = '${user.username}'`);
    db.run(`INSERT INTO transactions (id, from_user, to_user, amount, type, timestamp, memo) VALUES ('tx_${generateId()}', '${user.username}', '${user.username}', ${amount}, 'STAKE', ${Date.now()}, 'Power Up')`);
    saveDB();
    refreshState();
  };

  const unstakeTokens = (amount: number) => {
    const db = getDb();
    if (!db || !user.username || user.stakedBalance < amount) return;
    db.run(`UPDATE users SET balance = balance + ${amount}, staked_balance = staked_balance - ${amount} WHERE username = '${user.username}'`);
    db.run(`INSERT INTO transactions (id, from_user, to_user, amount, type, timestamp, memo) VALUES ('tx_${generateId()}', '${user.username}', '${user.username}', ${amount}, 'UNSTAKE', ${Date.now()}, 'Power Down')`);
    saveDB();
    refreshState();
  };

  const addGameReward = (amount: number, game: string) => {
    const db = getDb();
    if (!db || !user.username) return;
    db.run(`UPDATE users SET balance = balance + ${amount} WHERE username = '${user.username}'`);
    db.run(`INSERT INTO transactions (id, from_user, to_user, amount, type, timestamp, memo) 
            VALUES ('tx_${generateId()}', 'PROTOCOL_TREASURY', '${user.username}', ${amount}, 'REWARD', ${Date.now()}, 'Game: ${game}')`);
    saveDB();
    refreshState();
  };

  const provisionNFT = (type: any, subType: string, value: number, cost: number = 0) => {
    const db = getDb();
    if (!db || !user.username || user.balance < cost) return;
    const id = generateId();
    const rarity = cost >= 1000 ? 'EPIC' : cost > 0 ? 'RARE' : 'COMMON';
    db.run(`INSERT INTO nfts (id, owner, type, sub_type, value, rarity) VALUES ('${id}', '${user.username}', '${type}', '${subType}', ${value}, '${rarity}')`);
    if (cost > 0) db.run(`UPDATE users SET balance = balance - ${cost} WHERE username = '${user.username}'`);
    saveDB();
    refreshState();
  };

  const upgradeNFT = (nftId: string, cost: number, bonus: number) => {
    const db = getDb();
    if (!db || !user.username || user.balance < cost) return;
    db.run(`UPDATE nfts SET level = level + 1, value = value + ${bonus} WHERE id = '${nftId}'`);
    db.run(`UPDATE users SET balance = balance - ${cost} WHERE username = '${user.username}'`);
    saveDB();
    refreshState();
  };

  const promoteNFT = (nftId: string, newSubType: string, cost: number) => {
    const db = getDb();
    if (!db || !user.username || user.balance < cost) return;
    db.run(`UPDATE nfts SET sub_type = '${newSubType}', rarity = 'EPIC' WHERE id = '${nftId}'`);
    db.run(`UPDATE users SET balance = balance - ${cost} WHERE username = '${user.username}'`);
    saveDB();
    refreshState();
  };

  const addNFTExperience = (nftId: string, amount: number) => {
    const db = getDb();
    if (!db) return;
    db.run(`UPDATE nfts SET xp = xp + ${amount} WHERE id = '${nftId}'`);
    const res = db.exec(`SELECT xp, level FROM nfts WHERE id = '${nftId}'`);
    if (res?.[0]?.values?.[0]) {
      const xp = res[0].values[0][0] as number;
      const lvl = res[0].values[0][1] as number;
      if (xp >= lvl * 100) {
        db.run(`UPDATE nfts SET level = level + 1, xp = xp - ${lvl * 100}, value = value + 5 WHERE id = '${nftId}'`);
      }
    }
    saveDB();
    refreshState();
  };

  const activateNode = () => {
    const db = getDb();
    if (!db || !user.username) return;
    db.run(`UPDATE users SET last_node_activation = ${Date.now()} WHERE username = '${user.username}'`);
    saveDB();
    refreshState();
  };

  const createSnapshot = () => {
    const data = exportSnapshot();
    if (data) {
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quest_snap_${Date.now()}.qps`;
      a.click();
    }
  };

  const restoreSnapshot = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      await importSnapshot(data);
    };
    reader.readAsArrayBuffer(file);
  };

  const swapTokens = (amount: number, direction: 'IN' | 'OUT') => {
    const db = getDb();
    if (!db || !user.username) return;
    const rate = 10;
    if (direction === 'IN') {
      const received = amount * rate;
      db.run(`UPDATE users SET balance = balance + ${received} WHERE username = '${user.username}'`);
      db.run(`INSERT INTO transactions (id, from_user, to_user, amount, type, timestamp, memo) VALUES ('tx_${generateId()}', 'BRIDGE', '${user.username}', ${received}, 'MINT', ${Date.now()}, 'Atomic Swap In')`);
    } else {
      if (user.balance < amount) return;
      db.run(`UPDATE users SET balance = balance - ${amount} WHERE username = '${user.username}'`);
      db.run(`INSERT INTO transactions (id, from_user, to_user, amount, type, timestamp, memo) VALUES ('tx_${generateId()}', '${user.username}', 'BRIDGE', ${amount}, 'BURN', ${Date.now()}, 'Atomic Swap Out')`);
    }
    saveDB();
    refreshState();
  };

  const mintTokens = (amount: number, to: string = user.username || '') => {
    const db = getDb();
    if (!db || !to) return;
    db.run(`UPDATE users SET balance = balance + ${amount} WHERE username = '${to}'`);
    db.run(`INSERT INTO transactions (id, from_user, to_user, amount, type, timestamp, memo) VALUES ('tx_${generateId()}', 'BRIDGE', '${to}', ${amount}, 'MINT', ${Date.now()}, 'Admin Mint')`);
    saveDB();
    refreshState();
  };

  return (
    <ChainContext.Provider value={{
      chain, user, isLoading, login, logout, sendTransaction, mineBlock, buyGamePass, mintNodePass, 
      claimBlurtDeposit, syncWithBlurt, voteForWitness, stakeTokens, unstakeTokens, addGameReward,
      provisionNFT, upgradeNFT, promoteNFT, addNFTExperience, activateNode, createSnapshot, restoreSnapshot,
      swapTokens, mintTokens, authMethod
    }}>
      {children}
    </ChainContext.Provider>
  );
};