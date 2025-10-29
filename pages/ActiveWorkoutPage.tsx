import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useI18n } from '../hooks/useI18n';
import ExerciseCard from '../components/workout/ExerciseCard';
import { WorkoutExercise, WorkoutSession, PerformedSet } from '../types';
import { useWorkoutTimer } from '../hooks/useWorkoutTimer';
import { Icon } from '../components/common/Icon';
import WorkoutDetailsModal from '../components/modals/WorkoutDetailsModal';
import Modal from '../components/common/Modal';
import { useWakeLock } from '../hooks/useWakeLock';
import { scheduleTimerNotification, cancelTimerNotification } from '../services/notificationService';
import TimedSetTimerModal from '../components/modals/TimedSetTimerModal';

const ActiveWorkoutPage: React.FC = () => {
  const { activeWorkout, updateActiveWorkout, endWorkout, discardActiveWorkout, getExerciseById, minimizeWorkout, keepScreenAwake, enableNotifications, startAddExercisesToWorkout } = useContext(AppContext);
  const { t } = useI18n();
  const elapsedTime = useWorkoutTimer(activeWorkout?.startTime);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isConfirmingFinish, setIsConfirmingFinish] = useState(false);
  const [activeTimerInfo, setActiveTimerInfo] = useState<{ exerciseId: string; setId: string; startTime: number } | null>(null);
  const [activeTimedSet, setActiveTimedSet] = useState<{ exercise: WorkoutExercise; set: PerformedSet } | null>(null);
  
  useWakeLock(keepScreenAwake || !!activeTimedSet);

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

  const getTimerDuration = (set: PerformedSet, workoutExercise: WorkoutExercise): number => {
    if (set.rest !== undefined && set.rest !== null) return set.rest;
    const restTime = workoutExercise.restTime;
    switch (set.type) {
        case 'warmup': return restTime.warmup;
        case 'drop': return restTime.drop;
        case 'timed': return restTime.timed;
        default: return restTime.normal;
    }
  };

  const handleUpdateExercise = (updatedExercise: WorkoutExercise) => {
    if (!activeWorkout) return;

    const originalExercise = activeWorkout.exercises.find(ex => ex.id === updatedExercise.id);
    if (!originalExercise) return;

    let justCompletedSet: PerformedSet | null = null;
    let justUncompletedSet: PerformedSet | null = null;
    for (const updatedSet of updatedExercise.sets) {
        const originalSet = originalExercise.sets.find(s => s.id === updatedSet.id);
        if (originalSet && !originalSet.isComplete && updatedSet.isComplete) {
            justCompletedSet = updatedSet;
            break;
        }
        if (originalSet && originalSet.isComplete && !updatedSet.isComplete) {
            justUncompletedSet = updatedSet;
            break;
        }
    }

    let workoutToUpdate = { ...activeWorkout };

    // Stop the old timer if a new one is starting
    if (justCompletedSet && activeTimerInfo) {
        const elapsedSeconds = Math.round((Date.now() - activeTimerInfo.startTime) / 1000);
        
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
        setActiveTimerInfo({
            exerciseId: updatedExercise.id,
            setId: justCompletedSet.id,
            startTime: Date.now(),
        });
        if (enableNotifications) {
            const exerciseInfo = getExerciseById(updatedExercise.exerciseId);
            const timerDuration = getTimerDuration(justCompletedSet, updatedExercise);
            if (timerDuration > 0 && exerciseInfo) {
                scheduleTimerNotification(timerDuration, t('notification_timer_finished_title'), {
                    body: t('notification_timer_finished_body', { exercise: exerciseInfo.name }),
                    icon: '/icon-192x192.png',
                    tag: 'rest-timer-finished',
                    requireInteraction: true,
                });
            }
        }
    } else if (justUncompletedSet && activeTimerInfo && activeTimerInfo.setId === justUncompletedSet.id) {
        setActiveTimerInfo(null);
        cancelTimerNotification('rest-timer-finished');
    }
    
    updateActiveWorkout(workoutToUpdate);
  };
  
  const handleTimerFinish = (finishedExerciseId: string, finishedSetId: string) => {
    if (activeWorkout && activeTimerInfo && activeTimerInfo.exerciseId === finishedExerciseId && activeTimerInfo.setId === finishedSetId) {
        const elapsedSeconds = Math.round((Date.now() - activeTimerInfo.startTime) / 1000);

        const updatedExercises = activeWorkout.exercises.map(ex => {
            if (ex.id === finishedExerciseId) {
                return {
                    ...ex,
                    sets: ex.sets.map(s => s.id === finishedSetId ? { ...s, actualRest: elapsedSeconds } : s)
                };
            }
            return ex;
        });

        updateActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
        setActiveTimerInfo(null);
    }
  };

  const handleTimerChange = (newDuration: number, exerciseName: string) => {
    if (enableNotifications) {
        scheduleTimerNotification(newDuration, t('notification_timer_finished_title'), {
            body: t('notification_timer_finished_body', { exercise: exerciseName }),
            icon: '/icon-192x192.png',
            tag: 'rest-timer-finished',
            requireInteraction: true,
        });
    }
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
  
  return (
    <div className="space-y-4">
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-20 -mx-2 sm:-mx-4 px-2 sm:px-4 py-2 border-b border-secondary/20">
          <div className="container mx-auto flex items-center justify-between">
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
        {activeWorkout.exercises.length > 0 ? activeWorkout.exercises.map(exercise => {
          const exerciseInfo = getExerciseById(exercise.exerciseId);
          return exerciseInfo ? (
              <ExerciseCard
                  key={exercise.id}
                  workoutExercise={exercise}
                  exerciseInfo={exerciseInfo}
                  onUpdate={handleUpdateExercise}
                  activeTimerInfo={activeTimerInfo}
                  onTimerFinish={handleTimerFinish}
                  onTimerChange={handleTimerChange}
                  onStartTimedSet={handleStartTimedSet}
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
            restTime={getTimerDuration(activeTimedSet.set, activeTimedSet.exercise)}
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
    </div>
  );
};

export default ActiveWorkoutPage;