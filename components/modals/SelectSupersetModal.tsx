
import React from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { SupersetDefinition } from '../../types';
import { Icon } from '../common/Icon';

interface SelectSupersetModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableSupersets: { id: string; name: string; exercises: string[] }[];
  onSelect: (supersetId: string | 'new') => void;
}

const SelectSupersetModal: React.FC<SelectSupersetModalProps> = ({ isOpen, onClose, availableSupersets, onSelect }) => {
  const { t } = useI18n();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add to Superset">
      <div className="space-y-4">
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {availableSupersets.map((superset) => (
            <button
              key={superset.id}
              onClick={() => onSelect(superset.id)}
              className="w-full text-left p-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-indigo-500/30 transition-colors group"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-indigo-400 group-hover:text-indigo-300">{superset.name}</span>
                <Icon name="plus" className="w-4 h-4 text-text-secondary group-hover:text-white" />
              </div>
              <p className="text-xs text-text-secondary truncate">
                {superset.exercises.join(', ')}
              </p>
            </button>
          ))}
        </div>

        <div className="border-t border-white/10 pt-4">
          <button
            onClick={() => onSelect('new')}
            className="w-full py-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold border border-primary/30 transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="plus" className="w-5 h-5" />
            Create New Superset
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SelectSupersetModal;
