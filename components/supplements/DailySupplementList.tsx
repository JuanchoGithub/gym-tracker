
import React, { useContext, useMemo, useCallback, useState, useEffect } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';
import { SupplementPlanItem } from '../../types';
import { getExplanationIdForSupplement } from '../../services/explanationService';
import { getDateString, getEffectiveDate } from '../../utils/timeUtils';

const timeKeywords = {
    en: {
        morning: /morning|breakfast|am/i,
        pre_workout: /pre-workout|pre-entreno/i,
        post_workout: /post-workout|post-entreno/i,
        lunch: /lunch|noon|midday/i,
        with_meal: /meal|food/i,
        evening: /evening|bed|night|sleep|pm/i,
    },
    es: {
        morning: /mañana|desayuno|am/i,
        pre_workout: /pre-entreno|pre-workout/i,
        post_workout: /post-entreno|post-entrenamiento/i,
        lunch: /almuerzo|mediodía/i,
        with_meal: /comida|alimento/i,
        evening: /noche|dormir|cama|sueño|pm/i,
    }
};

// Sort helper - Lower number means earlier in the day
const timeOrder: { [key: string]: number } = {
    pre_workout: 0.5, // Explicitly before morning
    morning: 1,
    intra_workout: 2.5,
    post_workout: 3,
    lunch: 3.5,
    with_meal: 4,
    evening: 5,
    daily: 6
};

const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

interface DailySupplementListProps {
  date: Date;
  readOnly?: boolean;
  title?: React.ReactNode;
  subTitle?: string;
  onOpenExplanation?: (id: string) => void;
}

const DailySupplementList: React.FC<DailySupplementListProps> = ({ date, readOnly = false, title, subTitle, onOpenExplanation }) => {
  const { supplementPlan, takenSupplements, toggleSupplementIntake } = useContext(AppContext);
  const { t, locale } = useI18n();
  const [isSmartSortEnabled, setIsSmartSortEnabled] = useState(true);
  const [hasSmartSortChanges, setHasSmartSortChanges] = useState(false);

  const dateString = getDateString(date);
  const takenIds = takenSupplements[dateString] || [];
  const trainingTime = supplementPlan?.info?.trainingTime || 'afternoon';
  
  const getTimeKey = useCallback((time: string): string => {
    // Handle ZMA/Magnesium explicit check if regex fails, though updated regex should catch 'bed'
    const keywords = timeKeywords[locale as keyof typeof timeKeywords] || timeKeywords.en;
    
    for (const key in keywords) {
        if (keywords[key as keyof typeof keywords].test(time)) {
            return key;
        }
    }
    return 'daily';
  }, [locale]);

  const handleToggleTaken = (itemId: string) => {
    if (readOnly) return;
    toggleSupplementIntake(dateString, itemId);
  };

  const { groupedPlan, orderedGroups, isTrainingDay, scheduledCount } = useMemo(() => {
    const dayOfWeek = daysOfWeek[date.getDay()];
    const isTrainingDay = !!supplementPlan?.info?.trainingDays?.includes(dayOfWeek);

    if (!supplementPlan?.plan) {
      return { groupedPlan: {}, orderedGroups: [], isTrainingDay, scheduledCount: 0 };
    }
    
    // 1. Filter items for today
    const itemsForDay = supplementPlan.plan.filter(item => {
        if (item.restDayOnly) return !isTrainingDay;
        if (item.trainingDayOnly) return isTrainingDay;
        return true;
    }).map(item => {
        // Special logic for creatine on rest days
        if (getExplanationIdForSupplement(item.supplement) === 'creatine' && !isTrainingDay) {
            return { ...item, time: t('supplements_time_with_breakfast') };
        }
        return item;
    });

    // 2. Grouping Logic with Smart Sort detection
    let changesDetected = false;

    const grouped = itemsForDay.reduce((acc, item) => {
        let key = getTimeKey(item.time);
        const originalKey = key;

        // --- SMART SORTING LOGIC ---
        // Only apply if enabled AND if we are not dealing with Pre-Workout which has its own specific early slot
        if (isSmartSortEnabled && isTrainingDay) {
             // Move Post workout items into Morning/Evening buckets if applicable, but keep Pre-workout separate/first unless it's Evening training
             if (key === 'post_workout' || key === 'intra_workout') {
                 if (trainingTime === 'morning') {
                     key = 'morning';
                 } else if (trainingTime === 'night') {
                     key = 'evening';
                 }
             }
             // For Pre-workout, if training in evening, move to evening group, otherwise keep as separate high priority group
             if (key === 'pre_workout' && trainingTime === 'night') {
                 key = 'evening';
             }
        }

        if (key !== originalKey) {
            changesDetected = true;
        }

        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(item);
        return acc;
    }, {} as Record<string, SupplementPlanItem[]>);
    
    const ordered = Object.keys(grouped).sort((a, b) => (timeOrder[a] || 99) - (timeOrder[b] || 99));
    
    return { groupedPlan: grouped, orderedGroups: ordered, isTrainingDay, scheduledCount: itemsForDay.length, changesDetected };
  }, [supplementPlan, getTimeKey, date, t, isSmartSortEnabled, trainingTime]);

  // Use the memoized result to set the flag for rendering the banner
  useEffect(() => {
      setHasSmartSortChanges(groupedPlan && isTrainingDay && (trainingTime === 'morning' || trainingTime === 'night'));
  }, [groupedPlan, isTrainingDay, trainingTime]);


  return (
    <div className="space-y-6">
      {title}
      
      {subTitle && (
        <div className="text-center -mt-4 mb-4 animate-fadeIn">
             <span className="inline-block px-3 py-1 bg-white/5 rounded-full text-xs font-medium text-text-secondary/80 border border-white/5">
                 {subTitle}
             </span>
        </div>
      )}
      
      {/* Smart Schedule Notification */}
      {isSmartSortEnabled && hasSmartSortChanges && (
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg flex items-start justify-between gap-3 animate-fadeIn">
              <div className="flex items-start gap-3">
                  <Icon name="sparkles" className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div>
                      <p className="text-sm font-bold text-indigo-200">{t('supplements_smart_schedule_active')}</p>
                      <p className="text-xs text-indigo-200/70">
                          {t('supplements_smart_schedule_desc', { time: t(`supplements_training_time_${trainingTime}` as any).toLowerCase() })}
                      </p>
                  </div>
              </div>
              <button 
                  onClick={() => setIsSmartSortEnabled(false)}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 whitespace-nowrap mt-1 underline"
              >
                  {t('supplements_smart_schedule_undo')}
              </button>
          </div>
      )}

      {/* Restore Banner */}
      {!isSmartSortEnabled && hasSmartSortChanges && (
           <div className="bg-surface/50 border border-white/5 p-2 rounded-lg flex justify-center">
               <button 
                  onClick={() => setIsSmartSortEnabled(true)}
                  className="text-xs font-bold text-text-secondary hover:text-primary flex items-center gap-1"
              >
                  <Icon name="sparkles" className="w-3 h-3" />
                  {t('supplements_smart_schedule_enable')}
              </button>
           </div>
      )}

      {supplementPlan && (
        <div className="text-center p-3 bg-surface rounded-lg">
            <p className={`font-bold text-lg ${isTrainingDay ? 'text-primary' : 'text-text-secondary'}`}>
            {isTrainingDay ? t('supplements_workout_day') : t('supplements_rest_day')}
            </p>
        </div>
      )}

      {orderedGroups.length === 0 ? (
        <div className="text-center text-text-secondary py-10">
            <Icon name="capsule" className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{readOnly ? t('supplements_log_no_data_for_date') : t('supplements_no_plan')}</p>
        </div>
      ) : (
        orderedGroups.map(groupName => (
            <div key={groupName}>
                <h3 className="text-lg font-semibold text-text-secondary mb-3 border-b border-secondary/20 pb-2 capitalize">
                    {/* Handle translation for standard keys, or fallback to capitalized key for re-mapped groups */}
                    {['morning', 'lunch', 'evening', 'pre_workout', 'post_workout', 'intra_workout'].includes(groupName) 
                        ? t(`supplements_timegroup_${groupName}` as any) 
                        : t(`supplements_timegroup_${groupName}` as any) || groupName
                    }
                </h3>
                <div className="space-y-3">
                    {groupedPlan[groupName].map(item => {
                        const isTaken = takenIds.includes(item.id);
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleToggleTaken(item.id)}
                                disabled={readOnly}
                                className={`bg-surface p-4 rounded-lg shadow-md flex items-start gap-4 transition-opacity text-left w-full ${isTaken ? 'opacity-50' : 'opacity-100'} ${readOnly ? 'cursor-default' : ''}`}
                                aria-label={`Mark ${item.supplement} as ${isTaken ? 'not taken' : 'taken'}`}
                            >
                                <div
                                    className="flex-shrink-0 mt-1"
                                    aria-hidden="true"
                                >
                                    <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors ${isTaken ? 'bg-primary border-primary' : 'border-secondary'}`}>
                                        {isTaken && <Icon name="check" className="w-4 h-4 text-white" />}
                                    </div>
                                </div>
                                <div className="flex-grow">
                                    <div className="flex items-center gap-2">
                                        <h4 className={`font-bold text-lg transition-colors ${isTaken ? 'line-through text-text-secondary' : 'text-primary'}`}>{item.supplement}</h4>
                                        {onOpenExplanation && getExplanationIdForSupplement(item.supplement) && (
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    const id = getExplanationIdForSupplement(item.supplement);
                                                    if (id) onOpenExplanation(id);
                                                }}
                                                className="text-text-secondary/60 hover:text-primary"
                                            >
                                                <Icon name="question-mark-circle" className="w-5 h-5" />
                                            </button>
                                        )}
                                        {item.stock !== undefined && item.stock <= 5 && !isTaken && (
                                            <span className="text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">
                                                Low: {item.stock}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 my-2 flex-wrap">
                                        <span className={`font-mono text-base px-3 py-1 rounded-full transition-colors ${isTaken ? 'bg-slate-700 text-text-secondary line-through' : 'bg-secondary/50'}`}>{item.dosage}</span>
                                        <p className={`text-sm font-semibold transition-colors ${isTaken ? 'line-through text-text-secondary/70' : 'text-text-secondary'}`}>{item.time}</p>
                                    </div>
                                    <p className={`text-sm transition-colors whitespace-pre-wrap ${isTaken ? 'line-through text-text-secondary/70' : 'text-text-primary'}`}>{item.notes}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        ))
      )}
    </div>
  );
};

export default DailySupplementList;
