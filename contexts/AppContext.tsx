import React, { createContext, useState, ReactNode, useMemo, useEffect, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Routine, WorkoutSession, Exercise, WorkoutExercise } from '../types';
import { PREDEFINED_ROUTINES } from '../constants/routines';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { useI18n } from '../hooks/useI18n';
import { TranslationKey } from './I18nContext';

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
  useLocalizedExerciseNames: boolean;
  setUseLocalizedExerciseNames: (value: boolean) => void;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [rawRoutines, setRawRoutines] = useLocalStorage<Routine[]>('routines', PREDEFINED_ROUTINES);
  const [history, setHistory] = useLocalStorage<WorkoutSession[]>('history', []);
  const [rawExercises, setRawExercises] = useLocalStorage<Exercise[]>('exercises', PREDEFINED_EXERCISES);
  const [activeWorkout, setActiveWorkout] = useLocalStorage<WorkoutSession | null>('activeWorkout', null);
  const [isWorkoutMinimized, setIsWorkoutMinimized] = useLocalStorage<boolean>('isWorkoutMinimized', false);
  const [weightUnit, setWeightUnit] = useLocalStorage<WeightUnit>('weightUnit', 'kg');
  const [defaultRestTimes, setDefaultRestTimes] = useLocalStorage<{ normal: number; warmup: number; drop: number; }>('defaultRestTimes', { normal: 90, warmup: 60, drop: 30 });
  const [editingTemplate, setEditingTemplate] = useState<Routine | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const { t, locale, t_ins } = useI18n();
  const [useLocalizedExerciseNames, setUseLocalizedExerciseNames] = useLocalStorage<boolean>('useLocalizedExerciseNames', true);

  const exercises = useMemo(() => {
    if (useLocalizedExerciseNames && locale !== 'en') {
      return rawExercises.map(ex => {
        if (ex.id.startsWith('ex-')) {
            const translationKey = ex.id.replace(/-/g, '_') as TranslationKey;
            const translatedName = t(translationKey);
            if (translatedName !== translationKey) {
                return { ...ex, name: translatedName };
            }
        }
        return ex; // return original for custom or untranslated
      });
    }
    return rawExercises;
  }, [rawExercises, useLocalizedExerciseNames, locale, t]);


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

  const upsertRoutine = useCallback((routine: Routine) => {
    setRawRoutines(prev => {
        const existingIndex = prev.findIndex(r => r.id === routine.id);
        if (existingIndex > -1) {
            const newRoutines = [...prev];
            newRoutines[existingIndex] = routine;
            return newRoutines;
        } else {
            return [...prev, routine];
        }
    });
  }, [setRawRoutines]);

  const upsertExercise = useCallback((exercise: Exercise) => {
    setRawExercises(prev => {
        const existingIndex = prev.findIndex(e => e.id === exercise.id);
        if (existingIndex > -1) {
            const newExercises = [...prev];
            newExercises[existingIndex] = exercise;
            return newExercises;
        } else {
            return [...prev, exercise];
        }
    });
  }, [setRawExercises]);

  const deleteRoutine = useCallback((routineId: string) => {
    setRawRoutines(prev => prev.filter(r => r.id !== routineId));
  }, [setRawRoutines]);
  
  const getExerciseById = useCallback((id: string): Exercise | undefined => {
    return exercises.find(ex => ex.id === id);
  }, [exercises]);
  
  const startWorkout = useCallback((routine: Routine) => {
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
  }, [setActiveWorkout, setIsWorkoutMinimized]);

  const updateActiveWorkout = useCallback((workout: WorkoutSession) => {
    setActiveWorkout(workout);
  }, [setActiveWorkout]);

  const endWorkout = useCallback(() => {
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

        const sourceRoutine = rawRoutines.find(r => r.id === activeWorkout.routineId);

        setRawRoutines(prevRoutines => {
            const routinesWithoutSource = sourceRoutine && !sourceRoutine.isTemplate 
                ? prevRoutines.filter(r => r.id !== sourceRoutine.id)
                : prevRoutines;
            
            return [...routinesWithoutSource, newLatestRoutine];
        });
      }
      setActiveWorkout(null);
      setIsWorkoutMinimized(false);
    }
  }, [activeWorkout, rawRoutines, setActiveWorkout, setHistory, setIsWorkoutMinimized, setRawRoutines]);

  const discardActiveWorkout = useCallback(() => {
    setActiveWorkout(null);
    setIsWorkoutMinimized(false);
  }, [setActiveWorkout, setIsWorkoutMinimized]);
  
  const minimizeWorkout = useCallback(() => setIsWorkoutMinimized(true), [setIsWorkoutMinimized]);
  const maximizeWorkout = useCallback(() => setIsWorkoutMinimized(false), [setIsWorkoutMinimized]);

  const startTemplateEdit = useCallback((template: Routine) => {
    setEditingTemplate(template);
  }, []);

  const endTemplateEdit = useCallback((savedTemplate?: Routine) => {
    if (savedTemplate) {
      upsertRoutine(savedTemplate);
    }
    setEditingTemplate(null);
  }, [upsertRoutine]);

  const startExerciseEdit = useCallback((exercise: Exercise) => {
    setEditingExercise(exercise);
  }, []);

  const endExerciseEdit = useCallback((savedExercise?: Exercise) => {
    if (savedExercise) {
      upsertExercise(savedExercise);
    }
    setEditingExercise(null);
  }, [upsertExercise]);

  const startExerciseDuplicate = useCallback((exerciseToDuplicate: Exercise) => {
    const originalExercise = rawExercises.find(e => e.id === exerciseToDuplicate.id) || exerciseToDuplicate;
    let description = '';
    const isStock = originalExercise.id.startsWith('ex-');

    if (isStock) {
        const instructionKey = originalExercise.id.replace('-', '_') + '_ins';
        const instructions = t_ins(instructionKey);
        if (instructions && instructions.steps.length > 0 && instructions.title !== instructionKey) {
            description = instructions.steps.join('\n');
        }
    } else {
        description = originalExercise.notes || '';
    }
    
    const newExercise: Exercise = {
        ...originalExercise,
        id: `custom-${Date.now()}`,
        name: `${exerciseToDuplicate.name} (Copy)`,
        notes: description
    };
    startExerciseEdit(newExercise);
  }, [rawExercises, t_ins, startExerciseEdit]);

  const value = useMemo(() => ({
    routines: rawRoutines,
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
    useLocalizedExerciseNames,
    setUseLocalizedExerciseNames,
  }), [
    rawRoutines, upsertRoutine, deleteRoutine, history, exercises, getExerciseById,
    upsertExercise, activeWorkout, startWorkout, updateActiveWorkout, endWorkout,
    isWorkoutMinimized, minimizeWorkout, maximizeWorkout, discardActiveWorkout,
    weightUnit, setWeightUnit, defaultRestTimes, setDefaultRestTimes,
    editingTemplate, startTemplateEdit, endTemplateEdit, editingExercise,
    startExerciseEdit, endExerciseEdit, startExerciseDuplicate,
    useLocalizedExerciseNames, setUseLocalizedExerciseNames
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};