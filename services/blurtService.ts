
// Interacting with Blurt Public Nodes
const BLURT_RPC_NODES = [
  'https://rpc.blurt.world',
  'https://rpc.blurt.one',
  'https://kentzz.blurt.world',
];

export const validatePostingKeyFormat = (key: string): boolean => {
  return /^[5KL]/.test(key) && key.length >= 50;
};

export const checkBlurtAccount = async (username: string): Promise<boolean> => {
  for (const node of BLURT_RPC_NODES) {
    try {
      const response = await fetch(node, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'condenser_api.get_accounts',
          params: [[username]],
          id: 1,
        }),
      });
      
      const data = await response.json();
      if (data.result && Array.isArray(data.result) && data.result.length > 0) {
        return true;
      }
    } catch (e) {
      continue;
    }
  }
  return false; 
};

export function waitForVault(timeout = 3000): Promise<any> {
  return new Promise<any>((resolve) => {
    const check = () => {
      // Priority: WhaleVault (Standard) -> Blurt Keychain -> Hive Keychain (Legacy support)
      return (window as any).whalevault || (window as any).blurt_keychain || (window as any).hive_keychain;
    };

    const found = check();
    if (found) return resolve(found);

    const start = Date.now();
    const timer = setInterval(() => {
      const vault = check();
      if (vault) {
        clearInterval(timer);
        resolve(vault);
      }
      if (Date.now() - start > timeout) {
        clearInterval(timer);
        resolve(null);
      }
    }, 100);
  });
}

/**
 * Robustly call vault methods, handling both camelCase and snake_case 
 * and ensuring the correct parameter order for different extensions.
 */
export const authenticateWithWhaleVault = async (username: string): Promise<{ success: boolean; signature?: string; message: string }> => {
  const vault = await waitForVault(3000);
  if (!vault) return { success: false, message: 'Extension not detected. Please install WhaleVault or Blurt Keychain.' };

  return new Promise((resolve) => {
    const memo = `Quest Protocol Auth: ${username} @ ${Date.now()}`;
    const keyType = "Posting"; 
    
    // Check available methods
    const signBuffer = vault.requestSignBuffer || vault.request_sign_buffer;
    
    if (typeof signBuffer !== 'function') {
      return resolve({ success: false, message: 'Extension does not support signBuffer operations.' });
    }

    try {
      // Normalizing call: (username, message, key, callback, rpc, title)
      signBuffer.call(
        vault, 
        username, 
        memo, 
        keyType, 
        (response: any) => {
          if (response) {
            const isSuccess = response.success === true || (typeof response === 'string' && response.length > 30);
            if (isSuccess) {
              const signature = response.result || (typeof response === 'string' ? response : null);
              resolve({ success: true, signature, message: 'Identity Link Verified.' });
            } else {
              const error = response.message || response.error || 'Identity uplink rejected.';
              resolve({ success: false, message: error });
            }
          } else {
            resolve({ success: false, message: 'No response from identity provider.' });
          }
        },
        null, // Use default RPC
        "Quest Authentication"
      );
    } catch (e: any) {
      resolve({ success: false, message: `Vault Error: ${e.message}` });
    }
  });
};

/**
 * DECOUPLED: Anchoring logic is disabled to remove Blurt chain dependency for block production.
 */
export const anchorBlockToBlurt = async (username: string, blockHeader: any): Promise<{ success: boolean; txId?: string; message: string }> => {
  console.log("[BRIDGE] Anchoring skipped: Sidechain decoupled from Blurt Mainnet.");
  return { 
    success: true, 
    txId: 'decoupled_id_' + Math.random().toString(36).substring(7), 
    message: 'Local Finality Only' 
  };
  
  /* DEPRECATED:
  const vault = await waitForVault(3000);
  if (!vault) return { success: false, message: 'WhaleVault / Keychain not detected.' };

  return new Promise((resolve) => {
    const keyType = "Posting"; 
    let targetContext = vault;
    let customJson = vault.requestCustomJson || vault.request_custom_json;

    if (typeof customJson !== 'function' && vault.blurt) {
      targetContext = vault.blurt;
      customJson = vault.blurt.requestCustomJson || vault.blurt.request_custom_json;
    }

    if (typeof customJson !== 'function') {
      return resolve({ success: false, message: 'Extension logic mismatch.' });
    }

    try {
      customJson.call(
        targetContext,
        username,
        'quest_p_v1',
        keyType,
        JSON.stringify(blockHeader),
        `Seal Quest Block #${blockHeader.index}`,
        (response: any) => {
          if (response && (response.success === true || response.result)) {
            const txId = (response.result && typeof response.result === 'string') 
              ? response.result 
              : (response.data && response.data.tx_id) || 'verified';
              
            resolve({ success: true, txId: txId, message: 'Anchored to Blurt Mainnet' });
          } else {
            const errMsg = response?.message || response?.error || 'User rejected anchoring';
            resolve({ success: false, message: errMsg });
          }
        }
      );
    } catch (e: any) {
      resolve({ success: false, message: `Vault Protocol Error: ${e.message}` });
    }
  });
  */
};

export const fetchMainnetHistory = async (account: string): Promise<any[]> => {
  // Return empty if we want to remove mainnet sync dependency
  return [];
};

/**
 * DECOUPLED: Verification is skipped. Claims are now instant for simulation.
 */
export const verifyBlurtTransaction = async (txId: string, expectedUser: string): Promise<{ success: boolean; amount: number; message: string }> => {
  console.log("[BRIDGE] Verification decoupled. Simulating deposit verification.");
  return { success: true, amount: 100, message: 'Verified (Decoupled Mode)' };
  
  /* DEPRECATED:
  for (const node of BLURT_RPC_NODES) {
    try {
      const response = await fetch(node, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'condenser_api.get_account_history',
          params: ['tekraze', -1, 50], 
          id: 1,
        }),
      });
      const data = await response.json();
      if (!data.result) continue;
      const tx = data.result.find((item: any) => {
        const op = item[1].op;
        return op[0] === 'transfer' && op[1].memo.includes(expectedUser) && (item[1].trx_id === txId || txId.length < 10);
      });
      if (tx) {
        const amountStr = tx[1].op[1].amount; 
        const amount = parseFloat(amountStr.split(' ')[0]);
        return { success: true, amount, message: 'Verified on Blurt' };
      }
    } catch (e) { continue; }
  }
  return { success: false, amount: 0, message: 'Transaction not found' };
  */
};
