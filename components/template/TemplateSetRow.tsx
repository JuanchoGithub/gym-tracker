
import React, { useState, useEffect } from 'react';
import { PerformedSet, SetType } from '../../types';
import { Icon } from '../common/Icon';
import SetTypeModal from '../modals/SetTypeModal';
import { useMeasureUnit } from '../../hooks/useWeight';
import { formatSecondsToMMSS, parseTimerInput } from '../../utils/timeUtils';
import { useI18n } from '../../hooks/useI18n';

interface TemplateSetRowProps {
  set: PerformedSet;
  setNumber: number;
  onUpdateSet: (updatedSet: PerformedSet) => void;
  onDeleteSet: () => void;
  restTime: { normal: number; warmup: number; drop: number; timed: number; effort: number; failure: number; };
  onEditSetTimer: () => void;
}

const TemplateSetRow: React.FC<TemplateSetRowProps> = ({ set, setNumber, onUpdateSet, onDeleteSet, restTime, onEditSetTimer }) => {
  const { displayWeight, getStoredWeight } = useMeasureUnit();
  const { t } = useI18n();
  const [weight, setWeight] = useState(set.weight > 0 ? displayWeight(set.weight) : '');
  const [reps, setReps] = useState(set.reps > 0 ? set.reps.toString() : '');
  const [time, setTime] = useState(set.time ? formatSecondsToMMSS(set.time) : '1:00');
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isWeightFocused, setIsWeightFocused] = useState(false);
  const [isRepsFocused, setIsRepsFocused] = useState(false);
  const [isTimeFocused, setIsTimeFocused] = useState(false);

  useEffect(() => {
    if (!isWeightFocused) {
        setWeight(set.weight > 0 ? displayWeight(set.weight) : '');
    }
    if (!isRepsFocused) {
        setReps(set.reps > 0 ? set.reps.toString() : '');
    }
    if (!isTimeFocused) {
        setTime(set.time ? formatSecondsToMMSS(set.time) : '1:00');
    }
  }, [set, displayWeight, isWeightFocused, isRepsFocused, isTimeFocused]);
  
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWeight = e.target.value;
    setWeight(newWeight);
    onUpdateSet({ ...set, weight: getStoredWeight(parseFloat(newWeight) || 0), isWeightInherited: false });
  };
  
  const handleRepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReps(e.target.value);
    onUpdateSet({ ...set, reps: parseInt(e.target.value, 10) || 0, isRepsInherited: false });
  };
  
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTime(e.target.value);
    onUpdateSet({ ...set, time: parseTimerInput(e.target.value), isTimeInherited: false });
  };
  
  const handleSelectSetType = (type: SetType) => {
    const newDefaultRest = type === 'warmup' ? restTime.warmup : type === 'drop' ? restTime.drop : type === 'timed' ? restTime.timed : type === 'failure' ? restTime.failure : restTime.normal;
    
    // Default timed sets to 1 rep if previously 0 to avoid errors
    const defaultReps = (type === 'timed' && set.reps <= 0) ? 1 : set.reps;

    // If the set had an override, but the new default is the same, remove the override
    if (set.rest !== undefined && set.rest === newDefaultRest) {
      const { rest, ...setWithoutRest } = set;
      onUpdateSet({ ...setWithoutRest, type, reps: defaultReps, weight: type === 'timed' ? 0 : set.weight, time: type === 'timed' ? (set.time || 60) : undefined });
    } else {
      onUpdateSet({ ...set, type, reps: defaultReps, weight: type === 'timed' ? 0 : set.weight, time: type === 'timed' ? (set.time || 60) : undefined });
    }
    setIsTypeModalOpen(false);
  }

  const getSetTypeStyles = (type: SetType, isComplete: boolean) => {
    // Keep consistent styles, though template rows aren't "complete"
    switch(type) {
        case 'warmup': return 'bg-[#1C354C]';
        case 'drop': return 'bg-[#343536]';
        case 'failure': return 'bg-[#332C3C]';
        case 'timed': return 'bg-yellow-400/10';
        default: return 'bg-slate-900/50';
    }
  }
  
  const getSetIdentifierStyles = (type: SetType) => {
    switch(type) {
        case 'warmup': return 'text-sky-400 bg-sky-400/10 hover:bg-sky-400/20';
        case 'drop': return 'text-slate-400 bg-slate-400/10 hover:bg-slate-400/20';
        case 'failure': return 'text-purple-400 bg-purple-400/10 hover:bg-purple-400/20';
        case 'timed': return 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20';
        default: return 'text-primary bg-primary/10 hover:bg-primary/20';
    }
  }
  
  const renderSetIdentifier = () => {
    switch(set.type) {
        case 'warmup': return 'W';
        case 'drop': return 'D';
        case 'failure': return 'F';
        case 'timed': return 'T';
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
        case 'timed': return restTime.timed;
        case 'failure': return restTime.failure;
        default: return restTime.normal;
    }
  }

  const inputClasses = "w-full bg-transparent border border-secondary/50 rounded-md p-2 text-center";
  const timePresets = [30, 60, 90, 120];

  return (
    <>
      <div className={`grid grid-cols-12 items-center gap-2 p-1 rounded-lg ${getSetTypeStyles(set.type, false)}`}>
        <div className="col-span-2 flex justify-center">
            <button onClick={() => setIsTypeModalOpen(true)} className={`text-center font-bold rounded-full w-8 h-8 mx-auto flex items-center justify-center ${getSetIdentifierStyles(set.type)}`}>
              {renderSetIdentifier()}
            </button>
        </div>
        
        {set.type === 'timed' ? (
          <>
            <div className="col-span-5">
              <input
                type="text"
                inputMode="numeric"
                value={time}
                onChange={handleTimeChange}
                onFocus={(e) => { setIsTimeFocused(true); e.target.select(); }}
                onBlur={() => { setIsTimeFocused(false); setTime(formatSecondsToMMSS(parseTimerInput(time))) }}
                className={`${inputClasses} ${set.isTimeInherited && !isTimeFocused ? 'text-slate-400' : 'text-text-primary'} text-center`}
                placeholder="m:ss"
              />
              <div className="flex justify-center gap-1 mt-1">
                {timePresets.map(preset => (
                    <button key={preset} onClick={() => onUpdateSet({ ...set, time: preset, isTimeInherited: false })} className="text-xs bg-secondary/50 text-text-secondary px-2 py-0.5 rounded-full">{formatSecondsToMMSS(preset)}</button>
                ))}
              </div>
            </div>
             <div className="col-span-5">
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                value={reps}
                onChange={handleRepsChange}
                onFocus={(e) => { setIsRepsFocused(true); e.target.select(); }}
                onBlur={() => setIsRepsFocused(false)}
                className={`${inputClasses} ${set.isRepsInherited && !isRepsFocused ? 'text-slate-400' : 'text-text-primary'}`}
              />
            </div>
          </>
        ) : (
          <>
            <div className="col-span-5">
              <input 
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                value={weight}
                onChange={handleWeightChange}
                onFocus={(e) => { setIsWeightFocused(true); e.target.select(); }}
                onBlur={() => setIsWeightFocused(false)}
                className={`${inputClasses} ${set.isWeightInherited && !isWeightFocused ? 'text-slate-400' : 'text-text-primary'}`}
              />
            </div>

            <div className="col-span-5">
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                value={reps}
                onChange={handleRepsChange}
                onFocus={(e) => { setIsRepsFocused(true); e.target.select(); }}
                onBlur={() => setIsRepsFocused(false)}
                className={`${inputClasses} ${set.isRepsInherited && !isRepsFocused ? 'text-slate-400' : 'text-text-primary'}`}
              />
            </div>
          </>
        )}
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
          onDelete={onDeleteSet}
      />
    </>
  );
};

export default TemplateSetRow;
