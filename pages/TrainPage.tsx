
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useI18n } from '../hooks/useI18n';
import { Routine } from '../types';
import RoutinePreviewModal from '../components/modals/RoutinePreviewModal';
import ConfirmNewWorkoutModal from '../components/modals/ConfirmNewWorkoutModal';
import { Icon } from '../components/common/Icon';
import RoutineSection from '../components/train/RoutineSection';
import QuickTrainingSection from '../components/train/QuickTrainingSection';
import { useLocalStorage } from '../hooks/useLocalStorage';

const TrainPage: React.FC = () => {
  const { routines, startWorkout, activeWorkout, discardActiveWorkout, maximizeWorkout, startTemplateEdit, startHiitSession, startTemplateDuplicate } = useContext(AppContext);
  const { t } = useI18n();
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [isConfirmingNewWorkout, setIsConfirmingNewWorkout] = useState(false);
  const [routineToStart, setRoutineToStart] = useState<Routine | null>(null);
  const [isQuickTrainingOpen, setIsQuickTrainingOpen] = useLocalStorage('isQuickTrainingOpen', true);

  const { latestWorkouts, customTemplates, sampleWorkouts, sampleHiit } = useMemo(() => {
    const latest = routines
      .filter(r => !r.isTemplate)
      .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
      .slice(0, 7);

    const templates = routines.filter(r => r.isTemplate);
    const custom = templates.filter(r => !r.id.startsWith('rt-'));
    const samples = templates.filter(r => r.id.startsWith('rt-') && r.routineType !== 'hiit');
    const hiit = templates.filter(r => r.routineType === 'hiit');
    
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
          routineType: 'strength',
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
    <div className="space-y-10 pb-8">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">{t('nav_train')}</h1>
      </div>
      
      <div className="space-y-8">
        <button
          onClick={handleStartEmptyWorkout}
          className="w-full bg-gradient-to-br from-primary via-primary to-sky-600 text-white font-bold py-6 px-6 rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-between group hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-white/10"
        >
          <div className="flex items-center space-x-5">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Icon name="plus" className="w-8 h-8" />
            </div>
            <div className="text-left">
                <div className="text-xl font-bold">{t('train_start_empty')}</div>
                <div className="text-sm text-white/90 font-medium opacity-90">No exercises, just log as you go</div>
            </div>
          </div>
          <Icon name="arrow-right" className="w-6 h-6 opacity-80 group-hover:translate-x-1 transition-transform" />
        </button>

        <RoutineSection title={t('train_latest_workouts')} routines={latestWorkouts} onRoutineSelect={setSelectedRoutine} />
        
        <RoutineSection
            title={t('train_my_templates')}
            routines={customTemplates}
            onRoutineSelect={setSelectedRoutine}
            onRoutineEdit={startTemplateEdit}
            onRoutineDuplicate={startTemplateDuplicate}
            headerAction={
                <button
                    onClick={handleCreateNewTemplate}
                    className="text-primary bg-primary/10 hover:bg-primary/20 px-4 py-1.5 rounded-full transition-colors flex items-center space-x-1.5 text-sm font-semibold"
                >
                    <Icon name="plus" className="w-4 h-4" />
                    <span>{t('common_create')}</span>
                </button>
            }
        />
        
        <QuickTrainingSection 
            isOpen={isQuickTrainingOpen} 
            onToggle={() => setIsQuickTrainingOpen(prev => !prev)} 
        />
        
        <RoutineSection 
            title={t('train_sample_hiit')} 
            routines={sampleHiit} 
            onRoutineSelect={setSelectedRoutine} 
            onRoutineDuplicate={startTemplateDuplicate} 
        />
        
        <RoutineSection title={t('train_sample_workouts')} routines={sampleWorkouts} onRoutineSelect={setSelectedRoutine} onRoutineDuplicate={startTemplateDuplicate} />
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