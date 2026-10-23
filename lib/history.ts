import type { SolutionStep } from '@/lib/engine/types';

export type HistoryInputType = 'upload' | 'camera' | 'pad' | 'typed';

export interface HistoryItem {
  id: string;
  inputType: HistoryInputType;
  expression: string;
  recognizedText: string;
  latex: string;
  problemType: string;
  finalAnswerPlain: string;
  finalAnswerLatex: string;
  steps: SolutionStep[];
  isVerified: boolean;
  favorite: boolean;
  createdAt: number;
}

export type NewHistoryItem = Omit<HistoryItem, 'id' | 'createdAt' | 'favorite'> & {
  favorite?: boolean;
};

const DB_NAME = 'mathlens-history';
const STORE_NAME = 'problems';
const DB_VERSION = 1;
const MAX_ITEMS = 250;

let databasePromise: Promise<IDBDatabase> | null = null;

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('Local history is not available in this browser.'));
  }
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local history.'));
    request.onblocked = () => reject(new Error('Local history is blocked by another tab.'));
  });

  return databasePromise;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local history request failed.'));
  });
}

export async function listHistory(): Promise<HistoryItem[]> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const items = await requestResult(transaction.objectStore(STORE_NAME).getAll() as IDBRequest<HistoryItem[]>);
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveHistory(input: NewHistoryItem): Promise<HistoryItem> {
  const db = await openDatabase();
  const record: HistoryItem = {
    ...input,
    id: createId(),
    favorite: input.favorite ?? false,
    createdAt: Date.now(),
  };

  const transaction = db.transaction(STORE_NAME, 'readwrite');
  await requestResult(transaction.objectStore(STORE_NAME).put(record));

  const all = await listHistory();
  if (all.length > MAX_ITEMS) {
    const excess = all.slice(MAX_ITEMS);
    const cleanup = db.transaction(STORE_NAME, 'readwrite');
    const store = cleanup.objectStore(STORE_NAME);
    await Promise.all(excess.map((item) => requestResult(store.delete(item.id))));
  }

  return record;
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  await requestResult(transaction.objectStore(STORE_NAME).delete(id));
}

export async function clearHistory(): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  await requestResult(transaction.objectStore(STORE_NAME).clear());
}

export async function setHistoryFavorite(id: string, favorite: boolean): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const item = await requestResult(store.get(id) as IDBRequest<HistoryItem | undefined>);
  if (!item) return;
  await requestResult(store.put({ ...item, favorite }));
}
