
import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { 
  Routine, WorkoutSession, Exercise, WorkoutExercise, PerformedSet, 
  Profile, SupplementPlan, SupplementPlanItem, SupplementSuggestion, 
  AutoUpdateEntry
} from '../types';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { PREDEFINED_ROUTINES } from '../constants/routines';

// Define types exported from Context
export type CheckInReason = 'busy' | 'deload' | 'injury';
export type WeightUnit = 'kg' | 'lbs';

export interface ActiveTimerInfo {
  exerciseId: string;
  setId: string;
  targetTime: number;
  totalDuration: number;
  initialDuration: number;
  isPaused: boolean;
  timeLeftWhenPaused: number;
}

export interface TimedSetInfo {
    exercise: WorkoutExercise;
    set: PerformedSet;
}

export interface AppContextType {
  // Workout State
  activeWorkout: WorkoutSession | null;
  startWorkout: (routine: Routine) => void;
  updateActiveWorkout: (workout: WorkoutSession) => void;
  endWorkout: () => void;
  discardActiveWorkout: () => void;
  isWorkoutMinimized: boolean;
  minimizeWorkout: () => void;
  maximizeWorkout: () => void;
  
  // Lists
  routines: Routine[];
  upsertRoutine: (routine: Routine) => void;
  upsertRoutines: (routines: Routine[]) => void;
  deleteRoutine: (id: string) => void;
  
  exercises: Exercise[];
  setRawExercises: React.Dispatch<React.SetStateAction<Exercise[]>>;
  getExerciseById: (id: string) => Exercise | undefined;
  startExerciseEdit: (exercise: Exercise, onComplete?: (ex: Exercise) => void) => void;
  endExerciseEdit: (exercise?: Exercise) => void;
  editingExercise: Exercise | null;
  startExerciseDuplicate: (exercise: Exercise, onComplete?: (ex: Exercise) => void) => void;

  history: WorkoutSession[];
  deleteHistorySession: (id: string) => void;
  startHistoryEdit: (session: WorkoutSession) => void;
  endHistoryEdit: (session?: WorkoutSession) => void;
  editingHistorySession: WorkoutSession | null;
  
  // Templates
  editingTemplate: Routine | null;
  startTemplateEdit: (routine: Routine) => void;
  updateEditingTemplate: (routine: Routine) => void;
  endTemplateEdit: (routine?: Routine) => void;
  startTemplateDuplicate: (routine: Routine) => void;
  
  // Adding Exercises
  isAddingExercisesToWorkout: boolean;
  startAddExercisesToWorkout: (supersetId?: string) => void;
  endAddExercisesToWorkout: (ids?: string[]) => void;
  isAddingExercisesToTemplate: boolean;
  startAddExercisesToTemplate: (supersetId?: string) => void;
  endAddExercisesToTemplate: (ids?: string[]) => void;
  
  // Timers
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
  
  // Profile & Settings
  profile: Profile;
  updateProfileInfo: (info: Partial<Profile>) => void;
  currentWeight: number | undefined;
  logWeight: (weight: number) => void;
  measureUnit: 'metric' | 'imperial';
  setMeasureUnit: (unit: 'metric' | 'imperial') => void;
  
  // Logic/Analytics
  allTimeBestSets: Record<string, PerformedSet>;
  checkInState: { active: boolean };
  handleCheckInResponse: (reason: CheckInReason) => void;
  logUnlock: (from: string, to: string) => void;
  
  // 1RM
  updateOneRepMax: (exerciseId: string, weight: number, method: 'calculated' | 'tested') => void;
  snoozeOneRepMaxUpdate: (exerciseId: string, until: number) => void;
  undoAutoUpdate: (exerciseId: string) => void;
  dismissAutoUpdate: (exerciseId: string) => void;
  applyCalculated1RM: (exerciseId: string, weight: number) => void;

  // Supplements
  supplementPlan: SupplementPlan | null;
  setSupplementPlan: (plan: SupplementPlan | null) => void;
  userSupplements: SupplementPlanItem[];
  setUserSupplements: React.Dispatch<React.SetStateAction<SupplementPlanItem[]>>;
  takenSupplements: Record<string, string[]>;
  toggleSupplementIntake: (date: string, itemId: string) => void;
  snoozedSupplements: Record<string, number>;
  snoozeSupplement: (itemId: string) => void;
  updateSupplementStock: (itemId: string, amountToAdd: number) => void;
  updateSupplementPlanItem: (itemId: string, updates: Partial<SupplementPlanItem>) => void;
  
  // Suggestions (Supplements)
  newSuggestions: SupplementSuggestion[];
  applyPlanSuggestion: (suggestionId: string) => void;
  applyAllPlanSuggestions: () => void;
  dismissSuggestion: (suggestionId: string) => void;
  dismissAllSuggestions: () => void;
  clearNewSuggestions: () => void;
  triggerManualPlanReview: () => void;

  // UI/State
  defaultRestTimes: { normal: number; warmup: number; drop: number; timed: number; effort: number; failure: number; };
  setDefaultRestTimes: React.Dispatch<React.SetStateAction<{ normal: number; warmup: number; drop: number; timed: number; effort: number; failure: number; }>>;
  useLocalizedExerciseNames: boolean;
  setUseLocalizedExerciseNames: React.Dispatch<React.SetStateAction<boolean>>;
  keepScreenAwake: boolean;
  setKeepScreenAwake: React.Dispatch<React.SetStateAction<boolean>>;
  enableNotifications: boolean;
  setEnableNotifications: React.Dispatch<React.SetStateAction<boolean>>;
  selectedVoiceURI: string | null;
  setSelectedVoiceURI: React.Dispatch<React.SetStateAction<string | null>>;
  
  collapsedExerciseIds: string[];
  setCollapsedExerciseIds: React.Dispatch<React.SetStateAction<string[]>>;
  collapsedSupersetIds: string[];
  setCollapsedSupersetIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Persistence
  const [history, setHistory] = useLocalStorage<WorkoutSession[]>('history', []);
  const [routines, setRoutines] = useLocalStorage<Routine[]>('routines', PREDEFINED_ROUTINES);
  const [rawExercises, setRawExercises] = useLocalStorage<Exercise[]>('exercises', PREDEFINED_EXERCISES);
  const [activeWorkout, setActiveWorkout] = useLocalStorage<WorkoutSession | null>('activeWorkout', null);
  const [profile, setProfile] = useLocalStorage<Profile>('profile', { weightHistory: [] });
  const [supplementPlan, setSupplementPlan] = useLocalStorage<SupplementPlan | null>('supplementPlan', null);
  const [userSupplements, setUserSupplements] = useLocalStorage<SupplementPlanItem[]>('userSupplements', []);
  const [takenSupplements, setTakenSupplements] = useLocalStorage<Record<string, string[]>>('takenSupplements', {});
  const [snoozedSupplements, setSnoozedSupplements] = useLocalStorage<Record<string, number>>('snoozedSupplements', {});
  
  // Settings
  const [measureUnit, setMeasureUnit] = useLocalStorage<'metric' | 'imperial'>('measureUnit', 'metric');
  const [defaultRestTimes, setDefaultRestTimes] = useLocalStorage('defaultRestTimes', { normal: 90, warmup: 60, drop: 30, timed: 60, effort: 180, failure: 300 });
  const [useLocalizedExerciseNames, setUseLocalizedExerciseNames] = useLocalStorage('useLocalizedExerciseNames', false);
  const [keepScreenAwake, setKeepScreenAwake] = useLocalStorage('keepScreenAwake', true);
  const [enableNotifications, setEnableNotifications] = useLocalStorage('enableNotifications', false);
  const [selectedVoiceURI, setSelectedVoiceURI] = useLocalStorage<string | null>('selectedVoiceURI', null);

  // Transient UI State
  const [isWorkoutMinimized, setIsWorkoutMinimized] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Routine | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editingHistorySession, setEditingHistorySession] = useState<WorkoutSession | null>(null);
  const [onExerciseEditComplete, setOnExerciseEditComplete] = useState<((ex: Exercise) => void) | undefined>();
  const [activeHiitSession, setActiveHiitSession] = useState<{ routine: Routine, startTime: number } | null>(null);
  const [activeQuickTimer, setActiveQuickTimer] = useState<number | null>(null);
  
  const [isAddingExercisesToWorkout, setIsAddingExercisesToWorkout] = useState(false);
  const [isAddingExercisesToTemplate, setIsAddingExercisesToTemplate] = useState(false);
  const [addingTargetSupersetId, setAddingTargetSupersetId] = useState<string | undefined>(undefined);

  const [activeTimerInfo, setActiveTimerInfo] = useState<ActiveTimerInfo | null>(null);
  const [activeTimedSet, setActiveTimedSet] = useState<TimedSetInfo | null>(null);
  const [collapsedExerciseIds, setCollapsedExerciseIds] = useState<string[]>([]);
  const [collapsedSupersetIds, setCollapsedSupersetIds] = useState<string[]>([]);
  
  // Suggestions State
  const [newSuggestions, setNewSuggestions] = useState<SupplementSuggestion[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useLocalStorage<string[]>('dismissedSuggestions', []);

  // Exercise Fixing Logic
  useEffect(() => {
    setRawExercises(currentExercises => {
        let hasChanges = false;
        const updated = currentExercises.map(ex => {
            if (ex.id.startsWith('ex-')) {
                const predefined = PREDEFINED_EXERCISES.find(p => p.id === ex.id);
                if (predefined) {
                    // Check for structural updates (muscle data, category, body part)
                    // Important: Local storage can hold stale data if we change categories in code.
                    // We force sync structural properties from PREDEFINED to ensure logic like 1RM inference works.
                    const missingPrimary = predefined.primaryMuscles && !ex.primaryMuscles;
                    const missingSecondary = predefined.secondaryMuscles && !ex.secondaryMuscles;
                    const categoryMismatch = ex.category !== predefined.category;
                    const bodyPartMismatch = ex.bodyPart !== predefined.bodyPart;
                    
                    if (missingPrimary || missingSecondary || categoryMismatch || bodyPartMismatch) {
                        hasChanges = true;
                        return {
                            ...ex,
                            category: predefined.category,
                            bodyPart: predefined.bodyPart,
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

  const exercises = React.useMemo(() => {
      // Logic to merge predefined if needed, but currently we just use stored rawExercises which are initialized with predefined
      return rawExercises;
  }, [rawExercises]);

  const getExerciseById = useCallback((id: string) => {
      return exercises.find(e => e.id === id);
  }, [exercises]);

  const currentWeight = React.useMemo(() => {
      const sorted = [...profile.weightHistory].sort((a, b) => b.date - a.date);
      return sorted.length > 0 ? sorted[0].weight : undefined;
  }, [profile.weightHistory]);

  const allTimeBestSets = React.useMemo(() => {
      const bests: Record<string, PerformedSet> = {};
      history.forEach(session => {
          session.exercises.forEach(ex => {
              ex.sets.forEach(set => {
                  if (set.type === 'normal' && set.isComplete) {
                      const currentBest = bests[ex.exerciseId];
                      // Simple best: Max Weight. If tie, max reps.
                      if (!currentBest || set.weight > currentBest.weight || (set.weight === currentBest.weight && set.reps > currentBest.reps)) {
                          bests[ex.exerciseId] = set;
                      }
                  }
              });
          });
      });
      return bests;
  }, [history]);

  // Actions
  const startWorkout = (routine: Routine) => {
      const session: WorkoutSession = {
          id: `session-${Date.now()}`,
          routineId: routine.id,
          routineName: routine.name,
          startTime: Date.now(),
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
  };

  const updateActiveWorkout = (workout: WorkoutSession) => {
      setActiveWorkout(workout);
  };

  const endWorkout = () => {
      if (activeWorkout) {
          const finishedWorkout = { ...activeWorkout, endTime: Date.now() };
          setHistory(prev => [finishedWorkout, ...prev]);
          setActiveWorkout(null);
          setIsWorkoutMinimized(false);
          setActiveTimerInfo(null);
          setActiveTimedSet(null);
          setCollapsedExerciseIds([]);
          setCollapsedSupersetIds([]);
      }
  };

  const discardActiveWorkout = () => {
      setActiveWorkout(null);
      setIsWorkoutMinimized(false);
      setActiveTimerInfo(null);
      setActiveTimedSet(null);
      setCollapsedExerciseIds([]);
      setCollapsedSupersetIds([]);
  };

  const upsertRoutine = (routine: Routine) => {
      setRoutines(prev => {
          const idx = prev.findIndex(r => r.id === routine.id);
          if (idx >= 0) {
              const newRoutines = [...prev];
              newRoutines[idx] = routine;
              return newRoutines;
          }
          return [...prev, routine];
      });
  };

  const upsertRoutines = (newRoutines: Routine[]) => {
      setRoutines(prev => {
          const combined = [...prev];
          newRoutines.forEach(routine => {
              const idx = combined.findIndex(r => r.id === routine.id);
              if (idx >= 0) combined[idx] = routine;
              else combined.push(routine);
          });
          return combined;
      });
  };

  const deleteRoutine = (id: string) => {
      setRoutines(prev => prev.filter(r => r.id !== id));
  };

  const deleteHistorySession = (id: string) => {
      setHistory(prev => prev.filter(h => h.id !== id));
  };

  const startTemplateEdit = (routine: Routine) => {
      setEditingTemplate(routine);
  };

  const updateEditingTemplate = (routine: Routine) => {
      setEditingTemplate(routine);
  };

  const endTemplateEdit = (routine?: Routine) => {
      if (routine) {
          upsertRoutine(routine);
      }
      setEditingTemplate(null);
  };

  const startTemplateDuplicate = (routine: Routine) => {
      const copy = { ...routine, id: `custom-${Date.now()}`, name: `${routine.name} (Copy)`, originId: routine.id };
      startTemplateEdit(copy);
  };

  const startExerciseEdit = (exercise: Exercise, onComplete?: (ex: Exercise) => void) => {
      setEditingExercise(exercise);
      setOnExerciseEditComplete(() => onComplete);
  };

  const endExerciseEdit = (exercise?: Exercise) => {
      if (exercise) {
          setRawExercises(prev => {
              const idx = prev.findIndex(e => e.id === exercise.id);
              if (idx >= 0) {
                  const newExs = [...prev];
                  newExs[idx] = exercise;
                  return newExs;
              }
              return [...prev, exercise];
          });
          if (onExerciseEditComplete) {
              onExerciseEditComplete(exercise);
          }
      }
      setEditingExercise(null);
      setOnExerciseEditComplete(undefined);
  };

  const startExerciseDuplicate = (exercise: Exercise, onComplete?: (ex: Exercise) => void) => {
      const copy = { ...exercise, id: `custom-${Date.now()}`, name: `${exercise.name} (Copy)` };
      startExerciseEdit(copy, onComplete);
  }

  const startAddExercisesToWorkout = (supersetId?: string) => {
      setAddingTargetSupersetId(supersetId);
      setIsAddingExercisesToWorkout(true);
  };

  const endAddExercisesToWorkout = (ids?: string[]) => {
      setIsAddingExercisesToWorkout(false);
      if (ids && activeWorkout) {
          const newExercises: WorkoutExercise[] = ids.map(id => ({
              id: `we-${Date.now()}-${Math.random()}`,
              exerciseId: id,
              sets: [{ id: `set-${Date.now()}-${Math.random()}`, reps: 10, weight: 0, type: 'normal', isComplete: false }],
              restTime: defaultRestTimes,
              supersetId: addingTargetSupersetId
          }));
          
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
  };

  const startAddExercisesToTemplate = (supersetId?: string) => {
      setAddingTargetSupersetId(supersetId);
      setIsAddingExercisesToTemplate(true);
  };

  const endAddExercisesToTemplate = (ids?: string[]) => {
      setIsAddingExercisesToTemplate(false);
      if (ids && editingTemplate) {
          const newExercises: WorkoutExercise[] = ids.map(id => ({
              id: `we-${Date.now()}-${Math.random()}`,
              exerciseId: id,
              sets: [{ id: `set-${Date.now()}-${Math.random()}`, reps: 10, weight: 0, type: 'normal', isComplete: false }],
              restTime: defaultRestTimes,
              supersetId: addingTargetSupersetId
          }));
          
          let updatedExercises = [...editingTemplate.exercises];
          
          if (addingTargetSupersetId) {
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

          updateEditingTemplate({ ...editingTemplate, exercises: updatedExercises });
      }
      setAddingTargetSupersetId(undefined);
  };

  const startHistoryEdit = (session: WorkoutSession) => {
      setEditingHistorySession(session);
  };

  const endHistoryEdit = (session?: WorkoutSession) => {
      if (session) {
          setHistory(prev => prev.map(s => s.id === session.id ? session : s));
      }
      setEditingHistorySession(null);
  };

  const updateProfileInfo = (info: Partial<Profile>) => {
      setProfile(prev => ({ ...prev, ...info }));
  };

  const logWeight = (weight: number) => {
      setProfile(prev => ({
          ...prev,
          weightHistory: [...prev.weightHistory, { date: Date.now(), weight }]
      }));
  };

  const updateOneRepMax = (exerciseId: string, weight: number, method: 'calculated' | 'tested') => {
      setProfile(prev => ({
          ...prev,
          oneRepMaxes: {
              ...prev.oneRepMaxes,
              [exerciseId]: { exerciseId, weight, date: Date.now(), method }
          },
          // Clear auto-update entry if manual update happens
          autoUpdated1RMs: (() => {
              const newAuto = { ...prev.autoUpdated1RMs };
              delete newAuto[exerciseId];
              return newAuto;
          })()
      }));
  };

  const snoozeOneRepMaxUpdate = (exerciseId: string, until: number) => {
      setProfile(prev => ({
          ...prev,
          oneRepMaxSnoozes: {
              ...prev.oneRepMaxSnoozes,
              [exerciseId]: Date.now() + until
          }
      }));
  };

  const undoAutoUpdate = (exerciseId: string) => {
      const entry = profile.autoUpdated1RMs?.[exerciseId];
      if (entry) {
          updateOneRepMax(exerciseId, entry.oldWeight, 'calculated');
          // Also remove from autoUpdated1RMs
      }
  };

  const dismissAutoUpdate = (exerciseId: string) => {
      setProfile(prev => {
          const newAuto = { ...prev.autoUpdated1RMs };
          delete newAuto[exerciseId];
          return { ...prev, autoUpdated1RMs: newAuto };
      });
  };

  const applyCalculated1RM = (exerciseId: string, weight: number) => {
      updateOneRepMax(exerciseId, weight, 'calculated');
  };

  const logUnlock = (from: string, to: string) => {
      setProfile(prev => ({
          ...prev,
          unlocks: [...(prev.unlocks || []), { date: Date.now(), fromExercise: from, toExercise: to }]
      }));
  };

  const toggleSupplementIntake = (date: string, itemId: string) => {
      setTakenSupplements(prev => {
          const currentDay = prev[date] || [];
          if (currentDay.includes(itemId)) {
              return { ...prev, [date]: currentDay.filter(id => id !== itemId) };
          }
          return { ...prev, [date]: [...currentDay, itemId] };
      });
      // Consume stock
      const item = [...(supplementPlan?.plan || []), ...userSupplements].find(i => i.id === itemId);
      if (item && item.stock !== undefined && item.stock > 0) {
          // If untaking, maybe we shouldn't refund? Let's assume we do for simplicity
          const isTaken = takenSupplements[date]?.includes(itemId);
          updateSupplementStock(itemId, isTaken ? 1 : -1); 
      }
  };

  const updateSupplementStock = (itemId: string, amountToAdd: number) => {
      if (userSupplements.some(s => s.id === itemId)) {
          setUserSupplements(prev => prev.map(s => s.id === itemId ? { ...s, stock: (s.stock || 0) + amountToAdd } : s));
      } else if (supplementPlan) {
          setSupplementPlan({
              ...supplementPlan,
              plan: supplementPlan.plan.map(s => s.id === itemId ? { ...s, stock: (s.stock || 0) + amountToAdd } : s)
          });
      }
  };

  const updateSupplementPlanItem = (itemId: string, updates: Partial<SupplementPlanItem>) => {
      if (userSupplements.some(s => s.id === itemId)) {
          setUserSupplements(prev => prev.map(s => s.id === itemId ? { ...s, ...updates } : s));
      } else if (supplementPlan) {
          setSupplementPlan({
              ...supplementPlan,
              plan: supplementPlan.plan.map(s => s.id === itemId ? { ...s, ...updates } : s)
          });
      }
  };

  const snoozeSupplement = (itemId: string) => {
      setSnoozedSupplements(prev => ({ ...prev, [itemId]: Date.now() + 6 * 60 * 60 * 1000 })); // 6 hours
  };

  // Check-In Logic
  const checkInState = React.useMemo(() => {
      const now = Date.now();
      const lastSession = history.length > 0 ? history[0] : null;
      if (!lastSession) return { active: false };
      const daysSince = (now - lastSession.startTime) / (1000 * 60 * 60 * 24);
      return { active: daysSince > 10 };
  }, [history]);

  const handleCheckInResponse = (reason: CheckInReason) => {
      // Handle response (log, suggest deload, etc.)
      console.log('Check in reason:', reason);
      // For now, just "touch" history to reset timer or track it separately?
      // Let's create a dummy "Check-In" session or just ignore for simplicity until fully implemented
  };

  // Supplement Suggestions
  const applyPlanSuggestion = (suggestionId: string) => {
      const suggestion = newSuggestions.find(s => s.id === suggestionId);
      if (suggestion) {
          const action = suggestion.action;
          if (action.type === 'ADD') {
              if (action.item) {
                  setUserSupplements(prev => [...prev, { ...action.item, isCustom: true } as SupplementPlanItem]);
              }
          } else if (action.type === 'REMOVE') {
              const id = action.itemId;
              updateSupplementPlanItem(id, { restDayOnly: undefined, trainingDayOnly: undefined }); // Reset flags if any
              // Actually remove
              if (supplementPlan) {
                  setSupplementPlan({ ...supplementPlan, plan: supplementPlan.plan.filter(i => i.id !== id) });
              }
              setUserSupplements(prev => prev.filter(i => i.id !== id));
          } else if (action.type === 'UPDATE') {
              updateSupplementPlanItem(action.itemId, action.updates);
          }
          dismissSuggestion(suggestionId);
      }
  };

  const applyAllPlanSuggestions = () => {
      newSuggestions.forEach(s => applyPlanSuggestion(s.id));
  };

  const dismissSuggestion = (suggestionId: string) => {
      const suggestion = newSuggestions.find(s => s.id === suggestionId);
      if (suggestion) {
          setDismissedSuggestions(prev => [...prev, suggestion.identifier]);
          setNewSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      }
  };

  const dismissAllSuggestions = () => {
      setDismissedSuggestions(prev => [...prev, ...newSuggestions.map(s => s.identifier)]);
      setNewSuggestions([]);
  };

  const clearNewSuggestions = () => {
      setNewSuggestions([]);
  };

  const triggerManualPlanReview = () => {
      // Implement logic to invoke `reviewSupplementPlan` service
      // This usually needs to import the service and run it, setting `newSuggestions`
      // For now, placeholders
  };

  // Timers
  const startQuickTimer = (seconds: number) => setActiveQuickTimer(seconds);
  const endQuickTimer = () => setActiveQuickTimer(null);
  const startHiitSession = (routine: Routine) => setActiveHiitSession({ routine, startTime: Date.now() });
  const endHiitSession = () => setActiveHiitSession(null);

  const value = {
    activeWorkout, startWorkout, updateActiveWorkout, endWorkout, discardActiveWorkout,
    isWorkoutMinimized, minimizeWorkout: () => setIsWorkoutMinimized(true), maximizeWorkout: () => setIsWorkoutMinimized(false),
    routines, upsertRoutine, upsertRoutines, deleteRoutine,
    exercises, setRawExercises, getExerciseById, startExerciseEdit, endExerciseEdit, editingExercise, startExerciseDuplicate,
    history, deleteHistorySession, startHistoryEdit, endHistoryEdit, editingHistorySession,
    editingTemplate, startTemplateEdit, updateEditingTemplate, endTemplateEdit, startTemplateDuplicate,
    isAddingExercisesToWorkout, startAddExercisesToWorkout, endAddExercisesToWorkout,
    isAddingExercisesToTemplate, startAddExercisesToTemplate, endAddExercisesToTemplate,
    activeTimerInfo, setActiveTimerInfo, activeTimedSet, setActiveTimedSet,
    activeQuickTimer, startQuickTimer, endQuickTimer, activeHiitSession, startHiitSession, endHiitSession,
    profile, updateProfileInfo, currentWeight, logWeight, measureUnit, setMeasureUnit,
    allTimeBestSets, checkInState, handleCheckInResponse, logUnlock,
    updateOneRepMax, snoozeOneRepMaxUpdate, undoAutoUpdate, dismissAutoUpdate, applyCalculated1RM,
    supplementPlan, setSupplementPlan, userSupplements, setUserSupplements, takenSupplements, toggleSupplementIntake, snoozedSupplements, snoozeSupplement, updateSupplementStock, updateSupplementPlanItem,
    newSuggestions, applyPlanSuggestion, applyAllPlanSuggestions, dismissSuggestion, dismissAllSuggestions, clearNewSuggestions, triggerManualPlanReview,
    defaultRestTimes, setDefaultRestTimes,
    useLocalizedExerciseNames, setUseLocalizedExerciseNames,
    keepScreenAwake, setKeepScreenAwake,
    enableNotifications, setEnableNotifications,
    selectedVoiceURI, setSelectedVoiceURI,
    collapsedExerciseIds, setCollapsedExerciseIds, collapsedSupersetIds, setCollapsedSupersetIds
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
