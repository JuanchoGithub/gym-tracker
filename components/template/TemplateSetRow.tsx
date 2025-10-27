import React, { useState, useEffect } from 'react';
import { PerformedSet, SetType } from '../../types';
import { Icon } from '../common/Icon';
import SetTypeModal from '../modals/SetTypeModal';
import { useWeight } from '../../hooks/useWeight';
import { formatSecondsToMMSS } from '../../utils/timeUtils';

interface TemplateSetRowProps {
  set: PerformedSet;
  setNumber: number;
  onUpdateSet: (updatedSet: PerformedSet) => void;
  onDeleteSet: () => void;
  restTime: { normal: number; warmup: number; drop: number };
  onEditSetTimer: () => void;
}

const TemplateSetRow: React.FC<TemplateSetRowProps> = ({ set, setNumber, onUpdateSet, onDeleteSet, restTime, onEditSetTimer }) => {
  const { displayWeight, getStoredWeight } = useWeight();
  const [weight, setWeight] = useState(displayWeight(set.weight));
  const [reps, setReps] = useState(set.reps.toString());
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);

  useEffect(() => {
    setWeight(displayWeight(set.weight));
    setReps(set.reps.toString());
  }, [set, displayWeight]);
  
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWeight = e.target.value;
    setWeight(newWeight);
    onUpdateSet({ ...set, weight: getStoredWeight(parseFloat(newWeight) || 0) });
  };
  
  const handleRepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReps(e.target.value);
    onUpdateSet({ ...set, reps: parseInt(e.target.value) || 0 });
  };
  
  const handleSelectSetType = (type: SetType) => {
    const newDefaultRest = type === 'warmup' ? restTime.warmup : type === 'drop' ? restTime.drop : restTime.normal;
    
    // If the set had an override, but the new default is the same, remove the override
    if (set.rest !== undefined && set.rest === newDefaultRest) {
      const { rest, ...setWithoutRest } = set;
      onUpdateSet({ ...setWithoutRest, type });
    } else {
      onUpdateSet({ ...set, type });
    }
    setIsTypeModalOpen(false);
  }

  const getSetTypeStyles = (type: SetType) => {
    switch(type) {
        case 'warmup': return 'bg-[#1C354C]';
        case 'drop': return 'bg-[#343536]';
        case 'failure': return 'bg-[#332C3C]';
        default: return 'bg-slate-900/50';
    }
  }
  
  const renderSetIdentifier = () => {
    switch(set.type) {
        case 'warmup': return 'W';
        case 'drop': return 'D';
        case 'failure': return 'F';
        default: return setNumber;
    }
  }
  
  const getTimerForSet = () => {
    if (set.rest !== undefined) {
        return set.rest;
    }
    switch(set.type) {
        case 'warmup': return restTime.warmup;
        case 'drop': return restTime.drop;
        default: return restTime.normal;
    }
  }

  const inputClasses = "w-full bg-transparent border border-secondary/50 rounded-md p-2 text-center text-text-primary";

  return (
    <>
      <div className={`grid grid-cols-12 items-center gap-2 p-1 rounded-lg ${getSetTypeStyles(set.type)}`}>
        <div className="col-span-2 flex justify-center">
            <button onClick={() => setIsTypeModalOpen(true)} className="text-center font-bold text-primary bg-primary/10 rounded-full w-8 h-8 mx-auto flex items-center justify-center hover:bg-primary/20">
              {renderSetIdentifier()}
            </button>
        </div>
        
        <div className="col-span-4">
          <input 
            type="number"
            step="0.5"
            value={weight}
            onChange={handleWeightChange}
            className={inputClasses}
          />
        </div>

        <div className="col-span-4">
          <input
            type="number"
            value={reps}
            onChange={handleRepsChange}
            className={inputClasses}
          />
        </div>

        <div className="col-span-2 flex justify-center">
          <button onClick={onDeleteSet} className="p-2 rounded-full text-text-secondary hover:text-red-500 transition-colors">
              <Icon name="x" className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <button onClick={onEditSetTimer} className="w-full" aria-label="Adjust timer settings">
        <div className="my-1 flex items-center justify-center text-sm text-text-secondary">
            <div className="flex-grow h-px bg-secondary/30"></div>
            <span className={`mx-4 font-mono ${set.rest !== undefined ? 'text-warning' : ''}`}>
                {formatSecondsToMMSS(getTimerForSet())}
            </span>
            <div className="flex-grow h-px bg-secondary/30"></div>
        </div>
      </button>
      
      <SetTypeModal
          isOpen={isTypeModalOpen}
          onClose={() => setIsTypeModalOpen(false)}
          currentType={set.type}
          onSelectType={handleSelectSetType}
      />
    </>
  );
};

export default TemplateSetRow;