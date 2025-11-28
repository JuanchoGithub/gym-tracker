
import React, { useContext, useState } from 'react';
import { Routine, Exercise } from '../../types';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import Modal from '../common/Modal';
import { Icon } from '../common/Icon';
import ExerciseDetailModal from '../exercise/ExerciseDetailModal';
import { getBodyPartTKey, getCategoryTKey } from '../../utils/i18nUtils';
import { getBodyPartColor, getCategoryColor } from '../../utils/colorUtils';

interface RoutinePreviewModalProps {
  routine: Routine;
  isOpen: boolean;
  onClose: () => void;
  onStart: (routine: Routine) => void;
  actionLabel?: string;
  description?: string;
}

const RoutinePreviewModal: React.FC<RoutinePreviewModalProps> = ({ routine, isOpen, onClose, onStart, actionLabel, description }) => {
  const { getExerciseById } = useContext(AppContext);
  const { t } = useI18n();
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen && !viewingExercise} onClose={onClose} title={routine.name}>
        <div className="flex flex-col h-full max-h-[60vh]">
          <p className="text-text-secondary mb-4 flex-shrink-0">{description || routine.description}</p>

          <div className="flex-grow space-y-3 overflow-y-auto pr-2" style={{ overscrollBehaviorY: 'contain' }}>
            <h4 className="font-semibold text-lg">{t('routine_preview_exercises')}</h4>
            {routine.exercises.map((ex) => {
              const exerciseInfo = getExerciseById(ex.exerciseId);
              if (!exerciseInfo) return null;
              
              const normalSetsCount = ex.sets.filter(s => s.type === 'normal').length;

              return (
                <div key={ex.id} className="bg-slate-900/50 p-3 rounded flex justify-between items-center">
                  <div>
                    <p className="font-bold text-text-primary">{exerciseInfo.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-sm text-text-secondary">{normalSetsCount} {t('workout_sets')}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getBodyPartColor(exerciseInfo.bodyPart)}`}>{t(getBodyPartTKey(exerciseInfo.bodyPart))}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(exerciseInfo.category)}`}>{t(getCategoryTKey(exerciseInfo.category))}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingExercise(exerciseInfo)}
                    className="p-2 text-text-secondary hover:text-primary transition-colors flex-shrink-0"
                    aria-label={t('routine_preview_view_exercise_details')}
                  >
                    <Icon name="question-mark-circle" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex-shrink-0">
            <button
              onClick={() => onStart(routine)}
              className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition-colors"
            >
              {actionLabel || t('routine_preview_start_workout')}
            </button>
          </div>
        </div>
      </Modal>

      {viewingExercise && (
        <ExerciseDetailModal
          isOpen={!!viewingExercise}
          onClose={() => setViewingExercise(null)}
          exercise={viewingExercise}
        />
      )}
    </>
  );
};

export default RoutinePreviewModal;
