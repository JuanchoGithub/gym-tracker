import React, { useContext, useMemo, useCallback } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';
import { SupplementPlanItem } from '../../types';

const timeKeywords = {
    en: {
        morning: /morning|breakfast/i,
        pre_workout: /pre-workout/i,
        post_workout: /post-workout/i,
        with_meal: /meal/i,
        evening: /evening|bed/i,
    },
    es: {
        morning: /mañana|desayuno/i,
        pre_workout: /pre-entreno/i,
        post_workout: /post-entreno|post-entrenamiento/i,
        with_meal: /comida/i,
        evening: /noche|dormir/i,
    }
};

const timeOrder: { [key: string]: number } = {
    morning: 1,
    pre_workout: 2,
    post_workout: 3,
    with_meal: 4,
    evening: 5,
    daily: 6
};

const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

interface DailySupplementListProps {
  date: Date;
  readOnly?: boolean;
  title?: React.ReactNode;
}

const DailySupplementList: React.FC<DailySupplementListProps> = ({ date, readOnly = false, title }) => {
  const { supplementPlan, takenSupplements, setTakenSupplements } = useContext(AppContext);
  const { t, locale } = useI18n();

  const dateString = date.toISOString().split('T')[0];
  const takenIds = takenSupplements[dateString] || [];
  
  const getTimeKey = useCallback((time: string): string => {
    const keywords = timeKeywords[locale as keyof typeof timeKeywords];
    for (const key in keywords) {
        if (keywords[key as keyof typeof keywords].test(time)) {
            return key;
        }
    }
    return 'daily';
  }, [locale]);

  const handleToggleTaken = (itemId: string) => {
    if (readOnly) return;
    setTakenSupplements(prev => {
      const currentDayTaken = prev[dateString] || [];
      const newDayTaken = currentDayTaken.includes(itemId)
        ? currentDayTaken.filter(id => id !== itemId)
        : [...currentDayTaken, itemId];
      return { ...prev, [dateString]: newDayTaken };
    });
  };

  const { groupedPlan, orderedGroups, isTrainingDay, scheduledCount } = useMemo(() => {
    const dayOfWeek = daysOfWeek[date.getDay()];
    const isTrainingDay = !!supplementPlan?.info?.trainingDays?.includes(dayOfWeek);

    if (!supplementPlan?.plan) {
      return { groupedPlan: {}, orderedGroups: [], isTrainingDay, scheduledCount: 0 };
    }
    
    const itemsForDay = supplementPlan.plan.filter(item => {
        return !item.trainingDayOnly || isTrainingDay;
    }).map(item => {
        // Special logic for creatine on rest days: change its time for display and grouping
        if (item.id.includes('gen-creatine') && !isTrainingDay) {
            return { ...item, time: t('supplements_time_with_breakfast') };
        }
        return item;
    });

    const grouped = itemsForDay.reduce((acc, item) => {
        const key = getTimeKey(item.time);
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(item);
        return acc;
    }, {} as Record<string, SupplementPlanItem[]>);
    
    const ordered = Object.keys(grouped).sort((a, b) => (timeOrder[a] || 99) - (timeOrder[b] || 99));

    return { groupedPlan: grouped, orderedGroups: ordered, isTrainingDay, scheduledCount: itemsForDay.length };
  }, [supplementPlan, getTimeKey, date, t]);


  return (
    <div className="space-y-6">
      {title}
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
                <h3 className="text-lg font-semibold text-text-secondary mb-3 border-b border-secondary/20 pb-2">
                    {t(`supplements_timegroup_${groupName}` as any, {})}
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
                                    <h4 className={`font-bold text-lg transition-colors ${isTaken ? 'line-through text-text-secondary' : 'text-primary'}`}>{item.supplement}</h4>
                                    <p className={`text-sm mb-2 font-semibold transition-colors ${isTaken ? 'line-through text-text-secondary/70' : 'text-text-secondary'}`}>{item.time}</p>
                                    <p className={`text-sm transition-colors whitespace-pre-wrap ${isTaken ? 'line-through text-text-secondary/70' : 'text-text-primary'}`}>{item.notes}</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <span className={`font-mono text-base px-3 py-1 rounded-full transition-colors ${isTaken ? 'bg-slate-700 text-text-secondary line-through' : 'bg-secondary/50'}`}>{item.dosage}</span>
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
