export const ALL_STORAGE_KEYS = [
  "t0", "t1", "t2",
  "pt.slot.1", "pt.slot.2", "pt.slot.3",
  "pt.language", "pt.music", "pt.sfx", "pt.volume", "pt.zoomOut",
  "pt.hudStyle", "pt.mapFit",
  "pt.achievements", "pt.achievement_stats",
  "pt.ambience", "pt.dayNight", "pt.emotes", "pt.weather",
] as const;

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const webStorageAdapter: StorageAdapter = {
  async getItem(key) {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  },
};

let adapter = webStorageAdapter;
const cache = new Map<string, string | null>();
const pendingWrites = new Set<Promise<boolean>>();

/** Load persistent values before the game runtime starts; frame-time readers use this cache. */
export async function initializeStorage(source: StorageAdapter = webStorageAdapter): Promise<void> {
  adapter = source;
  await Promise.all(ALL_STORAGE_KEYS.map(async (key) => {
    try {
      cache.set(key, await adapter.getItem(key));
    } catch {
      cache.set(key, null);
    }
  }));
}

/** Read the initialized cache without doing storage I/O in a tick or render callback. */
export function readStorage(key: string): string | null {
  return cache.get(key) ?? null;
}

/** Update memory immediately and persist asynchronously outside the game loop. */
export function writeStorage(key: string, value: string): Promise<boolean> {
  cache.set(key, value);
  const pending = Promise.resolve().then(() => adapter.setItem(key, value)).then(() => true, () => false);
  pendingWrites.add(pending);
  void pending.then(() => pendingWrites.delete(pending));
  return pending;
}

export function removeStorage(key: string): Promise<boolean> {
  cache.set(key, null);
  const pending = Promise.resolve().then(() => adapter.removeItem(key)).then(() => true, () => false);
  pendingWrites.add(pending);
  void pending.then(() => pendingWrites.delete(pending));
  return pending;
}

/** Wait for persistence already in flight when a page is about to be suspended. */
export async function flushStorage(): Promise<void> {
  await Promise.all(pendingWrites);
}
