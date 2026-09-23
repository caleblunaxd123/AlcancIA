let salt = 0;

export const CryptoDigestAlgorithm = { SHA256: 'SHA256' };
export const getRandomBytesAsync = async (length: number) => {
  salt += 1;
  return new Uint8Array(Array.from({ length }, (_, index) => (salt + index) % 255));
};
export const digestStringAsync = async (_algorithm: string, value: string) => {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `hash:${(hash >>> 0).toString(16)}`;
};
