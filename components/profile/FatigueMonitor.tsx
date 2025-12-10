import React, { useMemo, useState } from 'react';
import { WorkoutSession, Exercise } from '../../types';
import { calculateBurnoutAnalysis } from '../../utils/fatigueUtils';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';
import Modal from '../common/Modal';
import { TranslationKey } from '../../contexts/I18nContext';

interface FatigueMonitorProps {
    history: WorkoutSession[];
    exercises: Exercise[];
    muscleFreshness: Record<string, number>;
}

const FatigueMonitor: React.FC<FatigueMonitorProps> = ({ history, exercises, muscleFreshness }) => {
    const { t } = useI18n();
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    
    const analysis = useMemo(() => {
        return calculateBurnoutAnalysis(history, exercises);
    }, [history, exercises]);

    const { currentLoad, maxLoad, trend, daysToBurnout } = analysis;
    
    // CNS Score (0-100 where 100 is max load)
    const cnsPercentage = Math.min(100, (currentLoad / maxLoad) * 100);

    // Muscle Freshness Score (Lowest score of major muscle groups)
    // We filter for major movers to prevent small muscles (calves/forearms) from blocking a workout
    const majorMuscles = ['Quads', 'Hamstrings', 'Glutes', 'Chest', 'Back', 'Lats', 'Shoulders'];
    const lowestMuscleScore = Object.entries(muscleFreshness)
        .filter(([muscle]) => majorMuscles.some(m => muscle.includes(m)))
        .reduce((min, [, score]) => Math.min(min, score as number), 100);
    
    // --- Unified Readiness Logic (The Weakest Link) ---
    let statusKey = 'fatigue_level_optimal';
    let statusColor = 'text-green-400';
    let barColorClass = 'bg-green-500';
    let barGlowClass = 'shadow-green-500/20';
    let limitingFactor: 'cns' | 'muscles' | null = null;
    
    if (cnsPercentage > 85) {
        // CNS is Fried
        statusKey = 'fatigue_level_warning';
        statusColor = 'text-red-400';
        barColorClass = 'bg-red-500';
        barGlowClass = 'shadow-red-500/20';
        limitingFactor = 'cns';
    } else if (lowestMuscleScore < 40) {
        // Muscles are trashed
        statusKey = 'fatigue_level_muscle_limit';
        statusColor = 'text-red-400';
        barColorClass = 'bg-red-500'; // Visual bar reflects the LIMITING factor (so red if muscles are red)
        barGlowClass = 'shadow-red-500/20';
        limitingFactor = 'muscles';
    } else if (cnsPercentage > 50 || lowestMuscleScore < 65) {
        // Caution Zone
        statusKey = 'fatigue_level_overreaching';
        statusColor = 'text-yellow-400';
        barColorClass = 'bg-yellow-500';
        barGlowClass = 'shadow-yellow-500/20';
        limitingFactor = cnsPercentage > 50 ? 'cns' : 'muscles';
    }

    // Visual Bar: Represents the "Stress" level.
    // If CNS is 20% but Muscles are 0% fresh (100% fatigued), the bar should show 100% stress.
    // Inverse freshness: 100 - freshness = fatigue
    const muscleFatigue = 100 - lowestMuscleScore;
    const unifiedStressPercentage = Math.max(cnsPercentage, muscleFatigue);

    // Determine projection text based on CNS Trend (since Muscle Trend is immediate)
    let predictionText = t('fatigue_prediction_stable');
    if (trend === 'accumulating') {
        if (daysToBurnout) {
             predictionText = t('fatigue_prediction_burnout', { days: daysToBurnout });
        } else {
             predictionText = t('fatigue_prediction_rising');
        }
    } else if (trend === 'recovering') {
        predictionText = t('fatigue_prediction_recovering');
    }

    return (
        <>
            <div className="bg-surface border border-white/10 rounded-2xl p-5 shadow-lg mb-6">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Icon name="activity" className="w-5 h-5 text-text-secondary" />
                        <h3 className="font-bold text-white">{t('fatigue_title')}</h3>
                        <button 
                            onClick={() => setIsInfoOpen(true)}
                            className="text-text-secondary/50 hover:text-primary transition-colors p-1"
                        >
                            <Icon name="question-mark-circle" className="w-4 h-4" />
                        </button>
                    </div>
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-md bg-white/5 ${statusColor}`}>
                        {t(statusKey as TranslationKey)}
                    </span>
                </div>

                {/* Unified Progress Bar */}
                <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                     <div 
                        className={`h-full transition-all duration-1000 ease-out ${barColorClass} shadow-[0_0_10px_rgba(0,0,0,0.5)] ${barGlowClass}`}
                        style={{ width: `${unifiedStressPercentage}%` }}
                     ></div>
                     
                     {/* Tick Marks for zones */}
                     <div className="absolute top-0 bottom-0 left-[50%] w-0.5 bg-black/20"></div>
                     <div className="absolute top-0 bottom-0 left-[85%] w-0.5 bg-black/20"></div>
                </div>
                
                <div className="flex justify-between mt-1 text-[10px] text-text-secondary/50 uppercase font-bold tracking-wider">
                    <span>{t('heatmap_fresh')}</span>
                    <span>{t('heatmap_fatigued')}</span>
                </div>
                
                {limitingFactor && (
                     <div className="mt-2 text-right">
                         <span className="text-xs text-text-secondary">
                             {t('fatigue_limit_factor', { factor: t(`fatigue_factor_${limitingFactor}` as TranslationKey) })}
                         </span>
                     </div>
                )}

                <div className="mt-4 flex items-start gap-3 bg-white/5 p-3 rounded-xl">
                    <div className={`p-1.5 rounded-full mt-0.5 ${unifiedStressPercentage > 80 ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                        <Icon name={trend === 'accumulating' ? 'arrow-up' : 'chart-line'} className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-sm text-text-primary leading-tight mb-1">
                            {predictionText}
                        </p>
                        <p className="text-xs text-text-secondary">
                            {t('fatigue_desc')}
                        </p>
                    </div>
                </div>
            </div>

            <Modal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} title={t('fatigue_info_title')}>
                <p className="text-text-secondary whitespace-pre-wrap leading-relaxed">
                    {t('fatigue_info_content')}
                </p>
            </Modal>
        </>
    );
};

export default FatigueMonitor;