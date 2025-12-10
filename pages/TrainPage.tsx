
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { ActiveWorkoutContext } from '../contexts/ActiveWorkoutContext';
import { StatsContext } from '../contexts/StatsContext';
import { useI18n } from '../hooks/useI18n';
import { Routine, SupplementPlanItem, AutoUpdateEntry } from '../types';
import RoutinePreviewModal from '../components/modals/RoutinePreviewModal';
import ConfirmNewWorkoutModal from '../components/modals/ConfirmNewWorkoutModal';
import { Icon } from '../components/common/Icon';
import RoutineSection from '../components/train/RoutineSection';
import QuickTrainingSection from '../components/train/QuickTrainingSection';
import CheckInCard from '../components/train/CheckInCard';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Recommendation } from '../utils/recommendationUtils';
import SmartRecommendationCard from '../components/train/SmartRecommendationCard';
import OnboardingWizard from '../components/onboarding/OnboardingWizard';
import ConfirmModal from '../components/modals/ConfirmModal';
import SupplementActionCard from '../components/train/SupplementActionCard';
import { getDateString, getEffectiveDate } from '../utils/timeUtils';
import { getExplanationIdForSupplement } from '../services/explanationService';
import Modal from '../components/common/Modal';
import OneRepMaxHub from '../components/onerepmax/OneRepMaxHub';
import CascadeUpdateModal from '../components/onerepmax/CascadeUpdateModal';
import { useMeasureUnit } from '../hooks/useWeight';
import { TranslationKey } from '../contexts/I18nContext';
import { TimerContext } from '../contexts/TimerContext';
import PromotionReviewModal from '../components/modals/PromotionReviewModal';

// Updated Regex to catch both translation keys and plain text words
const timeKeywords = {
    morning: /morning|breakfast|am|mañana|desayuno/i,
    lunch: /lunch|noon|midday|almuerzo/i,
    afternoon: /afternoon|tarde/i,
    evening: /evening|bed|night|sleep|pm|noche|cena|dormir/i,
    pre_workout: /pre-workout|pre-entreno|pre_workout/i, // added pre_workout for key
    post_workout: /post-workout|post-entreno|post_workout/i, // added post_workout for key
};

const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const TrainPage: React.FC = () => {
  const { 
      routines, checkInState, handleCheckInResponse, history, upsertRoutines,
      currentWeight, logUnlock, supplementPlan, takenSupplements, batchTakeSupplements, snoozedSupplements, batchSnoozeSupplements,
      profile, updateProfileInfo, updateOneRepMax, snoozeOneRepMaxUpdate, undoAutoUpdate, dismissAutoUpdate, getExerciseById, startTemplateEdit, startTemplateDuplicate
  } = useContext(AppContext);
  const { activeWorkout, startWorkout, discardActiveWorkout, maximizeWorkout } = useContext(ActiveWorkoutContext);
  const { stats, refreshStats } = useContext(StatsContext);

  const { startHiitSession } = useContext(TimerContext);
  const { t } = useI18n();
  const { displayWeight, weightUnit } = useMeasureUnit();
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [isConfirmingNewWorkout, setIsConfirmingNewWorkout] = useState(false);
  const [routineToStart, setRoutineToStart] = useState<Routine | null>(null);
  const [isQuickTrainingOpen, setIsQuickTrainingOpen] = useLocalStorage('isQuickTrainingOpen', true);
  const [isStrengthHubOpen, setIsStrengthHubOpen] = useState(false);
  
  // Recommendation State
  const [isRecDismissed, setIsRecDismissed] = useState(false);
  const [isPromoDismissed, setIsPromoDismissed] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [onboardingRoutines, setOnboardingRoutines] = useState<Routine[]>([]);
  const [imbalanceSnoozedUntil, setImbalanceSnoozedUntil] = useLocalStorage('imbalanceSnooze', 0);
  
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

  // Use Cached Statistics instead of calculating on every render
  const recommendation = useMemo(() => {
      if (onboardingRoutines.length > 0) {
          return {
            type: 'workout',
            titleKey: 'rec_title_onboarding_complete',
            reasonKey: 'rec_reason_onboarding_complete',
            suggestedBodyParts: [],
            relevantRoutineIds: onboardingRoutines.map(r => r.id),
          } as Recommendation;
      }
      
      const now = Date.now();
      
      // Priority 1: Imbalances
      if (stats.imbalanceRecommendation && now > imbalanceSnoozedUntil) {
          return stats.imbalanceRecommendation;
      } else {
          // Priority 2: Standard Workout Suggestion
          return stats.recommendation;
      }
  }, [stats.recommendation, stats.imbalanceRecommendation, onboardingRoutines, imbalanceSnoozedUntil]);

  const { latestWorkouts, customTemplates, sampleWorkouts, sampleHiit } = useMemo(() => {
    // Generate latest workouts from history (Last 10 distinct sessions)
    const latest = history
      .slice(0, 10)
      .map(session => {
          const originalRoutine = routines.find(r => r.id === session.routineId);
          return {
              id: session.id, // Use session ID to allow unique key and history management
              name: session.routineName,
              description: '', // Date is handled by lastUsed in RoutinePanel
              exercises: session.exercises,
              isTemplate: false,
              lastUsed: session.startTime,
              routineType: originalRoutine?.routineType || 'strength',
              supersets: session.supersets,
              originId: session.routineId 
          } as Routine;
      });

    const templates = routines.filter(r => r.isTemplate);
    const custom = templates.filter(r => !r.id.startsWith('rt-'));
    const samples = templates.filter(r => r.id.startsWith('rt-') && r.routineType !== 'hiit');
    const hiit = templates.filter(r => r.routineType === 'hiit');
    
    return { latestWorkouts: latest, customTemplates: custom, sampleWorkouts: samples, sampleHiit: hiit };
  }, [routines, history]);

  // Retrieve actual routine objects for the recommendation
  const recommendedRoutines = useMemo(() => {
      if (!recommendation || !recommendation.relevantRoutineIds) return [];
      // If we have specific onboarding routines, use those directly to ensure order or specific instances
      if (onboardingRoutines.length > 0) return onboardingRoutines;
      // Otherwise filter from main list
      return routines.filter(r => recommendation.relevantRoutineIds.includes(r.id));
  }, [recommendation, routines, onboardingRoutines]);

  const promotionRoutines = useMemo(() => {
      if (!stats.activePromotion || !stats.activePromotion.promotionData) return [];
      const { fromId } = stats.activePromotion.promotionData;

      // 1. Find all custom routines that contain the exercise
      // Filter out System Routines (rt-) as requested to avoid modifying base templates
      const candidates = routines.filter(r => 
          !r.id.startsWith('rt-') && 
          r.exercises.some(e => e.exerciseId === fromId)
      );

      // 2. Sort by Usage Recency (Latest first)
      // This ensures we target the routines the user is actually using
      candidates.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));

      // 3. Limit to Top 5
      return candidates.slice(0, 5);
  }, [stats.activePromotion, routines]);
  
  // --- Smart Supplement Stack Logic ---
  const { smartStack } = useMemo(() => {
      if (!supplementPlan) return { smartStack: null };
      
      // Use effective date for logic (handle past midnight for night owls)
      const effectiveNow = getEffectiveDate();
      const hour = effectiveNow.getHours();
      const todayString = getDateString(effectiveNow);
      
      // Determine Training Day based on effective date
      const dayName = daysOfWeek[effectiveNow.getDay()];
      const isTrainingDay = supplementPlan.info.trainingDays.includes(dayName);

      const takenToday = takenSupplements[todayString] || [];

      // Helper to check if item is taken
      const isTaken = (id: string) => takenToday.includes(id);
      // Helper to check if item is snoozed
      const isSnoozed = (id: string) => (snoozedSupplements[id] && snoozedSupplements[id] > Date.now());

      const allItems = supplementPlan.plan;

      // 1. Check Post-Workout Context (High Priority)
      const lastSession = history.length > 0 ? history[0] : null;
      const nowTs = Date.now();
      const isPostWorkoutWindow = lastSession && (nowTs - lastSession.endTime) < (2 * 60 * 60 * 1000) && (nowTs - lastSession.endTime) > 0; // 2 hours window

      if (isPostWorkoutWindow) {
          // A. Strictly Post-Workout items (Protein etc)
          const postItems = allItems.filter(i => (timeKeywords.post_workout.test(i.time.toLowerCase())) && !isTaken(i.id) && !isSnoozed(i.id));
          
          // B. Retroactive check: Pre-workout and Intra-workout items that were NOT taken
          const missedWorkoutItems = allItems.filter(i => {
             const tLower = i.time.toLowerCase();
             return (timeKeywords.pre_workout.test(tLower) || tLower.includes('intra') || getExplanationIdForSupplement(i.supplement) === 'citrulline') && !isTaken(i.id) && !isSnoozed(i.id);
          });

          // C. Catch-up Items: Daily/Morning items not yet taken
          // If user is in post-workout window, they might want to take their daily stuff now for convenience
          const isEveningNow = hour >= 19;
          
          const catchUpItems = allItems.filter(i => {
              if (isTaken(i.id) || isSnoozed(i.id)) return false;
              // Prevent duplicates
              if (postItems.includes(i) || missedWorkoutItems.includes(i)) return false;
              // Don't show rest-day specific items since we just worked out
              if (i.restDayOnly) return false;

              const tLower = i.time.toLowerCase();
              
              // Filter out Evening/Bedtime items if it's not evening (don't take ZMA at 10am)
              if (!isEveningNow && (timeKeywords.evening.test(tLower))) return false;

              // Include Daily & Morning (Always valid to catch up)
              if (tLower.includes('daily') || tLower.includes('diario')) return true;
              if (timeKeywords.morning.test(tLower)) return true;
              
              // Include Lunch if it's close to lunch or later
              if (timeKeywords.lunch.test(tLower) && hour >= 11) return true;
              
              // Include Afternoon if it's afternoon or later
              if (timeKeywords.afternoon.test(tLower) && hour >= 14) return true;

              return false;
          });

          const finalStack = [...postItems, ...missedWorkoutItems, ...catchUpItems];

          if (finalStack.length > 0) {
              return {
                  smartStack: {
                      title: t('supplement_stack_post_workout'), 
                      items: finalStack,
                  }
              };
          }
      }

      // 2. Check Time-Based Contexts
      let timeContext = 'daily';
      if (hour >= 4 && hour < 11) timeContext = 'morning';
      else if (hour >= 11 && hour < 14) timeContext = 'lunch';
      else if (hour >= 14 && hour < 20) timeContext = 'afternoon'; 
      else timeContext = 'evening'; // Includes 20:00 - 03:59

      // Helper to check conditions for including item in general stack
      const isValidForNow = (item: SupplementPlanItem) => {
          if (isTaken(item.id) || isSnoozed(item.id)) return false;
          if (item.trainingDayOnly && !isTrainingDay) return false;
          if (item.restDayOnly && isTrainingDay) return false;
          return true;
      };

      // Filter function based on context
      const getContextItems = () => {
          return allItems.filter(item => {
              if (!isValidForNow(item)) return false;
              
              const tLower = item.time.toLowerCase();
              
              if (timeContext === 'morning') {
                  // Only specific Morning items or Pre-workout if training in morning
                  if (timeKeywords.morning.test(tLower)) return true;
                  if (supplementPlan.info.trainingTime === 'morning' && timeKeywords.pre_workout.test(tLower)) return true;
                  return false;
              }
              
              if (timeContext === 'lunch') {
                  return timeKeywords.lunch.test(tLower);
              }
              
              if (timeContext === 'afternoon') {
                  if (timeKeywords.afternoon.test(tLower)) return true;
                  if (supplementPlan.info.trainingTime === 'afternoon' && timeKeywords.pre_workout.test(tLower)) return true;
                  return false;
              }
              
              if (timeContext === 'evening') {
                  if (timeKeywords.evening.test(tLower)) return true;
                  if (supplementPlan.info.trainingTime === 'night' && timeKeywords.pre_workout.test(tLower)) return true;
                  return false;
              }

              return false;
          });
      };

      // Get high priority context specific items
      let potentialItems = getContextItems();

      // Get "Daily" (Any time) items that haven't been taken
      const dailyItems = allItems.filter(item => {
          if (!isValidForNow(item)) return false;
          const tLower = item.time.toLowerCase();
          // Check for "daily", "any time", or items that don't match specific time keywords well
          return tLower.includes('daily') || tLower.includes('diario') || tLower.includes('any time');
      });

      // --- MERGE LOGIC ---
      // If it's a Training Day and we haven't trained yet, defer daily items to the Post-Workout stack
      // Exception: If it's Evening, assume we might have missed the window or it's late, so show them.
      const includeDaily = !isTrainingDay || workoutFinishedToday || timeContext === 'evening';

      if (includeDaily && (potentialItems.length + dailyItems.length <= 3 || timeContext === 'evening')) {
          // Add daily items if not already present (though filter logic should separate them)
          const existingIds = new Set(potentialItems.map(i => i.id));
          dailyItems.forEach(d => {
              if (!existingIds.has(d.id)) {
                  potentialItems.push(d);
              }
          });
      }
      
      // Filter out Pre-workout if workout is ALREADY done today (handled by post-workout check mostly, but as safety)
      if (workoutFinishedToday && timeContext !== 'evening') {
          potentialItems = potentialItems.filter(i => !timeKeywords.pre_workout.test(i.time.toLowerCase()));
      }

      if (potentialItems.length > 0) {
           let title = t('supplement_action_card_title', { time: t(`time_${timeContext}` as any) });
           
           if (timeContext === 'morning') {
               if (supplementPlan.info.trainingTime === 'morning') title = t('supplement_stack_morning_training');
               else title = t('supplement_stack_morning');
           }

           return {
               smartStack: {
                   title: title,
                   items: potentialItems,
               }
           };
      }

      return { smartStack: null };

  }, [supplementPlan, takenSupplements, snoozedSupplements, history, workoutFinishedToday, t]);


  const handleRoutineSelect = (routine: Routine) => {
    if (routine.routineType === 'hiit') {
        startHiitSession(routine);
        setSelectedRoutine(null);
        window.location.hash = '/timers';
        return;
    }

    if (activeWorkout) {
      setRoutineToStart(routine);
      setIsConfirmingNewWorkout(true);
      setSelectedRoutine(null); // Clean up preview modal if switching to confirm modal
    } else {
      startWorkout(routine);
      setSelectedRoutine(null);
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
      refreshStats(); // Force refresh stats to update recommendations
  };

  const handleApplyPromotion = (routineIds: string[]) => {
      if (!stats.activePromotion || !stats.activePromotion.promotionData) return;
      
      const { fromId, toId, fromName, toName } = stats.activePromotion.promotionData;
      
      const routinesToUpdate = routines.filter(r => routineIds.includes(r.id));
      
      const updatedRoutines = routinesToUpdate.map(r => ({
          ...r,
          exercises: r.exercises.map(ex => ex.exerciseId === fromId ? { ...ex, exerciseId: toId } : ex)
      }));
      
      upsertRoutines(updatedRoutines);
      
      // Log the unlock event
      logUnlock(fromName, toName);

      setIsReviewModalOpen(false);
      setIsPromoDismissed(true);
  };
  
  const handleSnoozePromotion = (days: number) => {
      if (!stats.activePromotion?.promotionData) return;
      const { fromId } = stats.activePromotion.promotionData;
      const snoozeUntil = Date.now() + days * 24 * 60 * 60 * 1000;
      
      updateProfileInfo({
          promotionSnoozes: {
              ...profile.promotionSnoozes,
              [fromId]: snoozeUntil
          }
      });
      setIsReviewModalOpen(false);
      setIsPromoDismissed(true);
  };

  const handleDismissRecommendation = () => {
      if (recommendation?.type === 'imbalance') {
          // Snooze imbalance warnings for 7 days
          setImbalanceSnoozedUntil(Date.now() + 7 * 24 * 60 * 60 * 1000);
      } 
      setIsRecDismissed(true);
  };
  
  const handleUpdate1RM = (data: NonNullable<Recommendation['update1RMData']>) => {
      updateOneRepMax(data.exerciseId, data.newMax, 'calculated');
      setCascadeData({ id: data.exerciseId, max: data.newMax });
      setIsCascadeOpen(true);
  };

  const handleSnooze1RM = (data: NonNullable<Recommendation['update1RMData']>) => {
      const twoWeeks = 14 * 24 * 60 * 60 * 1000;
      snoozeOneRepMaxUpdate(data.exerciseId, twoWeeks);
  };
  
  const handleLogStack = (itemIds: string[]) => {
      const effectiveDate = getEffectiveDate();
      const dateString = getDateString(effectiveDate);
      
      // Use batch function to prevent race conditions on state updates
      batchTakeSupplements(dateString, itemIds);
  };
  
  const handleSnoozeStack = () => {
      if (smartStack) {
          const ids = smartStack.items.map(i => i.id);
          batchSnoozeSupplements(ids);
      }
  }
  
  const autoUpdatedEntries = Object.entries(profile.autoUpdated1RMs || {});
  const hasAutoUpdates = autoUpdatedEntries.length > 0;
  
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isCreateOptionModalOpen, setIsCreateOptionModalOpen] = useState(false);
  const [isCascadeOpen, setIsCascadeOpen] = useState(false);
  const [cascadeData, setCascadeData] = useState<{ id: string, max: number } | null>(null);

  return (
    <div className="space-y-10 pb-8">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">{t('nav_train')}</h1>
        <button onClick={() => setIsStrengthHubOpen(true)} className="p-2 bg-surface border border-white/10 rounded-xl text-text-secondary hover:text-white shadow-sm">
            <Icon name="weight" className="w-6 h-6" />
        </button>
      </div>
      
      <div className="space-y-8">
        
        {/* Smart 1RM Update Notification */}
        {hasAutoUpdates && (
            <div className="bg-indigo-600/20 border border-indigo-500/30 p-4 rounded-2xl animate-fadeIn mb-4 shadow-lg">
                 <div className="flex items-start gap-3 mb-3">
                     <div className="bg-indigo-500/20 p-2 rounded-full flex-shrink-0">
                         <Icon name="chart-line" className="w-5 h-5 text-indigo-300" />
                     </div>
                     <div>
                         <h3 className="text-indigo-200 font-bold text-sm">{t('rec_type_strength_update')}</h3>
                         <div className="text-xs text-indigo-200/70 mt-1 space-y-1">
                             {autoUpdatedEntries.map(([id, entry]) => {
                                 const ex = getExerciseById(id);
                                 const updateEntry = entry as AutoUpdateEntry;
                                 return (
                                     <p key={id}>
                                         {ex?.name}: <span className="font-mono">{displayWeight(updateEntry.oldWeight)} → {displayWeight(updateEntry.newWeight)} {t(`workout_${weightUnit}` as TranslationKey)}</span>
                                     </p>
                                 );
                             })}
                         </div>
                     </div>
                 </div>
                 <div className="flex gap-3 pl-10">
                     <button 
                        onClick={() => autoUpdatedEntries.forEach(([id]) => undoAutoUpdate(id))}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-colors"
                    >
                        {t('common_undo')}
                     </button>
                     <button 
                        onClick={() => autoUpdatedEntries.forEach(([id]) => dismissAutoUpdate(id))}
                        className="text-xs font-bold text-indigo-300/70 hover:text-white transition-colors px-2 py-1.5"
                    >
                        {t('common_dismiss')}
                    </button>
                 </div>
            </div>
        )}

        {/* Interactive Smart Stack Card */}
        {smartStack && (
            <SupplementActionCard 
                title={smartStack.title}
                items={smartStack.items}
                onLog={handleLogStack}
                onSnoozeAll={handleSnoozeStack}
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

        {/* Daily Recommendation Card */}
        {!isNewUser && recommendation && !isRecDismissed && (
            <SmartRecommendationCard 
                recommendation={recommendation}
                recommendedRoutines={recommendedRoutines}
                onDismiss={handleDismissRecommendation}
                onRoutineSelect={setSelectedRoutine}
                onViewSmartRoutine={() => {
                    if(recommendation.generatedRoutine) setSelectedRoutine(recommendation.generatedRoutine);
                }}
                onUpdate1RM={handleUpdate1RM}
                onSnooze1RM={handleSnooze1RM}
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
      
      <OneRepMaxHub 
        isOpen={isStrengthHubOpen}
        onClose={() => setIsStrengthHubOpen(false)}
      />

      {isOnboardingOpen && (
          <OnboardingWizard 
             onClose={() => setIsOnboardingOpen(false)}
             onComplete={handleOnboardingComplete}
          />
      )}
      
      {stats.activePromotion && (
          <PromotionReviewModal 
             isOpen={isReviewModalOpen}
             onClose={() => setIsReviewModalOpen(false)}
             promotion={stats.activePromotion}
             routines={promotionRoutines}
             onApply={handleApplyPromotion}
             onSnooze={handleSnoozePromotion}
          />
      )}
      
      {cascadeData && (
          <CascadeUpdateModal 
             isOpen={isCascadeOpen}
             onClose={() => setIsCascadeOpen(false)}
             parentExerciseId={cascadeData.id}
             newParentMax={cascadeData.max}
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
