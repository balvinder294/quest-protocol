
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { 
  ChainState, Block, Transaction, UserState, SimulationNFT,
  ADMIN_USER, ADMIN_PREFIX, GAME_PASS_COST, NODE_PASS_COST,
  LOGIN_BONUS, CHAIN_ID, BURN_ACCOUNT, MANA_REGEN_HOURS, PROTOCOL_ID, 
  DEFAULT_P2P_GATEWAY, STORAGE_KEYS
} from '../types';
import { simpleHash, generateId } from '../services/chainUtils.js';
import { checkBlurtAccount, verifyBlurtTransaction } from '../services/blurtService';

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
  provisionNFT: (type: any, subType: string, value: number, cost?: number, targetUser?: string) => void;
  upgradeNFT: (nftId: string, cost: number, bonus: number) => void;
  promoteNFT: (nftId: string, newSubType: string, cost: number) => void;
  addNFTExperience: (nftId: string, amount: number) => void;
  activateNode: () => void;
  placePredictorBet: (num: number, amount: number) => void;
  getLeaderboard: () => void;
  setNodeUrl: (url: string) => void;
  mintTokens: (amount: number, target: string) => void;
  swapTokens: (amount: number, direction: 'IN' | 'OUT') => void;
  createSnapshot: () => void;
  restoreSnapshot: (file: File) => Promise<void>;
  nodeUrl: string;
  leaderboard: any[];
  myBets: any[];
  authMethod: AuthMethod | null;
}

const ChainContext = createContext<ChainContextType | undefined>(undefined);

export const useChain = () => {
  const context = useContext(ChainContext);
  if (!context) throw new Error("useChain must be used within a ChainProvider");
  return context;
};

export const ChainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nodeUrl, setNodeUrlState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NODE_URL);
    return (saved && saved.length > 7) ? saved : DEFAULT_P2P_GATEWAY;
  });
  
  const [chain, setChain] = useState<ChainState>({
    blocks: [], pendingTransactions: [], totalSupply: 0, totalBurned: 0, accounts: {}, passes: {}, witnesses: [ADMIN_USER], currentWitness: ADMIN_USER, isSyncing: false, isP2PConnected: false, connectedNodeName: 'DISCONNECTED'
  });

  const [user, setUser] = useState<UserState>({
    username: null, balance: 0, stakedBalance: 0, mana: 100, maxMana: 100, hasGamePass: false, isAdmin: false, inventory: [], nodeActiveUntil: 0
  });

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const chainRef = useRef(chain);
  const userRef = useRef(user);
  const isMiningRef = useRef(false);

  useEffect(() => { chainRef.current = chain; }, [chain]);
  useEffect(() => { userRef.current = user; }, [user]);

  const connectP2P = () => {
    if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
    }
    
    if (!nodeUrl || (!nodeUrl.startsWith('ws://') && !nodeUrl.startsWith('wss://')) || nodeUrl.length < 8) {
      setChain(prev => ({ ...prev, isP2PConnected: false, connectedNodeName: 'INVALID_URL' }));
      return;
    }

    try {
      const ws = new WebSocket(nodeUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setChain(prev => ({ ...prev, isP2PConnected: true }));
        ws.send(JSON.stringify({ type: 'PING' }));
        ws.send(JSON.stringify({ type: 'GET_BLOCKS' }));
        if (userRef.current.username) {
            ws.send(JSON.stringify({ type: 'QUERY_STATE', username: userRef.current.username }));
        }
      };

      ws.onclose = () => {
        setChain(prev => ({ ...prev, isP2PConnected: false, connectedNodeName: 'DISCONNECTED' }));
        setTimeout(() => { if (wsRef.current === ws) connectP2P(); }, 5000); 
      };

      ws.onmessage = async (event) => {
        try {
          let dataStr = "";
          if (typeof event.data === 'string') { dataStr = event.data; } 
          else if (event.data instanceof Blob) { dataStr = await event.data.text(); } 
          else { dataStr = event.data.toString(); }

          const msg = JSON.parse(dataStr);
          switch(msg.type) {
            case 'PONG':
                setChain(prev => ({ ...prev, connectedNodeName: msg.name }));
                break;
            case 'STATE_RESPONSE':
                if (msg.user) {
                    setUser(prev => ({
                        ...prev,
                        balance: msg.user.balance || 0,
                        stakedBalance: msg.user.staked || 0,
                        hasGamePass: msg.user.has_pass || false,
                        isAdmin: msg.user.is_admin || false,
                        inventory: msg.inventory || []
                    }));
                    setMyBets(msg.bets || []);
                }
                break;
            case 'BLOCK_DATA':
                if (msg.blocks && Array.isArray(msg.blocks)) {
                  setChain(prev => ({ 
                    ...prev, 
                    blocks: [...msg.blocks].reverse(),
                    witnesses: msg.witnesses || prev.witnesses,
                    currentWitness: msg.currentWitness || prev.currentWitness
                  }));
                }
                break;
            case 'NEW_BLOCK':
                setChain(prev => {
                    if (!msg.block) return prev;
                    const exists = prev.blocks.some(b => b.index === msg.block.index);
                    if (exists) return prev;
                    const nextBlocks = [...prev.blocks, msg.block];
                    return { 
                        ...prev, 
                        blocks: nextBlocks, 
                        witnesses: msg.witnesses || prev.witnesses,
                        currentWitness: msg.currentWitness || prev.currentWitness
                    };
                });
                if (userRef.current.username) wsRef.current?.send(JSON.stringify({ type: 'QUERY_STATE', username: userRef.current.username }));
                break;
            case 'PUSH_TX':
                if (msg.tx) {
                  setChain(prev => ({ ...prev, pendingTransactions: [...prev.pendingTransactions, msg.tx] }));
                }
                break;
          }
        } catch (e) { }
      };
    } catch (e) { 
        setChain(prev => ({ ...prev, isP2PConnected: false }));
    }
  };

  useEffect(() => { connectP2P(); }, [nodeUrl]);

  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
    const savedMethod = localStorage.getItem(STORAGE_KEYS.AUTH_METHOD);
    if (savedUser) {
        setUser(p => ({ ...p, username: savedUser }));
        setAuthMethod(savedMethod as AuthMethod || 'WHALEVAULT');
    }
  }, []);

  const setNodeUrl = (url: string) => {
    if (url && url.length > 7) {
      localStorage.setItem(STORAGE_KEYS.NODE_URL, url);
      setNodeUrlState(url);
    }
  };

  const login = async (input: string, method: AuthMethod, key?: string): Promise<{success: boolean, msg: string}> => {
    setIsLoading(true);
    try {
      const username = input.startsWith(ADMIN_PREFIX) ? input.substring(1).toLowerCase().trim() : input.toLowerCase().trim();
      
      // Mnemonic accounts bypass Blurt account check because they are native to sidechain
      let verified = method === 'MNEMONIC' || await checkBlurtAccount(username);
      
      if (verified) {
        localStorage.setItem(STORAGE_KEYS.USER, username);
        localStorage.setItem(STORAGE_KEYS.AUTH_METHOD, method);
        setAuthMethod(method);
        setUser(prev => ({ ...prev, username }));
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'QUERY_STATE', username }));
        }
        return { success: true, msg: `Sidechain link established for @${username}.` };
      }
      return { success: false, msg: "L1 Identity not found. Use Mnemonic to create native account." };
    } finally { setIsLoading(false); }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.AUTH_METHOD);
    window.location.reload();
  };

  const sendTransaction = (to: string, amount: number, memo: string = '') => {
    if (!user.username || user.balance < amount) return;
    const tx: Transaction = { id: `tx_${generateId()}`, from: user.username, to, amount, type: 'TRANSFER', timestamp: Date.now(), memo };
    if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'PUSH_TX', tx }));
    }
    setUser(prev => ({ ...prev, balance: prev.balance - amount }));
  };

  const mineBlock = async () => {
    if (!userRef.current.username || isMiningRef.current) return;
    if (userRef.current.username !== chain.currentWitness) {
        alert("Consensus Violation: Not your scheduled turn.");
        return;
    }

    isMiningRef.current = true;
    const lastBlock = chain.blocks[chain.blocks.length - 1];
    const blockIndex = lastBlock ? lastBlock.index + 1 : 1;
    const transactions = [...chain.pendingTransactions];
    const prevHash = lastBlock ? lastBlock.hash : '0'.repeat(64);
    const blockHeader = { index: blockIndex, previousHash: prevHash, merkleRoot: '0', timestamp: Date.now(), validator: userRef.current.username, chainId: CHAIN_ID, transactions };
    const hash = simpleHash(JSON.stringify(blockHeader));
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'NEW_BLOCK', block: { ...blockHeader, hash } }));
    }
    isMiningRef.current = false;
  };

  const voteForWitness = (witness: string) => {
    if (!user.username) return;
    const tx: Transaction = { 
        id: `vote_${generateId()}`, 
        from: user.username, 
        to: witness, 
        amount: 0, 
        type: 'VOTE', 
        timestamp: Date.now(), 
        memo: `Voted for ${witness}` 
    };
    if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'PUSH_TX', tx }));
    }
  };

  const stakeTokens = (amount: number) => {
    if (!user.username || user.balance < amount) return;
    const tx: Transaction = { id: `stake_${generateId()}`, from: user.username, to: 'STAKING_CONTRACT', amount, type: 'STAKE', timestamp: Date.now() };
    if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'PUSH_TX', tx }));
    }
  };

  const unstakeTokens = (amount: number) => {
    if (!user.username || user.stakedBalance < amount) return;
    const tx: Transaction = { id: `unstake_${generateId()}`, from: user.username, to: 'STAKING_CONTRACT', amount, type: 'UNSTAKE', timestamp: Date.now() };
    if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'PUSH_TX', tx }));
    }
  };

  const placePredictorBet = (num: number, amount: number) => {
    if (!user.username || user.balance < amount) return;
    const currentDrawId = chain.blocks.length + 1;
    sendTransaction('PROTOCOL_TREASURY', amount, `Bet Draw #${currentDrawId}`);
    wsRef.current?.send(JSON.stringify({ type: 'PLACE_BET', username: user.username, number: num, amount, draw_id: currentDrawId }));
  };

  const getLeaderboard = () => wsRef.current?.send(JSON.stringify({ type: 'GET_LEADERBOARD' }));
  const buyGamePass = () => sendTransaction('PROTOCOL_TREASURY', GAME_PASS_COST, 'Game Pass');
  const mintNodePass = () => sendTransaction('PROTOCOL_TREASURY', NODE_PASS_COST, 'Node Pass');
  
  const addGameReward = (amount: number, game: string) => {
      if (!user.username) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ 
            type: 'PUSH_TX', 
            tx: { id: `reward_${generateId()}`, from: 'PROTOCOL_TREASURY', to: user.username, amount, type: 'REWARD', timestamp: Date.now(), memo: `Game: ${game}` } 
        }));
      }
  };

  const claimBlurtDeposit = async (txId: string): Promise<{success: boolean, msg: string}> => {
    if (!user.username) return { success: false, msg: "Authentication required." };
    setIsLoading(true);
    try {
      const res = await verifyBlurtTransaction(txId, user.username);
      if (res.success) {
        wsRef.current?.send(JSON.stringify({ 
            type: 'PUSH_TX', 
            tx: { id: `dep_${generateId()}`, from: 'PROTOCOL_TREASURY', to: user.username, amount: res.amount * 10, type: 'MINT', timestamp: Date.now(), memo: `Blurt Deposit` } 
        }));
        return { success: true, msg: `Deposit verified.` };
      }
      return { success: false, msg: res.message };
    } finally { setIsLoading(false); }
  };

  const mintTokens = (amount: number, target: string) => {
    if (!user.username || !user.isAdmin) return;
    const tx: Transaction = { id: `mint_${generateId()}`, from: 'PROTOCOL_TREASURY', to: target, amount, type: 'MINT', timestamp: Date.now(), memo: 'Admin Mint' };
    if (wsRef.current?.readyState === WebSocket.OPEN) { wsRef.current.send(JSON.stringify({ type: 'PUSH_TX', tx })); }
  };

  const swapTokens = (amount: number, direction: 'IN' | 'OUT') => {
    if (!user.username) return;
    const tx: Transaction = {
      id: `swap_${generateId()}`,
      from: direction === 'IN' ? 'PROTOCOL_TREASURY' : user.username,
      to: direction === 'IN' ? user.username : 'PROTOCOL_TREASURY',
      amount: direction === 'IN' ? amount * 10 : amount,
      type: direction === 'IN' ? 'MINT' : 'TRANSFER',
      timestamp: Date.now(),
      memo: `Swap ${direction}`
    };
    if (wsRef.current?.readyState === WebSocket.OPEN) { wsRef.current.send(JSON.stringify({ type: 'PUSH_TX', tx })); }
  };

  const createSnapshot = () => {
    const data = JSON.stringify({ blocks: chain.blocks, accounts: chain.accounts, witnesses: chain.witnesses });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snapshot_${Date.now()}.qps`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restoreSnapshot = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      alert("Snapshot data received. Node database update required.");
    } catch (e) { alert("Failed to read snapshot file."); }
  };

  const provisionNFT = (type: any, subType: string, value: number, cost: number = 0, targetUser?: string) => {
    const target = targetUser || user.username;
    if (!target) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'PUSH_TX', 
        tx: { 
          id: `nft_${generateId()}`, 
          from: 'PROTOCOL_TREASURY', 
          to: target, 
          amount: cost, 
          type: 'MINT', 
          timestamp: Date.now(), 
          memo: `NFT_MINT:${type}:${subType}:${value}` 
        } 
      }));
    }
  };

  const upgradeNFT = (nftId: string, cost: number, bonus: number) => {
    if (!user.username || user.balance < cost) return;
    sendTransaction('PROTOCOL_TREASURY', cost, `UPGRADE_NFT:${nftId}:${bonus}`);
  };

  const promoteNFT = (nftId: string, newSubType: string, cost: number) => {
    if (!user.username || user.balance < cost) return;
    sendTransaction('PROTOCOL_TREASURY', cost, `PROMOTE_NFT:${nftId}:${newSubType}`);
  };

  const addNFTExperience = (nftId: string, amount: number) => {
    if (!user.username) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ 
            type: 'PUSH_TX', 
            tx: { id: `xp_${generateId()}`, from: 'PROTOCOL_TREASURY', to: user.username, amount: 0, type: 'REWARD', timestamp: Date.now(), memo: `XP_GAIN:${nftId}:${amount}` } 
        }));
    }
  };

  const activateNode = () => setUser(p => ({ ...p, nodeActiveUntil: Date.now() + 86400000 }));
  const syncWithBlurt = async () => { console.log("[BRIDGE] Sync bypassed."); }; 

  return (
    <ChainContext.Provider value={{
      chain, user, isLoading, login, logout, sendTransaction, mineBlock, buyGamePass, mintNodePass, 
      claimBlurtDeposit, syncWithBlurt, voteForWitness, stakeTokens, unstakeTokens, addGameReward,
      provisionNFT, upgradeNFT, promoteNFT, addNFTExperience, activateNode, placePredictorBet, getLeaderboard, leaderboard, myBets, authMethod, nodeUrl, setNodeUrl,
      mintTokens, swapTokens, createSnapshot, restoreSnapshot
    }}>
      {children}
    </ChainContext.Provider>
  );
};
