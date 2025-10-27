
import React, { useContext, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useI18n } from '../hooks/useI18n';
import { Routine } from '../types';
import RoutinePreviewModal from '../components/modals/RoutinePreviewModal';
import ConfirmNewWorkoutModal from '../components/modals/ConfirmNewWorkoutModal';

const TrainPage: React.FC = () => {
  const { routines, startWorkout, activeWorkout, discardActiveWorkout, maximizeWorkout } = useContext(AppContext);
  const { t } = useI18n();
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [isConfirmingNewWorkout, setIsConfirmingNewWorkout] = useState(false);
  const [routineToStart, setRoutineToStart] = useState<Routine | null>(null);

  const handleStartWorkout = (routine: Routine) => {
    setSelectedRoutine(null);
    if (activeWorkout) {
      setRoutineToStart(routine);
      setIsConfirmingNewWorkout(true);
    } else {
      startWorkout(routine);
    }
  };

  const handleConfirmStartNew = () => {
    if (routineToStart) {
      discardActiveWorkout();
      startWorkout(routineToStart);
      setRoutineToStart(null);
    }
    setIsConfirmingNewWorkout(false);
  };

  const handleConfirmContinue = () => {
    maximizeWorkout();
    setIsConfirmingNewWorkout(false);
    setRoutineToStart(null);
  };
  
  const handleCancelNewWorkout = () => {
    setIsConfirmingNewWorkout(false);
    setRoutineToStart(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-center">{t('nav_train')}</h1>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{t('train_routines_title')}</h2>
        {routines.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routines.map(routine => (
              <div
                key={routine.id}
                className="bg-surface p-4 rounded-lg shadow cursor-pointer hover:bg-slate-700 transition-colors"
                onClick={() => setSelectedRoutine(routine)}
              >
                <h3 className="font-bold text-lg text-primary">{routine.name}</h3>
                <p className="text-sm text-text-secondary truncate">{routine.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-text-secondary">No routines found. Create one on the Profile page!</p>
        )}
      </div>

      {selectedRoutine && (
        <RoutinePreviewModal
          isOpen={!!selectedRoutine}
          onClose={() => setSelectedRoutine(null)}
          routine={selectedRoutine}
          onStart={handleStartWorkout}
        />
      )}

      <ConfirmNewWorkoutModal 
        isOpen={isConfirmingNewWorkout}
        onClose={handleCancelNewWorkout}
        onStartNew={handleConfirmStartNew}
        onContinue={handleConfirmContinue}
      />
    </div>
  );
};

export default TrainPage;