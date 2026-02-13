
export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  type: 'TRANSFER' | 'MINT' | 'REWARD' | 'FEE' | 'BURN' | 'STAKE' | 'UNSTAKE' | 'VOTE' | 'UPDATE_SIGNER';
  memo?: string;
  signature?: string;
}

export interface SimulationNFT {
  id: string;
  owner: string;
  type: 'CHARACTER' | 'AUGMENT' | 'ACCESS';
  subType: string; // Dynamic support for all types
  value: number;
  rarity: 'COMMON' | 'RARE' | 'EPIC';
  level: number;
  xp: number;
}

export interface Block {
  index: number;
  timestamp: number;
  transactions: Transaction[];
  merkleRoot: string;
  previousHash: string;
  hash: string;
  validator: string;
  chainId: string;
  witnessSignature?: string;
}

export interface UserState {
  username: string | null;
  balance: number;
  stakedBalance: number;
  mana: number;
  maxMana: number;
  hasGamePass: boolean;
  isAdmin: boolean;
  inventory: SimulationNFT[];
  signerKey?: string; // Registered public key for signing
}

export interface ChainState {
  blocks: Block[];
  pendingTransactions: Transaction[];
  totalSupply: number;
  totalBurned: number;
  height: number; // The absolute latest block index
  accounts: Record<string, number>;
  passes: Record<string, boolean>;
  witnesses: string[];
  currentWitness: string;
  isSyncing: boolean;
  isP2PConnected: boolean;
  connectedNodeName?: string;
}

export const CHAIN_ID = 'quest_mainnet_v1';
export const ADMIN_USER = 'tekraze'; 
export const PROTOCOL_ID = 'quest_p_v1';
export const ADMIN_PREFIX = '#';
export const GENESIS_SUPPLY = 1_000_000;
export const MAX_SUPPLY = 1_000_000_000; // 1 Billion Limit
export const LOGIN_BONUS = 10000;
export const GAME_PASS_COST = 500;
export const NODE_PASS_COST = 1000;
export const MANA_REGEN_HOURS = 24;
export const PROTOCOL_VERSION = '1.9.12-CRYPTO';
export const BURN_ACCOUNT = 'QUEST_BURN_VOID';
export const TREASURY_ACCOUNT = 'PROTOCOL_TREASURY';

export const WITNESS_COUNT = 21; 
export const BLOCK_INTERVAL_MS = 3000; 

export const STORAGE_KEYS = {
    USER: 'quest_session_user',
    NODE_URL: 'quest_preferred_node',
    AUTH_METHOD: 'quest_auth_method',
    SIGNER_PRIVATE: 'quest_node_signer_key'
};

export const DEFAULT_P2P_GATEWAY = 'wss://wsgaming.blurt.one';
