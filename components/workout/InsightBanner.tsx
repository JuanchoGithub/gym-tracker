
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
}

const InsightBanner: React.FC<InsightBannerProps> = ({ suggestion, onApply, onDismiss }) => {
    const { t } = useI18n();
    const { displayWeight, weightUnit } = useMeasureUnit();

    let bgClass = 'bg-blue-500/10 border-blue-500/20';
    let textClass = 'text-blue-200';
    let iconName = 'chart-line';
    let iconClass = 'text-blue-400';

    if (suggestion.trend === 'increase') {
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
        <div className={`mx-3 sm:mx-4 mt-3 rounded-lg border p-3 flex items-center justify-between ${bgClass} animate-fadeIn`}>
            <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-full bg-black/20 ${iconClass}`}>
                    <Icon name={iconName as any} className="w-4 h-4" />
                </div>
                <div>
                    <div className={`text-xs font-medium ${textClass}`}>
                        {t(suggestion.reason as TranslationKey, suggestion.params)}
                    </div>
                    {suggestion.weight > 0 && (
                        <div className="text-sm font-bold text-white mt-0.5">
                            {displayWeight(suggestion.weight)} {t(('workout_' + weightUnit) as TranslationKey)}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {suggestion.weight > 0 && (
                    <button
                        onClick={onApply}
                        className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors border border-white/5"
                    >
                        {t('insight_apply')}
                    </button>
                )}
                <button onClick={onDismiss} className="p-1.5 text-white/50 hover:text-white transition-colors">
                    <Icon name="x" className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default InsightBanner;
