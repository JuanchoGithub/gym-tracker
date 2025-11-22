
import React, { useMemo, useCallback } from 'react';
import { SupplementPlan, SupplementPlanItem } from '../../types';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';
import { getExplanationIdForSupplement } from '../../services/explanationService';

interface SupplementPlanOverviewProps {
  plan: SupplementPlan;
  onRemoveItemRequest: (itemId: string) => void;
  onComplexRemoveRequest: (item: SupplementPlanItem) => void;
  onAddItemClick: () => void;
  onEditAnswers: () => void;
  onOpenExplanation: (id: string) => void;
}

const timeKeywords = {
    en: {
        morning: /morning|breakfast/i,
        pre_workout: /pre-workout/i,
        post_workout: /post-workout/i,
        lunch: /lunch/i,
        with_meal: /meal/i,
        evening: /evening|bed/i,
    },
    es: {
        morning: /mañana|desayuno/i,
        pre_workout: /pre-entreno/i,
        post_workout: /post-entreno|post-entrenamiento/i,
        lunch: /almuerzo/i,
        with_meal: /comida/i,
        evening: /noche|dormir/i,
    }
};

const timeOrder: { [key: string]: number } = {
    morning: 1,
    pre_workout: 2,
    post_workout: 3,
    lunch: 3.5,
    with_meal: 4,
    evening: 5,
    daily: 6
};

const SupplementItemCard: React.FC<{ item: SupplementPlanItem; onRemove: () => void; onOpenExplanation: (id: string) => void; }> = ({ item, onRemove, onOpenExplanation }) => {
  return (
    <div key={item.id} className="bg-surface p-4 rounded-lg shadow-md">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-lg text-primary">{item.supplement}</h4>
          {getExplanationIdForSupplement(item.supplement) && (
            <button 
                onClick={() => {
                    const id = getExplanationIdForSupplement(item.supplement);
                    if (id) onOpenExplanation(id);
                }}
                className="text-text-secondary/60 hover:text-primary"
            >
                <Icon name="question-mark-circle" className="w-5 h-5" />
            </button>
          )}
        </div>
        <button onClick={onRemove} className="ml-2 p-1 text-red-400/70 hover:text-red-400 flex-shrink-0" aria-label={`Remove ${item.supplement}`}>
          <Icon name="trash" className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="font-mono text-base bg-secondary/50 px-3 py-1 rounded-full">{item.dosage}</span>
          <p className="text-sm text-text-secondary font-semibold">{item.time}</p>
      </div>
      <p className="text-sm text-text-primary whitespace-pre-wrap">{item.notes}</p>
    </div>
  );
};

const SupplementPlanOverview: React.FC<SupplementPlanOverviewProps> = ({ plan, onRemoveItemRequest, onComplexRemoveRequest, onAddItemClick, onEditAnswers, onOpenExplanation }) => {
  const { t, locale } = useI18n();

  const handleRemoveClick = (item: SupplementPlanItem) => {
    if (item.trainingDayOnly || item.restDayOnly) {
        onRemoveItemRequest(item.id);
    } else {
        onComplexRemoveRequest(item);
    }
  };

  const getTimeKey = useCallback((time: string): string => {
    const keywords = timeKeywords[locale as keyof typeof timeKeywords];
    for (const key in keywords) {
        if (keywords[key as keyof typeof keywords].test(time)) {
            return key;
        }
    }
    return 'daily';
  }, [locale]);

  const groupedPlan = useMemo(() => {
    if (!plan?.plan) return { groupedPlan: {}, orderedGroups: [] };

    const groupedByTime = plan.plan.reduce((acc, item) => {
        const key = getTimeKey(item.time);
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(item);
        return acc;
    }, {} as Record<string, SupplementPlanItem[]>);
    
    const finalGrouped = Object.keys(groupedByTime).reduce((acc, timeGroupKey) => {
        const items = groupedByTime[timeGroupKey];
        acc[timeGroupKey] = {
            allDays: items.filter(item => !item.trainingDayOnly && !item.restDayOnly),
            workoutOnly: items.filter(item => !!item.trainingDayOnly),
            restOnly: items.filter(item => !!item.restDayOnly),
        };
        return acc;
    }, {} as Record<string, { allDays: SupplementPlanItem[], workoutOnly: SupplementPlanItem[], restOnly: SupplementPlanItem[] }>);

    const orderedGroups = Object.keys(finalGrouped).sort((a, b) => (timeOrder[a] || 99) - (timeOrder[b] || 99));

    return { groupedPlan: finalGrouped, orderedGroups };
  }, [plan, getTimeKey]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <button onClick={onEditAnswers} className="bg-secondary hover:bg-slate-500 text-white font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm">
            <Icon name="edit" className="w-4 h-4" />
            <span>{t('supplements_edit_plan')}</span>
        </button>
      </div>

      {plan.warnings && plan.warnings.length > 0 && (
        <div className="bg-yellow-500/10 border-l-4 border-yellow-400 p-4 rounded-r-lg">
            <h3 className="font-bold text-lg text-yellow-400 mb-2 flex items-center gap-2">
                <Icon name="warning" className="w-5 h-5" />
                {t('supplements_warnings')}
            </h3>
            <ul className="list-disc list-inside space-y-1 text-yellow-200">
                {plan.warnings.map((warning, i) => <li key={i}>{warning}</li>)}
            </ul>
        </div>
      )}

      {groupedPlan.orderedGroups.map(groupName => {
        const group = groupedPlan.groupedPlan[groupName];
        const hasAllDaysItems = group.allDays.length > 0;
        const hasWorkoutOnlyItems = group.workoutOnly.length > 0;
        const hasRestOnlyItems = group.restOnly.length > 0;
        if (!hasAllDaysItems && !hasWorkoutOnlyItems && !hasRestOnlyItems) return null;

        return (
          <div key={groupName} className="bg-surface/50 p-4 rounded-lg">
            <h3 className="text-xl font-semibold text-text-primary mb-3 border-b border-secondary/20 pb-2">
              {t(`supplements_timegroup_${groupName}` as any)}
            </h3>
            <div className="space-y-4">
              {hasAllDaysItems && (
                <div className="space-y-3">
                  {(hasWorkoutOnlyItems || hasRestOnlyItems) && <h4 className="font-bold text-text-secondary">{t('supplements_all_days')}</h4>}
                  {group.allDays.map(item => (
                    <SupplementItemCard item={item} onRemove={() => handleRemoveClick(item)} key={item.id} onOpenExplanation={onOpenExplanation} />
                  ))}
                </div>
              )}
              {hasWorkoutOnlyItems && (
                <div className="space-y-3">
                  <h4 className="font-bold text-primary">{t('supplements_workout_day')}</h4>
                  {group.workoutOnly.map(item => (
                    <SupplementItemCard item={item} onRemove={() => handleRemoveClick(item)} key={item.id} onOpenExplanation={onOpenExplanation} />
                  ))}
                </div>
              )}
              {hasRestOnlyItems && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sky-400">{t('supplements_rest_day')}</h4>
                  {group.restOnly.map(item => (
                    <SupplementItemCard item={item} onRemove={() => handleRemoveClick(item)} key={item.id} onOpenExplanation={onOpenExplanation} />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
      
      <button
          onClick={onAddItemClick}
          className="w-full flex items-center justify-center space-x-2 bg-secondary/50 text-text-primary font-medium py-3 rounded-lg hover:bg-secondary transition-colors"
        >
          <Icon name="plus" className="w-5 h-5" />
          <span>{t('supplements_add_custom')}</span>
      </button>

      {plan.general_tips && plan.general_tips.length > 0 && (
        <div className="bg-sky-500/10 p-4 rounded-lg">
            <h3 className="font-bold text-lg text-sky-400 mb-2">{t('supplements_general_tips')}</h3>
            <ul className="list-disc list-inside space-y-1 text-sky-200">
                {plan.general_tips.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
        </div>
      )}

      <div className="text-center text-xs text-text-secondary/70 p-4 border-t border-secondary/20 mt-4">
        <p>{t('supplements_disclaimer')}</p>
      </div>
    </div>
  );
};

export default SupplementPlanOverview;
