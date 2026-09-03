import { useEffect, useState } from 'react';

/**
 * Real, live microphone input level (0-1) for the prejoin screen's level
 * meter. Only active pre-join: no provider SDK is connected yet at this
 * point (LiveKitCall/JitsiCall/ZoomCall don't mount until 'live'), so this
 * opens its own short-lived getUserMedia stream purely to read levels, and
 * tears it down on unmount — never left open once a real session starts
 * (the provider adapter owns the mic stream from that point on).
 */
export function useMicLevel(active: boolean): number {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!active || !navigator.mediaDevices?.getUserMedia) {
      setLevel(0);
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let rafId: number | null = null;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
          setLevel(Math.min(1, avg / 128));
          rafId = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // Permission denied/no device — level stays 0, never faked.
      }
    }

    start();

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      audioContext?.close().catch(() => undefined);
      stream?.getTracks().forEach((t) => t.stop());
      setLevel(0);
    };
  }, [active]);

  return level;
}
