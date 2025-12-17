
import React, { createContext, useContext, ReactNode, useCallback, useMemo, useReducer, useEffect, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Routine, WorkoutSession, WorkoutExercise, UserGoal, SetType, PerformedSet } from '../types';
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
  const [persistedWorkout, setPersistedWorkout] = useLocalStorage<WorkoutSession | null>('activeWorkout', null);
  
  const [state, dispatch] = useReducer(workoutReducer, {
      activeWorkout: persistedWorkout,
      isWorkoutMinimized: false,
      isAddingExercisesToWorkout: false,
      addingTargetSupersetId: undefined
  });
  
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
              const isGenerated = routine.id.startsWith('smart-') || routine.id.startsWith('gap-') || routine.id.startsWith('gen-');
              const shouldPrefill = routine.isTemplate || isGenerated;
              
              let smartWeight = 0;
              let calculatedWarmups: number[] = [];

              if (shouldPrefill) {
                 smartWeight = getSmartStartingWeight(ex.exerciseId, history, profile, rawExercises, profile.mainGoal);
                 const warmupSetCount = ex.sets.filter(s => s.type === 'warmup').length;
                 if (warmupSetCount > 0 && smartWeight > 0) {
                     const exHistory = getExerciseHistory(history, ex.exerciseId);
                     const increment = detectPreferredIncrement(exHistory);
                     calculatedWarmups = calculateWarmupWeights(smartWeight, warmupSetCount, increment);
                 }
              }

              let warmupIndex = 0;
              const newSets: PerformedSet[] = [];

              ex.sets.forEach((s, sIdx) => {
                  let setWeight = s.weight;
                  let setReps = s.reps;
                  
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

                  let setType: SetType = s.type;
                  if (setType === 'failure') {
                      setType = 'normal';
                      setReps = getDefaultReps(profile.mainGoal);
                  }

                  // Compute inheritance flags by comparing with the resulting values of the previous set
                  const prev = sIdx > 0 ? newSets[sIdx - 1] : null;
                  const isWeightInherited = prev ? (setWeight === prev.weight && setType === prev.type) : false;
                  const isRepsInherited = prev ? (setReps === prev.reps && setType === prev.type) : false;
                  const isTimeInherited = prev ? (s.time === prev.time && setType === prev.type) : false;

                  newSets.push({
                    ...s,
                    id: `set-${Date.now()}-${Math.random()}`,
                    isComplete: false,
                    weight: setWeight,
                    reps: setReps,
                    type: setType,
                    isWeightInherited,
                    isRepsInherited,
                    isTimeInherited
                  });
              });

              return {
                  ...ex,
                  id: `we-${Date.now()}-${Math.random()}`,
                  sets: newSets
              };
          }),
          supersets: routine.supersets
      };
      dispatch({ type: 'SET_WORKOUT', payload: session });
      dispatch({ type: 'MINIMIZE', payload: false });
  }, [history, profile, rawExercises]);

  const updateActiveWorkout = useCallback((workoutOrFn: WorkoutSession | ((prev: WorkoutSession | null) => WorkoutSession | null)) => {
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
              const today = getDateString(new Date(finishedWorkout.startTime));
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
      const targetSupersetId = state.addingTargetSupersetId;
      dispatch({ type: 'SET_ADDING_EXERCISES', payload: false });
      
      if (ids && state.activeWorkout) {
          const defaultReps = getDefaultReps(profile.mainGoal);

          const newExercises: WorkoutExercise[] = ids.map(id => {
              const exerciseDef = rawExercises.find(e => e.id === id);
              const smartWeight = getSmartStartingWeight(id, history, profile, rawExercises, profile.mainGoal);
              return createSmartWorkoutExercise(
                  exerciseDef,
                  { 
                      sets: 1, 
                      reps: defaultReps, 
                      weight: smartWeight, 
                      // FIX: use defaultRestTimes directly as 'user' is not defined in this scope.
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
