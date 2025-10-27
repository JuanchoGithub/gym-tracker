import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useI18n } from '../hooks/useI18n';
import { Routine } from '../types';
import RoutinePreviewModal from '../components/modals/RoutinePreviewModal';
import ConfirmNewWorkoutModal from '../components/modals/ConfirmNewWorkoutModal';
import { Icon } from '../components/common/Icon';
import RoutineSection from '../components/train/RoutineSection';

const TrainPage: React.FC = () => {
  const { routines, startWorkout, activeWorkout, discardActiveWorkout, maximizeWorkout, upsertRoutine } = useContext(AppContext);
  const { t } = useI18n();
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [isConfirmingNewWorkout, setIsConfirmingNewWorkout] = useState(false);
  const [routineToStart, setRoutineToStart] = useState<Routine | null>(null);

  const { latestWorkouts, customTemplates, exampleTemplates } = useMemo(() => {
    const latest = routines
      .filter(r => !r.isTemplate)
      .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));

    const custom = routines.filter(r => r.isTemplate && r.id.startsWith('custom-'));
    const examples = routines.filter(r => r.isTemplate && !r.id.startsWith('custom-'));

    return { latestWorkouts: latest, customTemplates: custom, exampleTemplates: examples };
  }, [routines]);

  const handleRoutineSelect = (routine: Routine) => {
    if (activeWorkout) {
      setRoutineToStart(routine);
      setIsConfirmingNewWorkout(true);
    } else {
      startWorkout(routine);
    }
  };

  const handleStartEmptyWorkout = () => {
    const emptyRoutine: Routine = {
      id: `empty-${Date.now()}`,
      name: 'Empty Workout',
      description: 'An empty workout to build on the fly.',
      exercises: [],
      isTemplate: true, // Treat it like a template so it doesn't pollute "Latest"
    };
    handleRoutineSelect(emptyRoutine);
  };
  
  const handleCreateNewRoutine = () => {
      const newRoutine: Routine = {
          id: `custom-${Date.now()}`,
          originId: `custom-${Date.now()}`,
          name: 'New Custom Routine',
          description: 'A new routine ready to be built.',
          exercises: [],
          isTemplate: true,
      };
      upsertRoutine(newRoutine);
      // Maybe open the builder modal in the future
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleStartEmptyWorkout}
            className="w-full bg-primary/80 hover:bg-primary text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <Icon name="plus" />
            <span>Start Empty Workout</span>
          </button>
          <button
            onClick={handleCreateNewRoutine}
            className="w-full bg-secondary hover:bg-slate-500 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <Icon name="edit" />
            <span>Create New Routine</span>
          </button>
        </div>

        <RoutineSection title="Latest Workouts" routines={latestWorkouts} onRoutineSelect={handleRoutineSelect} />
        <RoutineSection title="My Routines" routines={customTemplates} onRoutineSelect={handleRoutineSelect} />
        <RoutineSection title="Example Templates" routines={exampleTemplates} onRoutineSelect={setSelectedRoutine} />
      </div>

      {selectedRoutine && (
        <RoutinePreviewModal
          isOpen={!!selectedRoutine}
          onClose={() => setSelectedRoutine(null)}
          routine={selectedRoutine}
          onStart={handleRoutineSelect}
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