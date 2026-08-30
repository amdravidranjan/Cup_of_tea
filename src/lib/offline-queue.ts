export interface QueuedAction {
  id: string;
  url: string;
  method: string;
  body?: string;
  label: string;
  createdAt: string;
}

export interface QueueStorage {
  getAll(): QueuedAction[];
  setAll(actions: QueuedAction[]): void;
}

// In-memory storage for tests / non-browser contexts. The real app uses
// localStorage (see makeLocalStorageQueue below) — this indirection is
// what makes the queue logic itself unit-testable without a DOM.
export function createMemoryStorage(): QueueStorage {
  let actions: QueuedAction[] = [];
  return {
    getAll: () => actions,
    setAll: (next) => {
      actions = next;
    },
  };
}

export function enqueue(
  storage: QueueStorage,
  action: { url: string; method: string; body?: string; label: string }
): QueuedAction {
  const queued: QueuedAction = {
    id: crypto.randomUUID(),
    url: action.url,
    method: action.method,
    body: action.body,
    label: action.label,
    createdAt: new Date().toISOString(),
  };
  storage.setAll([...storage.getAll(), queued]);
  return queued;
}

export function dequeue(storage: QueueStorage, id: string): void {
  storage.setAll(storage.getAll().filter((a) => a.id !== id));
}

export function listQueued(storage: QueueStorage): QueuedAction[] {
  return storage.getAll();
}

const STORAGE_KEY = "land-acquisition:offline-queue";

export function makeLocalStorageQueue(): QueueStorage {
  return {
    getAll: () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as QueuedAction[]) : [];
      } catch {
        return [];
      }
    },
    setAll: (actions) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
      } catch {
        // storage unavailable (private browsing, quota) — queue is
        // best-effort, silently drop rather than crash the UI
      }
    },
  };
}

// Replays every queued action against the network, in order, dropping
// each one only after a successful response — a failed replay leaves the
// remaining queue intact for the next attempt.
export async function replayQueue(
  storage: QueueStorage,
  fetchImpl: typeof fetch = fetch
): Promise<{ succeeded: number; remaining: number }> {
  const actions = listQueued(storage);
  let succeeded = 0;
  for (const action of actions) {
    try {
      const res = await fetchImpl(action.url, {
        method: action.method,
        headers: action.body ? { "Content-Type": "application/json" } : undefined,
        body: action.body,
      });
      if (res.ok) {
        dequeue(storage, action.id);
        succeeded++;
      }
    } catch {
      // still offline — stop here, keep the rest queued in order
      break;
    }
  }
  return { succeeded, remaining: listQueued(storage).length };
}
