import React, { createContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Routine, WorkoutSession, Exercise, PerformedSet } from '../types';
import { PREDEFINED_ROUTINES } from '../constants/routines';
import { PREDEFINED_EXERCISES } from '../constants/exercises';

export interface DataContextType {
  routines: Routine[];
  upsertRoutine: (routine: Routine) => void;
  upsertRoutines: (routines: Routine[]) => void;
  deleteRoutine: (id: string) => void;
  
  exercises: Exercise[];
  rawExercises: Exercise[];
  setRawExercises: React.Dispatch<React.SetStateAction<Exercise[]>>;
  getExerciseById: (id: string) => Exercise | undefined;
  
  history: WorkoutSession[];
  saveCompletedWorkout: (session: WorkoutSession) => void; 
  deleteHistorySession: (id: string) => void;
  updateHistorySession: (id: string, updates: Partial<WorkoutSession>) => void;

  allTimeBestSets: Record<string, PerformedSet>;
  checkInState: { active: boolean };
  handleCheckInResponse: (reason: string) => void;
  
  importDataData: (data: any) => void;
}

export const DataContext = createContext<DataContextType>({} as DataContextType);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [history, setHistory] = useLocalStorage<WorkoutSession[]>('history', []);
  const [routines, setRoutines] = useLocalStorage<Routine[]>('routines', PREDEFINED_ROUTINES);
  const [rawExercises, setRawExercises] = useLocalStorage<Exercise[]>('exercises', PREDEFINED_EXERCISES);

  // Exercise Fixing Logic - Ensure integrity of predefined exercises
  useEffect(() => {
    setRawExercises(currentExercises => {
        let hasChanges = false;
        const updated = currentExercises.map(ex => {
            if (ex.id.startsWith('ex-')) {
                const predefined = PREDEFINED_EXERCISES.find(p => p.id === ex.id);
                if (predefined) {
                    const missingPrimary = predefined.primaryMuscles && !ex.primaryMuscles;
                    const missingSecondary = predefined.secondaryMuscles && !ex.secondaryMuscles;
                    
                    if (missingPrimary || missingSecondary) {
                        hasChanges = true;
                        return {
                            ...ex,
                            primaryMuscles: ex.primaryMuscles || predefined.primaryMuscles,
                            secondaryMuscles: ex.secondaryMuscles || predefined.secondaryMuscles
                        };
                    }
                }
            }
            return ex;
        });
        return hasChanges ? updated : currentExercises;
    });
  }, [setRawExercises]);

  const exercises = useMemo(() => rawExercises, [rawExercises]);

  const getExerciseById = useCallback((id: string) => {
      return exercises.find(e => e.id === id);
  }, [exercises]);

  const allTimeBestSets = useMemo(() => {
      const bests: Record<string, PerformedSet> = {};
      history.forEach(session => {
          session.exercises.forEach(ex => {
              ex.sets.forEach(set => {
                  if (set.type === 'normal' && set.isComplete) {
                      const currentBest = bests[ex.exerciseId];
                      if (!currentBest || set.weight > currentBest.weight || (set.weight === currentBest.weight && set.reps > currentBest.reps)) {
                          bests[ex.exerciseId] = set;
                      }
                  }
              });
          });
      });
      return bests;
  }, [history]);

  const checkInState = useMemo(() => {
      const now = Date.now();
      const lastSession = history.length > 0 ? history[0] : null;
      if (!lastSession) return { active: false };
      const daysSince = (now - lastSession.startTime) / (1000 * 60 * 60 * 24);
      return { active: daysSince > 10 };
  }, [history]);

  const handleCheckInResponse = useCallback((reason: string) => {
      console.log('Check in reason:', reason);
      // Logic could be expanded here to log the reason
  }, []);

  const saveCompletedWorkout = useCallback((session: WorkoutSession) => {
      setHistory(prev => [session, ...prev]);
  }, [setHistory]);

  const upsertRoutine = useCallback((routine: Routine) => {
      setRoutines(prev => {
          const idx = prev.findIndex(r => r.id === routine.id);
          if (idx >= 0) {
              const newRoutines = [...prev];
              newRoutines[idx] = routine;
              return newRoutines;
          }
          return [...prev, routine];
      });
  }, [setRoutines]);

  const upsertRoutines = useCallback((newRoutines: Routine[]) => {
      setRoutines(prev => {
          const combined = [...prev];
          newRoutines.forEach(routine => {
              const idx = combined.findIndex(r => r.id === routine.id);
              if (idx >= 0) combined[idx] = routine;
              else combined.push(routine);
          });
          return combined;
      });
  }, [setRoutines]);

  const deleteRoutine = useCallback((id: string) => {
      setRoutines(prev => prev.filter(r => r.id !== id));
  }, [setRoutines]);

  const deleteHistorySession = useCallback((id: string) => {
      setHistory(prev => prev.filter(h => h.id !== id));
  }, [setHistory]);

  const updateHistorySession = useCallback((id: string, updates: Partial<WorkoutSession>) => {
      setHistory(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, [setHistory]);

  const importDataData = useCallback((data: any) => {
      if (Array.isArray(data.history)) setHistory(data.history);
      if (Array.isArray(data.routines)) {
          setRoutines(() => {
              const merged = [...PREDEFINED_ROUTINES];
              data.routines.forEach((ir: Routine) => {
                  const existingIdx = merged.findIndex(m => m.id === ir.id);
                  if (existingIdx >= 0) merged[existingIdx] = ir;
                  else merged.push(ir);
              });
              return merged;
          });
      }
      if (Array.isArray(data.exercises)) {
          setRawExercises(() => {
              const merged = [...PREDEFINED_EXERCISES];
              data.exercises.forEach((ie: Exercise) => {
                   const existingIdx = merged.findIndex(m => m.id === ie.id);
                   if (existingIdx >= 0) merged[existingIdx] = ie;
                   else merged.push(ie);
              });
              return merged;
          });
      }
  }, [setHistory, setRoutines, setRawExercises]);

  const value = useMemo(() => ({
    routines, upsertRoutine, upsertRoutines, deleteRoutine,
    exercises, rawExercises, setRawExercises, getExerciseById,
    history, saveCompletedWorkout, deleteHistorySession, updateHistorySession,
    allTimeBestSets, checkInState, handleCheckInResponse, importDataData
  }), [
    routines, upsertRoutine, upsertRoutines, deleteRoutine,
    exercises, rawExercises, setRawExercises, getExerciseById,
    history, saveCompletedWorkout, deleteHistorySession, updateHistorySession,
    allTimeBestSets, checkInState, handleCheckInResponse, importDataData
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};