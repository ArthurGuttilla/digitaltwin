/**
 * In-memory creator store (replace with a DB in production).
 * Keyed by creator handle. Stores the Tropicalia boxId and ingestion metadata.
 */

export interface CreatorProfile {
  handle: string;
  displayName: string;
  avatar?: string;
  boxId: string | null;
  connectedPlatforms: Platform[];
  totalChunks: number;
  lastIngested?: string;
}

export type Platform = "twitter" | "youtube" | "instagram" | "manual";

const store = new Map<string, CreatorProfile>();

export function getCreator(handle: string): CreatorProfile | undefined {
  return store.get(handle.toLowerCase());
}

export function upsertCreator(profile: CreatorProfile): void {
  store.set(profile.handle.toLowerCase(), profile);
}

export function allCreators(): CreatorProfile[] {
  return Array.from(store.values());
}

export function deleteCreator(handle: string): void {
  store.delete(handle.toLowerCase());
}
