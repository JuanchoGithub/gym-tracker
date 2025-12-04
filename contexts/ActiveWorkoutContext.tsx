
import React, { createContext, useState, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Routine, WorkoutSession, WorkoutExercise } from '../types';
import { TimerContext } from './TimerContext';
import { AppContext } from './AppContext';

export interface ActiveWorkoutContextType {
  activeWorkout: WorkoutSession | null;
  startWorkout: (routine: Routine) => void;
  updateActiveWorkout: (workoutOrFn: WorkoutSession | ((prev: WorkoutSession | null) => WorkoutSession | null)) => void;
  endWorkout: (endTime?: number) => void;
  discardActiveWorkout: () => void;
  isWorkoutMinimized: boolean;
  minimizeWorkout: () => void;
  maximizeWorkout: () => void;
  
  isAddingExercisesToWorkout: boolean;
  startAddExercisesToWorkout: (supersetId?: string) => void;
  endAddExercisesToWorkout: (ids?: string[]) => void;
  
  collapsedExerciseIds: string[];
  setCollapsedExerciseIds: React.Dispatch<React.SetStateAction<string[]>>;
  collapsedSupersetIds: string[];
  setCollapsedSupersetIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export const ActiveWorkoutContext = createContext<ActiveWorkoutContextType>({} as ActiveWorkoutContextType);

export const ActiveWorkoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeWorkout, setActiveWorkout] = useLocalStorage<WorkoutSession | null>('activeWorkout', null);
  const [isWorkoutMinimized, setIsWorkoutMinimized] = useState(false);
  const [isAddingExercisesToWorkout, setIsAddingExercisesToWorkout] = useState(false);
  const [addingTargetSupersetId, setAddingTargetSupersetId] = useState<string | undefined>(undefined);
  
  const [collapsedExerciseIds, setCollapsedExerciseIds] = useState<string[]>([]);
  const [collapsedSupersetIds, setCollapsedSupersetIds] = useState<string[]>([]);

  const { stopAllTimers } = useContext(TimerContext);
  const { saveCompletedWorkout, rawExercises, defaultRestTimes } = useContext(AppContext);

  const startWorkout = useCallback((routine: Routine) => {
      const session: WorkoutSession = {
          id: `session-${Date.now()}`,
          routineId: routine.id,
          routineName: routine.name,
          startTime: Date.now(),
          lastUpdated: Date.now(),
          endTime: 0,
          exercises: routine.exercises.map(ex => ({
              ...ex,
              id: `we-${Date.now()}-${Math.random()}`,
              sets: ex.sets.map(s => ({ ...s, id: `set-${Date.now()}-${Math.random()}`, isComplete: false }))
          })),
          supersets: routine.supersets
      };
      setActiveWorkout(session);
      setIsWorkoutMinimized(false);
  }, [setActiveWorkout]);

  const updateActiveWorkout = useCallback((workoutOrFn: WorkoutSession | ((prev: WorkoutSession | null) => WorkoutSession | null)) => {
      setActiveWorkout(prev => {
          let newWorkout = typeof workoutOrFn === 'function' ? workoutOrFn(prev) : workoutOrFn;
          if (newWorkout) {
              // Automatically update lastUpdated timestamp on any change to prevent stale timeouts
              newWorkout = { ...newWorkout, lastUpdated: Date.now() };
          }
          return newWorkout;
      });
  }, [setActiveWorkout]);

  const endWorkout = useCallback((endTime?: number) => {
      if (activeWorkout) {
          if (activeWorkout.exercises.length > 0) {
              const finishedWorkout = { ...activeWorkout, endTime: endTime || Date.now() };
              saveCompletedWorkout(finishedWorkout);
          }
          
          setActiveWorkout(null);
          setIsWorkoutMinimized(false);
          stopAllTimers();
          setCollapsedExerciseIds([]);
          setCollapsedSupersetIds([]);
      }
  }, [activeWorkout, setActiveWorkout, saveCompletedWorkout, stopAllTimers]);

  const discardActiveWorkout = useCallback(() => {
      setActiveWorkout(null);
      setIsWorkoutMinimized(false);
      stopAllTimers();
      setCollapsedExerciseIds([]);
      setCollapsedSupersetIds([]);
  }, [setActiveWorkout, stopAllTimers]);

  const minimizeWorkout = useCallback(() => setIsWorkoutMinimized(true), []);
  const maximizeWorkout = useCallback(() => setIsWorkoutMinimized(false), []);

  const startAddExercisesToWorkout = useCallback((supersetId?: string) => {
      setAddingTargetSupersetId(supersetId);
      setIsAddingExercisesToWorkout(true);
  }, []);

  const endAddExercisesToWorkout = useCallback((ids?: string[]) => {
      setIsAddingExercisesToWorkout(false);
      if (ids && activeWorkout) {
          const newExercises: WorkoutExercise[] = ids.map(id => {
              const exerciseDef = rawExercises.find(e => e.id === id);
              const isTimed = exerciseDef?.isTimed;
              
              return {
                id: `we-${Date.now()}-${Math.random()}`,
                exerciseId: id,
                sets: [{ 
                    id: `set-${Date.now()}-${Math.random()}`, 
                    reps: isTimed ? 1 : 10, 
                    weight: 0, 
                    type: isTimed ? 'timed' : 'normal', 
                    time: isTimed ? 60 : undefined,
                    isComplete: false 
                }],
                restTime: defaultRestTimes,
                supersetId: addingTargetSupersetId
              };
          });
          
          let updatedExercises = [...activeWorkout.exercises];
          
          if (addingTargetSupersetId) {
              // Find the last exercise of the superset and insert after it
              let lastIndex = -1;
              for (let i = updatedExercises.length - 1; i >= 0; i--) {
                  if (updatedExercises[i].supersetId === addingTargetSupersetId) {
                      lastIndex = i;
                      break;
                  }
              }
              if (lastIndex !== -1) {
                  updatedExercises.splice(lastIndex + 1, 0, ...newExercises);
              } else {
                  updatedExercises.push(...newExercises);
              }
          } else {
              updatedExercises.push(...newExercises);
          }

          updateActiveWorkout({
              ...activeWorkout,
              exercises: updatedExercises
          });
      }
      setAddingTargetSupersetId(undefined);
  }, [activeWorkout, defaultRestTimes, addingTargetSupersetId, updateActiveWorkout, rawExercises]);


  const value = useMemo(() => ({
    activeWorkout, startWorkout, updateActiveWorkout, endWorkout, discardActiveWorkout,
    isWorkoutMinimized, minimizeWorkout, maximizeWorkout,
    isAddingExercisesToWorkout, startAddExercisesToWorkout, endAddExercisesToWorkout,
    collapsedExerciseIds, setCollapsedExerciseIds, collapsedSupersetIds, setCollapsedSupersetIds
  }), [
    activeWorkout, startWorkout, updateActiveWorkout, endWorkout, discardActiveWorkout,
    isWorkoutMinimized, minimizeWorkout, maximizeWorkout,
    isAddingExercisesToWorkout, startAddExercisesToWorkout, endAddExercisesToWorkout,
    collapsedExerciseIds, setCollapsedExerciseIds, collapsedSupersetIds, setCollapsedSupersetIds
  ]);

  return <ActiveWorkoutContext.Provider value={value}>{children}</ActiveWorkoutContext.Provider>;
};
