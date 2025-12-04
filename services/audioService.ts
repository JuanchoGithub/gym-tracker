
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
      ctx.resume().catch(e => console.error("Resume failed", e));
    }
    
    // Keep alive mechanism: create a short silent buffer and loop it.
    // This is more robust than an oscillator on iOS safari to prevent suspension.
    // We check if we already have a node playing? No, we just ensure context is active.
    // A very quiet, looped buffer source.
    const buffer = ctx.createBuffer(1, 1, 22050); // 1 sample, 1 channel, low rate
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true; // Loop indefinitely
    source.connect(ctx.destination);
    source.start(0);
    
  } catch (e) {
    console.error("Failed to unlock AudioContext:", e);
  }
};

// Stores active scheduled sources so we can stop them if paused/cancelled
let scheduledSources: AudioScheduledSourceNode[] = [];

export const stopScheduledSounds = () => {
    scheduledSources.forEach(source => {
        try {
            source.stop();
        } catch (e) {
            // Ignore errors if already stopped
        }
    });
    scheduledSources = [];
};

export const scheduleEndSound = (delayInSeconds: number) => {
    if (delayInSeconds < 0) return;
    try {
        const ctx = getAudioContext();
        // Ensure context is running or will run
        if (ctx.state === 'suspended') ctx.resume();

        const startTime = ctx.currentTime + delayInSeconds;

        const createBellHit = (time: number) => {
            const fundamental = 392; // G4
            const partials = [0.5, 1, 1.5, 2.4, 3.6, 4.5]; 
            const amplitudes = [0.1, 0.5, 0.3, 0.25, 0.1, 0.05];
            const decayTime = 1.8;

            partials.forEach((partial, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = index < 2 ? 'sine' : 'triangle'; 
                osc.frequency.setValueAtTime(fundamental * partial, time);
                
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(amplitudes[index], time + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001, time + decayTime);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(time);
                osc.stop(time + decayTime);
                
                scheduledSources.push(osc);
                osc.onended = () => {
                    const idx = scheduledSources.indexOf(osc);
                    if (idx > -1) scheduledSources.splice(idx, 1);
                };
            });
        };

        // Schedule two hits
        createBellHit(startTime);
        createBellHit(startTime + 0.4);

    } catch (e) {
        console.error("Failed to schedule sound:", e);
    }
};

const playSound = (createSound: (ctx: AudioContext, time: number) => void) => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    createSound(ctx, ctx.currentTime);
  } catch (e) {
    console.error("Failed to play sound:", e);
  }
};

export const playWarningSound = () => {
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
      const partials = [0.5, 1, 1.5, 2.4, 3.6, 4.5]; 
      const amplitudes = [0.1, 0.5, 0.3, 0.25, 0.1, 0.05];
      const decayTime = 1.8;

      partials.forEach((partial, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = index < 2 ? 'sine' : 'triangle'; 
        osc.frequency.setValueAtTime(fundamental * partial, startTime);
        
        gain.gain.setValueAtTime(amplitudes[index], startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayTime);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + decayTime);
      });
    };

    createBellHit(time);
    createBellHit(time + 0.4);
  });
};
