
// Consistency-focused hash for simulation
export const simpleHash = (data) => {
  if (!data || data.length === 0) return '0'.repeat(64);
  
  let h1 = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    h1 = Math.imul(h1 ^ data.charCodeAt(i), 16777619);
  }
  
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (Math.imul(h1, 0x5bd1e995) >>> 0).toString(16).padStart(8, '0');
  const p3 = (Math.imul(h1, h1) >>> 0).toString(16).padStart(8, '0');
  
  return (p1 + p2 + p3).padEnd(64, 'f').substring(0, 64);
};

export const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const calculateMerkleRoot = (transactions) => {
  if (!transactions || transactions.length === 0) return simpleHash('empty');
  return simpleHash(transactions.map(t => t.id).sort().join(','));
};

export const validateBlock = (newBlock, lastBlock, witnesses) => {
  const expectedIndex = lastBlock ? lastBlock.index + 1 : 1;
  if (newBlock.index !== expectedIndex) return { valid: false };
  if (lastBlock && newBlock.previousHash !== lastBlock.hash) return { valid: false };
  return { valid: true };
};
