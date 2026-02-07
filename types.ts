export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  type: 'TRANSFER' | 'MINT' | 'REWARD' | 'FEE' | 'BURN' | 'STAKE' | 'UNSTAKE';
  memo?: string;
  signature?: string;
}

export interface SimulationNFT {
  id: string;
  owner: string;
  type: 'CHARACTER' | 'AUGMENT' | 'ACCESS';
  subType: 'TRAVELLER' | 'CADET' | 'ENGINEER' | 'PILOT' | 'COMMANDER' | 'CYBORG' | 'HEALTH' | 'ATTACK' | 'LUCK' | 'NODE_PASS';
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
  blurtAnchorId?: string; 
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
  nodeActiveUntil: number; 
}

export interface ChainState {
  blocks: Block[];
  pendingTransactions: Transaction[];
  totalSupply: number;
  totalBurned: number;
  accounts: Record<string, number>;
  passes: Record<string, boolean>;
  witnesses: string[];
  currentWitness: string;
  isSyncing: boolean;
  isP2PConnected: boolean;
}

export const CHAIN_ID = 'quest_mainnet_v1';
export const ADMIN_USER = 'tekraze'; // Genesis Anchor
export const PROTOCOL_ID = 'quest_p_v1';
export const ADMIN_PREFIX = '#';
export const GENESIS_SUPPLY = 1_000_000;
export const MAX_SUPPLY = 1_000_000_000;
export const LOGIN_BONUS = 1000;
export const GAME_PASS_COST = 500;
export const NODE_PASS_COST = 1000;
export const MANA_REGEN_HOURS = 24;
export const PROTOCOL_VERSION = '1.6.2-PROD';
export const BURN_ACCOUNT = 'QUEST_BURN_VOID';

// Deployment Configuration
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const PROD_DOMAIN = 'wsgaming.blurt.one'; // CHANGE THIS TO YOUR SERVER DOMAIN

export const P2P_GATEWAY = IS_LOCAL 
  ? 'ws://localhost:8089' 
  : `wss://${PROD_DOMAIN}`;