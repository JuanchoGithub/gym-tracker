
import React, { useState } from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { useMeasureUnit } from '../../hooks/useWeight';
import { convertCmToFtIn, convertFtInToCm } from '../../utils/weightUtils';
import { TranslationKey } from '../../contexts/I18nContext';

interface WeightInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (weightInKg: number) => void;
}

const WeightInputModal: React.FC<WeightInputModalProps> = ({ isOpen, onClose, onSave }) => {
    const { t } = useI18n();
    const { measureUnit, getStoredWeight, weightUnit } = useMeasureUnit();
    const [weightInput, setWeightInput] = useState('');

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const weight = parseFloat(weightInput);
        if (isNaN(weight) || weight <= 0) return;
        
        const weightInKg = getStoredWeight(weight);
        onSave(weightInKg);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('weight_input_modal_title')}>
            <form onSubmit={handleSave} className="space-y-6">
                <p className="text-text-secondary">{t('weight_input_modal_message')}</p>
                
                <div className="relative">
                    <input
                        type="number"
                        step="0.1"
                        value={weightInput}
                        onChange={(e) => setWeightInput(e.target.value)}
                        className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-3 pr-12 text-xl text-center focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        placeholder="0.0"
                        autoFocus
                        required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary font-bold">
                        {t(`workout_${weightUnit}` as TranslationKey)}
                    </span>
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
