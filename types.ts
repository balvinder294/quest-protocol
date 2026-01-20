export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  type: 'TRANSFER' | 'MINT' | 'REWARD' | 'FEE';
  memo?: string;
  signature?: string;
}

export interface SimulationNFT {
  id: string;
  owner: string;
  type: 'CHARACTER' | 'AUGMENT';
  subType: 'TRAVELLER' | 'CADET' | 'ENGINEER' | 'PILOT' | 'COMMANDER' | 'CYBORG' | 'HEALTH' | 'ATTACK' | 'LUCK';
  value: number;
  rarity: 'COMMON' | 'RARE' | 'EPIC';
  level: number;
  xp: number;
}

export interface Block {
  index: number;
  timestamp: number;
  transactions: Transaction[];
  previousHash: string;
  hash: string;
  validator: string;
  witnessSignature?: string;
}

export interface UserState {
  username: string | null;
  balance: number;
  hasGamePass: boolean;
  isAdmin: boolean;
  inventory: SimulationNFT[];
  nodeActiveUntil: number; 
}

export interface ChainState {
  blocks: Block[];
  pendingTransactions: Transaction[];
  totalSupply: number;
  accounts: Record<string, number>;
  passes: Record<string, boolean>;
  witnesses: string[];
  currentWitness: string;
}

export interface SnapshotMetadata {
  blockHeight: number;
  timestamp: number;
  checksum: string;
  version: string;
}

export const ADMIN_USER = 'tekraze';
export const GENESIS_SUPPLY = 1_000_000;
export const MAX_SUPPLY = 1_000_000_000;
export const LOGIN_BONUS = 1000;
export const GAME_PASS_COST = 500;
export const PROTOCOL_VERSION = '1.2.0-BETA';