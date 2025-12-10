
import React, { useState } from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { useMeasureUnit } from '../../hooks/useWeight';
import { Icon } from '../common/Icon';
import { TranslationKey } from '../../contexts/I18nContext';

interface UpgradeExerciseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (weight: number) => void;
    currentName: string;
    targetName: string;
    suggestedWeight: number;
}

const UpgradeExerciseModal: React.FC<UpgradeExerciseModalProps> = ({ 
    isOpen, onClose, onConfirm, currentName, targetName, suggestedWeight 
}) => {
    const { t } = useI18n();
    const { displayWeight, getStoredWeight, weightUnit } = useMeasureUnit();
    // Initialize with suggested weight
    const [weightInput, setWeightInput] = useState(displayWeight(suggestedWeight));

    const handleConfirm = () => {
        const val = parseFloat(weightInput);
        if (!isNaN(val)) {
            onConfirm(getStoredWeight(val));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleConfirm();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('promotion_modal_title')}>
            <div className="space-y-6">
                 {/* Visual Header */}
                 <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-6 text-center shadow-lg">
                    <div className="flex justify-center items-center gap-4 mb-3">
                        <div className="bg-surface/50 px-3 py-1.5 rounded-lg text-xs font-bold text-text-secondary line-through opacity-70 border border-white/5">
                            {currentName}
                        </div>
                        <Icon name="arrow-right" className="w-5 h-5 text-amber-400" />
                        <div className="bg-surface px-4 py-2 rounded-lg text-sm font-bold text-white border border-amber-500/50 shadow-sm">
                            {targetName}
                        </div>
                    </div>
                    <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-500/30">
                        <Icon name="trophy" className="w-3 h-3" />
                        {t('promotion_modal_level_up')}
                    </div>
                 </div>

                 <p className="text-text-secondary text-sm text-center">
                    {t('promotion_modal_desc_part2')} <strong>{targetName}</strong>. 
                    <br/>
                    {t('promotion_modal_reset_warning')}
                 </p>

                 <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                     <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 text-center">
                        {t('promotion_modal_starting_weight')} ({t(`workout_${weightUnit}` as TranslationKey)})
                     </label>
                     <input 
                        type="number"
                        value={weightInput}
                        onChange={(e) => setWeightInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-surface border border-white/10 rounded-xl p-4 text-center text-3xl font-bold text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all font-mono"
                        autoFocus
                     />
                 </div>

                 <div className="flex gap-3">
                     <button onClick={onClose} className="flex-1 bg-surface hover:bg-white/5 text-text-secondary font-bold py-3 rounded-xl transition-colors">
                        {t('common_cancel')}
                     </button>
                     <button onClick={handleConfirm} className="flex-[2] bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-amber-900/20 transition-colors flex items-center justify-center gap-2">
                        <Icon name="arrow-up" className="w-5 h-5" />
                        {t('promotion_modal_upgrade')}
                     </button>
                 </div>
            </div>
        </Modal>
    );
};

export default UpgradeExerciseModal;
