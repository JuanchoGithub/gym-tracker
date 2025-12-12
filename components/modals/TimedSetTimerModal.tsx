
import React, { useState, useEffect, useRef, useContext } from 'react';
import { PerformedSet } from '../../types';
import { playWarningSound, playEndSound } from '../../services/audioService';
import { Icon } from '../common/Icon';
import { useI18n } from '../../hooks/useI18n';
import { formatSecondsToMMSS } from '../../utils/timeUtils';
import { useWakeLock } from '../../hooks/useWakeLock';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/timeUtils';
import { AppContext } from '../../contexts/AppContext';
import { speak } from '../../services/speechService';

interface TimedSetTimerModalProps {
  isOpen: boolean;
  onFinish: () => void;
  onClose: () => void;
  set: PerformedSet;
  exerciseName: string;
  restTime: number;
}

interface TimerState {
  phase: 'prepare' | 'work' | 'rest' | 'finished';
  currentRep: number;
  timeLeft: number;
  totalDuration: number;
}

const TimedSetTimerModal: React.FC<TimedSetTimerModalProps> = ({ isOpen, onFinish, onClose, set, exerciseName, restTime }) => {
  const { t, locale } = useI18n();
  const { selectedVoiceURI } = useContext(AppContext);
  const [timerState, setTimerState] = useState<TimerState>({ phase: 'prepare', currentRep: 1, timeLeft: 10, totalDuration: 10 });
  const [isPaused, setIsPaused] = useState(false);

  const targetTimeRef = useRef<number>(0);
  const onFinishRef = useRef(onFinish);
  useWakeLock(isOpen && !isPaused);

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [isOpen]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (isOpen) {
      setIsPaused(false);
      targetTimeRef.current = Date.now() + 10 * 1000;
      setTimerState({ phase: 'prepare', currentRep: 1, timeLeft: 10, totalDuration: 10 });
      speak(t('timers_announce_prepare', { exercise: exerciseName }), selectedVoiceURI, locale);
    }
  }, [isOpen, exerciseName, locale, selectedVoiceURI, t]);

  useEffect(() => {
    if (!isOpen || isPaused || timerState.phase === 'finished') {
      return;
    }

    const interval = setInterval(() => {
      const newTimeLeft = Math.max(0, Math.round((targetTimeRef.current - Date.now()) / 1000));

      setTimerState(prev => {
        if (newTimeLeft === prev.timeLeft && newTimeLeft > 0) return prev;

        if (newTimeLeft <= 3 && newTimeLeft > 0 && prev.timeLeft > newTimeLeft) {
          playWarningSound();
        }

        if (newTimeLeft === 0) {
          playEndSound();
          if (prev.phase === 'prepare') {
            targetTimeRef.current = Date.now() + (set.time || 0) * 1000;
            return { ...prev, phase: 'work', timeLeft: set.time || 0, totalDuration: set.time || 0 };
          }
          if (prev.phase === 'work') {
            if (prev.currentRep < set.reps) {
              speak(t('timers_announce_rest', { exercise: exerciseName }), selectedVoiceURI, locale);
              targetTimeRef.current = Date.now() + restTime * 1000;
              return { ...prev, phase: 'rest', timeLeft: restTime, totalDuration: restTime };
            } else {
              speak(t('timers_complete'), selectedVoiceURI, locale);
              onFinishRef.current();
              return { ...prev, phase: 'finished' };
            }
          }
          if (prev.phase === 'rest') {
            targetTimeRef.current = Date.now() + (set.time || 0) * 1000;
            return { ...prev, phase: 'work', currentRep: prev.currentRep + 1, timeLeft: set.time || 0, totalDuration: set.time || 0 };
          }
        }
        return { ...prev, timeLeft: newTimeLeft };
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isOpen, isPaused, timerState, set, restTime, exerciseName, locale, selectedVoiceURI, t]);

  const togglePause = () => {
    setIsPaused(prev => {
      if (prev) { // Resuming
        targetTimeRef.current = Date.now() + timerState.timeLeft * 1000;
      }
      return !prev;
    });
  };

  const handleManualFinish = () => {
      playEndSound();
      onFinishRef.current();
  };

  const progress = timerState.totalDuration > 0 ? ((timerState.totalDuration - timerState.timeLeft) / timerState.totalDuration) * 100 : 0;
  const { phase, timeLeft, currentRep } = timerState;
  const isFinished = phase === 'finished';

  let stateColor = "text-primary";
  if (phase === 'work') stateColor = "text-red-400";
  if (phase === 'rest') stateColor = "text-green-400";
  if (phase === 'prepare') stateColor = "text-yellow-400";
  if (isFinished) stateColor = "text-success";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-4">
      <div className="text-center w-full max-w-md">
        <div className="mb-4 min-h-24 flex flex-col justify-center">
          <p className={`text-2xl font-bold uppercase ${stateColor}`}>{isFinished ? t('timers_complete') : t(phase === 'prepare' ? 'timers_prepare' : `timers_hiit_${phase}`)}</p>
          <p className="text-4xl text-text-primary mt-1">{exerciseName}</p>
          {!isFinished && <p className="text-2xl text-text-secondary mt-2">{t('workout_set')} {currentRep}/{set.reps}</p>}
        </div>

        <div className="relative w-64 h-64 sm:w-80 sm:h-80 mx-auto flex items-center justify-center cursor-pointer" onClick={() => !isFinished && togglePause()}>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
            <circle className="text-surface" strokeWidth="5" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
            <circle
              className={stateColor} strokeWidth="5" strokeDasharray={2 * Math.PI * 45} strokeDashoffset={(2 * Math.PI * 45) * (1 - progress / 100)}
              strokeLinecap="round" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.2s linear' }}
            />
          </svg>
          <div className={`font-mono font-bold ${isFinished ? 'text-success' : 'text-text-primary'}`}>
            {isPaused && !isFinished ? (
              <Icon name="pause" className="w-56 h-56 sm:w-72 sm:h-72 text-text-secondary/40" />
            ) : (
              <div className="text-6xl sm:text-7xl">{formatSecondsToMMSS(timeLeft)}</div>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center space-x-6">
          <button onClick={onClose} className="bg-red-600/80 hover:bg-red-600 text-white font-bold py-4 px-8 rounded-lg">{isFinished ? t('common_cancel') : t('timers_stop_button')}</button>
          {!isFinished && (
            <button onClick={togglePause} className="bg-secondary hover:bg-slate-500 text-white font-bold py-4 px-8 rounded-lg">
              {isPaused ? t('timers_resume_button') : t('timers_pause_button')}
            </button>
          )}
        </div>
        
        {!isFinished && (
            <div className="mt-4">
                <button 
                    onClick={handleManualFinish}
                    className="w-full bg-success/20 hover:bg-success/30 text-success font-bold py-3 rounded-lg border border-success/30 transition-colors flex items-center justify-center gap-2"
                >
                    <Icon name="check" className="w-5 h-5" />
                    <span>{t('workout_finish')}</span>
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default TimedSetTimerModal;
