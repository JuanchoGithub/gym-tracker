
import React, { useMemo } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { WorkoutSession, SupplementPlanItem } from '../../types';
import { analyzeCorrelations, SupplementCorrelation } from '../../services/analyticsService';
import { Icon } from '../common/Icon';

interface InsightsTabProps {
  history: WorkoutSession[];
  takenSupplements: Record<string, string[]>;
  allSupplements: SupplementPlanItem[];
}

const InsightCard: React.FC<{ insight: SupplementCorrelation }> = ({ insight }) => {
  const { t } = useI18n();
  const isPositive = insight.differencePercentage > 0;
  const isNeutral = insight.differencePercentage === 0;
  
  let colorClass = 'text-text-secondary';
  let bgClass = 'bg-surface';
  let icon = 'minus';
  
  if (isPositive) {
    colorClass = 'text-success';
    bgClass = 'bg-green-500/10 border-green-500/20';
    icon = 'arrow-up';
  } else if (!isNeutral) {
    colorClass = 'text-red-400';
    bgClass = 'bg-red-500/10 border-red-500/20';
    icon = 'arrow-down';
  }

  return (
    <div className={`p-4 rounded-xl border border-white/5 flex items-start gap-4 ${bgClass}`}>
      <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-500/20' : (!isNeutral ? 'bg-red-500/20' : 'bg-slate-700')} flex-shrink-0`}>
          <Icon name="chart-line" className={`w-6 h-6 ${colorClass}`} />
      </div>
      <div className="flex-grow">
          <h4 className="font-bold text-lg text-text-primary">{insight.supplementName}</h4>
          <div className="flex items-center gap-2 my-1">
              <span className={`text-xl font-bold ${colorClass}`}>
                {isPositive ? '+' : ''}{insight.differencePercentage}%
              </span>
              <span className="text-sm text-text-secondary font-medium">
                  {insight.metric === 'volume' ? t('insights_volume_impact') : t('insights_pr_impact')}
              </span>
          </div>
          <p className="text-xs text-text-secondary/70 mt-2">
              {t('insights_sample_size', { on: insight.sampleSizeOn, off: insight.sampleSizeOff })}
          </p>
      </div>
    </div>
  );
};

const InsightsTab: React.FC<InsightsTabProps> = ({ history, takenSupplements, allSupplements }) => {
  const { t } = useI18n();

  const insights = useMemo(() => {
    return analyzeCorrelations(history, takenSupplements, allSupplements);
  }, [history, takenSupplements, allSupplements]);

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary text-center px-4">
        <div className="w-16 h-16 bg-surface-highlight/30 rounded-full flex items-center justify-center mb-4">
           <Icon name="sparkles" className="w-8 h-8 opacity-50" />
        </div>
        <h3 className="text-lg font-bold mb-2">{t('insights_empty_title')}</h3>
        <p>{t('insights_empty_desc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg text-sm text-indigo-200 flex items-start gap-3">
         <Icon name="question-mark-circle" className="w-5 h-5 flex-shrink-0 mt-0.5" />
         <p>{t('insights_correlation_explanation')}</p>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {insights.map(insight => (
            <InsightCard key={`${insight.supplementId}-${insight.metric}`} insight={insight} />
        ))}
      </div>
    </div>
  );
};

export default InsightsTab;
