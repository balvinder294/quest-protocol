
import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  ChainState, 
  Block, 
  Transaction, 
  UserState, 
  SimulationNFT,
  ADMIN_USER, 
  GAME_PASS_COST,
  LOGIN_BONUS
} from '../types';
import { simpleHash, generateId } from '../services/chainUtils';
import { checkBlurtAccount } from '../services/blurtService';
import { initDB, saveDB, getDb, exportSnapshot, importSnapshot } from '../services/sqliteService';

// Added missing interface properties for swap and sync functionality
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

      const txRes = db.exec("SELECT * FROM transactions ORDER BY timestamp DESC"); 
      const pendingTransactions: Transaction[] = [];
      if (txRes && txRes.length > 0) {
        txRes[0].values.forEach((row: any) => {
          pendingTransactions.push({
            id: row[0], from: row[1], to: row[2], amount: row[3], type: row[4] as any, timestamp: row[5], memo: row[6]
          });
        });
      }

      setChain({
        blocks,
        pendingTransactions,
        totalSupply: Object.values(accounts).reduce((a, b) => a + b, 0),
        accounts,
        passes,
        witnesses,
        currentWitness: witnesses[blocks.length % witnesses.length]
      });

      if (user.username) {
        const uRes = db.exec(`SELECT balance, has_pass, last_node_activation FROM users WHERE username = '${user.username}'`);
        const invRes = db.exec(`SELECT * FROM nfts WHERE owner = '${user.username}'`);
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
            balance: uRow[0] as number, 
            hasGamePass: uRow[1] === 1,
            inventory,
            nodeActiveUntil: (uRow[2] as number) + (24 * 60 * 60 * 1000)
          }));
        }
      }
    } catch (e) {
      console.error("Error refreshing state", e);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await initDB();
        refreshState();
      } catch (e) {
        console.error("Failed to init DB", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = async (username: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const exists = await checkBlurtAccount(username);
      if (!exists) {
        alert("Blurt User not found");
        return false;
      }
      const db = getDb();
      if (!db) return false;
      const formattedUser = username.toLowerCase();
      const res = db.exec(`SELECT * FROM users WHERE username = '${formattedUser}'`);
      if (!res || res.length === 0) {
        db.run(`INSERT INTO users (username, balance, has_pass, last_node_activation) VALUES ('${formattedUser}', ${LOGIN_BONUS}, 0, 0)`);
        saveDB();
      }
      setUser(prev => ({
        ...prev,
        username: formattedUser,
        balance: 0,
        hasGamePass: false,
        isAdmin: formattedUser === ADMIN_USER,
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

  const provisionNFT = (type: 'CHARACTER' | 'AUGMENT', subType: string, value: number, cost: number = 0) => {
    if (!user.username) return;
    const db = getDb();
    if (!db) return;

    if (cost > 0) {
        if (user.balance < cost) {
            alert("Insufficient QUEST tokens for premium mint.");
            return;
        }
        executeTx(user.username, 'PROTOCOL_TREASURY', cost, 'FEE', `Premium Mint: ${subType}`);
    }

    const id = `NFT_${generateId()}`;
    const rarity = cost >= 1000 ? 'EPIC' : cost >= 500 ? 'RARE' : 'COMMON';
    db.run(`INSERT INTO nfts (id, owner, type, sub_type, value, rarity, level, xp) 
            VALUES ('${id}', '${user.username}', '${type}', '${subType}', ${value}, '${rarity}', 1, 0)`);
    
    saveDB();
    refreshState();
  };

  const upgradeNFT = (nftId: string, cost: number, bonus: number) => {
    if (!user.username) return;
    const db = getDb();
    if (!db) return;

    if (user.balance < cost) {
        alert("Insufficient QUEST for upgrade.");
        return;
    }

    executeTx(user.username, 'PROTOCOL_TREASURY', cost, 'FEE', `Upgrade NFT ${nftId}`);
    db.run(`UPDATE nfts SET value = value + ${bonus} WHERE id = '${nftId}'`);
    saveDB();
    refreshState();
  };

  const promoteNFT = (nftId: string, newSubType: string, cost: number) => {
    if (!user.username) return;
    const db = getDb();
    if (!db) return;

    if (user.balance < cost) {
      alert("Insufficient QUEST for ascension.");
      return;
    }

    executeTx(user.username, 'PROTOCOL_TREASURY', cost, 'FEE', `Ascend NFT ${nftId} to ${newSubType}`);
    db.run(`UPDATE nfts SET sub_type = '${newSubType}', rarity = 'EPIC' WHERE id = '${nftId}'`);
    saveDB();
    refreshState();
  }

  const addNFTExperience = (nftId: string, amount: number) => {
    const db = getDb();
    if (!db) return;

    const res = db.exec(`SELECT level, xp FROM nfts WHERE id = '${nftId}'`);
    if (!res || res.length === 0) return;
    
    let level = res[0].values[0][0];
    let xp = res[0].values[0][1] + amount;
    
    // Simple level up: 100 * level
    const nextLevelXP = 100 * level;
    if (xp >= nextLevelXP) {
        xp -= nextLevelXP;
        level += 1;
    }

    db.run(`UPDATE nfts SET level = ${level}, xp = ${xp} WHERE id = '${nftId}'`);
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
    db.run(`INSERT INTO blocks (index_id, hash, prev_hash, validator, timestamp, tx_count, witness_sig) 
            VALUES (${index}, '${newHash}', '${prevHash}', '${user.username}', ${Date.now()}, 0, 'SIG_${generateId()}')`);
    
    executeTx('PROTOCOL', user.username, 50, 'MINT', 'Witness Reward');
    saveDB();
    refreshState();
  };

  const createSnapshot = () => {
    const data = exportSnapshot();
    if (!data) return;
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quest-protocol-snapshot-h${chain.blocks.length}-${Date.now()}.qps`;
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
    if (db) {
      db.run(`UPDATE users SET has_pass = 1 WHERE username = '${user.username}'`);
      saveDB(); refreshState();
    }
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

  // Added missing swapTokens implementation
  const swapTokens = (amount: number, direction: 'IN' | 'OUT') => {
    if (!user.username) return;
    const RATE = 10;
    if (direction === 'IN') {
      // BLURT -> QUEST
      executeTx('BRIDGE', user.username, amount * RATE, 'MINT', 'Bridge Deposit');
    } else {
      // QUEST -> BLURT
      if (user.balance < amount) {
        alert("Insufficient QUEST balance for withdrawal");
        return;
      }
      executeTx(user.username, 'BRIDGE', amount, 'TRANSFER', 'Bridge Withdrawal');
    }
  };

  // Added missing syncWithBlurt implementation
  const syncWithBlurt = async () => {
    setIsLoading(true);
    try {
      // Simulation of blockchain sync delay
      await new Promise(r => setTimeout(r, 1500));
      refreshState();
    } catch (e) {
      console.error("Blurt synchronization failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChainContext.Provider value={{ 
      chain, user, isLoading, login, logout, sendTransaction, mineBlock, buyGamePass, mintTokens, addGameReward, activateNode,
      createSnapshot, restoreSnapshot, provisionNFT, upgradeNFT, addNFTExperience, promoteNFT, swapTokens, syncWithBlurt
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
