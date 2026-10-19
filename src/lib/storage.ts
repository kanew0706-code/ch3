// 瀏覽器儲存空間可能被封鎖（無痕模式等），讀寫都不能讓程式當掉。
export function safeGet(store: Storage, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(store: Storage, key: string, value: string): void {
  try {
    store.setItem(key, value);
  } catch {
    /* 忽略 */
  }
}

export function safeRemove(store: Storage, key: string): void {
  try {
    store.removeItem(key);
  } catch {
    /* 忽略 */
  }
}
