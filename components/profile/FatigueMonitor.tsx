
import React, { useMemo, useState } from 'react';
import { WorkoutSession, Exercise } from '../../types';
import { calculateBurnoutAnalysis } from '../../utils/fatigueUtils';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';
import Modal from '../common/Modal';

interface FatigueMonitorProps {
    history: WorkoutSession[];
    exercises: Exercise[];
}

const FatigueMonitor: React.FC<FatigueMonitorProps> = ({ history, exercises }) => {
    const { t } = useI18n();
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    
    const analysis = useMemo(() => {
        return calculateBurnoutAnalysis(history, exercises);
    }, [history, exercises]);

    const { currentLoad, maxLoad, trend, daysToBurnout } = analysis;
    
    const percentage = Math.min(100, (currentLoad / maxLoad) * 100);
    
    // Determine colors and state text based on percentage
    let colorClass = 'bg-green-500';
    let glowClass = 'shadow-green-500/20';
    let statusKey = 'fatigue_level_optimal';
    
    if (percentage > 80) {
        colorClass = 'bg-red-500';
        glowClass = 'shadow-red-500/20';
        statusKey = 'fatigue_level_warning';
    } else if (percentage > 40) {
        colorClass = 'bg-yellow-500';
        glowClass = 'shadow-yellow-500/20';
        statusKey = 'fatigue_level_overreaching';
    }

    // Determine projection text
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
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-md bg-white/5 ${percentage > 80 ? 'text-red-400' : percentage > 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {t(statusKey as any)}
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                     <div 
                        className={`h-full transition-all duration-1000 ease-out ${colorClass} shadow-[0_0_10px_rgba(0,0,0,0.5)] ${glowClass}`}
                        style={{ width: `${percentage}%` }}
                     ></div>
                     
                     {/* Tick Marks for zones */}
                     <div className="absolute top-0 bottom-0 left-[40%] w-0.5 bg-black/20"></div>
                     <div className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-black/20"></div>
                </div>
                
                <div className="flex justify-between mt-1 text-[10px] text-text-secondary/50 uppercase font-bold tracking-wider">
                    <span>0%</span>
                    <span>100%</span>
                </div>

                <div className="mt-4 flex items-start gap-3 bg-white/5 p-3 rounded-xl">
                    <div className={`p-1.5 rounded-full mt-0.5 ${percentage > 80 ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
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
                <p className="text-text-secondary whitespace-pre-wrap">
                    {t('fatigue_info_content')}
                </p>
            </Modal>
        </>
    );
};

export default FatigueMonitor;
