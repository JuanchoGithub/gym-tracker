import React, { useState } from 'react';
import { Routine } from '../../types';
import RoutinePanel from './RoutinePanel';
import { Icon } from '../common/Icon';

interface RoutineSectionProps {
  title: string;
  routines: Routine[];
  onRoutineSelect: (routine: Routine) => void;
  startOpen?: boolean;
}

const RoutineSection: React.FC<RoutineSectionProps> = ({ title, routines, onRoutineSelect, startOpen = true }) => {
  const [isOpen, setIsOpen] = useState(startOpen);

  if (routines.length === 0 && title !== 'My Routines') {
    return null;
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left py-2"
      >
        <h2 className="text-xl font-semibold">{title}</h2>
        <Icon name={isOpen ? 'arrow-down' : 'arrow-right'} className="w-5 h-5 transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}/>
      </button>
      {isOpen && (
        routines.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {routines.map(routine => (
              <RoutinePanel
                key={routine.id}
                routine={routine}
                onClick={onRoutineSelect}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-text-secondary mt-2">
            {title === 'My Routines' ? 'Create a routine to see it here.' : `No ${title.toLowerCase()} yet.`}
          </p>
        )
      )}
    </div>
  );
};

export default RoutineSection;