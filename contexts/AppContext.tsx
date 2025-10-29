import React, { createContext, useState, ReactNode, useMemo, useEffect, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Routine, WorkoutSession, Exercise, WorkoutExercise, PerformedSet, ActiveHiitSession } from '../types';
import { PREDEFINED_ROUTINES } from '../constants/routines';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { useI18n } from '../hooks/useI18n';
import { TranslationKey } from './I18nContext';
import { calculateRecords, getExerciseHistory, calculate1RM } from '../utils/workoutUtils';
import { speak } from '../services/speechService';

export type WeightUnit = 'kg' | 'lbs';

interface AppContextType {
  routines: Routine[];
  upsertRoutine: (routine: Routine) => void;
  deleteRoutine: (routineId: string) => void;
  history: WorkoutSession[];
  deleteHistorySession: (sessionId: string) => void;
  updateHistorySession: (session: WorkoutSession) => void;
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
  defaultRestTimes: { normal: number; warmup: number; drop: number; timed: number; };
  setDefaultRestTimes: (times: { normal: number; warmup: number; drop: number; timed: number; }) => void;
  editingTemplate: Routine | null;
  startTemplateEdit: (template: Routine) => void;
  startTemplateDuplicate: (template: Routine) => void;
  endTemplateEdit: (savedTemplate?: Routine) => void;
  editingExercise: Exercise | null;
  startExerciseEdit: (exercise: Exercise, onSaveCallback?: (savedExercise: Exercise) => void) => void;
  endExerciseEdit: (savedExercise?: Exercise) => void;
  startExerciseDuplicate: (exercise: Exercise, onSaveCallback?: (savedExercise: Exercise) => void) => void;
  editingHistorySession: WorkoutSession | null;
  startHistoryEdit: (session: WorkoutSession) => void;
  endHistoryEdit: (savedSession?: WorkoutSession) => void;
  useLocalizedExerciseNames: boolean;
  setUseLocalizedExerciseNames: (value: boolean) => void;
  keepScreenAwake: boolean;
  setKeepScreenAwake: (value: boolean) => void;
  enableNotifications: boolean;
  setEnableNotifications: (value: boolean) => void;
  allTimeBestSets: Record<string, PerformedSet>;
  activeHiitSession: ActiveHiitSession | null;
  startHiitSession: (routine: Routine) => void;
  endHiitSession: () => void;
  selectedVoiceURI: string | null;
  setSelectedVoiceURI: (uri: string | null) => void;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userRoutines, setUserRoutines] = useLocalStorage<Routine[]>('userRoutines', []);
  const [history, setHistory] = useLocalStorage<WorkoutSession[]>('history', []);
  const [rawExercises, setRawExercises] = useLocalStorage<Exercise[]>('exercises', PREDEFINED_EXERCISES);
  const [activeWorkout, setActiveWorkout] = useLocalStorage<WorkoutSession | null>('activeWorkout', null);
  const [isWorkoutMinimized, setIsWorkoutMinimized] = useLocalStorage<boolean>('isWorkoutMinimized', false);
  const [weightUnit, setWeightUnit] = useLocalStorage<WeightUnit>('weightUnit', 'kg');
  const [defaultRestTimes, setDefaultRestTimes] = useLocalStorage<{ normal: number; warmup: number; drop: number; timed: number; }>('defaultRestTimes', { normal: 90, warmup: 60, drop: 30, timed: 10 });
  const [editingTemplate, setEditingTemplate] = useState<Routine | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editingHistorySession, setEditingHistorySession] = useState<WorkoutSession | null>(null);
  const { t, locale, t_ins } = useI18n();
  const [useLocalizedExerciseNames, setUseLocalizedExerciseNames] = useLocalStorage<boolean>('useLocalizedExerciseNames', true);
  const [keepScreenAwake, setKeepScreenAwake] = useLocalStorage<boolean>('keepScreenAwake', true);
  const [enableNotifications, setEnableNotifications] = useLocalStorage<boolean>('enableNotifications', true);
  const [exerciseEditCallback, setExerciseEditCallback] = useState<((exercise: Exercise) => void) | null>(null);
  const [activeHiitSession, setActiveHiitSession] = useLocalStorage<ActiveHiitSession | null>('activeHiitSession', null);
  const [selectedVoiceURI, setSelectedVoiceURI] = useLocalStorage<string | null>('selectedVoiceURI', null);

  useEffect(() => {
    // One-time migration from old 'routines' storage to new 'userRoutines'
    const oldRoutinesRaw = window.localStorage.getItem('routines');
    if (oldRoutinesRaw) {
      try {
        const oldRoutinesFromStorage = JSON.parse(oldRoutinesRaw) as Routine[];
        const predefinedIds = new Set(PREDEFINED_ROUTINES.map(r => r.id));
        
        const nonPredefinedRoutines = oldRoutinesFromStorage.filter(r => !predefinedIds.has(r.id));
        
        // Merge with any existing userRoutines to be safe, avoiding duplicates.
        setUserRoutines(currentUserRoutines => {
            const existingIds = new Set(currentUserRoutines.map(r => r.id));
            const routinesToMigrate = nonPredefinedRoutines.filter(r => !existingIds.has(r.id));
            if (routinesToMigrate.length > 0) {
                return [...currentUserRoutines, ...routinesToMigrate];
            }
            return currentUserRoutines;
        });

        window.localStorage.removeItem('routines');
      } catch (e) {
        console.error("Failed to migrate old routines:", e);
        // still remove the old key to prevent re-running failed migration
        window.localStorage.removeItem('routines');
      }
    }
  }, [setUserRoutines]);
  
  const routines = useMemo(() => {
    const predefinedIds = new Set(PREDEFINED_ROUTINES.map(r => r.id));
    // Filter out any predefined routines that might have snuck into userRoutines
    const filteredUserRoutines = userRoutines.filter(r => !predefinedIds.has(r.id));
    return [...PREDEFINED_ROUTINES, ...filteredUserRoutines];
  }, [userRoutines]);

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

  const allTimeBestSets = useMemo(() => {
    const bestSets: Record<string, PerformedSet> = {};
    for (const exercise of rawExercises) {
        const exerciseHistory = getExerciseHistory(history, exercise.id);
        if (exerciseHistory.length > 0) {
            let bestSet: PerformedSet | null = null;
            let best1RM = -1;
            for (const entry of exerciseHistory) {
                for (const set of entry.exerciseData.sets) {
                    if (set.type === 'normal' && set.isComplete) {
                        const current1RM = calculate1RM(set.weight, set.reps);
                        if (current1RM > best1RM) {
                            best1RM = current1RM;
                            bestSet = set;
                        }
                    }
                }
            }
            if (bestSet) {
                bestSets[exercise.id] = bestSet;
            }
        }
    }
    return bestSets;
  }, [history, rawExercises]);


  useEffect(() => {
    if (activeWorkout) {
      let needsUpdate = false;
      const migratedExercises = activeWorkout.exercises.map(ex => {
        if (typeof ex.restTime === 'number' || !('timed' in ex.restTime)) {
          needsUpdate = true;
          // FIX: Cast ex.restTime to `any` to handle legacy data structures during migration,
          // resolving a type conflict where the compiler inferred `never`.
          const oldNormal = typeof ex.restTime === 'number' ? ex.restTime : (ex.restTime as any).normal;
          return {
            ...ex,
            restTime: {
              normal: oldNormal,
              warmup: (ex.restTime as any).warmup || 60,
              drop: (ex.restTime as any).drop || 30,
              timed: (ex.restTime as any).timed || 10,
            }
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
    if (routine.id.startsWith('rt-')) {
      console.warn("Attempted to upsert a predefined routine. This is not allowed.");
      return;
    }
    setUserRoutines(prev => {
        const existingIndex = prev.findIndex(r => r.id === routine.id);
        if (existingIndex > -1) {
            const newRoutines = [...prev];
            newRoutines[existingIndex] = routine;
            return newRoutines;
        } else {
            return [...prev, routine];
        }
    });
  }, [setUserRoutines]);

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
    if (routineId.startsWith('rt-')) {
        console.warn("Attempted to delete a predefined routine. This is not allowed.");
        return;
    }
    setUserRoutines(prev => prev.filter(r => r.id !== routineId));
  }, [setUserRoutines]);
  
  const getExerciseById = useCallback((id: string): Exercise | undefined => {
    return exercises.find(ex => ex.id === id);
  }, [exercises]);
  
  const startWorkout = useCallback((routine: Routine) => {
    // Deep copy to avoid mutating the original routine/template
    const newWorkoutExercises: WorkoutExercise[] = JSON.parse(JSON.stringify(routine.exercises));
    
    // Reset sets for the new session, giving them new IDs
    newWorkoutExercises.forEach((ex, exIndex) => {
        ex.id = `we-${Date.now()}-${exIndex}`; 
        if (!ex.restTime.timed) {
          ex.restTime.timed = defaultRestTimes.timed;
        }
        ex.sets.forEach((set: PerformedSet, setIndex: number) => {
            set.id = `set-${Date.now()}-${exIndex}-${setIndex}`;
            set.isComplete = false;
        });
    });

    const newWorkout: WorkoutSession = {
      id: `session-${Date.now()}`,
      routineId: routine.id,
      routineName: routine.name,
      startTime: Date.now(),
      endTime: 0,
      exercises: newWorkoutExercises,
    };
    setActiveWorkout(newWorkout);
    setIsWorkoutMinimized(false);
  }, [setActiveWorkout, setIsWorkoutMinimized, defaultRestTimes.timed]);

  const updateActiveWorkout = useCallback((workout: WorkoutSession) => {
    setActiveWorkout(workout);
  }, [setActiveWorkout]);

  const endWorkout = useCallback(() => {
    if (activeWorkout) {
      const workoutEndTime = activeWorkout.endTime > 0 ? activeWorkout.endTime : Date.now();
      
      const finishedWorkoutForHistory: WorkoutSession = {
        ...activeWorkout,
        endTime: workoutEndTime,
        exercises: activeWorkout.exercises.map(ex => ({
            ...ex,
            sets: ex.sets.filter(s => s.isComplete)
        })).filter(ex => ex.sets.length > 0)
      };

      if (finishedWorkoutForHistory.exercises.length > 0) {
        // Calculate PRs before saving
        let prCount = 0;
        const previousHistory = [...history];
        
        finishedWorkoutForHistory.exercises.forEach(ex => {
            const exerciseHistory = getExerciseHistory(previousHistory, ex.exerciseId);
            const oldRecords = calculateRecords(exerciseHistory);
            
            ex.sets.filter(s => s.type === 'normal').forEach(set => {
                let isPr = false;
                const volume = set.weight * set.reps;

                if (!oldRecords.maxWeight || set.weight > oldRecords.maxWeight.value) {
                    isPr = true;
                } else if (!oldRecords.maxReps || set.reps > oldRecords.maxReps.value) {
                    isPr = true;
                } else if (!oldRecords.maxVolume || volume > oldRecords.maxVolume.value) {
                    isPr = true;
                }
                
                if (isPr) {
                    prCount++;
                }
            });
        });
        finishedWorkoutForHistory.prCount = prCount;

        setHistory(prev => [finishedWorkoutForHistory, ...prev]);

        // Create the "Latest Workout" routine. It should include *all* sets from the session,
        // both completed and incomplete, to allow the user to repeat the full workout.
        const exercisesForLatestRoutine = activeWorkout.exercises.filter(ex => ex.sets.length > 0);
        const sourceRoutine = routines.find(r => r.id === activeWorkout.routineId);

        const newLatestRoutine: Routine = {
          id: `latest-${workoutEndTime}-${Math.random()}`,
          name: activeWorkout.routineName,
          description: `Completed on ${new Date(activeWorkout.startTime).toLocaleDateString()}`,
          exercises: exercisesForLatestRoutine, // Use all original sets
          isTemplate: false,
          lastUsed: workoutEndTime,
          originId: activeWorkout.routineId,
          routineType: sourceRoutine?.routineType || 'strength',
        };

        setUserRoutines(prevUserRoutines => {
            const routinesWithoutSource = sourceRoutine && !sourceRoutine.isTemplate 
                ? prevUserRoutines.filter(r => r.id !== sourceRoutine.id)
                : prevUserRoutines;
            
            return [...routinesWithoutSource, newLatestRoutine];
        });
      }
      setActiveWorkout(null);
      setIsWorkoutMinimized(false);
    }
  }, [activeWorkout, history, routines, setActiveWorkout, setHistory, setIsWorkoutMinimized, setUserRoutines]);

  const discardActiveWorkout = useCallback(() => {
    setActiveWorkout(null);
    setIsWorkoutMinimized(false);
  }, [setActiveWorkout, setIsWorkoutMinimized]);
  
  const minimizeWorkout = useCallback(() => setIsWorkoutMinimized(true), [setIsWorkoutMinimized]);
  const maximizeWorkout = useCallback(() => setIsWorkoutMinimized(false), [setIsWorkoutMinimized]);

  const startHiitSession = useCallback((routine: Routine) => {
    // Announce prepare state and first exercise
    const firstExerciseName = getExerciseById(routine.exercises[0]?.exerciseId)?.name || '';
    speak(t('timers_announce_prepare', { exercise: firstExerciseName }), selectedVoiceURI, locale);

    const newSession: ActiveHiitSession = {
        routine: JSON.parse(JSON.stringify(routine)), // deep copy
        startTime: Date.now(),
    };
    setActiveHiitSession(newSession);
  }, [setActiveHiitSession, getExerciseById, t, selectedVoiceURI, locale]);

  const endHiitSession = useCallback(() => {
      setActiveHiitSession(null);
  }, [setActiveHiitSession]);

  const startTemplateEdit = useCallback((template: Routine) => {
    setEditingTemplate(template);
  }, []);

  const startTemplateDuplicate = useCallback((routineToDuplicate: Routine) => {
    const newTemplate: Routine = {
        ...JSON.parse(JSON.stringify(routineToDuplicate)), // Deep copy
        id: `custom-${Date.now()}`,
        originId: routineToDuplicate.originId || routineToDuplicate.id,
        name: `${routineToDuplicate.name} (Copy)`,
        isTemplate: true,
        lastUsed: undefined,
        routineType: routineToDuplicate.routineType,
        hiitConfig: routineToDuplicate.hiitConfig ? { ...routineToDuplicate.hiitConfig } : undefined,
    };
    startTemplateEdit(newTemplate);
  }, [startTemplateEdit]);

  const endTemplateEdit = useCallback((savedTemplate?: Routine) => {
    if (savedTemplate) {
      upsertRoutine(savedTemplate);
    }
    setEditingTemplate(null);
  }, [upsertRoutine]);

  const startExerciseEdit = useCallback((exercise: Exercise, onSaveCallback?: (savedExercise: Exercise) => void) => {
    setEditingExercise(exercise);
    if (onSaveCallback) {
        setExerciseEditCallback(() => onSaveCallback);
    }
  }, []);

  const endExerciseEdit = useCallback((savedExercise?: Exercise) => {
    if (savedExercise) {
      upsertExercise(savedExercise);
      if (exerciseEditCallback) {
          exerciseEditCallback(savedExercise);
      }
    }
    setEditingExercise(null);
    setExerciseEditCallback(null);
  }, [upsertExercise, exerciseEditCallback]);

  const startExerciseDuplicate = useCallback((exerciseToDuplicate: Exercise, onSaveCallback?: (savedExercise: Exercise) => void) => {
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
    startExerciseEdit(newExercise, onSaveCallback);
  }, [rawExercises, t_ins, startExerciseEdit]);

  const deleteHistorySession = useCallback((sessionId: string) => {
    setHistory(prev => prev.filter(s => s.id !== sessionId));
  }, [setHistory]);

  const updateHistorySession = useCallback((session: WorkoutSession) => {
    const previousHistory = history.filter(h => h.startTime < session.startTime && h.id !== session.id);
    
    let prCount = 0;
    session.exercises.forEach(ex => {
        const exerciseHistory = getExerciseHistory(previousHistory, ex.exerciseId);
        const oldRecords = calculateRecords(exerciseHistory);
        
        ex.sets.forEach(set => {
            if (set.isComplete && set.type === 'normal') {
                let isPrForSet = false;
                const volume = set.weight * set.reps;

                if (!oldRecords.maxWeight || set.weight > oldRecords.maxWeight.value) {
                    isPrForSet = true;
                } else if (!oldRecords.maxReps || set.reps > oldRecords.maxReps.value) {
                    isPrForSet = true;
                } else if (!oldRecords.maxVolume || volume > oldRecords.maxVolume.value) {
                    isPrForSet = true;
                }
                
                if (isPrForSet) {
                    prCount++;
                }
            }
        });
    });
    const sessionWithRecalculatedPRs = { ...session, prCount };

    setHistory(prev => {
        const index = prev.findIndex(s => s.id === session.id);
        if (index === -1) return prev;
        const newHistory = [...prev];
        newHistory[index] = sessionWithRecalculatedPRs;
        newHistory.sort((a, b) => b.startTime - a.startTime);
        return newHistory;
    });
  }, [history, setHistory]);

  const startHistoryEdit = useCallback((session: WorkoutSession) => {
    setEditingHistorySession(session);
  }, []);

  const endHistoryEdit = useCallback((savedSession?: WorkoutSession) => {
    if (savedSession) {
      updateHistorySession(savedSession);
    }
    setEditingHistorySession(null);
  }, [updateHistorySession]);

  const value = useMemo(() => ({
    routines: routines,
    upsertRoutine,
    deleteRoutine,
    history,
    deleteHistorySession,
    updateHistorySession,
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
    startTemplateDuplicate,
    endTemplateEdit,
    editingExercise,
    startExerciseEdit,
    endExerciseEdit,
    startExerciseDuplicate,
    editingHistorySession,
    startHistoryEdit,
    endHistoryEdit,
    useLocalizedExerciseNames,
    setUseLocalizedExerciseNames,
    keepScreenAwake,
    setKeepScreenAwake,
    enableNotifications,
    setEnableNotifications,
    allTimeBestSets,
    activeHiitSession,
    startHiitSession,
    endHiitSession,
    selectedVoiceURI,
    setSelectedVoiceURI,
  }), [
    routines, upsertRoutine, deleteRoutine, history, deleteHistorySession, updateHistorySession, exercises, getExerciseById,
    upsertExercise, activeWorkout, startWorkout, updateActiveWorkout, endWorkout,
    isWorkoutMinimized, minimizeWorkout, maximizeWorkout, discardActiveWorkout,
    weightUnit, setWeightUnit, defaultRestTimes, setDefaultRestTimes,
    editingTemplate, startTemplateEdit, startTemplateDuplicate, endTemplateEdit, editingExercise,
    startExerciseEdit, endExerciseEdit, startExerciseDuplicate,
    editingHistorySession, startHistoryEdit, endHistoryEdit,
    useLocalizedExerciseNames, setUseLocalizedExerciseNames,
    keepScreenAwake, setKeepScreenAwake, enableNotifications, setEnableNotifications,
    allTimeBestSets, activeHiitSession, startHiitSession, endHiitSession,
    selectedVoiceURI, setSelectedVoiceURI
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
