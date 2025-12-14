
import React, { useContext } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { AppContext } from '../../contexts/AppContext';
import { ActiveWorkoutContext } from '../../contexts/ActiveWorkoutContext';
import { TimerContext } from '../../contexts/TimerContext';
import WorkoutDetailsModal from '../modals/WorkoutDetailsModal';
import TimedSetTimerModal from '../modals/TimedSetTimerModal';
import SupersetPlayer from '../workout/SupersetPlayer';
import Modal from '../common/Modal';
import WeightInputModal from '../modals/WeightInputModal';
import ExerciseDetailModal from '../exercise/ExerciseDetailModal';
import RoutinePreviewModal from '../modals/RoutinePreviewModal';
import OnboardingWizard from '../onboarding/OnboardingWizard';
import UpgradeExerciseModal from '../modals/UpgradeExerciseModal';
import { useExerciseName } from '../../hooks/useExerciseName';

interface WorkoutModalManagerProps {
  modals: {
    isDetailsModalOpen: boolean;
    isConfirmingFinish: boolean;
    isValidationErrorOpen: boolean;
    validationErrors: string[];
    viewingExercise: any;
    isOnboardingOpen: boolean;
    isWeightInputModalOpen: boolean;
    weightModalDefaults: any;
    suggestedRoutine: any;
    upgradeCandidate: any;
  };
  actions: {
    closeDetails: () => void;
    closeFinishConfirm: () => void;
    closeValidationError: () => void;
    closeViewingExercise: () => void;
    closeOnboarding: () => void;
    closeWeightInput: () => void;
    closeSuggestedRoutine: () => void;
    closeUpgradeCandidate: () => void;
    
    handleSaveDetails: (details: any) => void;
    handleDiscardWorkout: () => void;
    confirmFinishWorkout: () => void;
    handleFinishTimedSet: () => void;
    handleCloseSupersetPlayer: () => void;
    handleWeightModalSave: (bw: number, total: number) => void;
    handleAcceptSuggestion: () => void;
    handleOnboardingComplete: (routines: any) => void;
    handleConfirmUpgrade: (weight: number) => void;
    
    handleUpdateExercise: (ex: any) => void;
    handleUpdateExercises: (exs: any) => void;
  };
  activeSupersetPlayerId: string | null;
  activeTimedSet: any;
}

const WorkoutModalManager: React.FC<WorkoutModalManagerProps> = ({
  modals,
  actions,
  activeSupersetPlayerId,
  activeTimedSet,
}) => {
  const { t } = useI18n();
  const { activeWorkout } = useContext(ActiveWorkoutContext);
  const { setActiveTimedSet } = useContext(TimerContext);
  const { getExerciseById } = useContext(AppContext);
  const getName = useExerciseName();

  return (
    <>
      {modals.isDetailsModalOpen && activeWorkout && (
        <WorkoutDetailsModal
            isOpen={modals.isDetailsModalOpen}
            onClose={actions.closeDetails}
            workout={activeWorkout}
            onSave={actions.handleSaveDetails}
        />
      )}

      {activeTimedSet && (
        <TimedSetTimerModal
            isOpen={!!activeTimedSet}
            onFinish={actions.handleFinishTimedSet}
            // @ts-ignore
            onClose={() => setActiveTimedSet(null)}
            set={activeTimedSet.set}
            restTime={activeTimedSet.exercise.restTime.timed}
            exerciseName={getExerciseById(activeTimedSet.exercise.exerciseId)?.name || ''}
            isUnilateral={getExerciseById(activeTimedSet.exercise.exerciseId)?.isUnilateral}
        />
      )}

      {activeSupersetPlayerId && activeWorkout && (
          <SupersetPlayer 
             supersetId={activeSupersetPlayerId}
             supersetName={activeWorkout?.supersets?.[activeSupersetPlayerId]?.name || 'Superset'}
             exercises={activeWorkout?.exercises.filter(ex => ex.supersetId === activeSupersetPlayerId) || []}
             onUpdateExercise={actions.handleUpdateExercise}
             onUpdateExercises={actions.handleUpdateExercises}
             onClose={actions.handleCloseSupersetPlayer}
          />
      )}

      <Modal
        isOpen={modals.isConfirmingFinish}
        onClose={actions.closeFinishConfirm}
        title={t('finish_workout_confirm_title')}
      >
        <div className="space-y-6">
          <p className="text-text-secondary">{t('finish_workout_confirm_message')}</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={actions.handleDiscardWorkout}
              className="bg-red-600/20 text-red-500 border border-red-600/50 hover:bg-red-600 hover:text-white font-bold py-4 px-4 rounded-xl transition-all"
            >
              {t('finish_workout_confirm_discard')}
            </button>
            <button
              onClick={actions.confirmFinishWorkout}
              className="bg-success hover:bg-green-600 text-white font-bold py-4 px-4 rounded-xl transition-colors shadow-lg shadow-green-500/20"
            >
              {t('finish_workout_confirm_finish')}
            </button>
          </div>
          <button
              onClick={actions.closeFinishConfirm}
              className="w-full text-text-secondary hover:text-white font-medium py-3 px-4 rounded-lg transition-colors hover:bg-white/5"
          >
              {t('finish_workout_confirm_cancel')}
          </button>
        </div>
      </Modal>

      <Modal isOpen={modals.isValidationErrorOpen} onClose={actions.closeValidationError} title={t('workout_validation_error_title')}>
          <div className="space-y-4">
              <p className="text-text-secondary">{t('workout_validation_error_msg')}</p>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 max-h-60 overflow-y-auto custom-scrollbar">
                  <ul className="list-disc list-inside space-y-2 text-sm text-red-300">
                      {modals.validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                      ))}
                  </ul>
              </div>
              <button 
                  onClick={actions.closeValidationError} 
                  className="w-full bg-surface hover:bg-white/10 text-white font-bold py-3 rounded-lg transition-colors"
              >
                  {t('common_close')}
              </button>
          </div>
      </Modal>

      <WeightInputModal
        isOpen={modals.isWeightInputModalOpen}
        onClose={actions.closeWeightInput}
        onSave={actions.handleWeightModalSave}
        initialBodyWeight={modals.weightModalDefaults.bodyWeight}
        initialExtraWeight={modals.weightModalDefaults.extraWeight}
      />
      
      {modals.viewingExercise && (
        <ExerciseDetailModal
          isOpen={!!modals.viewingExercise}
          onClose={actions.closeViewingExercise}
          exercise={modals.viewingExercise}
        />
      )}

      {modals.suggestedRoutine && (
          <RoutinePreviewModal 
            isOpen={!!modals.suggestedRoutine}
            onClose={actions.closeSuggestedRoutine}
            routine={modals.suggestedRoutine.routine}
            onStart={actions.handleAcceptSuggestion}
            actionLabel={t('active_workout_accept_suggestion')}
            description={modals.suggestedRoutine.description || (modals.suggestedRoutine.isFallback 
                ? t('active_workout_suggestion_reason_start') 
                : t('active_workout_suggestion_reason', { focus: modals.suggestedRoutine.focus })
            )}
          />
      )}

      {modals.isOnboardingOpen && (
          <OnboardingWizard 
             onClose={actions.closeOnboarding}
             onComplete={actions.handleOnboardingComplete}
          />
      )}

      {modals.upgradeCandidate && (
          <UpgradeExerciseModal 
            isOpen={!!modals.upgradeCandidate}
            onClose={actions.closeUpgradeCandidate}
            currentName={getName(getExerciseById(modals.upgradeCandidate.workoutExercise.exerciseId))}
            targetName={getName(modals.upgradeCandidate.targetExercise)}
            suggestedWeight={modals.upgradeCandidate.suggestedWeight}
            onConfirm={actions.handleConfirmUpgrade}
          />
      )}
    </>
  );
};

export default WorkoutModalManager;
