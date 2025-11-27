
import React, { useMemo } from 'react';
import { Icon } from '../common/Icon';
import { useI18n } from '../../hooks/useI18n';
import { Recommendation } from '../../utils/recommendationUtils';
import { TranslationKey } from '../../contexts/I18nContext';
import { Routine } from '../../types';
import { useMeasureUnit } from '../../hooks/useWeight';

interface SmartRecommendationCardProps {
  recommendation: Recommendation;
  recommendedRoutines: Routine[];
  onDismiss: () => void;
  onRoutineSelect: (routine: Routine) => void;
  onViewSmartRoutine?: () => void;
  onUpgrade?: () => void;
}

const SmartRecommendationCard: React.FC<SmartRecommendationCardProps> = ({ 
  recommendation, 
  recommendedRoutines,
  onDismiss, 
  onRoutineSelect,
  onViewSmartRoutine, 
  onUpgrade 
}) => {
  const { t } = useI18n();
  const { displayWeight, weightUnit } = useMeasureUnit();

  let gradientClass = 'from-violet-600/90 to-indigo-700/90 border-indigo-500/30';
  let iconName = 'dumbbell';
  let cardTitle = 'Smart Coach';
  
  if (recommendation.type === 'rest' || recommendation.type === 'active_recovery') {
      gradientClass = 'from-emerald-600/90 to-teal-700/90 border-emerald-500/30';
      iconName = 'sparkles';
      cardTitle = recommendation.type === 'active_recovery' ? 'Recovery Mode' : 'Rest Day';
  } else if (recommendation.type === 'promotion') {
      gradientClass = 'from-amber-500/90 to-orange-600/90 border-yellow-400/30';
      iconName = 'trophy';
      cardTitle = 'Level Up!';
  } else if (recommendation.type === 'imbalance') {
      gradientClass = 'from-amber-600 to-orange-700 border-orange-500/30';
      iconName = 'scale';
      cardTitle = t('rec_type_imbalance');
  }

  // Format parameters if this is an imbalance check (assuming keys map to weight values)
  const formattedParams = useMemo(() => {
      if (!recommendation.reasonParams) return undefined;
      if (recommendation.type !== 'imbalance') return recommendation.reasonParams;

      const newParams = { ...recommendation.reasonParams };
      const weightKeys = ['squat', 'deadlift', 'bench', 'ohp'];
      
      weightKeys.forEach(key => {
          if (newParams[key] !== undefined) {
               const val = Number(newParams[key]);
               if (!isNaN(val)) {
                   // Translate unit if possible
                   const unitLabel = t(`workout_${weightUnit}` as TranslationKey) || weightUnit;
                   newParams[key] = `${displayWeight(val)} ${unitLabel}`; 
               }
          }
      });
      return newParams;
  }, [recommendation, displayWeight, weightUnit, t]);

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 shadow-lg border bg-gradient-to-br ${gradientClass} mb-6 animate-fadeIn transition-all`}>
      {/* Decorative background element */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-white/20 p-1.5 rounded-lg">
               <Icon name={iconName as any} className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                {cardTitle}
            </span>
            <button onClick={onDismiss} className="ml-auto text-white/70 hover:text-white"><Icon name="x" className="w-5 h-5"/></button>
          </div>
          
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">
            {t(recommendation.titleKey as TranslationKey, recommendation.titleParams)}
          </h3>
          
          <p className="text-white/90 text-sm leading-relaxed max-w-lg">
            {t(recommendation.reasonKey as TranslationKey, formattedParams || recommendation.reasonParams)}
          </p>
        </div>

        {/* Action Buttons & Inline Routines */}
        <div className="flex flex-col gap-2 mt-1">
            {recommendation.type === 'promotion' && onUpgrade && (
                 <button
                    onClick={onUpgrade}
                    className="w-full bg-white text-amber-600 font-bold py-3 px-4 rounded-xl shadow-md hover:bg-amber-50 transition-colors flex items-center justify-center gap-2 mb-2"
                >
                    <Icon name="arrow-up" className="w-4 h-4" />
                    <span>Upgrade Routines</span>
                </button>
            )}

            {recommendation.generatedRoutine && (
                <button
                    onClick={onViewSmartRoutine}
                    className="w-full bg-white text-indigo-600 font-bold py-3 px-4 rounded-xl shadow-md hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 mb-2"
                >
                    <Icon name="sparkles" className="w-4 h-4" />
                    <span>Smart Workout</span>
                </button>
            )}
            
            {/* List Recommended Routines Inline */}
            {recommendedRoutines.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                 {recommendedRoutines.map(routine => (
                   <button 
                      key={routine.id}
                      onClick={() => onRoutineSelect(routine)}
                      className="flex items-center justify-between w-full text-left bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 p-3 rounded-xl transition-colors group"
                   >
                      <span className="font-bold text-white text-sm truncate">{routine.name}</span>
                      <Icon name="arrow-right" className="w-4 h-4 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-transform" />
                   </button>
                 ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SmartRecommendationCard;
