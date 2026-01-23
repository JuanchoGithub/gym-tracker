
import React, { useMemo, useState, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { LifterStats, LifterArchetype } from '../../services/analyticsService';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';
import { TranslationKey } from '../../contexts/I18nContext';
import { getBodyPartTKey } from '../../utils/i18nUtils';

interface LifterDNAProps {
    stats: LifterStats;
}

const LifterDNA: React.FC<LifterDNAProps> = ({ stats }) => {
    const { t } = useI18n();
    const { measureUnit } = useContext(AppContext);
    const [isExpanded, setIsExpanded] = useState(false);

    const unitLabel = measureUnit === 'metric' ? 'kg' : 'lbs';

    const archetypeInfo: Record<LifterArchetype, { labelKey: TranslationKey, descKey: TranslationKey, color: string, icon: string }> = {
        powerbuilder: {
            labelKey: 'dna_archetype_powerbuilder_label',
            descKey: 'dna_archetype_powerbuilder_desc',
            color: 'text-red-400',
            icon: 'weight'
        },
        bodybuilder: {
            labelKey: 'dna_archetype_bodybuilder_label',
            descKey: 'dna_archetype_bodybuilder_desc',
            color: 'text-blue-400',
            icon: 'dumbbell'
        },
        endurance: {
            labelKey: 'dna_archetype_endurance_label',
            descKey: 'dna_archetype_endurance_desc',
            color: 'text-green-400',
            icon: 'stopwatch'
        },
        hybrid: {
            labelKey: 'dna_archetype_hybrid_label',
            descKey: 'dna_archetype_hybrid_desc',
            color: 'text-purple-400',
            icon: 'chart-line'
        },
        beginner: {
            labelKey: 'dna_archetype_beginner_label',
            descKey: 'dna_archetype_beginner_desc',
            color: 'text-slate-400',
            icon: 'sparkles'
        }
    };

    const info = archetypeInfo[stats.archetype];

    const StatBar = ({ label, value, colorClass }: { label: string, value: number, colorClass: string }) => (
        <div className="mb-3">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-1">
                <span className="text-text-secondary">{label}</span>
                <span className="text-white">{value}/100</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`}
                    style={{ width: `${value}%` }}
                ></div>
            </div>
        </div>
    );

    // Helper to localize favorite muscle
    const getLocalizedMuscleName = (muscleName: string) => {
        if (muscleName === 'Full Body' || muscleName === 'N/A') return t('body_part_full_body');
        return t(getBodyPartTKey(muscleName));
    };

    const DetailItem = ({ icon, label, value, description }: { icon: string, label: string, value: string, description: string }) => (
        <div className="bg-white/5 rounded-xl px-2.5 py-3 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon name={icon as any} className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-white">{label}</span>
                </div>
                <span className="text-sm font-mono font-bold text-primary">{value}</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
                {description}
            </p>
        </div>
    );

    return (
        <div
            className={`bg-surface border border-white/10 rounded-2xl px-3 py-4 shadow-lg transition-all duration-300 ${isExpanded ? 'ring-2 ring-primary/20' : ''}`}
        >
            <div
                className="flex items-center justify-between mb-6 border-b border-white/5 pb-4 cursor-pointer group"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full bg-white/5 border border-white/10 ${info.color}`}>
                        <Icon name={info.icon as any} className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className={`text-xl font-black uppercase tracking-tight ${info.color}`}>
                            {t(info.labelKey)}
                        </h3>
                        <p className="text-sm text-text-secondary/80 leading-tight">
                            {t(info.descKey)}
                        </p>
                    </div>
                </div>
                <Icon name="expand" className={`w-4 h-4 text-text-secondary/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 cursor-pointer`} onClick={() => setIsExpanded(!isExpanded)}>
                <StatBar label={t('dna_stats_consistency')} value={stats.consistencyScore} colorClass="bg-green-500" />
                <StatBar label={t('dna_stats_volume')} value={stats.volumeScore} colorClass="bg-blue-500" />
                <StatBar label={t('dna_stats_intensity')} value={stats.intensityScore} colorClass="bg-red-500" />

                <div className="flex justify-between items-center py-2 border-t border-white/5 mt-2 sm:col-span-2">
                    <span className="text-xs font-bold text-text-secondary uppercase">{t('dna_stats_favorite_muscle')}</span>
                    <span className="text-sm font-mono text-primary font-bold">{getLocalizedMuscleName(stats.favMuscle)}</span>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-8 space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-black uppercase tracking-widest text-text-secondary/50">
                            {t('dna_details_title')}
                        </h4>
                    </div>

                    <DetailItem
                        icon="repeat"
                        label={t('dna_stats_consistency')}
                        value={t('dna_consistency_workouts', { count: stats.rawConsistency })}
                        description={t('dna_stats_consistency_desc')}
                    />

                    <DetailItem
                        icon="weight"
                        label={t('dna_stats_volume')}
                        value={t('dna_volume_tonnage', { count: stats.rawVolume, unit: unitLabel })}
                        description={t('dna_stats_volume_desc')}
                    />

                    <DetailItem
                        icon="activity"
                        label={t('dna_stats_intensity')}
                        value={t('dna_intensity_reps', { count: stats.rawIntensity })}
                        description={t('dna_stats_intensity_desc')}
                    />

                    <div className="bg-primary/5 rounded-xl px-2.5 py-3 border border-primary/10 mt-4">
                        <h4 className="text-xs font-bold text-primary flex items-center gap-2 mb-1">
                            <Icon name="sparkles" className="w-3.5 h-3.5" />
                            {t('dna_stats_lifetime_workouts')}
                        </h4>
                        <p className="text-xl font-black text-white font-mono">
                            {stats.experienceLevel}
                        </p>
                    </div>
                </div>
            )}

            {!isExpanded && (
                <div className="mt-4 text-center">
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

export default LifterDNA;
