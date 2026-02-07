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

export function waitForVault(timeout = 3000) {
  return new Promise<any>((resolve) => {
    const check = () => {
      // Check all possible provider names used by Blurt extensions
      const vault = (window as any).whalevault || (window as any).blurt_keychain || (window as any).hive_keychain;
      if (vault) return vault;
      return null;
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

export const anchorBlockToBlurt = async (username: string, blockHeader: any): Promise<{ success: boolean; txId?: string; message: string }> => {
  const vault = await waitForVault(3000);
  if (!vault) return { success: false, message: 'WhaleVault / Keychain not detected.' };

  return new Promise((resolve) => {
    // Determine the correct method name based on provider
    const method = vault.requestCustomJson ? 'requestCustomJson' : 'request_custom_json';
    
    vault[method](
      username,
      'quest_p_v1',
      'Posting',
      JSON.stringify(blockHeader),
      `Seal Quest Block #${blockHeader.index}`,
      (response: any) => {
        if (response && (response.success || response.result)) {
          resolve({ success: true, txId: response.result || '00000000', message: 'Anchored to Blurt Mainnet' });
        } else {
          resolve({ success: false, message: response.error || 'Blurt anchoring failed' });
        }
      }
    );
  });
};

export const fetchMainnetHistory = async (account: string): Promise<any[]> => {
  try {
    const response = await fetch(BLURT_RPC_NODES[0], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'condenser_api.get_account_history',
        params: [account, -1, 100],
        id: 1,
      }),
    });
    const data = await response.json();
    return data.result || [];
  } catch (e) {
    console.error("Mainnet fetch error", e);
    return [];
  }
};

export const verifyBlurtTransaction = async (txId: string, expectedUser: string): Promise<{ success: boolean; amount: number; message: string }> => {
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
};

export const authenticateWithWhaleVault = async (username: string): Promise<{ success: boolean; signature?: string; message: string }> => {
  const vault = await waitForVault(3000);
  if (!vault) return { success: false, message: 'Extension not detected. Please install WhaleVault or Blurt Keychain.' };

  return new Promise((resolve) => {
    const memo = `Quest Protocol Auth: ${username} @ ${Date.now()}`;
    const method = vault.requestSignBuffer ? 'requestSignBuffer' : 'request_sign_buffer';
    
    vault[method](username, memo, 'Posting', (response: any) => {
      // Extensions vary in response format; handle common patterns
      if (response && (response.success || (typeof response === 'string' && response.length > 20))) {
        resolve({ success: true, signature: response.result || response, message: 'Verified.' });
      } else {
        const error = response?.message || response?.error || 'User rejected signature request.';
        resolve({ success: false, message: error });
      }
    });
  });
};