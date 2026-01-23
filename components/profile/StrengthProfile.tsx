
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import RadarChart from '../common/RadarChart';
import { calculateNormalizedStrengthScores, calculateMaxStrengthProfile, STRENGTH_SYMMETRY_RATIOS } from '../../services/analyticsService';
import { Icon } from '../common/Icon';

const StrengthProfile: React.FC = () => {
    const { history, fontSize, measureUnit, exercises } = useContext(AppContext);
    const { t } = useI18n();
    const [isExpanded, setIsExpanded] = useState(false);

    const unitLabel = measureUnit === 'metric' ? 'kg' : 'lbs';

    const fontMultiplier = useMemo(() => {
        if (fontSize === 'xl') return 1.3;
        if (fontSize === 'large') return 1.15;
        return 1.0;
    }, [fontSize]);

    const stats = useMemo(() => {
        const scores = calculateNormalizedStrengthScores(history, exercises);
        const hasData = Object.values(scores).some(val => val > 0);
        if (!hasData) return null;

        const rawMaxes = calculateMaxStrengthProfile(history, exercises);

        // Calculate base "Impact" (Highest normalized strength level)
        const impactResults = Object.entries(STRENGTH_SYMMETRY_RATIOS).map(([pattern, denom]) => {
            const patternData = rawMaxes[pattern];
            const weight = patternData?.weight || 0;
            return {
                key: pattern,
                weight,
                exerciseName: patternData?.exerciseName || '',
                impact: weight / denom,
                denom
            };
        });

        const leader = impactResults.reduce((best, curr) => curr.impact > best.impact ? curr : best, { key: '', weight: 0, exerciseName: '', impact: 0, denom: 1 });
        const maxImpact = leader.impact;

        const getPatternLabel = (key: string) => {
            switch (key) {
                case 'OHP': return t('body_part_shoulders');
                case 'BENCH': return t('body_part_chest');
                case 'ROW': return t('body_part_back');
                case 'VERTICAL_PULL': return t('symmetry_pattern_vertical');
                case 'SQUAT': return t('body_part_legs');
                case 'DEADLIFT': return t('symmetry_pattern_posterior');
                default: return key;
            }
        };

        const details = impactResults
            .filter(item => item.weight > 0 || item.key === leader.key)
            .map(item => ({
                key: item.key,
                label: getPatternLabel(item.key),
                value: scores[item.key] || 0,
                raw: Math.round(item.weight),
                exName: item.exerciseName,
                target: Math.round(item.denom * maxImpact),
                ratio: item.denom.toFixed(1)
            }));

        return {
            scores,
            details,
            driverLabel: getPatternLabel(leader.key),
            driverValue: Math.round(leader.weight),
            driverExName: leader.exerciseName
        };
    }, [history, exercises, t]);

    const chartData = useMemo(() => {
        if (!stats) return null;
        return stats.details.map(d => ({ label: d.label, value: d.value }));
    }, [stats]);

    if (!chartData || !stats) return null;

    return (
        <div
            className={`bg-surface border border-white/10 rounded-2xl p-4 shadow-lg transition-all duration-300 ${isExpanded ? 'ring-2 ring-primary/20' : ''}`}
        >
            <div
                className="flex items-center justify-between mb-4 border-b border-white/5 pb-4 cursor-pointer group"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10 border border-primary/20 text-primary">
                        <Icon name="scale" className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">{t('rec_type_imbalance')}</h3>
                        <p className="text-xs text-text-secondary">{t('strength_symmetry_subtext')}</p>
                    </div>
                </div>
                <Icon name="expand" className={`w-4 h-4 text-text-secondary/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>

            <div className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="aspect-square w-full max-w-[300px] mx-auto py-4">
                    <RadarChart
                        data={chartData}
                        labelFontSize={10 * fontMultiplier}
                    />
                </div>
            </div>

            {isExpanded && (
                <div className="mt-5 space-y-4 animate-fadeIn">
                    <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                        <h4 className="text-sm font-bold text-primary flex items-center gap-2 mb-2">
                            <Icon name="sparkles" className="w-4 h-4" />
                            {t('symmetry_details_title')}
                        </h4>
                        <p className="text-xs text-text-secondary leading-relaxed mb-4">
                            {t('symmetry_desc')}
                        </p>

                        <div className="bg-white/5 border border-white/5 rounded-lg p-2.5 mb-4 flex flex-col gap-1">
                            <div className="flex justify-between items-center w-full">
                                <span className="text-[10px] text-text-secondary uppercase font-bold">{t('symmetry_driver_lift')}</span>
                                <span className="text-[10px] text-primary font-mono font-bold">{stats.driverLabel}: {stats.driverValue} {unitLabel}</span>
                            </div>
                            <span className="text-[9px] text-text-secondary/60 italic text-right">{stats.driverExName}</span>
                        </div>

                        <div className="space-y-4">
                            {stats.details.map(item => (
                                <div key={item.key} className="bg-white/5 rounded-xl p-3 border border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-bold text-white">{item.label}</span>
                                        <span className="text-[10px] text-text-secondary font-mono tracking-tighter bg-white/5 px-1.5 py-0.5 rounded">
                                            {t('symmetry_ratio_label', { ratio: item.ratio })}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">{t('symmetry_current_max')}</p>
                                            <p className="text-sm font-mono font-black text-white">{item.raw} {unitLabel}</p>
                                            <p className="text-[8px] text-text-secondary/50 truncate max-w-[120px]">{item.exName}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">{t('symmetry_expected_max')}</p>
                                            <p className={`text-sm font-mono font-black ${item.raw >= item.target * 0.95 ? 'text-success' : 'text-primary'}`}>
                                                {item.target} {unitLabel}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Progress to target bar */}
                                    <div className="mt-3">
                                        <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 ${item.value > 90 ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.3)]' : item.value > 60 ? 'bg-primary' : 'bg-yellow-500'}`}
                                                style={{ width: `${item.value}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

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
    );
};

export default StrengthProfile;
