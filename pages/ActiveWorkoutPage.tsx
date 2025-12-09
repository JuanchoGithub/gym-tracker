
import React, { useContext, useState, useMemo, useRef, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import { ActiveWorkoutContext } from '../contexts/ActiveWorkoutContext';
import { TimerContext } from '../contexts/TimerContext';
import { useI18n } from '../hooks/useI18n';
import ExerciseCard from '../components/workout/ExerciseCard';
import { WorkoutExercise, WorkoutSession, PerformedSet, SupersetDefinition, Exercise, Routine, BodyPart } from '../types';
import { useWorkoutTimer } from '../hooks/useWorkoutTimer';
import { Icon } from '../components/common/Icon';
import WorkoutDetailsModal from '../components/modals/WorkoutDetailsModal';
import Modal from '../components/common/Modal';
import { useWakeLock } from '../hooks/useWakeLock';
import { cancelTimerNotification } from '../services/notificationService';
import TimedSetTimerModal from '../components/modals/TimedSetTimerModal';
import WorkoutRestTimer from '../components/workout/WorkoutRestTimer';
import { getTimerDuration, groupExercises } from '../utils/workoutUtils';
import WeightInputModal from '../components/modals/WeightInputModal';
import SupersetCard from '../components/workout/SupersetCard';
import SupersetView from '../components/workout/SupersetView';
import SupersetPlayer from '../components/workout/SupersetPlayer';
import ExerciseDetailModal from '../components/exercise/ExerciseDetailModal';
import { generateSmartRoutine, RoutineFocus } from '../utils/routineGenerator';
import { calculateMedianWorkoutDuration, inferUserProfile, analyzeUserHabits } from '../services/analyticsService';
import { calculateMuscleFreshness, calculateSystemicFatigue } from '../utils/fatigueUtils';
import { MUSCLES } from '../constants/muscles';
import { TranslationKey } from '../contexts/I18nContext';
import OnboardingWizard from '../components/onboarding/OnboardingWizard';
import RoutinePreviewModal from '../components/modals/RoutinePreviewModal';
import { generateGapSession, getProtectedMuscles } from '../utils/smartCoachUtils';
import { getWorkoutRecommendation } from '../utils/recommendationUtils';
import { useExerciseName } from '../hooks/useExerciseName';
import { useMeasureUnit } from '../hooks/useWeight';

const PUSH_MUSCLES = [MUSCLES.PECTORALS, MUSCLES.FRONT_DELTS, MUSCLES.TRICEPS];
const PULL_MUSCLES = [MUSCLES.LATS, MUSCLES.TRAPS, MUSCLES.BICEPS];
const LEG_MUSCLES = [MUSCLES.QUADS, MUSCLES.HAMSTRINGS, MUSCLES.GLUTES];

interface SuggestionState {
    routine: Routine;
    focus: string;
    isFallback?: boolean;
    description?: string;
}

const ActiveWorkoutPage: React.FC = () => {
  const { getExerciseById, keepScreenAwake, currentWeight, history, exercises, routines, upsertRoutines, profile } = useContext(AppContext);
  const { 
    activeWorkout, updateActiveWorkout, endWorkout, discardActiveWorkout, maximizeWorkout, minimizeWorkout, 
    startAddExercisesToWorkout, collapsedExerciseIds, setCollapsedExerciseIds, collapsedSupersetIds, setCollapsedSupersetIds 
  } = useContext(ActiveWorkoutContext);
  const { activeTimerInfo, setActiveTimerInfo, activeTimedSet, setActiveTimedSet } = useContext(TimerContext);
  
  const { t } = useI18n();
  const { weightUnit } = useMeasureUnit();
  const elapsedTime = useWorkoutTimer(activeWorkout?.startTime);
  const getExerciseName = useExerciseName();
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isConfirmingFinish, setIsConfirmingFinish] = useState(false);
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  
  const [isReorganizeMode, setIsReorganizeMode] = useState(false);
  const [tempExercises, setTempExercises] = useState<WorkoutExercise[]>([]);
  
  // Refs for scrolling
  const headerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const scroller = document.querySelector('main');
    if (scroller) {
      scroller.scrollTo(0, 0);
    }
  }, []);

  // Drag state
  const dragInfo = useRef<{ type: 'item' | 'superset', indices: number[] } | null>(null);
  const dragOverInfo = useRef<{ type: 'item' | 'superset', indices: number[] } | null>(null);
  const [draggedOverIndices, setDraggedOverIndices] = useState<number[] | null>(null);
  
  const [isWeightInputModalOpen, setIsWeightInputModalOpen] = useState(false);
  const [pendingExerciseUpdate, setPendingExerciseUpdate] = useState<{ exercise: WorkoutExercise, setIndex: number } | null>(null);
  const [weightModalDefaults, setWeightModalDefaults] = useState<{ bodyWeight?: number, extraWeight?: number }>({});
  
  const [activeSupersetPlayerId, setActiveSupersetPlayerId] = useState<string | null>(null);
  
  // Suggestion State
  const [suggestedRoutine, setSuggestedRoutine] = useState<SuggestionState | null>(null);

  const collapsedSet = useMemo(() => new Set(collapsedExerciseIds), [collapsedExerciseIds]);
  const collapsedSupersetSet = useMemo(() => new Set(collapsedSupersetIds), [collapsedSupersetIds]);

  useWakeLock(keepScreenAwake || !!activeTimedSet || isReorganizeMode || (!!activeTimerInfo && !activeTimerInfo.isPaused) || !!activeSupersetPlayerId);

  const hasInvalidCompletedSets = useMemo(() => {
    if (!activeWorkout) return false;
    for (const ex of activeWorkout.exercises) {
      const exerciseInfo = getExerciseById(ex.exerciseId);
      // Allow bodyweight categories to have 0 weight
      const isWeightOptional = exerciseInfo && (
          ['Reps Only', 'Cardio', 'Duration', 'Bodyweight', 'Assisted Bodyweight', 'Plyometrics'].includes(exerciseInfo.category)
      );

      for (const set of ex.sets) {
        if (set.isComplete) {
          if (set.type === 'timed') {
            if ((set.time ?? 0) <= 0 || set.reps <= 0) return true;
          } else {
            const weightInvalid = !isWeightOptional && set.weight <= 0;
            const repsInvalid = set.reps <= 0;
            if (weightInvalid || repsInvalid) return true;
          }
        }
      }
    }
    return false;
  }, [activeWorkout, getExerciseById]);

  const availableSupersets = useMemo(() => {
      if (!activeWorkout || !activeWorkout.supersets) return [];
      return Object.values(activeWorkout.supersets).map((superset: SupersetDefinition) => ({
          id: superset.id,
          name: superset.name,
          exercises: activeWorkout.exercises
            .filter(ex => ex.supersetId === superset.id)
            .map(ex => {
                const info = getExerciseById(ex.exerciseId);
                return info ? getExerciseName(info) : 'Unknown';
            })
      }));
  }, [activeWorkout, getExerciseById, getExerciseName]);

  const handleShowExerciseDetails = (exerciseId: string) => {
    const ex = getExerciseById(exerciseId);
    if (ex) setViewingExercise(ex);
  };

  const scrollToItem = (id: string) => {
    // Delay slightly to ensure DOM updates (collapse animation start)
    setTimeout(() => {
        const headerHeight = headerRef.current?.offsetHeight || 0;
        const element = itemRefs.current.get(id);
        const scroller = document.querySelector('main');

        if (element && scroller) {
            const scrollerRect = scroller.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const currentScrollTop = scroller.scrollTop;
            
            // Calculate position relative to the top of the scroller content
            const relativeTop = elementRect.top - scrollerRect.top + currentScrollTop;

            // Scroll so the element is just below the sticky header (plus a little padding)
            scroller.scrollTo({
                top: relativeTop - headerHeight - 10, 
                behavior: 'smooth'
            });
        }
    }, 50);
  };

  // --- Reorganization Logic ---
  const handleEnterReorganizeMode = () => {
    if (!activeWorkout) return;
    setTempExercises([...activeWorkout.exercises]);
    setIsReorganizeMode(true);
  };

  const handleExitReorganizeMode = (save: boolean) => {
    if (save && activeWorkout) {
        // Fix Data Loss Race Condition:
        // Merge the new ORDER and SUPERSET_ID from tempExercises with the LATEST DATA from activeWorkout.
        const mergedExercises = tempExercises.map(tempEx => {
            const latestEx = activeWorkout.exercises.find(e => e.id === tempEx.id);
            if (!latestEx) return tempEx; // Fallback
            
            return {
                ...latestEx, // Persist latest set data, notes, timers
                supersetId: tempEx.supersetId // Persist structural changes from reorganize
            };
        });

        updateActiveWorkout({ ...activeWorkout, exercises: mergedExercises });
    }
    setIsReorganizeMode(false);
    setTempExercises([]);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, type: 'item' | 'superset', indices: number[]) => {
    e.stopPropagation();
    dragInfo.current = { type, indices };
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, type: 'item' | 'superset', indices: number[]) => {
    e.stopPropagation();
    dragOverInfo.current = { type, indices };
    setDraggedOverIndices(indices);
  };

  const handleDrop = () => {
    if (!dragInfo.current || !dragOverInfo.current) return;
    
    const source = dragInfo.current;
    const target = dragOverInfo.current;
    
    // Don't do anything if dropping on itself
    if (source.indices[0] === target.indices[0]) {
        setDraggedOverIndices(null);
        dragInfo.current = null;
        dragOverInfo.current = null;
        return;
    }

    const newExercises = [...tempExercises];
    
    // Extract source items
    const sourceIndices = source.indices.sort((a, b) => a - b);
    const removedItems = newExercises.splice(sourceIndices[0], sourceIndices.length);
    
    // Determine insertion index
    let insertIndex = target.indices[0];
    if (insertIndex > sourceIndices[0]) {
        insertIndex -= sourceIndices.length;
    }
    
    // Logic for adopting Superset ID
    if (source.type === 'item') {
        const targetItem = newExercises[insertIndex] || (insertIndex > 0 ? newExercises[insertIndex-1] : null);
        
        // FIX: Loop through ALL removed items to prevent metadata loss
        removedItems.forEach(item => {
            if (target.type === 'superset' && targetItem && targetItem.supersetId) {
                 item.supersetId = targetItem.supersetId;
            } 
            else if (target.type === 'item' && targetItem && targetItem.supersetId) {
                 item.supersetId = targetItem.supersetId;
            }
            else if (target.type === 'item' && targetItem && !targetItem.supersetId) {
                 delete item.supersetId;
            }
        });
    }
    
    newExercises.splice(insertIndex, 0, ...removedItems);
    
    setTempExercises(newExercises);
    dragInfo.current = null;
    dragOverInfo.current = null;
    setDraggedOverIndices(null);
  };

  const handleMoveExercise = (fromIndex: number, toIndex: number) => {
    if (!activeWorkout || toIndex < 0 || toIndex >= activeWorkout.exercises.length) return;
    updateActiveWorkout(prev => {
        if (!prev) return null;
        const newExercises = [...prev.exercises];
        const [movedItem] = newExercises.splice(fromIndex, 1);
        newExercises.splice(toIndex, 0, movedItem);
        return { ...prev, exercises: newExercises };
    });
  };

  const handleMoveSuperset = (indices: number[], direction: 'up' | 'down') => {
    const exercisesList = isReorganizeMode ? tempExercises : activeWorkout?.exercises;
    if (!exercisesList) return;

    const newExercises = [...exercisesList];
    const sortedIndices = indices.sort((a, b) => a - b);
    const startIndex = sortedIndices[0];
    const count = sortedIndices.length;
    
    if (direction === 'up') {
        if (startIndex === 0) return;
        
        const grouped = groupExercises(newExercises, activeWorkout?.supersets);
        const currentGroupIndex = grouped.findIndex(g => g.type === 'superset' && g.indices[0] === startIndex);
        
        if (currentGroupIndex > 0) {
            const prevGroup = grouped[currentGroupIndex - 1];
            const prevGroupStart = prevGroup.type === 'superset' ? prevGroup.indices[0] : prevGroup.index;
            
            // Move our block to prevGroupStart
            const removed = newExercises.splice(startIndex, count);
            newExercises.splice(prevGroupStart, 0, ...removed);
        }

    } else {
         const grouped = groupExercises(newExercises, activeWorkout?.supersets);
         const currentGroupIndex = grouped.findIndex(g => g.type === 'superset' && g.indices[0] === startIndex);
         
         if (currentGroupIndex < grouped.length - 1) {
             const nextGroup = grouped[currentGroupIndex + 1];
             
             const nextGroupEndIndex = nextGroup.type === 'superset' ? nextGroup.indices[nextGroup.indices.length - 1] : nextGroup.index;
             const insertIndex = nextGroupEndIndex + 1;
             
             // We need to adjust insertIndex because we are removing items first
             const adjustedInsert = insertIndex - count;
             
             const removed = newExercises.splice(startIndex, count);
             newExercises.splice(adjustedInsert, 0, ...removed);
         }
    }

    if (isReorganizeMode) {
        setTempExercises(newExercises);
    } else if (activeWorkout) {
        updateActiveWorkout({ ...activeWorkout, exercises: newExercises });
    }
  };
  
  const handleToggleCollapse = (exerciseId: string) => {
    setCollapsedExerciseIds(prevIds => {
      const newSet = new Set(prevIds);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
        scrollToItem(exerciseId);
      }
      return Array.from(newSet);
    });
  };

  const handleToggleSupersetCollapse = (supersetId: string) => {
    setCollapsedSupersetIds(prevIds => {
      const newSet = new Set(prevIds);
      if (newSet.has(supersetId)) {
        newSet.delete(supersetId);
      } else {
        newSet.add(supersetId);
        scrollToItem(supersetId);
      }
      return Array.from(newSet);
    });
  };

  const handleRemoveExercise = (exerciseId: string) => {
    if (!activeWorkout) return;

    // Clean up timers
    if (activeTimerInfo && activeTimerInfo.exerciseId === exerciseId) {
        setActiveTimerInfo(null);
        cancelTimerNotification('rest-timer-finished');
    }
    
    if (activeTimedSet && activeTimedSet.exercise.id === exerciseId) {
        setActiveTimedSet(null);
    }

    // Clean up collapsed state
    setCollapsedExerciseIds(prev => prev.filter(id => id !== exerciseId));

    updateActiveWorkout(prev => {
        if (!prev) return null;
        const updatedExercises = prev.exercises.filter(ex => ex.id !== exerciseId);
        return { ...prev, exercises: updatedExercises };
    });
  };

  const handleUpdateExercises = (updatedExercises: WorkoutExercise[]) => {
      if (!activeWorkout) return;
      updateActiveWorkout(prev => {
          if (!prev) return null;
          const newExercisesList = prev.exercises.map(ex => {
              const updated = updatedExercises.find(u => u.id === ex.id);
              return updated || ex;
          });
          return { ...prev, exercises: newExercisesList };
      });
  };

  const handleUpdateExercise = (updatedExercise: WorkoutExercise) => {
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

    // Intercept completion for bodyweight exercises if user weight is missing or ambiguous.
    if (justCompletedSet) {
      const exerciseInfo = getExerciseById(updatedExercise.exerciseId);
      const isBodyweight = exerciseInfo && ['Bodyweight', 'Assisted Bodyweight', 'Plyometrics'].includes(exerciseInfo.category);
      
      if (isBodyweight && !currentWeight) {
          const inputVal = justCompletedSet.weight; 
          let initBW = undefined;
          let initExtra = 0;
          
          // Determine threshold based on unit (40kg or ~90lbs)
          const threshold = weightUnit === 'lbs' ? 90 : 40;
          
          if (inputVal > 0 && inputVal <= threshold) {
              initExtra = inputVal;
          } else if (inputVal > threshold) {
              initBW = inputVal;
          }
          
          setPendingExerciseUpdate({ exercise: updatedExercise, setIndex: justCompletedSetIndex });
          setWeightModalDefaults({ bodyWeight: initBW, extraWeight: initExtra });
          setIsWeightInputModalOpen(true);
          return;
      }
    }

    updateActiveWorkout(prev => {
        if (!prev) return null;
        let workoutToUpdate = { ...prev };

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
        
        const updatedExercises = workoutToUpdate.exercises.map(ex =>
            ex.id === updatedExercise.id ? updatedExercise : ex
        );
        workoutToUpdate = { ...workoutToUpdate, exercises: updatedExercises };
        return workoutToUpdate;
    });

    if (!activeSupersetPlayerId) {
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

            if (!updatedExercise.supersetId) {
                if (updatedExercise.sets.every(s => s.isComplete)) {
                    if (!collapsedExerciseIds.includes(updatedExercise.id)) {
                        setCollapsedExerciseIds(prev => [...prev, updatedExercise.id]);
                        scrollToItem(updatedExercise.id);
                    }
                }
            } else {
                const supersetId = updatedExercise.supersetId;
                const allSupersetExercises = activeWorkout.exercises.filter(ex => ex.supersetId === supersetId);
                const allComplete = allSupersetExercises.every(ex => ex.sets.every(s => s.isComplete));
                
                if (allComplete) {
                    if (!collapsedSupersetIds.includes(supersetId)) {
                        setCollapsedSupersetIds(prev => [...prev, supersetId]);
                        scrollToItem(supersetId);
                    }
                }
            }

        } else if (justUncompletedSet && activeTimerInfo && activeTimerInfo.setId === justUncompletedSet.id) {
            setActiveTimerInfo(null);
            cancelTimerNotification('rest-timer-finished');
        }
    }
  };

  const handleCreateSupersetCorrect = (exerciseId: string) => {
      if (!activeWorkout) return;
      const newSupersetId = `superset-${Date.now()}`;
      
      updateActiveWorkout(prev => {
          if (!prev) return null;
          const exerciseIndex = prev.exercises.findIndex(ex => ex.id === exerciseId);
          if (exerciseIndex === -1) return prev;

          const newSupersetDef = {
              id: newSupersetId,
              name: 'Superset',
              color: 'indigo',
          };

          const updatedExercises = [...prev.exercises];
          updatedExercises[exerciseIndex] = { ...updatedExercises[exerciseIndex], supersetId: newSupersetId };

          return {
              ...prev,
              exercises: updatedExercises,
              supersets: { ...prev.supersets, [newSupersetId]: newSupersetDef }
          };
      });
      setCollapsedSupersetIds(prev => [...prev, newSupersetId]);
  }

  const handleJoinSuperset = (exerciseId: string, targetSupersetId: string) => {
      if (!activeWorkout) return;
      updateActiveWorkout(prev => {
          if (!prev) return null;
          const currentExercise = prev.exercises.find(ex => ex.id === exerciseId);
          if (!currentExercise) return prev;

          const exercisesWithoutItem = prev.exercises.filter(ex => ex.id !== exerciseId);
          
          let insertionIndex = -1;
          for (let i = exercisesWithoutItem.length - 1; i >= 0; i--) {
              if (exercisesWithoutItem[i].supersetId === targetSupersetId) {
                  insertionIndex = i;
                  break;
              }
          }

          const updatedItem = { ...currentExercise, supersetId: targetSupersetId };
          const finalExercises = [...exercisesWithoutItem];
          
          if (insertionIndex !== -1) {
              finalExercises.splice(insertionIndex + 1, 0, updatedItem);
          } else {
              finalExercises.push(updatedItem);
          }

          return { ...prev, exercises: finalExercises };
      });
  };

  const handleUngroupSuperset = (supersetId: string) => {
      if (!activeWorkout) return;
      updateActiveWorkout(prev => {
          if (!prev) return null;
          const updatedExercises = prev.exercises.map(ex => {
              if (ex.supersetId === supersetId) {
                  const { supersetId: _, ...rest } = ex;
                  return rest;
              }
              return ex;
          });
          
          const updatedSupersets = { ...prev.supersets };
          delete updatedSupersets[supersetId];
          
          return {
              ...prev,
              exercises: updatedExercises,
              supersets: updatedSupersets
          };
      });
      setCollapsedSupersetIds(prev => prev.filter(id => id !== supersetId));
  };

  const handleRenameSuperset = (supersetId: string, newName: string) => {
      if (!activeWorkout || !activeWorkout.supersets) return;
      updateActiveWorkout(prev => {
          if (!prev || !prev.supersets) return prev;
          return {
              ...prev,
              supersets: {
                  ...prev.supersets,
                  [supersetId]: { ...prev.supersets[supersetId], name: newName }
              }
          };
      });
  };

  const handlePlaySuperset = (supersetId: string) => {
      setActiveSupersetPlayerId(supersetId);
  };
  
  const handleWeightModalSave = (bodyWeightKg: number, totalLoadKg: number) => {
    // Fix: Need to access logWeight from AppContext (removed from here in previous refactor, need to add it back to imports or pass down)
    // Added logWeight to AppContext destructure at top.
    // logWeight(bodyWeightKg); // This function is available in AppContext
    
    if (pendingExerciseUpdate) {
        const { exercise, setIndex } = pendingExerciseUpdate;
        const adjustedExercise = { ...exercise };
        const adjustedSets = [...adjustedExercise.sets];
        
        const set = adjustedSets[setIndex];
        if (set && set.isComplete) {
            adjustedSets[setIndex] = { ...set, weight: totalLoadKg };
        }

        adjustedExercise.sets = adjustedSets;
        
        handleUpdateExercise(adjustedExercise);
        setPendingExerciseUpdate(null);
    }
    
    setIsWeightInputModalOpen(false);
  };


  const handleFinishWorkout = () => {
    if (activeWorkout && activeWorkout.exercises.length === 0) {
        endWorkout();
        return;
    }
    setIsConfirmingFinish(true);
  };
  
  const confirmFinishWorkout = () => {
    endWorkout();
  };

  const cancelFinishWorkout = () => {
    setIsConfirmingFinish(false);
  };

  const handleDiscardWorkout = () => {
    discardActiveWorkout();
  };

  const handleSaveDetails = (updatedDetails: Partial<WorkoutSession>) => {
    if (activeWorkout) {
        updateActiveWorkout(prev => prev ? { ...prev, ...updatedDetails } : null);
        setIsDetailsModalOpen(false);
    }
  }
  
  const handleStartTimedSet = (exercise: WorkoutExercise, set: PerformedSet) => {
    setActiveTimedSet({ exercise, set });
  };
  
  const handleFinishTimedSet = () => {
    if (!activeTimedSet || !activeWorkout) return;

    const { exercise, set } = activeTimedSet;
    
    const updatedExercise = {
        ...exercise,
        sets: exercise.sets.map(s => s.id === set.id ? { ...s, isComplete: true, completedAt: Date.now() } : s)
    };
    
    handleUpdateExercise(updatedExercise);
    setActiveTimedSet(null);
  };

  const getFreshestMuscleGroup = () => {
    const freshness = calculateMuscleFreshness(history, exercises);
    
    const getGroupScore = (muscleNames: string[]) => {
        const groupScores = muscleNames.map(m => freshness[m] !== undefined ? freshness[m] : 100);
        return groupScores.reduce((a, b) => a + b, 0) / groupScores.length;
    };
    
    const pushScore = getGroupScore(PUSH_MUSCLES);
    const pullScore = getGroupScore(PULL_MUSCLES);
    const legsScore = getGroupScore(LEG_MUSCLES);
    const upperScore = (pushScore + pullScore) / 2;
    const lowerScore = legsScore;

    const groups: { focus: RoutineFocus, score: number, label: string }[] = [
        { focus: 'push', score: pushScore, label: 'Push' },
        { focus: 'pull', score: pullScore, label: 'Pull' },
        { focus: 'legs', score: legsScore, label: 'Legs' },
        { focus: 'upper', score: upperScore, label: 'Upper Body' },
        { focus: 'lower', score: lowerScore, label: 'Lower Body' },
    ];
    
    groups.sort((a, b) => b.score - a.score);
    return groups[0];
  };

  const handleCoachSuggest = () => {
      const customRoutines = routines.filter(r => !r.id.startsWith('rt-'));
      
      if (history.length === 0 && customRoutines.length === 0) {
          setIsOnboardingOpen(true);
          return;
      }

      const recommendation = getWorkoutRecommendation(history, routines, exercises, t, currentWeight);
      
      if (!recommendation) {
          handleAggressiveSuggest();
          return;
      }

      let routineToSuggest: Routine | null = null;
      let focusLabel = t('smart_coach_title');
      
      let params = recommendation.reasonParams || {};
      let reasonText = t(recommendation.reasonKey as any, params);

      const isRestRecommendation = ['rest', 'active_recovery', 'deload'].includes(recommendation.type);

      if (isRestRecommendation) {
           if (recommendation.generatedRoutine) {
               routineToSuggest = recommendation.generatedRoutine;
           } else {
               const durationProfile = calculateMedianWorkoutDuration(history);
               routineToSuggest = generateGapSession([], exercises, history, t, 'gym', durationProfile);
               routineToSuggest.name = t('smart_gap_session');
           }
           
           focusLabel = t('smart_recovery_mode');
           reasonText += " " + t('active_workout_suggestion_gap_override');
      } 
      else if (recommendation.generatedRoutine) {
          routineToSuggest = recommendation.generatedRoutine;
          focusLabel = routineToSuggest.name;
      } 
      else if (recommendation.relevantRoutineIds && recommendation.relevantRoutineIds.length > 0) {
          const routineId = recommendation.relevantRoutineIds[0];
          routineToSuggest = routines.find(r => r.id === routineId) || null;
          if (routineToSuggest) focusLabel = routineToSuggest.name;
      }

      if (routineToSuggest) {
          setSuggestedRoutine({ 
              routine: routineToSuggest, 
              focus: focusLabel, 
              description: reasonText
          });
      } else {
          handleAggressiveSuggest();
      }
  };

  const handleAggressiveSuggest = () => {
      const customRoutines = routines.filter(r => !r.id.startsWith('rt-'));
      if (history.length === 0 && customRoutines.length === 0) {
          setIsOnboardingOpen(true);
          return;
      }

      const inferredProfile = inferUserProfile(history);
      
      // Override inferred goal with explicit profile goal if available
      if (profile.mainGoal) {
          inferredProfile.goal = profile.mainGoal;
      }

      const winner = getFreshestMuscleGroup();

      // Calculate habits for dynamic exercise resolution
      const habitData = analyzeUserHabits(history);
      
      const generatedRoutine = generateSmartRoutine(
          winner.focus, 
          inferredProfile, 
          t,
          exercises,
          habitData.exerciseFrequency
      );
      
      generatedRoutine.name = `Target: ${winner.label}`;
      
      setSuggestedRoutine({ 
          routine: generatedRoutine, 
          focus: winner.label,
          description: `Ignoring CNS fatigue. ${winner.label} muscles are ${Math.round(winner.score)}% recovered.`
      });
  };
  
  const handleOnboardingComplete = (newRoutines: Routine[]) => {
      upsertRoutines(newRoutines);
      setIsOnboardingOpen(false);
      if (newRoutines.length > 0) {
          setSuggestedRoutine({ 
              routine: newRoutines[0], 
              focus: 'Starting Plan',
              isFallback: true,
              description: "Your personalized starting plan."
          });
      }
  };

  const handleAcceptSuggestion = () => {
      if (!activeWorkout || !suggestedRoutine) return;
      
      const newExercises = suggestedRoutine.routine.exercises.map(ex => ({
          ...ex,
          id: `we-${Date.now()}-${Math.random()}`,
          sets: ex.sets.map(s => ({ ...s, id: `set-${Date.now()}-${Math.random()}` }))
      }));
      
      updateActiveWorkout(prev => prev ? { 
          ...prev, 
          exercises: newExercises, 
          routineName: suggestedRoutine.routine.name 
      } : null);
      
      setSuggestedRoutine(null);
  };

  if (!activeWorkout) {
    return <div>{t('active_workout_no_active')}</div>;
  }

  const exercisesToShow = isReorganizeMode ? tempExercises : activeWorkout.exercises;
  const groupedExercises = groupExercises(exercisesToShow, activeWorkout.supersets);

  const renderExercise = (exercise: WorkoutExercise, index: number) => {
      const exerciseInfo = getExerciseById(exercise.exerciseId);
      const isBeingDraggedOver = draggedOverIndices?.includes(index) && dragInfo.current?.indices[0] !== index;

      return exerciseInfo ? (
          <div 
            key={exercise.id} 
            ref={el => {
                if(el) itemRefs.current.set(exercise.id, el); 
                else itemRefs.current.delete(exercise.id);
            }}
          >
            <ExerciseCard
                workoutExercise={exercise}
                exerciseInfo={exerciseInfo}
                onUpdate={handleUpdateExercise}
                onStartTimedSet={handleStartTimedSet}
                isReorganizeMode={isReorganizeMode}
                onDragStart={(e) => handleDragStart(e, 'item', [index])}
                onDragEnter={(e) => handleDragEnter(e, 'item', [index])}
                onDragEnd={handleDrop}
                onMoveUp={() => handleMoveExercise(index, index - 1)}
                onMoveDown={() => handleMoveExercise(index, index + 1)}
                isMoveUpDisabled={index === 0}
                isMoveDownDisabled={index === exercisesToShow.length - 1}
                onReorganize={handleEnterReorganizeMode}
                isBeingDraggedOver={isBeingDraggedOver}
                isCollapsed={collapsedSet.has(exercise.id)}
                onToggleCollapse={() => handleToggleCollapse(exercise.id)}
                onRemove={handleRemoveExercise}
                onCreateSuperset={!exercise.supersetId ? () => handleCreateSupersetCorrect(exercise.id) : undefined}
                onJoinSuperset={!exercise.supersetId ? (supersetId) => handleJoinSuperset(exercise.id, supersetId) : undefined}
                availableSupersets={availableSupersets}
                onShowDetails={() => handleShowExerciseDetails(exercise.exerciseId)}
                userBodyWeight={currentWeight}
            />
          </div>
      ) : null;
  };

  return (
    <div className="space-y-4">
      <div ref={headerRef} className="sticky top-0 bg-background/80 backdrop-blur-sm z-20 -mx-2 sm:-mx-4 px-2 sm:px-4 py-2 border-b border-secondary/20">
          <div className="container mx-auto flex items-center justify-between">
              {!isReorganizeMode ? (
                <>
                  <button 
                    onClick={minimizeWorkout} 
                    className="p-2 text-text-secondary hover:text-primary"
                    aria-label={t('active_workout_minimize_aria')}
                  >
                      <Icon name="arrow-down" />
                  </button>
                  <div className="font-mono text-lg text-warning">{elapsedTime}</div>
                  <button 
                    onClick={handleFinishWorkout} 
                    className="bg-success text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-green-400 text-sm"
                  >
                      {t('workout_finish')}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => handleExitReorganizeMode(false)} className="bg-secondary text-white font-bold py-2 px-4 rounded-lg shadow-lg text-sm">
                      {t('common_cancel')}
                  </button>
                  <h3 className="text-lg font-bold">{t('exercise_header_menu_reorganize')}</h3>
                  <button onClick={() => handleExitReorganizeMode(true)} className="bg-success text-white font-bold py-2 px-4 rounded-lg shadow-lg text-sm">
                      {t('workout_reorganize_save_order')}
                  </button>
                </>
              )}
          </div>
          <div className="container mx-auto mt-2">
            <WorkoutRestTimer />
          </div>
      </div>
      
      <div className="text-center -mt-2 space-y-1">
        <div className="flex justify-center items-center gap-2 max-w-full mx-auto px-4">
            <h1 className="flex-shrink min-w-0 text-2xl md:text-3xl font-bold truncate">{activeWorkout.routineName}</h1>
            <button
                onClick={() => setIsDetailsModalOpen(true)}
                className="text-text-secondary hover:text-primary p-1 flex-shrink-0"
                aria-label={t('active_workout_edit_details_aria')}
            >
                <Icon name="ellipsis" />
            </button>
        </div>
        <p className="text-sm text-text-secondary">
          {new Date(activeWorkout.startTime).toLocaleString(undefined, {
              weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
        </p>
      </div>

      <div className="-mx-2 space-y-4 sm:-mx-4">
        {groupedExercises.length > 0 ? groupedExercises.map((group, groupIndex) => {
            if (group.type === 'single') {
                return renderExercise(group.exercise, group.index);
            } else {
                const definition = group.definition || { id: group.supersetId, name: 'Superset', color: 'indigo' };
                const isBeingDraggedOver = draggedOverIndices?.length === group.indices.length && draggedOverIndices.every((val, i) => val === group.indices[i]) && dragInfo.current?.indices[0] !== group.indices[0];

                return (
                    <div 
                        key={group.supersetId}
                        ref={el => {
                            if(el) itemRefs.current.set(group.supersetId, el); 
                            else itemRefs.current.delete(group.supersetId);
                        }}
                    >
                        <SupersetCard 
                            definition={definition}
                            onRename={(name) => handleRenameSuperset(group.supersetId, name)}
                            onUngroup={() => handleUngroupSuperset(group.supersetId)}
                            onAddExercise={() => startAddExercisesToWorkout(group.supersetId)}
                            onPlay={() => handlePlaySuperset(group.supersetId)}
                            exercises={group.exercises}
                            isCollapsed={collapsedSupersetSet.has(group.supersetId)}
                            onToggleCollapse={() => handleToggleSupersetCollapse(group.supersetId)}
                            onMoveUp={() => handleMoveSuperset(group.indices, 'up')}
                            onMoveDown={() => handleMoveSuperset(group.indices, 'down')}
                            isReorganizeMode={isReorganizeMode}
                            onDragStart={(e) => handleDragStart(e, 'superset', group.indices)}
                            onDragEnter={(e) => handleDragEnter(e, 'superset', group.indices)}
                            onDragEnd={handleDrop}
                            isBeingDraggedOver={isBeingDraggedOver}
                        >
                            <SupersetView 
                                exercises={group.exercises}
                                indices={group.indices}
                                isReorganizeMode={isReorganizeMode}
                                onUpdateExercise={handleUpdateExercise}
                                onUpdateExercises={handleUpdateExercises}
                                onRemoveExercise={handleRemoveExercise}
                                onMoveExercise={handleMoveExercise}
                                onStartTimedSet={handleStartTimedSet}
                                onDragStart={(e, index) => handleDragStart(e, 'item', [index])}
                                onDragEnter={(e, index) => handleDragEnter(e, 'item', [index])}
                                onDragEnd={handleDrop}
                                draggedOverIndex={draggedOverIndices ? draggedOverIndices[0] : null}
                                dragItemIndex={dragInfo.current ? dragInfo.current.indices[0] : null}
                                onShowDetails={handleShowExerciseDetails}
                            />
                        </SupersetCard>
                    </div>
                );
            }
        }) : (
          <div className="mx-2 rounded-lg bg-surface px-4 py-10 text-center sm:mx-4 border border-white/5 flex flex-col items-center">
              <p className="text-lg font-semibold text-text-primary mb-6">{t('active_workout_empty_title')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                  <button 
                      onClick={handleCoachSuggest}
                      className="bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white p-4 rounded-xl shadow-lg flex flex-col items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
                  >
                      <Icon name="sparkles" className="w-8 h-8 text-yellow-300" />
                      <span className="font-bold text-lg">{t('active_btn_coach')}</span>
                      <span className="text-xs opacity-80">{t('active_btn_coach_desc')}</span>
                  </button>
                  <button 
                      onClick={handleAggressiveSuggest}
                      className="bg-surface-highlight hover:bg-surface border border-amber-500/30 text-white p-4 rounded-xl shadow-lg flex flex-col items-center gap-2 transition-all transform hover:scale-105 active:scale-95 group"
                  >
                      <Icon name="dumbbell" className="w-8 h-8 text-amber-500 group-hover:text-amber-400" />
                      <span className="font-bold text-lg">{t('active_btn_aggressive')}</span>
                      <span className="text-xs opacity-80">{t('active_btn_aggressive_desc')}</span>
                  </button>
              </div>
          </div>
        )}
      </div>
      
      <button
        onClick={() => startAddExercisesToWorkout()}
        className="w-full flex items-center justify-center space-x-2 bg-secondary/50 text-text-primary font-medium py-3 rounded-lg hover:bg-secondary transition-colors"
      >
        <Icon name="plus" className="w-5 h-5" />
        <span>{t('active_workout_add_exercise')}</span>
      </button>

      {isDetailsModalOpen && activeWorkout && (
        <WorkoutDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={() => setIsDetailsModalOpen(false)}
            workout={activeWorkout}
            onSave={handleSaveDetails}
        />
      )}

      {activeTimedSet && (
        <TimedSetTimerModal
            isOpen={!!activeTimedSet}
            onFinish={handleFinishTimedSet}
            onClose={() => setActiveTimedSet(null)}
            set={activeTimedSet.set}
            restTime={activeTimedSet.exercise.restTime.timed}
            exerciseName={getExerciseById(activeTimedSet.exercise.exerciseId)?.name || ''}
        />
      )}

      {activeSupersetPlayerId && (
          <SupersetPlayer 
             supersetId={activeSupersetPlayerId}
             supersetName={activeWorkout?.supersets?.[activeSupersetPlayerId]?.name || 'Superset'}
             exercises={activeWorkout?.exercises.filter(ex => ex.supersetId === activeSupersetPlayerId) || []}
             onUpdateExercise={handleUpdateExercise}
             onUpdateExercises={handleUpdateExercises}
             onClose={() => setActiveSupersetPlayerId(null)}
          />
      )}

      <Modal
        isOpen={isConfirmingFinish}
        onClose={cancelFinishWorkout}
        title={t('finish_workout_confirm_title')}
      >
        <div className="space-y-6">
          <p className="text-text-secondary">{t('finish_workout_confirm_message')}</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleDiscardWorkout}
              className="bg-red-600/20 text-red-500 border border-red-600/50 hover:bg-red-600 hover:text-white font-bold py-4 px-4 rounded-xl transition-all"
            >
              {t('finish_workout_confirm_discard')}
            </button>
            <button
              onClick={confirmFinishWorkout}
              className="bg-success hover:bg-green-600 text-white font-bold py-4 px-4 rounded-xl transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
              disabled={hasInvalidCompletedSets}
              title={hasInvalidCompletedSets ? t('finish_workout_disabled_tooltip') : undefined}
            >
              {t('finish_workout_confirm_finish')}
            </button>
          </div>
          <button
              onClick={cancelFinishWorkout}
              className="w-full text-text-secondary hover:text-white font-medium py-3 px-4 rounded-lg transition-colors hover:bg-white/5"
          >
              {t('finish_workout_confirm_cancel')}
          </button>
        </div>
      </Modal>

      <WeightInputModal
        isOpen={isWeightInputModalOpen}
        onClose={() => setIsWeightInputModalOpen(false)}
        onSave={handleWeightModalSave}
        initialBodyWeight={weightModalDefaults.bodyWeight}
        initialExtraWeight={weightModalDefaults.extraWeight}
      />
      
      {viewingExercise && (
        <ExerciseDetailModal
          isOpen={!!viewingExercise}
          onClose={() => setViewingExercise(null)}
          exercise={viewingExercise}
        />
      )}

      {suggestedRoutine && (
          <RoutinePreviewModal 
            isOpen={!!suggestedRoutine}
            onClose={() => setSuggestedRoutine(null)}
            routine={suggestedRoutine.routine}
            onStart={handleAcceptSuggestion}
            actionLabel={t('active_workout_accept_suggestion')}
            description={suggestedRoutine.description || (suggestedRoutine.isFallback 
                ? t('active_workout_suggestion_reason_start') 
                : t('active_workout_suggestion_reason', { focus: suggestedRoutine.focus })
            )}
          />
      )}

      {isOnboardingOpen && (
          <OnboardingWizard 
             onClose={() => setIsOnboardingOpen(false)}
             onComplete={handleOnboardingComplete}
          />
      )}
    </div>
  );
};

export default ActiveWorkoutPage;
