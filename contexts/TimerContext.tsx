
import React, { createContext, useState, useContext, ReactNode, useCallback, useMemo, useEffect, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Routine, ActiveTimerInfo, TimedSetInfo } from '../types';

export interface TimerContextType {
  activeTimerInfo: ActiveTimerInfo | null;
  setActiveTimerInfo: React.Dispatch<React.SetStateAction<ActiveTimerInfo | null>>;
  activeTimedSet: TimedSetInfo | null;
  setActiveTimedSet: React.Dispatch<React.SetStateAction<TimedSetInfo | null>>;
  activeQuickTimer: number | null;
  startQuickTimer: (seconds: number) => void;
  endQuickTimer: () => void;
  activeHiitSession: { routine: Routine, startTime: number } | null;
  startHiitSession: (routine: Routine) => void;
  endHiitSession: () => void;
  stopAllTimers: () => void;
}

export const TimerContext = createContext<TimerContextType>({} as TimerContextType);

export const useTimer = () => useContext(TimerContext);

export const TimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Timer Persistence
  const [activeTimerInfo, setActiveTimerInfo] = useLocalStorage<ActiveTimerInfo | null>('activeTimerInfo', null);
  
  // Transient Timer State
  const [activeTimedSet, setActiveTimedSet] = useState<TimedSetInfo | null>(null);
  const [activeQuickTimer, setActiveQuickTimer] = useState<number | null>(null);
  const [activeHiitSession, setActiveHiitSession] = useState<{ routine: Routine, startTime: number } | null>(null);

  // Ref to access latest timer info inside setTimeout without adding it to dependencies
  const activeTimerInfoRef = useRef(activeTimerInfo);
  useEffect(() => {
      activeTimerInfoRef.current = activeTimerInfo;
  }, [activeTimerInfo]);

  // Logic to stop rest timer if timed set is active for > 5 seconds
  useEffect(() => {
      let timeoutId: number;

      if (activeTimedSet) {
          timeoutId = window.setTimeout(() => {
              if (activeTimerInfoRef.current && !activeTimerInfoRef.current.isPaused) {
                  setActiveTimerInfo(null);
              }
          }, 5000);
      }

      return () => {
          window.clearTimeout(timeoutId);
      };
  }, [activeTimedSet, setActiveTimerInfo]);

  const startQuickTimer = useCallback((seconds: number) => setActiveQuickTimer(seconds), []);
  const endQuickTimer = useCallback(() => setActiveQuickTimer(null), []);
  
  const startHiitSession = useCallback((routine: Routine) => setActiveHiitSession({ routine, startTime: Date.now() }), []);
  const endHiitSession = useCallback(() => setActiveHiitSession(null), []);
  
  const stopAllTimers = useCallback(() => {
      setActiveTimerInfo(null);
      setActiveTimedSet(null);
      setActiveQuickTimer(null);
      setActiveHiitSession(null);
  }, [setActiveTimerInfo]);

  const value = useMemo(() => ({
    activeTimerInfo, setActiveTimerInfo,
    activeTimedSet, setActiveTimedSet,
    activeQuickTimer, startQuickTimer, endQuickTimer,
    activeHiitSession, startHiitSession, endHiitSession,
    stopAllTimers
  }), [
    activeTimerInfo, setActiveTimerInfo,
    activeTimedSet, setActiveTimedSet,
    activeQuickTimer, startQuickTimer, endQuickTimer,
    activeHiitSession, startHiitSession, endHiitSession,
    stopAllTimers
  ]);

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};
