
import React, { useContext, useRef, useEffect, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { ActiveWorkoutContext } from '../contexts/ActiveWorkoutContext';
import { TimerContext } from '../contexts/TimerContext';
import { useI18n } from '../hooks/useI18n';
import { useWakeLock } from '../hooks/useWakeLock';
import { useWorkoutTimer } from '../hooks/useWorkoutTimer';
import { Icon } from '../components/common/Icon';

// New Architecture Imports
import { useWorkoutModals } from '../hooks/active-workout/useWorkoutModals';
import { useWorkoutReordering } from '../hooks/active-workout/useWorkoutReordering';
import { useWorkoutInteractions } from '../hooks/active-workout/useWorkoutInteractions';

import WorkoutSessionHeader from '../components/active-workout/WorkoutSessionHeader';
import WorkoutExerciseList from '../components/active-workout/WorkoutExerciseList';
import WorkoutModalManager from '../components/active-workout/WorkoutModalManager';
import { getAvailablePromotion, getWorkoutRecommendation } from '../utils/recommendationUtils';
import { getSmartStartingWeight, analyzeUserHabits, inferUserProfile } from '../services/analyticsService';
import { calculateMuscleFreshness } from '../utils/fatigueUtils';
import { generateSmartRoutine, RoutineFocus } from '../utils/routineGenerator';
import { generateGapSession } from '../utils/smartCoachUtils';
import { Routine, WorkoutExercise, Exercise, PerformedSet } from '../types';
import { MUSCLES } from '../constants/muscles';

// Muscle constants needed for coach logic
const PUSH_MUSCLES = [MUSCLES.PECTORALS, MUSCLES.FRONT_DELTS, MUSCLES.TRICEPS];
const PULL_MUSCLES = [MUSCLES.LATS, MUSCLES.TRAPS, MUSCLES.BICEPS];
const LEG_MUSCLES = [MUSCLES.QUADS, MUSCLES.HAMSTRINGS, MUSCLES.GLUTES];

const ActiveWorkoutPage: React.FC = () => {
  const { getExerciseById, keepScreenAwake, currentWeight, history, exercises, routines, upsertRoutines, profile, logUnlock, rawExercises } = useContext(AppContext);
  const { 
    activeWorkout, updateActiveWorkout, minimizeWorkout, 
    startAddExercisesToWorkout, collapsedExerciseIds, collapsedSupersetIds
  } = useContext(ActiveWorkoutContext);
  const { activeTimerInfo, activeTimedSet, setActiveTimedSet } = useContext(TimerContext);
  const { t } = useI18n();

  // --- Hooks ---
  const modals = useWorkoutModals();
  const reorder = useWorkoutReordering(activeWorkout);
  const interactions = useWorkoutInteractions();
  
  const elapsedTime = useWorkoutTimer(activeWorkout?.startTime);
  
  // Refs for scrolling
  const headerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Scroll Helper
  const scrollToItem = (id: string) => {
    setTimeout(() => {
        const headerHeight = headerRef.current?.offsetHeight || 0;
        const element = itemRefs.current.get(id);
        const scroller = document.querySelector('main');

        if (element && scroller) {
            const scrollerRect = scroller.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const currentScrollTop = scroller.scrollTop;
            
            const relativeTop = elementRect.top - scrollerRect.top + currentScrollTop;

            scroller.scrollTo({
                top: relativeTop - headerHeight - 10, 
                behavior: 'smooth'
            });
        }
    }, 50);
  };

  // Cached promotions map
  const [availablePromotions, setAvailablePromotions] = useState<Record<string, string>>({});

  useEffect(() => {
      if (activeWorkout) {
          const promoMap: Record<string, string> = {};
          activeWorkout.exercises.forEach(ex => {
               const targetId = getAvailablePromotion(ex.exerciseId, history, profile, currentWeight);
               if (targetId) {
                   promoMap[ex.exerciseId] = targetId;
               }
          });
          setAvailablePromotions(promoMap);
      }
  }, [activeWorkout?.id, activeWorkout?.exercises, history, profile, currentWeight]);

  useEffect(() => {
    const scroller = document.querySelector('main');
    if (scroller) scroller.scrollTo(0, 0);
  }, []);

  const [activeSupersetPlayerId, setActiveSupersetPlayerId] = useState<string | null>(null);
  
  // Logic helpers for Page-level orchestration (Coach, Finish, Upgrade)
  
  const handleFinishWorkout = () => {
      if (activeWorkout) {
          if (activeWorkout.exercises.length === 0) {
              interactions.endWorkout();
              return;
          }
          const errors = interactions.validateWorkout(t);
          if (errors.length > 0) {
              modals.actions.setValidationErrors(errors);
              modals.actions.setIsValidationErrorOpen(true);
              return;
          }
      }
      modals.actions.setIsConfirmingFinish(true);
  };

  const handleStartTimedSet = (exercise: WorkoutExercise, set: PerformedSet) => {
      setActiveTimedSet({ exercise, set });
  };
  
  const handleRequestUpgrade = (originalWorkoutExercise: WorkoutExercise, targetExercise: Exercise) => {
      const smartWeight = getSmartStartingWeight(
          targetExercise.id,
          history,
          profile,
          rawExercises, 
          profile.mainGoal
      );
      modals.actions.setUpgradeCandidate({ workoutExercise: originalWorkoutExercise, targetExercise, suggestedWeight: smartWeight });
  };

  const handleConfirmUpgrade = (startingWeight: number) => {
    if (!activeWorkout || !modals.state.upgradeCandidate) return;
    const { workoutExercise, targetExercise } = modals.state.upgradeCandidate;
    const fromExercise = getExerciseById(workoutExercise.exerciseId);
    if (fromExercise) logUnlock(fromExercise.name, targetExercise.name);

    const newSets: PerformedSet[] = workoutExercise.sets.map(oldSet => ({
        ...oldSet,
        id: `set-${Date.now()}-${Math.random()}`,
        weight: startingWeight, 
        reps: oldSet.reps,
        isComplete: false,
        isWeightInherited: true
    }));

    const updatedWorkoutExercise: WorkoutExercise = {
        ...workoutExercise,
        exerciseId: targetExercise.id,
        sets: newSets,
        previousVersion: {
            exerciseId: workoutExercise.exerciseId,
            sets: workoutExercise.sets,
            note: workoutExercise.note
        }
    };

    interactions.handleUpdateExercise(updatedWorkoutExercise);
    modals.actions.setUpgradeCandidate(null);
  };
  
  const handleRollbackExercise = (workoutExercise: WorkoutExercise) => {
      if (!activeWorkout || !workoutExercise.previousVersion) return;
      const { exerciseId, sets, note } = workoutExercise.previousVersion;
      const restoredExercise: WorkoutExercise = {
          ...workoutExercise,
          exerciseId,
          sets,
          note,
          previousVersion: undefined
      };
      interactions.handleUpdateExercise(restoredExercise);
  };

  // --- COACH LOGIC (Keep here as it uses broad context) ---
  const getFreshestMuscleGroup = () => {
    const freshness = calculateMuscleFreshness(history, exercises, profile.mainGoal);
    const getGroupScore = (muscleNames: string[]) => {
        const groupScores = muscleNames.map(m => freshness[m] !== undefined ? freshness[m] : 100);
        return groupScores.reduce((a, b) => a + b, 0) / groupScores.length;
    };
    const pushScore = getGroupScore(PUSH_MUSCLES);
    const pullScore = getGroupScore(PULL_MUSCLES);
    const legsScore = getGroupScore(LEG_MUSCLES);
    const upperScore = (pushScore + pullScore) / 2;
    const lowerScore = legsScore;

    const groups: { focus: RoutineFocus, score: number, label: string }[] = [
        { focus: 'push', score: pushScore, label: 'Push' },
        { focus: 'pull', score: pullScore, label: 'Pull' },
        { focus: 'legs', score: legsScore, label: 'Legs' },
        { focus: 'upper', score: upperScore, label: 'Upper Body' },
        { focus: 'lower', score: lowerScore, label: 'Lower Body' },
    ];
    groups.sort((a, b) => b.score - a.score);
    return groups[0];
  };

  const handleCoachSuggest = () => {
      const customRoutines = routines.filter(r => !r.id.startsWith('rt-'));
      if (history.length === 0 && customRoutines.length === 0) {
          modals.actions.setIsOnboardingOpen(true);
          return;
      }

      const recommendation = getWorkoutRecommendation(history, routines, exercises, t, currentWeight, profile);
      
      if (!recommendation) {
          handleAggressiveSuggest();
          return;
      }

      let routineToSuggest: Routine | null = null;
      let focusLabel = t('smart_coach_title');
      let params = recommendation.reasonParams || {};
      let reasonText = t(recommendation.reasonKey as any, params);
      const isRestRecommendation = ['rest', 'active_recovery', 'deload'].includes(recommendation.type);

      if (isRestRecommendation) {
           if (recommendation.generatedRoutine) {
               routineToSuggest = recommendation.generatedRoutine;
           } else {
               const inferredProfile = inferUserProfile(history);
               if (profile.mainGoal) inferredProfile.goal = profile.mainGoal;
               const freshness = calculateMuscleFreshness(history, exercises, profile.mainGoal);
               routineToSuggest = generateGapSession([], exercises, history, t, inferredProfile, freshness, currentWeight, profile);
               routineToSuggest.name = t('smart_gap_session');
           }
           focusLabel = t('smart_recovery_mode');
           reasonText += " " + t('active_workout_suggestion_gap_override');
      } 
      else if (recommendation.generatedRoutine) {
          routineToSuggest = recommendation.generatedRoutine;
          focusLabel = routineToSuggest.name;
      } 
      else if (recommendation.relevantRoutineIds && recommendation.relevantRoutineIds.length > 0) {
          const routineId = recommendation.relevantRoutineIds[0];
          routineToSuggest = routines.find(r => r.id === routineId) || null;
          if (routineToSuggest) focusLabel = routineToSuggest.name;
      }

      if (routineToSuggest) {
          modals.actions.setSuggestedRoutine({ 
              routine: routineToSuggest, 
              focus: focusLabel, 
              description: reasonText
          });
      } else {
          handleAggressiveSuggest();
      }
  };

  const handleAggressiveSuggest = () => {
      const customRoutines = routines.filter(r => !r.id.startsWith('rt-'));
      if (history.length === 0 && customRoutines.length === 0) {
          modals.actions.setIsOnboardingOpen(true);
          return;
      }
      const inferredProfile = inferUserProfile(history);
      if (profile.mainGoal) inferredProfile.goal = profile.mainGoal;

      const winner = getFreshestMuscleGroup();
      const habitData = analyzeUserHabits(history);
      const generatedRoutine = generateSmartRoutine(winner.focus, inferredProfile, t, exercises, habitData.exerciseFrequency);
      generatedRoutine.name = `Target: ${winner.label}`;
      
      modals.actions.setSuggestedRoutine({ 
          routine: generatedRoutine, 
          focus: winner.label, 
          description: `Ignoring CNS fatigue. ${winner.label} muscles are ${Math.round(winner.score)}% recovered.`
      });
  };

  const handleAcceptSuggestion = () => {
      if (!activeWorkout || !modals.state.suggestedRoutine) return;
      const newExercises = modals.state.suggestedRoutine.routine.exercises.map(ex => {
          const smartWeight = getSmartStartingWeight(ex.exerciseId, history, profile, exercises, profile.mainGoal);
          return {
              ...ex,
              id: `we-${Date.now()}-${Math.random()}`,
              sets: ex.sets.map(s => ({
                  ...s,
                  id: `set-${Date.now()}-${Math.random()}`,
                  weight: (s.type === 'normal' && s.weight === 0) ? smartWeight : s.weight
              }))
          };
      });
      updateActiveWorkout(prev => prev ? { ...prev, exercises: newExercises, routineName: modals.state.suggestedRoutine!.routine.name } : null);
      modals.actions.setSuggestedRoutine(null);
  };

  const handleOnboardingComplete = (newRoutines: Routine[]) => {
      upsertRoutines(newRoutines);
      modals.actions.setIsOnboardingOpen(false);
      if (newRoutines.length > 0) {
          modals.actions.setSuggestedRoutine({ 
              routine: newRoutines[0], 
              focus: 'Starting Plan',
              isFallback: true,
              description: "Your personalized starting plan."
          });
      }
  };

  // --- Handlers for List Component ---
  const handleUpdateExerciseWrapper = (ex: WorkoutExercise) => interactions.handleUpdateExercise(ex, scrollToItem);
  const handleToggleCollapseWrapper = (id: string) => interactions.handleToggleCollapse(id, scrollToItem);
  const handleToggleSupersetCollapseWrapper = (id: string) => interactions.handleToggleSupersetCollapse(id, scrollToItem);

  // Wake Lock
  useWakeLock(keepScreenAwake || !!activeTimedSet || reorder.isReorganizeMode || (!!activeTimerInfo && !activeTimerInfo.isPaused) || !!activeSupersetPlayerId);

  if (!activeWorkout) return <div>{t('active_workout_no_active')}</div>;

  const availableSupersets = activeWorkout.supersets ? Object.values(activeWorkout.supersets).map(s => ({
      id: s.id,
      name: s.name,
      exercises: activeWorkout.exercises.filter(e => e.supersetId === s.id).map(e => {
           const info = getExerciseById(e.exerciseId);
           return info ? info.name : 'Unknown';
      })
  })) : [];

  return (
    <div className="space-y-4">
      {/* 1. Header */}
      <WorkoutSessionHeader 
          ref={headerRef}
          activeWorkout={activeWorkout}
          elapsedTime={elapsedTime}
          onMinimize={minimizeWorkout}
          onFinish={handleFinishWorkout}
          onOpenDetails={() => modals.actions.setIsDetailsModalOpen(true)}
          isReorganizeMode={reorder.isReorganizeMode}
          onCancelReorganize={() => reorder.handlers.handleExitReorganizeMode(false)}
          onSaveReorganize={() => reorder.handlers.handleExitReorganizeMode(true)}
      />

      {/* 2. Main List */}
      <WorkoutExerciseList 
          exercises={reorder.exercisesToShow}
          supersets={activeWorkout.supersets}
          isReorganizeMode={reorder.isReorganizeMode}
          collapsedExerciseIds={collapsedExerciseIds}
          collapsedSupersetIds={collapsedSupersetIds}
          currentWeight={currentWeight}
          
          onUpdateExercise={handleUpdateExerciseWrapper}
          onUpdateExercises={interactions.handleUpdateExercises}
          onRemoveExercise={interactions.handleRemoveExercise}
          onStartTimedSet={handleStartTimedSet}
          onToggleCollapse={handleToggleCollapseWrapper}
          onToggleSupersetCollapse={handleToggleSupersetCollapseWrapper}
          
          reorderHandlers={reorder.handlers}
          draggedOverIndices={reorder.draggedOverIndices}
          dragInfo={reorder.dragInfo}
          itemRefs={itemRefs}
          
          onCreateSuperset={interactions.handleCreateSuperset}
          onJoinSuperset={interactions.handleJoinSuperset}
          onUngroupSuperset={interactions.handleUngroupSuperset}
          onRenameSuperset={interactions.handleRenameSuperset}
          onAddExerciseToSuperset={startAddExercisesToWorkout}
          onPlaySuperset={(id) => setActiveSupersetPlayerId(id)}
          
          onShowDetails={(id) => {
              const ex = getExerciseById(id);
              if (ex) modals.actions.setViewingExercise(ex);
          }}
          onUpgrade={handleRequestUpgrade}
          onRollback={handleRollbackExercise}
          
          availableSupersets={availableSupersets}
          availablePromotions={availablePromotions}
          
          onCoachSuggest={handleCoachSuggest}
          onAggressiveSuggest={handleAggressiveSuggest}
      />
      
      {/* 3. Global Add Button */}
      <button
        onClick={() => startAddExercisesToWorkout()}
        className="w-full flex items-center justify-center space-x-2 bg-secondary/50 text-text-primary font-medium py-3 rounded-lg hover:bg-secondary transition-colors"
      >
        <Icon name="plus" className="w-5 h-5" />
        <span>{t('active_workout_add_exercise')}</span>
      </button>

      {/* 4. Modals */}
      <WorkoutModalManager 
          modals={modals.state}
          actions={{
              ...modals.actions,
              closeDetails: () => modals.actions.setIsDetailsModalOpen(false),
              closeFinishConfirm: () => modals.actions.setIsConfirmingFinish(false),
              closeValidationError: () => modals.actions.setIsValidationErrorOpen(false),
              closeViewingExercise: () => modals.actions.setViewingExercise(null),
              closeOnboarding: () => modals.actions.setIsOnboardingOpen(false),
              closeWeightInput: () => modals.actions.setIsWeightInputModalOpen(false),
              closeSuggestedRoutine: () => modals.actions.setSuggestedRoutine(null),
              closeUpgradeCandidate: () => modals.actions.setUpgradeCandidate(null),
              
              handleSaveDetails: (details) => {
                  updateActiveWorkout(prev => prev ? { ...prev, ...details } : null);
                  modals.actions.setIsDetailsModalOpen(false);
              },
              handleDiscardWorkout: interactions.discardActiveWorkout,
              confirmFinishWorkout: interactions.endWorkout,
              handleFinishTimedSet: () => {
                  if (!activeTimedSet) return;
                  const { exercise, set } = activeTimedSet;
                  const updatedEx = { ...exercise, sets: exercise.sets.map(s => s.id === set.id ? { ...s, isComplete: true, completedAt: Date.now() } : s) };
                  interactions.handleUpdateExercise(updatedEx);
                  // @ts-ignore
                  setActiveTimedSet(null);
              },
              handleCloseSupersetPlayer: () => setActiveSupersetPlayerId(null),
              handleWeightModalSave: (bw, total) => {
                  // Injected logic to handle the pending update if waiting for weight input
                  const pending = modals.state.pendingExerciseUpdate;
                  if (pending) {
                      const { exercise, setIndex } = pending;
                      const newSets = [...exercise.sets];
                      if(newSets[setIndex]) newSets[setIndex] = { ...newSets[setIndex], weight: total };
                      interactions.handleUpdateExercise({ ...exercise, sets: newSets });
                      modals.actions.setPendingExerciseUpdate(null);
                  }
                  modals.actions.setIsWeightInputModalOpen(false);
              },
              handleAcceptSuggestion,
              handleOnboardingComplete,
              handleConfirmUpgrade,
              
              handleUpdateExercise: interactions.handleUpdateExercise,
              handleUpdateExercises: interactions.handleUpdateExercises,
          }}
          activeSupersetPlayerId={activeSupersetPlayerId}
          activeTimedSet={activeTimedSet}
      />
    </div>
  );
};

export default ActiveWorkoutPage;
