
import React, { createContext, useMemo, useContext, ReactNode, useCallback } from 'react';
import { 
  Routine, WorkoutSession, Exercise, PerformedSet, 
  Profile, SupplementPlan, SupplementPlanItem, SupplementSuggestion, UserGoal
} from '../types';
import { exportToJson } from '../services/dataService';
import { PREDEFINED_ROUTINES } from '../constants/routines';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { UserContext } from './UserContext';
import { DataContext } from './DataContext';
import { SupplementContext } from './SupplementContext';
import { EditorContext } from './EditorContext';

export type CheckInReason = 'busy' | 'deload' | 'injury';
export type WeightUnit = 'kg' | 'lbs';

export interface AppContextType {
  // From DataContext
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
  handleCheckInResponse: (reason: CheckInReason) => void;

  // From EditorContext
  startExerciseEdit: (exercise: Exercise, onComplete?: (ex: Exercise) => void) => void;
  endExerciseEdit: (exercise?: Exercise) => void;
  editingExercise: Exercise | null;
  startExerciseDuplicate: (exercise: Exercise, onComplete?: (ex: Exercise) => void) => void;
  
  startHistoryEdit: (session: WorkoutSession) => void;
  endHistoryEdit: (session?: WorkoutSession) => void;
  editingHistorySession: WorkoutSession | null;
  
  editingTemplate: Routine | null;
  startTemplateEdit: (routine: Routine) => void;
  updateEditingTemplate: (routine: Routine) => void;
  endTemplateEdit: (routine?: Routine) => void;
  startTemplateDuplicate: (routine: Routine) => void;
  
  isAddingExercisesToTemplate: boolean;
  startAddExercisesToTemplate: (supersetId?: string) => void;
  endAddExercisesToTemplate: (ids?: string[]) => void;

  // From UserContext
  profile: Profile;
  updateProfileInfo: (info: Partial<Profile>) => void;
  currentWeight: number | undefined;
  logWeight: (weight: number) => void;
  measureUnit: 'metric' | 'imperial';
  setMeasureUnit: (unit: 'metric' | 'imperial') => void;
  logUnlock: (from: string, to: string) => void;
  updateOneRepMax: (exerciseId: string, weight: number, method: 'calculated' | 'tested', date?: number) => void;
  snoozeOneRepMaxUpdate: (exerciseId: string, until: number) => void;
  undoAutoUpdate: (exerciseId: string) => void;
  dismissAutoUpdate: (exerciseId: string) => void;
  applyCalculated1RM: (exerciseId: string, weight: number) => void;
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

  // From SupplementContext
  supplementPlan: SupplementPlan | null;
  setSupplementPlan: (plan: SupplementPlan | null) => void;
  userSupplements: SupplementPlanItem[];
  setUserSupplements: React.Dispatch<React.SetStateAction<SupplementPlanItem[]>>;
  takenSupplements: Record<string, string[]>;
  supplementLogs: Record<string, number[]>;
  toggleSupplementIntake: (date: string, itemId: string) => void;
  batchTakeSupplements: (date: string, itemIds: string[]) => void;
  snoozedSupplements: Record<string, number>;
  snoozeSupplement: (itemId: string) => void;
  batchSnoozeSupplements: (itemIds: string[]) => void;
  updateSupplementStock: (itemId: string, amountToAdd: number) => void;
  updateSupplementPlanItem: (itemId: string, updates: Partial<SupplementPlanItem>) => void;
  newSuggestions: SupplementSuggestion[];
  applyPlanSuggestion: (suggestionId: string) => void;
  applyAllPlanSuggestions: () => void;
  dismissSuggestion: (suggestionId: string) => void;
  dismissAllSuggestions: () => void;
  clearNewSuggestions: () => void;
  triggerManualPlanReview: () => void;

  // Data Management
  importData: (data: any) => void;
  exportData: () => void;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

// Helper for default reps based on goal
const getDefaultReps = (goal?: UserGoal): number => {
    switch (goal) {
        case 'strength': return 5;
        case 'endurance': return 15;
        case 'muscle': 
        default: return 10;
    }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const user = useContext(UserContext);
  const data = useContext(DataContext);
  const supplements = useContext(SupplementContext);
  const editor = useContext(EditorContext);

  // Wrapper for template duplication that uses both contexts
  const startTemplateDuplicate = useCallback((routine: Routine) => {
      const copy = { ...routine, id: `custom-${Date.now()}`, name: `${routine.name} (Copy)`, originId: routine.id };
      editor.startTemplateEdit(copy);
  }, [editor]);
  
  // Wrapper for exercise duplication
  const startExerciseDuplicate = useCallback((exercise: Exercise, onComplete?: (ex: Exercise) => void) => {
      const copy = { ...exercise, id: `custom-${Date.now()}`, name: `${exercise.name} (Copy)` };
      editor.startExerciseEdit(copy, onComplete);
  }, [editor]);

  // Wrapper for endTemplateEdit to handle saving (since EditorContext doesn't know about saving)
  const endTemplateEditWrapper = useCallback((routine?: Routine) => {
      if (routine) data.upsertRoutine(routine);
      editor.endTemplateEdit();
  }, [data, editor]);

  // Wrapper for endExerciseEdit to handle saving
  const endExerciseEditWrapper = useCallback((exercise?: Exercise) => {
      if (exercise) {
          data.setRawExercises(prev => {
              const idx = prev.findIndex(e => e.id === exercise.id);
              if (idx >= 0) {
                  const newExs = [...prev];
                  newExs[idx] = exercise;
                  return newExs;
              }
              return [...prev, exercise];
          });
          if (editor.onExerciseEditComplete) editor.onExerciseEditComplete(exercise);
      }
      editor.endExerciseEdit();
  }, [data, editor]);

  // Wrapper for endHistoryEdit to handle saving
  const endHistoryEditWrapper = useCallback((session?: WorkoutSession) => {
      if (session) data.updateHistorySession(session.id, session);
      editor.endHistoryEdit();
  }, [data, editor]);

  // Wrapper for endAddExercisesToTemplate
  const endAddExercisesToTemplateWrapper = useCallback((ids?: string[]) => {
      editor.endAddExercisesToTemplate();
      if (ids && editor.editingTemplate) {
          const defaultReps = getDefaultReps(user.profile.mainGoal);

          const newExercises: any[] = ids.map(id => {
              const exerciseDef = data.rawExercises.find(e => e.id === id);
              const isTimed = exerciseDef?.isTimed;
              const defaults = user.defaultRestTimes;

              return {
                id: `we-${Date.now()}-${Math.random()}`,
                exerciseId: id,
                sets: [{ 
                    id: `set-${Date.now()}-${Math.random()}`, 
                    reps: isTimed ? 1 : defaultReps, 
                    weight: 0, 
                    type: isTimed ? 'timed' : 'normal',
                    time: isTimed ? 60 : undefined,
                    isComplete: false 
                }],
                restTime: defaults,
                supersetId: editor.addingTargetSupersetId
              };
          });
          
          let updatedExercises = [...editor.editingTemplate.exercises];
          if (editor.addingTargetSupersetId) {
              let lastIndex = -1;
              for (let i = updatedExercises.length - 1; i >= 0; i--) {
                  if (updatedExercises[i].supersetId === editor.addingTargetSupersetId) {
                      lastIndex = i;
                      break;
                  }
              }
              if (lastIndex !== -1) updatedExercises.splice(lastIndex + 1, 0, ...newExercises);
              else updatedExercises.push(...newExercises);
          } else {
              updatedExercises.push(...newExercises);
          }
          editor.updateEditingTemplate({ ...editor.editingTemplate, exercises: updatedExercises });
      }
  }, [data, editor, user.defaultRestTimes, user.profile.mainGoal]);

  // Compatibility wrapper for triggerManualPlanReview (needs history)
  const triggerManualPlanReviewWrapper = useCallback(() => {
      supplements.triggerManualPlanReview(data.history);
  }, [supplements, data.history]);
  
  const importData = useCallback((importPayload: any) => {
      if (!importPayload) return;
      data.importDataData(importPayload);
      user.importUserData(importPayload);
      supplements.importSupplementData(importPayload);
  }, [data, user, supplements]);

  const exportData = useCallback(() => {
      // Filter Routines: Only Custom or Modified
      const filteredRoutines = data.routines.filter(r => {
          if (!r.id.startsWith('rt-')) return true; // Custom
          const predefined = PREDEFINED_ROUTINES.find(p => p.id === r.id);
          if (!predefined) return true; 
          return JSON.stringify(r) !== JSON.stringify(predefined);
      });

      // Filter Exercises: Only Custom or Modified
      const filteredExercises = data.rawExercises.filter(e => {
          if (!e.id.startsWith('ex-')) return true; // Custom
          const predefined = PREDEFINED_EXERCISES.find(p => p.id === e.id);
          if (!predefined) return true;
          return JSON.stringify(e) !== JSON.stringify(predefined);
      });

      const exportPayload = {
          history: data.history,
          routines: filteredRoutines,
          exercises: filteredExercises,
          profile: user.profile,
          supplementPlan: supplements.supplementPlan,
          userSupplements: supplements.userSupplements,
          takenSupplements: supplements.takenSupplements,
          supplementLogs: supplements.supplementLogs,
          snoozedSupplements: supplements.snoozedSupplements,
          settings: {
              measureUnit: user.measureUnit,
              defaultRestTimes: user.defaultRestTimes,
              useLocalizedExerciseNames: user.useLocalizedExerciseNames,
              keepScreenAwake: user.keepScreenAwake,
              enableNotifications: user.enableNotifications,
              selectedVoiceURI: user.selectedVoiceURI
          }
      };
      const dateStr = new Date().toISOString().split('T')[0];
      exportToJson(exportPayload, `fortachon-backup-${dateStr}`);
  }, [data, user, supplements]);
  
  // Helper for checkin string casting
  const handleCheckInResponseWrapper = useCallback((reason: CheckInReason) => {
      data.handleCheckInResponse(reason);
  }, [data]);

  const value = useMemo(() => ({
    ...user,
    ...data,
    ...supplements,
    ...editor,
    // Overrides with wrappers that combine contexts
    startTemplateDuplicate,
    startExerciseDuplicate,
    endTemplateEdit: endTemplateEditWrapper,
    endExerciseEdit: endExerciseEditWrapper,
    endHistoryEdit: endHistoryEditWrapper,
    endAddExercisesToTemplate: endAddExercisesToTemplateWrapper,
    triggerManualPlanReview: triggerManualPlanReviewWrapper,
    handleCheckInResponse: handleCheckInResponseWrapper,
    importData,
    exportData
  }), [user, data, supplements, editor, startTemplateDuplicate, startExerciseDuplicate, endTemplateEditWrapper, endExerciseEditWrapper, endHistoryEditWrapper, endAddExercisesToTemplateWrapper, triggerManualPlanReviewWrapper, handleCheckInResponseWrapper, importData, exportData]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};