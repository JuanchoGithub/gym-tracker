import React, { useState, useEffect, useRef } from 'react';
import { PerformedSet, SetType } from '../../types';
import { Icon } from '../common/Icon';
import SetTypeModal from '../modals/SetTypeModal';
import { useWeight } from '../../hooks/useWeight';
import { useI18n } from '../../hooks/useI18n';

interface SetRowProps {
  set: PerformedSet;
  setNumber: number;
  onUpdateSet: (updatedSet: PerformedSet) => void;
  onDeleteSet: () => void;
  previousSetData?: PerformedSet;
}

const SetRow: React.FC<SetRowProps> = ({ set, setNumber, onUpdateSet, onDeleteSet, previousSetData }) => {
  const { displayWeight, getStoredWeight } = useWeight();
  const { t } = useI18n();
  const [weight, setWeight] = useState(set.weight > 0 ? displayWeight(set.weight) : '');
  const [reps, setReps] = useState(set.reps > 0 ? set.reps.toString() : '');
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [isWeightFocused, setIsWeightFocused] = useState(false);
  const [isRepsFocused, setIsRepsFocused] = useState(false);

  const swipableNodeRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef({ isDragging: false, startX: 0, startTranslateX: 0 });

  useEffect(() => {
    if (set.isComplete && offsetX !== 0) setOffsetX(0);
  }, [set.isComplete, offsetX]);

  useEffect(() => {
    // If the inputs are not focused, update them from props
    // This allows parent changes (like cascading weight) to reflect
    if (!isWeightFocused) {
      setWeight(set.weight > 0 ? displayWeight(set.weight) : '');
    }
    if (!isRepsFocused) {
      setReps(set.reps > 0 ? set.reps.toString() : '');
    }
  }, [set, displayWeight, isWeightFocused, isRepsFocused]);

  const getClientX = (e: MouseEvent | TouchEvent) => 'touches' in e ? e.touches[0].clientX : e.clientX;
  
  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!dragStateRef.current.isDragging || !swipableNodeRef.current) return;
    const currentX = getClientX(e);
    const diff = currentX - dragStateRef.current.startX;
    let newOffsetX = dragStateRef.current.startTranslateX + diff;
    newOffsetX = Math.max(-100, Math.min(20, newOffsetX));
    swipableNodeRef.current.style.transform = `translateX(${newOffsetX}px)`;
  };
  
  const handleDragEnd = () => {
    if (!dragStateRef.current.isDragging || !swipableNodeRef.current) return;
    dragStateRef.current.isDragging = false;
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('touchmove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
    window.removeEventListener('touchend', handleDragEnd);

    swipableNodeRef.current.style.transition = 'transform 0.3s ease-out';
    const finalTransform = swipableNodeRef.current.style.transform;
    const currentTranslateX = finalTransform ? parseFloat(finalTransform.split('(')[1]) : 0;
    const deleteButtonWidth = 80;
    const openThreshold = -deleteButtonWidth / 2;
    
    if (currentTranslateX < openThreshold) {
        setOffsetX(-deleteButtonWidth);
    } else {
        setOffsetX(0);
    }
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (set.isComplete || !swipableNodeRef.current) return;
    dragStateRef.current = { isDragging: true, startX: getClientX(e.nativeEvent), startTranslateX: offsetX };
    swipableNodeRef.current.style.transition = 'none';
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('touchmove', handleDragMove, { passive: true });
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchend', handleDragEnd);
  };

  useEffect(() => {
    if (swipableNodeRef.current && !dragStateRef.current.isDragging) {
      swipableNodeRef.current.style.transform = `translateX(${offsetX}px)`;
    }
  }, [offsetX]);

  const handleDelete = () => {
    setOffsetX(0);
    setTimeout(() => onDeleteSet(), 300);
  };
  
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWeight = e.target.value;
    setWeight(newWeight);
    onUpdateSet({ ...set, weight: getStoredWeight(parseFloat(newWeight) || 0), isWeightInherited: false });
  };
  
  const handleRepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReps(e.target.value);
    onUpdateSet({ ...set, reps: parseInt(e.target.value, 10) || 0 });
  };
  
  const handleComplete = () => onUpdateSet({ ...set, isComplete: !set.isComplete });

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
        default: return 'bg-surface';
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

  const inputClasses = "w-full max-w-16 bg-slate-900/50 border border-secondary/50 rounded-md p-2 text-center disabled:bg-slate-800";

  return (
    <>
      <div className="relative rounded-lg overflow-hidden">
         <div className="absolute inset-0 bg-surface rounded-lg"></div>

        {!set.isComplete && (
            <div className="absolute top-0 right-0 h-full flex items-center">
                <button
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-500 text-white h-full w-20 flex items-center justify-center font-bold transition-colors"
                    aria-label="Delete set"
                >
                    {t('set_row_delete_button')}
                </button>
            </div>
        )}
        
        <div
            ref={swipableNodeRef}
            className={`grid grid-cols-5 items-center gap-1 sm:gap-2 py-2 rounded-lg relative transition-transform duration-300 ease-out ${getSetTypeStyles(set.type, set.isComplete)} ${!set.isComplete ? 'cursor-grab active:cursor-grabbing' : ''}`}
            style={{ touchAction: 'pan-y' }}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
        >
          <button onClick={() => setIsTypeModalOpen(true)} className={`text-center font-bold rounded-full w-8 h-8 mx-auto flex items-center justify-center ${getSetIdentifierStyles(set.type)}`}>
            {renderSetIdentifier()}
          </button>
          
          <div className="col-span-1 text-center text-text-secondary text-sm">
            {previousSetData ? `${displayWeight(previousSetData.weight)} x ${previousSetData.reps}` : '-'}
          </div>

          <div className="col-span-1 flex justify-center">
            <input 
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              value={weight}
              onChange={handleWeightChange}
              onFocus={() => setIsWeightFocused(true)}
              onBlur={() => setIsWeightFocused(false)}
              className={`${inputClasses} ${set.isWeightInherited && !isWeightFocused ? 'text-text-secondary' : 'text-text-primary'}`}
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
              onFocus={() => setIsRepsFocused(true)}
              onBlur={() => setIsRepsFocused(false)}
              className={`${inputClasses} text-text-primary`}
              disabled={set.isComplete}
            />
          </div>

          <div className="col-span-1 flex justify-center space-x-2">
            <button onClick={handleComplete} className={`p-1.5 rounded-full transition-colors ${set.isComplete ? 'bg-success text-white' : 'bg-secondary'}`}>
                <Icon name="check" className="w-4 h-4" />
            </button>
          </div>
        </div>
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