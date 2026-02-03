
import React from 'react';
import { WeightSuggestion } from '../../services/analyticsService';
import { useI18n } from '../../hooks/useI18n';
import { useMeasureUnit } from '../../hooks/useWeight';
import { Icon } from '../common/Icon';
import { TranslationKey } from '../../contexts/I18nContext';

interface InsightBannerProps {
    suggestion: WeightSuggestion;
    onApply: () => void;
    onDismiss: () => void;
    isApplied?: boolean;
    onUndo?: () => void;
}

const InsightBanner: React.FC<InsightBannerProps> = ({ suggestion, onApply, onDismiss, isApplied, onUndo }) => {
    const { t } = useI18n();
    const { displayWeight, weightUnit } = useMeasureUnit();

    let bgClass = 'bg-blue-500/10 border-blue-500/20';
    let textClass = 'text-blue-200';
    let iconName = 'chart-line';
    let iconClass = 'text-blue-400';

    if (isApplied) {
        bgClass = 'bg-emerald-500/10 border-emerald-500/20';
        textClass = 'text-emerald-200';
        iconName = 'check';
        iconClass = 'text-emerald-400';
    } else if (suggestion.trend === 'increase') {
        bgClass = 'bg-green-500/10 border-green-500/20';
        textClass = 'text-green-200';
        iconName = 'arrow-up';
        iconClass = 'text-green-400';
    } else if (suggestion.trend === 'decrease') {
        bgClass = 'bg-yellow-500/10 border-yellow-500/20';
        textClass = 'text-yellow-200';
        iconName = 'arrow-down';
        iconClass = 'text-yellow-400';
    }

    return (
        <div className={`mx-0 sm:mx-2 mt-1 rounded-none sm:rounded-lg border-y sm:border p-3 ${bgClass} animate-fadeIn`}>
            <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-full bg-black/20 ${iconClass} flex-shrink-0 mt-0.5`}>
                    <Icon name={iconName as any} className="w-4 h-4" />
                </div>

                <div className="flex-grow min-w-0 flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                        <div className={`text-xs font-medium leading-relaxed ${textClass}`}>
                            {isApplied ? t('insight_applied_title' as TranslationKey) : t(suggestion.reason as TranslationKey, suggestion.params)}
                        </div>
                        {!isApplied && (
                            <button onClick={onDismiss} className="-mr-1 -mt-1 p-1.5 text-white/40 hover:text-white transition-colors">
                                <Icon name="x" className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {!isApplied && (
                        <div className="flex items-center gap-2">
                            {suggestion.weight > 0 && (
                                <div className="text-sm font-bold text-white">
                                    {displayWeight(suggestion.weight)} {t(('workout_' + weightUnit) as TranslationKey)}
                                </div>
                            )}
                            {suggestion.reps && (
                                <div className="text-sm font-bold text-white">
                                    {suggestion.reps} reps
                                </div>
                            )}
                            {suggestion.sets && (
                                <div className="text-sm font-bold text-white">
                                    {suggestion.sets} sets
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pt-1">
                        {isApplied ? (
                            <button
                                onClick={onUndo}
                                className="w-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors border border-white/5 flex items-center justify-center gap-2"
                            >
                                <Icon name="repeat" className="w-3 h-3" />
                                {t('common_undo' as TranslationKey)}
                            </button>
                        ) : (
                            (suggestion.weight > 0 || suggestion.reps || suggestion.sets || suggestion.actionKey) && (
                                <button
                                    onClick={onApply}
                                    className="w-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors border border-white/5 flex items-center justify-center gap-2"
                                >
                                    {suggestion.actionKey ? t(suggestion.actionKey as TranslationKey, suggestion.params) : t('insight_apply')}
                                    <Icon name="arrow-right" className="w-3 h-3 opacity-60" />
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InsightBanner;
