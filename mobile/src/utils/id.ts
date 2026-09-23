let sequence = 0;

/** Collision-resistant enough for offline records without requiring native crypto. */
export function createId(prefix: string): string {
  sequence = (sequence + 1) % 1_000_000;
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}-${random}`;
}
