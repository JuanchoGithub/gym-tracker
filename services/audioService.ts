
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

const playSound = (createSound: (ctx: AudioContext, time: number) => void) => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    createSound(ctx, ctx.currentTime);
  } catch (e) {
    console.error("Failed to play sound:", e);
  }
};

export const playWarningSound = () => {
  playSound((ctx, time) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, time); // A5 note
    gainNode.gain.setValueAtTime(0.3, time);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(time);
    oscillator.stop(time + 0.5);
  });
};

export const playEndSound = () => {
  playSound((ctx, time) => {
    // Bell sound
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1000, time);
    oscillator.frequency.exponentialRampToValueAtTime(200, time + 1.5);

    gainNode.gain.setValueAtTime(0.5, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 1.5);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(time);
    oscillator.stop(time + 1.5);

    // Clang sound
    const oscillator2 = ctx.createOscillator();
    const gainNode2 = ctx.createGain();

    oscillator2.type = 'triangle';
    oscillator2.frequency.setValueAtTime(1500, time);
    oscillator2.frequency.exponentialRampToValueAtTime(400, time + 1);

    gainNode2.gain.setValueAtTime(0.3, time);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, time + 1);
    
    oscillator2.connect(gainNode2);
    gainNode2.connect(ctx.destination);

    oscillator2.start(time);
    oscillator2.stop(time + 1);
  });
};
