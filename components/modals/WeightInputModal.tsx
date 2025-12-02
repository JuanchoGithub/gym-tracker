
import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { useMeasureUnit } from '../../hooks/useWeight';
import { TranslationKey } from '../../contexts/I18nContext';

interface WeightInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bodyWeightKg: number, totalLoadKg: number) => void;
  initialBodyWeight?: number;
  initialExtraWeight?: number;
}

const WeightInputModal: React.FC<WeightInputModalProps> = ({ isOpen, onClose, onSave, initialBodyWeight, initialExtraWeight }) => {
    const { t } = useI18n();
    const { measureUnit, getStoredWeight, displayWeight, weightUnit } = useMeasureUnit();
    
    const [bodyWeightInput, setBodyWeightInput] = useState('');
    const [extraWeightInput, setExtraWeightInput] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Pre-fill values if provided. Convert stored kg to display unit if necessary.
            if (initialBodyWeight) {
                setBodyWeightInput(displayWeight(initialBodyWeight));
            } else {
                setBodyWeightInput('');
            }

            if (initialExtraWeight) {
                setExtraWeightInput(displayWeight(initialExtraWeight));
            } else {
                setExtraWeightInput('');
            }
        }
    }, [isOpen, initialBodyWeight, initialExtraWeight, displayWeight]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const bw = parseFloat(bodyWeightInput);
        const extra = parseFloat(extraWeightInput) || 0;

        if (isNaN(bw) || bw <= 0) {
            alert("Please enter a valid bodyweight.");
            return;
        }
        
        const bwKg = getStoredWeight(bw);
        const extraKg = getStoredWeight(extra);
        const totalKg = bwKg + extraKg;

        onSave(bwKg, totalKg);
    };

    // Calculate preview of total
    const currentBw = parseFloat(bodyWeightInput) || 0;
    const currentExtra = parseFloat(extraWeightInput) || 0;
    const totalDisplay = currentBw + currentExtra;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('weight_input_modal_title')}>
            <form onSubmit={handleSave} className="space-y-6">
                <p className="text-text-secondary text-sm">{t('weight_input_modal_message')}</p>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                            {t('profile_weight')} ({t(`workout_${weightUnit}` as TranslationKey)})
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={bodyWeightInput}
                            onChange={(e) => setBodyWeightInput(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-3 text-xl font-bold text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            placeholder="e.g. 75"
                            autoFocus
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                            Extra / Assisted (+/-)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={extraWeightInput}
                            onChange={(e) => setExtraWeightInput(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-3 text-lg text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            placeholder="0"
                        />
                        <p className="text-[10px] text-text-secondary/60 mt-1">
                            Use negative numbers (e.g. -20) for assisted machines.
                        </p>
                    </div>

                    <div className="bg-surface-highlight/30 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                        <span className="text-sm font-semibold text-text-secondary">Total Effective Load:</span>
                        <span className="text-xl font-mono font-bold text-primary">
                            {totalDisplay.toFixed(1)} {t(`workout_${weightUnit}` as TranslationKey)}
                        </span>
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-text-secondary hover:bg-white/5 transition-colors"
                    >
                        {t('common_cancel')}
                    </button>
                    <button
                        type="submit"
                        className="bg-primary text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:bg-sky-500 transition-colors"
                    >
                        {t('weight_input_save')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default WeightInputModal;
