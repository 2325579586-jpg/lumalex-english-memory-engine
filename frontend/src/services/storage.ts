const PREFIX = "lumalex";

function storageKey(key: string) {
  return `${PREFIX}:${key}`;
}

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    // Swallow storage errors so the app can continue with in-memory state.
  }
}

export function removeStorage(key: string) {
  try {
    window.localStorage.removeItem(storageKey(key));
  } catch {
    // ignore
  }
}
