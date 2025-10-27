import React from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  confirmButtonClass = 'bg-primary hover:bg-sky-600',
}) => {
  const { t } = useI18n();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-text-secondary">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="bg-secondary hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {cancelText || t('common_cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={`${confirmButtonClass} text-white font-bold py-2 px-4 rounded-lg transition-colors`}
          >
            {confirmText || t('common_confirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;