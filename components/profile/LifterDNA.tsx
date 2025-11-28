
import React, { useMemo } from 'react';
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

    return (
        <div className="bg-surface border border-white/10 rounded-2xl p-5 shadow-lg mb-6">
            <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                <StatBar label={t('dna_stats_consistency')} value={stats.consistencyScore} colorClass="bg-green-500" />
                <StatBar label={t('dna_stats_volume')} value={stats.volumeScore} colorClass="bg-blue-500" />
                <StatBar label={t('dna_stats_intensity')} value={stats.intensityScore} colorClass="bg-red-500" />
                
                <div className="flex justify-between items-center py-2 border-t border-white/5 mt-2 sm:col-span-2">
                    <span className="text-xs font-bold text-text-secondary uppercase">{t('dna_stats_favorite_muscle')}</span>
                    <span className="text-sm font-mono text-primary font-bold">{getLocalizedMuscleName(stats.favMuscle)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-white/5 sm:col-span-2">
                     <span className="text-xs font-bold text-text-secondary uppercase">{t('dna_stats_lifetime_workouts')}</span>
                     <span className="text-sm font-mono text-white font-bold">{stats.experienceLevel}</span>
                </div>
            </div>
        </div>
    );
};

export default LifterDNA;
