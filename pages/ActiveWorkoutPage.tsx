
import React, { useContext, useState, useMemo, useRef } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useI18n } from '../hooks/useI18n';
import ExerciseCard from '../components/workout/ExerciseCard';
import { WorkoutExercise, WorkoutSession, PerformedSet, SupersetDefinition } from '../types';
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

const ActiveWorkoutPage: React.FC = () => {
  const { activeWorkout, updateActiveWorkout, endWorkout, discardActiveWorkout, getExerciseById, minimizeWorkout, keepScreenAwake, activeTimerInfo, setActiveTimerInfo, startAddExercisesToWorkout, collapsedExerciseIds, setCollapsedExerciseIds, collapsedSupersetIds, setCollapsedSupersetIds, currentWeight, logWeight, activeTimedSet, setActiveTimedSet } = useContext(AppContext);
  const { t } = useI18n();
  const elapsedTime = useWorkoutTimer(activeWorkout?.startTime);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isConfirmingFinish, setIsConfirmingFinish] = useState(false);
  
  const [isReorganizeMode, setIsReorganizeMode] = useState(false);
  const [tempExercises, setTempExercises] = useState<WorkoutExercise[]>([]);
  
  // Drag state
  const dragInfo = useRef<{ type: 'item' | 'superset', indices: number[] } | null>(null);
  const dragOverInfo = useRef<{ type: 'item' | 'superset', indices: number[] } | null>(null);
  const [draggedOverIndices, setDraggedOverIndices] = useState<number[] | null>(null);
  
  const [isWeightInputModalOpen, setIsWeightInputModalOpen] = useState(false);
  const [pendingExerciseUpdate, setPendingExerciseUpdate] = useState<WorkoutExercise | null>(null);
  
  const [activeSupersetPlayerId, setActiveSupersetPlayerId] = useState<string | null>(null);

  const collapsedSet = useMemo(() => new Set(collapsedExerciseIds), [collapsedExerciseIds]);
  const collapsedSupersetSet = useMemo(() => new Set(collapsedSupersetIds), [collapsedSupersetIds]);

  useWakeLock(keepScreenAwake || !!activeTimedSet || isReorganizeMode || (!!activeTimerInfo && !activeTimerInfo.isPaused) || !!activeSupersetPlayerId);

  const hasInvalidCompletedSets = useMemo(() => {
    if (!activeWorkout) return false;
    for (const ex of activeWorkout.exercises) {
      const exerciseInfo = getExerciseById(ex.exerciseId);
      const isWeightOptional = exerciseInfo?.category === 'Bodyweight' || 
                             exerciseInfo?.category === 'Assisted Bodyweight' || 
                             exerciseInfo?.category === 'Reps Only' || 
                             exerciseInfo?.category === 'Duration' || 
                             exerciseInfo?.category === 'Cardio';

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
            .map(ex => getExerciseById(ex.exerciseId)?.name || 'Unknown')
      }));
  }, [activeWorkout, getExerciseById]);

  // --- Reorganization Logic ---
  const handleEnterReorganizeMode = () => {
    if (!activeWorkout) return;
    setTempExercises([...activeWorkout.exercises]);
    setIsReorganizeMode(true);
  };

  const handleExitReorganizeMode = (save: boolean) => {
    if (save && activeWorkout) {
      updateActiveWorkout({ ...activeWorkout, exercises: tempExercises });
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
    // Note: We assume contiguous indices for supersets which is guaranteed by grouping logic
    // We need to handle extraction carefully if indices are not sorted, but they should be.
    const sourceIndices = source.indices.sort((a, b) => a - b);
    const removedItems = newExercises.splice(sourceIndices[0], sourceIndices.length);
    
    // Determine insertion index
    // If target is later in the array, we need to adjust index because of splice
    let insertIndex = target.indices[0];
    if (insertIndex > sourceIndices[0]) {
        insertIndex -= sourceIndices.length;
    }
    
    // Logic for adopting Superset ID
    if (source.type === 'item') {
        const targetItem = newExercises[insertIndex] || (insertIndex > 0 ? newExercises[insertIndex-1] : null);
        
        // If target group is a superset, adopt its ID
        if (target.type === 'superset' && targetItem && targetItem.supersetId) {
             removedItems[0].supersetId = targetItem.supersetId;
        } 
        // If target is an item that has a superset ID (dropping inside superset view), adopt it
        else if (target.type === 'item' && targetItem && targetItem.supersetId) {
             removedItems[0].supersetId = targetItem.supersetId;
        }
        // If dropping outside, clear ID?
        // If dropping on a 'single' type target which has no supersetId, clear it
        else if (target.type === 'item' && targetItem && !targetItem.supersetId) {
             delete removedItems[0].supersetId;
        }
    }
    
    newExercises.splice(insertIndex, 0, ...removedItems);
    
    setTempExercises(newExercises);
    dragInfo.current = null;
    dragOverInfo.current = null;
    setDraggedOverIndices(null);
  };

  const handleMoveExercise = (fromIndex: number, toIndex: number) => {
    if (!activeWorkout || toIndex < 0 || toIndex >= activeWorkout.exercises.length) return;
    const newExercises = [...activeWorkout.exercises];
    const [movedItem] = newExercises.splice(fromIndex, 1);
    newExercises.splice(toIndex, 0, movedItem);
    updateActiveWorkout({ ...activeWorkout, exercises: newExercises });
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
        } else if (currentGroupIndex === -1) {
             // Fallback for single items or issues
             // Should not happen if called from SupersetCard
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
  // --- End Reorganization Logic ---
  
  const handleToggleCollapse = (exerciseId: string) => {
    setCollapsedExerciseIds(prevIds => {
      const newSet = new Set(prevIds);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
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

    const updatedExercises = activeWorkout.exercises.filter(ex => ex.id !== exerciseId);
    updateActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
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

    // Intercept completion for bodyweight exercises if user weight is missing
    if (justCompletedSet && (!currentWeight || currentWeight <= 0) && justCompletedSet.weight === 0) {
      const exerciseInfo = getExerciseById(updatedExercise.exerciseId);
      const isBodyweight = exerciseInfo && ['Bodyweight', 'Assisted Bodyweight', 'Plyometrics'].includes(exerciseInfo.category);
      
      if (isBodyweight) {
          setPendingExerciseUpdate(updatedExercise);
          setIsWeightInputModalOpen(true);
          return;
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
    // Note: The SupersetPlayer handles its own timer, so we skip this if playing
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
        } else if (justUncompletedSet && activeTimerInfo && activeTimerInfo.setId === justUncompletedSet.id) {
            setActiveTimerInfo(null);
            cancelTimerNotification('rest-timer-finished');
        }
    }
    
    updateActiveWorkout(workoutToUpdate);
  };

  // Superset Actions
  const handleCreateSuperset = (exerciseId: string) => {
      if (!activeWorkout) return;
      const exerciseIndex = activeWorkout.exercises.findIndex(ex => ex.id === exerciseId);
      if (exerciseIndex === -1) return;

      const newSupersetId = `superset-${Date.now()}`;
      const newSupersetDef = {
          id: newSupersetId,
          name: 'Superset',
          color: 'indigo',
      };

      const updatedExercises = [...activeWorkout.exercises];
      updatedExercises[exerciseIndex] = { ...updatedExercises[exerciseIndex], supersetId: newSupersetId };
      
      // Add new superset ID to collapsed state immediately
      setCollapsedSupersetIds(prev => [...prev, newSupersetId]);

      updateActiveWorkout({
          ...activeWorkout,
          exercises: updatedExercises,
          supersets: { ...activeWorkout.supersets, [newSupersetId]: newSupersetDef }
      });
  };

  const handleJoinSuperset = (exerciseId: string, targetSupersetId: string) => {
      if (!activeWorkout) return;
      const currentExercise = activeWorkout.exercises.find(ex => ex.id === exerciseId);
      if (!currentExercise) return;

      // Remove from current position
      const exercisesWithoutItem = activeWorkout.exercises.filter(ex => ex.id !== exerciseId);
      
      // Find insertion index (after the last exercise of the target superset)
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
          // Should be rare if superset exists, but fallback to append
          finalExercises.push(updatedItem);
      }

      updateActiveWorkout({
          ...activeWorkout,
          exercises: finalExercises
      });
  };

  const handleUngroupSuperset = (supersetId: string) => {
      if (!activeWorkout) return;
      const updatedExercises = activeWorkout.exercises.map(ex => {
          if (ex.supersetId === supersetId) {
              const { supersetId: _, ...rest } = ex;
              return rest;
          }
          return ex;
      });
      
      const updatedSupersets = { ...activeWorkout.supersets };
      delete updatedSupersets[supersetId];
      
      // Remove from collapsed state if present
      setCollapsedSupersetIds(prev => prev.filter(id => id !== supersetId));

      updateActiveWorkout({
          ...activeWorkout,
          exercises: updatedExercises,
          supersets: updatedSupersets
      });
  };

  const handleRenameSuperset = (supersetId: string, newName: string) => {
      if (!activeWorkout || !activeWorkout.supersets) return;
      updateActiveWorkout({
          ...activeWorkout,
          supersets: {
              ...activeWorkout.supersets,
              [supersetId]: { ...activeWorkout.supersets[supersetId], name: newName }
          }
      });
  };

  const handlePlaySuperset = (supersetId: string) => {
      setActiveSupersetPlayerId(supersetId);
  };
  
  const handleWeightModalSave = (weightInKg: number) => {
    logWeight(weightInKg);
    
    if (pendingExerciseUpdate) {
      const adjustedExercise = { ...pendingExerciseUpdate };
      adjustedExercise.sets = adjustedExercise.sets.map(s => {
          if (s.isComplete && s.weight === 0) {
              return { ...s, weight: weightInKg };
          }
          return s;
      });
      
      handleUpdateExercise(adjustedExercise);
      setPendingExerciseUpdate(null);
    }
    
    setIsWeightInputModalOpen(false);
  };


  const handleFinishWorkout = () => {
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
        updateActiveWorkout({ ...activeWorkout, ...updatedDetails });
        setIsDetailsModalOpen(false);
    }
  }
  
  const handleStartTimedSet = (exercise: WorkoutExercise, set: PerformedSet) => {
    setActiveTimedSet({ exercise, set });
  };
  
  const handleFinishTimedSet = () => {
    if (!activeTimedSet || !activeWorkout) return;

    const { exercise, set } = activeTimedSet;
    const updatedExercises = activeWorkout.exercises.map(ex => {
        if (ex.id === exercise.id) {
            return {
                ...ex,
                sets: ex.sets.map(s => s.id === set.id ? { ...s, isComplete: true } : s)
            };
        }
        return ex;
    });
    
    handleUpdateExercise(updatedExercises.find(ex => ex.id === exercise.id)!);
    setActiveTimedSet(null);
  };

  if (!activeWorkout) {
    return <div>{t('active_workout_no_active')}</div>;
  }

  // Rendering logic for grouped exercises
  const exercisesToShow = isReorganizeMode ? tempExercises : activeWorkout.exercises;
  const groupedExercises = groupExercises(exercisesToShow, activeWorkout.supersets);

  const renderExercise = (exercise: WorkoutExercise, index: number) => {
      const exerciseInfo = getExerciseById(exercise.exerciseId);
      const isBeingDraggedOver = draggedOverIndices?.includes(index) && dragInfo.current?.indices[0] !== index;

      return exerciseInfo ? (
          <ExerciseCard
              key={exercise.id}
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
              onCreateSuperset={!exercise.supersetId ? () => handleCreateSuperset(exercise.id) : undefined}
              onJoinSuperset={!exercise.supersetId ? (supersetId) => handleJoinSuperset(exercise.id, supersetId) : undefined}
              availableSupersets={availableSupersets}
          />
      ) : null;
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-20 -mx-2 sm:-mx-4 px-2 sm:px-4 py-2 border-b border-secondary/20">
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
                // Superset Group
                const definition = group.definition || { id: group.supersetId, name: 'Superset', color: 'indigo' };
                const isBeingDraggedOver = draggedOverIndices?.length === group.indices.length && draggedOverIndices.every((val, i) => val === group.indices[i]) && dragInfo.current?.indices[0] !== group.indices[0];

                return (
                    <SupersetCard 
                        key={group.supersetId} 
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
                            onRemoveExercise={handleRemoveExercise}
                            onMoveExercise={handleMoveExercise}
                            onStartTimedSet={handleStartTimedSet}
                            onDragStart={(e, index) => handleDragStart(e, 'item', [index])}
                            onDragEnter={(e, index) => handleDragEnter(e, 'item', [index])}
                            onDragEnd={handleDrop}
                            draggedOverIndex={draggedOverIndices ? draggedOverIndices[0] : null}
                            dragItemIndex={dragInfo.current ? dragInfo.current.indices[0] : null}
                        />
                    </SupersetCard>
                );
            }
        }) : (
          <div className="mx-2 rounded-lg bg-surface px-4 py-10 text-center sm:mx-4">
              <p className="text-lg font-semibold text-text-primary">{t('active_workout_empty_title')}</p>
              <p className="mt-1 text-text-secondary">{t('active_workout_empty_desc')}</p>
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
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              onClick={cancelFinishWorkout}
              className="bg-secondary hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {t('finish_workout_confirm_cancel')}
            </button>
            <button
              onClick={handleDiscardWorkout}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {t('finish_workout_confirm_discard')}
            </button>
            <button
              onClick={confirmFinishWorkout}
              className="bg-success hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed"
              disabled={hasInvalidCompletedSets}
              title={hasInvalidCompletedSets ? t('finish_workout_disabled_tooltip') : undefined}
            >
              {t('finish_workout_confirm_finish')}
            </button>
          </div>
        </div>
      </Modal>

      <WeightInputModal
        isOpen={isWeightInputModalOpen}
        onClose={() => setIsWeightInputModalOpen(false)}
        onSave={handleWeightModalSave}
      />
    </div>
  );
};

export default ActiveWorkoutPage;
