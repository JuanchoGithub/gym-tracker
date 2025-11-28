
import React, { useContext, useState, useMemo, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useI18n } from '../hooks/useI18n';
import { Routine, SupplementPlanItem } from '../types';
import RoutinePreviewModal from '../components/modals/RoutinePreviewModal';
import ConfirmNewWorkoutModal from '../components/modals/ConfirmNewWorkoutModal';
import { Icon } from '../components/common/Icon';
import RoutineSection from '../components/train/RoutineSection';
import QuickTrainingSection from '../components/train/QuickTrainingSection';
import CheckInCard from '../components/train/CheckInCard';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getWorkoutRecommendation, Recommendation, detectImbalances } from '../utils/recommendationUtils';
import SmartRecommendationCard from '../components/train/SmartRecommendationCard';
import OnboardingWizard from '../components/onboarding/OnboardingWizard';
import ConfirmModal from '../components/modals/ConfirmModal';
import SupplementActionCard from '../components/train/SupplementActionCard';
import { getDateString } from '../utils/timeUtils';
import { getExplanationIdForSupplement } from '../services/explanationService';
import Modal from '../components/common/Modal';

const timeKeywords = {
    morning: /morning|breakfast|am/i,
    lunch: /lunch|noon|midday/i,
    afternoon: /afternoon/i,
    evening: /evening|bed|night|sleep|pm/i,
};

const TrainPage: React.FC = () => {
  const { 
      routines, startWorkout, activeWorkout, discardActiveWorkout, maximizeWorkout, 
      startTemplateEdit, startHiitSession, startTemplateDuplicate,
      checkInState, handleCheckInResponse, history, exercises, upsertRoutine, upsertRoutines,
      currentWeight, logUnlock, supplementPlan, takenSupplements, toggleSupplementIntake, snoozedSupplements, snoozeSupplement,
      profile
  } = useContext(AppContext);
  const { t } = useI18n();
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [isConfirmingNewWorkout, setIsConfirmingNewWorkout] = useState(false);
  const [routineToStart, setRoutineToStart] = useState<Routine | null>(null);
  const [isQuickTrainingOpen, setIsQuickTrainingOpen] = useLocalStorage('isQuickTrainingOpen', true);
  
  // Recommendation State
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [isRecDismissed, setIsRecDismissed] = useState(false);
  const [isUpgradeConfirmOpen, setIsUpgradeConfirmOpen] = useState(false);
  const [onboardingRoutines, setOnboardingRoutines] = useState<Routine[]>([]);
  const [imbalanceSnoozedUntil, setImbalanceSnoozedUntil] = useLocalStorage('imbalanceSnooze', 0);
  
  // Persistent dismissed missed supplements
  const [dismissedHistory, setDismissedHistory] = useLocalStorage<Record<string, string[]>>('dismissedMissedSupplements', {});
  
  const todayStr = getDateString(new Date());
  const dismissedMissedSupplements = useMemo(() => new Set(dismissedHistory[todayStr] || []), [dismissedHistory, todayStr]);

  // Onboarding State
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isCreateOptionModalOpen, setIsCreateOptionModalOpen] = useState(false);
  
  const isNewUser = useMemo(() => {
      const hasHistory = history.length > 0;
      const hasCustomRoutines = routines.some(r => !r.id.startsWith('rt-'));
      return !hasHistory && !hasCustomRoutines;
  }, [history, routines]);

  // Check if workout finished today
  const workoutFinishedToday = useMemo(() => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const lastSession = history.length > 0 ? history[0] : null;
      return lastSession && (
          lastSession.startTime >= todayStart || 
          (lastSession.endTime > 0 && lastSession.endTime >= todayStart)
      );
  }, [history]);

  useEffect(() => {
      if (onboardingRoutines.length > 0) {
          setRecommendation({
            type: 'workout',
            titleKey: 'rec_title_onboarding_complete',
            reasonKey: 'rec_reason_onboarding_complete',
            suggestedBodyParts: [],
            relevantRoutineIds: onboardingRoutines.map(r => r.id),
          });
      } else {
          // Check for imbalances first
          const imbalanceRec = detectImbalances(history, routines, currentWeight, profile.gender);
          const now = Date.now();
          
          if (imbalanceRec && now > imbalanceSnoozedUntil) {
              setRecommendation(imbalanceRec);
          } else {
              const rec = getWorkoutRecommendation(history, routines, exercises, t, currentWeight);
              setRecommendation(rec);
          }
      }
  }, [history, routines, exercises, t, currentWeight, onboardingRoutines, imbalanceSnoozedUntil, profile.gender]);

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

  // Retrieve actual routine objects for the recommendation
  const recommendedRoutines = useMemo(() => {
      if (!recommendation || !recommendation.relevantRoutineIds) return [];
      // If we have specific onboarding routines, use those directly to ensure order or specific instances
      if (onboardingRoutines.length > 0) return onboardingRoutines;
      // Otherwise filter from main list
      return routines.filter(r => recommendation.relevantRoutineIds.includes(r.id));
  }, [recommendation, routines, onboardingRoutines]);
  
  // Supplement "Quick Intake" Logic
  const { pendingSupplements, missedPreWorkouts } = useMemo(() => {
      if (!supplementPlan) return { pendingSupplements: { items: [], timeLabel: '' }, missedPreWorkouts: [] };
      const now = new Date();
      const hour = now.getHours();
      const todayString = getDateString(now);
      const takenToday = takenSupplements[todayString] || [];
      
      let currentTimeBlock = 'daily';
      let timeLabelKey = 'time_evening'; // Default fallback
      
      if (hour >= 4 && hour < 11) { currentTimeBlock = 'morning'; timeLabelKey = 'time_morning'; }
      else if (hour >= 11 && hour < 14) { currentTimeBlock = 'lunch'; timeLabelKey = 'time_lunch'; }
      else if (hour >= 14 && hour < 18) { currentTimeBlock = 'afternoon'; timeLabelKey = 'time_afternoon'; }
      else if (hour >= 18 || hour < 4) { currentTimeBlock = 'evening'; timeLabelKey = 'time_evening'; }

      const pending = supplementPlan.plan.filter(item => {
          // Check if already taken
          if (takenToday.includes(item.id)) return false;
          // Check snooze
          const snoozeTime = snoozedSupplements[item.id];
          if (snoozeTime && snoozeTime > Date.now()) return false;
          
          // Check for Pre-Workout expiry logic: If workout is done today, hide pre-workout suggestions from pending list
          const isPreWorkout = item.time.toLowerCase().includes('pre-workout') || item.time.toLowerCase().includes('pre-entreno') || getExplanationIdForSupplement(item.supplement) === 'caffeine';
          if (workoutFinishedToday && isPreWorkout) return false;

          // Check time match
          if (currentTimeBlock === 'morning' && timeKeywords.morning.test(item.time)) return true;
          if (currentTimeBlock === 'lunch' && timeKeywords.lunch.test(item.time)) return true;
          if (currentTimeBlock === 'evening' && timeKeywords.evening.test(item.time)) return true;
          
          return false;
      });

      // Identify missed pre-workout supplements
      let missed: SupplementPlanItem[] = [];
      if (workoutFinishedToday) {
          missed = supplementPlan.plan.filter(item => {
              const isPreWorkout = item.time.toLowerCase().includes('pre-workout') || item.time.toLowerCase().includes('pre-entreno') || getExplanationIdForSupplement(item.supplement) === 'citrulline';
              const isTaken = takenToday.includes(item.id);
              const isDismissed = dismissedMissedSupplements.has(item.id);
              return isPreWorkout && !isTaken && !isDismissed;
          });
      }
      
      const timeLabel = t(timeLabelKey as any);
      return { pendingSupplements: { items: pending.slice(0, 3), timeLabel }, missedPreWorkouts: missed };
  }, [supplementPlan, takenSupplements, snoozedSupplements, t, workoutFinishedToday, dismissedMissedSupplements]);


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
      isTemplate: true, 
    };
    handleRoutineSelect(emptyRoutine);
  };

  const handleCreateManual = () => {
    setIsCreateOptionModalOpen(false);
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

  const handleCreateWizard = () => {
    setIsCreateOptionModalOpen(false);
    setIsOnboardingOpen(true);
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

  const handleOnboardingComplete = (newRoutines: Routine[]) => {
      upsertRoutines(newRoutines);
      setOnboardingRoutines(newRoutines);
      setIsOnboardingOpen(false);
      setIsRecDismissed(false); // Ensure recommendation card shows up
  };

  const handleUpgradeRoutines = () => {
      if (!recommendation || recommendation.type !== 'promotion' || !recommendation.promotionData) return;
      
      const { fromId, toId, fromName, toName } = recommendation.promotionData;
      const relevantIds = recommendation.relevantRoutineIds;
      
      const routinesToUpdate = routines.filter(r => relevantIds.includes(r.id) && !r.id.startsWith('rt-')); // Only update custom routines
      
      const updatedRoutines = routinesToUpdate.map(r => ({
          ...r,
          exercises: r.exercises.map(ex => ex.exerciseId === fromId ? { ...ex, exerciseId: toId } : ex)
      }));
      
      upsertRoutines(updatedRoutines);
      
      // Log the unlock event
      logUnlock(fromName, toName);

      setIsUpgradeConfirmOpen(false);
      setIsRecDismissed(true); // Hide card after upgrading
  };
  
  const handleDismissRecommendation = () => {
      if (recommendation?.type === 'imbalance') {
          // Snooze imbalance warnings for 7 days
          setImbalanceSnoozedUntil(Date.now() + 7 * 24 * 60 * 60 * 1000);
          
          // After snoozing, try to get a new standard workout recommendation
          const nextRec = getWorkoutRecommendation(history, routines, exercises, t, currentWeight);
          setRecommendation(nextRec);
      } else {
          setIsRecDismissed(true);
      }
  };
  
  const handleTakeSupplement = (id: string) => {
      const todayString = getDateString(new Date());
      toggleSupplementIntake(todayString, id);
  };

  const handleDismissMissedSupplement = (id: string) => {
      setDismissedHistory(prev => {
          const current = prev[todayStr] || [];
          if (current.includes(id)) return prev;
          return { ...prev, [todayStr]: [...current, id] };
      });
  };

  return (
    <div className="space-y-10 pb-8">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">{t('nav_train')}</h1>
      </div>
      
      <div className="space-y-8">
        
        {/* Missed Pre-Workout Check */}
        {missedPreWorkouts.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-2 shadow-lg animate-fadeIn">
                <div className="flex items-center gap-3 mb-3">
                    <Icon name="warning" className="w-6 h-6 text-yellow-500" />
                    <div>
                        <h3 className="font-bold text-yellow-200">{t('supplement_missed_title')}</h3>
                        <p className="text-xs text-yellow-200/70">
                            {t('supplement_missed_message', { supplements: missedPreWorkouts.map(i => i.supplement).join(', ') })}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                     <button 
                        onClick={() => handleTakeSupplement(missedPreWorkouts[0].id)} // Take the first one for now, usually just one
                        className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 text-sm font-bold py-2 rounded-lg transition-colors"
                    >
                        {t('supplement_missed_action_taken')}
                    </button>
                    <button 
                        onClick={() => handleDismissMissedSupplement(missedPreWorkouts[0].id)}
                        className="flex-1 bg-transparent border border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-200/70 text-sm font-bold py-2 rounded-lg transition-colors"
                    >
                        {t('supplement_missed_action_dismiss')}
                    </button>
                </div>
            </div>
        )}

        {/* Quick Supplement Intake Card */}
        {pendingSupplements.items.length > 0 && (
            <SupplementActionCard 
                items={pendingSupplements.items} 
                timeLabel={pendingSupplements.timeLabel}
                onTake={handleTakeSupplement}
                onSnooze={snoozeSupplement}
            />
        )}

        {isNewUser && (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 shadow-lg border border-blue-400/30 relative overflow-hidden mb-6 animate-fadeIn">
                 <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                 <h2 className="text-2xl font-bold text-white mb-2">{t('train_onboarding_card_title')}</h2>
                 <p className="text-blue-100 mb-6 max-w-sm">{t('train_onboarding_card_desc')}</p>
                 <button 
                    onClick={() => setIsOnboardingOpen(true)}
                    className="bg-white text-blue-600 font-bold py-3 px-6 rounded-xl shadow-md hover:bg-blue-50 transition-colors"
                 >
                     {t('train_onboarding_card_button')}
                 </button>
            </div>
        )}

        {!isNewUser && recommendation && !isRecDismissed && (
            <SmartRecommendationCard 
                recommendation={recommendation}
                recommendedRoutines={recommendedRoutines}
                onDismiss={handleDismissRecommendation}
                onRoutineSelect={setSelectedRoutine}
                onViewSmartRoutine={() => {
                    if(recommendation.generatedRoutine) setSelectedRoutine(recommendation.generatedRoutine);
                }}
                onUpgrade={() => setIsUpgradeConfirmOpen(true)}
            />
        )}

        {checkInState.active && (
            <CheckInCard onCheckIn={handleCheckInResponse} />
        )}

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
                <div className="text-sm text-white/90 font-medium opacity-90">{t('train_empty_workout_subtext')}</div>
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
                    onClick={() => setIsCreateOptionModalOpen(true)}
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

      {isOnboardingOpen && (
          <OnboardingWizard 
             onClose={() => setIsOnboardingOpen(false)}
             onComplete={handleOnboardingComplete}
          />
      )}

      {recommendation?.type === 'promotion' && recommendation.promotionData && (
          <ConfirmModal
              isOpen={isUpgradeConfirmOpen}
              onClose={() => setIsUpgradeConfirmOpen(false)}
              onConfirm={handleUpgradeRoutines}
              title="Upgrade Routines?"
              message={`This will replace ${recommendation.promotionData.fromName} with ${recommendation.promotionData.toName} in all your custom templates.`}
              confirmText="Upgrade All"
              confirmButtonClass="bg-amber-600 hover:bg-amber-700"
          />
      )}

      <Modal isOpen={isCreateOptionModalOpen} onClose={() => setIsCreateOptionModalOpen(false)} title={t('create_template_mode_title')}>
        <div className="grid grid-cols-1 gap-3">
            <button onClick={handleCreateWizard} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-xl text-left flex items-center gap-4 hover:brightness-110 transition-all group">
                <div className="bg-white/20 p-3 rounded-lg">
                    <Icon name="sparkles" className="w-6 h-6 text-yellow-300" />
                </div>
                <div>
                    <span className="block font-bold text-lg">{t('create_template_mode_wizard')}</span>
                    <span className="block text-xs opacity-80">{t('create_template_mode_wizard_desc')}</span>
                </div>
            </button>

            <button onClick={handleCreateManual} className="bg-surface border border-white/10 text-text-primary p-4 rounded-xl text-left flex items-center gap-4 hover:bg-white/5 transition-all group">
                <div className="bg-white/5 p-3 rounded-lg">
                    <Icon name="edit" className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <span className="block font-bold text-lg">{t('create_template_mode_manual')}</span>
                    <span className="block text-xs text-text-secondary">{t('create_template_mode_manual_desc')}</span>
                </div>
            </button>
        </div>
      </Modal>
    </div>
  );
};

export default TrainPage;
