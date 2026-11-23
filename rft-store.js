// rft-store.js — 実験データを Quest 本体のブラウザ内（IndexedDB）に蓄積する
const DB_NAME = 'rft-data';
const STORE = 'sessions';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode, fn) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const st = t.objectStore(STORE);
    let out;
    Promise.resolve(fn(st)).then((v) => { out = v; });
    t.oncomplete = () => { db.close(); resolve(out); };
    t.onerror = () => { db.close(); reject(t.error); };
    t.onabort = () => { db.close(); reject(t.error); };
  }));
}

const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export function newSessionId(pid) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 6);
  return `${(pid || 'noid').replace(/[^\w-]/g, '_')}_${stamp}_${rand}`;
}

export async function putSession(s) {
  return tx('readwrite', (st) => reqP(st.put(s)));
}

export async function getSession(id) {
  return tx('readonly', (st) => reqP(st.get(id)));
}

export async function listSessions() {
  const all = await tx('readonly', (st) => reqP(st.getAll()));
  return (all || []).sort((a, b) => (b.startedISO || '').localeCompare(a.startedISO || ''));
}

export async function deleteSession(id) {
  return tx('readwrite', (st) => reqP(st.delete(id)));
}

// バックアップ（JSON）から取り込む。同じ id は上書きしない。
export async function importSessions(list) {
  const existing = new Set((await listSessions()).map((s) => s.id));
  let added = 0, skipped = 0;
  for (const s of list) {
    if (!s || !s.id || !Array.isArray(s.rows)) { skipped++; continue; }
    if (existing.has(s.id)) { skipped++; continue; }
    await putSession(s); added++;
  }
  return { added, skipped };
}

// ブラウザに「このサイトのデータを自動削除しないで」と依頼する（許可されるかは端末次第）
export async function requestPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch (e) { /* 未対応 */ }
  return false;
}

export async function estimate() {
  try { if (navigator.storage && navigator.storage.estimate) return await navigator.storage.estimate(); } catch (e) { /* 未対応 */ }
  return null;
}
