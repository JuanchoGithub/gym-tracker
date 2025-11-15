import React, { useState, useEffect } from 'react';
import { PerformedSet, SetType } from '../../types';
import { Icon } from '../common/Icon';
import SetTypeModal from '../modals/SetTypeModal';
import { useMeasureUnit } from '../../hooks/useWeight';
import { useI18n } from '../../hooks/useI18n';
import { formatSecondsToMMSS, parseTimerInput } from '../../utils/timeUtils';
import { unlockAudioContext } from '../../services/audioService';

interface SetRowProps {
  set: PerformedSet;
  setNumber: number;
  onUpdateSet: (updatedSet: PerformedSet) => void;
  onDeleteSet: () => void;
  onStartTimedSet?: (set: PerformedSet) => void;
  previousSetData?: PerformedSet;
  isWeightOptional: boolean;
}

const SetRow: React.FC<SetRowProps> = ({ set, setNumber, onUpdateSet, onDeleteSet, onStartTimedSet, previousSetData, isWeightOptional }) => {
  const { displayWeight, getStoredWeight } = useMeasureUnit();
  const { t } = useI18n();
  const [weight, setWeight] = useState(set.weight > 0 ? displayWeight(set.weight) : '');
  const [reps, setReps] = useState(set.reps > 0 ? set.reps.toString() : '');
  const [time, setTime] = useState(set.time ? formatSecondsToMMSS(set.time) : '0:00');
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isWeightFocused, setIsWeightFocused] = useState(false);
  const [isRepsFocused, setIsRepsFocused] = useState(false);
  const [isTimeFocused, setIsTimeFocused] = useState(false);
  
  useEffect(() => {
    // If the inputs are not focused, update them from props
    // This allows parent changes (like cascading weight) to reflect
    if (!isWeightFocused) {
      setWeight(set.weight > 0 ? displayWeight(set.weight) : '');
    }
    if (!isRepsFocused) {
      setReps(set.reps > 0 ? set.reps.toString() : '');
    }
    if (!isTimeFocused) {
        setTime(set.time ? formatSecondsToMMSS(set.time) : '0:00');
    }
  }, [set, displayWeight, isWeightFocused, isRepsFocused, isTimeFocused]);

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWeightStr = e.target.value;
    setWeight(newWeightStr);
    
    const parsedWeight = parseFloat(newWeightStr);
    // Use -1 as a sentinel value when the input is cleared, to signal a reset.
    const weightValue = isNaN(parsedWeight) ? -1 : parsedWeight;
    
    onUpdateSet({ 
        ...set, 
        weight: getStoredWeight(weightValue), 
        isWeightInherited: false 
    });
  };
  
  const handleRepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRepsStr = e.target.value;
    setReps(newRepsStr);

    const parsedReps = parseInt(newRepsStr, 10);
    // Use -1 as a sentinel value when the input is cleared, to signal a reset.
    const repsValue = isNaN(parsedReps) ? -1 : parsedReps;

    onUpdateSet({ ...set, reps: repsValue, isRepsInherited: false });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTime(e.target.value);
    onUpdateSet({ ...set, time: parseTimerInput(e.target.value), isTimeInherited: false });
  };
  
  const handleComplete = () => {
    unlockAudioContext();
    onUpdateSet({ ...set, isComplete: !set.isComplete });
  };

  const handleSelectSetType = (type: SetType) => {
    onUpdateSet({ ...set, type });
    setIsTypeModalOpen(false);
  }

  const getSetTypeStyles = (type: SetType, isComplete: boolean) => {
    if (isComplete) {
        return 'bg-success/20';
    }
    switch(type) {
        case 'warmup': return 'bg-[#1C354C]';
        case 'drop': return 'bg-[#343536]';
        case 'failure': return 'bg-[#332C3C]';
        case 'timed': return 'bg-yellow-400/10';
        default: return 'bg-surface';
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

  const inputClasses = "w-full max-w-16 bg-slate-900/50 border border-secondary/50 rounded-md p-2 text-center disabled:bg-slate-800";

  const isWeightInvalid = set.isComplete && set.type !== 'timed' && !isWeightOptional && set.weight <= 0;
  const isRepsInvalid = set.isComplete && set.reps <= 0;
  const isTimeInvalid = set.isComplete && set.type === 'timed' && (set.time ?? 0) <= 0;

  return (
    <>
      <div className={`grid grid-cols-5 items-center gap-1 sm:gap-2 py-2 rounded-lg relative ${getSetTypeStyles(set.type, !!set.isComplete)}`}>
          <button onClick={() => setIsTypeModalOpen(true)} className={`text-center font-bold rounded-full w-8 h-8 mx-auto flex items-center justify-center ${getSetIdentifierStyles(set.type)}`}>
            {renderSetIdentifier()}
          </button>
          
          <div className="col-span-1 text-center text-text-secondary text-sm">
            {set.type !== 'timed' && (previousSetData ? `${displayWeight(previousSetData.weight)} x ${previousSetData.reps}` : '-')}
          </div>

          {set.type === 'timed' ? (
              <>
                <div className="col-span-1 flex justify-center">
                    <input
                        type="text"
                        inputMode="numeric"
                        value={time}
                        onChange={handleTimeChange}
                        onFocus={(e) => { setIsTimeFocused(true); e.target.select(); }}
                        onBlur={() => { setIsTimeFocused(false); setTime(formatSecondsToMMSS(parseTimerInput(time))) }}
                        className={`${inputClasses} ${set.isTimeInherited && !isTimeFocused ? 'text-text-secondary' : 'text-text-primary'} ${isTimeInvalid ? 'border-red-500' : ''}`}
                        disabled={set.isComplete}
                        placeholder="m:ss"
                    />
                </div>
                <div className="col-span-1 flex justify-center">
                    <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min="0"
                        value={reps}
                        onChange={handleRepsChange}
                        onFocus={(e) => { setIsRepsFocused(true); e.target.select(); }}
                        onBlur={() => setIsRepsFocused(false)}
                        className={`${inputClasses} ${set.isRepsInherited && !isRepsFocused ? 'text-text-secondary' : 'text-text-primary'} ${isRepsInvalid ? 'border-red-500' : ''}`}
                        disabled={set.isComplete}
                        />
                </div>
                <div className="col-span-1 flex justify-center space-x-2">
                    {set.isComplete ? (
                        <button onClick={handleComplete} className="p-1.5 rounded-full bg-success text-white">
                            <Icon name="check" className="w-4 h-4" />
                        </button>
                    ) : (
                        <>
                            <button onClick={() => { unlockAudioContext(); onStartTimedSet?.(set); }} className="p-1.5 rounded-full bg-secondary text-white">
                                <Icon name="play" className="w-4 h-4" />
                            </button>
                             <button onClick={onDeleteSet} className="p-1.5 rounded-full text-text-secondary hover:text-red-500">
                                <Icon name="trash" className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
              </>
          ) : (
              <>
                <div className="col-span-1 flex justify-center">
                    <input 
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    value={weight}
                    onChange={handleWeightChange}
                    onFocus={(e) => { setIsWeightFocused(true); e.target.select(); }}
                    onBlur={() => setIsWeightFocused(false)}
                    className={`${inputClasses} ${set.isWeightInherited && !isWeightFocused ? 'text-text-secondary' : 'text-text-primary'} ${isWeightInvalid ? 'border-red-500' : ''}`}
                    disabled={set.isComplete}
                    />
                </div>

                <div className="col-span-1 flex justify-center">
                    <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    value={reps}
                    onChange={handleRepsChange}
                    onFocus={(e) => { setIsRepsFocused(true); e.target.select(); }}
                    onBlur={() => setIsRepsFocused(false)}
                    className={`${inputClasses} ${set.isRepsInherited && !isRepsFocused ? 'text-text-secondary' : 'text-text-primary'} ${isRepsInvalid ? 'border-red-500' : ''}`}
                    disabled={set.isComplete}
                    />
                </div>

                <div className="col-span-1 flex justify-center space-x-2">
                    <button onClick={handleComplete} className={`p-1.5 rounded-full transition-colors ${set.isComplete ? 'bg-success text-white' : 'bg-secondary'}`}>
                        <Icon name="check" className="w-4 h-4" />
                    </button>
                    {!set.isComplete && (
                        <button onClick={onDeleteSet} className="p-1.5 rounded-full text-text-secondary hover:text-red-500">
                            <Icon name="trash" className="w-4 h-4" />
                        </button>
                    )}
                </div>
              </>
          )}
        </div>
      <SetTypeModal
          isOpen={isTypeModalOpen}
          onClose={() => setIsTypeModalOpen(false)}
          currentType={set.type}
          onSelectType={handleSelectSetType}
      />
    </>
  );
};

export default SetRow;