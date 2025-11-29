
import React, { createContext, useState, ReactNode, useMemo, useEffect, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Routine, WorkoutSession, Exercise, WorkoutExercise, PerformedSet, ActiveHiitSession, SupplementPlan, SupplementPlanItem, SupplementSuggestion, RejectedSuggestion, Profile, SupersetDefinition, OneRepMaxEntry } from '../types';
import { PREDEFINED_ROUTINES } from '../constants/routines';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { useI18n } from '../hooks/useI18n';
import { TranslationKey } from './I18nContext';
import { calculateRecords, getExerciseHistory, calculate1RM, getTimerDuration } from '../utils/workoutUtils';
import { speak } from '../services/speechService';
import { unlockAudioContext } from '../services/audioService';
import { reviewSupplementPlan, analyzeVolumeDrop } from '../services/supplementService';
import { cancelTimerNotification, sendSupplementUpdateNotification } from '../services/notificationService';

export type WeightUnit = 'kg' | 'lbs';
export type MeasureUnit = 'metric' | 'imperial';
export type CheckInReason = 'busy' | 'deload' | 'injury';

export interface CheckInState {
    active: boolean;
    lastChecked?: number;
    reason?: CheckInReason;
}

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
  upsertRoutines: (routines: Routine[]) => void;
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
  startAddExercisesToWorkout: (targetSupersetId?: string) => void;
  endAddExercisesToWorkout: (newExerciseIds?: string[]) => void;
  isAddingExercisesToTemplate: boolean;
  startAddExercisesToTemplate: (targetSupersetId?: string) => void;
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
  toggleSupplementIntake: (date: string, itemId: string) => void;
  updateSupplementStock: (itemId: string, delta: number) => void;
  updateSupplementPlanItem: (itemId: string, updates: Partial<SupplementPlanItem>) => void;
  snoozedSupplements: Record<string, number>;
  snoozeSupplement: (itemId: string) => void;
  newSuggestions: SupplementSuggestion[];
  applyPlanSuggestion: (suggestionId: string) => void;
  applyAllPlanSuggestions: () => void;
  dismissSuggestion: (suggestionId: string) => void;
  dismissAllSuggestions: () => void;
  clearNewSuggestions: () => void;
  triggerManualPlanReview: () => void;
  profile: Profile;
  updateProfileInfo: (updates: Partial<Omit<Profile, 'weightHistory' | 'unlocks'>>) => void;
  updateOneRepMax: (exerciseId: string, weight: number, method: 'calculated' | 'tested') => void;
  currentWeight?: number; // in kg
  logWeight: (weightInKg: number) => void;
  logUnlock: (fromExercise: string, toExercise: string) => void;
  activeTimerInfo: ActiveTimerInfo | null;
  setActiveTimerInfo: React.Dispatch<React.SetStateAction<ActiveTimerInfo | null>>;
  collapsedExerciseIds: string[];
  setCollapsedExerciseIds: React.Dispatch<React.SetStateAction<string[]>>;
  collapsedSupersetIds: string[];
  setCollapsedSupersetIds: React.Dispatch<React.SetStateAction<string[]>>;
  activeTimedSet: { exercise: WorkoutExercise; set: PerformedSet } | null;
  setActiveTimedSet: React.Dispatch<React.SetStateAction<{ exercise: WorkoutExercise; set: PerformedSet } | null>>;
  checkInState: CheckInState;
  handleCheckInResponse: (reason: CheckInReason) => void;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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
  const [targetSupersetId, setTargetSupersetId] = useState<string | undefined>(undefined);

  const [supplementPlan, setSupplementPlan] = useLocalStorage<SupplementPlan | null>('supplementPlan', null);
  const [userSupplements, setUserSupplements] = useLocalStorage<SupplementPlanItem[]>('userSupplements', []);
  const [takenSupplements, setTakenSupplements] = useLocalStorage<Record<string, string[]>>('takenSupplements', {});
  const [snoozedSupplements, setSnoozedSupplements] = useLocalStorage<Record<string, number>>('snoozedSupplements', {});

  const [profile, setProfile] = useLocalStorage<Profile>('profile', { weightHistory: [], unlocks: [], oneRepMaxes: {} });
  const [activeTimerInfo, setActiveTimerInfo] = useLocalStorage<ActiveTimerInfo | null>('activeRestTimer', null);
  const [collapsedExerciseIds, setCollapsedExerciseIds] = useLocalStorage<string[]>('collapsedExerciseIds', []);
  const [collapsedSupersetIds, setCollapsedSupersetIds] = useLocalStorage<string[]>('collapsedSupersetIds', []);
  const [activeTimedSet, setActiveTimedSet] = useState<{ exercise: WorkoutExercise; set: PerformedSet } | null>(null);

  const [lastAnalysisTimestamp, setLastAnalysisTimestamp] = useLocalStorage<number>('lastAnalysisTimestamp', 0);
  const [rejectedSuggestions, setRejectedSuggestions] = useLocalStorage<RejectedSuggestion[]>('rejectedSuggestions', []);
  const [newSuggestions, setNewSuggestions] = useState<SupplementSuggestion[]>([]);
  const [checkInState, setCheckInState] = useLocalStorage<CheckInState>('checkInState', { active: false });

  // Initialize oneRepMaxes if missing
  useEffect(() => {
      if (!profile.oneRepMaxes) {
          setProfile(prev => ({ ...prev, oneRepMaxes: {} }));
      }
  }, [profile.oneRepMaxes, setProfile]);

  useEffect(() => {
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
                            primaryMuscles: predefined.primaryMuscles,
                            secondaryMuscles: predefined.secondaryMuscles
                        };
                    }
                }
            }
            return ex;
        });
        return hasChanges ? updated : currentExercises;
    });
  }, [setRawExercises]);

  const currentWeight = useMemo(() => {
    if (profile.weightHistory.length === 0) return undefined;
    const sortedHistory = [...profile.weightHistory].sort((a, b) => b.date - a.date);
    return sortedHistory[0].weight;
  }, [profile.weightHistory]);

  const updateProfileInfo = useCallback((updates: Partial<Omit<Profile, 'weightHistory' | 'unlocks'>>) => {
      setProfile(prev => ({ ...prev, ...updates }));
  }, [setProfile]);
  
  const updateOneRepMax = useCallback((exerciseId: string, weight: number, method: 'calculated' | 'tested') => {
      setProfile(prev => {
          const current1RM = prev.oneRepMaxes?.[exerciseId];
          
          // Logic:
          // 1. If tested, always update (assume new test result is intentional override)
          // 2. If calculated, only update if greater than current stored max (calculated OR tested)
          //    OR if current doesn't exist.
          //    Exception: If current is 'tested' and much higher, maybe keep tested? 
          //    But typically e1RM is a good proxy for progress. 
          //    Let's say: Calculated only updates if > current. Tested always updates.
          
          if (method === 'tested' || !current1RM || weight > current1RM.weight) {
              return {
                  ...prev,
                  oneRepMaxes: {
                      ...prev.oneRepMaxes,
                      [exerciseId]: { exerciseId, weight, date: Date.now(), method }
                  }
              };
          }
          return prev;
      });
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
  
  const logUnlock = useCallback((fromExercise: string, toExercise: string) => {
      setProfile(prev => {
          const newUnlocks = prev.unlocks ? [...prev.unlocks] : [];
          newUnlocks.unshift({
              date: Date.now(),
              fromExercise,
              toExercise
          });
          return { ...prev, unlocks: newUnlocks };
      });
  }, [setProfile]);

  const updateSupplementStock = useCallback((itemId: string, delta: number) => {
      if (!supplementPlan) return;
      
      const newPlanItems = supplementPlan.plan.map(item => {
          if (item.id === itemId && item.stock !== undefined) {
              const newStock = Math.max(0, item.stock + delta);
              return { ...item, stock: newStock };
          }
          return item;
      });
      
      setSupplementPlan({ ...supplementPlan, plan: newPlanItems });

      setUserSupplements(prev => prev.map(item => {
        if (item.id === itemId && item.stock !== undefined) {
            return { ...item, stock: Math.max(0, item.stock + delta) };
        }
        return item;
    }));
  }, [supplementPlan, setSupplementPlan, setUserSupplements]);
  
  const updateSupplementPlanItem = useCallback((itemId: string, updates: Partial<SupplementPlanItem>) => {
      if (supplementPlan) {
          const newPlanItems = supplementPlan.plan.map(item => 
              item.id === itemId ? { ...item, ...updates } : item
          );
          setSupplementPlan({ ...supplementPlan, plan: newPlanItems });
      }
      
      setUserSupplements(prev => prev.map(item => {
          if (item.id === itemId) {
              return { ...item, ...updates };
          }
          return item;
      }));
  }, [supplementPlan, setSupplementPlan, setUserSupplements]);

  const toggleSupplementIntake = useCallback((date: string, itemId: string) => {
    setTakenSupplements(prev => {
      const currentDayTaken = prev[date] || [];
      const wasTaken = currentDayTaken.includes(itemId);
      
      updateSupplementStock(itemId, wasTaken ? 1 : -1);

      const newDayTaken = wasTaken
        ? currentDayTaken.filter(id => id !== itemId)
        : [...currentDayTaken, itemId];
      return { ...prev, [date]: newDayTaken };
    });
  }, [setTakenSupplements, updateSupplementStock]);

  const snoozeSupplement = useCallback((itemId: string) => {
    setSnoozedSupplements(prev => ({
        ...prev,
        [itemId]: Date.now() + 60 * 60 * 1000 // 1 hour
    }));
  }, [setSnoozedSupplements]);

  const runPlanAnalysis = useCallback((
      planToAnalyze: SupplementPlan,
      checkInReason: CheckInReason | null,
      filterRejected: boolean = true
  ) => {
        const now = Date.now();
        let currentRejected = rejectedSuggestions;

        if (filterRejected) {
            const validRejections = rejectedSuggestions.filter(r => (now - r.rejectedAt) < THIRTY_DAYS_MS);
            if (validRejections.length !== rejectedSuggestions.length) {
                setRejectedSuggestions(validRejections);
                currentRejected = validRejections;
            }
        }
        
        const rejectedIdentifiers = new Set(filterRejected ? currentRejected.map(r => r.identifier) : []);

        const allSuggestions = reviewSupplementPlan(planToAnalyze, history, t, checkInReason, takenSupplements);
        
        const finalSuggestions = allSuggestions.filter(suggestion => {
            if (rejectedIdentifiers.has(suggestion.identifier)) {
                return false;
            }

            const action = suggestion.action;
            switch(action.type) {
                case 'ADD':
                    return !planToAnalyze.plan.some(item => item.supplement === action.item.supplement);
                case 'REMOVE':
                    return new Set(planToAnalyze.plan.map(p => p.id)).has(action.itemId);
                case 'UPDATE':
                    const itemToUpdate = planToAnalyze.plan.find(item => item.id === action.itemId);
                    if (!itemToUpdate) return false;
                    if ('stock' in action.updates) {
                        return true; 
                    }
                    return Object.keys(action.updates).some(key => {
                        const K = key as keyof typeof action.updates;
                        // @ts-ignore
                        return itemToUpdate[K] !== action.updates[K];
                    });
                default:
                    return true;
            }
        });

        return finalSuggestions;
  }, [history, rejectedSuggestions, setRejectedSuggestions, t, takenSupplements]);

  useEffect(() => {
    const runDailyAnalysis = () => {
        if (!supplementPlan) return;

        const isSignificantVolumeDrop = analyzeVolumeDrop(history);
        let currentCheckInReason: CheckInReason | null = null;

        if (isSignificantVolumeDrop) {
             const now = Date.now();
             const isCheckInFresh = checkInState.lastChecked && (now - checkInState.lastChecked) < SEVEN_DAYS_MS;
             
             if (!isCheckInFresh) {
                 setCheckInState({ active: true });
                 currentCheckInReason = null;
             } else {
                 currentCheckInReason = checkInState.reason || null;
             }
        } else {
             if (checkInState.active) {
                 setCheckInState({ active: false });
             }
             currentCheckInReason = null;
        }
        
        const suggestions = runPlanAnalysis(supplementPlan, currentCheckInReason, true);

        if (suggestions.length > 0) {
            setNewSuggestions(suggestions);
            if (enableNotifications && !checkInState.active) {
              sendSupplementUpdateNotification(t('notification_supplement_title'), {
                body: t('notification_supplement_body'),
                icon: '/icon-192x192.png',
                tag: 'supplement-update',
              });
            }
        } else {
             setNewSuggestions([]);
        }
        setLastAnalysisTimestamp(Date.now());
    };

    const now = Date.now();
    if (now - lastAnalysisTimestamp > TWENTY_FOUR_HOURS_MS) {
        runDailyAnalysis();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplementPlan, history, takenSupplements]);

  const handleCheckInResponse = useCallback((reason: CheckInReason) => {
      setCheckInState({
          active: false,
          lastChecked: Date.now(),
          reason: reason
      });
      
      if (supplementPlan) {
        const suggestions = runPlanAnalysis(supplementPlan, reason, true);
        setNewSuggestions(suggestions);
      }
  }, [supplementPlan, runPlanAnalysis, setCheckInState]);

  const triggerManualPlanReview = useCallback(() => {
      if (!supplementPlan) return;
      const suggestions = runPlanAnalysis(supplementPlan, checkInState.reason || null, true);
      setNewSuggestions(suggestions);
  }, [supplementPlan, runPlanAnalysis, checkInState.reason]);

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
    const oldRoutinesRaw = window.localStorage.getItem('routines');
    if (oldRoutinesRaw) {
      try {
        const oldRoutinesFromStorage = JSON.parse(oldRoutinesRaw) as Routine[];
        const predefinedIds = new Set(PREDEFINED_ROUTINES.map(r => r.id));
        
        const nonPredefinedRoutines = oldRoutinesFromStorage.filter(r => !predefinedIds.has(r.id));
        
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
      
      // Translate exercise notes if they are translation keys
      const translatedExercises = r.exercises.map(ex => {
          if (ex.note) {
             // Try to translate the note. If it returns the key itself (and it looks like a key), we might want to keep it as is or handle gracefully.
             // But 't' returns key if missing.
             // We check if the note string matches our expected key pattern for anatoly notes or other keys
             if (ex.note.startsWith('anatoly_')) {
                 const translatedNote = t(ex.note as TranslationKey);
                 if (translatedNote !== ex.note) {
                     return { ...ex, note: translatedNote };
                 }
             }
          }
          return ex;
      });

      return {
        ...r,
        name: translatedName !== nameKey ? translatedName : r.name,
        description: translatedDesc !== descKey ? translatedDesc : r.description,
        exercises: translatedExercises
      };
    });

    const predefinedIds = new Set(PREDEFINED_ROUTINES.map(r => r.id));
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
        return ex;
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

  const upsertRoutines = useCallback((routinesToUpsert: Routine[]) => {
    setUserRoutines(prev => {
        const newRoutines = [...prev];
        routinesToUpsert.forEach(routine => {
             if (routine.id.startsWith('rt-')) return;
             const existingIndex = newRoutines.findIndex(r => r.id === routine.id);
             if (existingIndex > -1) {
                 newRoutines[existingIndex] = routine;
             } else {
                 newRoutines.push(routine);
             }
        });
        return newRoutines;
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
    setCollapsedSupersetIds([]);
    const newWorkoutExercises: WorkoutExercise[] = JSON.parse(JSON.stringify(routine.exercises));

    newWorkoutExercises.forEach((ex, exIndex) => {
        ex.id = `we-${Date.now()}-${exIndex}`;
        ex.restTime = { ...defaultRestTimes, ...ex.restTime };

        const exerciseHistory = getExerciseHistory(history, ex.exerciseId);
        const lastPerformance = exerciseHistory.length > 0 ? exerciseHistory[0].exerciseData : null;
        const exerciseInfo = getExerciseById(ex.exerciseId);
        const isBodyweight = exerciseInfo && ['Bodyweight', 'Assisted Bodyweight', 'Plyometrics'].includes(exerciseInfo.category);

        const lastSetsByType = lastPerformance ? lastPerformance.sets.reduce((acc, set) => {
            if (!acc[set.type]) {
                acc[set.type] = [];
            }
            acc[set.type].push(set);
            return acc;
        }, {} as Record<string, PerformedSet[]>) : {};

        const currentSetTypeCounters: Record<string, number> = {
            normal: 0, warmup: 0, drop: 0, failure: 0, timed: 0,
        };

        ex.sets.forEach((set: PerformedSet, setIndex: number) => {
            set.id = `set-${Date.now()}-${exIndex}-${setIndex}`;
            set.isComplete = false;
            set.historicalWeight = set.weight;
            set.historicalReps = set.reps;
            set.historicalTime = set.time;
            
            if (isBodyweight && currentWeight && currentWeight > 0 && set.weight === 0) {
                set.weight = currentWeight;
            }

            if (routine.isTemplate) {
                if (lastPerformance) {
                    const setType = set.type;
                    const lastSetsOfSameType = lastSetsByType[setType] || [];
                    const typeSpecificIndex = currentSetTypeCounters[setType];

                    let lastSetToInheritFrom: PerformedSet | null = null;
                    if (lastSetsOfSameType.length > 0) {
                        lastSetToInheritFrom = lastSetsOfSameType[typeSpecificIndex] || lastSetsOfSameType[lastSetsOfSameType.length - 1];
                    }

                    if (lastSetToInheritFrom) {
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
                        set.isWeightInherited = true;
                        set.isRepsInherited = true;
                        set.isTimeInherited = true;
                    }

                    currentSetTypeCounters[setType]++;
                } else {
                    set.isWeightInherited = true;
                    set.isRepsInherited = true;
                    set.isTimeInherited = true;
                }
            }
        });
    });

    setActiveWorkout({
      id: `session-${Date.now()}`,
      routineId: routine.id,
      routineName: routine.name,
      startTime: Date.now(),
      endTime: 0,
      exercises: newWorkoutExercises,
      supersets: routine.supersets || {},
    });
    setIsWorkoutMinimized(false);
  }, [history, defaultRestTimes, exercises, getExerciseById, setActiveWorkout, setIsWorkoutMinimized, setActiveTimerInfo, setCollapsedExerciseIds, setCollapsedSupersetIds, currentWeight]);
  
  const updateActiveWorkout = useCallback((workout: WorkoutSession) => {
    setActiveWorkout(workout);
  }, [setActiveWorkout]);

  const endWorkout = useCallback(() => {
    if (activeWorkout) {
      const completedWorkout = { ...activeWorkout, endTime: Date.now() };
      
      let prCount = 0;
      completedWorkout.exercises.forEach(ex => {
          const exerciseHistory = getExerciseHistory(history, ex.exerciseId);
          const previousRecords = calculateRecords(exerciseHistory);
          const currentRecords = calculateRecords([{ session: completedWorkout, exerciseData: { sets: ex.sets } }]);
          
          if (currentRecords.maxWeight && (!previousRecords.maxWeight || currentRecords.maxWeight.value > previousRecords.maxWeight.value)) prCount++;
          else if (currentRecords.maxReps && (!previousRecords.maxReps || currentRecords.maxReps.value > previousRecords.maxReps.value)) prCount++;
          else if (currentRecords.maxVolume && (!previousRecords.maxVolume || currentRecords.maxVolume.value > previousRecords.maxVolume.value)) prCount++;
          
          // Auto-update calculated 1RM
          const maxSet = currentRecords.maxWeight?.set;
          if (maxSet && maxSet.type === 'normal') {
              const e1rm = calculate1RM(maxSet.weight, maxSet.reps);
              updateOneRepMax(ex.exerciseId, e1rm, 'calculated');
          }
      });
      completedWorkout.prCount = prCount;

      setHistory(prev => [completedWorkout, ...prev].sort((a, b) => b.startTime - a.startTime));
      
      setUserRoutines(prev => prev.map(r => r.id === activeWorkout.routineId ? { ...r, lastUsed: Date.now() } : r));
      
      setActiveWorkout(null);
      setIsWorkoutMinimized(false);
      setActiveTimerInfo(null);
      setActiveTimedSet(null);
      setCollapsedExerciseIds([]);
      setCollapsedSupersetIds([]);
      cancelTimerNotification('rest-timer-finished');
    }
  }, [activeWorkout, setHistory, setUserRoutines, setActiveWorkout, setIsWorkoutMinimized, setActiveTimerInfo, setCollapsedExerciseIds, setCollapsedSupersetIds, setActiveTimedSet, history, updateOneRepMax]);

  const discardActiveWorkout = useCallback(() => {
    setActiveWorkout(null);
    setIsWorkoutMinimized(false);
    setActiveTimerInfo(null);
    setActiveTimedSet(null);
    setCollapsedExerciseIds([]);
    setCollapsedSupersetIds([]);
    cancelTimerNotification('rest-timer-finished');
  }, [setActiveWorkout, setIsWorkoutMinimized, setActiveTimerInfo, setCollapsedExerciseIds, setCollapsedSupersetIds, setActiveTimedSet]);
  
  const minimizeWorkout = useCallback(() => setIsWorkoutMinimized(true), [setIsWorkoutMinimized]);
  const maximizeWorkout = useCallback(() => setIsWorkoutMinimized(false), [setIsWorkoutMinimized]);

  const startTemplateEdit = useCallback((template: Routine) => {
    setEditingTemplate(JSON.parse(JSON.stringify(template)));
  }, []);
  
  const startTemplateDuplicate = useCallback((template: Routine) => {
    const copy = JSON.parse(JSON.stringify(template));
    copy.id = `custom-${Date.now()}`,
    copy.name = `${template.name} (Copy)`;
    copy.originId = template.id;
    delete copy.lastUsed;
    setEditingTemplate(copy);
  }, []);

  const updateEditingTemplate = useCallback((template: Routine) => {
    setEditingTemplate(template);
  }, []);

  const endTemplateEdit = useCallback((savedTemplate?: Routine) => {
    if (savedTemplate) {
      upsertRoutine(savedTemplate);
    }
    setEditingTemplate(null);
  }, [upsertRoutine]);

  const startExerciseEdit = useCallback((exercise: Exercise, onSaveCallback?: (savedExercise: Exercise) => void) => {
      setEditingExercise(JSON.parse(JSON.stringify(exercise)));
      if (onSaveCallback) {
          setExerciseEditCallback(() => onSaveCallback);
      } else {
          setExerciseEditCallback(null);
      }
  }, []);

  const startExerciseDuplicate = useCallback((exercise: Exercise, onSaveCallback?: (savedExercise: Exercise) => void) => {
      const copy = JSON.parse(JSON.stringify(exercise));
      copy.id = `custom-${Date.now()}`;
      copy.name = `${exercise.name} (Copy)`;
      setEditingExercise(copy);
      if (onSaveCallback) {
          setExerciseEditCallback(() => onSaveCallback);
      } else {
          setExerciseEditCallback(null);
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
  
  const startHistoryEdit = useCallback((session: WorkoutSession) => {
      setEditingHistorySession(JSON.parse(JSON.stringify(session)));
  }, []);
  
  const deleteHistorySession = useCallback((sessionId: string) => {
      setHistory(prev => prev.filter(s => s.id !== sessionId));
  }, [setHistory]);
  
  const updateHistorySession = useCallback((session: WorkoutSession) => {
      setHistory(prev => 
        prev.map(s => s.id === session.id ? session : s)
            .sort((a, b) => b.startTime - a.startTime)
      );
  }, [setHistory]);
  
  const endHistoryEdit = useCallback((savedSession?: WorkoutSession) => {
      if (savedSession) {
          updateHistorySession(savedSession);
      }
      setEditingHistorySession(null);
  }, [updateHistorySession]);

  const startHiitSession = useCallback((routine: Routine) => {
      setActiveHiitSession({
          routine: JSON.parse(JSON.stringify(routine)),
          startTime: Date.now(),
      });
  }, [setActiveHiitSession]);

  const endHiitSession = useCallback(() => {
      setActiveHiitSession(null);
  }, [setActiveHiitSession]);
  
  const startAddExercisesToWorkout = useCallback((targetSupersetId?: string) => {
      setIsAddingExercisesToWorkout(true);
      setTargetSupersetId(targetSupersetId);
  }, []);
  
  const endAddExercisesToWorkout = useCallback((newExerciseIds?: string[]) => {
      setIsAddingExercisesToWorkout(false);
      if (newExerciseIds && newExerciseIds.length > 0 && activeWorkout) {
          const newWorkoutExercises: WorkoutExercise[] = newExerciseIds.map((id) => ({
              id: `we-${Date.now()}-${Math.random()}`,
              exerciseId: id,
              sets: [
                  {
                    id: `set-${Date.now()}-${Math.random()}`,
                    reps: 0,
                    weight: 0,
                    type: 'normal',
                    isComplete: false,
                  }
              ],
              restTime: { ...defaultRestTimes },
              supersetId: targetSupersetId
          }));

          let updatedExercises = [...activeWorkout.exercises];
          if (targetSupersetId) {
             let insertIndex = -1;
             for (let i = updatedExercises.length - 1; i >= 0; i--) {
                 if (updatedExercises[i].supersetId === targetSupersetId) {
                     insertIndex = i;
                     break;
                 }
             }
             
             if (insertIndex !== -1) {
                 updatedExercises.splice(insertIndex + 1, 0, ...newWorkoutExercises);
             } else {
                 updatedExercises = [...updatedExercises, ...newWorkoutExercises];
             }
          } else {
              updatedExercises = [...updatedExercises, ...newWorkoutExercises];
          }
          
          updateActiveWorkout({
              ...activeWorkout,
              exercises: updatedExercises,
          });
      }
      setTargetSupersetId(undefined);
  }, [activeWorkout, defaultRestTimes, updateActiveWorkout, targetSupersetId]);
  
  const startAddExercisesToTemplate = useCallback((targetSupersetId?: string) => {
      setIsAddingExercisesToTemplate(true);
      setTargetSupersetId(targetSupersetId);
  }, []);
  
  const endAddExercisesToTemplate = useCallback((newExerciseIds?: string[]) => {
      setIsAddingExercisesToTemplate(false);
      if (newExerciseIds && newExerciseIds.length > 0 && editingTemplate) {
          const newWorkoutExercises: WorkoutExercise[] = newExerciseIds.map((id) => ({
              id: `we-template-${Date.now()}-${Math.random()}`,
              exerciseId: id,
              sets: [
                  {
                      id: `set-template-${Date.now()}-${Math.random()}`,
                      reps: 10,
                      weight: 0,
                      type: 'normal',
                      isComplete: false,
                  }
              ],
              restTime: { ...defaultRestTimes },
              supersetId: targetSupersetId
          }));
          
          let updatedExercises = [...editingTemplate.exercises];
          if (targetSupersetId) {
             let insertIndex = -1;
             for (let i = updatedExercises.length - 1; i >= 0; i--) {
                 if (updatedExercises[i].supersetId === targetSupersetId) {
                     insertIndex = i;
                     break;
                 }
             }
             
             if (insertIndex !== -1) {
                 updatedExercises.splice(insertIndex + 1, 0, ...newWorkoutExercises);
             } else {
                 updatedExercises = [...updatedExercises, ...newWorkoutExercises];
             }
          } else {
              updatedExercises = [...updatedExercises, ...newWorkoutExercises];
          }

          updateEditingTemplate({
              ...editingTemplate,
              exercises: updatedExercises,
          });
      }
      setTargetSupersetId(undefined);
  }, [editingTemplate, defaultRestTimes, updateEditingTemplate, targetSupersetId]);

  const startQuickTimer = useCallback((duration: number) => {
      setActiveQuickTimer(duration);
  }, [setActiveQuickTimer]);

  const endQuickTimer = useCallback(() => {
      setActiveQuickTimer(null);
  }, [setActiveQuickTimer]);

  const value = {
    routines,
    upsertRoutine,
    upsertRoutines,
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
    selectedVoiceURI,
    setSelectedVoiceURI,
    isAddingExercisesToWorkout,
    startAddExercisesToWorkout,
    endAddExercisesToWorkout,
    isAddingExercisesToTemplate,
    startAddExercisesToTemplate,
    endAddExercisesToTemplate,
    activeQuickTimer,
    startQuickTimer,
    endQuickTimer,
    supplementPlan,
    setSupplementPlan,
    userSupplements,
    setUserSupplements,
    takenSupplements,
    setTakenSupplements,
    toggleSupplementIntake,
    updateSupplementStock,
    updateSupplementPlanItem,
    snoozedSupplements,
    snoozeSupplement,
    newSuggestions,
    applyPlanSuggestion,
    applyAllPlanSuggestions,
    dismissSuggestion,
    dismissAllSuggestions,
    clearNewSuggestions,
    triggerManualPlanReview,
    profile,
    updateProfileInfo,
    updateOneRepMax,
    currentWeight,
    logWeight,
    logUnlock,
    activeTimerInfo,
    setActiveTimerInfo,
    collapsedExerciseIds,
    setCollapsedExerciseIds,
    collapsedSupersetIds,
    setCollapsedSupersetIds,
    activeTimedSet,
    setActiveTimedSet,
    checkInState,
    handleCheckInResponse,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};