
// Simple hash function for simulation (not secure for real crypto)
export const simpleHash = (data) => {
  let hash = 0;
  if (data.length === 0) return '00000000';
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(64, '0'); // Pad to look like sha256
};

export const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const calculateMerkleRoot = (transactions) => {
  if (transactions.length === 0) return simpleHash('empty_block');
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
