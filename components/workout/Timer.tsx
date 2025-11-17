import React, { useState, useEffect, useRef, useMemo } from 'react';
import { playWarningSound, playEndSound, playTickSound } from '../../services/audioService';
import { Icon } from '../common/Icon';
import { useI18n } from '../../hooks/useI18n';
import { formatTime, formatSecondsToMMSS } from '../../utils/timeUtils';
import Modal from '../common/Modal';
import { ActiveTimerInfo } from '../../contexts/AppContext';

interface TimerProps {
  timerInfo: ActiveTimerInfo;
  effortTime: number;
  failureTime: number;
  onFinish: () => void;
  onTogglePause: (isPaused: boolean, timeLeft: number) => void;
  onTimeUpdate: (updates: { newTimeLeft?: number, newTotalDuration?: number }) => void;
  onChangeDuration: (newDuration: number) => void;
}

const Timer: React.FC<TimerProps> = ({ timerInfo, effortTime, failureTime, onFinish, onTogglePause, onTimeUpdate, onChangeDuration }) => {
  const { t } = useI18n();
  const [tick, setTick] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState<{title: string, message: string} | null>(null);
  
  const onFinishRef = useRef(onFinish);
  const prevTimeLeftRef = useRef<number>();

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const timeLeft = useMemo(() => {
    if (timerInfo.isPaused) {
      return timerInfo.timeLeftWhenPaused;
    }
    // tick is a dependency to force re-evaluation
    return Math.max(0, Math.round((timerInfo.targetTime - Date.now()) / 1000));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerInfo, tick]);

  useEffect(() => {
    if (timerInfo.isPaused) {
      return;
    }
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 250);
    return () => clearInterval(interval);
  }, [timerInfo.isPaused]);

  useEffect(() => {
    const prevTime = prevTimeLeftRef.current;
    
    if (prevTime !== undefined && !timerInfo.isPaused) {
        if (prevTime > 10 && timeLeft <= 10) {
          playWarningSound();
        } else if (timeLeft <= 3 && timeLeft > 0 && prevTime > timeLeft) {
          playTickSound();
        }
        if (timeLeft <= 0 && prevTime > 0) {
          playEndSound();
          onFinishRef.current();
        }
    }

    prevTimeLeftRef.current = timeLeft;
  }, [timeLeft, timerInfo.isPaused]);


  const togglePause = () => {
    onTogglePause(!timerInfo.isPaused, timeLeft);
  };

  const modifyTime = (amount: number) => {
    const newTimeLeft = Math.max(0, timeLeft + amount);
    const newTotalDuration = Math.max(0, timerInfo.totalDuration + amount);
    onTimeUpdate({ newTimeLeft, newTotalDuration });
    if (newTimeLeft === 0 && amount < 0) {
        onFinishRef.current();
    }
  };

  const handleReset = () => {
    const newTimeLeft = timerInfo.initialDuration;
    // The total duration should also be reset for the progress bar.
    onTimeUpdate({ newTimeLeft, newTotalDuration: timerInfo.initialDuration });
    if (timerInfo.isPaused) {
        onTogglePause(false, newTimeLeft);
    }
  };

  const handleSkip = () => {
    onFinishRef.current();
  };

  const elapsedSeconds = Math.max(0, timerInfo.totalDuration - timeLeft);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = timerInfo.totalDuration > 0 ? (elapsedSeconds / timerInfo.totalDuration) * 100 : 0;

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
                            <Icon name={timerInfo.isPaused ? 'play' : 'pause'} className="w-10 h-10 mr-3"/>
                            <div className="flex flex-col text-left">
                                <span className="text-xl font-bold leading-tight">{timerInfo.isPaused ? t('timer_resume') : t('timer_pause')}</span>
                                <span className="text-sm font-mono font-normal leading-tight">{formatTime(elapsedSeconds)} / {formatTime(timerInfo.totalDuration)}</span>
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
                        <span className="font-mono">{formatSecondsToMMSS(timerInfo.initialDuration)}</span>
                    </button>
                    <button onClick={() => onChangeDuration(effortTime)} className={`${presetButtonClass} relative`}>
                        <span>{t('timer_effort')}</span>
                        <span className="font-mono">{formatSecondsToMMSS(effortTime)}</span>
                        <div className={infoButtonClass} onClick={(e) => { e.stopPropagation(); setInfoModalContent({title: t('timer_effort_desc_title'), message: t('timer_effort_desc')})}}>
                            <Icon name="question-mark-circle" className="w-4 h-4" />
                        </div>
                    </button>
                    <button onClick={() => onChangeDuration(failureTime)} className={`${presetButtonClass} relative`}>
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