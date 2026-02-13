
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { 
  ChainState, Block, Transaction, UserState, SimulationNFT,
  ADMIN_USER, ADMIN_PREFIX, GAME_PASS_COST, NODE_PASS_COST,
  CHAIN_ID, STORAGE_KEYS, DEFAULT_P2P_GATEWAY, TREASURY_ACCOUNT
} from '../types';
import { simpleHash, generateId, calculateMerkleRoot } from '../services/chainUtils.js';
import { checkBlurtAccount, verifyBlurtTransaction } from '../services/blurtService';

type AuthMethod = 'WHALEVAULT' | 'POSTING_KEY' | 'MNEMONIC';

interface ChainContextType {
  chain: ChainState;
  user: UserState;
  isLoading: boolean;
  login: (username: string, method: AuthMethod, key?: string) => Promise<{success: boolean, msg: string}>;
  logout: () => void;
  sendTransaction: (to: string, amount: number, memo?: string, type?: string) => void;
  mineBlock: () => Promise<void>;
  buyGamePass: () => void;
  mintNodePass: () => void;
  claimBlurtDeposit: (txId: string) => Promise<{success: boolean, msg: string}>;
  voteForWitness: (witness: string) => void;
  stakeTokens: (amount: number) => void;
  unstakeTokens: (amount: number) => void;
  addGameReward: (amount: number, game: string) => void;
  provisionNFT: (type: any, subType: string, value: number, cost?: number, targetUser?: string) => void;
  upgradeNFT: (nftId: string, cost: number, bonus: number) => void;
  promoteNFT: (nftId: string, newSubType: string, cost: number) => void;
  setNodeUrl: (url: string) => void;
  updateSignerKey: (pubKey: string) => void;
  refreshState: () => void;
  nodeUrl: string;
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
    blocks: [], pendingTransactions: [], totalSupply: 0, totalBurned: 0, accounts: {}, passes: {}, witnesses: [ADMIN_USER], currentWitness: ADMIN_USER, isP2PConnected: false, connectedNodeName: 'DISCONNECTED', isSyncing: false
  });

  const [user, setUser] = useState<UserState>({
    username: null, balance: 0, stakedBalance: 0, mana: 100, maxMana: 100, hasGamePass: false, isAdmin: false, inventory: []
  });

  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const chainRef = useRef(chain);
  const userRef = useRef(user);

  useEffect(() => { chainRef.current = chain; }, [chain]);
  useEffect(() => { userRef.current = user; }, [user]);

  const connectP2P = () => {
    if (wsRef.current) wsRef.current.close();
    try {
      const ws = new WebSocket(nodeUrl);
      wsRef.current = ws;
      ws.onopen = () => {
        setChain(prev => ({ ...prev, isP2PConnected: true }));
        ws.send(JSON.stringify({ type: 'PING' }));
        ws.send(JSON.stringify({ type: 'GET_BLOCKS' }));
        if (userRef.current.username) ws.send(JSON.stringify({ type: 'QUERY_STATE', username: userRef.current.username }));
      };
      ws.onclose = () => {
        setChain(prev => ({ ...prev, isP2PConnected: false }));
        setTimeout(connectP2P, 5000); 
      };
      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text());
          switch(msg.type) {
            case 'PONG': setChain(prev => ({ ...prev, connectedNodeName: msg.name })); break;
            case 'STATE_RESPONSE':
                if (msg.user) {
                    setUser(prev => ({
                        ...prev,
                        balance: msg.user.balance || 0,
                        stakedBalance: msg.user.staked || 0,
                        hasGamePass: msg.user.has_pass || false,
                        isAdmin: msg.user.is_admin || (msg.user.username === ADMIN_USER),
                        inventory: msg.inventory || [],
                        signerKey: msg.user.signer_key
                    }));
                }
                break;
            case 'BLOCK_DATA':
                if (msg.blocks) {
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
                    if (prev.blocks.some(b => b.index === msg.block.index)) return prev;
                    return { ...prev, blocks: [...prev.blocks, msg.block], witnesses: msg.witnesses || prev.witnesses, currentWitness: msg.currentWitness || prev.currentWitness };
                });
                if (userRef.current.username) wsRef.current?.send(JSON.stringify({ type: 'QUERY_STATE', username: userRef.current.username }));
                break;
            case 'PUSH_TX':
                if (msg.tx) setChain(prev => ({ ...prev, pendingTransactions: [...prev.pendingTransactions, msg.tx] }));
                break;
          }
        } catch (e) { }
      };
    } catch (e) { }
  };

  useEffect(() => { connectP2P(); }, [nodeUrl]);

  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (savedUser) setUser(p => ({ ...p, username: savedUser }));
  }, []);

  const login = async (input: string, method: AuthMethod): Promise<{success: boolean, msg: string}> => {
    const username = input.startsWith(ADMIN_PREFIX) ? input.substring(1).toLowerCase().trim() : input.toLowerCase().trim();
    const verified = method === 'MNEMONIC' || await checkBlurtAccount(username);
    if (verified) {
        localStorage.setItem(STORAGE_KEYS.USER, username);
        setUser(prev => ({ ...prev, username }));
        wsRef.current?.send(JSON.stringify({ type: 'QUERY_STATE', username }));
        return { success: true, msg: "Linked." };
    }
    return { success: false, msg: "Identity fail." };
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    window.location.reload();
  };

  const sendTransaction = (to: string, amount: number, memo: string = '', type: any = 'TRANSFER') => {
    if (!user.username) return;
    const tx: Transaction = { id: `tx_${generateId()}`, from: user.username, to, amount, type, timestamp: Date.now(), memo };
    wsRef.current?.send(JSON.stringify({ type: 'PUSH_TX', tx }));
  };

  const mineBlock = async () => {
    if (!userRef.current.username || userRef.current.username !== chain.currentWitness) return;
    const lastBlock = chain.blocks[chain.blocks.length - 1];
    const transactions = [...chain.pendingTransactions];
    
    const block: any = { 
      index: (lastBlock ? lastBlock.index : 0) + 1, 
      previousHash: (lastBlock ? lastBlock.hash : '0'.repeat(64)), 
      timestamp: Date.now(), 
      validator: userRef.current.username, 
      chainId: CHAIN_ID, 
      transactions,
      merkleRoot: calculateMerkleRoot(transactions)
    };
    
    block.hash = simpleHash(JSON.stringify(block));
    
    // ATTACH SIGNATURE
    const priv = localStorage.getItem(STORAGE_KEYS.SIGNER_PRIVATE);
    if (priv) {
      block.witnessSignature = simpleHash(block.hash + priv);
    }

    wsRef.current?.send(JSON.stringify({ type: 'NEW_BLOCK', block }));
  };

  const updateSignerKey = (pubKey: string) => {
    sendTransaction(pubKey, 0, 'Signer Update', 'UPDATE_SIGNER');
  };

  const voteForWitness = (witness: string) => sendTransaction(witness, 0, `Voted ${witness}`, 'VOTE');
  const stakeTokens = (amount: number) => sendTransaction('STAKING_CONTRACT', amount, '', 'STAKE');
  const unstakeTokens = (amount: number) => sendTransaction('STAKING_CONTRACT', amount, '', 'UNSTAKE');
  const buyGamePass = () => sendTransaction(TREASURY_ACCOUNT, GAME_PASS_COST, 'NFT_MINT:ACCESS:GAME_PASS:0', 'MINT');
  const mintNodePass = () => sendTransaction(TREASURY_ACCOUNT, NODE_PASS_COST, 'NFT_MINT:CHARACTER:NODE_PASS:0', 'MINT');
  
  const addGameReward = (amount: number, game: string) => {
    if (user.username) wsRef.current?.send(JSON.stringify({ type: 'PUSH_TX', tx: { id: `r_${generateId()}`, from: TREASURY_ACCOUNT, to: user.username, amount, type: 'REWARD', timestamp: Date.now(), memo: `Game: ${game}` } }));
  };

  const provisionNFT = (type: any, subType: string, value: number, cost: number = 0, targetUser?: string) => {
    const target = targetUser || user.username;
    if (target) sendTransaction(target, cost, `NFT_MINT:${type}:${subType}:${value}`, 'MINT');
  };

  const claimBlurtDeposit = async (txId: string) => {
    const res = await verifyBlurtTransaction(txId, user.username!);
    if (res.success) {
      wsRef.current?.send(JSON.stringify({ type: 'PUSH_TX', tx: { id: `dep_${generateId()}`, from: TREASURY_ACCOUNT, to: user.username, amount: res.amount * 10, type: 'MINT', timestamp: Date.now(), memo: `Blurt Deposit` } }));
      return { success: true, msg: `Verified.` };
    }
    return { success: false, msg: res.message };
  };

  const upgradeNFT = (id: string, cost: number, bonus: number) => sendTransaction(TREASURY_ACCOUNT, cost, `UPGRADE_NFT:${id}:${bonus}`);
  const promoteNFT = (id: string, sub: string, cost: number) => sendTransaction(TREASURY_ACCOUNT, cost, `PROMOTE_NFT:${id}:${sub}`);
  const setNodeUrl = (url: string) => { localStorage.setItem(STORAGE_KEYS.NODE_URL, url); setNodeUrlState(url); };
  
  const refreshState = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'GET_BLOCKS' }));
      if (user.username) wsRef.current.send(JSON.stringify({ type: 'QUERY_STATE', username: user.username }));
    }
  };

  return (
    <ChainContext.Provider value={{
      chain, user, isLoading, login, logout, sendTransaction, mineBlock, buyGamePass, mintNodePass, 
      claimBlurtDeposit, voteForWitness, stakeTokens, unstakeTokens, addGameReward,
      provisionNFT, upgradeNFT, promoteNFT, nodeUrl, setNodeUrl, authMethod, updateSignerKey, refreshState
    }}>
      {children}
    </ChainContext.Provider>
  );
};
