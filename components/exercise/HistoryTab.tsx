
import React from 'react';
import { useI18n } from '../../hooks/useI18n';
import { ExerciseHistory, calculate1RM } from '../../utils/workoutUtils';
import { useMeasureUnit } from '../../hooks/useWeight';
import { Icon } from '../common/Icon';
import { TranslationKey } from '../../contexts/I18nContext';

interface HistoryTabProps {
  history: ExerciseHistory;
}

const HistoryTab: React.FC<HistoryTabProps> = ({ history }) => {
  const { t } = useI18n();
  const { displayWeight, weightUnit } = useMeasureUnit();

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
        <div className="w-16 h-16 bg-surface-highlight/30 rounded-full flex items-center justify-center mb-4">
           <Icon name="history" className="w-8 h-8 opacity-50" />
        </div>
        <p>{t('history_no_data')}</p>
      </div>
    );
  }

  // Reverse history to show newest first
  const reversedHistory = [...history].reverse();

  const getComparisonIcon = (current: number, prev: number | undefined) => {
    if (prev === undefined || isNaN(current) || isNaN(prev)) return null;
    const diff = current - prev;
    if (Math.abs(diff) < 0.01) return null; 

    if (diff > 0) {
        return <Icon name="arrow-up" className="w-3 h-3 text-success" />;
    }
    return <Icon name="arrow-down" className="w-3 h-3 text-red-400" />;
  };

  return (
    <div className="relative pl-4 space-y-8 my-4">
      {/* Vertical Line */}
      <div className="absolute top-2 bottom-4 left-[21px] w-0.5 bg-gradient-to-b from-primary/50 via-white/10 to-transparent"></div>

      {reversedHistory.map((entry, entryIndex) => {
        // For comparison, look at the next item in the reversed array (which is historically previous)
        const prevEntry = reversedHistory[entryIndex + 1];
        const date = new Date(entry.session.startTime);
        
        return (
          <div key={entry.session.id} className="relative pl-10 animate-fadeIn" style={{ animationDelay: `${entryIndex * 50}ms` }}>
            {/* Timeline Dot */}
            <div className="absolute top-1.5 left-3 w-4 h-4 rounded-full bg-background border-2 border-primary shadow-[0_0_10px_rgba(56,189,248,0.4)] z-10"></div>
            
            <div className="bg-surface/60 border border-white/5 rounded-xl overflow-hidden">
                <div className="bg-black/20 px-4 py-3 border-b border-white/5 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-text-primary text-sm">{entry.session.routineName}</h3>
                        <p className="text-xs text-text-secondary mt-0.5 font-medium opacity-80">
                            {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                    {entry.exerciseData.sets.some(s => s.type === 'normal' && s.isComplete) && (
                        <div className="bg-primary/10 px-2 py-1 rounded text-[10px] font-bold text-primary border border-primary/20">
                            {entry.exerciseData.sets.filter(s => s.type === 'normal' && s.isComplete).length} Sets
                        </div>
                    )}
                </div>
                
                <div className="p-2">
                    <div className="grid grid-cols-10 gap-2 text-[10px] uppercase tracking-wider font-bold text-text-secondary/50 pb-2 px-2 pt-1">
                        <div className="col-span-1 text-center">#</div>
                        <div className="col-span-5">{t('workout_weight')} & {t('workout_reps')}</div>
                        <div className="col-span-4 text-right">{t('history_1rm')}</div>
                    </div>
                  
                  <div className="space-y-1">
                    {entry.exerciseData.sets.map((set, setIndex) => {
                        const prevSet = prevEntry?.exerciseData.sets[setIndex];
                        const est1RM = calculate1RM(set.weight, set.reps);
                        const prevEst1RM = prevSet ? calculate1RM(prevSet.weight, prevSet.reps) : undefined;
                        const isPr = !prevEst1RM || est1RM > prevEst1RM;

                        return (
                        <div key={set.id} className={`grid grid-cols-10 gap-2 items-center text-sm py-2 px-2 rounded-lg ${setIndex % 2 === 0 ? 'bg-white/5' : 'bg-transparent'}`}>
                            <div className="col-span-1 text-center text-text-secondary/70 text-xs font-mono">{setIndex + 1}</div>
                            <div className="col-span-5 flex items-center font-mono font-medium text-text-primary">
                                <span className="text-white">{displayWeight(set.weight)}</span>
                                <span className="text-[10px] text-text-secondary ml-0.5 mr-1">{t(`workout_${weightUnit}` as TranslationKey)}</span>
                                <span className="text-text-secondary/40 mx-1">×</span>
                                <span className="text-white">{set.reps}</span>
                            </div>
                            <div className="col-span-4 text-right font-mono flex items-center justify-end gap-1.5">
                                <span className={`font-medium ${isPr && entryIndex === 0 ? 'text-success' : 'text-text-secondary'}`}>{displayWeight(est1RM)}</span>
                                {getComparisonIcon(est1RM, prevEst1RM)}
                            </div>
                        </div>
                        );
                    })}
                  </div>
                </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HistoryTab;
