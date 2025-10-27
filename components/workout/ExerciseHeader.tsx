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
// FIX: Import 'TranslationKey' type to resolve TypeScript error.
import { TranslationKey } from '../../contexts/I18nContext';

interface ExerciseHeaderProps {
    workoutExercise: WorkoutExercise;
    exerciseInfo: Exercise;
    onUpdate: (updatedExercise: WorkoutExercise) => void;
    onAddNote: () => void;
    onOpenTimerModal: () => void;
}

type FocusType = 'q_mark' | 'total_volume' | 'volume_increase' | 'total_reps' | 'weight_by_rep';

const ExerciseHeader: React.FC<ExerciseHeaderProps> = ({ workoutExercise, exerciseInfo, onUpdate, onAddNote, onOpenTimerModal }) => {
    const { history: allHistory } = useContext(AppContext);
    const { t } = useI18n();
    const { unit, setUnit, displayWeight } = useWeight();

    const [isFocusMenuOpen, setIsFocusMenuOpen] = useState(false);
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
    const [focusType, setFocusType] = useState<FocusType>('q_mark');
    const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
    const [isConfirmReplaceOpen, setIsConfirmReplaceOpen] = useState(false);
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

    const handleAddWarmupSets = () => {
        setIsOptionsMenuOpen(false);

        const firstWorkingSet = workoutExercise.sets.find(s => s.type === 'normal');
        const targetWeight = firstWorkingSet?.weight || 0;
        const barWeight = workoutExercise.barWeight || 0;
        const newWarmupSets: PerformedSet[] = [];
        const reps = 10;

        if (targetWeight === 0) {
            newWarmupSets.push({
                id: `set-${Date.now()}-${Math.random()}`,
                reps,
                weight: barWeight,
                type: 'warmup',
                isComplete: false,
            });
        } else if (targetWeight <= barWeight + 10 && barWeight > 0) {
            newWarmupSets.push({
                id: `set-${Date.now()}-${Math.random()}`,
                reps,
                weight: barWeight,
                type: 'warmup',
                isComplete: false,
            });
        } else if (targetWeight < 40) {
            const warmupWeight = Math.round((targetWeight * 0.5) / 2.5) * 2.5;
            if (warmupWeight < targetWeight) {
                newWarmupSets.push({
                    id: `set-${Date.now()}-${Math.random()}`,
                    reps,
                    weight: warmupWeight,
                    type: 'warmup',
                    isComplete: false,
                });
            }
        } else { // targetWeight >= 40
            const useThreeSets = targetWeight >= 80;
            const percentages = useThreeSets ? [0.4, 0.6, 0.8] : [0.5, 0.75];
            
            const weights = percentages
                .map(p => targetWeight * p)
                .map(w => Math.max(w, barWeight))
                .map(w => Math.round(w / 2.5) * 2.5)
                .filter(w => w < targetWeight);

            const finalWeights = [...new Set(weights)].sort((a, b) => a - b);

            for (const weight of finalWeights) {
                 newWarmupSets.push({
                    id: `set-${Date.now()}-${Math.random()}`,
                    reps,
                    weight,
                    type: 'warmup',
                    isComplete: false,
                });
            }
            if (finalWeights.length === 0 && targetWeight > barWeight && barWeight > 0) {
                 newWarmupSets.push({
                    id: `set-${Date.now()}-${Math.random()}`,
                    reps,
                    weight: barWeight,
                    type: 'warmup',
                    isComplete: false,
                });
            }
        }
        
        if (newWarmupSets.length > 0) {
            onUpdate({ ...workoutExercise, sets: [...newWarmupSets, ...workoutExercise.sets] });
        } else if (targetWeight > 0) {
            alert("Could not generate warmup sets. Target weight might be too low.");
        }
    };

    const handleReplaceExercise = (newExerciseId: string) => onUpdate({ ...workoutExercise, exerciseId: newExerciseId });
    const handleSelectBar = (barWeight: number) => onUpdate({ ...workoutExercise, barWeight });

    const renderFocusContent = () => {
        switch (focusType) {
            case 'total_volume': return `${displayWeight(totalVolume, true)} ${t(`workout_${unit}`)}`;
            case 'volume_increase': 
                if (volumeIncrease === null) return 'N/A';
                return `${volumeIncrease > 0 ? '+' : ''}${displayWeight(volumeIncrease, true)} ${t(`workout_${unit}`)}`;
            case 'total_reps': return `${totalReps} ${t('workout_reps')}`;
            case 'weight_by_rep': return `${displayWeight(avgWeightPerRep)} ${t(`workout_${unit}`)}/rep`;
            default: return <Icon name="question-mark-circle" className="w-5 h-5"/>;
        }
    };

    const focusOptions: { labelKey: TranslationKey, focusType: FocusType }[] = [
        { labelKey: 'exercise_header_focus_total_volume', focusType: 'total_volume' },
        { labelKey: 'exercise_header_focus_volume_increase', focusType: 'volume_increase' },
        { labelKey: 'exercise_header_focus_total_reps', focusType: 'total_reps' },
        { labelKey: 'exercise_header_focus_weight_by_rep', focusType: 'weight_by_rep' },
    ]
    
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
                            {focusOptions.map(({ labelKey, focusType }) => (
                                <button key={labelKey} onClick={() => handleSetFocus(focusType)} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600">
                                    {t(labelKey)}
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
                            <button onClick={() => { onAddNote(); setIsOptionsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600">{t('exercise_header_menu_add_note')}</button>
                            <button onClick={handleAddWarmupSets} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600">{t('exercise_header_menu_add_warmup')}</button>
                            <button onClick={() => { onOpenTimerModal(); setIsOptionsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600">{t('exercise_header_menu_change_timer')}</button>
                            <button onClick={() => { setIsConfirmReplaceOpen(true); setIsOptionsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600">{t('exercise_header_menu_replace')}</button>
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

        <SelectBarModal isOpen={isBarModalOpen} onClose={() => setIsBarModalOpen(false)} onSelect={handleSelectBar} currentBarWeight={workoutExercise.barWeight || 0} />
        <Modal isOpen={isConfirmReplaceOpen} onClose={() => setIsConfirmReplaceOpen(false)} title={t('replace_exercise_modal_confirm_title')}>
            <p className="text-text-secondary mb-4">{t('replace_exercise_modal_confirm_message')}</p>
            <div className="flex justify-end space-x-2">
                <button onClick={() => setIsConfirmReplaceOpen(false)} className="bg-secondary px-4 py-2 rounded-md">{t('common_cancel')}</button>
                <button onClick={() => { setIsConfirmReplaceOpen(false); setIsReplaceModalOpen(true); }} className="bg-primary px-4 py-2 rounded-md">{t('replace_exercise_modal_button')}</button>
            </div>
        </Modal>
        <ReplaceExerciseModal 
            isOpen={isReplaceModalOpen} 
            onClose={() => setIsReplaceModalOpen(false)} 
            onSelectExercise={handleReplaceExercise}
            title={t('replace_exercise_modal_title')}
            buttonText={t('replace_exercise_modal_button')}
        />
      </>
    );
};

export default ExerciseHeader;