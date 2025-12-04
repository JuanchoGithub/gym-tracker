
import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useI18n } from '../hooks/useI18n';
import { useWakeLock } from '../hooks/useWakeLock';
import { playWarningSound, playEndSound, unlockAudioContext, playTickSound } from '../services/audioService';
import { formatSecondsToMMSS } from '../utils/timeUtils';
import { AppContext } from '../contexts/AppContext';
import { TimerContext } from '../contexts/TimerContext';
import { Routine } from '../types';
import { speak } from '../services/speechService';
import { Icon } from '../components/common/Icon';

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
  exerciseList?: (string | undefined)[] | null;
  exerciseIndex?: number;
  sessionStartTime?: number;
}

const TimersPage: React.FC = () => {
  const { t, locale } = useI18n();
  const { getExerciseById, selectedVoiceURI } = useContext(AppContext);
  const { activeHiitSession, endHiitSession, activeQuickTimer, endQuickTimer } = useContext(TimerContext);
  
  const [activeTimer, setActiveTimer] = useState<ActiveTimerState>({
    isActive: false, mode: 'quick', timeLeft: 0, totalDuration: 0, isPaused: false,
  });

  useWakeLock(activeTimer.isActive && !activeTimer.isPaused);
  const intervalRef = useRef<number | null>(null);
  const targetTimeRef = useRef<number>(0);
  const playSoundRef = useRef({ playWarningSound, playEndSound, playTickSound });
  const prevActiveTimerRef = useRef<ActiveTimerState | undefined>(undefined);

  const startQuickTimer = useCallback((seconds: number) => {
    unlockAudioContext();
    targetTimeRef.current = Date.now() + seconds * 1000;
    setActiveTimer({
      isActive: true, mode: 'quick', timeLeft: seconds, totalDuration: seconds, isPaused: false,
    });
  }, []);

  const startHiitTimer = useCallback((routine: Routine) => {
    unlockAudioContext();
    
    const workTime = routine.hiitConfig!.workTime;
    const restTime = routine.hiitConfig!.restTime;
    const rounds = routine.exercises.length;
    const prepareTime = routine.hiitConfig!.prepareTime ?? 10;
    const exercises = routine.exercises.map(ex => ex.exerciseId ? getExerciseById(ex.exerciseId)?.name : `${t('timers_round')} ${routine.exercises.indexOf(ex) + 1}`);

    targetTimeRef.current = Date.now() + prepareTime * 1000;
    setActiveTimer({
      isActive: true,
      mode: 'hiit',
      timeLeft: prepareTime,
      totalDuration: prepareTime,
      isPaused: false,
      hiitState: 'prepare',
      currentRound: 1,
      totalRounds: rounds,
      workTime: workTime,
      restTime: restTime,
      exerciseList: exercises,
      exerciseIndex: 0,
      sessionStartTime: Date.now(),
    });
  }, [getExerciseById, t]);

  useEffect(() => {
    if (activeQuickTimer && !activeTimer.isActive) {
        startQuickTimer(activeQuickTimer);
    } else if (activeHiitSession && !activeTimer.isActive) {
      startHiitTimer(activeHiitSession.routine);
    }
  }, [activeHiitSession, activeQuickTimer, activeTimer.isActive, startHiitTimer, startQuickTimer]);

  useEffect(() => {
    if (!activeTimer.isActive || activeTimer.isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = window.setInterval(() => {
      const newTimeLeft = Math.max(0, Math.round((targetTimeRef.current - Date.now()) / 1000));
      
      setActiveTimer(prev => {
        if (newTimeLeft === prev.timeLeft && newTimeLeft > 0) return prev; // No change

        if (newTimeLeft <= 3 && newTimeLeft > 0 && prev.timeLeft > newTimeLeft) {
            playSoundRef.current.playTickSound();
        }

        if (newTimeLeft === 0) {
            playSoundRef.current.playEndSound();
            if (prev.mode === 'quick') {
                endQuickTimer();
                return { ...prev, timeLeft: 0, isPaused: true };
            }
            if (prev.mode === 'hiit') {
                const isLastRound = prev.currentRound! >= prev.totalRounds!;
                
                if (prev.hiitState === 'prepare') {
                    targetTimeRef.current = Date.now() + prev.workTime! * 1000;
                    return { ...prev, hiitState: 'work', timeLeft: prev.workTime!, totalDuration: prev.workTime! };
                }
                if (prev.hiitState === 'work') {
                    if (isLastRound) {
                        endHiitSession();
                        return { ...prev, timeLeft: 0, isPaused: true };
                    }
                    targetTimeRef.current = Date.now() + prev.restTime! * 1000;
                    return { ...prev, hiitState: 'rest', timeLeft: prev.restTime!, totalDuration: prev.restTime! };
                }
                if (prev.hiitState === 'rest') {
                    targetTimeRef.current = Date.now() + prev.workTime! * 1000;
                    const nextIndex = (prev.exerciseIndex ?? -1) + 1;
                    const nextRound = prev.currentRound! + 1;
                    return { 
                        ...prev, 
                        hiitState: 'work', 
                        timeLeft: prev.workTime!, 
                        totalDuration: prev.workTime!, 
                        currentRound: nextRound,
                        exerciseIndex: nextIndex,
                    };
                }
            }
        }

        return { ...prev, timeLeft: newTimeLeft };
      });
    }, 200);

    return () => { if(intervalRef.current) clearInterval(intervalRef.current) };
  }, [activeTimer.isActive, activeTimer.isPaused, endHiitSession, endQuickTimer]);
  
  // Effect for handling voice announcements
  useEffect(() => {
    const prevTimer = prevActiveTimerRef.current;
    if (!activeTimer.isActive || !prevTimer || !activeTimer.sessionStartTime) {
        prevActiveTimerRef.current = activeTimer;
        return;
    }

    // State transition detection for announcements
    if (activeTimer.hiitState !== prevTimer.hiitState) {
        if (activeTimer.hiitState === 'rest') {
            const nextExerciseName = activeTimer.exerciseList?.[(activeTimer.exerciseIndex ?? -1) + 1] || '';
            if (nextExerciseName) {
                speak(t('timers_announce_rest', { exercise: nextExerciseName }), selectedVoiceURI, locale);
            }
        }
    }

    // Finish detection
    const isFinishedNow = activeTimer.timeLeft === 0 && (activeTimer.mode === 'quick' || (activeTimer.hiitState === 'work' && activeTimer.currentRound === activeTimer.totalRounds));
    const wasFinishedBefore = prevTimer.timeLeft === 0 && (prevTimer.mode === 'quick' || (prevTimer.hiitState === 'work' && prevTimer.currentRound === prevTimer.totalRounds));
    
    if (isFinishedNow && !wasFinishedBefore) {
        if (activeTimer.mode === 'hiit') {
            const durationMs = Date.now() - activeTimer.sessionStartTime;
            const durationMinutes = Math.round(durationMs / 60000);
            speak(t('timers_announce_finish', { minutes: durationMinutes }), selectedVoiceURI, locale);
        }
    }

    prevActiveTimerRef.current = activeTimer;
  }, [activeTimer, t, locale, selectedVoiceURI]);

  const stopTimer = () => {
    if (activeTimer.mode === 'hiit') {
      endHiitSession();
    } else {
      endQuickTimer();
    }
    setActiveTimer({ ...activeTimer, isActive: false });
    window.speechSynthesis.cancel(); // Stop any announcements
  };

  const togglePause = () => setActiveTimer(p => {
    if (p.isPaused) targetTimeRef.current = Date.now() + p.timeLeft * 1000;
    return {...p, isPaused: !p.isPaused }
  });
  
  const progress = activeTimer.totalDuration > 0 ? ((activeTimer.totalDuration - activeTimer.timeLeft) / activeTimer.totalDuration) * 100 : 0;
  
  if (!activeTimer.isActive) {
    return null;
  }

  const { mode, timeLeft, hiitState, currentRound, totalRounds, exerciseList, exerciseIndex } = activeTimer;
  const isFinished = timeLeft === 0 && (mode === 'quick' || (hiitState === 'work' && currentRound === totalRounds));
  
  const currentExerciseName = exerciseList && exerciseList.length > (exerciseIndex ?? -1) ? exerciseList[exerciseIndex ?? 0] : null;
  const nextExerciseName = exerciseList && exerciseList.length > (exerciseIndex ?? -1) + 1 ? exerciseList[(exerciseIndex ?? 0) + 1] : null;

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
              {mode === 'hiit' ? (
                  <div className="mb-4 min-h-24 flex flex-col justify-center">
                      <p className={`text-4xl font-bold ${hiitState === 'work' && currentExerciseName ? '' : 'uppercase'} ${stateColor}`}>
                          {isFinished 
                              ? t('timers_complete') 
                              : (hiitState === 'work' && currentExerciseName) 
                                  ? currentExerciseName
                                  : t(hiitState === 'prepare' ? 'timers_prepare' : `timers_hiit_${hiitState}`)
                          }
                      </p>
              
                      {!isFinished && (
                          <p className="text-2xl text-text-secondary">{t('timers_round')} {currentRound} {t('timers_of')} {totalRounds}</p>
                      )}
                      
                      {hiitState === 'prepare' && currentExerciseName && !isFinished && (
                          <p className="text-lg mt-2 text-text-secondary">Next: {currentExerciseName}</p>
                      )}
                      {hiitState === 'rest' && nextExerciseName && !isFinished && (
                          <p className="text-lg mt-2 text-text-secondary">Next: {nextExerciseName}</p>
                      )}
                  </div>
              ) : (
                <div className="mb-4 min-h-24 flex flex-col justify-center">
                    <p className={`text-4xl font-bold uppercase ${stateColor}`}>{isFinished ? t('timers_complete') : t('timers_quick_title')}</p>
                </div>
              )}
              
              <div
                  className="relative w-64 h-64 sm:w-80 sm:h-80 mx-auto flex items-center justify-center cursor-pointer"
                  onClick={() => !isFinished && togglePause()}
              >
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
                          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.2s linear' }}
                      />
                  </svg>
                  <div className={`font-mono font-bold ${isFinished ? 'text-success' : 'text-text-primary'}`}>
                      {activeTimer.isPaused && !isFinished ? (
                          <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-56 h-56 sm:w-72 sm:h-72 text-text-secondary/40"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1}
                          >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
                          </svg>
                      ) : (
                          <div className="text-6xl sm:text-7xl">{formatSecondsToMMSS(activeTimer.timeLeft)}</div>
                      )}
                  </div>
              </div>

              <div className="mt-8 flex items-center justify-center space-x-6">
                  <button onClick={stopTimer} className="bg-red-600/80 hover:bg-red-600 text-white font-bold py-4 px-8 rounded-lg">{t('timers_stop_button')}</button>
                  {!isFinished && (
                    <button onClick={togglePause} className="bg-secondary hover:bg-slate-500 text-white font-bold py-4 px-8 rounded-lg">
                        {activeTimer.isPaused ? t('timers_resume_button') : t('timers_pause_button')}
                    </button>
                  )}
              </div>
          </div>
      </div>
  );
};

export default TimersPage;
