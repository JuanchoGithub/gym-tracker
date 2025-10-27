import React, { useState, useMemo, useContext } from 'react';
import { Exercise, WorkoutExercise, PerformedSet } from '../../types';
import { getExerciseHistory } from '../../utils/workoutUtils';
import { Icon } from '../common/Icon';
import { AppContext } from '../../contexts/AppContext';
import ChangeTimerModal from '../modals/ChangeTimerModal';
import ReplaceExerciseModal from '../modals/ReplaceExerciseModal';
import SelectBarModal from '../modals/SelectBarModal';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { useWeight } from '../../hooks/useWeight';

interface ExerciseHeaderProps {
    workoutExercise: WorkoutExercise;
    exerciseInfo: Exercise;
    onUpdate: (updatedExercise: WorkoutExercise) => void;
    onAddNote: () => void;
}

type FocusType = 'q_mark' | 'total_volume' | 'volume_increase' | 'total_reps' | 'weight_by_rep';

const ExerciseHeader: React.FC<ExerciseHeaderProps> = ({ workoutExercise, exerciseInfo, onUpdate, onAddNote }) => {
    const { history: allHistory } = useContext(AppContext);
    const { t } = useI18n();
    const { unit, setUnit } = useWeight();

    const [isFocusMenuOpen, setIsFocusMenuOpen] = useState(false);
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
    const [focusType, setFocusType] = useState<FocusType>('q_mark');
    const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
    const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
    const [isConfirmReplaceOpen, setIsConfirmReplaceOpen] = useState(false);
    const [isWarmupMenuOpen, setIsWarmupMenuOpen] = useState(false);
    const [isBarModalOpen, setIsBarModalOpen] = useState(false);

    const previousHistory = useMemo(() => getExerciseHistory(allHistory, exerciseInfo.id), [allHistory, exerciseInfo.id]);

    const totalVolume = useMemo(() => workoutExercise.sets.reduce((sum, set) => sum + (set.weight * set.reps), 0), [workoutExercise.sets]);
    const totalReps = useMemo(() => workoutExercise.sets.reduce((sum, set) => sum + set.reps, 0), [workoutExercise.sets]);
    const avgWeightPerRep = useMemo(() => totalReps > 0 ? (totalVolume / totalReps) : 0, [totalVolume, totalReps]);
    const volumeIncrease = useMemo(() => {
        if (previousHistory.length === 0) return null;
        const lastWorkout = previousHistory[0];
        const lastVolume = lastWorkout.exerciseData.sets.reduce((sum, set) => sum + (set.weight * set.reps), 0);
        return totalVolume - lastVolume;
    }, [previousHistory, totalVolume]);
    
    const handleSetFocus = (type: FocusType) => {
        setFocusType(type);
        setIsFocusMenuOpen(false);
    };

    const handleAddWarmupSets = (count: number) => {
        setIsOptionsMenuOpen(false);
        setIsWarmupMenuOpen(false);
        const firstWorkingSet = workoutExercise.sets.find(s => s.type === 'normal');
        if (!firstWorkingSet) {
            alert("Cannot add warmup sets without a normal set to base the weight on.");
            return;
        }
        const targetWeight = firstWorkingSet.weight;
        const newWarmupSets: PerformedSet[] = [];
        const reps = firstWorkingSet.reps > 5 ? 5 : firstWorkingSet.reps;

        const weights: number[] = [];
        if (count === 1) weights.push(targetWeight * 0.5);
        if (count === 2) weights.push(targetWeight * 0.5, targetWeight * 0.75);
        if (count === 3) weights.push(targetWeight * 0.4, targetWeight * 0.6, targetWeight * 0.8);
        
        for (const weight of weights) {
            newWarmupSets.push({
                id: `set-${Date.now()}-${Math.random()}`,
                reps,
                weight: Math.round(weight / 2.5) * 2.5, // Round to nearest 2.5kg
                type: 'warmup',
                isComplete: false,
            });
        }
        onUpdate({ ...workoutExercise, sets: [...newWarmupSets, ...workoutExercise.sets] });
    };

    const handleSaveTimer = (newTimers: { normal: number; warmup: number; drop: number; }) => {
        onUpdate({ ...workoutExercise, restTime: newTimers });
    };
    
    const handleReplaceExercise = (newExerciseId: string) => onUpdate({ ...workoutExercise, exerciseId: newExerciseId });
    const handleSelectBar = (barWeight: number) => onUpdate({ ...workoutExercise, barWeight });

    const renderFocusContent = () => {
        const { displayWeight } = useWeight(); // Call hook inside render function
        switch (focusType) {
            // FIX: Used a template literal to construct a valid translation key for the weight unit.
            case 'total_volume': return `${displayWeight(totalVolume, true)} ${t(`workout_${unit}`)}`;
            case 'volume_increase': 
                if (volumeIncrease === null) return 'N/A';
                // FIX: Used a template literal to construct a valid translation key for the weight unit.
                return `${volumeIncrease > 0 ? '+' : ''}${displayWeight(volumeIncrease, true)} ${t(`workout_${unit}`)}`;
            case 'total_reps': return `${totalReps} reps`;
            // FIX: Used a template literal to construct a valid translation key for the weight unit.
            case 'weight_by_rep': return `${displayWeight(avgWeightPerRep)} ${t(`workout_${unit}`)}/rep`;
            default: return <Icon name="question-mark-circle" className="w-5 h-5"/>;
        }
    };
    
    return (
      <>
        <div className="flex justify-between items-center relative">
            <h3 className="font-bold text-xl text-primary truncate pr-2">{exerciseInfo.name}</h3>
            <div className="flex items-center space-x-1">
                <div className="relative">
                    <button onClick={() => setIsFocusMenuOpen(prev => !prev)} className="bg-secondary/50 text-text-primary px-3 py-1 rounded-full text-sm font-semibold min-w-[60px] text-center">
                        {renderFocusContent()}
                    </button>
                    {isFocusMenuOpen && (
                        <div className="absolute right-0 mt-2 w-40 bg-slate-700 rounded-md shadow-lg z-30">
                            {['Total volume', 'Volume increase', 'Total reps', 'Weight by rep'].map(label => (
                                <button key={label} onClick={() => handleSetFocus(label.toLowerCase().replace(/ /g, '_') as FocusType)} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600">
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="relative">
                    <button onClick={() => setIsOptionsMenuOpen(prev => !prev)} className="p-2 text-text-secondary hover:text-primary">
                        <Icon name="ellipsis" />
                    </button>
                    {isOptionsMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-slate-700 rounded-md shadow-lg z-30" onMouseLeave={() => setIsOptionsMenuOpen(false)}>
                            <button onClick={() => { onAddNote(); setIsOptionsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600">Add Note</button>
                            <button onClick={() => setIsWarmupMenuOpen(true)} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600">Add Warmup Sets</button>
                            <button onClick={() => { setIsTimerModalOpen(true); setIsOptionsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600">Change Timer</button>
                            <button onClick={() => { setIsConfirmReplaceOpen(true); setIsOptionsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600">Replace Exercise</button>
                            <button onClick={() => { setIsBarModalOpen(true); setIsOptionsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600">{t('bar_type')}</button>
                            <button 
                                onClick={() => {
                                    setUnit(unit === 'kg' ? 'lbs' : 'kg'); 
                                    setIsOptionsMenuOpen(false); 
                                }} 
                                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600 flex justify-between items-center"
                            >
                                {t('weight_unit')} 
                                <span>{t(`workout_${unit === 'kg' ? 'lbs' : 'kg'}`).toUpperCase()}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <ChangeTimerModal 
            isOpen={isTimerModalOpen}
            onClose={() => setIsTimerModalOpen(false)}
            currentRestTimes={workoutExercise.restTime}
            onSave={handleSaveTimer}
        />
        <SelectBarModal isOpen={isBarModalOpen} onClose={() => setIsBarModalOpen(false)} onSelect={handleSelectBar} currentBarWeight={workoutExercise.barWeight || 0} />
        <Modal isOpen={isConfirmReplaceOpen} onClose={() => setIsConfirmReplaceOpen(false)} title="Replace Exercise?">
            <p className="text-text-secondary mb-4">Are you sure you want to replace this exercise? Current sets will be kept.</p>
            <div className="flex justify-end space-x-2">
                <button onClick={() => setIsConfirmReplaceOpen(false)} className="bg-secondary px-4 py-2 rounded-md">Cancel</button>
                <button onClick={() => { setIsConfirmReplaceOpen(false); setIsReplaceModalOpen(true); }} className="bg-primary px-4 py-2 rounded-md">Replace</button>
            </div>
        </Modal>
        <ReplaceExerciseModal isOpen={isReplaceModalOpen} onClose={() => setIsReplaceModalOpen(false)} onReplace={handleReplaceExercise} />
        <Modal isOpen={isWarmupMenuOpen} onClose={() => setIsWarmupMenuOpen(false)} title="Add how many warmup sets?">
            <div className="flex justify-around items-center p-4">
                {[1, 2, 3].map(count => (
                    <button key={count} onClick={() => handleAddWarmupSets(count)} className="bg-primary text-white font-bold w-12 h-12 rounded-full text-xl">
                        {count}
                    </button>
                ))}
            </div>
        </Modal>
      </>
    );
};

export default ExerciseHeader;