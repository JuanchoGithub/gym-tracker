import React, { useState, useEffect } from 'react';
import { playWarningSound, playEndSound } from '../../services/audioService';
import { Icon } from '../common/Icon';
import { useI18n } from '../../hooks/useI18n';

interface TimerProps {
  duration: number; // in seconds
  onFinish: () => void;
}

const Timer: React.FC<TimerProps> = ({ duration, onFinish }) => {
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    if (timeLeft <= 0) {
      playEndSound();
      onFinish();
      return;
    }

    if (timeLeft === 10) {
      playWarningSound();
    }

    const intervalId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeft, onFinish, isPaused]);
  
  const modifyTime = (amount: number) => {
    setTimeLeft(prev => Math.max(0, prev + amount));
  }

  const handleReset = () => {
    setTimeLeft(duration);
    setIsPaused(false);
  };

  const handleSkip = () => {
    onFinish();
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = duration > 0 ? ((duration - timeLeft) / duration) * 100 : 0;

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
                <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="relative w-full bg-surface text-text-primary font-bold py-4 rounded-lg text-2xl flex items-center justify-center shadow-lg overflow-hidden"
                >
                    <div
                        className="absolute top-0 left-0 h-full bg-primary"
                        style={{ width: `${progress}%`, transition: 'width 200ms linear' }}
                    ></div>
                    <span className="relative flex items-center">
                        <Icon name={isPaused ? 'play' : 'pause'} className="w-8 h-8 mr-3"/>
                        <span>{isPaused ? 'RESUME' : 'PAUSE'}</span>
                    </span>
                </button>
                <div className="grid grid-cols-2 gap-2 w-full">
                    <button onClick={() => modifyTime(-10)} className="bg-secondary text-text-primary font-semibold py-3 rounded-lg">-10s</button>
                    <button onClick={() => modifyTime(10)} className="bg-secondary text-text-primary font-semibold py-3 rounded-lg">+10s</button>
                    <button onClick={handleReset} className="bg-secondary text-text-primary font-semibold py-3 rounded-lg">RESET</button>
                    <button onClick={handleSkip} className="bg-secondary text-text-primary font-semibold py-3 rounded-lg">SKIP</button>
                </div>
                <button onClick={() => setIsKeyboardVisible(false)} className="w-full bg-primary/50 text-white font-bold py-2 rounded-lg mt-2">
                    HIDE
                </button>
            </div>
        )}
    </div>
  );
};

export default Timer;