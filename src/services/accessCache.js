/**
 * IndexedDB Cache para acervo de jogos das plataformas (Área de Membros)
 * Cache local de 24 horas para navegação rápida e baixo tráfego de rede.
 */

export const DB_NAME = 'DSG_Access_Catalog_v2';
export const LEGACY_DB_NAMES = ['DSG_Access_Catalog_v1'];
export const CACHE_SCHEMA_VERSION = 2;
const DB_STORE = 'catalogs';
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

const memoryCache = new Map();
let lastCleanedIndexedDB = null;

export function cleanupLegacyDatabases(indexedDBRef) {
  const deleted = [];
  if (!indexedDBRef || typeof indexedDBRef.deleteDatabase !== 'function') {
    return deleted;
  }
  for (const legacyName of LEGACY_DB_NAMES) {
    try {
      indexedDBRef.deleteDatabase(legacyName);
      deleted.push(legacyName);
    } catch {
      // ignora falha de limpeza de banco legado
    }
  }
  return deleted;
}

function openDatabase() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return resolve(null);
    }
    try {
      if (lastCleanedIndexedDB !== window.indexedDB) {
        lastCleanedIndexedDB = window.indexedDB;
        cleanupLegacyDatabases(window.indexedDB);
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function getCachedCatalog(platformId) {
  if (!platformId) return null;

  // 1. Fallback em memória primeiro
  const mem = memoryCache.get(platformId);
  if (mem) {
    if (mem.schemaVersion === CACHE_SCHEMA_VERSION && Date.now() - mem.timestamp < CACHE_TTL_MS) {
      return mem.data;
    }
    memoryCache.delete(platformId);
  }

  // 2. IndexedDB
  try {
    const db = await openDatabase();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(DB_STORE, 'readonly');
        const store = tx.objectStore(DB_STORE);
        const req = store.get(platformId);
        req.onsuccess = () => {
          const res = req.result;
          if (
            res &&
            res.schemaVersion === CACHE_SCHEMA_VERSION &&
            Date.now() - res.timestamp < CACHE_TTL_MS
          ) {
            memoryCache.set(platformId, {
              data: res.data,
              timestamp: res.timestamp,
              schemaVersion: res.schemaVersion,
            });
            resolve(res.data);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

export async function setCachedCatalog(platformId, data) {
  if (!platformId || !Array.isArray(data)) return;

  const now = Date.now();
  memoryCache.set(platformId, { data, timestamp: now, schemaVersion: CACHE_SCHEMA_VERSION });

  try {
    const db = await openDatabase();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(DB_STORE, 'readwrite');
        const store = tx.objectStore(DB_STORE);
        const req = store.put({
          id: platformId,
          data,
          timestamp: now,
          schemaVersion: CACHE_SCHEMA_VERSION,
        });
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    // Falha silenciosa no IndexedDB, mantendo cache em memória
  }
}

export async function clearCachedCatalog(platformId) {
  if (!platformId) return;
  memoryCache.delete(platformId);

  try {
    const db = await openDatabase();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(DB_STORE, 'readwrite');
        const store = tx.objectStore(DB_STORE);
        const req = store.delete(platformId);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    // ignora
  }
}
