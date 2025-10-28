import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useI18n } from '../hooks/useI18n';
import { Routine } from '../types';
import RoutinePreviewModal from '../components/modals/RoutinePreviewModal';
import ConfirmNewWorkoutModal from '../components/modals/ConfirmNewWorkoutModal';
import { Icon } from '../components/common/Icon';
import RoutineSection from '../components/train/RoutineSection';

const TrainPage: React.FC = () => {
  const { routines, startWorkout, activeWorkout, discardActiveWorkout, maximizeWorkout, startTemplateEdit, startHiitSession } = useContext(AppContext);
  const { t } = useI18n();
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [isConfirmingNewWorkout, setIsConfirmingNewWorkout] = useState(false);
  const [routineToStart, setRoutineToStart] = useState<Routine | null>(null);

  const { latestWorkouts, customTemplates, sampleWorkouts, sampleHiit } = useMemo(() => {
    const latest = routines
      .filter(r => !r.isTemplate)
      .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));

    const templates = routines.filter(r => r.isTemplate);

    // All custom templates (HIIT and Strength)
    const custom = templates.filter(r => !r.id.startsWith('rt-'));

    // All sample templates
    const sampleTemplates = templates.filter(r => r.id.startsWith('rt-'));

    // Sample strength workouts
    const samples = sampleTemplates.filter(r => r.routineType !== 'hiit');

    // Sample HIIT workouts
    const hiit = sampleTemplates.filter(r => r.routineType === 'hiit');
    
    return { latestWorkouts: latest, customTemplates: custom, sampleWorkouts: samples, sampleHiit: hiit };
  }, [routines]);

  const handleRoutineSelect = (routine: Routine) => {
    if (routine.routineType === 'hiit') {
        startHiitSession(routine);
        return;
    }

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

        <RoutineSection title={t('train_latest_workouts')} routines={latestWorkouts} onRoutineSelect={setSelectedRoutine} />
        <RoutineSection
            title={t('train_my_templates')}
            routines={customTemplates}
            onRoutineSelect={setSelectedRoutine}
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
        <RoutineSection title={t('train_sample_hiit')} routines={sampleHiit} onRoutineSelect={setSelectedRoutine} />
        <RoutineSection title={t('train_sample_workouts')} routines={sampleWorkouts} onRoutineSelect={setSelectedRoutine} />
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