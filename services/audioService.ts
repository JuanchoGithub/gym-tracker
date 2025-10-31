

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

export const unlockAudioContext = () => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  } catch (e) {
    console.error("Failed to unlock AudioContext:", e);
  }
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
    // Create a "tock" sound
    const createTock = (startTime: number, frequency: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'triangle'; // A triangle wave has more harmonics than a sine, giving a richer sound.
        oscillator.frequency.setValueAtTime(frequency, startTime);

        // A very fast attack and decay to create a percussive sound
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.15);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.2);
    }
    
    // Play two "tocks" in succession
    createTock(time, 1200);
    createTock(time + 0.15, 1200);
  });
};

export const playTickSound = () => {
  playSound((ctx, time) => {
    const createTock = (startTime: number, frequency: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, startTime);

        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.15);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.2);
    }
    createTock(time, 1000);
  });
};


export const playEndSound = () => {
  playSound((ctx, time) => {
    const createBellHit = (startTime: number) => {
      const fundamental = 392; // G4
      // Inharmonic partials to create a metallic, bell-like timbre
      const partials = [0.5, 1, 1.5, 2.4, 3.6, 4.5]; 
      const amplitudes = [0.1, 0.5, 0.3, 0.25, 0.1, 0.05]; // Fundamental is loudest
      const decayTime = 1.8;

      partials.forEach((partial, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Mix of sine and triangle for a richer sound
        osc.type = index < 2 ? 'sine' : 'triangle'; 
        osc.frequency.setValueAtTime(fundamental * partial, startTime);
        
        // Sharp attack, long decay envelope for each partial
        gain.gain.setValueAtTime(amplitudes[index], startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayTime);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + decayTime);
      });
    };

    // Play two bell hits for the "dang dang" effect
    createBellHit(time);
    createBellHit(time + 0.4);
  });
};