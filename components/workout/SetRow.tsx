
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
    const repsValue = isNaN(parsedReps) ? -1 : parsedReps;
    onUpdateSet({ ...set, reps: repsValue, isRepsInherited: false });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTime(e.target.value);
    onUpdateSet({ ...set, time: parseTimerInput(e.target.value), isTimeInherited: false });
  };
  
  const handleComplete = () => {
    unlockAudioContext();
    const isComplete = !set.isComplete;
    onUpdateSet({ ...set, isComplete, completedAt: isComplete ? Date.now() : undefined });
  };

  const handleSelectSetType = (type: SetType) => {
    onUpdateSet({ ...set, type });
    setIsTypeModalOpen(false);
  }

  const getSetTypeStyles = (type: SetType, isComplete: boolean) => {
    if (isComplete) return 'bg-success/10 border-success/20';
    
    switch(type) {
        case 'warmup': return 'bg-sky-500/5 border-sky-500/10';
        case 'drop': return 'bg-slate-500/5 border-slate-500/10';
        case 'failure': return 'bg-purple-500/5 border-purple-500/10';
        case 'timed': return 'bg-amber-500/5 border-amber-500/10';
        default: return 'bg-surface/40 border-transparent';
    }
  }
  
  const getSetIdentifierStyles = (type: SetType) => {
    switch(type) {
        case 'warmup': return 'text-sky-400 font-bold bg-sky-500/10 border border-sky-500/20';
        case 'drop': return 'text-slate-400 font-bold bg-slate-500/10 border border-slate-500/20';
        case 'failure': return 'text-purple-400 font-bold bg-purple-500/10 border border-purple-500/20';
        case 'timed': return 'text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20';
        default: return 'text-text-secondary font-semibold bg-white/5 border border-white/5';
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

  const inputClasses = `
    w-full max-w-[80px] text-center rounded-xl p-3 text-lg font-medium outline-none transition-all duration-200 shadow-sm
    focus:ring-2 focus:ring-primary focus:bg-surface-highlight
    disabled:opacity-50 disabled:cursor-not-allowed
  `;
  
  const activeInputClass = "bg-black/20 border border-white/10 text-text-primary placeholder-text-secondary/30 hover:bg-black/30";
  const inheritedInputClass = "bg-transparent border border-transparent text-text-secondary/50 placeholder-text-secondary/20 hover:bg-white/5";
  const invalidInputClass = "border-danger bg-danger/10 text-danger";
  const completedInputClass = "bg-transparent border-transparent text-success font-bold";

  const getInputStyle = (isInherited: boolean, isFocused: boolean, isInvalid: boolean, isComplete: boolean) => {
    if (isComplete) return completedInputClass;
    if (isInvalid) return invalidInputClass;
    if (isFocused || !isInherited) return activeInputClass;
    return inheritedInputClass;
  };

  const isWeightInvalid = set.isComplete && set.type !== 'timed' && !isWeightOptional && set.weight <= 0;
  const isRepsInvalid = set.isComplete && set.reps <= 0;
  const isTimeInvalid = set.isComplete && set.type === 'timed' && (set.time ?? 0) <= 0;

  return (
    <>
      <div className={`grid grid-cols-5 items-center gap-3 p-2 rounded-2xl border transition-all duration-300 ${getSetTypeStyles(set.type, !!set.isComplete)}`}>
          <div className="col-span-1 flex justify-center">
            <button 
                onClick={() => setIsTypeModalOpen(true)} 
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm hover:scale-110 transition-transform shadow-sm ${getSetIdentifierStyles(set.type)}`}
            >
                {renderSetIdentifier()}
            </button>
          </div>
          
          <div className="col-span-1 text-center text-text-secondary text-xs font-mono truncate px-1 opacity-70">
            {set.type !== 'timed' && (previousSetData ? `${displayWeight(previousSetData.weight)}x${previousSetData.reps}` : '-')}
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
                        className={`${inputClasses} ${getInputStyle(!!set.isTimeInherited, isTimeFocused, isTimeInvalid, !!set.isComplete)}`}
                        disabled={!!set.isComplete}
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
                        className={`${inputClasses} ${getInputStyle(!!set.isRepsInherited, isRepsFocused, isRepsInvalid, !!set.isComplete)}`}
                        disabled={!!set.isComplete}
                    />
                </div>
                <div className="col-span-1 flex justify-center space-x-2">
                    {set.isComplete ? (
                        <button onClick={handleComplete} className="w-11 h-11 rounded-xl bg-success text-white shadow-lg shadow-success/20 hover:bg-green-500 transition-all active:scale-95 flex items-center justify-center">
                            <Icon name="check" className="w-6 h-6" />
                        </button>
                    ) : (
                        <>
                            <button onClick={() => { unlockAudioContext(); onStartTimedSet?.(set); }} className="w-10 h-10 rounded-xl bg-surface-highlight text-primary hover:bg-surface-highlight/80 transition-colors flex items-center justify-center border border-white/5">
                                <Icon name="play" className="w-5 h-5" />
                            </button>
                             <button onClick={onDeleteSet} className="w-10 h-10 rounded-xl text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors flex items-center justify-center">
                                <Icon name="trash" className="w-5 h-5" />
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
                        className={`${inputClasses} ${getInputStyle(!!set.isWeightInherited, isWeightFocused, isWeightInvalid, !!set.isComplete)}`}
                        disabled={!!set.isComplete}
                        placeholder="-"
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
                        className={`${inputClasses} ${getInputStyle(!!set.isRepsInherited, isRepsFocused, isRepsInvalid, !!set.isComplete)}`}
                        disabled={!!set.isComplete}
                        placeholder="-"
                    />
                </div>

                <div className="col-span-1 flex justify-center items-center gap-1">
                    <button 
                        onClick={handleComplete} 
                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
                            set.isComplete 
                                ? 'bg-success text-white shadow-lg shadow-success/20 hover:bg-green-500' 
                                : 'bg-surface-highlight/40 text-text-secondary hover:bg-success/20 hover:text-success border border-white/5'
                        }`}
                    >
                        <Icon name="check" className="w-6 h-6" />
                    </button>
                    {!set.isComplete && (
                        <button onClick={onDeleteSet} className="w-10 h-10 rounded-xl text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors flex items-center justify-center">
                            <Icon name="trash" className="w-5 h-5" />
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
