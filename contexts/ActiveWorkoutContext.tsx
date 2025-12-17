
import React, { createContext, useContext, ReactNode, useCallback, useMemo, useReducer, useEffect, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Routine, WorkoutSession, WorkoutExercise, UserGoal, SetType } from '../types';
import { TimerContext } from './TimerContext';
import { AppContext } from './AppContext';
import { SupplementContext } from './SupplementContext';
import { getSmartStartingWeight, detectPreferredIncrement } from '../services/analyticsService';
import { getDateString } from '../utils/timeUtils';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { detectWorkoutIntensity, createSmartWorkoutExercise, calculateWarmupWeights, getExerciseHistory } from '../utils/workoutUtils';

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

// Reducer Actions
type WorkoutAction = 
  | { type: 'SET_WORKOUT'; payload: WorkoutSession | null }
  | { type: 'UPDATE_WORKOUT'; payload: WorkoutSession }
  | { type: 'MINIMIZE'; payload: boolean }
  | { type: 'SET_ADDING_EXERCISES'; payload: boolean }
  | { type: 'SET_TARGET_SUPERSET'; payload: string | undefined };

interface WorkoutState {
    activeWorkout: WorkoutSession | null;
    isWorkoutMinimized: boolean;
    isAddingExercisesToWorkout: boolean;
    addingTargetSupersetId: string | undefined;
}

const workoutReducer = (state: WorkoutState, action: WorkoutAction): WorkoutState => {
    switch (action.type) {
        case 'SET_WORKOUT':
            return { ...state, activeWorkout: action.payload };
        case 'UPDATE_WORKOUT':
             // Automatically update lastUpdated timestamp
            return { ...state, activeWorkout: { ...action.payload, lastUpdated: Date.now() } };
        case 'MINIMIZE':
            return { ...state, isWorkoutMinimized: action.payload };
        case 'SET_ADDING_EXERCISES':
            return { ...state, isAddingExercisesToWorkout: action.payload };
        case 'SET_TARGET_SUPERSET':
            return { ...state, addingTargetSupersetId: action.payload };
        default:
            return state;
    }
};

// Helper for default reps
const getDefaultReps = (goal?: UserGoal): number => {
    switch (goal) {
        case 'strength': return 5;
        case 'endurance': return 15;
        case 'muscle': 
        default: return 10;
    }
};

export const ActiveWorkoutContext = createContext<ActiveWorkoutContextType>({} as ActiveWorkoutContextType);

export const ActiveWorkoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // We still use useLocalStorage to persist the state, but we wrap updates via reducer
  const [persistedWorkout, setPersistedWorkout] = useLocalStorage<WorkoutSession | null>('activeWorkout', null);
  
  const [state, dispatch] = useReducer(workoutReducer, {
      activeWorkout: persistedWorkout,
      isWorkoutMinimized: false,
      isAddingExercisesToWorkout: false,
      addingTargetSupersetId: undefined
  });
  
  // Sync state back to local storage when activeWorkout changes
  useEffect(() => {
      setPersistedWorkout(state.activeWorkout);
  }, [state.activeWorkout, setPersistedWorkout]);
  
  const [collapsedExerciseIds, setCollapsedExerciseIds] = useState<string[]>([]);
  const [collapsedSupersetIds, setCollapsedSupersetIds] = useState<string[]>([]);

  const { stopAllTimers } = useContext(TimerContext);
  const { saveCompletedWorkout, rawExercises, defaultRestTimes, profile, history } = useContext(AppContext);
  const { setDayOverride } = useContext(SupplementContext);

  const startWorkout = useCallback((routine: Routine) => {
      const session: WorkoutSession = {
          id: `session-${Date.now()}`,
          routineId: routine.id,
          routineName: routine.name,
          startTime: Date.now(),
          lastUpdated: Date.now(),
          endTime: 0,
          exercises: routine.exercises.map(ex => {
              // Calculate smart weight for this exercise if it's a template or generated routine
              // We only apply this if the set weight is 0 (which is true for templates)
              // If re-doing a history session (isTemplate=false), we preserve the original weights
              
              // FIX: Treat generated smart routines as templates for weight calculation purposes
              const isGenerated = routine.id.startsWith('smart-') || routine.id.startsWith('gap-') || routine.id.startsWith('gen-');
              const shouldPrefill = routine.isTemplate || isGenerated;
              
              let smartWeight = 0;
              let calculatedWarmups: number[] = [];

              if (shouldPrefill) {
                 smartWeight = getSmartStartingWeight(ex.exerciseId, history, profile, rawExercises, profile.mainGoal);
                 // If we have warmup sets, calculate weights for them relative to smartWeight
                 const warmupSetCount = ex.sets.filter(s => s.type === 'warmup').length;
                 if (warmupSetCount > 0 && smartWeight > 0) {
                     // Detect user's preferred plate increment from history to avoid suggesting unavailable weights (e.g. 22.5kg)
                     const exHistory = getExerciseHistory(history, ex.exerciseId);
                     const increment = detectPreferredIncrement(exHistory);
                     calculatedWarmups = calculateWarmupWeights(smartWeight, warmupSetCount, increment);
                 }
              }

              // Use a counter to assign warmup weights in order
              let warmupIndex = 0;

              return {
                  ...ex,
                  id: `we-${Date.now()}-${Math.random()}`,
                  sets: ex.sets.map(s => {
                      let setWeight = s.weight;
                      
                      if (shouldPrefill) {
                          if (s.type === 'normal' && s.weight === 0) {
                              setWeight = smartWeight;
                          } else if (s.type === 'warmup') {
                              if (calculatedWarmups[warmupIndex] !== undefined) {
                                  setWeight = calculatedWarmups[warmupIndex];
                                  warmupIndex++;
                              }
                          }
                      }

                      // Convert 'failure' sets back to 'normal' when starting a new session.
                      // Failure is a result/transitional state, not a permanent plan.
                      let setType: SetType = s.type;
                      let setReps = s.reps;

                      if (setType === 'failure') {
                          setType = 'normal';
                          setReps = getDefaultReps(profile.mainGoal); // Reset reps for failure sets
                      }

                      return {
                        ...s,
                        id: `set-${Date.now()}-${Math.random()}`,
                        isComplete: false,
                        weight: setWeight,
                        reps: setReps,
                        type: setType
                      };
                  })
              };
          }),
          supersets: routine.supersets
      };
      dispatch({ type: 'SET_WORKOUT', payload: session });
      dispatch({ type: 'MINIMIZE', payload: false });
  }, [history, profile, rawExercises]);

  // Legacy support wrapper for direct updates
  const updateActiveWorkout = useCallback((workoutOrFn: WorkoutSession | ((prev: WorkoutSession | null) => WorkoutSession | null)) => {
      // We need access to current state to resolve function updates
      // Since we are inside the provider, we can access `state.activeWorkout` directly from closure, 
      // but to be safe with stale closures in callbacks, we should use a functional update if dispatch supported it.
      // However, standard useReducer dispatch doesn't support functional updates for payload.
      // We will assume the caller passes the latest object or we resolve it.
      
      let newWorkout: WorkoutSession | null = null;
      if (typeof workoutOrFn === 'function') {
           newWorkout = workoutOrFn(state.activeWorkout);
      } else {
           newWorkout = workoutOrFn;
      }

      if (newWorkout) {
          dispatch({ type: 'UPDATE_WORKOUT', payload: newWorkout });
      } else {
          dispatch({ type: 'SET_WORKOUT', payload: null });
      }
  }, [state.activeWorkout]);

  const endWorkout = useCallback((endTime?: number) => {
      if (state.activeWorkout) {
          if (state.activeWorkout.exercises.length > 0) {
              const finishedWorkout = { ...state.activeWorkout, endTime: endTime || Date.now() };
              saveCompletedWorkout(finishedWorkout);
              
              // --- Auto-Detect Day Type for Supplements ---
              const today = getDateString(new Date(finishedWorkout.startTime));
              
              // Prepare full list of exercises (predefined + custom)
              // NOTE: rawExercises usually contains custom ones, PREDEFINED is static fallback
              const allExercises = [...rawExercises, ...PREDEFINED_EXERCISES]; 
              
              const dayMode = detectWorkoutIntensity(finishedWorkout, allExercises);
              setDayOverride(today, dayMode);
          }
          
          dispatch({ type: 'SET_WORKOUT', payload: null });
          dispatch({ type: 'MINIMIZE', payload: false });
          stopAllTimers();
          setCollapsedExerciseIds([]);
          setCollapsedSupersetIds([]);
      }
  }, [state.activeWorkout, saveCompletedWorkout, stopAllTimers, rawExercises, setDayOverride]);

  const discardActiveWorkout = useCallback(() => {
      dispatch({ type: 'SET_WORKOUT', payload: null });
      dispatch({ type: 'MINIMIZE', payload: false });
      stopAllTimers();
      setCollapsedExerciseIds([]);
      setCollapsedSupersetIds([]);
  }, [stopAllTimers]);

  const minimizeWorkout = useCallback(() => dispatch({ type: 'MINIMIZE', payload: true }), []);
  const maximizeWorkout = useCallback(() => dispatch({ type: 'MINIMIZE', payload: false }), []);

  const startAddExercisesToWorkout = useCallback((supersetId?: string) => {
      dispatch({ type: 'SET_TARGET_SUPERSET', payload: supersetId });
      dispatch({ type: 'SET_ADDING_EXERCISES', payload: true });
  }, []);

  const endAddExercisesToWorkout = useCallback((ids?: string[]) => {
      // Capture targetSupersetId locally to be safe, though state is consistent in this scope
      const targetSupersetId = state.addingTargetSupersetId;
      
      dispatch({ type: 'SET_ADDING_EXERCISES', payload: false });
      
      if (ids && state.activeWorkout) {
          const defaultReps = getDefaultReps(profile.mainGoal);

          const newExercises: WorkoutExercise[] = ids.map(id => {
              const exerciseDef = rawExercises.find(e => e.id === id);
              // Use smart weight logic for manual adds too
              const smartWeight = getSmartStartingWeight(id, history, profile, rawExercises, profile.mainGoal);

              // Use new smart creator
              return createSmartWorkoutExercise(
                  exerciseDef,
                  { 
                      sets: 1, 
                      reps: defaultReps, 
                      weight: smartWeight, 
                      restTime: defaultRestTimes 
                  },
                  targetSupersetId
              );
          });
          
          let updatedExercises = [...state.activeWorkout.exercises];
          
          if (targetSupersetId) {
              let lastIndex = -1;
              for (let i = updatedExercises.length - 1; i >= 0; i--) {
                  if (updatedExercises[i].supersetId === targetSupersetId) {
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

          dispatch({ 
              type: 'UPDATE_WORKOUT', 
              payload: { ...state.activeWorkout, exercises: updatedExercises } 
          });
      }
      dispatch({ type: 'SET_TARGET_SUPERSET', payload: undefined });
  }, [state.activeWorkout, state.addingTargetSupersetId, defaultRestTimes, rawExercises, profile.mainGoal, history, profile]);


  const value = useMemo(() => ({
    activeWorkout: state.activeWorkout,
    startWorkout, updateActiveWorkout, endWorkout, discardActiveWorkout,
    isWorkoutMinimized: state.isWorkoutMinimized, minimizeWorkout, maximizeWorkout,
    isAddingExercisesToWorkout: state.isAddingExercisesToWorkout, startAddExercisesToWorkout, endAddExercisesToWorkout,
    collapsedExerciseIds, setCollapsedExerciseIds, collapsedSupersetIds, setCollapsedSupersetIds
  }), [
    state.activeWorkout, startWorkout, updateActiveWorkout, endWorkout, discardActiveWorkout,
    state.isWorkoutMinimized, minimizeWorkout, maximizeWorkout,
    state.isAddingExercisesToWorkout, startAddExercisesToWorkout, endAddExercisesToWorkout,
    collapsedExerciseIds, setCollapsedExerciseIds, collapsedSupersetIds, setCollapsedSupersetIds
  ]);

  return <ActiveWorkoutContext.Provider value={value}>{children}</ActiveWorkoutContext.Provider>;
};
