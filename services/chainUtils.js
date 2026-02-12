
// Improved hash function for simulation to prevent collisions in multi-node environments
export const simpleHash = (data) => {
  if (!data || data.length === 0) return '0'.repeat(64);
  
  // Multi-pass hash to fill more of the 64-character space
  let h1 = 0x811c9dc5;
  let h2 = 0xdeadbeef;
  
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    h1 = Math.imul(h1 ^ char, 16777619);
    h2 = Math.imul(h2 ^ char, 0x5bd1e995);
  }
  
  // Mix them
  h1 ^= h1 >>> 16;
  h2 ^= h2 >>> 16;
  
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const part3 = (Math.imul(h1, h2) >>> 0).toString(16).padStart(8, '0');
  const part4 = (Math.abs(h1 - h2) >>> 0).toString(16).padStart(8, '0');
  
  // Construct a 64-char string by repeating/mixing
  return (part1 + part2 + part3 + part4).padEnd(64, part1).substring(0, 64);
};

export const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const calculateMerkleRoot = (transactions) => {
  if (!transactions || transactions.length === 0) return simpleHash('empty_block');
  const txHashes = transactions.map(tx => simpleHash(JSON.stringify(tx)));
  
  let level = txHashes;
  while (level.length > 1) {
    const nextLevel = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = (i + 1 < level.length) ? level[i+1] : level[i];
      nextLevel.push(simpleHash(left + right));
    }
    level = nextLevel;
  }
  return level[0];
};

export const validateBlock = (newBlock, lastBlock, witnesses) => {
  // 1. Check Sequence
  const expectedIndex = lastBlock ? lastBlock.index + 1 : 1;
  if (newBlock.index !== expectedIndex) {
    return { valid: false, error: `Invalid Index: expected ${expectedIndex}, got ${newBlock.index}` };
  }

  // 2. Check Previous Hash Link
  if (lastBlock && newBlock.previousHash !== lastBlock.hash) {
    return { valid: false, error: "Chain Discontinuity: previousHash mismatch" };
  }

  // 3. Re-calculate Hash and Verify Header Integrity
  const headerToHash = {
    index: newBlock.index,
    previousHash: newBlock.previousHash,
    merkleRoot: newBlock.merkleRoot,
    timestamp: newBlock.timestamp,
    validator: newBlock.validator,
    chainId: newBlock.chainId
  };
  
  const calculatedHash = simpleHash(JSON.stringify(headerToHash));
  if (calculatedHash !== newBlock.hash) {
    return { valid: false, error: "Integrity Failure: hash mismatch" };
  }

  // 4. Verify Signatory Schedule (DPoS)
  if (witnesses && witnesses.length > 0) {
    const scheduleIndex = (newBlock.index - 1) % witnesses.length;
    const scheduledWitness = witnesses[scheduleIndex];
    if (newBlock.validator !== scheduledWitness) {
      return { valid: false, error: `Consensus Violation: expected ${scheduledWitness}, got ${newBlock.validator}` };
    }
  }

  return { valid: true };
};
