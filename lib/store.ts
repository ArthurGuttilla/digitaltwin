/**
 * In-memory creator store.
 *
 * Key: `${userId}:${handle}` — ties each twin to the Google user who created it.
 * A secondary index keyed by `handle` lets the public chat page look up twins
 * without knowing the owner's userId.
 *
 * Note: replace with a persistent DB (e.g. Vercel Postgres, Upstash) for production.
 */

export interface CreatorProfile {
  userId: string;        // Google user ID (session.user.id)
  handle: string;        // creator's handle / slug
  displayName: string;
  email?: string;
  avatar?: string;
  boxId: string | null;  // Tropicalia project ID
  connectedPlatforms: Platform[];
  totalChunks: number;
  lastIngested?: string;
}

export type Platform = "twitter" | "youtube" | "instagram" | "manual";

// Primary store — key: `${userId}:${handle}`
const store = new Map<string, CreatorProfile>();

// Secondary index — key: handle (for public twin chat lookups)
const handleIndex = new Map<string, string>(); // handle → primary key

function primaryKey(userId: string, handle: string): string {
  return `${userId}:${handle.toLowerCase()}`;
}

export function getCreator(userId: string, handle: string): CreatorProfile | undefined {
  return store.get(primaryKey(userId, handle));
}

/** Look up a twin by handle only (used by the public /twin/[handle] chat page). */
export function getCreatorByHandle(handle: string): CreatorProfile | undefined {
  const key = handleIndex.get(handle.toLowerCase());
  return key ? store.get(key) : undefined;
}

export function upsertCreator(profile: CreatorProfile): void {
  const key = primaryKey(profile.userId, profile.handle);
  store.set(key, profile);
  handleIndex.set(profile.handle.toLowerCase(), key);
}

export function getUserCreators(userId: string): CreatorProfile[] {
  return Array.from(store.values()).filter((c) => c.userId === userId);
}

export function deleteCreator(userId: string, handle: string): void {
  const key = primaryKey(userId, handle);
  store.delete(key);
  handleIndex.delete(handle.toLowerCase());
}
