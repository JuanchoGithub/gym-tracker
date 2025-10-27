import React, { createContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Routine, WorkoutSession, Exercise, WorkoutExercise } from '../types';
import { PREDEFINED_ROUTINES } from '../constants/routines';
import { PREDEFINED_EXERCISES } from '../constants/exercises';

export type WeightUnit = 'kg' | 'lbs';

interface AppContextType {
  routines: Routine[];
  addRoutine: (routine: Routine) => void;
  history: WorkoutSession[];
  exercises: Exercise[];
  getExerciseById: (id: string) => Exercise | undefined;
  activeWorkout: WorkoutSession | null;
  startWorkout: (routine: Routine) => void;
  updateActiveWorkout: (workout: WorkoutSession) => void;
  endWorkout: () => void;
  isWorkoutMinimized: boolean;
  minimizeWorkout: () => void;
  maximizeWorkout: () => void;
  discardActiveWorkout: () => void;
  weightUnit: WeightUnit;
  setWeightUnit: (unit: WeightUnit) => void;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [routines, setRoutines] = useLocalStorage<Routine[]>('routines', PREDEFINED_ROUTINES);
  const [history, setHistory] = useLocalStorage<WorkoutSession[]>('history', []);
  const [exercises] = useState<Exercise[]>(PREDEFINED_EXERCISES);
  const [activeWorkout, setActiveWorkout] = useLocalStorage<WorkoutSession | null>('activeWorkout', null);
  const [isWorkoutMinimized, setIsWorkoutMinimized] = useLocalStorage<boolean>('isWorkoutMinimized', false);
  const [weightUnit, setWeightUnit] = useLocalStorage<WeightUnit>('weightUnit', 'kg');

  useEffect(() => {
    if (activeWorkout) {
      let needsUpdate = false;
      const migratedExercises = activeWorkout.exercises.map(ex => {
        if (typeof ex.restTime === 'number') {
          needsUpdate = true;
          return {
            ...ex,
            restTime: { normal: ex.restTime, warmup: 60, drop: 30 }
          };
        }
        return ex;
      });

      if (needsUpdate) {
        setActiveWorkout({ ...activeWorkout, exercises: migratedExercises });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkout]);

  const addRoutine = (routine: Routine) => {
    if (!routines.find(r => r.id === routine.id)) {
      setRoutines(prev => [...prev, routine]);
    }
  };
  
  const getExerciseById = (id: string): Exercise | undefined => {
    return exercises.find(ex => ex.id === id);
  };
  
  const startWorkout = (routine: Routine) => {
    const newWorkout: WorkoutSession = {
      id: `session-${Date.now()}`,
      routineName: routine.name,
      startTime: Date.now(),
      endTime: 0,
      exercises: JSON.parse(JSON.stringify(routine.exercises)), // Deep copy
    };
    setActiveWorkout(newWorkout);
    setIsWorkoutMinimized(false);
  };

  const updateActiveWorkout = (workout: WorkoutSession) => {
    setActiveWorkout(workout);
  };

  const endWorkout = () => {
    if (activeWorkout) {
      const finishedWorkout: WorkoutSession = {
        ...activeWorkout,
        endTime: activeWorkout.endTime > 0 ? activeWorkout.endTime : Date.now(),
        exercises: activeWorkout.exercises.map(ex => ({
            ...ex,
            sets: ex.sets.filter(s => s.isComplete)
        })).filter(ex => ex.sets.length > 0)
      };

      if (finishedWorkout.exercises.length > 0) {
        setHistory(prev => [finishedWorkout, ...prev]);
      }
      setActiveWorkout(null);
      setIsWorkoutMinimized(false);
    }
  };

  const discardActiveWorkout = () => {
    setActiveWorkout(null);
    setIsWorkoutMinimized(false);
  };
  
  const minimizeWorkout = () => setIsWorkoutMinimized(true);
  const maximizeWorkout = () => setIsWorkoutMinimized(false);

  const value = useMemo(() => ({
    routines,
    addRoutine,
    history,
    exercises,
    getExerciseById,
    activeWorkout,
    startWorkout,
    updateActiveWorkout,
    endWorkout,
    isWorkoutMinimized,
    minimizeWorkout,
    maximizeWorkout,
    discardActiveWorkout,
    weightUnit,
    setWeightUnit,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [routines, history, exercises, activeWorkout, isWorkoutMinimized, weightUnit]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};