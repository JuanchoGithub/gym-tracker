import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useI18n } from '../hooks/useI18n';
import { useWakeLock } from '../hooks/useWakeLock';
import { playWarningSound, playEndSound } from '../services/audioService';
import { Icon } from '../components/common/Icon';
import { formatSecondsToMMSS } from '../utils/timeUtils';

type TimerMode = 'quick' | 'hiit';

interface ActiveTimerState {
  isActive: boolean;
  mode: TimerMode;
  timeLeft: number;
  totalDuration: number;
  isPaused: boolean;
  hiitState?: 'prepare' | 'work' | 'rest';
  currentRound?: number;
  totalRounds?: number;
  workTime?: number;
  restTime?: number;
}

const TimersPage: React.FC = () => {
  const { t } = useI18n();

  const [quickTime, setQuickTime] = useState(300); // 5 minutes default
  const [hiitConfig, setHiitConfig] = useState({ work: 30, rest: 15, rounds: 10 });
  
  const [activeTimer, setActiveTimer] = useState<ActiveTimerState>({
    isActive: false, mode: 'quick', timeLeft: 0, totalDuration: 0, isPaused: false,
  });

  useWakeLock(activeTimer.isActive && !activeTimer.isPaused);
  const intervalRef = useRef<number | null>(null);
  const targetTimeRef = useRef<number>(0);
  const playSoundRef = useRef({ playWarningSound, playEndSound });

  useEffect(() => {
    if (!activeTimer.isActive || activeTimer.isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = window.setInterval(() => {
      const newTimeLeft = Math.max(0, Math.round((targetTimeRef.current - Date.now()) / 1000));
      
      setActiveTimer(prev => {
        if (newTimeLeft === prev.timeLeft) return prev; // No change
        if (prev.mode === 'hiit' && newTimeLeft <= 3 && newTimeLeft > 0 && prev.timeLeft > newTimeLeft) {
            playSoundRef.current.playWarningSound();
        }

        if (newTimeLeft === 0) {
            playSoundRef.current.playEndSound();
            if (prev.mode === 'quick' || (prev.mode === 'hiit' && prev.hiitState === 'work' && prev.currentRound === prev.totalRounds)) {
                return { ...prev, timeLeft: 0, hiitState: 'work' }; // End of timer
            }
            if (prev.mode === 'hiit') {
                if (prev.hiitState === 'prepare' || prev.hiitState === 'rest') {
                    // Transition to Work
                    targetTimeRef.current = Date.now() + prev.workTime! * 1000;
                    return { ...prev, hiitState: 'work', timeLeft: prev.workTime!, totalDuration: prev.workTime! };
                } else { // hiitState is 'work'
                    // Transition to Rest
                    targetTimeRef.current = Date.now() + prev.restTime! * 1000;
                    return { ...prev, hiitState: 'rest', timeLeft: prev.restTime!, totalDuration: prev.restTime!, currentRound: prev.currentRound! + 1 };
                }
            }
        }

        return { ...prev, timeLeft: newTimeLeft };
      });
    }, 200);

    return () => { if(intervalRef.current) clearInterval(intervalRef.current) };
  }, [activeTimer.isActive, activeTimer.isPaused]);

  const startQuickTimer = (seconds: number) => {
    setQuickTime(seconds);
    targetTimeRef.current = Date.now() + seconds * 1000;
    setActiveTimer({
      isActive: true, mode: 'quick', timeLeft: seconds, totalDuration: seconds, isPaused: false,
    });
  };

  const startHiitTimer = () => {
    targetTimeRef.current = Date.now() + 10 * 1000; // 10s prepare time
    setActiveTimer({
      isActive: true,
      mode: 'hiit',
      timeLeft: 10,
      totalDuration: 10,
      isPaused: false,
      hiitState: 'prepare',
      currentRound: 1,
      totalRounds: hiitConfig.rounds,
      workTime: hiitConfig.work,
      restTime: hiitConfig.rest,
    });
  };

  const stopTimer = () => setActiveTimer({ ...activeTimer, isActive: false });
  const togglePause = () => setActiveTimer(p => {
    if (p.isPaused) targetTimeRef.current = Date.now() + p.timeLeft * 1000;
    return {...p, isPaused: !p.isPaused }
  });
  
  const progress = activeTimer.totalDuration > 0 ? ((activeTimer.totalDuration - activeTimer.timeLeft) / activeTimer.totalDuration) * 100 : 0;
  
  const quickTimeOptions = [
    { label: `5 ${t('timers_minute_abbreviation')}`, value: 300 },
    { label: `10 ${t('timers_minute_abbreviation')}`, value: 600 },
    { label: `15 ${t('timers_minute_abbreviation')}`, value: 900 },
  ];

  const renderActiveTimer = () => {
    const { mode, timeLeft, hiitState, currentRound, totalRounds } = activeTimer;
    const isFinished = timeLeft === 0;

    let stateColor = "text-primary";
    if (mode === 'hiit') {
        if (hiitState === 'work' && !isFinished) stateColor = "text-red-400";
        if (hiitState === 'rest' && !isFinished) stateColor = "text-green-400";
        if (hiitState === 'prepare' && !isFinished) stateColor = "text-yellow-400";
    }
    if (isFinished) stateColor = "text-success";
    
    return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-4">
            <div className="text-center w-full max-w-md">
                {mode === 'hiit' && (
                    <div className="mb-4">
                        {/* FIX: Corrected the dynamic translation key for HIIT timer states. */}
                        <p className={`text-4xl font-bold uppercase ${stateColor}`}>{isFinished ? t('timers_complete') : t(hiitState === 'prepare' ? 'timers_prepare' : `timers_hiit_${hiitState}`)}</p>
                        <p className="text-2xl text-text-secondary">{t('timers_round')} {currentRound} {t('timers_of')} {totalRounds}</p>
                    </div>
                )}
                
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 mx-auto flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                        <circle className="text-surface" strokeWidth="5" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
                        <circle
                            className={stateColor}
                            strokeWidth="5"
                            strokeDasharray={2 * Math.PI * 45}
                            strokeDashoffset={(2 * Math.PI * 45) * (1 - progress / 100)}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="45"
                            cx="50"
                            cy="50"
                            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                        />
                    </svg>
                    <div className={`text-6xl sm:text-7xl font-mono font-bold ${isFinished ? 'text-success' : 'text-text-primary'}`}>{formatSecondsToMMSS(timeLeft)}</div>
                </div>

                <div className="mt-8 flex items-center justify-center space-x-6">
                    <button onClick={stopTimer} className="bg-red-600/80 hover:bg-red-600 text-white font-bold py-4 px-8 rounded-lg">{t('timers_stop_button')}</button>
                    <button onClick={togglePause} className="bg-secondary hover:bg-slate-500 text-white font-bold py-4 px-8 rounded-lg">
                        {activeTimer.isPaused ? t('timers_resume_button') : t('timers_pause_button')}
                    </button>
                </div>
            </div>
        </div>
    )
  }

  const renderSetup = () => {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-center">{t('nav_timers')}</h1>
        
        {/* Quick Timers */}
        <div className="bg-surface p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-primary">{t('timers_quick_title')}</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {quickTimeOptions.map(opt => (
              <button key={opt.value} onClick={() => startQuickTimer(opt.value)} className="bg-secondary/50 text-text-primary font-bold py-4 rounded-lg text-lg hover:bg-secondary transition-colors">
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* HIIT Timer */}
        <div className="bg-surface p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-primary">{t('timers_hiit_title')}</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
                {[
                  { label: t('timers_hiit_work'), key: 'work' as const },
                  { label: t('timers_hiit_rest'), key: 'rest' as const },
                  { label: t('timers_hiit_rounds'), key: 'rounds' as const }
                ].map(({label, key}) => (
                    <div key={key}>
                        <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
                        <input
                            type="number"
                            value={hiitConfig[key]}
                            onChange={e => setHiitConfig({...hiitConfig, [key]: Math.max(0, parseInt(e.target.value) || 0)})}
                            className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 text-center text-lg"
                        />
                    </div>
                ))}
            </div>
            <button onClick={startHiitTimer} className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition-colors">
                {t('timers_hiit_start_button')}
            </button>
        </div>
      </div>
    );
  };
  
  return activeTimer.isActive ? renderActiveTimer() : renderSetup();
};

export default TimersPage;
