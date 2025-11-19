
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
    return <p className="text-text-secondary text-center p-4">{t('history_no_data')}</p>;
  }

  const getComparisonIcon = (current: number, prev: number | undefined) => {
    if (prev === undefined || isNaN(current) || isNaN(prev)) return null;
    const diff = current - prev;
    if (Math.abs(diff) < 0.01) return null; // No significant change

    if (diff > 0) {
        return <Icon name="arrow-up" className="w-4 h-4 text-green-400 ml-1"/>;
    }
    return <Icon name="arrow-down" className="w-4 h-4 text-red-400 ml-1"/>;
  };

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      {history.map((entry, entryIndex) => {
        const prevEntry = history[entryIndex + 1];
        const date = new Date(entry.session.startTime);
        
        return (
          <div key={entry.session.id} className="bg-slate-900/50 p-3 rounded-lg">
            <div>
                <h3 className="font-bold text-text-primary">{entry.session.routineName}</h3>
                <p className="text-xs text-text-secondary mb-2">
                    {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {date.toLocaleDateString()}
                </p>
            </div>
            
            <div className="text-xs space-y-1">
              <div className="grid grid-cols-12 gap-2 font-semibold text-text-secondary border-b border-secondary/20 pb-1">
                  <div className="col-span-6">{t('workout_sets')}</div>
                  <div className="col-span-3 text-right">{t('history_volume')}</div>
                  <div className="col-span-3 text-right">{t('history_1rm')}</div>
              </div>
              
              {entry.exerciseData.sets.map((set, setIndex) => {
                const prevSet = prevEntry?.exerciseData.sets[setIndex];
                const volume = set.weight * set.reps;
                const prevVolume = prevSet ? prevSet.weight * prevSet.reps : undefined;
                const est1RM = calculate1RM(set.weight, set.reps);
                const prevEst1RM = prevSet ? calculate1RM(prevSet.weight, prevSet.reps) : undefined;

                return (
                  <div key={set.id} className="grid grid-cols-12 gap-2 items-center text-sm py-1">
                    <div className="col-span-6 flex items-center font-mono">
                        <span className="font-sans font-bold w-6 text-center mr-2">{setIndex + 1}</span>
                        {displayWeight(set.weight)}{t(`workout_${weightUnit}` as TranslationKey)} x {set.reps}
                        {getComparisonIcon(est1RM, prevEst1RM)}
                    </div>
                    <div className="col-span-3 text-right font-mono flex items-center justify-end">
                        <span>{displayWeight(volume)}</span>
                        {getComparisonIcon(volume, prevVolume)}
                    </div>
                     <div className="col-span-3 text-right font-mono flex items-center justify-end">
                        <span>{displayWeight(est1RM)}</span>
                        {getComparisonIcon(est1RM, prevEst1RM)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HistoryTab;