import React, { useState } from 'react';
import { Routine } from '../../types';
import RoutinePanel from './RoutinePanel';
import { Icon } from '../common/Icon';
import { useI18n } from '../../hooks/useI18n';

interface RoutineSectionProps {
  title: string;
  routines: Routine[];
  onRoutineSelect: (routine: Routine) => void;
  onRoutineEdit?: (routine: Routine) => void;
  onRoutineDuplicate?: (routine: Routine) => void;
  startOpen?: boolean;
  headerAction?: React.ReactNode;
}

const RoutineSection: React.FC<RoutineSectionProps> = ({ title, routines, onRoutineSelect, onRoutineEdit, onRoutineDuplicate, startOpen = true, headerAction }) => {
  const [isOpen, setIsOpen] = useState(startOpen);
  const { t } = useI18n();

  if (routines.length === 0 && title !== t('train_my_templates')) {
    return null;
  }

  return (
    <div>
      <div className="w-full flex justify-between items-center text-left py-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-grow flex items-center space-x-2 text-left"
        >
          <h2 className="text-xl font-semibold">{title}</h2>
          <Icon name="arrow-right" className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
        </button>
        {headerAction}
      </div>
      
      {isOpen && (
        routines.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {routines.map(routine => (
              <RoutinePanel
                key={routine.id}
                routine={routine}
                onClick={onRoutineSelect}
                onEdit={onRoutineEdit}
                onDuplicate={onRoutineDuplicate}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-text-secondary mt-2">
            {title === t('train_my_templates') ? t('routine_section_create_prompt') : t('routine_section_no_items', { title: title.toLowerCase() })}
          </p>
        )
      )}
    </div>
  );
};

export default RoutineSection;