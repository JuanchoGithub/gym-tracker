
import React, { forwardRef } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';
import WorkoutRestTimer from '../workout/WorkoutRestTimer';
import { WorkoutSession } from '../../types';

interface WorkoutSessionHeaderProps {
  activeWorkout: WorkoutSession;
  elapsedTime: string;
  onMinimize: () => void;
  onFinish: () => void;
  onOpenDetails: () => void;
  isReorganizeMode: boolean;
  onCancelReorganize: () => void;
  onSaveReorganize: () => void;
}

const WorkoutSessionHeader = forwardRef<HTMLDivElement, WorkoutSessionHeaderProps>(({
  activeWorkout,
  elapsedTime,
  onMinimize,
  onFinish,
  onOpenDetails,
  isReorganizeMode,
  onCancelReorganize,
  onSaveReorganize
}, ref) => {
  const { t } = useI18n();

  return (
    <>
      <div ref={ref} className="sticky top-0 bg-background/80 backdrop-blur-sm z-20 -mx-2 sm:-mx-4 px-2 sm:px-4 py-2 border-b border-secondary/20">
          <div className="container mx-auto flex items-center justify-between">
              {!isReorganizeMode ? (
                <>
                  <button 
                    onClick={onMinimize} 
                    className="p-2 text-text-secondary hover:text-primary"
                    aria-label={t('active_workout_minimize_aria')}
                  >
                      <Icon name="arrow-down" />
                  </button>
                  <div className="font-mono text-lg text-warning">{elapsedTime}</div>
                  <button 
                    onClick={onFinish} 
                    className="bg-success text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-green-400 text-sm"
                  >
                      {t('workout_finish')}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={onCancelReorganize} className="bg-secondary text-white font-bold py-2 px-4 rounded-lg shadow-lg text-sm">
                      {t('common_cancel')}
                  </button>
                  <h3 className="text-lg font-bold">{t('exercise_header_menu_reorganize')}</h3>
                  <button onClick={onSaveReorganize} className="bg-success text-white font-bold py-2 px-4 rounded-lg shadow-lg text-sm">
                      {t('workout_reorganize_save_order')}
                  </button>
                </>
              )}
          </div>
          <div className="container mx-auto mt-2">
            <WorkoutRestTimer />
          </div>
      </div>
      
      <div className="text-center -mt-2 space-y-1">
        <div className="flex justify-center items-center gap-2 max-w-full mx-auto px-4">
            <h1 className="flex-shrink min-w-0 text-2xl md:text-3xl font-bold truncate">{activeWorkout.routineName}</h1>
            <button
                onClick={onOpenDetails}
                className="text-text-secondary hover:text-primary p-1 flex-shrink-0"
                aria-label={t('active_workout_edit_details_aria')}
            >
                <Icon name="ellipsis" />
            </button>
        </div>
        <p className="text-sm text-text-secondary">
          {new Date(activeWorkout.startTime).toLocaleString(undefined, {
              weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
        </p>
      </div>
    </>
  );
});

export default WorkoutSessionHeader;
