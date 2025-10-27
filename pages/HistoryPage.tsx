
import React, { useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useI18n } from '../hooks/useI18n';
import { WorkoutSession } from '../types';
import { useWeight } from '../hooks/useWeight';

const HistoryPage: React.FC = () => {
  const { history, getExerciseById } = useContext(AppContext);
  const { t } = useI18n();
  const { displayWeight, unit } = useWeight();

  if (history.length === 0) {
    return (
      <div className="text-center text-text-secondary">
        <h1 className="text-3xl font-bold mb-4">{t('nav_history')}</h1>
        <p>{t('history_page_no_workouts')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-3xl font-bold text-center">{t('nav_history')}</h1>
      {history.map((session: WorkoutSession) => (
        <div key={session.id} className="bg-surface p-3 sm:p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-lg">{session.routineName}</h2>
            <span className="text-sm text-text-secondary">
              {new Date(session.startTime).toLocaleDateString()}
            </span>
          </div>
          <div className="space-y-2">
            {session.exercises.map(ex => {
              const exerciseInfo = getExerciseById(ex.exerciseId);
              return (
                <div key={ex.id}>
                  <h4 className="font-semibold text-primary">{exerciseInfo?.name || t('history_page_unknown_exercise')}</h4>
                  <ul className="text-sm text-text-secondary pl-4">
                    {ex.sets.filter(s => s.isComplete).map((set, i) => (
                      <li key={set.id}>
                        {/* FIX: Used a template literal to construct a valid translation key for the weight unit. */}
                        {t('workout_set')} {i + 1}: {displayWeight(set.weight)} {t(`workout_${unit}`)} x {set.reps} {t('workout_reps')}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default HistoryPage;