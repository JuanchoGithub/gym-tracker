
import React, { useState, useContext, useMemo } from 'react';
import { WorkoutExercise, Exercise, PerformedSet } from '../../types';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';
import SetRow from './SetRow';
import ExerciseHeader from './ExerciseHeader';
import { useMeasureUnit } from '../../hooks/useWeight';
import { getExerciseHistory } from '../../utils/workoutUtils';

interface SupersetViewProps {
  exercises: WorkoutExercise[];
  isReorganizeMode: boolean;
  onUpdateExercise: (updatedExercise: WorkoutExercise) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onMoveExercise: (fromIndex: number, toIndex: number) => void; // Global indices
  onStartTimedSet: (ex: WorkoutExercise, set: PerformedSet) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: () => void;
  draggedOverIndex: number | null;
  dragItemIndex: number | null;
  indices: number[]; // Global indices for the exercises in this group
  onShowDetails?: (exerciseId: string) => void;
}

const SupersetView: React.FC<SupersetViewProps> = ({
  exercises,
  isReorganizeMode,
  onUpdateExercise,
  onRemoveExercise,
  onMoveExercise,
  onStartTimedSet,
  onDragStart,
  onDragEnter,
  onDragEnd,
  draggedOverIndex,
  dragItemIndex,
  indices,
  onShowDetails
}) => {
  const { getExerciseById, history: allHistory } = useContext(AppContext);
  const { t } = useI18n();
  const [expandedHeaderId, setExpandedHeaderId] = useState<string | null>(null);

  // Helper to update a specific set within a workout exercise, handling cascading values
  const handleUpdateSet = (workoutExercise: WorkoutExercise, updatedSet: PerformedSet) => {
    const oldSetIndex = workoutExercise.sets.findIndex(s => s.id === updatedSet.id);
    const oldSet = workoutExercise.sets[oldSetIndex];
    let newSets = [...workoutExercise.sets];
    
    let setAfterValueReset = { ...updatedSet };
    let needsWeightCascade = false;
    let needsRepsCascade = false;

    // Handle value reset signals
    if (updatedSet.weight < 0) {
        const sourceSet = oldSetIndex > 0 ? newSets[oldSetIndex - 1] : null;
        const fallbackWeight = oldSet.historicalWeight ?? 0;
        const newWeight = sourceSet && sourceSet.type !== 'timed' ? sourceSet.weight : fallbackWeight;
        setAfterValueReset = { ...setAfterValueReset, weight: newWeight, isWeightInherited: true };
        needsWeightCascade = true;
    } else {
        needsWeightCascade = updatedSet.type !== 'timed' && oldSet.weight !== updatedSet.weight && updatedSet.isWeightInherited === false && !updatedSet.isComplete;
    }

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
    const finalUpdatedSet = newSets[oldSetIndex];

    // Cascade logic
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

    onUpdateExercise({ ...workoutExercise, sets: newSets });
  };

  const handleDeleteSet = (workoutExercise: WorkoutExercise, setId: string) => {
     // Same logic as ExerciseCard but simplified call
    const deletedIndex = workoutExercise.sets.findIndex(s => s.id === setId);
    if (deletedIndex === -1) return;

    let newSets = workoutExercise.sets.filter(s => s.id !== setId);
    // Inheritance fix logic
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
            if (currentSet.type === 'timed') newInheritedSet.time = sourceSet.type === 'timed' ? sourceSet.time : currentSet.historicalTime;
            else newInheritedSet.weight = sourceSet.type !== 'timed' ? sourceSet.weight : currentSet.historicalWeight;
        } else {
            newInheritedSet.reps = currentSet.historicalReps ?? currentSet.reps;
            if (currentSet.type === 'timed') newInheritedSet.time = currentSet.historicalTime ?? currentSet.time;
            else newInheritedSet.weight = currentSet.historicalWeight ?? currentSet.weight;
        }
        newSets[i] = newInheritedSet;
    }
    onUpdateExercise({ ...workoutExercise, sets: newSets });
  };

  const handleAddRound = () => {
    exercises.forEach(ex => {
        const lastSet = ex.sets[ex.sets.length - 1] || { reps: 8, weight: 0 };
        const newSet: PerformedSet = {
            id: `set-${Date.now()}-${Math.random()}`,
            reps: lastSet.reps,
            weight: lastSet.weight,
            type: 'normal',
            isComplete: false,
            isRepsInherited: true,
            isWeightInherited: true,
        };
        onUpdateExercise({ ...ex, sets: [...ex.sets, newSet] });
    });
  };

  // Determine max sets to render rows
  const maxSets = Math.max(...exercises.map(ex => ex.sets.length), 0);

  // In reorganize mode, just show the headers as draggable items
  if (isReorganizeMode) {
      return (
          <div className="space-y-2">
              {exercises.map((ex, i) => {
                  const globalIndex = indices[i];
                  const exerciseInfo = getExerciseById(ex.exerciseId);
                  if (!exerciseInfo) return null;
                  
                  const isBeingDraggedOver = draggedOverIndex === globalIndex && dragItemIndex !== globalIndex;

                  return (
                    <div 
                        key={ex.id}
                        className="bg-surface border border-white/5 rounded-lg p-4 relative flex items-center gap-4 cursor-grab active:cursor-grabbing hover:bg-surface-highlight/50 transition-colors"
                        draggable
                        onDragStart={(e) => onDragStart(e, globalIndex)}
                        onDragEnter={(e) => onDragEnter(e, globalIndex)}
                        onDragEnd={onDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        {isBeingDraggedOver && <div className="absolute -top-1 left-0 w-full h-1 bg-primary rounded-full animate-pulse"></div>}
                        <Icon name="sort" className="w-6 h-6 text-text-secondary flex-shrink-0" />
                        <span className="font-bold text-lg text-text-primary truncate flex-grow">{exerciseInfo.name}</span>
                    </div>
                  );
              })}
          </div>
      );
  }

  return (
    <div className="bg-surface/30 rounded-b-2xl">
        {/* Exercises Headers List */}
        <div className="divide-y divide-white/5 border-b border-white/10">
            {exercises.map((ex, i) => {
                const exerciseInfo = getExerciseById(ex.exerciseId);
                if (!exerciseInfo) return null;
                const isExpanded = expandedHeaderId === ex.id;
                const globalIndex = indices[i];

                return (
                    <div key={ex.id} className="bg-surface first:rounded-t-none last:rounded-b-none">
                        <div className="px-4 py-2">
                             <ExerciseHeader 
                                workoutExercise={ex}
                                exerciseInfo={exerciseInfo}
                                onUpdate={onUpdateExercise}
                                onAddNote={() => {
                                     // Force update to add note field if missing, logic handled inside Header usually but we need UI
                                     if(!ex.note) onUpdateExercise({...ex, note: ' '}); 
                                     setExpandedHeaderId(ex.id); 
                                }}
                                onOpenTimerModal={() => { /* Modal logic handled in Header */ }}
                                onToggleCollapse={() => setExpandedHeaderId(isExpanded ? null : ex.id)}
                                onMoveUp={() => onMoveExercise(globalIndex, globalIndex - 1)}
                                onMoveDown={() => onMoveExercise(globalIndex, globalIndex + 1)}
                                isMoveUpDisabled={globalIndex === 0} // Should check against total workout
                                isMoveDownDisabled={false} // Simplification
                                onReorganize={() => { /* Handled by parent */ }}
                                onRemove={() => onRemoveExercise(ex.id)}
                                onShowDetails={() => onShowDetails?.(ex.exerciseId)}
                            />
                        </div>
                        
                        {isExpanded && (
                            <div className="px-4 pb-4 animate-fadeIn">
                                {ex.note !== undefined && (
                                    <div className="mb-2">
                                        <textarea 
                                            value={ex.note}
                                            onChange={(e) => onUpdateExercise({...ex, note: e.target.value})}
                                            placeholder="Add a note..."
                                            className="w-full bg-background border border-white/10 rounded-lg p-2 text-sm text-text-primary placeholder-text-secondary focus:border-primary outline-none"
                                            rows={2}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* Interleaved Sets */}
        <div className="p-2 sm:p-3 space-y-6">
             {Array.from({ length: maxSets }).map((_, setIndex) => (
                 <div key={setIndex} className="bg-black/20 rounded-xl p-3 border border-white/5">
                     <div className="flex items-center justify-center mb-2">
                        <div className="h-px bg-white/10 flex-grow"></div>
                        <span className="text-xs font-bold text-text-secondary uppercase px-3 tracking-widest">Round {setIndex + 1}</span>
                        <div className="h-px bg-white/10 flex-grow"></div>
                     </div>
                     
                     <div className="space-y-2">
                        {exercises.map(ex => {
                            const set = ex.sets[setIndex];
                            const exerciseInfo = getExerciseById(ex.exerciseId);
                            
                            if (!set || !exerciseInfo) return null;
                            
                            // Determine set number for this specific exercise type
                            const normalSetCount = ex.sets.slice(0, setIndex + 1).filter(s => s.type === 'normal').length;
                            const prevSetData = (() => {
                                const hist = getExerciseHistory(allHistory, ex.exerciseId);
                                return hist.length > 0 ? hist[0].exerciseData.sets[setIndex] : undefined;
                            })();
                            
                            const isWeightOptional = ['Bodyweight', 'Assisted Bodyweight', 'Reps Only', 'Cardio', 'Duration'].includes(exerciseInfo.category);

                            return (
                                <div key={set.id} className="relative pl-3">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/30 rounded-full"></div>
                                    <div className="flex justify-between items-center mb-1 pl-1">
                                        <span className="text-xs font-bold text-indigo-200 truncate">{exerciseInfo.name}</span>
                                        {ex.note && setIndex === 0 && <Icon name="clipboard-list" className="w-3 h-3 text-yellow-500" />}
                                    </div>
                                    <SetRow
                                        set={set}
                                        setNumber={normalSetCount}
                                        onUpdateSet={(updatedSet) => handleUpdateSet(ex, updatedSet)}
                                        onDeleteSet={() => handleDeleteSet(ex, set.id)}
                                        onStartTimedSet={(s) => onStartTimedSet(ex, s)}
                                        previousSetData={prevSetData}
                                        isWeightOptional={isWeightOptional}
                                    />
                                </div>
                            );
                        })}
                     </div>
                 </div>
             ))}
        </div>
        
        <div className="p-3">
             <button 
                  onClick={handleAddRound}
                  className="w-full flex items-center justify-center space-x-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-semibold py-3 rounded-xl border border-dashed border-indigo-500/30 transition-all active:scale-[0.99]"
              >
                  <Icon name="plus" className="w-5 h-5" />
                  <span>Add Round</span>
              </button>
        </div>
    </div>
  );
};

export default SupersetView;
