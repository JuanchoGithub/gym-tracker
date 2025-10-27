
import React, { useState } from 'react';
import { Exercise, WorkoutExercise, PerformedSet, SetType } from '../../types';
import SetRow from './SetRow';
import Timer from './Timer';
import { Icon } from '../common/Icon';
import { useI18n } from '../../hooks/useI18n';
import ExerciseHeader from './ExerciseHeader';
import { useWeight } from '../../hooks/useWeight';

interface ExerciseCardProps {
  workoutExercise: WorkoutExercise;
  exerciseInfo: Exercise;
  onUpdate: (updatedExercise: WorkoutExercise) => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ workoutExercise, exerciseInfo, onUpdate }) => {
  const { t } = useI18n();
  const { unit } = useWeight();
  const [activeTimerSetId, setActiveTimerSetId] = useState<string | null>(null);
  const [finishedTimers, setFinishedTimers] = useState<Record<string, number>>({});
  const [completedSets, setCompletedSets] = useState(workoutExercise.sets.filter(s => s.isComplete).length);
  const [lastManualWeightChangeIndex, setLastManualWeightChangeIndex] = useState<number | null>(null);
  const [isNoteEditing, setIsNoteEditing] = useState(false);
  const [note, setNote] = useState(workoutExercise.note || '');

  const handleUpdateSet = (updatedSet: PerformedSet) => {
    const oldSet = workoutExercise.sets.find(s => s.id === updatedSet.id);
    const setIndex = workoutExercise.sets.findIndex(s => s.id === updatedSet.id);

    let updatedSets;

    if (oldSet && oldSet.weight !== updatedSet.weight && setIndex !== -1) {
      setLastManualWeightChangeIndex(setIndex);
      updatedSets = workoutExercise.sets.map((s, i) => {
        if (i < setIndex) return s;
        if (i === setIndex) return updatedSet;
        return { ...s, weight: updatedSet.weight };
      });
    } else {
      updatedSets = workoutExercise.sets.map(s => (s.id === updatedSet.id ? updatedSet : s));
    }
    
    if (oldSet && !oldSet.isComplete && updatedSet.isComplete) {
      setActiveTimerSetId(updatedSet.id);
      setCompletedSets(prev => prev + 1);
    } else if (oldSet && oldSet.isComplete && !updatedSet.isComplete) {
        if(activeTimerSetId === oldSet.id) setActiveTimerSetId(null);
        setFinishedTimers(prev => {
            const newTimers = { ...prev };
            if (newTimers[oldSet.id]) delete newTimers[oldSet.id];
            return newTimers;
        });
        setCompletedSets(prev => prev - 1);
    }
    
    onUpdate({ ...workoutExercise, sets: updatedSets });
  };
  
  const handleDeleteSet = (setId: string) => {
    const updatedSets = workoutExercise.sets.filter(s => s.id !== setId);
    onUpdate({ ...workoutExercise, sets: updatedSets });
  };

  const handleAddSet = () => {
    const lastSet = workoutExercise.sets[workoutExercise.sets.length - 1] || { reps: 8, weight: 0 };
    const newSet: PerformedSet = {
      id: `set-${Date.now()}`,
      reps: lastSet.reps,
      weight: lastSet.weight,
      type: 'normal',
      isComplete: false,
    };
    const updatedSets = [...workoutExercise.sets, newSet];
    onUpdate({ ...workoutExercise, sets: updatedSets });
  };

  const getTimerDuration = (setType: SetType | undefined): number => {
    const defaultDuration = 90;
    if (!setType || !workoutExercise.restTime || typeof workoutExercise.restTime !== 'object') {
        // Fallback for older data structure
        return typeof workoutExercise.restTime === 'number' ? workoutExercise.restTime : defaultDuration;
    }
    switch (setType) {
        case 'warmup': return workoutExercise.restTime.warmup;
        case 'drop': return workoutExercise.restTime.drop;
        case 'normal':
        case 'failure':
        default: return workoutExercise.restTime.normal;
    }
  };
  
  const handleTimerFinish = (finishedSetId: string) => {
    if (activeTimerSetId === finishedSetId) {
      const set = workoutExercise.sets.find(s => s.id === finishedSetId);
      const duration = getTimerDuration(set?.type);
      setFinishedTimers(prev => ({ ...prev, [finishedSetId]: duration }));
      setActiveTimerSetId(null);
    }
  };
  
  const handleSaveNote = () => {
    onUpdate({ ...workoutExercise, note });
    setIsNoteEditing(false);
  };

  const allSetsCompleted = completedSets === workoutExercise.sets.length && workoutExercise.sets.length > 0;

  const activeSetForTimer = activeTimerSetId ? workoutExercise.sets.find(s => s.id === activeTimerSetId) : undefined;
  const timerDuration = getTimerDuration(activeSetForTimer?.type);

  return (
    <div className={`bg-surface rounded-lg shadow-md transition-all ${allSetsCompleted ? 'border-2 border-success' : 'border-2 border-transparent'}`}>
        <div className="sticky top-[56px] bg-surface z-10 p-4 border-b border-secondary/20 rounded-t-lg">
             <ExerciseHeader 
                workoutExercise={workoutExercise}
                exerciseInfo={exerciseInfo}
                onUpdate={onUpdate}
                onAddNote={() => { setIsNoteEditing(true); setNote(workoutExercise.note || ''); }}
            />
        </div>
        <div className="p-4 space-y-2">
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

            <div className="grid grid-cols-5 items-center gap-2 text-xs text-text-secondary">
                <div className="text-center font-semibold">{t('workout_set')}</div>
                <div className="text-center">Previous</div>
                {/* FIX: Used a template literal to construct a valid translation key for the weight unit. */}
                <div className="text-center">Weight ({t(`workout_${unit}`)})</div>
                <div className="text-center">Reps</div>
                <div className="text-center">Actions</div>
            </div>
            
            <div className="space-y-2">
                {workoutExercise.sets.map((set, index) => (
                <React.Fragment key={set.id}>
                    <SetRow
                    set={set}
                    setIndex={index}
                    onUpdateSet={handleUpdateSet}
                    onDeleteSet={() => handleDeleteSet(set.id)}
                    />
                    {activeTimerSetId === set.id && (
                    <Timer 
                        duration={timerDuration} 
                        onFinish={() => handleTimerFinish(set.id)} 
                    />
                    )}
                    {finishedTimers[set.id] && (
                    <div className="my-2 flex items-center justify-center text-sm text-success">
                        <div className="flex-grow h-px bg-success/30"></div>
                        <span className="mx-4 font-mono">
                        {String(Math.floor(finishedTimers[set.id] / 60)).padStart(2, '0')}:
                        {String(finishedTimers[set.id] % 60).padStart(2, '0')}
                        </span>
                        <div className="flex-grow h-px bg-success/30"></div>
                    </div>
                    )}
                </React.Fragment>
                ))}
            </div>
            
            <button 
                onClick={handleAddSet}
                className="mt-3 w-full flex items-center justify-center space-x-2 bg-secondary/50 text-text-primary font-medium py-2 rounded-lg hover:bg-secondary transition-colors"
            >
                <Icon name="plus" className="w-5 h-5" />
                <span>Add Set</span>
            </button>
        </div>
    </div>
  );
};

export default ExerciseCard;
