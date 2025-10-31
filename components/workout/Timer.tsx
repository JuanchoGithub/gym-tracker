import React, { useState, useEffect, useRef } from 'react';
import { playWarningSound, playEndSound, playTickSound } from '../../services/audioService';
import { Icon } from '../common/Icon';
import { useI18n } from '../../hooks/useI18n';
import { formatTime, formatSecondsToMMSS } from '../../utils/timeUtils';
import Modal from '../common/Modal';

interface TimerProps {
  duration: number; // in seconds
  effortTime: number;
  failureTime: number;
  onFinish: () => void;
  onTimeChange?: (newTime: number) => void;
}

const Timer: React.FC<TimerProps> = ({ duration: initialDuration, effortTime, failureTime, onFinish, onTimeChange }) => {
  const { t } = useI18n();
  const [totalDuration, setTotalDuration] = useState(initialDuration);
  const [timeLeft, setTimeLeft] = useState(initialDuration);
  const [isPaused, setIsPaused] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState<{title: string, message: string} | null>(null);
  
  const targetTimeRef = useRef<number>(0);
  const onFinishRef = useRef(onFinish);
  const onTimeChangeRef = useRef(onTimeChange);
  const isInitialMount = useRef(true);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    onTimeChangeRef.current = onTimeChange;
  }, [onTimeChange]);

  const resetTimer = (newDuration: number) => {
    setIsPaused(false);
    setTimeLeft(newDuration);
    targetTimeRef.current = Date.now() + newDuration * 1000;
  };

  const setTimer = (newDuration: number) => {
    setTotalDuration(newDuration);
    resetTimer(newDuration);
    onTimeChangeRef.current?.(newDuration);
  }

  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        // Initial setup logic:
        setTotalDuration(initialDuration);
        resetTimer(initialDuration);
        return;
    }
    
    // This now runs only on subsequent renders when initialDuration changes.
    const oldDuration = totalDuration;
    if (initialDuration === oldDuration) return; // No change in prop

    // If timer is not running, just reset to new duration
    if (isPaused || timeLeft <= 0) {
        setTotalDuration(initialDuration);
        resetTimer(initialDuration);
        return;
    }

    const currentElapsed = oldDuration - timeLeft;

    // Slashing
    if (initialDuration < oldDuration) {
        if (currentElapsed >= initialDuration) {
            const newTimeLeft = 5;
            targetTimeRef.current = Date.now() + newTimeLeft * 1000;
            setTimeLeft(newTimeLeft);
            const newTotalDuration = currentElapsed + newTimeLeft;
            setTotalDuration(newTotalDuration);
            onTimeChangeRef.current?.(newTotalDuration);
        } else {
            const newTimeLeft = initialDuration - currentElapsed;
            targetTimeRef.current = Date.now() + newTimeLeft * 1000;
            setTimeLeft(newTimeLeft);
            setTotalDuration(initialDuration);
            onTimeChangeRef.current?.(initialDuration);
        }
    } else if (initialDuration > oldDuration) { // Increasing
        const newTimeLeft = initialDuration - currentElapsed;
        targetTimeRef.current = Date.now() + newTimeLeft * 1000;
        setTimeLeft(newTimeLeft);
        setTotalDuration(initialDuration);
        onTimeChangeRef.current?.(initialDuration);
    }
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDuration]);

  useEffect(() => {
    if (isPaused || timeLeft <= 0) {
      return;
    }

    const interval = setInterval(() => {
      const remainingMs = targetTimeRef.current - Date.now();
      const newTimeLeft = Math.max(0, Math.round(remainingMs / 1000));
      
      setTimeLeft(prevTimeLeft => {
        if (prevTimeLeft > 10 && newTimeLeft <= 10) {
          playWarningSound();
        } else if (newTimeLeft <= 3 && newTimeLeft > 0 && prevTimeLeft > newTimeLeft) {
          playTickSound();
        }

        if (newTimeLeft <= 0 && prevTimeLeft > 0) {
          playEndSound();
          onFinishRef.current();
        }
        return newTimeLeft;
      });
      
      if (newTimeLeft <= 0) {
        setIsPaused(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, timeLeft]);

  const togglePause = () => {
    setIsPaused(prevIsPaused => {
      const nextIsPaused = !prevIsPaused;
      if (!nextIsPaused) { // Resuming
        targetTimeRef.current = Date.now() + timeLeft * 1000;
      }
      return nextIsPaused;
    });
  };

  const modifyTime = (amount: number) => {
    const newTotal = Math.max(0, totalDuration + amount);
    setTotalDuration(newTotal);

    setTimeLeft(prev => {
      const newTime = Math.max(0, prev + amount);
      if (!isPaused) {
        targetTimeRef.current = Date.now() + newTime * 1000;
      }
      onTimeChangeRef.current?.(newTime);
      if (newTime === 0 && amount < 0) {
        onFinishRef.current();
      }
      return newTime;
    });
  };

  const handleReset = () => {
    setTimer(initialDuration);
  };

  const handleSkip = () => {
    setIsPaused(true);
    setTimeLeft(0);
    onTimeChangeRef.current?.(0);
    onFinishRef.current();
  };

  const elapsedSeconds = Math.max(0, totalDuration - timeLeft);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = totalDuration > 0 ? (elapsedSeconds / totalDuration) * 100 : 0;

  const presetButtonClass = "flex-1 bg-secondary text-text-primary font-semibold py-3 rounded-lg flex flex-col items-center justify-center text-sm";
  const infoButtonClass = "absolute top-1 right-1 text-text-secondary/50 hover:text-text-secondary";

  return (
    <div className="my-2 bg-slate-700 rounded-lg">
        {!isKeyboardVisible ? (
            <div
                className="p-3 flex items-center justify-center relative cursor-pointer"
                onClick={() => setIsKeyboardVisible(true)}
                role="button"
                tabIndex={0}
                aria-label="Open timer controls"
            >
                <div className="absolute top-0 left-0 h-full bg-primary/30 rounded-lg" style={{ width: `${progress}%` }}></div>
                <div className="relative text-2xl font-mono font-bold text-warning">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
            </div>
        ) : (
            <div className="p-4 flex flex-col items-center justify-center space-y-4">
                <div className="flex items-stretch justify-center gap-2 w-full">
                    <button onClick={() => modifyTime(-10)} className="bg-secondary text-text-primary font-semibold py-4 px-4 rounded-lg flex items-center justify-center text-xl">
                        {t('workout_timer_sub')}
                    </button>
                    <button
                        onClick={togglePause}
                        className="relative bg-surface text-text-primary font-bold py-4 px-4 rounded-lg text-2xl flex items-center justify-center shadow-lg overflow-hidden flex-grow"
                    >
                        <div
                            className="absolute top-0 left-0 h-full bg-primary"
                            style={{ width: `${progress}%`, transition: 'width 200ms linear' }}
                        ></div>
                        <span className="relative flex items-center">
                            <Icon name={isPaused ? 'play' : 'pause'} className="w-10 h-10 mr-3"/>
                            <div className="flex flex-col text-left">
                                <span className="text-xl font-bold leading-tight">{isPaused ? t('timer_resume') : t('timer_pause')}</span>
                                <span className="text-sm font-mono font-normal leading-tight">{formatTime(elapsedSeconds)} / {formatTime(totalDuration)}</span>
                            </div>
                        </span>
                    </button>
                    <button onClick={() => modifyTime(10)} className="bg-secondary text-text-primary font-semibold py-4 px-4 rounded-lg flex items-center justify-center text-xl">
                        {t('workout_timer_add')}
                    </button>
                </div>

                 <div className="flex gap-2 w-full">
                    <button onClick={handleReset} className={presetButtonClass}>
                        <span>{t('timer_reset')}</span>
                        <span className="font-mono">{formatSecondsToMMSS(initialDuration)}</span>
                    </button>
                    <button onClick={() => setTimer(effortTime)} className={`${presetButtonClass} relative`}>
                        <span>{t('timer_effort')}</span>
                        <span className="font-mono">{formatSecondsToMMSS(effortTime)}</span>
                        <div className={infoButtonClass} onClick={(e) => { e.stopPropagation(); setInfoModalContent({title: t('timer_effort_desc_title'), message: t('timer_effort_desc')})}}>
                            <Icon name="question-mark-circle" className="w-4 h-4" />
                        </div>
                    </button>
                    <button onClick={() => setTimer(failureTime)} className={`${presetButtonClass} relative`}>
                        <span>{t('timer_failure')}</span>
                        <span className="font-mono">{formatSecondsToMMSS(failureTime)}</span>
                        <div className={infoButtonClass} onClick={(e) => { e.stopPropagation(); setInfoModalContent({title: t('timer_failure_desc_title'), message: t('timer_failure_desc')})}}>
                            <Icon name="question-mark-circle" className="w-4 h-4" />
                        </div>
                    </button>
                </div>
                 <div className="grid grid-cols-2 gap-2 w-full">
                    <button onClick={handleSkip} className="bg-secondary text-text-primary font-semibold py-3 rounded-lg">{t('timer_skip')}</button>
                    <button onClick={() => setIsKeyboardVisible(false)} className="bg-secondary text-text-primary font-semibold py-3 rounded-lg">{t('timer_hide')}</button>
                </div>
            </div>
        )}
        {infoModalContent && (
            <Modal isOpen={!!infoModalContent} onClose={() => setInfoModalContent(null)} title={infoModalContent.title}>
                <p className="text-text-secondary">{infoModalContent.message}</p>
            </Modal>
        )}
    </div>
  );
};

export default Timer;