import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useI18n } from '../hooks/useI18n';
import { Routine } from '../types';
import RoutinePreviewModal from '../components/modals/RoutinePreviewModal';
import ConfirmNewWorkoutModal from '../components/modals/ConfirmNewWorkoutModal';
import { Icon } from '../components/common/Icon';
import RoutineSection from '../components/train/RoutineSection';

const TrainPage: React.FC = () => {
  const { routines, startWorkout, activeWorkout, discardActiveWorkout, maximizeWorkout, startTemplateEdit } = useContext(AppContext);
  const { t } = useI18n();
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [isConfirmingNewWorkout, setIsConfirmingNewWorkout] = useState(false);
  const [routineToStart, setRoutineToStart] = useState<Routine | null>(null);

  const { latestWorkouts, customTemplates, exampleTemplates } = useMemo(() => {
    const latest = routines
      .filter(r => !r.isTemplate)
      .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));

    const custom = routines.filter(r => r.isTemplate && !r.id.startsWith('rt-'));
    const examples = routines.filter(r => r.isTemplate && r.id.startsWith('rt-'));

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
      name: t('train_empty_workout_name'),
      description: t('train_empty_workout_desc'),
      exercises: [],
      isTemplate: true, // Treat it like a template so it doesn't pollute "Latest"
    };
    handleRoutineSelect(emptyRoutine);
  };
  
  const handleCreateNewTemplate = () => {
      const newTemplate: Routine = {
          id: `custom-${Date.now()}`,
          originId: `custom-${Date.now()}`,
          name: t('train_new_custom_template_name'),
          description: '',
          exercises: [],
          isTemplate: true,
      };
      startTemplateEdit(newTemplate);
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
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-3xl font-bold text-center">{t('nav_train')}</h1>
      
      <div className="space-y-4">
        <button
          onClick={handleStartEmptyWorkout}
          className="w-full bg-primary/80 hover:bg-primary text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <Icon name="plus" />
          <span>{t('train_start_empty')}</span>
        </button>

        <RoutineSection title={t('train_latest_workouts')} routines={latestWorkouts} onRoutineSelect={handleRoutineSelect} />
        <RoutineSection
            title={t('train_my_templates')}
            routines={customTemplates}
            onRoutineSelect={handleRoutineSelect}
            onRoutineEdit={startTemplateEdit}
            headerAction={
                <button
                    onClick={handleCreateNewTemplate}
                    className="bg-secondary hover:bg-slate-500 text-white font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm"
                >
                    <Icon name="plus" className="w-4 h-4" />
                    <span>{t('common_new')}</span>
                </button>
            }
        />
        <RoutineSection title={t('train_example_templates')} routines={exampleTemplates} onRoutineSelect={setSelectedRoutine} />
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