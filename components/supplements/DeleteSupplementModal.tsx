import React from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { SupplementPlanItem } from '../../types';

interface DeleteSupplementModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: SupplementPlanItem;
    onSetTrainingOnly: () => void;
    onSetRestOnly: () => void;
    onRemoveCompletely: () => void;
}

const DeleteSupplementModal: React.FC<DeleteSupplementModalProps> = ({ isOpen, onClose, item, onSetTrainingOnly, onSetRestOnly, onRemoveCompletely }) => {
    const { t } = useI18n();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('supplements_delete_confirm_title')}>
            <div className="space-y-4">
                <p className="text-text-secondary">{t('supplements_delete_complex_message', { supplementName: item.supplement })}</p>
                <div className="flex flex-col space-y-3">
                    <button onClick={onSetTrainingOnly} className="w-full bg-surface hover:bg-slate-700 text-text-primary font-bold py-3 px-4 rounded-lg transition-colors">
                        {t('supplements_delete_option_rest_only')}
                    </button>
                    <button onClick={onSetRestOnly} className="w-full bg-surface hover:bg-slate-700 text-text-primary font-bold py-3 px-4 rounded-lg transition-colors">
                        {t('supplements_delete_option_training_only')}
                    </button>
                    <button onClick={onRemoveCompletely} className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-400 font-bold py-3 px-4 rounded-lg transition-colors">
                        {t('supplements_delete_option_completely')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default DeleteSupplementModal;