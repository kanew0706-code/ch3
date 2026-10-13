// 分頁標題未讀數與提示音（docs/architecture.md 第 7.6 節）
const BASE_TITLE = '匿名聊天室';

export function setUnreadTitle(count: number): void {
  document.title = count > 0 ? `(${count > 99 ? '99+' : count}) ${BASE_TITLE}` : BASE_TITLE;
}

let ctx: AudioContext | null = null;

/** 手機瀏覽器要求：使用者操作過才能出聲。在按「進入」時呼叫。 */
export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

/** 約 0.2 秒、柔和的雙音提示（用程式產生，不需要音效檔） */
export function playNotify(): void {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  for (const [freq, offset] of [[880, 0], [1320, 0.08]] as const) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t + offset);
    gain.gain.exponentialRampToValueAtTime(0.08, t + offset + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.14);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + offset);
    osc.stop(t + offset + 0.16);
  }
}
