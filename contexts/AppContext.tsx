
import React, { createContext, useState, ReactNode, useMemo, useEffect, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Routine, WorkoutSession, Exercise, WorkoutExercise, PerformedSet, ActiveHiitSession, SupplementPlan, SupplementPlanItem, SupplementSuggestion, RejectedSuggestion, Profile } from '../types';
import { PREDEFINED_ROUTINES } from '../constants/routines';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { useI18n } from '../hooks/useI18n';
import { TranslationKey } from './I18nContext';
// FIX: Imported 'getTimerDuration' to resolve reference error.
import { calculateRecords, getExerciseHistory, calculate1RM, getTimerDuration } from '../utils/workoutUtils';
import { speak } from '../services/speechService';
import { unlockAudioContext } from '../services/audioService';
import { reviewSupplementPlan } from '../services/supplementService';
import { cancelTimerNotification, sendSupplementUpdateNotification } from '../services/notificationService';

export type WeightUnit = 'kg' | 'lbs';
export type MeasureUnit = 'metric' | 'imperial';

export interface ActiveTimerInfo {
  exerciseId: string;
  setId: string;
  targetTime: number; // Timestamp (Date.now() + duration) when the timer should end
  totalDuration: number; // The current total duration for progress bar calculation
  initialDuration: number; // The original duration for reset
  isPaused: boolean;
  timeLeftWhenPaused: number; // Time left in seconds when it was paused
}

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
  measureUnit: MeasureUnit;
  setMeasureUnit: (unit: MeasureUnit) => void;
  defaultRestTimes: { normal: number; warmup: number; drop: number; timed: number; effort: number; failure: number; };
  setDefaultRestTimes: (times: { normal: number; warmup: number; drop: number; timed: number; effort: number; failure: number; }) => void;
  editingTemplate: Routine | null;
  updateEditingTemplate: (template: Routine) => void;
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
  isAddingExercisesToWorkout: boolean;
  startAddExercisesToWorkout: () => void;
  endAddExercisesToWorkout: (newExerciseIds?: string[]) => void;
  isAddingExercisesToTemplate: boolean;
  startAddExercisesToTemplate: () => void;
  endAddExercisesToTemplate: (newExerciseIds?: string[]) => void;
  activeQuickTimer: number | null;
  startQuickTimer: (duration: number) => void;
  endQuickTimer: () => void;
  supplementPlan: SupplementPlan | null;
  setSupplementPlan: (plan: SupplementPlan | null) => void;
  userSupplements: SupplementPlanItem[];
  setUserSupplements: React.Dispatch<React.SetStateAction<SupplementPlanItem[]>>;
  takenSupplements: Record<string, string[]>;
  setTakenSupplements: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  newSuggestions: SupplementSuggestion[];
  applyPlanSuggestion: (suggestionId: string) => void;
  applyAllPlanSuggestions: () => void;
  dismissSuggestion: (suggestionId: string) => void;
  dismissAllSuggestions: () => void;
  clearNewSuggestions: () => void;
  profile: Profile;
  updateProfileInfo: (updates: Partial<Omit<Profile, 'weightHistory'>>) => void;
  currentWeight?: number; // in kg
  logWeight: (weightInKg: number) => void;
  activeTimerInfo: ActiveTimerInfo | null;
  setActiveTimerInfo: React.Dispatch<React.SetStateAction<ActiveTimerInfo | null>>;
  collapsedExerciseIds: string[];
  setCollapsedExerciseIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userRoutines, setUserRoutines] = useLocalStorage<Routine[]>('userRoutines', []);
  const [history, setHistory] = useLocalStorage<WorkoutSession[]>('history', []);
  const [rawExercises, setRawExercises] = useLocalStorage<Exercise[]>('exercises', PREDEFINED_EXERCISES);
  const [activeWorkout, setActiveWorkout] = useLocalStorage<WorkoutSession | null>('activeWorkout', null);
  const [isWorkoutMinimized, setIsWorkoutMinimized] = useLocalStorage<boolean>('isWorkoutMinimized', false);
  const [measureUnit, setMeasureUnit] = useLocalStorage<MeasureUnit>('measureUnit', 'metric');
  const [defaultRestTimes, setDefaultRestTimes] = useLocalStorage<{ normal: number; warmup: number; drop: number; timed: number; effort: number; failure: number; }>('defaultRestTimes', { normal: 90, warmup: 60, drop: 30, timed: 10, effort: 180, failure: 300 });
  const [editingTemplate, setEditingTemplate] = useState<Routine | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editingHistorySession, setEditingHistorySession] = useState<WorkoutSession | null>(null);
  const { t, locale, t_ins } = useI18n();
  const [useLocalizedExerciseNames, setUseLocalizedExerciseNames] = useLocalStorage<boolean>('useLocalizedExerciseNames', true);
  const [keepScreenAwake, setKeepScreenAwake] = useLocalStorage<boolean>('keepScreenAwake', true);
  const [enableNotifications, setEnableNotifications] = useLocalStorage<boolean>('enableNotifications', true);
  const [exerciseEditCallback, setExerciseEditCallback] = useState<((exercise: Exercise) => void) | null>(null);
  const [activeHiitSession, setActiveHiitSession] = useLocalStorage<ActiveHiitSession | null>('activeHiitSession', null);
  const [activeQuickTimer, setActiveQuickTimer] = useLocalStorage<number | null>('activeQuickTimer', null);
  const [selectedVoiceURI, setSelectedVoiceURI] = useLocalStorage<string | null>('selectedVoiceURI', null);
  const [isAddingExercisesToWorkout, setIsAddingExercisesToWorkout] = useState(false);
  const [isAddingExercisesToTemplate, setIsAddingExercisesToTemplate] = useState(false);
  const [supplementPlan, setSupplementPlan] = useLocalStorage<SupplementPlan | null>('supplementPlan', null);
  const [userSupplements, setUserSupplements] = useLocalStorage<SupplementPlanItem[]>('userSupplements', []);
  const [takenSupplements, setTakenSupplements] = useLocalStorage<Record<string, string[]>>('takenSupplements', {});
  const [profile, setProfile] = useLocalStorage<Profile>('profile', { weightHistory: [] });
  const [activeTimerInfo, setActiveTimerInfo] = useLocalStorage<ActiveTimerInfo | null>('activeRestTimer', null);
  const [collapsedExerciseIds, setCollapsedExerciseIds] = useLocalStorage<string[]>('collapsedExerciseIds', []);

  
  // New state for automated supplement review
  const [lastAnalysisTimestamp, setLastAnalysisTimestamp] = useLocalStorage<number>('lastAnalysisTimestamp', 0);
  const [rejectedSuggestions, setRejectedSuggestions] = useLocalStorage<RejectedSuggestion[]>('rejectedSuggestions', []);
  const [newSuggestions, setNewSuggestions] = useState<SupplementSuggestion[]>([]);

  useEffect(() => {
    // One-time migration from old 'weightUnit' to 'measureUnit'
    const oldWeightUnitRaw = window.localStorage.getItem('weightUnit');
    if (oldWeightUnitRaw) {
        try {
            const oldUnit = JSON.parse(oldWeightUnitRaw);
            if (oldUnit === 'lbs') {
                setMeasureUnit('imperial');
            } else {
                setMeasureUnit('metric');
            }
        } catch (e) {
            console.error('Failed to parse old weight unit, defaulting to metric.', e);
            setMeasureUnit('metric');
        } finally {
            window.localStorage.removeItem('weightUnit');
        }
    }
  }, [setMeasureUnit]);

  const currentWeight = useMemo(() => {
    if (profile.weightHistory.length === 0) return undefined;
    const sortedHistory = [...profile.weightHistory].sort((a, b) => b.date - a.date);
    return sortedHistory[0].weight;
  }, [profile.weightHistory]);

  const updateProfileInfo = useCallback((updates: Partial<Omit<Profile, 'weightHistory'>>) => {
      setProfile(prev => ({ ...prev, ...updates }));
  }, [setProfile]);

  const logWeight = useCallback((weightInKg: number) => {
      if (isNaN(weightInKg) || weightInKg <= 0) return;

      setProfile(prev => {
          const now = Date.now();
          const today = new Date(now).toDateString();
          
          const todayEntryIndex = prev.weightHistory.findIndex(entry => new Date(entry.date).toDateString() === today);
          
          const newHistory = [...prev.weightHistory];

          if (todayEntryIndex > -1) {
              newHistory[todayEntryIndex] = { date: now, weight: weightInKg };
          } else {
              newHistory.push({ date: now, weight: weightInKg });
          }
          
          newHistory.sort((a, b) => b.date - a.date);

          return { ...prev, weightHistory: newHistory };
      });
  }, [setProfile]);

  // Daily supplement plan analysis
  useEffect(() => {
    const runDailyAnalysis = () => {
        if (!supplementPlan) return;

        // Clean up old rejections
        const now = Date.now();
        const validRejections = rejectedSuggestions.filter(r => (now - r.rejectedAt) < THIRTY_DAYS_MS);
        if (validRejections.length !== rejectedSuggestions.length) {
            setRejectedSuggestions(validRejections);
        }
        const rejectedIdentifiers = new Set(validRejections.map(r => r.identifier));

        const allSuggestions = reviewSupplementPlan(supplementPlan, history, t);
        
        const currentPlanIdentifiers = new Set(supplementPlan.plan.map(p => p.id));
        
        const finalSuggestions = allSuggestions.filter(suggestion => {
            // Filter out rejected suggestions
            if (rejectedIdentifiers.has(suggestion.identifier)) {
                return false;
            }

            // Filter out suggestions that are already effectively applied
            // FIX: Stored `suggestion.action` in a local variable `action` before the switch statement. This is a common pattern to help TypeScript's control flow analysis correctly narrow the discriminated union type within the `filter` callback, resolving errors where properties like 'item' or 'itemId' were not recognized on the narrowed type.
            const action = suggestion.action;
            switch(action.type) {
                case 'ADD':
                    return !supplementPlan.plan.some(item => item.supplement === action.item.supplement);
                case 'REMOVE':
                    return currentPlanIdentifiers.has(action.itemId);
                case 'UPDATE':
                    const itemToUpdate = supplementPlan.plan.find(item => item.id === action.itemId);
                    if (!itemToUpdate) return false; // Item doesn't exist to be updated
                    // Check if any of the proposed updates are actually different
                    return Object.keys(action.updates).some(key => {
                        const K = key as keyof typeof action.updates;
                        return itemToUpdate[K] !== action.updates[K];
                    });
                default:
                    return true;
            }
        });

        if (finalSuggestions.length > 0) {
            setNewSuggestions(finalSuggestions);
            if (enableNotifications) {
              sendSupplementUpdateNotification(t('notification_supplement_title'), {
                body: t('notification_supplement_body'),
                icon: '/icon-192x192.png',
                tag: 'supplement-update',
              });
            }
        }
        setLastAnalysisTimestamp(now);
    };

    const now = Date.now();
    if (now - lastAnalysisTimestamp > TWENTY_FOUR_HOURS_MS) {
        runDailyAnalysis();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplementPlan]); // Rerun when supplement plan is loaded/changed.

  const clearNewSuggestions = useCallback(() => {
    setNewSuggestions([]);
  }, []);

  const dismissSuggestion = useCallback((suggestionId: string) => {
    setNewSuggestions(prev => {
      const suggestionToDismiss = prev.find(s => s.id === suggestionId);
      if (suggestionToDismiss) {
        setRejectedSuggestions(rej => [...rej, { identifier: suggestionToDismiss.identifier, rejectedAt: Date.now() }]);
      }
      return prev.filter(s => s.id !== suggestionId);
    });
  }, [setRejectedSuggestions]);

  const dismissAllSuggestions = useCallback(() => {
    setRejectedSuggestions(rej => [
      ...rej, 
      ...newSuggestions.map(s => ({ identifier: s.identifier, rejectedAt: Date.now() }))
    ]);
    clearNewSuggestions();
  }, [newSuggestions, clearNewSuggestions, setRejectedSuggestions]);

  const applyPlanSuggestion = useCallback((suggestionId: string) => {
      const suggestion = newSuggestions.find(s => s.id === suggestionId);
      if (!suggestion || !supplementPlan) return;

      let newPlanItems = [...supplementPlan.plan];
      let newCustomSupplements = [...userSupplements];
      const { action } = suggestion;

      switch(action.type) {
          case 'ADD':
              newPlanItems.push(action.item);
              if (action.item.isCustom) {
                  newCustomSupplements.push(action.item);
              }
              break;
          case 'REMOVE':
              newPlanItems = newPlanItems.filter(p => p.id !== action.itemId);
              newCustomSupplements = newCustomSupplements.filter(s => s.id !== action.itemId);
              break;
          case 'UPDATE':
              newPlanItems = newPlanItems.map(p => {
                  if (p.id === action.itemId) {
                      return { ...p, ...action.updates };
                  }
                  return p;
              });
              if (newPlanItems.find(p => p.id === action.itemId)?.isCustom) {
                  newCustomSupplements = newCustomSupplements.map(s => {
                      if (s.id === action.itemId) {
                          return { ...s, ...action.updates };
                      }
                      return s;
                  });
              }
              break;
      }
      
      setSupplementPlan({ ...supplementPlan, plan: newPlanItems });
      setUserSupplements(newCustomSupplements);
      setNewSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, [newSuggestions, supplementPlan, userSupplements, setSupplementPlan, setUserSupplements]);

  const applyAllPlanSuggestions = useCallback(() => {
      if (!supplementPlan) return;

      let tempPlanItems = [...supplementPlan.plan];
      let tempCustomSupplements = [...userSupplements];
      
      newSuggestions.forEach(suggestion => {
          const { action } = suggestion;
          switch(action.type) {
              case 'ADD':
                  tempPlanItems.push(action.item);
                  if (action.item.isCustom) {
                      tempCustomSupplements.push(action.item);
                  }
                  break;
              case 'REMOVE':
                  tempPlanItems = tempPlanItems.filter(p => p.id !== action.itemId);
                  tempCustomSupplements = tempCustomSupplements.filter(s => s.id !== action.itemId);
                  break;
              case 'UPDATE':
                  tempPlanItems = tempPlanItems.map(p => p.id === action.itemId ? { ...p, ...action.updates } : p);
                  if (tempPlanItems.find(p => p.id === action.itemId)?.isCustom) {
                      tempCustomSupplements = tempCustomSupplements.map(s => s.id === action.itemId ? { ...s, ...action.updates } : s);
                  }
                  break;
          }
      });

      setSupplementPlan({ ...supplementPlan, plan: tempPlanItems });
      setUserSupplements(tempCustomSupplements);
      clearNewSuggestions();

  }, [newSuggestions, supplementPlan, userSupplements, setSupplementPlan, setUserSupplements, clearNewSuggestions]);


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
    const translatedPredefinedRoutines = PREDEFINED_ROUTINES.map(r => {
      const nameKey = (r.id.replace(/-/g, '_') + '_name') as TranslationKey;
      const descKey = (r.id.replace(/-/g, '_') + '_desc') as TranslationKey;
      const translatedName = t(nameKey);
      const translatedDesc = t(descKey);
      return {
        ...r,
        name: translatedName !== nameKey ? translatedName : r.name,
        description: translatedDesc !== descKey ? translatedDesc : r.description,
      };
    });

    const predefinedIds = new Set(PREDEFINED_ROUTINES.map(r => r.id));
    // Filter out any predefined routines that might have snuck into userRoutines
    const filteredUserRoutines = userRoutines.filter(r => !predefinedIds.has(r.id));
    return [...translatedPredefinedRoutines, ...filteredUserRoutines];
  }, [userRoutines, t]);

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
        if (typeof ex.restTime === 'number' || !('timed' in ex.restTime) || !('effort' in ex.restTime)) {
          needsUpdate = true;
          const oldNormal = typeof ex.restTime === 'number' ? ex.restTime : (ex.restTime as any).normal;
          return {
            ...ex,
            restTime: {
              normal: oldNormal,
              warmup: (ex.restTime as any).warmup || 60,
              drop: (ex.restTime as any).drop || 30,
              timed: (ex.restTime as any).timed || 10,
              effort: (ex.restTime as any).effort || 180,
              failure: (ex.restTime as any).failure || 300,
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
    unlockAudioContext();
    setActiveTimerInfo(null);
    setCollapsedExerciseIds([]);
    // Deep copy to avoid mutating the original routine/template
    const newWorkoutExercises: WorkoutExercise[] = JSON.parse(JSON.stringify(routine.exercises));

    newWorkoutExercises.forEach((ex, exIndex) => {
        ex.id = `we-${Date.now()}-${exIndex}`;

        // Ensure all rest time properties exist, falling back to defaults
        ex.restTime = { ...defaultRestTimes, ...ex.restTime };

        const exerciseHistory = getExerciseHistory(history, ex.exerciseId);
        const lastPerformance = exerciseHistory.length > 0 ? exerciseHistory[0].exerciseData : null;

        // Group last performance sets by type for smarter inheritance
        const lastSetsByType = lastPerformance ? lastPerformance.sets.reduce((acc, set) => {
            if (!acc[set.type]) {
                acc[set.type] = [];
            }
            acc[set.type].push(set);
            return acc;
        }, {} as Record<string, PerformedSet[]>) : {};

        const currentSetTypeCounters: Record<string, number> = {
            normal: 0,
            warmup: 0,
            drop: 0,
            failure: 0,
            timed: 0,
        };

        ex.sets.forEach((set: PerformedSet, setIndex: number) => {
            set.id = `set-${Date.now()}-${exIndex}-${setIndex}`;
            set.isComplete = false;

            // Store the template values as historical fallback
            set.historicalWeight = set.weight;
            set.historicalReps = set.reps;
            set.historicalTime = set.time;

            if (routine.isTemplate) {
                if (lastPerformance) {
                    const setType = set.type;
                    const lastSetsOfSameType = lastSetsByType[setType] || [];
                    const typeSpecificIndex = currentSetTypeCounters[setType];

                    let lastSetToInheritFrom: PerformedSet | null = null;
                    if (lastSetsOfSameType.length > 0) {
                        // Use the set at the same type-specific index, or fall back to the last available set of that type.
                        lastSetToInheritFrom = lastSetsOfSameType[typeSpecificIndex] || lastSetsOfSameType[lastSetsOfSameType.length - 1];
                    }

                    if (lastSetToInheritFrom) {
                        // Since we grouped by type, we know the types match.
                        if (set.type === 'timed') {
                            set.reps = lastSetToInheritFrom.reps;
                            set.time = lastSetToInheritFrom.time;
                            set.historicalReps = lastSetToInheritFrom.reps;
                            set.historicalTime = lastSetToInheritFrom.time;
                            set.isRepsInherited = true;
                            set.isTimeInherited = true;
                        } else {
                            set.weight = lastSetToInheritFrom.weight;
                            set.reps = lastSetToInheritFrom.reps;
                            set.historicalWeight = lastSetToInheritFrom.weight;
                            set.historicalReps = lastSetToInheritFrom.reps;
                            set.isWeightInherited = true;
                            set.isRepsInherited = true;
                        }
                    } else {
                        // No last performance for this specific set type.
                        set.isWeightInherited = true;
                        set.isRepsInherited = true;
                        set.isTimeInherited = true;
                    }

                    currentSetTypeCounters[setType]++;
                } else {
                    // No last performance for this exercise at all.
                    set.isWeightInherited = true;
                    set.isRepsInherited = true;
                    set.isTimeInherited = true;
                }
            } else {
                // For "Latest Workouts", the routine itself IS the last performance data.
                // Just mark everything as inherited.
                set.isWeightInherited = true;
                set.isRepsInherited = true;
                set.isTimeInherited = true;
            }
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
  }, [setActiveWorkout, setIsWorkoutMinimized, defaultRestTimes, history, setActiveTimerInfo, setCollapsedExerciseIds]);

  const updateActiveWorkout = useCallback((workout: WorkoutSession) => {
    setActiveWorkout(workout);
  }, [setActiveWorkout]);

  const endWorkout = useCallback(() => {
    if (activeWorkout) {
      setActiveTimerInfo(null);
      setCollapsedExerciseIds([]);
      cancelTimerNotification('rest-timer-finished');
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
  }, [activeWorkout, history, routines, setActiveWorkout, setHistory, setIsWorkoutMinimized, setUserRoutines, setActiveTimerInfo, setCollapsedExerciseIds]);

  const discardActiveWorkout = useCallback(() => {
    setActiveTimerInfo(null);
    setCollapsedExerciseIds([]);
    cancelTimerNotification('rest-timer-finished');
    setActiveWorkout(null);
    setIsWorkoutMinimized(false);
  }, [setActiveWorkout, setIsWorkoutMinimized, setActiveTimerInfo, setCollapsedExerciseIds]);
  
  const minimizeWorkout = useCallback(() => setIsWorkoutMinimized(true), [setIsWorkoutMinimized]);
  const maximizeWorkout = useCallback(() => setIsWorkoutMinimized(false), [setIsWorkoutMinimized]);

  const startQuickTimer = useCallback((duration: number) => {
    unlockAudioContext();
    setActiveQuickTimer(duration);
  }, [setActiveQuickTimer]);

  const endQuickTimer = useCallback(() => {
    setActiveQuickTimer(null);
  }, [setActiveQuickTimer]);

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

  const updateEditingTemplate = useCallback((template: Routine) => {
    setEditingTemplate(template);
  }, []);

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

  const startAddExercisesToWorkout = useCallback(() => {
    setIsAddingExercisesToWorkout(true);
  }, []);

  const endAddExercisesToWorkout = useCallback((newExerciseIds?: string[]) => {
    if (newExerciseIds && newExerciseIds.length > 0 && activeWorkout) {
      const newExercises: WorkoutExercise[] = newExerciseIds.map(exerciseId => {
        const exercise = getExerciseById(exerciseId);
        const isTimed = exercise && exercise.isTimed;
        return {
          id: `we-${Date.now()}-${Math.random()}`,
          exerciseId,
          sets: [
              {
                  id: `set-${Date.now()}-${Math.random()}`,
                  reps: isTimed ? 1 : 0,
                  weight: 0,
                  time: isTimed ? 60 : undefined,
                  type: isTimed ? 'timed' : 'normal',
                  isComplete: false,
              }
          ],
          restTime: { ...defaultRestTimes },
        };
      });

      updateActiveWorkout({
          ...activeWorkout,
          exercises: [...activeWorkout.exercises, ...newExercises],
      });
    }
    setIsAddingExercisesToWorkout(false);
  }, [activeWorkout, defaultRestTimes, updateActiveWorkout, getExerciseById]);

  const startAddExercisesToTemplate = useCallback(() => {
    setIsAddingExercisesToTemplate(true);
  }, []);

  const endAddExercisesToTemplate = useCallback((newExerciseIds?: string[]) => {
    if (newExerciseIds && newExerciseIds.length > 0 && editingTemplate) {
      let newExercises: WorkoutExercise[];
      if (editingTemplate.routineType === 'hiit') {
          newExercises = newExerciseIds.map(exerciseId => ({
              id: `we-${Date.now()}-${Math.random()}`,
              exerciseId,
              sets: [{ id: `set-${Date.now()}-${Math.random()}`, reps: 1, weight: 0, type: 'normal', isComplete: false } as PerformedSet],
              restTime: { normal: 0, warmup: 0, drop: 0, timed: 0, effort: 0, failure: 0 },
          }));
      } else {
          newExercises = newExerciseIds.map(exId => {
              const exercise = getExerciseById(exId);
              const isTimed = exercise && exercise.isTimed;
              return {
                  id: `we-${Date.now()}-${Math.random()}`,
                  exerciseId: exId,
                  sets: Array.from({ length: 1 }, () => ({
                      id: `set-${Date.now()}-${Math.random()}`,
                      reps: isTimed ? 1 : 10,
                      weight: 0,
                      time: isTimed ? 60 : undefined,
                      type: isTimed ? 'timed' : 'normal',
                      isRepsInherited: false,
                      isWeightInherited: false,
                      isTimeInherited: false,
                  } as PerformedSet)),
                  restTime: { ...defaultRestTimes },
              };
          });
      }

      updateEditingTemplate({
          ...editingTemplate,
          exercises: [...editingTemplate.exercises, ...newExercises],
      });
    }
    setIsAddingExercisesToTemplate(false);
  }, [editingTemplate, defaultRestTimes, updateEditingTemplate, getExerciseById]);
  
  const handleUpdateExercise = useCallback((updatedExercise: WorkoutExercise) => {
    if (!activeWorkout) return;

    const originalExercise = activeWorkout.exercises.find(ex => ex.id === updatedExercise.id);
    if (!originalExercise) return;

    let justCompletedSet: PerformedSet | null = null;
    let justCompletedSetIndex: number = -1;
    let justUncompletedSet: PerformedSet | null = null;

    for (const [index, updatedSet] of updatedExercise.sets.entries()) {
        const originalSet = originalExercise.sets.find(s => s.id === updatedSet.id);
        if (originalSet && !originalSet.isComplete && updatedSet.isComplete) {
            justCompletedSet = updatedSet;
            justCompletedSetIndex = index;
            break;
        }
        if (originalSet && originalSet.isComplete && !updatedSet.isComplete) {
            justUncompletedSet = updatedSet;
            break;
        }
    }

    let workoutToUpdate = { ...activeWorkout };

    // If a timer was previously active, log its actual duration.
    if (justCompletedSet && activeTimerInfo && !activeTimerInfo.isPaused) {
        const elapsedSeconds = Math.round((Date.now() - (activeTimerInfo.targetTime - activeTimerInfo.totalDuration * 1000)) / 1000);
        
        const prevExerciseIndex = workoutToUpdate.exercises.findIndex(e => e.id === activeTimerInfo.exerciseId);
        if (prevExerciseIndex > -1) {
            const prevSetIndex = workoutToUpdate.exercises[prevExerciseIndex].sets.findIndex(s => s.id === activeTimerInfo.setId);
            if (prevSetIndex > -1) {
                workoutToUpdate.exercises[prevExerciseIndex].sets[prevSetIndex].actualRest = elapsedSeconds;
            }
        }
    }
    
    // Update the workout with the changes from the card
    const updatedExercises = workoutToUpdate.exercises.map(ex =>
        ex.id === updatedExercise.id ? updatedExercise : ex
    );
    workoutToUpdate = { ...workoutToUpdate, exercises: updatedExercises };

    // Set new timer or clear existing one
    if (justCompletedSet) {
        const duration = getTimerDuration(justCompletedSet, updatedExercise, justCompletedSetIndex);
        setActiveTimerInfo({
            exerciseId: updatedExercise.id,
            setId: justCompletedSet.id,
            targetTime: Date.now() + duration * 1000,
            totalDuration: duration,
            initialDuration: duration,
            isPaused: false,
            timeLeftWhenPaused: 0,
        });
    } else if (justUncompletedSet && activeTimerInfo && activeTimerInfo.setId === justUncompletedSet.id) {
        setActiveTimerInfo(null);
        cancelTimerNotification('rest-timer-finished');
    }
    
    updateActiveWorkout(workoutToUpdate);
  }, [activeWorkout, activeTimerInfo, setActiveTimerInfo, updateActiveWorkout]);

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
    measureUnit,
    setMeasureUnit,
    defaultRestTimes,
    setDefaultRestTimes,
    editingTemplate,
    updateEditingTemplate,
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
    activeQuickTimer,
    startQuickTimer,
    endQuickTimer,
    selectedVoiceURI,
    setSelectedVoiceURI,
    isAddingExercisesToWorkout,
    startAddExercisesToWorkout,
    endAddExercisesToWorkout,
    isAddingExercisesToTemplate,
    startAddExercisesToTemplate,
    endAddExercisesToTemplate,
    supplementPlan,
    setSupplementPlan,
    userSupplements,
    setUserSupplements,
    takenSupplements,
    setTakenSupplements,
    newSuggestions,
    applyPlanSuggestion,
    applyAllPlanSuggestions,
    dismissSuggestion,
    dismissAllSuggestions,
    clearNewSuggestions,
    profile,
    updateProfileInfo,
    currentWeight,
    logWeight,
    activeTimerInfo,
    setActiveTimerInfo,
    collapsedExerciseIds,
    setCollapsedExerciseIds,
  }), [
    routines, upsertRoutine, deleteRoutine, history, deleteHistorySession, updateHistorySession, exercises, getExerciseById,
    upsertExercise, activeWorkout, startWorkout, updateActiveWorkout, endWorkout,
    isWorkoutMinimized, minimizeWorkout, maximizeWorkout, discardActiveWorkout,
    measureUnit, setMeasureUnit, defaultRestTimes, setDefaultRestTimes,
    editingTemplate, updateEditingTemplate, startTemplateEdit, startTemplateDuplicate, endTemplateEdit, editingExercise,
    startExerciseEdit, endExerciseEdit, startExerciseDuplicate,
    editingHistorySession, startHistoryEdit, endHistoryEdit,
    useLocalizedExerciseNames, setUseLocalizedExerciseNames,
    keepScreenAwake, setKeepScreenAwake, enableNotifications, setEnableNotifications,
    allTimeBestSets, activeHiitSession, startHiitSession, endHiitSession,
    activeQuickTimer, startQuickTimer, endQuickTimer,
    selectedVoiceURI, setSelectedVoiceURI, isAddingExercisesToWorkout, startAddExercisesToWorkout, endAddExercisesToWorkout,
    isAddingExercisesToTemplate, startAddExercisesToTemplate, endAddExercisesToTemplate,
    supplementPlan, setSupplementPlan, userSupplements, setUserSupplements,
    takenSupplements, setTakenSupplements,
    newSuggestions, applyPlanSuggestion, applyAllPlanSuggestions, dismissSuggestion, dismissAllSuggestions, clearNewSuggestions,
    profile, updateProfileInfo, currentWeight, logWeight,
    activeTimerInfo, setActiveTimerInfo,
    collapsedExerciseIds, setCollapsedExerciseIds, handleUpdateExercise,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};