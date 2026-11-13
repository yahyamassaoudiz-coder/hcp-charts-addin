/**
 * CacheService.js — Two-Tier Caching Layer
 * ==========================================
 * Tier 1: In-memory Map (session cache, 30-min TTL)
 * Tier 2: localStorage (persistent cache, 24-hour TTL)
 */

const SESSION_TTL = 30 * 60 * 1000;
const PERSISTENT_TTL = 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = "hcp_charts_";

const sessionCache = new Map();

export function sessionGet(key) {
  const entry = sessionCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > SESSION_TTL) {
    sessionCache.delete(key);
    return null;
  }
  return entry.data;
}

export function sessionSet(key, data) {
  sessionCache.set(key, { data, timestamp: Date.now() });
}

export function persistentGet(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > PERSISTENT_TTL) {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch (e) {
    console.warn("[CacheService] localStorage read error:", e.message);
    return null;
  }
}

export function persistentSet(key, data) {
  try {
    const entry = JSON.stringify({ data, timestamp: Date.now() });
    localStorage.setItem(STORAGE_PREFIX + key, entry);
  } catch (e) {
    console.warn("[CacheService] localStorage write error:", e.message);
    clearExpiredPersistent();
  }
}

export function smartGet(key) {
  const sessionResult = sessionGet(key);
  if (sessionResult !== null) return sessionResult;
  const persistentResult = persistentGet(key);
  if (persistentResult !== null) {
    sessionSet(key, persistentResult);
    return persistentResult;
  }
  return null;
}

export function smartSet(key, data, options = {}) {
  if (!options.persistentOnly) sessionSet(key, data);
  if (!options.sessionOnly) persistentSet(key, data);
}

export function clearAll() {
  sessionCache.clear();
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log("[CacheService] All caches cleared");
}

export function clearExpiredPersistent() {
  const now = Date.now();
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      try {
        const entry = JSON.parse(localStorage.getItem(key));
        if (now - entry.timestamp > PERSISTENT_TTL) {
          keysToRemove.push(key);
        }
      } catch (e) {
        keysToRemove.push(key);
      }
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  if (keysToRemove.length > 0) {
    console.log(`[CacheService] Cleared ${keysToRemove.length} expired entries`);
  }
}

export function getStats() {
  let persistentCount = 0;
  let persistentSize = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      persistentCount++;
      persistentSize += (localStorage.getItem(key) || "").length;
    }
  }
  return {
    session: { entries: sessionCache.size, ttl: SESSION_TTL },
    persistent: { entries: persistentCount, sizeBytes: persistentSize * 2, ttl: PERSISTENT_TTL }
  };
}

const CacheService = {
  sessionGet, sessionSet,
  persistentGet, persistentSet,
  smartGet, smartSet,
  clearAll, clearExpiredPersistent, getStats
};
export default CacheService;
