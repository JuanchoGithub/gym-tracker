import React, { useState, useContext, useMemo } from 'react';
import { Exercise, WorkoutExercise, PerformedSet, SetType } from '../../types';
import SetRow from './SetRow';
import Timer from './Timer';
import { Icon } from '../common/Icon';
import { useI18n } from '../../hooks/useI18n';
import ExerciseHeader from './ExerciseHeader';
import { useWeight } from '../../hooks/useWeight';
import ChangeTimerModal from '../modals/ChangeTimerModal';
import { formatSecondsToMMSS } from '../../utils/timeUtils';
import { AppContext } from '../../contexts/AppContext';
import { getExerciseHistory } from '../../utils/workoutUtils';

interface ExerciseCardProps {
  workoutExercise: WorkoutExercise;
  exerciseInfo: Exercise;
  onUpdate: (updatedExercise: WorkoutExercise) => void;
  activeTimerInfo?: { exerciseId: string; setId: string; startTime: number } | null;
  onTimerFinish?: (finishedExerciseId: string, finishedSetId: string) => void;
  onTimerChange?: (newDuration: number, exerciseName: string) => void;
  onStartTimedSet?: (exercise: WorkoutExercise, set: PerformedSet) => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ workoutExercise, exerciseInfo, onUpdate, activeTimerInfo, onTimerFinish, onTimerChange, onStartTimedSet }) => {
  const { t } = useI18n();
  const { unit } = useWeight();
  const { history: allHistory } = useContext(AppContext);
  const [completedSets, setCompletedSets] = useState(workoutExercise.sets.filter(s => s.isComplete).length);
  const [isNoteEditing, setIsNoteEditing] = useState(false);
  const [note, setNote] = useState(workoutExercise.note || '');
  const [isDefaultsTimerModalOpen, setIsDefaultsTimerModalOpen] = useState(false);

  const lastPerformance = useMemo(() => {
    const history = getExerciseHistory(allHistory, exerciseInfo.id);
    return history.length > 0 ? history[0] : null;
  }, [allHistory, exerciseInfo.id]);
  
  const isWeightOptional = useMemo(() => {
    return ['Bodyweight', 'Assisted Bodyweight', 'Reps Only', 'Cardio', 'Duration'].includes(exerciseInfo.category);
  }, [exerciseInfo.category]);

  const getTimerDuration = (set?: PerformedSet): number => {
    if (!set) return workoutExercise.restTime.normal; // Fallback for safety
    if (set.rest !== undefined && set.rest !== null) return set.rest;

    switch (set.type) {
        case 'warmup': return workoutExercise.restTime.warmup;
        case 'drop': return workoutExercise.restTime.drop;
        case 'timed': return workoutExercise.restTime.timed || 10;
        case 'normal':
        case 'failure':
        default: return workoutExercise.restTime.normal;
    }
  };
  
  const handleUpdateSet = (updatedSet: PerformedSet) => {
    const oldSetIndex = workoutExercise.sets.findIndex(s => s.id === updatedSet.id);
    if (oldSetIndex === -1) return;
    const oldSet = workoutExercise.sets[oldSetIndex];

    let newSets = [...workoutExercise.sets];
    
    let setAfterValueReset = { ...updatedSet };
    let needsWeightCascade = false;
    let needsRepsCascade = false;

    // Handle weight reset signal (when input is cleared)
    if (updatedSet.weight < 0) {
        const sourceSet = oldSetIndex > 0 ? newSets[oldSetIndex - 1] : null;
        const fallbackWeight = oldSet.historicalWeight ?? 0;
        const newWeight = sourceSet && sourceSet.type !== 'timed' ? sourceSet.weight : fallbackWeight;
        setAfterValueReset = { ...setAfterValueReset, weight: newWeight, isWeightInherited: true };
        needsWeightCascade = true;
    } else {
        needsWeightCascade = updatedSet.type !== 'timed' && oldSet.weight !== updatedSet.weight && updatedSet.isWeightInherited === false && !updatedSet.isComplete;
    }

    // Handle reps reset signal (when input is cleared)
    if (updatedSet.reps < 0) {
        const sourceSet = oldSetIndex > 0 ? newSets[oldSetIndex - 1] : null;
        const fallbackReps = oldSet.historicalReps ?? 0;
        const newReps = sourceSet ? sourceSet.reps : fallbackReps;
        setAfterValueReset = { ...setAfterValueReset, reps: newReps, isRepsInherited: true };
        needsRepsCascade = true;
    } else {
        needsRepsCascade = oldSet.reps !== updatedSet.reps && updatedSet.isRepsInherited === false && !updatedSet.isComplete;
    }
    
    // Apply the updated (and possibly reset) set to the array
    newSets[oldSetIndex] = setAfterValueReset;

    // Now, cascade changes
    const finalUpdatedSet = newSets[oldSetIndex];
    if (needsWeightCascade) {
        for (let i = oldSetIndex + 1; i < newSets.length; i++) {
            const currentSet = newSets[i];
            if (currentSet.isComplete || currentSet.isWeightInherited === false || currentSet.type === 'timed') break;
            newSets[i] = { ...currentSet, weight: finalUpdatedSet.weight, isWeightInherited: true };
        }
    }
    
    if (needsRepsCascade) {
        for (let i = oldSetIndex + 1; i < newSets.length; i++) {
            const currentSet = newSets[i];
            if (currentSet.isComplete || currentSet.isRepsInherited === false) break;
            newSets[i] = { ...currentSet, reps: finalUpdatedSet.reps, isRepsInherited: true };
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
        if (currentSet.isComplete) continue; // Don't change completed sets

        // The source for inheritance is the set right before the current one in the updated list.
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
                // A timed set inherits time from a previous timed set, otherwise it reverts to its own historical value.
                newInheritedSet.time = sourceSet.type === 'timed' ? sourceSet.time : currentSet.historicalTime;
            } else {
                // A weight set inherits weight from a previous weight set, otherwise it reverts to its own historical value.
                newInheritedSet.weight = sourceSet.type !== 'timed' ? sourceSet.weight : currentSet.historicalWeight;
            }
        } else { // This is now the first incomplete set, so it must revert to its own historical values.
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
      id: `set-${Date.now()}`,
      reps: lastSet.reps,
      weight: lastSet.weight,
      type: 'normal',
      isComplete: false,
      isRepsInherited: true,
      isWeightInherited: true,
    };
    const updatedSets = [...workoutExercise.sets, newSet];
    onUpdate({ ...workoutExercise, sets: updatedSets });
  };
  
  const handleSaveNote = () => {
    onUpdate({ ...workoutExercise, note });
    setIsNoteEditing(false);
  };
  
  const handleSaveDefaultsTimer = (newTimers: { normal: number; warmup: number; drop: number; timed: number; }) => {
    onUpdate({ ...workoutExercise, restTime: newTimers });
  };

  const allSetsCompleted = completedSets === workoutExercise.sets.length && workoutExercise.sets.length > 0;
  
  let normalSetCounter = 0;

  return (
    <div className={`bg-surface sm:rounded-lg shadow-md transition-all ${allSetsCompleted ? 'border-2 border-success' : 'border-2 border-transparent'}`}>
        <div className="sticky top-[56px] bg-surface z-10 p-3 border-b border-secondary/20 sm:rounded-t-lg">
             <ExerciseHeader 
                workoutExercise={workoutExercise}
                exerciseInfo={exerciseInfo}
                onUpdate={onUpdate}
                onAddNote={() => { setIsNoteEditing(true); setNote(workoutExercise.note || ''); }}
                onOpenTimerModal={() => setIsDefaultsTimerModalOpen(true)}
            />
        </div>
        <div className="p-2 sm:p-3 space-y-2">
            {isNoteEditing && (
                <div className="mb-2">
                    <textarea 
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a note for this exercise..."
                        className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 text-sm"
                        rows={2}
                    />
                    <div className="flex justify-end space-x-2 mt-1">
                        <button onClick={() => setIsNoteEditing(false)} className="text-text-secondary text-sm px-3 py-1 hover:bg-secondary/50 rounded-md">Cancel</button>
                        <button onClick={handleSaveNote} className="bg-primary text-white px-3 py-1 rounded-md text-sm">Save</button>
                    </div>
                </div>
            )}
            {!isNoteEditing && workoutExercise.note && (
                <p className="text-sm text-text-secondary italic my-2 p-2 bg-slate-900/50 rounded-md">"{workoutExercise.note}"</p>
            )}

            <div className="grid grid-cols-5 items-center gap-1 sm:gap-2 text-xs text-text-secondary">
                <div className="text-center font-semibold">{t('workout_set')}</div>
                <div className="text-center">Previous</div>
                <div className="text-center">Weight ({t(`workout_${unit}`)})</div>
                <div className="text-center">Reps</div>
                <div className="text-center">Actions</div>
            </div>
            
            <div className="space-y-2">
                {workoutExercise.sets.map((set, setIndex) => {
                  if (set.type === 'normal') {
                    normalSetCounter++;
                  }
                  const isActiveTimer = activeTimerInfo?.exerciseId === workoutExercise.id && activeTimerInfo?.setId === set.id;
                  const showFinishedTimer = set.isComplete && !isActiveTimer;
                  const previousSetData = lastPerformance?.exerciseData.sets[setIndex];
                  
                  return (
                    <React.Fragment key={set.id}>
                        <SetRow
                            set={set}
                            setNumber={normalSetCounter}
                            onUpdateSet={handleUpdateSet}
                            onDeleteSet={() => handleDeleteSet(set.id)}
                            onStartTimedSet={(s) => onStartTimedSet?.(workoutExercise, s)}
                            previousSetData={previousSetData}
                            isWeightOptional={isWeightOptional}
                        />
                        {isActiveTimer && onTimerFinish && onTimerChange && (
                          <div className="w-full rounded-lg">
                            <Timer 
                                duration={getTimerDuration(set)} 
                                onFinish={() => onTimerFinish(workoutExercise.id, set.id)} 
                                onTimeChange={(newTime) => onTimerChange(newTime, exerciseInfo.name)}
                            />
                          </div>
                        )}
                        {showFinishedTimer && set.actualRest !== undefined && (
                          <div className="w-full">
                            <div className="my-2 flex items-center justify-center text-sm text-success">
                                <div className="flex-grow h-px bg-success/30"></div>
                                <span className="mx-4 font-mono">
                                  {formatSecondsToMMSS(set.actualRest)}
                                </span>
                                <div className="flex-grow h-px bg-success/30"></div>
                            </div>
                          </div>
                        )}
                    </React.Fragment>
                  );
                })}
            </div>
            
            <button 
                onClick={handleAddSet}
                className="mt-3 w-full flex items-center justify-center space-x-2 bg-secondary/50 text-text-primary font-medium py-2 rounded-lg hover:bg-secondary transition-colors"
            >
                <Icon name="plus" className="w-5 h-5" />
                <span>Add Set</span>
            </button>
        </div>
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
