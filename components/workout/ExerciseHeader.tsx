
import React, { useState, useMemo, useContext, useRef } from 'react';
import { Exercise, WorkoutExercise, PerformedSet } from '../../types';
import { getExerciseHistory, calculate1RM } from '../../utils/workoutUtils';
import { Icon } from '../common/Icon';
import { AppContext } from '../../contexts/AppContext';
import ReplaceExerciseModal from '../modals/ReplaceExerciseModal';
import SelectBarModal from '../modals/SelectBarModal';
import Modal from '../common/Modal';
import ConfirmModal from '../modals/ConfirmModal';
import { useI18n } from '../../hooks/useI18n';
import { useMeasureUnit } from '../../hooks/useWeight';
import { TranslationKey } from '../../contexts/I18nContext';
import { useClickOutside } from '../../hooks/useClickOutside';
import SelectSupersetModal from '../modals/SelectSupersetModal';
import PercentageCalculatorModal from '../modals/PercentageCalculatorModal';
import OneRepMaxTestRunner from '../onerepmax/OneRepMaxTestRunner';
import CascadeUpdateModal from '../onerepmax/CascadeUpdateModal';
import { useExerciseName } from '../../hooks/useExerciseName';

interface ExerciseHeaderProps {
    workoutExercise: WorkoutExercise;
    exerciseInfo: Exercise;
    onUpdate: (updatedExercise: WorkoutExercise) => void;
    onAddNote: () => void;
    onOpenTimerModal: () => void;
    onToggleCollapse: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    isMoveUpDisabled: boolean;
    isMoveDownDisabled: boolean;
    onReorganize: () => void;
    onRemove?: () => void;
    onCreateSuperset?: () => void;
    onJoinSuperset?: (supersetId: string) => void;
    availableSupersets?: { id: string; name: string; exercises: string[] }[];
    onShowDetails?: () => void;
}

type FocusType = 'q_mark' | 'total_volume' | 'volume_increase' | 'total_reps' | 'weight_by_rep';

const ExerciseHeader: React.FC<ExerciseHeaderProps> = (props) => {
    const { 
        workoutExercise, exerciseInfo, onUpdate, onAddNote, onOpenTimerModal, onToggleCollapse, 
        onMoveUp, onMoveDown, isMoveUpDisabled, isMoveDownDisabled, onReorganize, onRemove, 
        onCreateSuperset, onJoinSuperset, availableSupersets = [], onShowDetails
    } = props;
    const { history: allHistory, profile, updateOneRepMax } = useContext(AppContext);
    const { t } = useI18n();
    const { weightUnit, displayWeight, getStoredWeight } = useMeasureUnit();
    const getExerciseName = useExerciseName();

    const [isFocusMenuOpen, setIsFocusMenuOpen] = useState(false);
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
    const [focusType, setFocusType] = useState<FocusType>('q_mark');
    const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
    const [isConfirmReplaceOpen, setIsConfirmReplaceOpen] = useState(false);
    const [isConfirmRemoveOpen, setIsConfirmRemoveOpen] = useState(false);
    const [isBarModalOpen, setIsBarModalOpen] = useState(false);
    const [isSupersetModalOpen, setIsSupersetModalOpen] = useState(false);
    const [isPercentageModalOpen, setIsPercentageModalOpen] = useState(false);
    const [isOrmTestOpen, setIsOrmTestOpen] = useState(false);
    const [isPotentialModalOpen, setIsPotentialModalOpen] = useState(false);
    const [isCascadeOpen, setIsCascadeOpen] = useState(false);
    const [newMaxForCascade, setNewMaxForCascade] = useState(0);
    
    const focusMenuRef = useRef<HTMLDivElement>(null);
    const optionsMenuRef = useRef<HTMLDivElement>(null);

    useClickOutside(focusMenuRef, () => setIsFocusMenuOpen(false));
    useClickOutside(optionsMenuRef, () => setIsOptionsMenuOpen(false));

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
    
    // 1RM Logic
    const storedMax = profile.oneRepMaxes?.[exerciseInfo.id]?.weight || 0;
    
    const currentSessionPotential = useMemo(() => {
        let maxE1rm = 0;
        let bestSet = null;
        workoutExercise.sets.forEach(set => {
            if (set.type === 'normal' && set.isComplete && set.weight > 0 && set.reps > 0) {
                const e1rm = calculate1RM(set.weight, set.reps);
                if (e1rm > maxE1rm) {
                    maxE1rm = e1rm;
                    bestSet = set;
                }
            }
        });
        return { maxE1rm, bestSet };
    }, [workoutExercise.sets]);

    const hasNewPotential = storedMax > 0 && currentSessionPotential.maxE1rm > storedMax;

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
        
        if (targetWeight === 0) { newWarmupSets.push({ id: `set-${Date.now()}-${Math.random()}`, reps, weight: barWeight, type: 'warmup', isComplete: false }); } 
        else if (targetWeight <= barWeight + 10 && barWeight > 0) { newWarmupSets.push({ id: `set-${Date.now()}-${Math.random()}`, reps, weight: barWeight, type: 'warmup', isComplete: false }); } 
        else if (targetWeight < 40) { const warmupWeight = Math.round((targetWeight * 0.5) / 2.5) * 2.5; if (warmupWeight < targetWeight) newWarmupSets.push({ id: `set-${Date.now()}-${Math.random()}`, reps, weight: warmupWeight, type: 'warmup', isComplete: false }); } 
        else { const useThreeSets = targetWeight >= 80; const percentages = useThreeSets ? [0.4, 0.6, 0.8] : [0.5, 0.75]; const weights = percentages.map(p => targetWeight * p).map(w => Math.max(w, barWeight)).map(w => Math.round(w / 2.5) * 2.5).filter(w => w < targetWeight); const finalWeights = [...new Set(weights)].sort((a, b) => a - b); for (const weight of finalWeights) newWarmupSets.push({ id: `set-${Date.now()}-${Math.random()}`, reps, weight, type: 'warmup', isComplete: false }); if (finalWeights.length === 0 && targetWeight > barWeight && barWeight > 0) newWarmupSets.push({ id: `set-${Date.now()}-${Math.random()}`, reps, weight: barWeight, type: 'warmup', isComplete: false }); }
        
        if (newWarmupSets.length > 0) onUpdate({ ...workoutExercise, sets: [...newWarmupSets, ...workoutExercise.sets] });
    };

    const handleReplaceExercise = (newExerciseId: string) => onUpdate({ ...workoutExercise, exerciseId: newExerciseId });
    const handleSelectBar = (barWeight: number) => onUpdate({ ...workoutExercise, barWeight });
    
    const handleConfirmRemove = () => {
        if (onRemove) onRemove();
        setIsConfirmRemoveOpen(false);
    };

    const handleSupersetAction = () => {
        if (availableSupersets.length > 0) {
            setIsSupersetModalOpen(true);
        } else if (onCreateSuperset) {
            onCreateSuperset();
        }
        setIsOptionsMenuOpen(false);
    };

    const handleSupersetSelection = (id: string | 'new') => {
        setIsSupersetModalOpen(false);
        if (id === 'new' && onCreateSuperset) {
            onCreateSuperset();
        } else if (id !== 'new' && onJoinSuperset) {
            onJoinSuperset(id);
        }
    };

    const handleApplyPercentage = (percentage: number) => {
        const targetWeight = storedMax * (percentage / 100);
        const updatedSets = workoutExercise.sets.map(set => {
            if (set.type === 'normal' && !set.isComplete) {
                const rounded = Math.round(targetWeight / 2.5) * 2.5;
                return { ...set, weight: rounded };
            }
            return set;
        });
        onUpdate({ ...workoutExercise, sets: updatedSets });
    };
    
    const handleUpdateProfileFromPotential = () => {
        const e1rm = currentSessionPotential.maxE1rm;
        updateOneRepMax(exerciseInfo.id, e1rm, 'calculated');
        setIsPotentialModalOpen(false);
        setNewMaxForCascade(e1rm);
        setIsCascadeOpen(true);
    };

    const handleTestComplete = (newMax: number) => {
        updateOneRepMax(exerciseInfo.id, newMax, 'tested');
        setIsOrmTestOpen(false);
        setNewMaxForCascade(newMax);
        setIsCascadeOpen(true);
    };

    const renderFocusContent = () => {
        switch (focusType) {
            case 'total_volume': return `${displayWeight(totalVolume, true)} ${t(`workout_${weightUnit}` as TranslationKey)}`;
            case 'volume_increase': 
                if (volumeIncrease === null) return 'N/A';
                return `${volumeIncrease > 0 ? '+' : ''}${displayWeight(volumeIncrease, true)} ${t(`workout_${weightUnit}` as TranslationKey)}`;
            case 'total_reps': return `${totalReps} ${t('workout_reps')}`;
            case 'weight_by_rep': return `${displayWeight(avgWeightPerRep)} ${t(`workout_${weightUnit}` as TranslationKey)}/rep`;
            default: return <Icon name="question-mark-circle" className="w-5 h-5"/>;
        }
    };

    const focusOptions: { labelKey: TranslationKey, focusType: FocusType }[] = [
        { labelKey: 'exercise_header_focus_total_volume', focusType: 'total_volume' },
        { labelKey: 'exercise_header_focus_volume_increase', focusType: 'volume_increase' },
        { labelKey: 'exercise_header_focus_total_reps', focusType: 'total_reps' },
        { labelKey: 'exercise_header_focus_weight_by_rep', focusType: 'weight_by_rep' },
    ];
    
    return (
      <>
        <div className="flex justify-between items-center relative">
            <div className="flex items-center gap-2 flex-grow min-w-0 pr-2">
                <button onClick={onToggleCollapse} className="text-left truncate min-w-0">
                    <h3 className="font-bold text-xl text-primary truncate">{getExerciseName(exerciseInfo)}</h3>
                </button>
                {hasNewPotential && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsPotentialModalOpen(true); }}
                        className="bg-green-500/20 text-green-400 p-1 rounded-md animate-pulse border border-green-500/30 hover:bg-green-500/30"
                    >
                        <Icon name="chart-line" className="w-4 h-4" />
                    </button>
                )}
                {onShowDetails && (
                     <button onClick={(e) => { e.stopPropagation(); onShowDetails(); }} className="text-text-secondary/50 hover:text-primary transition-colors p-1 flex-shrink-0">
                         <Icon name="question-mark-circle" className="w-5 h-5" />
                     </button>
                )}
            </div>
            <div className="flex items-center space-x-1">
                <div className="relative" ref={focusMenuRef}>
                    <button onClick={() => setIsFocusMenuOpen(prev => !prev)} className="bg-secondary/50 text-text-primary px-3 py-1 rounded-full text-sm font-semibold min-w-[60px] text-center">
                        {renderFocusContent()}
                    </button>
                    {isFocusMenuOpen && (
                        <div className="absolute right-0 mt-2 w-40 bg-slate-700 rounded-md shadow-lg z-30">
                            {focusOptions.map(({ labelKey, focusType }) => (
                                <button key={labelKey as string} onClick={() => handleSetFocus(focusType)} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600">
                                    {t(labelKey)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="relative" ref={optionsMenuRef}>
                    <button onClick={() => setIsOptionsMenuOpen(prev => !prev)} className="p-2 text-text-secondary hover:text-primary">
                        <Icon name="ellipsis" />
                    </button>
                    {isOptionsMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-slate-700 rounded-md shadow-lg z-30 max-h-80 overflow-y-auto">
                            {onCreateSuperset && (
                                <>
                                <button onClick={handleSupersetAction} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600 flex items-center gap-2 font-bold text-indigo-400">
                                    <Icon name="duplicate" className="w-4 h-4"/>
                                    <span>{availableSupersets.length > 0 ? "Add to Superset" : "Create Superset"}</span>
                                </button>
                                <div className="h-px bg-secondary/50 my-1"></div>
                                </>
                            )}
                             {['Barbell', 'Dumbbell'].includes(exerciseInfo.category) && (
                                <>
                                    <button onClick={() => { setIsPercentageModalOpen(true); setIsOptionsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600 flex items-center gap-2">
                                        <Icon name="chart-line" className="w-4 h-4"/>
                                        <span>{t('orm_action_use_weights')}</span>
                                    </button>
                                    <button onClick={() => { setIsOrmTestOpen(true); setIsOptionsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600 flex items-center gap-2">
                                        <Icon name="trophy" className="w-4 h-4"/>
                                        <span>{t('orm_action_recalibrate')}</span>
                                    </button>
                                    <div className="h-px bg-secondary/50 my-1"></div>
                                </>
                             )}

                            <button onClick={() => { onMoveUp(); setIsOptionsMenuOpen(false); }} disabled={isMoveUpDisabled} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                <Icon name="arrow-up" className="w-4 h-4"/>
                                <span>{t('exercise_header_menu_move_up')}</span>
                            </button>
                            <button onClick={() => { onMoveDown(); setIsOptionsMenuOpen(false); }} disabled={isMoveDownDisabled} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                <Icon name="arrow-down" className="w-4 h-4"/>
                                <span>{t('exercise_header_menu_move_down')}</span>
                            </button>
                            <button onClick={() => { onReorganize(); setIsOptionsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600 flex items-center gap-2">
                                <Icon name="reorganize" className="w-4 h-4"/>
                                <span>{t('exercise_header_menu_reorganize')}</span>
                            </button>
                            <div className="h-px bg-secondary/50 my-1"></div>
                            <button onClick={() => { onAddNote(); setIsOptionsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600">{t('exercise_header_menu_add_note')}</button>
                            <button onClick={handleAddWarmupSets} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600">{t('exercise_header_menu_add_warmup')}</button>
                            <button onClick={() => { onOpenTimerModal(); setIsOptionsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600">{t('exercise_header_menu_change_timer')}</button>
                            <button onClick={() => { setIsConfirmReplaceOpen(true); setIsOptionsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600">{t('exercise_header_menu_replace')}</button>
                            <button onClick={() => { setIsBarModalOpen(true); setIsOptionsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600">{t('bar_type')}</button>
                            {onRemove && (
                                <>
                                    <div className="h-px bg-secondary/50 my-1"></div>
                                    <button onClick={() => { setIsConfirmRemoveOpen(true); setIsOptionsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-600 flex items-center gap-2">
                                        <Icon name="trash" className="w-4 h-4"/>
                                        <span>{t('exercise_header_menu_remove')}</span>
                                    </button>
                                </>
                            )}
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
        <ConfirmModal
            isOpen={isConfirmRemoveOpen}
            onClose={() => setIsConfirmRemoveOpen(false)}
            onConfirm={handleConfirmRemove}
            title={t('remove_exercise_confirm_title')}
            message={t('remove_exercise_confirm_message')}
            confirmText={t('common_delete')}
            confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
        
        <SelectSupersetModal 
            isOpen={isSupersetModalOpen}
            onClose={() => setIsSupersetModalOpen(false)}
            availableSupersets={availableSupersets}
            onSelect={handleSupersetSelection}
        />

        <PercentageCalculatorModal
            isOpen={isPercentageModalOpen}
            onClose={() => setIsPercentageModalOpen(false)}
            oneRepMax={storedMax}
            onApplyToWorkout={handleApplyPercentage}
        />

        <OneRepMaxTestRunner
            isOpen={isOrmTestOpen}
            onClose={() => setIsOrmTestOpen(false)}
            exerciseId={exerciseInfo.id}
            targetMax={storedMax > 0 ? storedMax : (currentSessionPotential.maxE1rm || 20)}
            onComplete={handleTestComplete}
        />
        
        <CascadeUpdateModal 
            isOpen={isCascadeOpen}
            onClose={() => setIsCascadeOpen(false)}
            parentExerciseId={exerciseInfo.id}
            newParentMax={newMaxForCascade}
        />
        
        {/* Active PR Modal */}
        <Modal isOpen={isPotentialModalOpen} onClose={() => setIsPotentialModalOpen(false)} title={t('orm_workout_potential_title')}>
            <div className="space-y-4">
                 <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl">
                    <Icon name="trophy" className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                     <p className="text-white text-center text-lg">
                         {t('orm_workout_potential_msg', {
                             weight: displayWeight(currentSessionPotential.bestSet?.weight || 0),
                             reps: currentSessionPotential.bestSet?.reps || 0,
                             e1rm: displayWeight(currentSessionPotential.maxE1rm)
                         })}
                     </p>
                 </div>
                 <button onClick={handleUpdateProfileFromPotential} className="w-full bg-primary text-white font-bold py-3 rounded-lg shadow-lg">
                     {t('orm_workout_update_btn')}
                 </button>
            </div>
        </Modal>
      </>
    );
};

export default ExerciseHeader;
