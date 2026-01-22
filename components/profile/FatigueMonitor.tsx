import React, { useMemo, useState } from 'react';
import { WorkoutSession, Exercise } from '../../types';
import { calculateBurnoutAnalysis } from '../../utils/fatigueUtils';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';
import Modal from '../common/Modal';
import { TranslationKey } from '../../contexts/I18nContext';
import { PREDEFINED_EXERCISES } from '../../constants/exercises';

interface FatigueMonitorProps {
    history: WorkoutSession[];
    exercises: Exercise[];
    muscleFreshness: Record<string, number>;
}

const FatigueMonitor: React.FC<FatigueMonitorProps> = ({ history, exercises, muscleFreshness }) => {
    const { t } = useI18n();
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const analysis = useMemo(() => {
        return calculateBurnoutAnalysis(history, exercises);
    }, [history, exercises]);

    const { currentLoad, maxLoad, trend, daysToBurnout } = analysis;

    // Calculate daily points for the chart
    const dailyLoadPoints = useMemo(() => {
        const now = Date.now();
        const MS_PER_DAY = 24 * 3600 * 1000;

        return Array.from({ length: 14 }, (_, i) => {
            const windowEnd = now - (i * MS_PER_DAY);
            const windowStart = now - ((i + 1) * MS_PER_DAY);

            const daySessions = history.filter(s => {
                const start = Number(s.startTime);
                return start >= windowStart && start < windowEnd;
            });

            let totalDayPoints = 0;
            daySessions.forEach(s => {
                let sessionCost = 5;
                const completedSets = s.exercises?.reduce((acc, ex) => acc + (ex.sets?.filter(set => set.isComplete).length || 0), 0) || 0;

                let compoundFactor = 0;
                s.exercises?.forEach(ex => {
                    const def = exercises.find(e => e.id === ex.exerciseId) || PREDEFINED_EXERCISES.find(e => e.id === ex.exerciseId);
                    if (def && (def.category === 'Barbell' || def.category === 'Dumbbell') && ['Legs', 'Back', 'Chest'].includes(def.bodyPart)) {
                        compoundFactor += 1;
                    }
                });

                sessionCost += completedSets + (compoundFactor * 2);
                totalDayPoints += sessionCost;
            });
            return totalDayPoints;
        }).reverse();
    }, [history, exercises]);

    const maxDayScore = Math.max(20, ...dailyLoadPoints);
    const hasCnsData = dailyLoadPoints.some(p => p > 0);

    const getMuscleDisplayName = (muscle: string) => {
        const key = `muscle_${muscle.toLowerCase().replace(/ /g, '_')}` as TranslationKey;
        const translated = t(key);
        return translated !== key ? translated : muscle;
    };

    const topFatiguedMuscles = useMemo(() => {
        return Object.entries(muscleFreshness)
            .map(([muscle, score]) => ({ muscle, fatigue: 100 - (score as number) }))
            .sort((a, b) => b.fatigue - a.fatigue)
            .slice(0, 5);
    }, [muscleFreshness]);

    // CNS Score (0-100 where 100 is max load)
    const cnsPercentage = Math.min(100, (currentLoad / maxLoad) * 100);

    // Muscle Freshness Score (Lowest score of major muscle groups)
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
        statusKey = 'fatigue_level_warning';
        statusColor = 'text-red-400';
        barColorClass = 'bg-red-500';
        barGlowClass = 'shadow-red-500/20';
        limitingFactor = 'cns';
    } else if (lowestMuscleScore < 40) {
        statusKey = 'fatigue_level_muscle_limit';
        statusColor = 'text-red-400';
        barColorClass = 'bg-red-500';
        barGlowClass = 'shadow-red-500/20';
        limitingFactor = 'muscles';
    } else if (cnsPercentage > 50 || lowestMuscleScore < 65) {
        statusKey = 'fatigue_level_overreaching';
        statusColor = 'text-yellow-400';
        barColorClass = 'bg-yellow-500';
        barGlowClass = 'shadow-yellow-500/20';
        limitingFactor = cnsPercentage > 50 ? 'cns' : 'muscles';
    }

    const muscleFatigue = 100 - lowestMuscleScore;
    const unifiedStressPercentage = Math.max(cnsPercentage, muscleFatigue);

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
            <div
                className={`bg-surface border border-white/10 rounded-2xl p-5 shadow-lg mb-6 transition-all duration-300 ${isExpanded ? 'ring-2 ring-primary/20' : ''}`}
            >
                <div
                    className="flex items-center justify-between mb-3 cursor-pointer group"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-2">
                        <Icon name="activity" className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors" />
                        <h3 className="font-bold text-white group-hover:text-primary transition-colors">{t('fatigue_title')}</h3>
                        <Icon name="expand" className={`w-3 h-3 text-text-secondary/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-md bg-white/5 ${statusColor}`}>
                        {t(statusKey as TranslationKey)} {isExpanded ? '' : `${100 - Math.round(unifiedStressPercentage)}%`}
                    </span>
                </div>

                <div
                    className="cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
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
                </div>

                {limitingFactor && (
                    <div className="mt-2 text-right">
                        <span className="text-xs text-text-secondary">
                            {t('fatigue_limit_factor', { factor: t(`fatigue_factor_${limitingFactor}` as TranslationKey) })}
                        </span>
                    </div>
                )}

                {isExpanded && (
                    <div className="mt-6 space-y-6 animate-fadeIn">
                        {/* CNS Breakdown */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Icon name="activity" className="w-4 h-4 text-primary" />
                                    {t('fatigue_cns_points', { points: Math.round(currentLoad * 1.5) })}
                                </h4>
                                <span className="text-[10px] text-text-secondary/60 font-mono">{t('fatigue_cns_equation')}</span>
                            </div>

                            {/* Daily Bar Chart */}
                            <div className="flex items-end justify-between h-20 gap-1 mb-2 px-1 relative">
                                {!hasCnsData && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <p className="text-[10px] text-text-secondary/30 uppercase tracking-widest">{t('fatigue_no_recent_activity')}</p>
                                    </div>
                                )}
                                {dailyLoadPoints.map((pts, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                        <div
                                            className={`w-full rounded-t-sm transition-all duration-500 ${pts > 30 ? 'bg-red-500/60' : pts > 15 ? 'bg-yellow-500/60' : 'bg-primary/40'} ${pts === 0 ? 'opacity-10' : 'opacity-100'}`}
                                            style={{ height: pts > 0 ? `${(pts / maxDayScore) * 100}%` : '2px' }}
                                        ></div>
                                        {pts > 0 && (
                                            <div className="absolute -top-6 bg-surface border border-white/10 px-1.5 py-0.5 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-xl">
                                                {t('common_points', { points: pts })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between text-[8px] text-text-secondary/40 uppercase font-bold tracking-tighter">
                                <span>14d ago</span>
                                <span>{t('fatigue_last_14_days')}</span>
                                <span>Today</span>
                            </div>
                        </div>

                        {/* Muscle Breakdown */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Icon name="dumbbell" className="w-4 h-4 text-success" />
                                    {t('fatigue_top_fatigued_muscles')}
                                </h4>
                                <span className="text-[10px] text-text-secondary/60 font-mono">{t('fatigue_muscle_equation')}</span>
                            </div>
                            <div className="space-y-3 relative min-h-[60px]">
                                {topFatiguedMuscles.length === 0 && (
                                    <div className="flex flex-col items-center justify-center pt-2">
                                        <p className="text-[10px] text-text-secondary/30 uppercase tracking-widest">{t('fatigue_fully_recovered')}</p>
                                        <Icon name="check" className="w-4 h-4 text-success/20 mt-1" />
                                    </div>
                                )}
                                {topFatiguedMuscles.map(({ muscle, fatigue }) => (
                                    <div key={muscle} className="space-y-1">
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-text-secondary">{getMuscleDisplayName(muscle)}</span>
                                            <span className={`font-mono font-bold ${fatigue > 60 ? 'text-red-400' : 'text-text-primary'}`}>{Math.round(fatigue)}%</span>
                                        </div>
                                        <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 ${fatigue > 60 ? 'bg-red-500' : fatigue > 30 ? 'bg-yellow-500' : 'bg-success'}`}
                                                style={{ width: `${fatigue}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Interaction Explanation */}
                        <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                            <h4 className="text-sm font-bold text-primary flex items-center gap-2 mb-2">
                                <Icon name="sparkles" className="w-4 h-4" />
                                {t('fatigue_algorithm_interaction')}
                            </h4>
                            <p className="text-xs text-text-secondary leading-relaxed">
                                {t('fatigue_algorithm_interaction_desc')}
                            </p>
                        </div>
                    </div>
                )}

                <div
                    className={`mt-4 flex items-start gap-3 bg-white/5 p-3 rounded-xl cursor-pointer hover:bg-white/10 transition-colors ${isExpanded ? 'border border-white/5' : ''}`}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
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

                {!isExpanded && (
                    <div className="mt-3 text-center">
                        <button
                            onClick={() => setIsExpanded(true)}
                            className="text-[10px] text-primary/60 hover:text-primary uppercase font-bold tracking-widest flex items-center justify-center gap-1 mx-auto"
                        >
                            <span>{t('common_see_more')}</span>
                            <Icon name="expand" className="w-2.5 h-2.5" />
                        </button>
                    </div>
                )}
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