/** 送出前檢查：距離上一次不到 intervalMs 就擋下 */
export function createRateLimiter(intervalMs: number) {
  let last = -Infinity;
  return {
    tryHit(now = Date.now()): boolean {
      if (now - last < intervalMs) return false;
      last = now;
      return true;
    },
  };
}
