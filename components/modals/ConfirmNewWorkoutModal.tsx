import React from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';

interface ConfirmNewWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartNew: () => void;
  onContinue: () => void;
}

const ConfirmNewWorkoutModal: React.FC<ConfirmNewWorkoutModalProps> = ({
  isOpen,
  onClose,
  onStartNew,
  onContinue,
}) => {
  const { t } = useI18n();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('confirm_new_workout_title')}>
      <div className="space-y-6">
        <p className="text-text-secondary">{t('confirm_new_workout_message')}</p>
        <div className="flex flex-col space-y-3">
          <button
            onClick={onStartNew}
            className="w-full bg-warning/80 hover:bg-warning text-background font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {t('confirm_new_workout_start_new')}
          </button>
          <button
            onClick={onContinue}
            className="w-full bg-primary hover:bg-sky-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {t('confirm_new_workout_continue')}
          </button>
          <button
            onClick={onClose}
            className="w-full bg-secondary hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {t('confirm_new_workout_cancel')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmNewWorkoutModal;
