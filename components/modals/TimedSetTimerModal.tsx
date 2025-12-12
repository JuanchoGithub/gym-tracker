
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
  isUnilateral?: boolean;
}

// Added phases for unilateral flow
interface TimerState {
  phase: 'prepare' | 'work' | 'work_left' | 'switch' | 'work_right' | 'rest' | 'finished';
  currentRep: number;
  timeLeft: number;
  totalDuration: number;
}

const TimedSetTimerModal: React.FC<TimedSetTimerModalProps> = ({ isOpen, onFinish, onClose, set, exerciseName, restTime, isUnilateral = false }) => {
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
      
      const announceText = isUnilateral 
        ? t('timers_announce_prepare', { exercise: exerciseName }) + `. ${t('timers_side_left')}.`
        : t('timers_announce_prepare', { exercise: exerciseName });
        
      speak(announceText, selectedVoiceURI, locale);
    }
  }, [isOpen, exerciseName, locale, selectedVoiceURI, t, isUnilateral]);

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
          const workTime = set.time || 0;
          const switchTime = 10; // Default switch time

          if (prev.phase === 'prepare') {
            // Unilateral branching
            if (isUnilateral) {
                targetTimeRef.current = Date.now() + workTime * 1000;
                return { ...prev, phase: 'work_left', timeLeft: workTime, totalDuration: workTime };
            } else {
                targetTimeRef.current = Date.now() + workTime * 1000;
                return { ...prev, phase: 'work', timeLeft: workTime, totalDuration: workTime };
            }
          }
          
          // Unilateral Specific Logic
          if (prev.phase === 'work_left') {
              speak(t('timers_switch'), selectedVoiceURI, locale);
              targetTimeRef.current = Date.now() + switchTime * 1000;
              return { ...prev, phase: 'switch', timeLeft: switchTime, totalDuration: switchTime };
          }
          
          if (prev.phase === 'switch') {
              speak(t('timers_side_right'), selectedVoiceURI, locale);
              targetTimeRef.current = Date.now() + workTime * 1000;
              return { ...prev, phase: 'work_right', timeLeft: workTime, totalDuration: workTime };
          }
          
          // Completion Logic (Work Right or Standard Work)
          if (prev.phase === 'work' || prev.phase === 'work_right') {
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
             const nextRep = prev.currentRep + 1;
             
             if (isUnilateral) {
                speak(t('timers_side_left'), selectedVoiceURI, locale);
                targetTimeRef.current = Date.now() + workTime * 1000;
                return { ...prev, phase: 'work_left', currentRep: nextRep, timeLeft: workTime, totalDuration: workTime };
             } else {
                targetTimeRef.current = Date.now() + workTime * 1000;
                return { ...prev, phase: 'work', currentRep: nextRep, timeLeft: workTime, totalDuration: workTime };
             }
          }
        }
        return { ...prev, timeLeft: newTimeLeft };
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isOpen, isPaused, timerState, set, restTime, exerciseName, locale, selectedVoiceURI, t, isUnilateral]);

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
  let phaseLabel = '';
  
  switch(phase) {
      case 'work':
          stateColor = "text-red-400";
          phaseLabel = t('timers_hiit_work');
          break;
      case 'work_left':
          stateColor = "text-blue-400";
          phaseLabel = t('timers_side_left');
          break;
      case 'work_right':
          stateColor = "text-blue-400";
          phaseLabel = t('timers_side_right');
          break;
      case 'switch':
          stateColor = "text-orange-400";
          phaseLabel = t('timers_switch');
          break;
      case 'rest':
          stateColor = "text-green-400";
          phaseLabel = t('timers_hiit_rest');
          break;
      case 'prepare':
          stateColor = "text-yellow-400";
          phaseLabel = t('timers_prepare');
          break;
      case 'finished':
          stateColor = "text-success";
          phaseLabel = t('timers_complete');
          break;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-4">
      <div className="text-center w-full max-w-md">
        <div className="mb-4 min-h-24 flex flex-col justify-center">
          <p className={`text-2xl font-bold uppercase ${stateColor}`}>{phaseLabel}</p>
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
