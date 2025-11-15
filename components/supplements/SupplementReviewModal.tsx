import React from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { SupplementSuggestion } from '../../types';
import { Icon } from '../common/Icon';

interface SupplementReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    suggestions: SupplementSuggestion[];
    onApply: (suggestionId: string) => void;
    onApplyAll: () => void;
    onDismiss: (suggestionId: string) => void;
    onDismissAll: () => void;
}

const SupplementReviewModal: React.FC<SupplementReviewModalProps> = ({ isOpen, onClose, suggestions, onApply, onApplyAll, onDismiss, onDismissAll }) => {
    const { t } = useI18n();

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={t('supplements_review_modal_title')}
            contentClassName="bg-surface rounded-lg shadow-xl w-[calc(100%-1rem)] max-w-lg h-[calc(100%-2rem)] max-h-[600px] m-auto flex flex-col p-4 sm:p-6"
        >
            <div className="flex-grow overflow-y-auto min-h-0 pr-2 space-y-4">
                <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                    <h3 className="font-semibold text-text-primary">{t('supplements_review_analysis_title')}</h3>
                </div>
                {suggestions.length > 0 ? (
                    suggestions.map(suggestion => (
                        <div key={suggestion.id} className="bg-surface border border-secondary/20 p-4 rounded-lg">
                            <h4 className="font-bold text-lg text-primary mb-1">{suggestion.title}</h4>
                            <p className="text-sm text-text-secondary mb-3">{suggestion.reason}</p>
                            <div className="flex gap-2">
                                <button onClick={() => onApply(suggestion.id)} className="flex-1 bg-primary/80 hover:bg-primary text-white font-semibold py-2 px-4 rounded-lg text-sm">
                                    {t('supplements_review_apply')}
                                </button>
                                <button onClick={() => onDismiss(suggestion.id)} className="flex-1 bg-secondary/60 hover:bg-secondary text-white font-semibold py-2 px-4 rounded-lg text-sm">
                                    {t('supplements_review_dismiss_one')}
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10">
                        <Icon name="check" className="w-12 h-12 text-success mx-auto mb-2" />
                        <p className="text-text-secondary">{t('supplements_review_no_suggestions')}</p>
                    </div>
                )}
            </div>

            <div className="flex-shrink-0 pt-4 mt-4 border-t border-secondary/20 flex flex-col sm:flex-row gap-3">
                <button onClick={onDismissAll} className="w-full bg-secondary text-white font-bold py-3 rounded-lg hover:bg-slate-600 transition-colors">
                    {suggestions.length > 0 ? t('supplements_review_dismiss_all') : t('supplements_review_dismiss')}
                </button>
                {suggestions.length > 0 && (
                    <button
                        onClick={onApplyAll}
                        className="w-full bg-success text-white font-bold py-3 rounded-lg hover:bg-green-600 transition-colors"
                    >
                        {t('supplements_review_apply_all')}
                    </button>
                )}
            </div>
        </Modal>
    );
};

export default SupplementReviewModal;