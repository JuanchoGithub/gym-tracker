import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import ExerciseCard from '../components/workout/ExerciseCard';
import { WorkoutExercise, WorkoutSession, PerformedSet } from '../../types';
import { Icon } from '../components/common/Icon';
import WorkoutDetailsModal from '../components/modals/WorkoutDetailsModal';
import ReplaceExerciseModal from '../components/modals/ReplaceExerciseModal';
import ConfirmModal from '../components/modals/ConfirmModal';
import { formatTime } from '../../utils/timeUtils';

const HistoryWorkoutEditorPage: React.FC = () => {
  const { 
    editingHistorySession, 
    endHistoryEdit, 
    getExerciseById, 
    defaultRestTimes 
  } = useContext(AppContext);
  const { t } = useI18n();

  const [workout, setWorkout] = useState<WorkoutSession | null>(() => JSON.parse(JSON.stringify(editingHistorySession)));
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState(false);
  const [isConfirmingBack, setIsConfirmingBack] = useState(false);

  const handleMoveExercise = (fromIndex: number, toIndex: number) => {
    if (!workout || toIndex < 0 || toIndex >= workout.exercises.length) return;
    const newExercises = [...workout.exercises];
    const [movedItem] = newExercises.splice(fromIndex, 1);
    newExercises.splice(toIndex, 0, movedItem);
    setWorkout(prev => prev ? { ...prev, exercises: newExercises } : null);
  };

  const duration = useMemo(() => {
    if (!workout || !workout.startTime) return '00:00:00';
    const endTime = workout.endTime > 0 ? workout.endTime : workout.startTime;
    if (endTime < workout.startTime) return '00:00:00';
    return formatTime(Math.round((endTime - workout.startTime) / 1000));
  }, [workout]);

  if (!workout) {
    endHistoryEdit();
    return null;
  }
  
  const handleUpdateExercise = (updatedExercise: WorkoutExercise) => {
    setWorkout(prevWorkout => {
      if (!prevWorkout) return null;
      const updatedExercises = prevWorkout.exercises.map(ex =>
          ex.id === updatedExercise.id ? updatedExercise : ex
      );
      return { ...prevWorkout, exercises: updatedExercises };
    });
  };
  
  const handleBack = () => {
    if (JSON.stringify(workout) !== JSON.stringify(editingHistorySession)) {
        setIsConfirmingBack(true);
    } else {
        endHistoryEdit();
    }
  };

  const handleConfirmDiscard = () => {
      endHistoryEdit();
      setIsConfirmingBack(false);
  };
  
  const handleSave = () => {
    endHistoryEdit(workout);
  };

  const handleSaveDetails = (updatedDetails: Partial<WorkoutSession>) => {
    setWorkout(prev => prev ? { ...prev, ...updatedDetails } : null);
    setIsDetailsModalOpen(false);
  }

  const handleAddExercise = (exerciseId: string) => {
    if (!workout) return;
    const newWorkoutExercise: WorkoutExercise = {
        id: `we-${Date.now()}-${Math.random()}`,
        exerciseId,
        sets: [
            {
                id: `set-${Date.now()}-${Math.random()}`,
                reps: 0,
                weight: 0,
                type: 'normal',
                isComplete: true, // New sets in history edit should be complete by default
            }
        ],
        restTime: { ...defaultRestTimes },
    };
    setWorkout(prev => prev ? {
        ...prev,
        exercises: [...prev.exercises, newWorkoutExercise],
    } : null);
  };
  
  return (
    <div className="space-y-4">
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-20 -mx-2 sm:-mx-4 px-2 sm:px-4 py-2 border-b border-secondary/20">
          <div className="container mx-auto flex items-center justify-between">
              <button 
                onClick={handleBack} 
                className="p-2 text-text-secondary hover:text-primary"
                aria-label={t('common_cancel')}
              >
                  <Icon name="x" />
              </button>
              <h2 className="text-xl font-bold">{t('history_workout_editor_title')}</h2>
              <button 
                onClick={handleSave} 
                className="bg-success text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-green-400 text-sm"
              >
                  {t('common_save_changes')}
              </button>
          </div>
      </div>
      
      <div className="text-center -mt-2 space-y-1">
        <div className="flex justify-center items-center gap-2 max-w-full mx-auto px-4">
            <h1 className="flex-shrink min-w-0 text-2xl md:text-3xl font-bold truncate">{workout.routineName}</h1>
            <button
                onClick={() => setIsDetailsModalOpen(true)}
                className="text-text-secondary hover:text-primary p-1 flex-shrink-0"
                aria-label={t('active_workout_edit_details_aria')}
            >
                <Icon name="ellipsis" />
            </button>
        </div>
        <p className="text-sm text-text-secondary">
          {new Date(workout.startTime).toLocaleString(undefined, {
              weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
        </p>
      </div>

      <div className="-mx-2 space-y-4 sm:-mx-4">
        {workout.exercises.length > 0 ? workout.exercises.map((exercise, index) => {
          const exerciseInfo = getExerciseById(exercise.exerciseId);
          return exerciseInfo ? (
              // FIX: Added missing properties to the ExerciseCard component to satisfy its required props.
              <ExerciseCard
                  key={exercise.id}
                  workoutExercise={exercise}
                  exerciseInfo={exerciseInfo}
                  onUpdate={handleUpdateExercise}
                  activeTimerInfo={null}
                  onTimerFinish={() => {}}
                  onTimerChange={() => {}}
                  onMoveUp={() => handleMoveExercise(index, index - 1)}
                  onMoveDown={() => handleMoveExercise(index, index + 1)}
                  isMoveUpDisabled={index === 0}
                  isMoveDownDisabled={workout.exercises.length - 1 === index}
                  onReorganize={() => { /* Not implemented on this page */ }}
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
        onClick={() => setIsAddExerciseModalOpen(true)}
        className="w-full flex items-center justify-center space-x-2 bg-secondary/50 text-text-primary font-medium py-3 rounded-lg hover:bg-secondary transition-colors"
      >
        <Icon name="plus" className="w-5 h-5" />
        <span>{t('active_workout_add_exercise')}</span>
      </button>

      {isDetailsModalOpen && workout && (
        <WorkoutDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={() => setIsDetailsModalOpen(false)}
            workout={workout}
            onSave={handleSaveDetails}
        />
      )}

      <ReplaceExerciseModal
        isOpen={isAddExerciseModalOpen}
        onClose={() => setIsAddExerciseModalOpen(false)}
        onSelectExercise={handleAddExercise}
        title={t('active_workout_add_exercise')}
        buttonText={t('common_add')}
      />
      
      <ConfirmModal
          isOpen={isConfirmingBack}
          onClose={() => setIsConfirmingBack(false)}
          onConfirm={handleConfirmDiscard}
          title={t('confirm_discard_title')}
          message={t('confirm_discard_message')}
          confirmText={t('common_discard')}
          cancelText={t('common_cancel')}
          confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default HistoryWorkoutEditorPage;