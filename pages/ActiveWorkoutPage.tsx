
import React, { useContext, useState, useMemo, useRef } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useI18n } from '../hooks/useI18n';
import ExerciseCard from '../components/workout/ExerciseCard';
import { WorkoutExercise, WorkoutSession, PerformedSet } from '../types';
import { useWorkoutTimer } from '../hooks/useWorkoutTimer';
import { Icon } from '../components/common/Icon';
import WorkoutDetailsModal from '../components/modals/WorkoutDetailsModal';
import Modal from '../components/common/Modal';
import { useWakeLock } from '../hooks/useWakeLock';
import { cancelTimerNotification } from '../services/notificationService';
import TimedSetTimerModal from '../components/modals/TimedSetTimerModal';
import WorkoutRestTimer from '../components/workout/WorkoutRestTimer';
import { getTimerDuration } from '../utils/workoutUtils';
import WeightInputModal from '../components/modals/WeightInputModal';

const ActiveWorkoutPage: React.FC = () => {
  // FIX: Destructured `startAddExercisesToWorkout` from AppContext.
  const { activeWorkout, updateActiveWorkout, endWorkout, discardActiveWorkout, getExerciseById, minimizeWorkout, keepScreenAwake, activeTimerInfo, setActiveTimerInfo, startAddExercisesToWorkout, collapsedExerciseIds, setCollapsedExerciseIds, currentWeight, logWeight } = useContext(AppContext);
  const { t } = useI18n();
  const elapsedTime = useWorkoutTimer(activeWorkout?.startTime);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isConfirmingFinish, setIsConfirmingFinish] = useState(false);
  const [activeTimedSet, setActiveTimedSet] = useState<{ exercise: WorkoutExercise; set: PerformedSet } | null>(null);
  
  const [isReorganizeMode, setIsReorganizeMode] = useState(false);
  const [tempExercises, setTempExercises] = useState<WorkoutExercise[]>([]);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  
  const [isWeightInputModalOpen, setIsWeightInputModalOpen] = useState(false);
  const [pendingExerciseUpdate, setPendingExerciseUpdate] = useState<WorkoutExercise | null>(null);


  const collapsedSet = useMemo(() => new Set(collapsedExerciseIds), [collapsedExerciseIds]);

  useWakeLock(keepScreenAwake || !!activeTimedSet || isReorganizeMode || (!!activeTimerInfo && !activeTimerInfo.isPaused));

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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
  };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
    setDraggedOverIndex(position);
  };

  const handleDrop = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const newExercises = [...tempExercises];
    const dragItemContent = newExercises.splice(dragItem.current, 1)[0];
    newExercises.splice(dragOverItem.current, 0, dragItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setDraggedOverIndex(null);
    setTempExercises(newExercises);
  };

  const handleMoveExercise = (fromIndex: number, toIndex: number) => {
    if (!activeWorkout || toIndex < 0 || toIndex >= activeWorkout.exercises.length) return;
    const newExercises = [...activeWorkout.exercises];
    const [movedItem] = newExercises.splice(fromIndex, 1);
    newExercises.splice(toIndex, 0, movedItem);
    updateActiveWorkout({ ...activeWorkout, exercises: newExercises });
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
  };
  
  const handleWeightModalSave = (weightInKg: number) => {
    logWeight(weightInKg);
    
    if (pendingExerciseUpdate) {
      const adjustedExercise = { ...pendingExerciseUpdate };
      // Update any recently completed sets that had 0 weight to the new weight
      adjustedExercise.sets = adjustedExercise.sets.map(s => {
          // Check if it is complete and weight is 0 (or essentially 0)
          // Use a small epsilon just in case, though exact 0 is expected
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
    // No need to close modal, component will unmount
  };

  const cancelFinishWorkout = () => {
    setIsConfirmingFinish(false);
  };

  const handleDiscardWorkout = () => {
    discardActiveWorkout();
    // Component will unmount, no need to close modal
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
    
    // This will trigger the rest timer logic
    handleUpdateExercise(updatedExercises.find(ex => ex.id === exercise.id)!);
    
    setActiveTimedSet(null);
  };

  if (!activeWorkout) {
    return <div>{t('active_workout_no_active')}</div>;
  }

  const exercisesToShow = isReorganizeMode ? tempExercises : activeWorkout.exercises;
  
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
        {exercisesToShow.length > 0 ? exercisesToShow.map((exercise, index) => {
          const exerciseInfo = getExerciseById(exercise.exerciseId);
          return exerciseInfo ? (
              <ExerciseCard
                  key={exercise.id}
                  workoutExercise={exercise}
                  exerciseInfo={exerciseInfo}
                  onUpdate={handleUpdateExercise}
                  onStartTimedSet={handleStartTimedSet}
                  isReorganizeMode={isReorganizeMode}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDrop}
                  onMoveUp={() => handleMoveExercise(index, index - 1)}
                  onMoveDown={() => handleMoveExercise(index, index + 1)}
                  isMoveUpDisabled={index === 0}
                  isMoveDownDisabled={index === exercisesToShow.length - 1}
                  onReorganize={handleEnterReorganizeMode}
                  isBeingDraggedOver={draggedOverIndex === index && dragItem.current !== index}
                  isCollapsed={collapsedSet.has(exercise.id)}
                  onToggleCollapse={() => handleToggleCollapse(exercise.id)}
              />
          ) : null;
        }) : (
          <div className="mx-2 rounded-lg bg-surface px-4 py-10 text-center sm:mx-4">
              <p className="text-lg font-semibold text-text-primary">{t('active_workout_empty_title')}</p>
              <p className="mt-1 text-text-secondary">{t('active_workout_empty_desc')}</p>
          </div>
        )}
      </div>
      
      <button
        onClick={startAddExercisesToWorkout}
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
