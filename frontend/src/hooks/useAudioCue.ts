import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AudioCueState {
  muted: boolean;
  toggleMuted: () => void;
  playClick: () => void;
  playSuccess: () => void;
  playNotification: () => void;
}

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (typeof AudioContext === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(params: {
  frequency: number;
  endFrequency?: number;
  duration: number;
  gain: number;
}): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(params.frequency, ctx.currentTime);

    if (params.endFrequency !== undefined) {
      oscillator.frequency.linearRampToValueAtTime(
        params.endFrequency,
        ctx.currentTime + params.duration / 1000,
      );
    }

    gainNode.gain.setValueAtTime(params.gain, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + params.duration / 1000);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + params.duration / 1000);
  } catch {
    // Silently ignore audio errors
  }
}

export const useAudioCue = create<AudioCueState>()(
  persist(
    (set, get) => ({
      muted: false,
      toggleMuted: () => set((state) => ({ muted: !state.muted })),
      playClick: () => {
        if (get().muted) return;
        playTone({ frequency: 1200, duration: 40, gain: 0.08 });
      },
      playSuccess: () => {
        if (get().muted) return;
        playTone({ frequency: 800, endFrequency: 1200, duration: 80, gain: 0.06 });
      },
      playNotification: () => {
        if (get().muted) return;
        playTone({ frequency: 900, duration: 60, gain: 0.07 });
      },
    }),
    {
      name: 'madarek-audio-muted',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ muted: state.muted }),
    },
  ),
);
