
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
  onUpdate1RM?: (data: NonNullable<Recommendation['update1RMData']>) => void;
  onSnooze1RM?: (data: NonNullable<Recommendation['update1RMData']>) => void;
}

const SmartRecommendationCard: React.FC<SmartRecommendationCardProps> = ({ 
  recommendation, 
  recommendedRoutines,
  onDismiss, 
  onRoutineSelect,
  onViewSmartRoutine, 
  onUpgrade,
  onUpdate1RM,
  onSnooze1RM
}) => {
  const { t } = useI18n();
  const { displayWeight, weightUnit } = useMeasureUnit();

  let gradientClass = 'from-violet-600/90 to-indigo-700/90 border-indigo-500/30';
  let iconName = 'dumbbell';
  let cardTitle = t('smart_coach_title');
  
  if (recommendation.type === 'rest' || recommendation.type === 'active_recovery') {
      gradientClass = 'from-emerald-600/90 to-teal-700/90 border-emerald-500/30';
      iconName = 'sparkles';
      
      // Distinguish between general rest and specific gap workouts
      if (recommendation.generatedRoutine?.tags?.includes('gap_session')) {
         cardTitle = t('smart_gap_session');
         // Maybe a slightly different green or teal for active recovery
         gradientClass = 'from-teal-600/90 to-cyan-700/90 border-teal-500/30';
      } else if (recommendation.type === 'active_recovery') {
         cardTitle = t('smart_recovery_mode');
      } else {
         cardTitle = t('smart_rest_day');
      }

      // Specific check for post-workout celebration
      if (recommendation.reasonKey === "rec_reason_workout_complete") {
           gradientClass = 'from-green-600/90 to-emerald-700/90 border-green-500/30';
           iconName = 'trophy';
           cardTitle = t('smart_workout_complete');
      }

  } else if (recommendation.type === 'promotion') {
      gradientClass = 'from-amber-500/90 to-orange-600/90 border-yellow-400/30';
      iconName = 'trophy';
      cardTitle = t('smart_level_up');
  } else if (recommendation.type === 'imbalance') {
      gradientClass = 'from-amber-600 to-orange-700 border-orange-500/30';
      iconName = 'scale';
      cardTitle = t('rec_type_imbalance');
  } else if (recommendation.type === 'deload') {
      gradientClass = 'from-rose-600/90 to-pink-700/90 border-rose-500/30';
      iconName = 'warning';
      cardTitle = t('smart_cns_overload');
  } else if (recommendation.type === 'update_1rm') {
      gradientClass = 'from-blue-600/90 to-cyan-700/90 border-blue-500/30';
      iconName = 'chart-line';
      cardTitle = t('rec_type_strength_update');
  }

  // Format parameters if this is an imbalance check (assuming keys map to weight values)
  const formattedParams = useMemo(() => {
      if (!recommendation.reasonParams) return undefined;
      
      // Special handling for weight values in imbalance checks or 1RM updates
      if (recommendation.type === 'imbalance' || recommendation.type === 'update_1rm') {
          const newParams = { ...recommendation.reasonParams };
          const weightKeys = ['squat', 'deadlift', 'bench', 'ohp', 'old', 'new'];
          
          weightKeys.forEach(key => {
              if (newParams[key] !== undefined) {
                   const valStr = newParams[key].toString().replace(/[^\d.]/g, '');
                   const val = Number(valStr);
                   if (!isNaN(val)) {
                       const unitLabel = t(`workout_${weightUnit}` as TranslationKey) || weightUnit;
                       newParams[key] = `${displayWeight(val)} ${unitLabel}`; 
                   }
              }
          });
          return newParams;
      }

      return recommendation.reasonParams;
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
            
            {/* CNS Load Indicator */}
            {recommendation.systemicFatigue && (
                <div className="ml-auto flex items-center gap-1.5 bg-black/20 px-2 py-0.5 rounded-md border border-white/10">
                    <span className="text-[10px] font-semibold text-white/70 uppercase">{t('cns_load_label')}:</span>
                    <span className={`text-[10px] font-bold ${
                        recommendation.systemicFatigue.level === 'High' ? 'text-red-300' :
                        recommendation.systemicFatigue.level === 'Medium' ? 'text-yellow-300' :
                        'text-green-300'
                    }`}>
                        {t(`cns_level_${recommendation.systemicFatigue.level.toLowerCase()}` as TranslationKey)}
                    </span>
                </div>
            )}

            {!recommendation.systemicFatigue && (
                <button onClick={onDismiss} className="ml-auto text-white/70 hover:text-white"><Icon name="x" className="w-5 h-5"/></button>
            )}
          </div>
          
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">
            {t(recommendation.titleKey as TranslationKey, formattedParams || recommendation.titleParams)}
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
            
            {recommendation.type === 'update_1rm' && recommendation.update1RMData && onUpdate1RM && onSnooze1RM && (
                 <div className="flex gap-3 mt-2">
                     <button
                        onClick={() => onUpdate1RM(recommendation.update1RMData!)}
                        className="flex-1 bg-white text-blue-600 font-bold py-3 px-4 rounded-xl shadow-md hover:bg-blue-50 transition-colors"
                    >
                        {t('rec_action_update_profile')}
                    </button>
                    <button
                        onClick={() => onSnooze1RM(recommendation.update1RMData!)}
                        className="flex-1 bg-white/20 text-white font-bold py-3 px-4 rounded-xl shadow-sm hover:bg-white/30 transition-colors border border-white/10"
                    >
                        {t('rec_action_snooze')}
                    </button>
                 </div>
            )}

            {recommendation.generatedRoutine && (
                <button
                    onClick={onViewSmartRoutine}
                    className={`w-full bg-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 mb-2 ${
                        recommendation.type === 'deload' 
                            ? 'text-rose-600 hover:bg-rose-50' 
                            : 'text-indigo-600 hover:bg-indigo-50'
                    }`}
                >
                    <Icon name={recommendation.type === 'deload' ? 'sparkles' : 'sparkles'} className="w-4 h-4" />
                    <span>{recommendation.generatedRoutine.tags?.includes('gap_session') ? t('smart_gap_session') : t('smart_coach_title')}</span>
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