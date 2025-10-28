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
  const [weight, setWeight] = useState(set.weight > 0 ? displayWeight(set.weight) : '');
  const [reps, setReps] = useState(set.reps > 0 ? set.reps.toString() : '');
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isWeightFocused, setIsWeightFocused] = useState(false);
  const [isRepsFocused, setIsRepsFocused] = useState(false);

  useEffect(() => {
    if (!isWeightFocused) {
        setWeight(set.weight > 0 ? displayWeight(set.weight) : '');
    }
    if (!isRepsFocused) {
        setReps(set.reps > 0 ? set.reps.toString() : '');
    }
  }, [set, displayWeight, isWeightFocused, isRepsFocused]);
  
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWeight = e.target.value;
    setWeight(newWeight);
    onUpdateSet({ ...set, weight: getStoredWeight(parseFloat(newWeight) || 0), isWeightInherited: false });
  };
  
  const handleRepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReps(e.target.value);
    onUpdateSet({ ...set, reps: parseInt(e.target.value, 10) || 0, isRepsInherited: false });
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
  
  const getSetIdentifierStyles = (type: SetType) => {
    switch(type) {
        case 'warmup': return 'text-sky-400 bg-sky-400/10 hover:bg-sky-400/20';
        case 'drop': return 'text-slate-400 bg-slate-400/10 hover:bg-slate-400/20';
        case 'failure': return 'text-purple-400 bg-purple-400/10 hover:bg-purple-400/20';
        default: return 'text-primary bg-primary/10 hover:bg-primary/20';
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

  const inputClasses = "w-full bg-transparent border border-secondary/50 rounded-md p-2 text-center";

  return (
    <>
      <div className={`grid grid-cols-12 items-center gap-2 p-1 rounded-lg ${getSetTypeStyles(set.type)}`}>
        <div className="col-span-2 flex justify-center">
            <button onClick={() => setIsTypeModalOpen(true)} className={`text-center font-bold rounded-full w-8 h-8 mx-auto flex items-center justify-center ${getSetIdentifierStyles(set.type)}`}>
              {renderSetIdentifier()}
            </button>
        </div>
        
        <div className="col-span-4">
          <input 
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            value={weight}
            onChange={handleWeightChange}
            onFocus={(e) => { setIsWeightFocused(true); e.target.select(); }}
            onBlur={() => setIsWeightFocused(false)}
            className={`${inputClasses} ${set.isWeightInherited && !isWeightFocused ? 'text-text-secondary' : 'text-text-primary'}`}
          />
        </div>

        <div className="col-span-4">
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min="0"
            value={reps}
            onChange={handleRepsChange}
            onFocus={(e) => { setIsRepsFocused(true); e.target.select(); }}
            onBlur={() => setIsRepsFocused(false)}
            className={`${inputClasses} ${set.isRepsInherited && !isRepsFocused ? 'text-text-secondary' : 'text-text-primary'}`}
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