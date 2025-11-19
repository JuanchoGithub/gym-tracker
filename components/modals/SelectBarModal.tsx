
import React from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { useMeasureUnit } from '../../hooks/useWeight';
import { TranslationKey } from '../../contexts/I18nContext';

interface SelectBarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBarWeight: number; // in kg
  onSelect: (barWeight: number) => void;
}

const BARS = [
  { name: 'None', weight: 0 },
  { name: 'Olympic', weight: 20 },
  { name: 'Short', weight: 15 },
  { name: 'EZ Curl', weight: 7.5 },
  { name: 'Hex Bar', weight: 34 },
];

const SelectBarModal: React.FC<SelectBarModalProps> = ({ isOpen, onClose, currentBarWeight, onSelect }) => {
  const { t } = useI18n();
  const { displayWeight, weightUnit } = useMeasureUnit();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('bar_type')}>
      <div className="space-y-3">
        {BARS.map(bar => (
          <button
            key={bar.name}
            onClick={() => { onSelect(bar.weight); onClose(); }}
            className={`w-full flex justify-between items-center text-left p-4 rounded-lg transition-colors ${
              currentBarWeight === bar.weight
                ? 'bg-primary text-white'
                : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            <span className="font-semibold">{bar.name}</span>
            <span className={currentBarWeight === bar.weight ? 'text-white/80' : 'text-text-secondary'}>
              {/* FIX: Used a template literal to construct a valid translation key for the weight unit. */}
              {displayWeight(bar.weight)} {t(`workout_${weightUnit}` as TranslationKey)}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
};

export default SelectBarModal;