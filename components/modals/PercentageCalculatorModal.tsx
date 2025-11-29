
import React, { useState, useMemo } from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { useMeasureUnit } from '../../hooks/useWeight';
import { TranslationKey } from '../../contexts/I18nContext';

interface PercentageCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  oneRepMax: number; // in kg
  onApplyToWorkout?: (percentage: number) => void;
}

const PercentageCalculatorModal: React.FC<PercentageCalculatorModalProps> = ({ isOpen, onClose, oneRepMax, onApplyToWorkout }) => {
  const { t } = useI18n();
  const { displayWeight, weightUnit } = useMeasureUnit();
  const [percentage, setPercentage] = useState(75);

  const calculatedWeight = useMemo(() => {
      return oneRepMax * (percentage / 100);
  }, [oneRepMax, percentage]);

  const percentages = [50, 60, 70, 75, 80, 85, 90, 95];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('orm_calculate_tab')}>
      <div className="space-y-6">
          <div className="text-center">
              <p className="text-text-secondary text-sm uppercase font-bold tracking-wider">{t('orm_current_max')}</p>
              <p className="text-3xl font-bold text-white">{displayWeight(oneRepMax)} {t(('workout_' + weightUnit) as TranslationKey)}</p>
          </div>

          <div>
              <label className="block text-sm font-bold text-text-secondary mb-2">Target Intensity: {percentage}%</label>
              <input 
                type="range" 
                min="40" 
                max="100" 
                step="1" 
                value={percentage} 
                onChange={(e) => setPercentage(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between mt-2">
                  {percentages.map(p => (
                      <button 
                        key={p} 
                        onClick={() => setPercentage(p)}
                        className={`text-xs px-2 py-1 rounded ${percentage === p ? 'bg-primary text-white' : 'bg-slate-800 text-text-secondary'}`}
                      >
                          {p}%
                      </button>
                  ))}
              </div>
          </div>

          <div className="bg-surface-highlight/30 rounded-xl p-4 text-center border border-white/5">
              <p className="text-text-secondary text-sm mb-1">{t('orm_wizard_weight')}</p>
              <p className="text-4xl font-bold text-primary">{displayWeight(calculatedWeight)} {t(('workout_' + weightUnit) as TranslationKey)}</p>
          </div>

          {onApplyToWorkout && (
              <button 
                onClick={() => { onApplyToWorkout(percentage); onClose(); }}
                className="w-full bg-success text-white font-bold py-3 rounded-lg shadow-lg hover:bg-green-600 transition-colors"
              >
                  {t('orm_apply_to_workout')}
              </button>
          )}
      </div>
    </Modal>
  );
};

export default PercentageCalculatorModal;
