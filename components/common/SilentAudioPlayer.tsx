
import React, { useEffect, useRef, useContext } from 'react';
import { TimerContext } from '../../contexts/TimerContext';

// 1-second silent MP3 to keep the AudioSession active on iOS/Mobile
const SILENT_AUDIO_URL = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTVFMAAAANAAADTGl2b2NhdHQuY29t/7UMAAAAAAAAAAAAAAP/7UMQAAABAAAAAAAAAAAAAAP/7UMQAAABAAAAAAAAAAAAAAP/7UMQAAABAAAAAAAAAAAAAAA=';

const SilentAudioPlayer: React.FC = () => {
  const { activeTimerInfo, activeTimedSet, activeQuickTimer, activeHiitSession } = useContext(TimerContext);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Determine if any timer requires the app to stay awake/active
  const isTimerRunning = !!(
      (activeTimerInfo && !activeTimerInfo.isPaused) || // Rest Timer
      activeTimedSet || // Timed Set (Plank etc)
      activeQuickTimer || // Quick Timer
      activeHiitSession // HIIT Session
  );

  useEffect(() => {
    if (isTimerRunning) {
      audioRef.current?.play().catch(() => {
        // Auto-play might be blocked until user interaction.
        // This is expected behavior on some browsers until the user touches the screen.
      });
    } else {
      audioRef.current?.pause();
    }
  }, [isTimerRunning]);

  return (
    <audio
      ref={audioRef}
      src={SILENT_AUDIO_URL}
      loop
      playsInline
      style={{ display: 'none' }}
    />
  );
};

export default SilentAudioPlayer;
