import React, { useState } from 'react';
import { Exercise, WorkoutExercise, PerformedSet, SetType } from '../../types';
import { Icon } from '../common/Icon';
import TemplateSetRow from './TemplateSetRow';
import ChangeTimerModal from '../modals/ChangeTimerModal';
import EditSetTimerModal from '../modals/EditSetTimerModal';
import { useI18n } from '../../hooks/useI18n';

interface TemplateExerciseCardProps {
  workoutExercise: WorkoutExercise;
  exerciseInfo: Exercise;
  onUpdate: (updatedExercise: WorkoutExercise) => void;
  onRemove: (exerciseId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  isBeingDraggedOver: boolean;
  isMoveUpDisabled: boolean;
  isMoveDownDisabled: boolean;
}

const TemplateExerciseCard: React.FC<TemplateExerciseCardProps> = (props) => {
  const {
    workoutExercise, exerciseInfo, onUpdate, onRemove, onMoveUp, onMoveDown,
    onDragStart, onDragEnter, onDragEnd, isBeingDraggedOver, isMoveUpDisabled, isMoveDownDisabled
  } = props;
  const { t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNoteEditing, setIsNoteEditing] = useState(false);
  const [isDefaultsTimerModalOpen, setIsDefaultsTimerModalOpen] = useState(false);
  const [editingSetTimer, setEditingSetTimer] = useState<PerformedSet | null>(null);
  const [note, setNote] = useState(workoutExercise.note || '');
  const [isCollapsed, setIsCollapsed] = useState(false);
  let normalSetCounter = 0;
  
  const handleUpdateSet = (updatedSet: PerformedSet) => {
    const oldSetIndex = workoutExercise.sets.findIndex(s => s.id === updatedSet.id);
    const oldSet = workoutExercise.sets[oldSetIndex];
    let newSets = [...workoutExercise.sets];
    newSets[oldSetIndex] = updatedSet;

    // Cascade weight change if applicable.
    if (oldSet.weight !== updatedSet.weight && updatedSet.isWeightInherited === false) {
        for (let i = oldSetIndex + 1; i < newSets.length; i++) {
            if (newSets[i].isWeightInherited !== false) {
                newSets[i] = { ...newSets[i], weight: updatedSet.weight, isWeightInherited: true };
            } else {
                break;
            }
        }
    }
    
    // Cascade rep change if applicable.
    if (oldSet.reps !== updatedSet.reps && updatedSet.isRepsInherited === false) {
        for (let i = oldSetIndex + 1; i < newSets.length; i++) {
            if (newSets[i].reps === 0 || newSets[i].isRepsInherited !== false) {
                newSets[i] = { ...newSets[i], reps: updatedSet.reps, isRepsInherited: true };
            } else {
                break;
            }
        }
    }
    
    // Cascade time change if applicable (for timed sets).
    if (updatedSet.type === 'timed' && oldSet.time !== updatedSet.time && updatedSet.isTimeInherited === false) {
        for (let i = oldSetIndex + 1; i < newSets.length; i++) {
            if (newSets[i].type === 'timed' && newSets[i].isTimeInherited !== false) {
                newSets[i] = { ...newSets[i], time: updatedSet.time, isTimeInherited: true };
            } else {
                break;
            }
        }
    }

    onUpdate({ ...workoutExercise, sets: newSets });
  };
  
  const handleDeleteSet = (setId: string) => {
    const updatedSets = workoutExercise.sets.filter(s => s.id !== setId);
    onUpdate({ ...workoutExercise, sets: updatedSets });
  };

  const handleAddSet = () => {
    const lastSet = workoutExercise.sets[workoutExercise.sets.length - 1] || { reps: 10, weight: 0, time: 60, type: 'normal' };
    const newSet: PerformedSet = {
        ...lastSet,
        id: `set-${Date.now()}-${Math.random()}`,
        isRepsInherited: true,
        isWeightInherited: true,
        isTimeInherited: true,
        rest: undefined, // Don't inherit custom rest timers
    };
    onUpdate({ ...workoutExercise, sets: [...workoutExercise.sets, newSet] });
  };

  const handleSaveNote = () => {
    onUpdate({ ...workoutExercise, note });
    setIsNoteEditing(false);
  };
  
  // FIX: Corrected the type of `newTimers` to include `effort` and `failure` properties, aligning it with the expected type for `restTime` in `WorkoutExercise` and resolving a TypeScript error.
  const handleSaveDefaultsTimer = (newTimers: { normal: number; warmup: number; drop: number; timed: number; effort: number; failure: number; }) => {
    // When defaults change, remove overrides that match the *new* default for that set type
    const updatedSets = workoutExercise.sets.map(set => {
        const newDefault = newTimers[set.type as keyof typeof newTimers] ?? newTimers.normal;
        if (set.rest === newDefault) {
            const { rest, ...setWithoutRest } = set;
            return setWithoutRest;
        }
        return set;
    });

    onUpdate({ ...workoutExercise, restTime: newTimers, sets: updatedSets });
  };

  const handleSaveSetTimer = (newTime: number | null) => {
    if (!editingSetTimer) return;
    const updatedSet = { ...editingSetTimer };

    if (newTime === null) {
      delete updatedSet.rest;
    } else {
      updatedSet.rest = newTime;
    }

    const updatedSets = workoutExercise.sets.map(s => s.id === updatedSet.id ? updatedSet : s);
    onUpdate({ ...workoutExercise, sets: updatedSets });
    setEditingSetTimer(null);
  }
  
  const getDefaultTimerForSet = (set: PerformedSet) => {
    switch (set.type) {
      case 'warmup': return workoutExercise.restTime.warmup;
      case 'drop': return workoutExercise.restTime.drop;
      case 'timed': return workoutExercise.restTime.timed;
      default: return workoutExercise.restTime.normal;
    }
  }

  return (
    <>
    <div 
        className={`bg-surface rounded-lg shadow-md border border-secondary/20 relative ${isCollapsed ? 'cursor-grab' : ''}`}
        draggable={isCollapsed}
        onDragStart={onDragStart}
        onDragEnter={onDragEnter}
        onDragEnd={onDragEnd}
        onDragOver={(e) => e.preventDefault()}
    >
      {isBeingDraggedOver && <div className="absolute -top-1 left-0 w-full h-1 bg-primary rounded-full"></div>}
      <div className="p-4 border-b border-secondary/20 flex justify-between items-center">
        <button onClick={() => setIsCollapsed(p => !p)} className="flex-grow text-left truncate pr-2 flex items-center gap-3">
          {isCollapsed && <Icon name="sort" className="w-6 h-6 text-text-secondary flex-shrink-0" />}
          <h3 className="font-bold text-lg text-primary truncate">{exerciseInfo.name}</h3>
        </button>
        <div className="relative">
          <button onClick={() => setIsMenuOpen(p => !p)} className="p-2 text-text-secondary hover:text-primary">
            <Icon name="ellipsis" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-700 rounded-md shadow-lg z-10" onMouseLeave={() => setIsMenuOpen(false)}>
              <button onClick={() => { setIsNoteEditing(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600">{t('template_card_add_edit_note')}</button>
              <button onClick={() => { setIsDefaultsTimerModalOpen(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600">{t('template_card_edit_timers')}</button>
              <button onClick={() => { onMoveUp(); setIsMenuOpen(false); }} disabled={isMoveUpDisabled} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">{t('template_card_move_up')}</button>
              <button onClick={() => { onMoveDown(); setIsMenuOpen(false); }} disabled={isMoveDownDisabled} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">{t('template_card_move_down')}</button>
              <div className="h-px bg-secondary/50 my-1"></div>
              <button onClick={() => onRemove(workoutExercise.id)} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-600">{t('template_card_remove_exercise')}</button>
            </div>
          )}
        </div>
      </div>
      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {isNoteEditing && (
            <div className="mb-2">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('template_editor_description_placeholder')} className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 text-sm" rows={2} />
              <div className="flex justify-end space-x-2 mt-1">
                <button onClick={() => setIsNoteEditing(false)} className="text-text-secondary text-sm px-3 py-1 hover:bg-secondary/50 rounded-md">{t('common_cancel')}</button>
                <button onClick={handleSaveNote} className="bg-primary text-white px-3 py-1 rounded-md text-sm">{t('common_save')}</button>
              </div>
            </div>
          )}
          {!isNoteEditing && workoutExercise.note && <p className="text-sm text-text-secondary italic my-2 p-2 bg-slate-900/50 rounded-md">"{workoutExercise.note}"</p>}
          
          <div className="grid grid-cols-12 items-center gap-2 text-xs text-text-secondary">
            <div className="col-span-2 text-center font-semibold">{t('workout_set')}</div>
            <div className="col-span-4 text-center">{t('weight_unit')}</div>
            <div className="col-span-4 text-center">{t('workout_reps')}</div>
            <div className="col-span-2 text-center"></div>
          </div>

          <div className="space-y-2">
            {workoutExercise.sets.map((set) => {
              if (set.type === 'normal') normalSetCounter++;
              return (
                  <TemplateSetRow 
                      key={set.id}
                      set={set}
                      setNumber={normalSetCounter}
                      onUpdateSet={handleUpdateSet}
                      onDeleteSet={() => handleDeleteSet(set.id)}
                      restTime={workoutExercise.restTime}
                      onEditSetTimer={() => setEditingSetTimer(set)}
                  />
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
      )}
    </div>
    <ChangeTimerModal 
      isOpen={isDefaultsTimerModalOpen}
      onClose={() => setIsDefaultsTimerModalOpen(false)}
      currentRestTimes={workoutExercise.restTime}
      onSave={handleSaveDefaultsTimer}
    />
    {editingSetTimer && (
      <EditSetTimerModal
        isOpen={!!editingSetTimer}
        onClose={() => setEditingSetTimer(null)}
        currentValue={editingSetTimer.rest}
        defaultValue={getDefaultTimerForSet(editingSetTimer)}
        onSave={handleSaveSetTimer}
      />
    )}
    </>
  );
};

export default TemplateExerciseCard;