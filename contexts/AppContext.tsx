import React, { createContext, useState, ReactNode, useMemo, useEffect, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Routine, WorkoutSession, Exercise, WorkoutExercise } from '../types';
import { PREDEFINED_ROUTINES } from '../constants/routines';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { useI18n } from '../hooks/useI18n';

export type WeightUnit = 'kg' | 'lbs';

interface AppContextType {
  routines: Routine[];
  upsertRoutine: (routine: Routine) => void;
  deleteRoutine: (routineId: string) => void;
  history: WorkoutSession[];
  exercises: Exercise[];
  getExerciseById: (id: string) => Exercise | undefined;
  upsertExercise: (exercise: Exercise) => void;
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
  defaultRestTimes: { normal: number; warmup: number; drop: number; };
  setDefaultRestTimes: (times: { normal: number; warmup: number; drop: number; }) => void;
  editingTemplate: Routine | null;
  startTemplateEdit: (template: Routine) => void;
  endTemplateEdit: (savedTemplate?: Routine) => void;
  editingExercise: Exercise | null;
  startExerciseEdit: (exercise: Exercise) => void;
  endExerciseEdit: (savedExercise?: Exercise) => void;
  startExerciseDuplicate: (exercise: Exercise) => void;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [routines, setRoutines] = useLocalStorage<Routine[]>('routines', PREDEFINED_ROUTINES);
  const [history, setHistory] = useLocalStorage<WorkoutSession[]>('history', []);
  const [exercises, setExercises] = useLocalStorage<Exercise[]>('exercises', PREDEFINED_EXERCISES);
  const [activeWorkout, setActiveWorkout] = useLocalStorage<WorkoutSession | null>('activeWorkout', null);
  const [isWorkoutMinimized, setIsWorkoutMinimized] = useLocalStorage<boolean>('isWorkoutMinimized', false);
  const [weightUnit, setWeightUnit] = useLocalStorage<WeightUnit>('weightUnit', 'kg');
  const [defaultRestTimes, setDefaultRestTimes] = useLocalStorage<{ normal: number; warmup: number; drop: number; }>('defaultRestTimes', { normal: 90, warmup: 60, drop: 30 });
  const [editingTemplate, setEditingTemplate] = useState<Routine | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const { t_ins } = useI18n();


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

  const upsertRoutine = (routine: Routine) => {
    setRoutines(prev => {
        const existingIndex = prev.findIndex(r => r.id === routine.id);
        if (existingIndex > -1) {
            const newRoutines = [...prev];
            newRoutines[existingIndex] = routine;
            return newRoutines;
        } else {
            return [...prev, routine];
        }
    });
  };

  const upsertExercise = (exercise: Exercise) => {
    setExercises(prev => {
        const existingIndex = prev.findIndex(e => e.id === exercise.id);
        if (existingIndex > -1) {
            const newExercises = [...prev];
            newExercises[existingIndex] = exercise;
            return newExercises;
        } else {
            return [...prev, exercise];
        }
    });
  };

  const deleteRoutine = (routineId: string) => {
    setRoutines(prev => prev.filter(r => r.id !== routineId));
  };
  
  const getExerciseById = (id: string): Exercise | undefined => {
    return exercises.find(ex => ex.id === id);
  };
  
  const startWorkout = (routine: Routine) => {
    const newWorkout: WorkoutSession = {
      id: `session-${Date.now()}`,
      routineId: routine.id,
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

        const newLatestRoutine: Routine = {
          id: `latest-${finishedWorkout.endTime}-${Math.random()}`,
          name: finishedWorkout.routineName,
          description: `Completed on ${new Date(finishedWorkout.startTime).toLocaleDateString()}`,
          exercises: finishedWorkout.exercises,
          isTemplate: false,
          lastUsed: finishedWorkout.endTime,
          originId: activeWorkout.routineId,
        };

        const sourceRoutine = routines.find(r => r.id === activeWorkout.routineId);

        setRoutines(prevRoutines => {
            const routinesWithoutSource = sourceRoutine && !sourceRoutine.isTemplate 
                ? prevRoutines.filter(r => r.id !== sourceRoutine.id)
                : prevRoutines;
            
            return [...routinesWithoutSource, newLatestRoutine];
        });
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

  const startTemplateEdit = (template: Routine) => {
    setEditingTemplate(template);
  };

  const endTemplateEdit = (savedTemplate?: Routine) => {
    if (savedTemplate) {
      upsertRoutine(savedTemplate);
    }
    setEditingTemplate(null);
  };

  const startExerciseEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
  };

  const endExerciseEdit = (savedExercise?: Exercise) => {
    if (savedExercise) {
      upsertExercise(savedExercise);
    }
    setEditingExercise(null);
  };

  const startExerciseDuplicate = (exerciseToDuplicate: Exercise) => {
    let description = '';
    const isStock = exerciseToDuplicate.id.startsWith('ex-');

    if (isStock) {
        const instructionKey = exerciseToDuplicate.id.replace('-', '_') + '_ins';
        const instructions = t_ins(instructionKey);
        if (instructions && instructions.steps.length > 0 && instructions.title !== instructionKey) {
            description = instructions.steps.join('\n');
        }
    } else {
        description = exerciseToDuplicate.notes || '';
    }
    
    const newExercise: Exercise = {
        ...exerciseToDuplicate,
        id: `custom-${Date.now()}`,
        name: `${exerciseToDuplicate.name} (Copy)`,
        notes: description
    };
    startExerciseEdit(newExercise);
  };

  const value = useMemo(() => ({
    routines,
    upsertRoutine,
    deleteRoutine,
    history,
    exercises,
    getExerciseById,
    upsertExercise,
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
    defaultRestTimes,
    setDefaultRestTimes,
    editingTemplate,
    startTemplateEdit,
    endTemplateEdit,
    editingExercise,
    startExerciseEdit,
    endExerciseEdit,
    startExerciseDuplicate,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [routines, history, exercises, activeWorkout, isWorkoutMinimized, weightUnit, defaultRestTimes, editingTemplate, editingExercise]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};