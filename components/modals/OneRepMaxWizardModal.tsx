
import React, { useState, useContext, useEffect } from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { AppContext } from '../../contexts/AppContext';
import { useMeasureUnit } from '../../hooks/useWeight';
import { generate1RMProtocol, ProtocolStep } from '../../utils/workoutUtils';
import { Icon } from '../common/Icon';
import { formatSecondsToMMSS } from '../../utils/timeUtils';
import { TranslationKey } from '../../contexts/I18nContext';

interface OneRepMaxWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    exerciseId: string;
    initialWeight?: number; // e1RM or current stored 1RM to base protocol on
}

const OneRepMaxWizardModal: React.FC<OneRepMaxWizardModalProps> = ({ isOpen, onClose, exerciseId, initialWeight = 0 }) => {
    const { t } = useI18n();
    const { updateOneRepMax, getExerciseById } = useContext(AppContext);
    const { displayWeight, getStoredWeight, weightUnit } = useMeasureUnit();
    const exercise = getExerciseById(exerciseId);

    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [target1RM, setTarget1RM] = useState(initialWeight);
    const [protocol, setProtocol] = useState<ProtocolStep[]>([]);
    const [restTimer, setRestTimer] = useState<number | null>(null);
    const [testResult, setTestResult] = useState<number | null>(null);
    const [failureCount, setFailureCount] = useState(0);
    const [attemptWeight, setAttemptWeight] = useState(initialWeight);

    useEffect(() => {
        // Only initialize protocol if it hasn't been set yet for this open session
        if (isOpen && target1RM > 0 && protocol.length === 0) {
            setProtocol(generate1RMProtocol(target1RM));
            setAttemptWeight(target1RM);
            setCurrentStepIndex(0);
            setRestTimer(null);
            setTestResult(null);
            setFailureCount(0);
        }
    }, [isOpen, target1RM, protocol.length]);

    useEffect(() => {
        let interval: number;
        if (restTimer !== null && restTimer > 0) {
            interval = window.setInterval(() => {
                setRestTimer(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [restTimer]);

    if (!exercise) return null;

    // If no initial weight provided, ask for it first
    if (target1RM === 0) {
         return (
            <Modal isOpen={isOpen} onClose={onClose} title={t('orm_wizard_title')}>
                <div className="space-y-4">
                    <p className="text-text-secondary">{t('orm_estimated_max')}</p>
                    <div className="flex items-center justify-center gap-2">
                         <input 
                            type="number" 
                            className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-3 text-center text-xl font-bold"
                            placeholder={`0 ${t(('workout_' + weightUnit) as TranslationKey)}`}
                            onChange={(e) => {
                                // Logic handled onBlur to avoid state thrashing
                            }}
                            onBlur={(e) => {
                                 const val = parseFloat(e.target.value);
                                 if (!isNaN(val) && val > 0) {
                                     setTarget1RM(getStoredWeight(val));
                                 }
                            }}
                            onFocus={(e) => e.target.select()}
                            autoFocus
                        />
                    </div>
                     <button 
                        onClick={() => { /* Logic handled by onBlur mostly */ }}
                        className="w-full bg-primary text-white font-bold py-3 rounded-lg"
                        disabled={target1RM === 0}
                    >
                        {t('common_next')}
                    </button>
                </div>
            </Modal>
        );
    }

    const currentStep = protocol[currentStepIndex];
    if (!currentStep) return null;

    const isLastStep = currentStep?.type === 'attempt';
    // If it's the last step, use the adjustable attemptWeight, otherwise calculate based on target1RM
    const calculatedWeight = Math.round(target1RM * currentStep?.percentage / 2.5) * 2.5;
    const currentWeight = isLastStep ? attemptWeight : calculatedWeight;

    const handleSuccess = () => {
        if (isLastStep) {
            setTestResult(attemptWeight);
        } else {
            // Start rest timer
            setRestTimer(currentStep.rest);
        }
    };

    const handleRestComplete = () => {
        setRestTimer(null);
        setCurrentStepIndex(prev => prev + 1);
    };

    const handleFail = () => {
        if (isLastStep) {
            setFailureCount(prev => prev + 1);
            // Decrease attempt weight by 5%
             const newTarget = Math.round(attemptWeight * 0.95 / 2.5) * 2.5;
             setAttemptWeight(newTarget);
        }
    };
    
    const handleSave = () => {
        if (testResult) {
            updateOneRepMax(exerciseId, testResult, 'tested');
            onClose();
        }
    };

    if (testResult) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title={t('orm_wizard_result_title')}>
                <div className="text-center space-y-6 py-6">
                    <Icon name="trophy" className="w-20 h-20 text-yellow-400 mx-auto animate-bounce" />
                    <div>
                        <p className="text-text-secondary mb-2">{t('orm_wizard_result_desc')}</p>
                        <p className="text-4xl font-bold text-primary">{displayWeight(testResult)} {t(('workout_' + weightUnit) as TranslationKey)}</p>
                    </div>
                    <button onClick={handleSave} className="w-full bg-success text-white font-bold py-3 rounded-lg shadow-lg">
                        {t('orm_wizard_save')}
                    </button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('orm_wizard_title')}>
             {restTimer !== null ? (
                 <div className="text-center space-y-6 py-6">
                     <h3 className="text-2xl font-bold text-text-primary">{t('orm_prof_rest')}</h3>
                     <div className="text-6xl font-mono font-bold text-primary">{formatSecondsToMMSS(restTimer)}</div>
                     <button onClick={handleRestComplete} className="bg-secondary hover:bg-slate-600 text-white font-bold py-2 px-6 rounded-lg">
                         {t('orm_prof_skip_rest')}
                     </button>
                 </div>
             ) : (
                <div className="space-y-6">
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-primary h-full transition-all duration-500" style={{ width: `${((currentStepIndex + 1) / protocol.length) * 100}%` }}></div>
                    </div>
                    
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-indigo-300 mb-1">{t(currentStep.labelKey as TranslationKey)}</h3>
                        <p className="text-sm text-text-secondary mb-6">{t(currentStep.instructionKey as TranslationKey)}</p>
                        
                        <div className="bg-black/30 rounded-2xl p-6 border border-white/10 mb-6">
                            <div className="text-5xl font-bold text-white mb-2">
                                {displayWeight(currentWeight)} <span className="text-2xl text-text-secondary">{t(('workout_' + weightUnit) as TranslationKey)}</span>
                            </div>
                            <div className="text-xl font-bold text-text-secondary">
                                x {currentStep.reps} Reps
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <button onClick={handleFail} className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-4 rounded-xl border border-red-500/30 transition-colors">
                                {t('orm_wizard_fail')}
                            </button>
                            <button onClick={handleSuccess} className="flex-[2] bg-green-500 hover:bg-green-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-500/20 transition-colors">
                                {t('orm_wizard_success')}
                            </button>
                        </div>

                        {isLastStep && (
                             <div className="mt-4 flex justify-center items-center gap-2">
                                <span className="text-sm text-text-secondary">{t('orm_weight_label')}:</span>
                                <input 
                                    type="number" 
                                    value={displayWeight(attemptWeight)} 
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val) && val > 0) {
                                            setAttemptWeight(getStoredWeight(val));
                                        }
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    className="bg-transparent text-xl font-bold text-white text-center w-24 outline-none border-b border-white/20 focus:border-primary"
                                />
                             </div>
                        )}
                    </div>
                </div>
             )}
        </Modal>
    );
};

export default OneRepMaxWizardModal;
