
import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { WorkoutExercise, SupersetDefinition, PerformedSet, Exercise } from '../../types';
import { groupExercises } from '../../utils/workoutUtils';
import ExerciseCard from '../workout/ExerciseCard';
import SupersetCard from '../workout/SupersetCard';
import SupersetView from '../workout/SupersetView';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';

interface WorkoutExerciseListProps {
  exercises: WorkoutExercise[];
  supersets?: Record<string, SupersetDefinition>;
  isReorganizeMode: boolean;
  collapsedExerciseIds: string[];
  collapsedSupersetIds: string[];
  currentWeight?: number;
  
  // Handlers
  onUpdateExercise: (ex: WorkoutExercise) => void;
  onUpdateExercises: (exs: WorkoutExercise[]) => void;
  onRemoveExercise: (id: string) => void;
  onStartTimedSet: (ex: WorkoutExercise, set: PerformedSet) => void;
  onToggleCollapse: (id: string) => void;
  onToggleSupersetCollapse: (id: string) => void;
  
  // Reorder Handlers
  reorderHandlers: {
    handleEnterReorganizeMode: () => void;
    handleDragStart: (e: React.DragEvent<HTMLDivElement>, type: 'item' | 'superset', indices: number[]) => void;
    handleDragEnter: (e: React.DragEvent<HTMLDivElement>, type: 'item' | 'superset', indices: number[]) => void;
    handleDrop: () => void;
    handleMoveExercise: (from: number, to: number) => void;
    handleMoveSuperset: (indices: number[], dir: 'up' | 'down') => void;
  };
  draggedOverIndices: number[] | null;
  dragInfo: { type: 'item' | 'superset', indices: number[] } | null;

  // Interaction Handlers
  onCreateSuperset: (id: string) => void;
  onJoinSuperset: (exId: string, supId: string) => void;
  onUngroupSuperset: (id: string) => void;
  onRenameSuperset: (id: string, name: string) => void;
  onAddExerciseToSuperset: (id: string) => void;
  onPlaySuperset: (id: string) => void;
  onShowDetails: (id: string) => void;
  onUpgrade: (ex: WorkoutExercise, target: Exercise) => void;
  onRollback: (ex: WorkoutExercise) => void;
  
  // Data for availability
  availableSupersets: { id: string; name: string; exercises: string[] }[];
  availablePromotions: Record<string, string>;
  
  // Refs handling
  itemRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  
  // Suggestion Handlers (for empty state)
  onCoachSuggest: () => void;
  onAggressiveSuggest: () => void;
}

const WorkoutExerciseList: React.FC<WorkoutExerciseListProps> = ({
  exercises,
  supersets,
  isReorganizeMode,
  collapsedExerciseIds,
  collapsedSupersetIds,
  currentWeight,
  onUpdateExercise,
  onUpdateExercises,
  onRemoveExercise,
  onStartTimedSet,
  onToggleCollapse,
  onToggleSupersetCollapse,
  reorderHandlers,
  draggedOverIndices,
  dragInfo,
  onCreateSuperset,
  onJoinSuperset,
  onUngroupSuperset,
  onRenameSuperset,
  onAddExerciseToSuperset,
  onPlaySuperset,
  onShowDetails,
  onUpgrade,
  onRollback,
  availableSupersets,
  availablePromotions,
  itemRefs,
  onCoachSuggest,
  onAggressiveSuggest
}) => {
  const { getExerciseById } = useContext(AppContext);
  const { t } = useI18n();

  const groupedExercises = groupExercises(exercises, supersets);
  const collapsedSet = new Set(collapsedExerciseIds);
  const collapsedSupersetSet = new Set(collapsedSupersetIds);

  const renderExercise = (exercise: WorkoutExercise, index: number) => {
    const exerciseInfo = getExerciseById(exercise.exerciseId);
    const isBeingDraggedOver = draggedOverIndices?.includes(index) && dragInfo?.indices[0] !== index;

    if (!exerciseInfo) return null;

    const promotionTargetId = availablePromotions[exercise.exerciseId];
    const promotionSuggestion = promotionTargetId ? getExerciseById(promotionTargetId) : undefined;

    return (
        <div 
          key={exercise.id} 
          ref={el => {
              if(el) itemRefs.current.set(exercise.id, el); 
              else itemRefs.current.delete(exercise.id);
          }}
        >
          <ExerciseCard
              workoutExercise={exercise}
              exerciseInfo={exerciseInfo}
              onUpdate={onUpdateExercise}
              onStartTimedSet={onStartTimedSet}
              isReorganizeMode={isReorganizeMode}
              onDragStart={(e) => reorderHandlers.handleDragStart(e, 'item', [index])}
              onDragEnter={(e) => reorderHandlers.handleDragEnter(e, 'item', [index])}
              onDragEnd={reorderHandlers.handleDrop}
              onMoveUp={() => reorderHandlers.handleMoveExercise(index, index - 1)}
              onMoveDown={() => reorderHandlers.handleMoveExercise(index, index + 1)}
              isMoveUpDisabled={index === 0}
              isMoveDownDisabled={index === exercises.length - 1}
              onReorganize={reorderHandlers.handleEnterReorganizeMode}
              isBeingDraggedOver={isBeingDraggedOver}
              isCollapsed={collapsedSet.has(exercise.id)}
              onToggleCollapse={() => onToggleCollapse(exercise.id)}
              onRemove={onRemoveExercise}
              onCreateSuperset={!exercise.supersetId ? () => onCreateSuperset(exercise.id) : undefined}
              onJoinSuperset={!exercise.supersetId ? (supersetId) => onJoinSuperset(exercise.id, supersetId) : undefined}
              availableSupersets={availableSupersets}
              onShowDetails={() => onShowDetails(exercise.exerciseId)}
              userBodyWeight={currentWeight}
              promotionSuggestion={promotionSuggestion}
              onUpgrade={(target) => onUpgrade(exercise, target)}
              onRollback={() => onRollback(exercise)}
          />
        </div>
    );
  };

  if (exercises.length === 0) {
      return (
          <div className="mx-2 rounded-lg bg-surface px-4 py-10 text-center sm:mx-4 border border-white/5 flex flex-col items-center">
              <p className="text-lg font-semibold text-text-primary mb-6">{t('active_workout_empty_title')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                  <button 
                      onClick={onCoachSuggest}
                      className="bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white p-4 rounded-xl shadow-lg flex flex-col items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
                  >
                      <Icon name="sparkles" className="w-8 h-8 text-yellow-300" />
                      <span className="font-bold text-lg">{t('active_btn_coach')}</span>
                      <span className="text-xs opacity-80">{t('active_btn_coach_desc')}</span>
                  </button>
                  <button 
                      onClick={onAggressiveSuggest}
                      className="bg-surface-highlight hover:bg-surface border border-amber-500/30 text-white p-4 rounded-xl shadow-lg flex flex-col items-center gap-2 transition-all transform hover:scale-105 active:scale-95 group"
                  >
                      <Icon name="dumbbell" className="w-8 h-8 text-amber-500 group-hover:text-amber-400" />
                      <span className="font-bold text-lg">{t('active_btn_aggressive')}</span>
                      <span className="text-xs opacity-80">{t('active_btn_aggressive_desc')}</span>
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="-mx-2 space-y-4 sm:-mx-4">
      {groupedExercises.map((group, groupIndex) => {
          if (group.type === 'single') {
              return renderExercise(group.exercise, group.index);
          } else {
              const definition = group.definition || { id: group.supersetId, name: 'Superset', color: 'indigo' };
              const isBeingDraggedOver = draggedOverIndices?.length === group.indices.length && draggedOverIndices.every((val, i) => val === group.indices[i]) && dragInfo?.indices[0] !== group.indices[0];

              return (
                  <div 
                      key={group.supersetId}
                      ref={el => {
                          if(el) itemRefs.current.set(group.supersetId, el); 
                          else itemRefs.current.delete(group.supersetId);
                      }}
                  >
                      <SupersetCard 
                          definition={definition}
                          onRename={(name) => onRenameSuperset(group.supersetId, name)}
                          onUngroup={() => onUngroupSuperset(group.supersetId)}
                          onAddExercise={() => onAddExerciseToSuperset(group.supersetId)}
                          onPlay={() => onPlaySuperset(group.supersetId)}
                          exercises={group.exercises}
                          isCollapsed={collapsedSupersetSet.has(group.supersetId)}
                          onToggleCollapse={() => onToggleSupersetCollapse(group.supersetId)}
                          onMoveUp={() => reorderHandlers.handleMoveSuperset(group.indices, 'up')}
                          onMoveDown={() => reorderHandlers.handleMoveSuperset(group.indices, 'down')}
                          isReorganizeMode={isReorganizeMode}
                          onDragStart={(e) => reorderHandlers.handleDragStart(e, 'superset', group.indices)}
                          onDragEnter={(e) => reorderHandlers.handleDragEnter(e, 'superset', group.indices)}
                          onDragEnd={reorderHandlers.handleDrop}
                          isBeingDraggedOver={isBeingDraggedOver}
                      >
                          <SupersetView 
                              exercises={group.exercises}
                              indices={group.indices}
                              isReorganizeMode={isReorganizeMode}
                              onUpdateExercise={onUpdateExercise}
                              onUpdateExercises={onUpdateExercises}
                              onRemoveExercise={onRemoveExercise}
                              onMoveExercise={reorderHandlers.handleMoveExercise}
                              onStartTimedSet={onStartTimedSet}
                              onDragStart={(e, index) => reorderHandlers.handleDragStart(e, 'item', [index])}
                              onDragEnter={(e, index) => reorderHandlers.handleDragEnter(e, 'item', [index])}
                              onDragEnd={reorderHandlers.handleDrop}
                              draggedOverIndex={draggedOverIndices ? draggedOverIndices[0] : null}
                              dragItemIndex={dragInfo ? dragInfo.indices[0] : null}
                              onShowDetails={onShowDetails}
                          />
                      </SupersetCard>
                  </div>
              );
          }
      })}
    </div>
  );
};

export default WorkoutExerciseList;
