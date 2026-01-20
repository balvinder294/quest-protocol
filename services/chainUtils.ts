// Simple hash function for simulation (not secure for real crypto)
export const simpleHash = (data: string): string => {
  let hash = 0;
  if (data.length === 0) return '00000000';
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(64, '0'); // Pad to look like sha256
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};
