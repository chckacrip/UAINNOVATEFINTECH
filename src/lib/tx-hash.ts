import { createHash } from "crypto";

/**
 * Generate a deterministic transaction ID from its core fields.
 * Prevents duplicates when CSV ingestion is retried.
 *
 * Hash inputs: user_id + posted_at + amount + description (normalized)
 * Returns a UUID-v5-style string for use as the primary key.
 */
export function transactionHash(
  userId: string,
  postedAt: string,
  amount: number,
  description: string
): string {
  const normalized = [
    userId,
    postedAt,
    amount.toFixed(2),
    description.toLowerCase().replace(/\s+/g, " ").trim(),
  ].join("|");

  const hash = createHash("sha256").update(normalized).digest("hex");

  // Format as UUID for Postgres compatibility
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
}
