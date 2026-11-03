// Archivio locale su IndexedDB: cache delle note, registrazioni in attesa di upload
// e pezzi di audio salvati DURANTE la registrazione (recupero se la pagina si chiude).

const DB_NAME = "gpverse-notes";
const DB_VER = 1;
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("notes")) db.createObjectStore("notes", { keyPath: "id" });
      if (!db.objectStoreNames.contains("pending")) db.createObjectStore("pending", { keyPath: "id" });
      if (!db.objectStoreNames.contains("live")) db.createObjectStore("live", { keyPath: "id" });
      if (!db.objectStoreNames.contains("chunks")) db.createObjectStore("chunks", { keyPath: ["recId", "seq"] });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

function wrap(req) {
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
}

async function store(name, mode = "readonly") {
  const db = await open();
  return db.transaction(name, mode).objectStore(name);
}

export const idb = {
  async get(name, key) { return wrap((await store(name)).get(key)); },
  async all(name) { return wrap((await store(name)).getAll()); },
  async put(name, value) { return wrap((await store(name, "readwrite")).put(value)); },
  async del(name, key) { return wrap((await store(name, "readwrite")).delete(key)); },

  async chunksOf(recId) {
    const range = IDBKeyRange.bound([recId, 0], [recId, Number.MAX_SAFE_INTEGER]);
    return wrap((await store("chunks")).getAll(range));
  },
  async delChunks(recId) {
    const range = IDBKeyRange.bound([recId, 0], [recId, Number.MAX_SAFE_INTEGER]);
    return wrap((await store("chunks", "readwrite")).delete(range));
  },
};
