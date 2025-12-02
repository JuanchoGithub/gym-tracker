
import React, { useContext, useState, useMemo } from 'react';
import { Exercise } from '../../types';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import { useMeasureUnit } from '../../hooks/useWeight';
import { Icon } from '../common/Icon';
import { TranslationKey } from '../../contexts/I18nContext';
import OneRepMaxTestRunner from './OneRepMaxTestRunner';
import { calculate1RM } from '../../utils/workoutUtils';
import CascadeUpdateModal from './CascadeUpdateModal';
import { calculateSyntheticAnchors, getInferredMax } from '../../services/analyticsService';
import { useExerciseName } from '../../hooks/useExerciseName';

interface OneRepMaxDetailViewProps {
    exercise: Exercise;
    onBack: () => void;
}

const OneRepMaxDetailView: React.FC<OneRepMaxDetailViewProps> = ({ exercise, onBack }) => {
    const { t } = useI18n();
    const { profile, allTimeBestSets, updateOneRepMax, history, exercises } = useContext(AppContext);
    const { displayWeight, weightUnit, getStoredWeight } = useMeasureUnit();
    const getExerciseName = useExerciseName();

    const [isTestRunnerOpen, setIsTestRunnerOpen] = useState(false);
    const [isCascadeOpen, setIsCascadeOpen] = useState(false);
    const [newlyUpdatedMax, setNewlyUpdatedMax] = useState(0);
    const [manualInput, setManualInput] = useState('');

    const storedEntry = profile.oneRepMaxes?.[exercise.id];
    const storedMax = storedEntry?.weight || 0;
    
    // Get e1RM from history
    const bestSet = allTimeBestSets[exercise.id];
    const calculatedMax = bestSet ? calculate1RM(bestSet.weight, bestSet.reps) : 0;

    // Calculate Inferred Max from Parent/Anchor
    const syntheticAnchors = useMemo(() => calculateSyntheticAnchors(history, exercises, profile), [history, exercises, profile]);
    const inferredData = useMemo(() => getInferredMax(exercise, syntheticAnchors, exercises), [exercise, syntheticAnchors, exercises]);
    const inferredMax = inferredData ? inferredData.value : 0;
    
    // Rookie state: No history, no stored max, no inferred max
    const isRookie = !storedMax && !calculatedMax && !inferredMax;
    
    // Estimated state: We have history, maybe stored max is outdated or missing
    const isEstimated = calculatedMax > storedMax;

    // Inferred state: No direct history/stored, but parent data exists
    const isInferredOnly = !storedMax && !calculatedMax && inferredMax > 0;

    const handleUpdateFromEstimate = () => {
        updateOneRepMax(exercise.id, calculatedMax, 'calculated');
        setNewlyUpdatedMax(calculatedMax);
        setIsCascadeOpen(true);
    };
    
    const handleUpdateFromInference = () => {
        if (inferredMax > 0) {
            updateOneRepMax(exercise.id, inferredMax, 'calculated');
            // No cascade from an inferred update typically, as it's already downstream
        }
    };

    const handleTestComplete = (newMax: number) => {
        updateOneRepMax(exercise.id, newMax, 'tested');
        setIsTestRunnerOpen(false);
        setNewlyUpdatedMax(newMax);
        setIsCascadeOpen(true);
    };

    const handleManualUpdate = () => {
        const val = parseFloat(manualInput);
        if (!isNaN(val) && val > 0) {
            const weight = getStoredWeight(val);
            updateOneRepMax(exercise.id, weight, 'tested'); // Treat manual as tested/hard override
            setNewlyUpdatedMax(weight);
            setIsCascadeOpen(true);
            setManualInput('');
        }
    };

    return (
        <div className="animate-fadeIn">
            <button onClick={onBack} className="flex items-center text-text-secondary hover:text-white mb-6">
                <Icon name="arrow-down" className="rotate-90 w-5 h-5 mr-1" />
                {t('common_back')}
            </button>

            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">{getExerciseName(exercise)}</h2>
                <div className="inline-flex items-center gap-2 bg-surface px-3 py-1 rounded-full border border-white/10">
                    <span className={`w-2 h-2 rounded-full ${storedEntry?.method === 'tested' ? 'bg-green-500' : (storedMax > 0 ? 'bg-yellow-500' : 'bg-white/20')}`}></span>
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                        {storedEntry ? t(storedEntry.method === 'tested' ? 'orm_tested_badge' : 'orm_estimated_badge') : t('orm_needs_calibration')}
                    </span>
                </div>
            </div>

            {isRookie ? (
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 shadow-xl border border-white/10 text-center">
                    <div className="bg-white/20 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Icon name="sparkles" className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{t('orm_detail_rookie_title')}</h3>
                    <p className="text-indigo-100 text-sm mb-6 leading-relaxed">{t('orm_detail_rookie_desc')}</p>
                    
                    <div className="bg-black/20 p-4 rounded-xl mb-6 text-left flex gap-3">
                        <Icon name="warning" className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-indigo-100/90">{t('orm_detail_rookie_warning')}</p>
                    </div>

                    <button onClick={() => setIsTestRunnerOpen(true)} className="w-full bg-white text-indigo-600 font-bold py-3 rounded-xl shadow-lg mb-3 hover:bg-indigo-50 transition-colors">
                        {t('orm_detail_rookie_action_test')}
                    </button>
                    
                    <div className="relative flex items-center gap-2 justify-center mt-4 opacity-80 hover:opacity-100 transition-opacity">
                         <input 
                            type="number" 
                            placeholder="0" 
                            className="bg-black/20 border border-white/30 rounded-lg px-3 py-1 w-20 text-center text-white outline-none focus:border-white"
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            onFocus={(e) => e.target.select()}
                        />
                        <button onClick={handleManualUpdate} className="text-sm underline font-medium">{t('orm_detail_rookie_action_manual')}</button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Main Status Card */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surface border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                            <p className="text-xs text-text-secondary uppercase font-bold mb-2">{t('orm_detail_current_profile')}</p>
                            <p className="text-3xl font-mono font-bold text-white">{displayWeight(storedMax)} <span className="text-lg text-text-secondary/50">{t(('workout_' + weightUnit) as TranslationKey)}</span></p>
                            <p className="text-[10px] text-text-secondary/50 mt-2">{storedEntry ? new Date(storedEntry.date).toLocaleDateString() : '-'}</p>
                        </div>
                        <div className={`border p-5 rounded-2xl flex flex-col items-center justify-center text-center ${isEstimated || isInferredOnly ? 'bg-green-500/10 border-green-500/30' : 'bg-surface border-white/10 opacity-50'}`}>
                            <p className="text-xs text-text-secondary uppercase font-bold mb-2">{t('orm_detail_calculated')}</p>
                            {isInferredOnly ? (
                                <>
                                    <p className="text-3xl font-mono font-bold text-green-400">{displayWeight(inferredMax)}</p>
                                    <p className="text-[10px] text-green-300/70 mt-1 truncate max-w-full px-1">via {inferredData?.source}</p>
                                    <button onClick={handleUpdateFromInference} className="mt-2 text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/30 hover:bg-green-500/30 transition-colors">
                                        Apply Estimate
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className={`text-3xl font-mono font-bold ${isEstimated ? 'text-green-400' : 'text-text-secondary'}`}>{displayWeight(calculatedMax)}</p>
                                    {isEstimated && (
                                        <button onClick={handleUpdateFromEstimate} className="mt-2 text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/30 hover:bg-green-500/30 transition-colors">
                                            {t('orm_detail_action_update')}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    
                    {/* Potential Banner */}
                    {isEstimated && bestSet && (
                         <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/30 p-4 rounded-xl flex gap-3 items-center">
                             <Icon name="chart-line" className="w-6 h-6 text-green-400 flex-shrink-0" />
                             <div>
                                 <h4 className="font-bold text-green-100 text-sm">{t('orm_detail_potential_title')}</h4>
                                 <p className="text-xs text-green-200/70 mt-1">
                                     {t('orm_detail_potential_desc', { 
                                         weight: displayWeight(bestSet.weight), 
                                         unit: t(('workout_' + weightUnit) as TranslationKey), 
                                         reps: bestSet.reps 
                                     })}
                                 </p>
                             </div>
                         </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <button onClick={() => setIsTestRunnerOpen(true)} className="w-full bg-primary hover:bg-primary-content text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-colors">
                            <Icon name="trophy" className="w-5 h-5" />
                            <span>{t('orm_detail_action_test')}</span>
                        </button>
                        
                         <div className="flex items-center gap-2 justify-center pt-4">
                             <span className="text-sm text-text-secondary">{t('orm_detail_rookie_action_manual')}:</span>
                             <div className="flex gap-2">
                                <input 
                                    type="number" 
                                    className="bg-surface border border-white/10 rounded-lg px-3 py-1.5 w-24 text-center text-white outline-none focus:border-primary"
                                    value={manualInput}
                                    onChange={(e) => setManualInput(e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    placeholder={displayWeight(storedMax)}
                                />
                                <button onClick={handleManualUpdate} className="bg-surface hover:bg-white/10 p-2 rounded-lg text-primary">
                                    <Icon name="check" className="w-5 h-5" />
                                </button>
                             </div>
                        </div>
                    </div>
                </div>
            )}

            <OneRepMaxTestRunner 
                isOpen={isTestRunnerOpen} 
                onClose={() => setIsTestRunnerOpen(false)} 
                exerciseId={exercise.id}
                targetMax={calculatedMax || storedMax || inferredMax || 20} 
                onComplete={handleTestComplete}
            />

            <CascadeUpdateModal 
                isOpen={isCascadeOpen}
                onClose={() => { setIsCascadeOpen(false); onBack(); }}
                parentExerciseId={exercise.id}
                newParentMax={newlyUpdatedMax}
            />
        </div>
    );
};

export default OneRepMaxDetailView;
