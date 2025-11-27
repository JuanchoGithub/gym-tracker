
import React from 'react';
import { Icon } from '../common/Icon';
import { useI18n } from '../../hooks/useI18n';
import { Recommendation } from '../../utils/recommendationUtils';
import { TranslationKey } from '../../contexts/I18nContext';

interface SmartRecommendationCardProps {
  recommendation: Recommendation;
  onFilter: () => void;
  onDismiss: () => void;
  isFiltered: boolean;
}

const SmartRecommendationCard: React.FC<SmartRecommendationCardProps> = ({ recommendation, onFilter, onDismiss, isFiltered }) => {
  const { t } = useI18n();

  const gradientClass = recommendation.type === 'rest' 
    ? 'from-emerald-600/90 to-teal-700/90 border-emerald-500/30'
    : 'from-violet-600/90 to-indigo-700/90 border-indigo-500/30';

  const iconName = recommendation.type === 'rest' ? 'sparkles' : 'dumbbell'; // Or a brain/chart icon if available

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 shadow-lg border bg-gradient-to-br ${gradientClass} mb-6 animate-fadeIn transition-all`}>
      {/* Decorative background element */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-white/20 p-1.5 rounded-lg">
               <Icon name={iconName} className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-white/80">Smart Coach</span>
          </div>
          
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">
            {t(recommendation.titleKey as TranslationKey, recommendation.titleParams)}
          </h3>
          
          <p className="text-indigo-100 text-sm leading-relaxed max-w-lg">
            {t(recommendation.reasonKey as TranslationKey, recommendation.reasonParams)}
          </p>
        </div>

        <div className="flex items-center gap-3 mt-2 sm:mt-0">
            <button 
                onClick={onFilter}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2
                    ${isFiltered 
                        ? 'bg-white text-indigo-600 shadow-white/10' 
                        : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-md border border-white/10'
                    }`}
            >
                {isFiltered ? (
                    <>
                         <Icon name="x" className="w-4 h-4" />
                         <span>{t('rec_clear_filter')}</span>
                    </>
                ) : (
                    <>
                         <Icon name="filter" className="w-4 h-4" />
                         <span>{t('rec_action_filter', { focus: recommendation.titleParams?.focus || 'Workouts' })}</span>
                    </>
                )}
            </button>
            
            {!isFiltered && (
                <button 
                    onClick={onDismiss}
                    className="p-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label={t('rec_action_dismiss')}
                >
                    <Icon name="x" className="w-5 h-5" />
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default SmartRecommendationCard;
