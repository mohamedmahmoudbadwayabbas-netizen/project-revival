// مؤثرات صوتية خفيفة مبنية على WebAudio (بدون ملفات MP3 لتقليل الحجم)
let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, dur: number, when = 0, type: OscillatorType = "sine", gain = 0.15) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** نقرة قصيرة ناعمة عند الإضافة للسلة */
export function playClickSound() {
  tone(880, 0.08, 0, "triangle", 0.12);
  tone(1320, 0.06, 0.03, "sine", 0.08);
}

/** رنين نجاح مبهج قصير عند تأكيد الطلب */
export function playSuccessSound() {
  tone(659.25, 0.12, 0, "sine", 0.14); // E5
  tone(783.99, 0.12, 0.1, "sine", 0.14); // G5
  tone(1046.5, 0.18, 0.2, "sine", 0.16); // C6
}
