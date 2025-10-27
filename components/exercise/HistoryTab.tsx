
import React from 'react';
import { useI18n } from '../../hooks/useI18n';
import { ExerciseHistory, calculate1RM } from '../../utils/workoutUtils';
import Pill from '../common/Pill';
import { useWeight } from '../../hooks/useWeight';

interface HistoryTabProps {
  history: ExerciseHistory;
}

const HistoryTab: React.FC<HistoryTabProps> = ({ history }) => {
  const { t } = useI18n();
  const { displayWeight, unit } = useWeight();

  if (history.length === 0) {
    return <p className="text-text-secondary text-center p-4">{t('history_no_data')}</p>;
  }
  
  const getComparisonPill = (current: number, prev: number | undefined) => {
    if (prev === undefined || current === prev) return null;
    const diff = current - prev;
    const diffStr = `${diff > 0 ? '+' : ''}${displayWeight(diff, true)}`;
    const type = diff > 0 ? 'increase' : 'decrease';
    return <Pill value={diffStr} type={type} />;
  }

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      {history.map((entry, entryIndex) => {
        const prevEntry = history[entryIndex + 1];
        return (
          <div key={entry.session.id} className="bg-slate-900/50 p-3 rounded-lg">
            <h3 className="font-bold text-text-primary mb-2">
              {new Date(entry.session.startTime).toLocaleDateString()}
            </h3>
            <div className="text-xs space-y-1">
              {entry.exerciseData.sets.map((set, setIndex) => {
                const prevSet = prevEntry?.exerciseData.sets[setIndex];
                const volume = set.weight * set.reps;
                const prevVolume = prevSet ? prevSet.weight * prevSet.reps : undefined;
                const est1RM = calculate1RM(set.weight, set.reps);
                const prevEst1RM = prevSet ? calculate1RM(prevSet.weight, prevSet.reps) : undefined;

                return (
                  <div key={set.id} className="grid grid-cols-4 gap-2 items-center">
                    {/* FIX: Used a template literal to construct a valid translation key for the weight unit. */}
                    <div className="font-mono">{t('workout_set')} {setIndex + 1}: {displayWeight(set.weight)}{t(`workout_${unit}`)} x {set.reps}</div>
                    <div className="flex items-center gap-1">
                        <span className="text-text-secondary">{t('history_volume')}: {displayWeight(volume)}</span>
                        {getComparisonPill(volume, prevVolume)}
                    </div>
                     <div className="flex items-center gap-1 col-span-2">
                        <span className="text-text-secondary">{t('history_1rm')}: {displayWeight(est1RM)}</span>
                        {getComparisonPill(est1RM, prevEst1RM)}
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
