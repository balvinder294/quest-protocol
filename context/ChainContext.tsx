import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { 
  ChainState, 
  Block, 
  Transaction, 
  UserState, 
  SimulationNFT,
  ADMIN_USER, 
  ADMIN_PREFIX,
  GAME_PASS_COST,
  LOGIN_BONUS
} from '../types';
import { simpleHash, generateId } from '../services/chainUtils';
import { checkBlurtAccount } from '../services/blurtService';
import { initDB, saveDB, getDb, exportSnapshot, importSnapshot } from '../services/sqliteService';

interface ChainContextType {
  chain: ChainState;
  user: UserState;
  isLoading: boolean;
  login: (username: string) => Promise<boolean>;
  logout: () => void;
  sendTransaction: (to: string, amount: number, memo?: string) => void;
  mineBlock: () => Promise<void>;
  buyGamePass: () => void;
  mintTokens: (amount: number) => void;
  addGameReward: (amount: number, game: string) => void;
  provisionNFT: (type: 'CHARACTER' | 'AUGMENT', subType: string, value: number, cost?: number) => void;
  upgradeNFT: (nftId: string, cost: number, bonus: number) => void;
  promoteNFT: (nftId: string, newSubType: string, cost: number) => void;
  addNFTExperience: (nftId: string, amount: number) => void;
  activateNode: () => void;
  createSnapshot: () => void;
  restoreSnapshot: (file: File) => Promise<void>;
  swapTokens: (amount: number, direction: 'IN' | 'OUT') => void;
  syncWithBlurt: () => Promise<void>;
  p2pStatus: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';
}

const ChainContext = createContext<ChainContextType | undefined>(undefined);

export const ChainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chain, setChain] = useState<ChainState>({
    blocks: [],
    pendingTransactions: [],
    totalSupply: 0,
    accounts: {},
    passes: {},
    witnesses: [],
    currentWitness: ''
  });

  const [user, setUser] = useState<UserState>({
    username: null,
    balance: 0,
    hasGamePass: false,
    isAdmin: false,
    inventory: [],
    nodeActiveUntil: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [p2pStatus, setP2pStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'CONNECTING'>('DISCONNECTED');
  const wsRef = useRef<WebSocket | null>(null);

  const refreshState = () => {
    const db = getDb();
    if (!db) return;

    try {
      const usersRes = db.exec("SELECT * FROM users");
      const accounts: Record<string, number> = {};
      const passes: Record<string, boolean> = {};
      
      if (usersRes && usersRes.length > 0) {
        usersRes[0].values.forEach((row: any) => {
          accounts[row[0]] = row[1];
          if (row[2] === 1) passes[row[0]] = true;
        });
      }

      const witnessesRes = db.exec("SELECT username FROM witnesses WHERE active = 1");
      const witnesses = witnessesRes && witnessesRes.length > 0 ? witnessesRes[0].values.map(r => r[0] as string) : [ADMIN_USER];

      const blocksRes = db.exec("SELECT index_id, hash, prev_hash, validator, timestamp, tx_count FROM blocks ORDER BY index_id ASC");
      const blocks: Block[] = [];
      if (blocksRes && blocksRes.length > 0) {
        blocksRes[0].values.forEach((row: any) => {
          blocks.push({
            index: row[0] as number,
            hash: row[1] as string,
            previousHash: row[2] as string,
            validator: row[3] as string,
            timestamp: row[4] as number,
            transactions: []
          });
        });
      }

      setChain(prev => ({
        ...prev,
        blocks,
        totalSupply: Object.values(accounts).reduce((a, b) => a + b, 0),
        accounts,
        passes,
        witnesses,
        currentWitness: witnesses[blocks.length % witnesses.length]
      }));

      const activeUser = user.username || localStorage.getItem('quest_session_user');
      if (activeUser) {
        const uRes = db.exec(`SELECT balance, has_pass, last_node_activation, is_admin FROM users WHERE username = '${activeUser}'`);
        const invRes = db.exec(`SELECT * FROM nfts WHERE owner = '${activeUser}'`);
        const inventory: SimulationNFT[] = [];
        
        if (invRes && invRes.length > 0) {
          invRes[0].values.forEach((row: any) => {
            inventory.push({
              id: row[0], owner: row[1], type: row[2], subType: row[3], value: row[4], rarity: row[5], level: row[6], xp: row[7]
            });
          });
        }

        if (uRes && uRes.length > 0) {
          const uRow = uRes[0].values[0];
          setUser(prev => ({ 
            ...prev,
            username: activeUser,
            balance: uRow[0] as number, 
            hasGamePass: uRow[1] === 1,
            isAdmin: uRow[3] === 1,
            inventory,
            nodeActiveUntil: (uRow[2] as number) + (24 * 60 * 60 * 1000)
          }));
        }
      }
    } catch (e) {
      console.error("Error refreshing state", e);
    }
  };

  // P2P Synchronization Logic
  useEffect(() => {
    const connectP2P = () => {
      setP2pStatus('CONNECTING');
      // Assume witness node is running locally on 8089
      const ws = new WebSocket('ws://localhost:8089');
      
      ws.onopen = () => {
        console.log('[P2P] Connected to Witness Node');
        setP2pStatus('CONNECTED');
        ws.send(JSON.stringify({ type: 'GET_BLOCKS' }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'BLOCK_DATA') {
            // Handle block sync logic here if needed
            console.log('[P2P] Received blocks from peer');
          }
          if (message.type === 'NEW_BLOCK') {
            console.log('[P2P] New block detected on network');
            // In a real app, we would validate and insert into local DB
            refreshState(); 
          }
        } catch (e) {
          console.error('[P2P] Error processing message', e);
        }
      };

      ws.onclose = () => {
        setP2pStatus('DISCONNECTED');
        setTimeout(connectP2P, 5000); // Reconnect loop
      };

      wsRef.current = ws;
    };

    connectP2P();
    return () => wsRef.current?.close();
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await initDB();
        const savedUser = localStorage.getItem('quest_session_user');
        if (savedUser) {
          setUser(prev => ({ ...prev, username: savedUser }));
        }
        refreshState();
      } catch (e) {
        console.error("Failed to init DB", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = async (input: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const isAdminRequest = input.startsWith(ADMIN_PREFIX);
      const username = isAdminRequest ? input.substring(1).toLowerCase() : input.toLowerCase();
      
      const exists = await checkBlurtAccount(username);
      if (!exists) {
        alert("Blurt User not found");
        return false;
      }

      // Security Check: Only allow 'tekraze' to be admin via '#' prefix
      const shouldBeAdmin = isAdminRequest && username === ADMIN_USER;

      const db = getDb();
      if (!db) return false;
      
      const res = db.exec(`SELECT * FROM users WHERE username = '${username}'`);
      if (!res || res.length === 0) {
        db.run(`INSERT INTO users (username, balance, has_pass, is_admin, last_node_activation) 
                VALUES ('${username}', ${LOGIN_BONUS}, 0, ${shouldBeAdmin ? 1 : 0}, 0)`);
      } else if (shouldBeAdmin) {
        db.run(`UPDATE users SET is_admin = 1 WHERE username = '${username}'`);
      }
      
      saveDB();
      localStorage.setItem('quest_session_user', username);
      
      setUser(prev => ({
        ...prev,
        username: username,
        isAdmin: shouldBeAdmin,
      }));
      
      setTimeout(refreshState, 100);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('quest_session_user');
    setUser({ username: null, balance: 0, hasGamePass: false, isAdmin: false, inventory: [], nodeActiveUntil: 0 });
  };

  const executeTx = (from: string, to: string, amount: number, type: string, memo: string = '') => {
    const db = getDb();
    if (!db) return;
    
    if (from !== 'PROTOCOL' && from !== 'REWARD_POOL' && from !== '0x00' && from !== 'BRIDGE' && from !== 'PROTOCOL_TREASURY') {
      const res = db.exec(`SELECT balance FROM users WHERE username = '${from}'`);
      const bal = (res && res.length > 0 && res[0].values && res[0].values.length > 0) ? res[0].values[0][0] as number : 0;
      if (bal < amount) {
        alert("Insufficient Balance");
        return;
      }
      db.run(`UPDATE users SET balance = balance - ${amount} WHERE username = '${from}'`);
    }

    const toRes = db.exec(`SELECT * FROM users WHERE username = '${to}'`);
    if (!toRes || toRes.length === 0) {
      db.run(`INSERT INTO users (username, balance) VALUES ('${to}', ${amount})`);
    } else {
      db.run(`UPDATE users SET balance = balance + ${amount} WHERE username = '${to}'`);
    }

    const txId = generateId();
    db.run(`INSERT INTO transactions (id, from_user, to_user, amount, type, timestamp, memo) 
            VALUES ('${txId}', '${from}', '${to}', ${amount}, '${type}', ${Date.now()}, '${memo}')`);
    
    saveDB();
    refreshState();
  };

  const mineBlock = async () => {
    if(!user.username) return;
    const db = getDb();
    if (!db) return;
    if (user.username !== chain.currentWitness) return;
    
    await new Promise(r => setTimeout(r, 800));
    
    const lastBlock = db.exec("SELECT index_id, hash FROM blocks ORDER BY index_id DESC LIMIT 1");
    let prevHash = '0000000000';
    let index = 0;
    if (lastBlock && lastBlock.length > 0 && lastBlock[0].values.length > 0) {
      index = (lastBlock[0].values[0][0] as number) + 1;
      prevHash = lastBlock[0].values[0][1] as string;
    }

    const newHash = simpleHash(prevHash + Date.now() + user.username);
    const block = {
        index,
        hash: newHash,
        previousHash: prevHash,
        validator: user.username,
        timestamp: Date.now(),
        witnessSignature: 'SIG_' + generateId()
    };

    db.run(`INSERT INTO blocks (index_id, hash, prev_hash, validator, timestamp, tx_count, witness_sig) 
            VALUES (${block.index}, '${block.hash}', '${block.previousHash}', '${block.validator}', ${block.timestamp}, 0, '${block.witnessSignature}')`);
    
    executeTx('PROTOCOL', user.username, 50, 'MINT', 'Witness Reward');
    saveDB();
    
    // Broadcast block to network
    if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'NEW_BLOCK', block }));
    }

    refreshState();
  };

  // Other functions remain same
  const provisionNFT = (type: 'CHARACTER' | 'AUGMENT', subType: string, value: number, cost: number = 0) => {
    if (!user.username) return;
    const db = getDb();
    if (!db) return;
    if (cost > 0) {
        if (user.balance < cost) { alert("Insufficient QUEST"); return; }
        executeTx(user.username, 'PROTOCOL_TREASURY', cost, 'FEE', `Mint: ${subType}`);
    }
    const id = `NFT_${generateId()}`;
    const rarity = cost >= 1000 ? 'EPIC' : cost >= 500 ? 'RARE' : 'COMMON';
    db.run(`INSERT INTO nfts (id, owner, type, sub_type, value, rarity, level, xp) 
            VALUES ('${id}', '${user.username}', '${type}', '${subType}', ${value}, '${rarity}', 1, 0)`);
    saveDB(); refreshState();
  };

  const upgradeNFT = (nftId: string, cost: number, bonus: number) => {
    if (!user.username) return;
    if (user.balance < cost) { alert("Insufficient QUEST"); return; }
    executeTx(user.username, 'PROTOCOL_TREASURY', cost, 'FEE', `Upgrade ${nftId}`);
    const db = getDb();
    if(db) db.run(`UPDATE nfts SET value = value + ${bonus} WHERE id = '${nftId}'`);
    saveDB(); refreshState();
  };

  const promoteNFT = (nftId: string, newSubType: string, cost: number) => {
    if (!user.username) return;
    if (user.balance < cost) { alert("Insufficient QUEST"); return; }
    executeTx(user.username, 'PROTOCOL_TREASURY', cost, 'FEE', `Ascend ${nftId}`);
    const db = getDb();
    if(db) db.run(`UPDATE nfts SET sub_type = '${newSubType}', rarity = 'EPIC' WHERE id = '${nftId}'`);
    saveDB(); refreshState();
  }

  const addNFTExperience = (nftId: string, amount: number) => {
    const db = getDb();
    if (!db) return;
    const res = db.exec(`SELECT level, xp FROM nfts WHERE id = '${nftId}'`);
    if (!res || res.length === 0) return;
    let level = res[0].values[0][0];
    let xp = res[0].values[0][1] + amount;
    const nextLevelXP = 100 * level;
    if (xp >= nextLevelXP) { xp -= nextLevelXP; level += 1; }
    db.run(`UPDATE nfts SET level = ${level}, xp = ${xp} WHERE id = '${nftId}'`);
    saveDB(); refreshState();
  };

  const createSnapshot = () => {
    const data = exportSnapshot();
    if (!data) return;
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quest-snapshot-h${chain.blocks.length}.qps`;
    a.click();
  };

  const restoreSnapshot = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      await importSnapshot(data);
    };
    reader.readAsArrayBuffer(file);
  };

  const buyGamePass = () => {
    if (!user.username) return;
    executeTx(user.username, 'PROTOCOL_TREASURY', GAME_PASS_COST, 'FEE', 'Buy Pass');
    const db = getDb();
    if (db) { db.run(`UPDATE users SET has_pass = 1 WHERE username = '${user.username}'`); saveDB(); refreshState(); }
  };

  const addGameReward = (amount: number, game: string) => {
    if (!user.username) return;
    executeTx('REWARD_POOL', user.username, amount, 'REWARD', game);
  };

  const activateNode = () => {
    if (!user.username) return;
    const db = getDb();
    if (!db) return;
    db.run(`UPDATE users SET last_node_activation = ${Date.now()} WHERE username = '${user.username}'`);
    saveDB(); refreshState();
  };

  const sendTransaction = (to: string, amount: number, memo?: string) => {
    if (!user.username) return;
    executeTx(user.username, to, amount, 'TRANSFER', memo);
  };

  const mintTokens = (amount: number) => {
    if (!user.username) return;
    executeTx('0x00', user.username, amount, 'MINT', 'Admin Mint');
  };

  const swapTokens = (amount: number, direction: 'IN' | 'OUT') => {
    if (!user.username) return;
    const RATE = 10;
    if (direction === 'IN') executeTx('BRIDGE', user.username, amount * RATE, 'MINT', 'Bridge In');
    else executeTx(user.username, 'BRIDGE', amount, 'TRANSFER', 'Bridge Out');
  };

  const syncWithBlurt = async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    refreshState();
    setIsLoading(false);
  };

  return (
    <ChainContext.Provider value={{ 
      chain, user, isLoading, login, logout, sendTransaction, mineBlock, buyGamePass, mintTokens, addGameReward, activateNode,
      createSnapshot, restoreSnapshot, provisionNFT, upgradeNFT, addNFTExperience, promoteNFT, swapTokens, syncWithBlurt, p2pStatus
    }}>
      {children}
    </ChainContext.Provider>
  );
};

export const useChain = () => {
  const context = useContext(ChainContext);
  if (!context) throw new Error("useChain must be used within ChainProvider");
  return context;
};
