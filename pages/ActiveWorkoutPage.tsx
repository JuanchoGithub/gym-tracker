
import React, { useContext, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useI18n } from '../hooks/useI18n';
import ExerciseCard from '../components/workout/ExerciseCard';
import { WorkoutExercise, WorkoutSession } from '../types';
import { useWorkoutTimer } from '../hooks/useWorkoutTimer';
import { Icon } from '../components/common/Icon';
import WorkoutDetailsModal from '../components/modals/WorkoutDetailsModal';
import Modal from '../components/common/Modal';

const ActiveWorkoutPage: React.FC = () => {
  const { activeWorkout, updateActiveWorkout, endWorkout, getExerciseById, minimizeWorkout } = useContext(AppContext);
  const { t } = useI18n();
  const elapsedTime = useWorkoutTimer(activeWorkout?.startTime);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isConfirmingFinish, setIsConfirmingFinish] = useState(false);

  const handleUpdateExercise = (updatedExercise: WorkoutExercise) => {
    if (activeWorkout) {
      const updatedExercises = activeWorkout.exercises.map(ex =>
        ex.id === updatedExercise.id ? updatedExercise : ex
      );
      updateActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
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

  const handleSaveDetails = (updatedDetails: Partial<WorkoutSession>) => {
    if (activeWorkout) {
        updateActiveWorkout({ ...activeWorkout, ...updatedDetails });
        setIsDetailsModalOpen(false);
    }
  }

  if (!activeWorkout) {
    return <div>No active workout.</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-20 -mx-4 px-4 py-2 border-b border-secondary/20">
          <div className="container mx-auto flex items-center justify-between">
              <button 
                onClick={minimizeWorkout} 
                className="p-2 text-text-secondary hover:text-primary"
                aria-label="Minimize workout"
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
                aria-label="Edit workout details"
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

      {activeWorkout.exercises.map(exercise => {
        const exerciseInfo = getExerciseById(exercise.exerciseId);
        return exerciseInfo ? (
            <ExerciseCard
                key={exercise.id}
                workoutExercise={exercise}
                exerciseInfo={exerciseInfo}
                onUpdate={handleUpdateExercise}
            />
        ) : null;
      })}

      {isDetailsModalOpen && activeWorkout && (
        <WorkoutDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={() => setIsDetailsModalOpen(false)}
            workout={activeWorkout}
            onSave={handleSaveDetails}
        />
      )}

      <Modal
        isOpen={isConfirmingFinish}
        onClose={cancelFinishWorkout}
        title={t('finish_workout_confirm_title')}
      >
        <div className="space-y-6">
          <p className="text-text-secondary">{t('finish_workout_confirm_message')}</p>
          <div className="flex justify-end space-x-4">
            <button
              onClick={cancelFinishWorkout}
              className="bg-secondary hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {t('finish_workout_confirm_cancel')}
            </button>
            <button
              onClick={confirmFinishWorkout}
              className="bg-success hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
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
