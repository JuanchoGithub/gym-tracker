
import React, { useState, useEffect, useRef } from 'react';
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
  isValid?: boolean; // New prop for validation
}

const SetRow: React.FC<SetRowProps> = ({ set, setNumber, onUpdateSet, onDeleteSet, onStartTimedSet, previousSetData, isWeightOptional, isValid = true }) => {
  const { displayWeight, getStoredWeight } = useMeasureUnit();
  const { t } = useI18n();
  
  // Local state for inputs to prevent cursor jumping/decimal issues
  const [weight, setWeight] = useState(set.weight > 0 ? displayWeight(set.weight) : '');
  const [reps, setReps] = useState(set.reps > 0 ? set.reps.toString() : '');
  const [time, setTime] = useState(set.time ? formatSecondsToMMSS(set.time) : '0:00');
  
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isWeightFocused, setIsWeightFocused] = useState(false);
  const [isRepsFocused, setIsRepsFocused] = useState(false);
  const [isTimeFocused, setIsTimeFocused] = useState(false);

  // Refs to track previous props to avoid overwriting local state on unrelated re-renders
  // or preventing the "reset on blur" race condition.
  const prevPropWeight = useRef(set.weight);
  const prevPropReps = useRef(set.reps);
  const prevPropTime = useRef(set.time);

  // Sync props to state only when props actually change from outside
  useEffect(() => {
    if (!isWeightFocused && set.weight !== prevPropWeight.current) {
       setWeight(set.weight > 0 ? displayWeight(set.weight) : '');
       prevPropWeight.current = set.weight;
    }
  }, [set.weight, isWeightFocused, displayWeight]);

  useEffect(() => {
    if (!isRepsFocused && set.reps !== prevPropReps.current) {
       setReps(set.reps > 0 ? set.reps.toString() : '');
       prevPropReps.current = set.reps;
    }
  }, [set.reps, isRepsFocused]);

  useEffect(() => {
    if (!isTimeFocused && set.time !== prevPropTime.current) {
       setTime(set.time ? formatSecondsToMMSS(set.time) : '0:00');
       prevPropTime.current = set.time;
    }
  }, [set.time, isTimeFocused]);

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => setWeight(e.target.value);
  const handleRepsChange = (e: React.ChangeEvent<HTMLInputElement>) => setReps(e.target.value);
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => setTime(e.target.value);
  
  const commitChanges = (overrides: Partial<PerformedSet> = {}) => {
      const parsedWeight = parseFloat(weight);
      const finalWeight = isNaN(parsedWeight) ? 0 : getStoredWeight(parsedWeight);
      
      const parsedReps = parseInt(reps, 10);
      const finalReps = isNaN(parsedReps) ? 0 : parsedReps;

      const finalTime = parseTimerInput(time);

      const updatedSet = {
          ...set,
          weight: finalWeight,
          reps: finalReps,
          time: finalTime,
          ...overrides
      };

      // Break inheritance if values changed explicitly
      if (finalWeight !== set.weight) updatedSet.isWeightInherited = false;
      if (finalReps !== set.reps) updatedSet.isRepsInherited = false;
      if (finalTime !== set.time) updatedSet.isTimeInherited = false;

      onUpdateSet(updatedSet);
  };

  const handleWeightBlur = () => {
    setIsWeightFocused(false);
    commitChanges();
  };

  const handleRepsBlur = () => {
    setIsRepsFocused(false);
    commitChanges();
  };

  const handleTimeBlur = () => {
    setIsTimeFocused(false);
    const seconds = parseTimerInput(time);
    setTime(formatSecondsToMMSS(seconds));
    commitChanges({ time: seconds });
  };

  const handleComplete = () => {
    unlockAudioContext();
    const isComplete = !set.isComplete;
    commitChanges({ isComplete, completedAt: isComplete ? Date.now() : undefined });
  };

  const handleSelectSetType = (type: SetType) => {
    const updates: Partial<PerformedSet> = { type };
    // If switching to timed and reps are 0/empty, force to 1 to prevent validation errors
    if (type === 'timed' && (set.reps <= 0 || !set.reps)) {
        updates.reps = 1;
    }
    onUpdateSet({ ...set, ...updates });
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
  
  const activeInputClass = "bg-black/20 border border-white/10 text-text-primary placeholder-slate-600 hover:bg-black/30";
  const inheritedInputClass = "bg-transparent border border-transparent text-slate-400 placeholder-slate-600 hover:bg-white/5";
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
  
  // Logic for the checkmark button style based on validation
  const getCheckmarkButtonStyle = () => {
      if (set.isComplete) {
          if (!isValid) return 'bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600';
          return 'bg-success text-white shadow-lg shadow-success/20 hover:bg-green-500';
      }
      return 'bg-surface-highlight/40 text-text-secondary hover:bg-success/20 hover:text-success border border-white/5';
  };

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
          
          <div className="col-span-1 text-center text-slate-400 text-xs font-mono truncate px-1 opacity-70">
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
                        onBlur={handleTimeBlur}
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
                        onBlur={handleRepsBlur}
                        className={`${inputClasses} ${getInputStyle(!!set.isRepsInherited, isRepsFocused, isRepsInvalid, !!set.isComplete)}`}
                        disabled={!!set.isComplete}
                    />
                </div>
                <div className="col-span-1 flex justify-center space-x-2">
                    {set.isComplete ? (
                        <button onClick={handleComplete} className={`w-11 h-11 rounded-xl transition-all active:scale-95 flex items-center justify-center ${getCheckmarkButtonStyle()}`}>
                            <Icon name={isValid ? "check" : "warning"} className="w-6 h-6" />
                        </button>
                    ) : (
                        <button onClick={() => { unlockAudioContext(); onStartTimedSet?.(set); }} className="w-10 h-10 rounded-xl bg-surface-highlight text-primary hover:bg-surface-highlight/80 transition-colors flex items-center justify-center border border-white/5">
                            <Icon name="play" className="w-5 h-5" />
                        </button>
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
                        onBlur={handleWeightBlur}
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
                        onBlur={handleRepsBlur}
                        className={`${inputClasses} ${getInputStyle(!!set.isRepsInherited, isRepsFocused, isRepsInvalid, !!set.isComplete)}`}
                        disabled={!!set.isComplete}
                        placeholder="-"
                    />
                </div>

                <div className="col-span-1 flex justify-center items-center gap-1">
                    <button 
                        onClick={handleComplete} 
                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 ${getCheckmarkButtonStyle()}`}
                    >
                        <Icon name={!set.isComplete ? "check" : (isValid ? "check" : "warning")} className="w-6 h-6" />
                    </button>
                </div>
              </>
          )}
        </div>
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

export default SetRow;
