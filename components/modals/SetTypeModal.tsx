import React, { useState } from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { SetType } from '../../types';
import { Icon } from '../common/Icon';
import SetTypeExplanationModal from './SetTypeExplanationModal';

interface SetTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentType: SetType;
  onSelectType: (type: SetType) => void;
}

const SetTypeModal: React.FC<SetTypeModalProps> = ({ isOpen, onClose, currentType, onSelectType }) => {
  const { t } = useI18n();
  const [explanationType, setExplanationType] = useState<'warmup' | 'drop' | 'failure' | null>(null);

  const setTypes: { type: SetType; label: string; hasInfo: boolean }[] = [
    { type: 'normal', label: t('set_type_normal'), hasInfo: false },
    { type: 'warmup', label: t('set_type_warmup'), hasInfo: true },
    { type: 'drop', label: t('set_type_drop'), hasInfo: true },
    { type: 'failure', label: t('set_type_failure'), hasInfo: true },
  ];
  
  const handleSelect = (type: SetType) => {
    if (type === currentType) {
        onSelectType('normal');
    } else {
        onSelectType(type);
    }
  }

  const openExplanation = (e: React.MouseEvent, type: SetType) => {
    e.stopPropagation();
    if (type !== 'normal') {
      setExplanationType(type);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen && !explanationType} onClose={onClose} title={t('set_type_modal_title')}>
        <div className="space-y-3">
          {setTypes.map(({ type, label, hasInfo }) => (
            <button
              key={type}
              onClick={() => handleSelect(type)}
              className={`w-full flex justify-between items-center text-left p-4 rounded-lg transition-colors ${
                currentType === type
                  ? 'bg-primary text-white'
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <span className="font-semibold">{label}</span>
              {hasInfo && (
                <button
                  onClick={(e) => openExplanation(e, type)}
                  className={`p-1 rounded-full ${currentType === type ? 'hover:bg-sky-500' : 'hover:bg-slate-500'}`}
                >
                  <Icon name="question-mark-circle" className="w-6 h-6" />
                </button>
              )}
            </button>
          ))}
        </div>
      </Modal>
      {explanationType && (
        <SetTypeExplanationModal 
            isOpen={!!explanationType}
            onClose={() => setExplanationType(null)}
            setType={explanationType}
        />
      )}
    </>
  );
};

export default SetTypeModal;
