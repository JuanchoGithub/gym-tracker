
import React, { useState, useContext, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { AppContext } from '../../contexts/AppContext';
import { ActiveWorkoutContext } from '../../contexts/ActiveWorkoutContext';
import { useMeasureUnit } from '../../hooks/useWeight';
import OneRepMaxWizardModal from './OneRepMaxWizardModal';
import ReplaceExerciseModal from './ReplaceExerciseModal';
import { Icon } from '../common/Icon';
import { TranslationKey } from '../../contexts/I18nContext';
import { calculate1RM, estimateRepsFromPercentage } from '../../utils/workoutUtils';
import { Routine, WorkoutExercise } from '../../types';

interface OneRepMaxManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const OneRepMaxManagerModal: React.FC<OneRepMaxManagerModalProps> = ({ isOpen, onClose }) => {
    const { t } = useI18n();
    const { exercises, profile, allTimeBestSets, defaultRestTimes } = useContext(AppContext);
    const { startWorkout } = useContext(ActiveWorkoutContext);
    const { displayWeight, weightUnit, getStoredWeight } = useMeasureUnit();
    
    const [selectedExerciseId, setSelectedExerciseId] = useState<string>('ex-2'); // Default to Squat
    const [activeTab, setActiveTab] = useState<'calculate' | 'test'>('calculate');
    const [wizardOpen, setWizardOpen] = useState(false);
    const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);

    // Persist temporary base 1RM so user can edit it without saving to profile immediately
    const [manualBaseMax, setManualBaseMax] = useState<number | null>(null);

    const selectedExercise = exercises.find(e => e.id === selectedExerciseId);

    // Determine the starting 1RM source
    const storedMax = profile.oneRepMaxes?.[selectedExerciseId]?.weight;
    const historyMax = allTimeBestSets[selectedExerciseId] ? calculate1RM(allTimeBestSets[selectedExerciseId].weight, allTimeBestSets[selectedExerciseId].reps) : 0;
    
    // The effective 1RM used for calculation. 
    // Priority: Manual Input -> Profile Stored -> Calculated from History -> 0
    const effectiveMax = manualBaseMax !== null ? manualBaseMax : (storedMax || historyMax || 0);

    // Reset manual override when exercise changes
    useEffect(() => {
        setManualBaseMax(null);
    }, [selectedExerciseId]);

    const handleStartWorkout = (percentage: number) => {
        if (!selectedExercise) return;
        
        const targetWeight = Math.round(effectiveMax * (percentage / 100) / 2.5) * 2.5;
        const targetReps = estimateRepsFromPercentage(percentage);

        const newRoutine: Routine = {
            id: `quick-start-${Date.now()}`,
            name: `${selectedExercise.name} Focus`,
            description: `Quick session started from 1RM calculator at ${percentage}% intensity.`,
            isTemplate: false,
            exercises: [
                {
                    id: `we-${Date.now()}`,
                    exerciseId: selectedExercise.id,
                    sets: [
                        {
                            id: `set-1-${Date.now()}`,
                            reps: targetReps,
                            weight: targetWeight,
                            type: 'normal',
                            isComplete: false,
                        },
                        {
                            id: `set-2-${Date.now()}`,
                            reps: targetReps,
                            weight: targetWeight,
                            type: 'normal',
                            isComplete: false,
                        },
                        {
                            id: `set-3-${Date.now()}`,
                            reps: targetReps,
                            weight: targetWeight,
                            type: 'normal',
                            isComplete: false,
                        }
                    ],
                    restTime: { ...defaultRestTimes }
                }
            ]
        };
        
        startWorkout(newRoutine);
        onClose();
    };

    return (
        <>
        <Modal isOpen={isOpen} onClose={onClose} title={t('orm_title')}>
            <div className="space-y-4">
                {/* Exercise Selector */}
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">{t('orm_modal_select_exercise')}</label>
                    <button 
                        onClick={() => setIsSelectModalOpen(true)}
                        className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-3 text-left flex justify-between items-center hover:bg-slate-800 transition-colors group"
                    >
                        <span className="text-white font-medium truncate pr-2">{selectedExercise?.name || t('common_select')}</span>
                        <Icon name="search" className="w-5 h-5 text-text-secondary group-hover:text-primary" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-900 rounded-lg p-1">
                    <button 
                        onClick={() => setActiveTab('calculate')}
                        className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'calculate' ? 'bg-primary text-white' : 'text-text-secondary'}`}
                    >
                        {t('orm_calculate_tab')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('test')}
                        className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'test' ? 'bg-primary text-white' : 'text-text-secondary'}`}
                    >
                        {t('orm_test_tab')}
                    </button>
                </div>

                {activeTab === 'calculate' && (
                    <div className="bg-surface-highlight/30 p-4 rounded-xl border border-white/5">
                         <PercentageCalculatorContent 
                            oneRepMax={effectiveMax} 
                            setOneRepMax={(val) => setManualBaseMax(val)}
                            displayWeight={displayWeight} 
                            getStoredWeight={getStoredWeight}
                            weightUnit={weightUnit} 
                            t={t} 
                            onStart={handleStartWorkout}
                        />
                    </div>
                )}

                {activeTab === 'test' && (
                     <div className="text-center py-4">
                         <p className="text-text-secondary mb-4">
                             {t('orm_current_max')}: <span className="font-bold text-white">{displayWeight(effectiveMax)} {t(('workout_' + weightUnit) as TranslationKey)}</span>
                         </p>
                         <button 
                            onClick={() => setWizardOpen(true)}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg transition-colors"
                         >
                             {t('orm_wizard_title')}
                         </button>
                     </div>
                )}
            </div>
        </Modal>
        
        <OneRepMaxWizardModal 
            isOpen={wizardOpen} 
            onClose={() => setWizardOpen(false)} 
            exerciseId={selectedExerciseId} 
            initialWeight={effectiveMax}
        />

        <ReplaceExerciseModal 
            isOpen={isSelectModalOpen}
            onClose={() => setIsSelectModalOpen(false)}
            onSelectExercise={(id) => setSelectedExerciseId(id)}
            title={t('orm_modal_select_exercise')}
            buttonText={t('common_select')}
        />
        </>
    );
};

// Extracted content for reuse
const PercentageCalculatorContent = ({ oneRepMax, setOneRepMax, displayWeight, getStoredWeight, weightUnit, t, onStart }: any) => {
    const [percentage, setPercentage] = useState(75);
    const [inputValue, setInputValue] = useState(displayWeight(oneRepMax));
    
    // Update local input when external max changes (e.g. exercise switch)
    useEffect(() => {
        setInputValue(displayWeight(oneRepMax));
    }, [oneRepMax, displayWeight]);

    const handleBlur = () => {
        const val = parseFloat(inputValue);
        if (!isNaN(val) && val >= 0) {
            setOneRepMax(getStoredWeight(val));
        } else {
            setInputValue(displayWeight(oneRepMax));
        }
    };

    const calculated = oneRepMax * (percentage / 100);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                <span className="text-sm font-bold text-text-secondary">Base 1RM</span>
                <div className="flex items-center gap-1">
                    <input 
                        type="number" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onBlur={handleBlur}
                        onFocus={(e) => e.target.select()}
                        className="bg-transparent text-right font-bold text-white w-20 outline-none border-b border-white/20 focus:border-primary transition-colors"
                    />
                    <span className="text-xs text-text-secondary">{t(('workout_' + weightUnit) as TranslationKey)}</span>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-text-secondary">Intensity</span>
                    <span className="text-xl font-bold text-primary">{percentage}%</span>
                </div>
                <input 
                    type="range" 
                    min="50" 
                    max="100" 
                    step="5" 
                    value={percentage} 
                    onChange={(e) => setPercentage(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                />
            </div>
            
             <div className="text-center mt-4 mb-2">
                <p className="text-xs text-text-secondary uppercase font-bold">{t('orm_weight_label')}</p>
                <p className="text-4xl font-mono font-bold text-white">{displayWeight(calculated)} <span className="text-lg text-text-secondary">{t(('workout_' + weightUnit) as TranslationKey)}</span></p>
            </div>

             <div className="grid grid-cols-4 gap-2 mt-2 text-center text-xs text-text-secondary">
                 {[60, 70, 80, 90].map(p => (
                     <div key={p} onClick={() => setPercentage(p)} className={`cursor-pointer p-1 rounded hover:bg-white/5 ${percentage === p ? 'bg-white/10 text-primary' : ''}`}>
                         <div className="font-bold">{p}%</div>
                         <div>{displayWeight(oneRepMax * (p/100))}</div>
                     </div>
                 ))}
             </div>
             
             <button 
                onClick={() => onStart(percentage)}
                className="w-full bg-success text-white font-bold py-3 rounded-lg shadow-lg hover:bg-green-600 transition-colors mt-4 flex items-center justify-center gap-2"
            >
                <Icon name="play" className="w-5 h-5" />
                <span>{t('orm_apply_to_workout')}</span>
            </button>
        </div>
    );
}

export default OneRepMaxManagerModal;
