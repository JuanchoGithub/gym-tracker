
import React, { useState, useContext, useMemo, useEffect } from 'react';
import { Exercise, WorkoutExercise, PerformedSet } from '../../types';
import SetRow from './SetRow';
import { Icon } from '../common/Icon';
import { useI18n } from '../../hooks/useI18n';
import ExerciseHeader from './ExerciseHeader';
import { useMeasureUnit } from '../../hooks/useWeight';
import ChangeTimerModal from '../modals/ChangeTimerModal';
import { formatSecondsToMMSS } from '../../utils/timeUtils';
import { AppContext } from '../../contexts/AppContext';
import { TimerContext } from '../../contexts/TimerContext';
import { getExerciseHistory } from '../../utils/workoutUtils';
import { TranslationKey } from '../../contexts/I18nContext';
import { useExerciseName } from '../../hooks/useExerciseName';
import { getSmartWeightSuggestion, WeightSuggestion } from '../../services/analyticsService';
import InsightBanner from './InsightBanner';
import PromotionBanner from './PromotionBanner';

interface ExerciseCardProps {
  workoutExercise: WorkoutExercise;
  exerciseInfo: Exercise;
  onUpdate: (updatedExercise: WorkoutExercise) => void;
  onStartTimedSet?: (exercise: WorkoutExercise, set: PerformedSet) => void;
  
  // Reorder props
  isReorganizeMode?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnter?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isMoveUpDisabled: boolean;
  isMoveDownDisabled: boolean;
  onReorganize: () => void;
  isBeingDraggedOver?: boolean;

  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onRemove?: (exerciseId: string) => void;
  onCreateSuperset?: () => void;
  onJoinSuperset?: (supersetId: string) => void;
  availableSupersets?: { id: string; name: string; exercises: string[] }[];
  onShowDetails?: () => void;
  userBodyWeight?: number;

  // Promotion
  promotionSuggestion?: Exercise;
  onUpgrade?: (targetExercise: Exercise) => void;
  onRollback?: () => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = (props) => {
  const { 
    workoutExercise, exerciseInfo, onUpdate, onStartTimedSet,
    isReorganizeMode, onDragStart, onDragEnter, onDragEnd, onMoveUp, onMoveDown, isMoveUpDisabled, isMoveDownDisabled, onReorganize, isBeingDraggedOver,
    isCollapsed, onToggleCollapse, onRemove, onCreateSuperset, onJoinSuperset, availableSupersets, onShowDetails, userBodyWeight,
    promotionSuggestion, onUpgrade, onRollback
  } = props;
  const { t } = useI18n();
  const { weightUnit, displayWeight } = useMeasureUnit();
  const { history: allHistory, profile, rawExercises, getExerciseById } = useContext(AppContext);
  const { activeTimerInfo } = useContext(TimerContext);
  const getExerciseName = useExerciseName();
  const [completedSets, setCompletedSets] = useState(workoutExercise.sets.filter(s => s.isComplete).length);
  const [isNoteEditing, setIsNoteEditing] = useState(false);
  const [note, setNote] = useState(workoutExercise.note || '');
  const [isDefaultsTimerModalOpen, setIsDefaultsTimerModalOpen] = useState(false);
  
  // Insight State
  const [insight, setInsight] = useState<WeightSuggestion | null>(null);
  const [isInsightDismissed, setIsInsightDismissed] = useState(false);
  const [isPromotionDismissed, setIsPromotionDismissed] = useState(false);

  const lastPerformance = useMemo(() => {
    const history = getExerciseHistory(allHistory, exerciseInfo.id);
    return history.length > 0 ? history[0] : null;
  }, [allHistory, exerciseInfo.id]);
  
  // Calculate Insight on Mount
  useEffect(() => {
     // Only calculate if not bodyweight/timed (mostly for weighted exercises)
     const isTimed = workoutExercise.sets.some(s => s.type === 'timed');
     if (!isTimed && !isInsightDismissed) {
         const suggestion = getSmartWeightSuggestion(exerciseInfo.id, allHistory, profile, rawExercises, profile.mainGoal);
         
         // Only show if there is a suggestion and it differs from current set weight (check first set)
         // And if reason is compelling (not just maintain default 0)
         if (suggestion.weight > 0 && suggestion.reason && suggestion.trend !== 'maintain') {
             const currentFirstSet = workoutExercise.sets.find(s => s.type === 'normal');
             if (currentFirstSet && currentFirstSet.weight !== suggestion.weight && !currentFirstSet.isComplete) {
                  setInsight(suggestion);
             }
         }
     }
  }, [allHistory, exerciseInfo.id, profile, rawExercises]);

  const handleApplyInsight = () => {
      if (!insight) return;
      
      const newSets = workoutExercise.sets.map(set => {
          if (set.type === 'normal' && !set.isComplete) {
              return { ...set, weight: insight.weight, isWeightInherited: true };
          }
          return set;
      });
      
      onUpdate({ ...workoutExercise, sets: newSets });
      setInsight(null); // Dismiss after applying
  };
  
  const isBodyweight = ['Bodyweight', 'Plyometrics'].includes(exerciseInfo.category);
  const isAssisted = exerciseInfo.category === 'Assisted Bodyweight';
  const isWeightOptional = useMemo(() => {
    return ['Reps Only', 'Cardio', 'Duration', 'Bodyweight', 'Assisted Bodyweight', 'Plyometrics'].includes(exerciseInfo.category);
  }, [exerciseInfo.category]);
  
  // Check validity for the header coloring
  const hasInvalidSets = useMemo(() => {
      return workoutExercise.sets.some(set => {
          if (!set.isComplete) return false;
          
          if (set.type === 'timed') {
              return (set.time ?? 0) <= 0 || set.reps <= 0;
          } else {
              // Weight check
              if (!isWeightOptional && set.weight <= 0) return true;
              // Reps check
              if (set.reps <= 0) return true;
          }
          return false;
      });
  }, [workoutExercise.sets, isWeightOptional]);

  const handleUpdateSet = (updatedSet: PerformedSet) => {
    const oldSetIndex = workoutExercise.sets.findIndex(s => s.id === updatedSet.id);
    if (oldSetIndex === -1) return;
    const oldSet = workoutExercise.sets[oldSetIndex];

    let setForStorage = { ...updatedSet };

    // FIX: Ensure timed sets have at least 1 rep (representing "1 round")
    if (setForStorage.type === 'timed' && setForStorage.reps <= 0) {
        setForStorage.reps = 1;
    }

    // LOGIC: Handle Bodyweight / Assisted Calculations
    const bw = oldSet.storedBodyWeight || userBodyWeight || 0;
    
    if (updatedSet.type !== 'timed' && bw > 0) {
         if (isBodyweight && updatedSet.weight >= 0) {
             setForStorage.weight = bw + updatedSet.weight;
             setForStorage.storedBodyWeight = bw;
         } else if (isAssisted && updatedSet.weight >= 0) {
             setForStorage.weight = Math.max(0, bw - updatedSet.weight);
             setForStorage.storedBodyWeight = bw;
         }
    }

    let newSets = [...workoutExercise.sets];
    
    let setAfterValueReset = { ...setForStorage };
    let needsWeightCascade = false;
    let needsRepsCascade = false;

    // Handle weight reset signal
    if (updatedSet.weight < 0) {
        const sourceSet = oldSetIndex > 0 ? newSets[oldSetIndex - 1] : null;
        const fallbackWeight = oldSet.historicalWeight ?? 0;
        const newWeight = sourceSet && sourceSet.type !== 'timed' ? sourceSet.weight : fallbackWeight;
        setAfterValueReset = { ...setAfterValueReset, weight: newWeight, isWeightInherited: true };
        needsWeightCascade = true;
    } else {
        needsWeightCascade = setForStorage.type !== 'timed' && oldSet.weight !== setForStorage.weight && setForStorage.isWeightInherited === false && !setForStorage.isComplete;
    }

    // Handle reps reset signal
    if (updatedSet.reps < 0) {
        const sourceSet = oldSetIndex > 0 ? newSets[oldSetIndex - 1] : null;
        const fallbackReps = oldSet.historicalReps ?? 0;
        const newReps = sourceSet ? sourceSet.reps : fallbackReps;
        setAfterValueReset = { ...setAfterValueReset, reps: newReps, isRepsInherited: true };
        needsRepsCascade = true;
    } else {
        needsRepsCascade = oldSet.reps !== updatedSet.reps && updatedSet.isRepsInherited === false && !updatedSet.isComplete;
    }
    
    newSets[oldSetIndex] = setAfterValueReset;

    // Cascade changes
    const finalUpdatedSet = newSets[oldSetIndex];
    if (needsWeightCascade) {
        for (let i = oldSetIndex + 1; i < newSets.length; i++) {
            const currentSet = newSets[i];
            if (currentSet.isComplete || currentSet.isWeightInherited === false || currentSet.type === 'timed') break;
            if (currentSet.type === finalUpdatedSet.type) {
                newSets[i] = { ...currentSet, weight: finalUpdatedSet.weight, isWeightInherited: true };
            }
        }
    }
    
    if (needsRepsCascade) {
        for (let i = oldSetIndex + 1; i < newSets.length; i++) {
            const currentSet = newSets[i];
            if (currentSet.isComplete || currentSet.isRepsInherited === false) break;
            if (currentSet.type === finalUpdatedSet.type) {
                newSets[i] = { ...currentSet, reps: finalUpdatedSet.reps, isRepsInherited: true };
            }
        }
    }
    
    const manualTimeChange = updatedSet.type === 'timed' && oldSet.time !== updatedSet.time && updatedSet.isTimeInherited === false && !updatedSet.isComplete;
    if (manualTimeChange) {
        for (let i = oldSetIndex + 1; i < newSets.length; i++) {
            const currentSet = newSets[i];
            if (currentSet.isComplete || currentSet.isTimeInherited === false || currentSet.type !== 'timed') break;
            newSets[i] = { ...currentSet, time: updatedSet.time, isTimeInherited: true };
        }
    }
    
    if (!oldSet.isComplete && updatedSet.isComplete) {
      setCompletedSets(prev => prev + 1);
    } else if (oldSet.isComplete && !updatedSet.isComplete) {
      setCompletedSets(prev => prev - 1);
    }
    
    onUpdate({ ...workoutExercise, sets: newSets });
  };
  
  const handleDeleteSet = (setId: string) => {
    const deletedIndex = workoutExercise.sets.findIndex(s => s.id === setId);
    if (deletedIndex === -1) return;

    let newSets = workoutExercise.sets.filter(s => s.id !== setId);

    // Start fixing inheritance from the point of deletion onwards
    for (let i = deletedIndex; i < newSets.length; i++) {
        const currentSet = newSets[i];
        if (currentSet.isComplete) continue;

        const sourceSet = i > 0 ? newSets[i - 1] : null;
        
        const newInheritedSet: PerformedSet = {
            ...currentSet,
            isWeightInherited: true,
            isRepsInherited: true,
            isTimeInherited: true,
        };

        if (sourceSet) {
            newInheritedSet.reps = sourceSet.reps;
            if (currentSet.type === 'timed') {
                newInheritedSet.time = sourceSet.type === 'timed' ? sourceSet.time : currentSet.historicalTime;
            } else {
                newInheritedSet.weight = sourceSet.type !== 'timed' ? sourceSet.weight : currentSet.historicalWeight;
            }
        } else { 
            newInheritedSet.reps = currentSet.historicalReps ?? currentSet.reps;
            if (currentSet.type === 'timed') {
                newInheritedSet.time = currentSet.historicalTime ?? currentSet.time;
            } else {
                newInheritedSet.weight = currentSet.historicalWeight ?? currentSet.weight;
            }
        }
        newSets[i] = newInheritedSet;
    }
    onUpdate({ ...workoutExercise, sets: newSets });
  };

  const handleAddSet = () => {
    const lastSet = workoutExercise.sets[workoutExercise.sets.length - 1] || { reps: 8, weight: 0 };
    const newSet: PerformedSet = {
      id: `set-${Date.now()}-${Math.random()}`,
      reps: lastSet.reps,
      weight: lastSet.weight,
      type: 'normal',
      isComplete: false,
      isRepsInherited: true,
      isWeightInherited: true,
      storedBodyWeight: userBodyWeight,
    };
    const updatedSets = [...workoutExercise.sets, newSet];
    onUpdate({ ...workoutExercise, sets: updatedSets });
  };
  
  const handleSaveNote = () => {
    onUpdate({ ...workoutExercise, note });
    setIsNoteEditing(false);
  };
  
  const handleSaveDefaultsTimer = (newTimers: { normal: number; warmup: number; drop: number; timed: number; effort: number; failure: number; }) => {
    onUpdate({ ...workoutExercise, restTime: newTimers });
  };

  const allSetsCompleted = completedSets === workoutExercise.sets.length && workoutExercise.sets.length > 0;
  
  // Logic for card styling based on state
  let borderClass = 'border-white/5';
  let shadowClass = 'shadow-black/20';

  if (isCollapsed && hasInvalidSets) {
      borderClass = 'border-red-500/50';
      shadowClass = 'shadow-red-500/10';
  } else if (allSetsCompleted) {
      borderClass = 'border-success/30';
      shadowClass = 'shadow-success/5';
  }

  // Header background override for collapsed invalid
  const headerBgClass = (isCollapsed && hasInvalidSets) ? 'bg-red-500/10' : 'bg-surface';
  
  let normalSetCounter = 0;

  if (isReorganizeMode) {
    return (
      <div 
        className="bg-surface border border-white/5 rounded-2xl shadow-sm p-5 relative flex items-center gap-4 cursor-grab active:cursor-grabbing hover:bg-surface-highlight/50 transition-colors"
        draggable
        onDragStart={onDragStart}
        onDragEnter={onDragEnter}
        onDragEnd={onDragEnd}
        onDragOver={(e) => e.preventDefault()}
        >
          {isBeingDraggedOver && <div className="absolute -top-1 left-0 w-full h-1 bg-primary rounded-full animate-pulse"></div>}
          <Icon name="sort" className="w-6 h-6 text-text-secondary flex-shrink-0" />
          <span className="font-bold text-lg text-text-primary truncate flex-grow">{getExerciseName(exerciseInfo)}</span>
      </div>
    );
  }

  const bodyWeightLabel = (isBodyweight || isAssisted) && userBodyWeight ? `+ Body (${displayWeight(userBodyWeight)}${t(('workout_' + weightUnit) as TranslationKey)})` : '';
  const previousExerciseName = workoutExercise.previousVersion ? getExerciseName(getExerciseById(workoutExercise.previousVersion.exerciseId)) : '';

  return (
    <div 
      className={`bg-surface rounded-2xl shadow-md transition-all duration-300 border ${borderClass} ${shadowClass}`}
      onDragOver={(e) => isReorganizeMode && e.preventDefault()}
    >
        <div className={`sticky top-12 z-10 px-4 py-1.5 border-b border-white/5 transition-all duration-200 ${headerBgClass} ${isCollapsed ? 'rounded-2xl' : 'rounded-t-2xl'}`}>
             <ExerciseHeader 
                workoutExercise={workoutExercise}
                exerciseInfo={exerciseInfo}
                onUpdate={onUpdate}
                onAddNote={() => { 
                    setIsNoteEditing(true); 
                    setNote(workoutExercise.note ? t(workoutExercise.note as any) : ''); 
                }}
                onOpenTimerModal={() => setIsDefaultsTimerModalOpen(true)}
                onToggleCollapse={onToggleCollapse}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                isMoveUpDisabled={isMoveUpDisabled}
                isMoveDownDisabled={isMoveDownDisabled}
                onReorganize={onReorganize}
                onRemove={onRemove ? () => onRemove(workoutExercise.id) : undefined}
                onCreateSuperset={onCreateSuperset}
                onJoinSuperset={onJoinSuperset}
                availableSupersets={availableSupersets}
                onShowDetails={onShowDetails}
            />
        </div>
        
        {/* Promotion Banner */}
        {!isCollapsed && promotionSuggestion && !isPromotionDismissed && onUpgrade && (
            <PromotionBanner 
                targetExercise={promotionSuggestion}
                onUpgrade={() => onUpgrade(promotionSuggestion)}
                onDismiss={() => setIsPromotionDismissed(true)}
            />
        )}
        
        {/* Undo Rollback Banner */}
        {!isCollapsed && workoutExercise.previousVersion && onRollback && (
            <div className="mx-3 sm:mx-4 mt-3 rounded-lg border border-slate-500/20 bg-gradient-to-r from-slate-500/10 to-gray-500/10 p-3 flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-3 min-w-0 flex-grow">
                    <div className="p-1.5 rounded-full bg-slate-500/20 text-slate-400 flex-shrink-0">
                         <Icon name="history" className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-200 truncate">
                             {t('workout_rollback_banner', { oldName: previousExerciseName })}
                        </div>
                    </div>
                </div>
                <button 
                    onClick={onRollback}
                    className="bg-slate-500/20 hover:bg-slate-500/30 text-slate-300 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors border border-slate-500/30"
                >
                     {t('workout_rollback_action')}
                </button>
            </div>
        )}
        
        {/* Active Insight Banner */}
        {!isCollapsed && insight && (
             <InsightBanner 
                 suggestion={insight} 
                 onApply={handleApplyInsight} 
                 onDismiss={() => { setInsight(null); setIsInsightDismissed(true); }} 
             />
        )}

        {!isCollapsed && (
          <div className="p-3 sm:p-4 space-y-2 bg-gradient-to-b from-surface to-background/50 rounded-b-2xl">
              {isNoteEditing && (
                  <div className="mb-4 bg-surface-highlight/30 p-3 rounded-xl border border-white/5">
                      <textarea 
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Add a note for this exercise..."
                          className="w-full bg-background border border-white/10 rounded-lg p-3 text-sm text-text-primary placeholder-text-secondary focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                          rows={2}
                      />
                      <div className="flex justify-end space-x-3 mt-2">
                          <button onClick={() => setIsNoteEditing(false)} className="text-text-secondary text-sm px-3 py-1.5 hover:bg-white/5 rounded-md transition-colors">Cancel</button>
                          <button onClick={handleSaveNote} className="bg-primary text-white px-4 py-1.5 rounded-md text-sm font-medium shadow-md hover:bg-primary-content transition-colors">Save</button>
                      </div>
                  </div>
              )}
              {!isNoteEditing && workoutExercise.note && (
                  <div className="text-sm text-text-secondary/90 italic my-2 p-3 bg-yellow-500/5 border-l-2 border-yellow-500/30 rounded-r-md">
                    "{t(workoutExercise.note as any)}"
                  </div>
              )}

              <div className="grid grid-cols-5 items-center gap-2 text-[10px] sm:text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 px-2">
                  <div className="text-center">{t('workout_set')}</div>
                  <div className="text-center">{t('workout_previous')}</div>
                  <div className="text-center truncate" title={bodyWeightLabel}>
                      {isBodyweight && userBodyWeight ? 'Extra' : (isAssisted ? 'Assist' : t('workout_weight'))} 
                      <span className="text-[9px] text-text-secondary/50 lowercase ml-1">
                          ({t(`workout_${weightUnit}` as TranslationKey)})
                      </span>
                      {bodyWeightLabel && <span className="block text-[9px] text-primary/70 normal-case">{bodyWeightLabel}</span>}
                  </div>
                  <div className="text-center">{t('workout_reps')}</div>
                  <div className="text-center"></div>
              </div>
              
              <div className="space-y-2.5">
                  {workoutExercise.sets.map((set, setIndex) => {
                    if (set.type === 'normal') {
                      normalSetCounter++;
                    }
                    const isActiveTimer = activeTimerInfo?.exerciseId === workoutExercise.id && activeTimerInfo?.setId === set.id;
                    const showFinishedTimer = set.isComplete && !isActiveTimer;
                    const previousSetData = lastPerformance?.exerciseData.sets[setIndex];
                    
                    // UI Transformation for Display
                    let displaySet = { ...set };
                    
                    // Use storedBodyWeight for consistent historical data if available, otherwise fall back to current userBodyWeight
                    const referenceBodyWeight = set.storedBodyWeight ?? userBodyWeight;
                    
                    if (set.type !== 'timed' && referenceBodyWeight && referenceBodyWeight > 0 && set.weight > 0) {
                         if (isBodyweight) {
                             // Display Extra Weight (Total - Body)
                             displaySet.weight = Math.max(0, set.weight - referenceBodyWeight);
                         } else if (isAssisted) {
                             // Display Assistance Weight (Body - Total)
                             displaySet.weight = Math.max(0, referenceBodyWeight - set.weight);
                         }
                    } else if (isBodyweight && set.weight === 0) {
                        // Implicit 0 extra.
                        displaySet.weight = 0;
                    }
                    
                    // Determine if this specific set is invalid
                    let isValid = true;
                    if (set.isComplete) {
                        if (set.type === 'timed') {
                            if ((set.time ?? 0) <= 0 || set.reps <= 0) isValid = false;
                        } else {
                            if (!isWeightOptional && set.weight <= 0) isValid = false;
                            if (set.reps <= 0) isValid = false;
                        }
                    }

                    return (
                      <React.Fragment key={set.id}>
                          <SetRow
                              set={displaySet}
                              setNumber={normalSetCounter}
                              onUpdateSet={handleUpdateSet}
                              onDeleteSet={() => handleDeleteSet(set.id)}
                              onStartTimedSet={(s) => onStartTimedSet?.(workoutExercise, s)}
                              previousSetData={previousSetData}
                              isWeightOptional={isWeightOptional}
                              isValid={isValid}
                          />
                          {showFinishedTimer && set.actualRest !== undefined && (
                            <div className="w-full animate-fadeIn">
                              <div className="flex items-center justify-center text-xs text-success font-medium">
                                  <div className="flex-grow h-px bg-success/10"></div>
                                  <span className="mx-3 bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
                                    {formatSecondsToMMSS(set.actualRest)} rest
                                  </span>
                                  <div className="flex-grow h-px bg-success/10"></div>
                              </div>
                            </div>
                          )}
                      </React.Fragment>
                    );
                  })}
              </div>
              
              <button 
                  onClick={handleAddSet}
                  className="mt-4 w-full flex items-center justify-center space-x-2 bg-surface-highlight/30 hover:bg-surface-highlight/50 text-primary/80 hover:text-primary font-semibold py-3 rounded-xl border border-dashed border-primary/20 hover:border-primary/40 transition-all active:scale-[0.99]"
              >
                  <Icon name="plus" className="w-5 h-5" />
                  <span>{t('workout_add_set')}</span>
              </button>
          </div>
        )}
        <ChangeTimerModal 
            isOpen={isDefaultsTimerModalOpen}
            onClose={() => setIsDefaultsTimerModalOpen(false)}
            currentRestTimes={workoutExercise.restTime}
            onSave={handleSaveDefaultsTimer}
        />
    </div>
  );
};

export default ExerciseCard;
