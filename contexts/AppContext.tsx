
import React, { createContext, useState, useEffect, useCallback, ReactNode, useMemo, useContext } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { 
  Routine, WorkoutSession, Exercise, WorkoutExercise, PerformedSet, 
  Profile, SupplementPlan, SupplementPlanItem, SupplementSuggestion, 
  AutoUpdateEntry
} from '../types';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { PREDEFINED_ROUTINES } from '../constants/routines';
import { reviewSupplementPlan } from '../services/supplementService';
import { useI18n } from '../hooks/useI18n';
import { exportToJson } from '../services/dataService';

// Define types exported from Context
export type CheckInReason = 'busy' | 'deload' | 'injury';
export type WeightUnit = 'kg' | 'lbs';

export interface AppContextType {
  // Lists (Data Store)
  routines: Routine[];
  upsertRoutine: (routine: Routine) => void;
  upsertRoutines: (routines: Routine[]) => void;
  deleteRoutine: (id: string) => void;
  
  exercises: Exercise[];
  rawExercises: Exercise[];
  setRawExercises: React.Dispatch<React.SetStateAction<Exercise[]>>;
  getExerciseById: (id: string) => Exercise | undefined;
  startExerciseEdit: (exercise: Exercise, onComplete?: (ex: Exercise) => void) => void;
  endExerciseEdit: (exercise?: Exercise) => void;
  editingExercise: Exercise | null;
  startExerciseDuplicate: (exercise: Exercise, onComplete?: (ex: Exercise) => void) => void;

  history: WorkoutSession[];
  saveCompletedWorkout: (session: WorkoutSession) => void; 
  deleteHistorySession: (id: string) => void;
  updateHistorySession: (id: string, updates: Partial<WorkoutSession>) => void;
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
  isAddingExercisesToTemplate: boolean;
  startAddExercisesToTemplate: (supersetId?: string) => void;
  endAddExercisesToTemplate: (ids?: string[]) => void;
  
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
  updateOneRepMax: (exerciseId: string, weight: number, method: 'calculated' | 'tested', date?: number) => void;
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
  supplementLogs: Record<string, number[]>;
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

  // Data Management
  importData: (data: any) => void;
  exportData: () => void;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Persistence
  const [history, setHistory] = useLocalStorage<WorkoutSession[]>('history', []);
  const [routines, setRoutines] = useLocalStorage<Routine[]>('routines', PREDEFINED_ROUTINES);
  const [rawExercises, setRawExercises] = useLocalStorage<Exercise[]>('exercises', PREDEFINED_EXERCISES);
  const [profile, setProfile] = useLocalStorage<Profile>('profile', { weightHistory: [] });
  const [supplementPlan, setSupplementPlan] = useLocalStorage<SupplementPlan | null>('supplementPlan', null);
  const [userSupplements, setUserSupplements] = useLocalStorage<SupplementPlanItem[]>('userSupplements', []);
  const [takenSupplements, setTakenSupplements] = useLocalStorage<Record<string, string[]>>('takenSupplements', {});
  const [supplementLogs, setSupplementLogs] = useLocalStorage<Record<string, number[]>>('supplementLogs', {});
  const [snoozedSupplements, setSnoozedSupplements] = useLocalStorage<Record<string, number>>('snoozedSupplements', {});
  
  // Settings
  const [measureUnit, setMeasureUnit] = useLocalStorage<'metric' | 'imperial'>('measureUnit', 'metric');
  const [defaultRestTimes, setDefaultRestTimes] = useLocalStorage('defaultRestTimes', { normal: 90, warmup: 60, drop: 30, timed: 60, effort: 180, failure: 300 });
  const [useLocalizedExerciseNames, setUseLocalizedExerciseNames] = useLocalStorage('useLocalizedExerciseNames', false);
  const [keepScreenAwake, setKeepScreenAwake] = useLocalStorage('keepScreenAwake', true);
  const [enableNotifications, setEnableNotifications] = useLocalStorage('enableNotifications', false);
  const [selectedVoiceURI, setSelectedVoiceURI] = useLocalStorage<string | null>('selectedVoiceURI', null);
  
  const { t } = useI18n();

  // Transient UI State (Editors)
  const [editingTemplate, setEditingTemplate] = useState<Routine | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editingHistorySession, setEditingHistorySession] = useState<WorkoutSession | null>(null);
  const [onExerciseEditComplete, setOnExerciseEditComplete] = useState<((ex: Exercise) => void) | undefined>();
  
  const [isAddingExercisesToTemplate, setIsAddingExercisesToTemplate] = useState(false);
  const [addingTargetSupersetId, setAddingTargetSupersetId] = useState<string | undefined>(undefined);
  
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

  const exercises = useMemo(() => {
      return rawExercises;
  }, [rawExercises]);

  const getExerciseById = useCallback((id: string) => {
      return exercises.find(e => e.id === id);
  }, [exercises]);

  const currentWeight = useMemo(() => {
      const sorted = [...profile.weightHistory].sort((a, b) => b.date - a.date);
      return sorted.length > 0 ? sorted[0].weight : undefined;
  }, [profile.weightHistory]);

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

  const startTemplateEdit = useCallback((routine: Routine) => {
      setEditingTemplate(routine);
  }, []);

  const updateEditingTemplate = useCallback((routine: Routine) => {
      setEditingTemplate(routine);
  }, []);

  const endTemplateEdit = useCallback((routine?: Routine) => {
      if (routine) {
          upsertRoutine(routine);
      }
      setEditingTemplate(null);
  }, [upsertRoutine]);

  const startTemplateDuplicate = useCallback((routine: Routine) => {
      const copy = { ...routine, id: `custom-${Date.now()}`, name: `${routine.name} (Copy)`, originId: routine.id };
      startTemplateEdit(copy);
  }, [startTemplateEdit]);

  const startExerciseEdit = useCallback((exercise: Exercise, onComplete?: (ex: Exercise) => void) => {
      setEditingExercise(exercise);
      setOnExerciseEditComplete(() => onComplete);
  }, []);

  const endExerciseEdit = useCallback((exercise?: Exercise) => {
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
  }, [setRawExercises, onExerciseEditComplete]);

  const startExerciseDuplicate = useCallback((exercise: Exercise, onComplete?: (ex: Exercise) => void) => {
      const copy = { ...exercise, id: `custom-${Date.now()}`, name: `${exercise.name} (Copy)` };
      startExerciseEdit(copy, onComplete);
  }, [startExerciseEdit]);

  const startAddExercisesToTemplate = useCallback((supersetId?: string) => {
      setAddingTargetSupersetId(supersetId);
      setIsAddingExercisesToTemplate(true);
  }, []);

  const endAddExercisesToTemplate = useCallback((ids?: string[]) => {
      setIsAddingExercisesToTemplate(false);
      if (ids && editingTemplate) {
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
  }, [editingTemplate, defaultRestTimes, addingTargetSupersetId, updateEditingTemplate, rawExercises]);

  const startHistoryEdit = useCallback((session: WorkoutSession) => {
      setEditingHistorySession(session);
  }, []);

  const endHistoryEdit = useCallback((session?: WorkoutSession) => {
      if (session) {
          setHistory(prev => prev.map(s => s.id === session.id ? session : s));
      }
      setEditingHistorySession(null);
  }, [setHistory]);

  const updateProfileInfo = useCallback((info: Partial<Profile>) => {
      setProfile(prev => ({ ...prev, ...info }));
  }, [setProfile]);

  const logWeight = useCallback((weight: number) => {
      setProfile(prev => ({
          ...prev,
          weightHistory: [...prev.weightHistory, { date: Date.now(), weight }]
      }));
  }, [setProfile]);

  const updateOneRepMax = useCallback((exerciseId: string, weight: number, method: 'calculated' | 'tested', date?: number) => {
      setProfile(prev => ({
          ...prev,
          oneRepMaxes: {
              ...prev.oneRepMaxes,
              [exerciseId]: { exerciseId, weight, date: date || Date.now(), method }
          },
          autoUpdated1RMs: (() => {
              const newAuto = { ...prev.autoUpdated1RMs };
              delete newAuto[exerciseId];
              return newAuto;
          })()
      }));
  }, [setProfile]);

  const snoozeOneRepMaxUpdate = useCallback((exerciseId: string, until: number) => {
      setProfile(prev => ({
          ...prev,
          oneRepMaxSnoozes: {
              ...prev.oneRepMaxSnoozes,
              [exerciseId]: Date.now() + until
          }
      }));
  }, [setProfile]);

  const undoAutoUpdate = useCallback((exerciseId: string) => {
      const entry = profile.autoUpdated1RMs?.[exerciseId];
      if (entry) {
          updateOneRepMax(exerciseId, entry.oldWeight, 'calculated');
      }
  }, [profile.autoUpdated1RMs, updateOneRepMax]);

  const dismissAutoUpdate = useCallback((exerciseId: string) => {
      setProfile(prev => {
          const newAuto = { ...prev.autoUpdated1RMs };
          delete newAuto[exerciseId];
          return { ...prev, autoUpdated1RMs: newAuto };
      });
  }, [setProfile]);

  const applyCalculated1RM = useCallback((exerciseId: string, weight: number) => {
      updateOneRepMax(exerciseId, weight, 'calculated');
  }, [updateOneRepMax]);

  const logUnlock = useCallback((from: string, to: string) => {
      setProfile(prev => ({
          ...prev,
          unlocks: [...(prev.unlocks || []), { date: Date.now(), fromExercise: from, toExercise: to }]
      }));
  }, [setProfile]);

  const toggleSupplementIntake = useCallback((date: string, itemId: string) => {
      const dayList = takenSupplements[date] || [];
      const wasTaken = dayList.includes(itemId);
      const newTakenState = !wasTaken;
      
      setTakenSupplements(prev => {
          const currentDay = prev[date] || [];
          if (currentDay.includes(itemId)) {
              return { ...prev, [date]: currentDay.filter(id => id !== itemId) };
          }
          return { ...prev, [date]: [...currentDay, itemId] };
      });
      
      if (newTakenState) {
          setSupplementLogs(prev => {
              const currentLogs = prev[itemId] || [];
              return { ...prev, [itemId]: [...currentLogs, Date.now()] };
          });
      }

      const stockChange = newTakenState ? -1 : 1;

      const updateStockInList = (list: SupplementPlanItem[]) => {
          return list.map(item => {
              if (item.id === itemId && item.stock !== undefined) {
                  const currentStock = isNaN(item.stock) ? 0 : item.stock;
                  return { ...item, stock: Math.max(0, currentStock + stockChange) };
              }
              return item;
          });
      };
      
      setUserSupplements(prev => updateStockInList(prev));
      
      setSupplementPlan(prevPlan => {
          if (!prevPlan) return null;
          return {
              ...prevPlan,
              plan: updateStockInList(prevPlan.plan)
          };
      });

  }, [takenSupplements, setTakenSupplements, setUserSupplements, setSupplementPlan, setSupplementLogs]);
  
  const updateSupplementStock = useCallback((itemId: string, amountToAdd: number) => {
      setUserSupplements(prev => {
         if (prev.some(s => s.id === itemId)) {
             return prev.map(s => s.id === itemId ? { ...s, stock: Math.max(0, (s.stock || 0) + amountToAdd) } : s);
         }
         return prev;
      });
      
      setSupplementPlan(prevPlan => {
          if (prevPlan && prevPlan.plan.some(s => s.id === itemId)) {
               return {
                  ...prevPlan,
                  plan: prevPlan.plan.map(s => s.id === itemId ? { ...s, stock: Math.max(0, (s.stock || 0) + amountToAdd) } : s)
              };
          }
          return prevPlan;
      });
  }, [setUserSupplements, setSupplementPlan]);

  const updateSupplementPlanItem = useCallback((itemId: string, updates: Partial<SupplementPlanItem>) => {
      setUserSupplements(prev => {
         if (prev.some(s => s.id === itemId)) {
             return prev.map(s => s.id === itemId ? { ...s, ...updates } : s);
         }
         return prev;
      });
      
      setSupplementPlan(prevPlan => {
          if (prevPlan && prevPlan.plan.some(s => s.id === itemId)) {
              return {
                  ...prevPlan,
                  plan: prevPlan.plan.map(s => s.id === itemId ? { ...s, ...updates } : s)
              };
          }
          return prevPlan;
      });
  }, [setUserSupplements, setSupplementPlan]);

  const snoozeSupplement = useCallback((itemId: string) => {
      setSnoozedSupplements(prev => ({ ...prev, [itemId]: Date.now() + 6 * 60 * 60 * 1000 })); // 6 hours
  }, [setSnoozedSupplements]);

  // Check-In Logic
  const checkInState = useMemo(() => {
      const now = Date.now();
      const lastSession = history.length > 0 ? history[0] : null;
      if (!lastSession) return { active: false };
      const daysSince = (now - lastSession.startTime) / (1000 * 60 * 60 * 24);
      return { active: daysSince > 10 };
  }, [history]);

  const handleCheckInResponse = useCallback((reason: CheckInReason) => {
      console.log('Check in reason:', reason);
  }, []);

  // Supplement Suggestions
  const dismissSuggestion = useCallback((suggestionId: string) => {
      const suggestion = newSuggestions.find(s => s.id === suggestionId);
      if (suggestion) {
          setDismissedSuggestions(prev => [...prev, suggestion.identifier]);
          setNewSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      }
  }, [newSuggestions, setDismissedSuggestions]);

  const applyPlanSuggestion = useCallback((suggestionId: string) => {
      const suggestion = newSuggestions.find(s => s.id === suggestionId);
      if (suggestion) {
          const action = suggestion.action;
          if (action.type === 'ADD') {
              if (action.item) {
                  setUserSupplements(prev => [...prev, { ...action.item, isCustom: true } as SupplementPlanItem]);
              }
          } else if (action.type === 'REMOVE') {
              const id = action.itemId;
              updateSupplementPlanItem(id, { restDayOnly: undefined, trainingDayOnly: undefined });
              setSupplementPlan(prev => prev ? ({ ...prev, plan: prev.plan.filter(i => i.id !== id) }) : null);
              setUserSupplements(prev => prev.filter(i => i.id !== id));
          } else if (action.type === 'UPDATE') {
              updateSupplementPlanItem(action.itemId, action.updates);
          }
          dismissSuggestion(suggestionId);
      }
  }, [newSuggestions, setUserSupplements, setSupplementPlan, updateSupplementPlanItem, dismissSuggestion]);

  const applyAllPlanSuggestions = useCallback(() => {
      newSuggestions.forEach(s => applyPlanSuggestion(s.id));
  }, [newSuggestions, applyPlanSuggestion]);

  const dismissAllSuggestions = useCallback(() => {
      setDismissedSuggestions(prev => [...prev, ...newSuggestions.map(s => s.identifier)]);
      setNewSuggestions([]);
  }, [newSuggestions, setDismissedSuggestions]);

  const clearNewSuggestions = useCallback(() => {
      setNewSuggestions([]);
  }, []);

  const triggerManualPlanReview = useCallback(() => {
      if (supplementPlan) {
        const suggestions = reviewSupplementPlan(supplementPlan, history, t, null, takenSupplements, supplementLogs);
        const filtered = suggestions.filter(s => !dismissedSuggestions.includes(s.identifier));
        setNewSuggestions(filtered);
      }
  }, [supplementPlan, history, t, dismissedSuggestions, takenSupplements, supplementLogs]);

  const importData = useCallback((data: any) => {
      if (!data) return;
      
      // Data Store
      if (Array.isArray(data.history)) setHistory(data.history);
      
      // Routines: Merge Imported Custom with Current Predefined
      if (Array.isArray(data.routines)) {
          setRoutines(prev => {
              const customImported = data.routines.filter((r: Routine) => !r.id.startsWith('rt-'));
              // Also include modified stock routines if any were exported (depends on export logic)
              // But since we filter out unmodified stock routines on export, we can just merge.
              // Safe strategy: Keep PREDEFINED, overwrite with imported if ID matches, append others.
              
              const merged = [...PREDEFINED_ROUTINES];
              const importedRoutines = data.routines as Routine[];
              
              importedRoutines.forEach(ir => {
                  const existingIdx = merged.findIndex(m => m.id === ir.id);
                  if (existingIdx >= 0) {
                      merged[existingIdx] = ir; // Replace (e.g. modified stock)
                  } else {
                      merged.push(ir); // Add custom
                  }
              });
              return merged;
          });
      }

      // Exercises: Merge Imported Custom with Current Predefined
      if (Array.isArray(data.exercises)) {
          setRawExercises(prev => {
              const merged = [...PREDEFINED_EXERCISES];
              const importedExercises = data.exercises as Exercise[];
              
              importedExercises.forEach(ie => {
                   const existingIdx = merged.findIndex(m => m.id === ie.id);
                   if (existingIdx >= 0) {
                       merged[existingIdx] = ie;
                   } else {
                       merged.push(ie);
                   }
              });
              return merged;
          });
      }
      
      // Profile
      if (data.profile) setProfile(prev => ({ ...prev, ...data.profile }));
      
      // Supplements
      if (data.supplementPlan) setSupplementPlan(data.supplementPlan);
      if (Array.isArray(data.userSupplements)) setUserSupplements(data.userSupplements);
      if (data.takenSupplements) setTakenSupplements(data.takenSupplements);
      if (data.supplementLogs) setSupplementLogs(data.supplementLogs);
      if (data.snoozedSupplements) setSnoozedSupplements(data.snoozedSupplements);
      
      // Settings
      if (data.settings) {
          if (data.settings.measureUnit) setMeasureUnit(data.settings.measureUnit);
          if (data.settings.defaultRestTimes) setDefaultRestTimes(data.settings.defaultRestTimes);
          if (typeof data.settings.useLocalizedExerciseNames === 'boolean') setUseLocalizedExerciseNames(data.settings.useLocalizedExerciseNames);
          if (typeof data.settings.keepScreenAwake === 'boolean') setKeepScreenAwake(data.settings.keepScreenAwake);
          if (typeof data.settings.enableNotifications === 'boolean') setEnableNotifications(data.settings.enableNotifications);
          if (data.settings.selectedVoiceURI !== undefined) setSelectedVoiceURI(data.settings.selectedVoiceURI);
      }
  }, [setHistory, setRoutines, setRawExercises, setProfile, setSupplementPlan, setUserSupplements, setTakenSupplements, setSupplementLogs, setSnoozedSupplements, setMeasureUnit, setDefaultRestTimes, setUseLocalizedExerciseNames, setKeepScreenAwake, setEnableNotifications, setSelectedVoiceURI]);

  const exportData = useCallback(() => {
      // Filter Routines: Only Custom or Modified
      const filteredRoutines = routines.filter(r => {
          if (!r.id.startsWith('rt-')) return true; // Custom
          // Check if modified from default
          const predefined = PREDEFINED_ROUTINES.find(p => p.id === r.id);
          if (!predefined) return true; // Should exist, but if not, keep it
          return JSON.stringify(r) !== JSON.stringify(predefined);
      });

      // Filter Exercises: Only Custom or Modified
      const filteredExercises = rawExercises.filter(e => {
          if (!e.id.startsWith('ex-')) return true; // Custom
          const predefined = PREDEFINED_EXERCISES.find(p => p.id === e.id);
          if (!predefined) return true;
          return JSON.stringify(e) !== JSON.stringify(predefined);
      });

      const data = {
          history,
          routines: filteredRoutines,
          exercises: filteredExercises,
          profile,
          supplementPlan,
          userSupplements,
          takenSupplements,
          supplementLogs,
          snoozedSupplements,
          settings: {
              measureUnit,
              defaultRestTimes,
              useLocalizedExerciseNames,
              keepScreenAwake,
              enableNotifications,
              selectedVoiceURI
          }
      };
      const dateStr = new Date().toISOString().split('T')[0];
      exportToJson(data, `fortachon-backup-${dateStr}`);
  }, [history, routines, rawExercises, profile, supplementPlan, userSupplements, takenSupplements, supplementLogs, snoozedSupplements, measureUnit, defaultRestTimes, useLocalizedExerciseNames, keepScreenAwake, enableNotifications, selectedVoiceURI]);
  
  const value = useMemo(() => ({
    routines, upsertRoutine, upsertRoutines, deleteRoutine,
    exercises, rawExercises, setRawExercises, getExerciseById, startExerciseEdit, endExerciseEdit, editingExercise, startExerciseDuplicate,
    history, saveCompletedWorkout, deleteHistorySession, updateHistorySession, startHistoryEdit, endHistoryEdit, editingHistorySession,
    editingTemplate, startTemplateEdit, updateEditingTemplate, endTemplateEdit, startTemplateDuplicate,
    isAddingExercisesToTemplate, startAddExercisesToTemplate, endAddExercisesToTemplate,
    profile, updateProfileInfo, currentWeight, logWeight, measureUnit, setMeasureUnit,
    allTimeBestSets, checkInState, handleCheckInResponse, logUnlock,
    updateOneRepMax, snoozeOneRepMaxUpdate, undoAutoUpdate, dismissAutoUpdate, applyCalculated1RM,
    supplementPlan, setSupplementPlan, userSupplements, setUserSupplements, takenSupplements, supplementLogs, toggleSupplementIntake, snoozedSupplements, snoozeSupplement, updateSupplementStock, updateSupplementPlanItem,
    newSuggestions, applyPlanSuggestion, applyAllPlanSuggestions, dismissSuggestion, dismissAllSuggestions, clearNewSuggestions, triggerManualPlanReview,
    defaultRestTimes, setDefaultRestTimes,
    useLocalizedExerciseNames, setUseLocalizedExerciseNames,
    keepScreenAwake, setKeepScreenAwake,
    enableNotifications, setEnableNotifications,
    selectedVoiceURI, setSelectedVoiceURI,
    importData, exportData
  }), [
    routines, upsertRoutine, upsertRoutines, deleteRoutine,
    exercises, rawExercises, setRawExercises, getExerciseById, startExerciseEdit, endExerciseEdit, editingExercise, startExerciseDuplicate,
    history, saveCompletedWorkout, deleteHistorySession, updateHistorySession, startHistoryEdit, endHistoryEdit, editingHistorySession,
    editingTemplate, startTemplateEdit, updateEditingTemplate, endTemplateEdit, startTemplateDuplicate,
    isAddingExercisesToTemplate, startAddExercisesToTemplate, endAddExercisesToTemplate,
    profile, updateProfileInfo, currentWeight, logWeight, measureUnit, setMeasureUnit,
    allTimeBestSets, checkInState, handleCheckInResponse, logUnlock,
    updateOneRepMax, snoozeOneRepMaxUpdate, undoAutoUpdate, dismissAutoUpdate, applyCalculated1RM,
    supplementPlan, setSupplementPlan, userSupplements, setUserSupplements, takenSupplements, supplementLogs, toggleSupplementIntake, snoozedSupplements, snoozeSupplement, updateSupplementStock, updateSupplementPlanItem,
    newSuggestions, applyPlanSuggestion, applyAllPlanSuggestions, dismissSuggestion, dismissAllSuggestions, clearNewSuggestions, triggerManualPlanReview,
    defaultRestTimes, setDefaultRestTimes,
    useLocalizedExerciseNames, setUseLocalizedExerciseNames,
    keepScreenAwake, setKeepScreenAwake,
    enableNotifications, setEnableNotifications,
    selectedVoiceURI, setSelectedVoiceURI,
    importData, exportData
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
