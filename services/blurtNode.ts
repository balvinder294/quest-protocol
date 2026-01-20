import { Transaction } from '../types';

const BLURT_RPC = 'https://rpc.blurt.world';
const SIDECHAIN_ID = 'quest_protocol';

export interface BlurtOperation {
  block: number;
  timestamp: string;
  op: [string, any];
}

// Simulate fetching blocks and filtering for sidechain events
export const fetchBlurtBlocks = async (lastBlock: number): Promise<BlurtOperation[]> => {
  try {
    // In a real L2, we would fetch block by block.
    // Here we will check account history of the "bridge" account (e.g., admin) 
    // to find deposit/withdraw events as a simplified sync method.
    
    const response = await fetch(BLURT_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'condenser_api.get_account_history',
        params: ['tekraze', -1, 20], // Last 20 ops
        id: 1,
      }),
    });

    const data = await response.json();
    if (!data.result) return [];

    const operations: BlurtOperation[] = data.result.map((item: any) => ({
      block: item[1].block,
      timestamp: item[1].timestamp,
      op: item[1].op
    }));

    return operations.filter(op => {
      const [type, payload] = op.op;
      if (type === 'custom_json' && payload.id === SIDECHAIN_ID) return true;
      if (type === 'transfer' && payload.memo.startsWith('QUEST_DEPOSIT')) return true;
      return false;
    });

  } catch (e) {
    console.error("Blurt Sync Error", e);
    return [];
  }
};

export const broadcastToBlurt = async (username: string, key: string, json: any) => {
  // Requires Blurt Keychain or private key signing logic.
  // We will assume window.blurt_keychain exists for this simulation
  if ((window as any).blurt_keychain) {
    return new Promise((resolve, reject) => {
      (window as any).blurt_keychain.requestCustomJson(
        username,
        SIDECHAIN_ID,
        'Active',
        JSON.stringify(json),
        'Quest Protocol Action',
        (response: any) => {
          if (response.success) resolve(response);
          else reject(response.error);
        }
      );
    });
  } else {
    console.warn("Blurt Keychain not found. Simulating broadcast.");
    return { success: true, result: "Simulated" };
  }
};
