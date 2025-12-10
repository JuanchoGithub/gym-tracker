
import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { Recommendation } from '../../utils/recommendationUtils';
import { Routine } from '../../types';
import { Icon } from '../common/Icon';

interface PromotionReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    promotion: Recommendation;
    routines: Routine[];
    onApply: (routineIds: string[]) => void;
    onSnooze: (days: number) => void;
}

const PromotionReviewModal: React.FC<PromotionReviewModalProps> = ({ isOpen, onClose, promotion, routines, onApply, onSnooze }) => {
    const { t } = useI18n();
    const [selectedRoutineIds, setSelectedRoutineIds] = useState<Set<string>>(new Set());
    const [isSnoozeMenuOpen, setIsSnoozeMenuOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Select all by default
            setSelectedRoutineIds(new Set(routines.map(r => r.id)));
        }
    }, [isOpen, routines]);

    if (!promotion.promotionData) return null;

    const { fromName, toName } = promotion.promotionData;

    const handleToggle = (id: string) => {
        const newSet = new Set(selectedRoutineIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedRoutineIds(newSet);
    };

    const handleApplyClick = () => {
        onApply(Array.from(selectedRoutineIds));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('promotion_modal_title')}>
            <div className="space-y-6">
                {/* Comparison Header */}
                <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
                    <div className="text-center flex-1">
                        <p className="text-xs text-text-secondary uppercase font-bold tracking-wider">{t('promotion_modal_current')}</p>
                        <p className="text-sm font-bold text-white line-through opacity-70">{fromName}</p>
                    </div>
                    <Icon name="arrow-right" className="w-5 h-5 text-amber-400 mx-2" />
                    <div className="text-center flex-1">
                        <p className="text-xs text-text-secondary uppercase font-bold tracking-wider">{t('promotion_modal_upgrade')}</p>
                        <p className="text-lg font-bold text-amber-300">{toName}</p>
                    </div>
                </div>

                <div className="text-sm text-text-secondary">
                    <p>
                        {t('promotion_modal_desc_part1')} <strong>{fromName}</strong>. {t('promotion_modal_desc_part2')} <strong>{toName}</strong> {t('promotion_modal_desc_part3')}
                    </p>
                </div>

                {/* Routine List */}
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {routines.map(routine => (
                        <div 
                            key={routine.id}
                            onClick={() => handleToggle(routine.id)}
                            className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-all ${
                                selectedRoutineIds.has(routine.id) 
                                    ? 'bg-indigo-500/10 border-indigo-500/50' 
                                    : 'bg-surface border-white/5 opacity-70'
                            }`}
                        >
                            <div className={`w-5 h-5 rounded flex items-center justify-center border ${selectedRoutineIds.has(routine.id) ? 'bg-indigo-500 border-indigo-500' : 'border-white/30'}`}>
                                {selectedRoutineIds.has(routine.id) && <Icon name="check" className="w-3 h-3 text-white" />}
                            </div>
                            <span className="font-medium text-white">{routine.name}</span>
                        </div>
                    ))}
                </div>

                {/* Footer Actions */}
                <div className="flex gap-3 pt-2 border-t border-white/10">
                    <div className="relative">
                        <button 
                            onClick={() => setIsSnoozeMenuOpen(!isSnoozeMenuOpen)}
                            className="bg-surface hover:bg-white/5 text-text-secondary font-bold py-3 px-4 rounded-xl transition-colors border border-white/10 flex items-center gap-2"
                        >
                            <span>{t('promotion_modal_action_snooze')}</span>
                            <Icon name="arrow-down" className={`w-4 h-4 transition-transform ${isSnoozeMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isSnoozeMenuOpen && (
                            <div className="absolute bottom-full mb-2 left-0 w-64 bg-surface border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                                <button onClick={() => { onSnooze(7); setIsSnoozeMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5 border-b border-white/5">
                                    {t('promotion_modal_snooze_1_week')}
                                </button>
                                <button onClick={() => { onSnooze(21); setIsSnoozeMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5">
                                    {t('promotion_modal_snooze_3_weeks')}
                                </button>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={handleApplyClick}
                        className="flex-grow bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-amber-900/20 transition-colors flex items-center justify-center gap-2"
                        disabled={selectedRoutineIds.size === 0}
                    >
                        <Icon name="arrow-up" className="w-4 h-4" />
                        <span>{t('promotion_modal_action_apply')}</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default PromotionReviewModal;
