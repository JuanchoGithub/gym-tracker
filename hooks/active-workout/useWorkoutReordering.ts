
import { useState, useRef, useContext } from 'react';
import { WorkoutSession, WorkoutExercise } from '../../types';
import { ActiveWorkoutContext } from '../../contexts/ActiveWorkoutContext';
import { groupExercises } from '../../utils/workoutUtils';

export const useWorkoutReordering = (activeWorkout: WorkoutSession | null) => {
  const { updateActiveWorkout } = useContext(ActiveWorkoutContext);
  const [isReorganizeMode, setIsReorganizeMode] = useState(false);
  const [tempExercises, setTempExercises] = useState<WorkoutExercise[]>([]);
  const [draggedOverIndices, setDraggedOverIndices] = useState<number[] | null>(null);
  
  const dragInfo = useRef<{ type: 'item' | 'superset', indices: number[] } | null>(null);
  const dragOverInfo = useRef<{ type: 'item' | 'superset', indices: number[] } | null>(null);

  const handleEnterReorganizeMode = () => {
    if (!activeWorkout) return;
    setTempExercises([...activeWorkout.exercises]);
    setIsReorganizeMode(true);
  };

  const handleExitReorganizeMode = (save: boolean) => {
    if (save && activeWorkout) {
        // Fix Data Loss Race Condition:
        // Merge the new ORDER and SUPERSET_ID from tempExercises with the LATEST DATA from activeWorkout.
        const mergedExercises = tempExercises.map(tempEx => {
            const latestEx = activeWorkout.exercises.find(e => e.id === tempEx.id);
            if (!latestEx) return tempEx; // Fallback
            
            return {
                ...latestEx, // Persist latest set data, notes, timers
                supersetId: tempEx.supersetId // Persist structural changes from reorganize
            };
        });

        updateActiveWorkout({ ...activeWorkout, exercises: mergedExercises });
    }
    setIsReorganizeMode(false);
    setTempExercises([]);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, type: 'item' | 'superset', indices: number[]) => {
    e.stopPropagation();
    dragInfo.current = { type, indices };
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, type: 'item' | 'superset', indices: number[]) => {
    e.stopPropagation();
    dragOverInfo.current = { type, indices };
    setDraggedOverIndices(indices);
  };

  const handleDrop = () => {
    if (!dragInfo.current || !dragOverInfo.current) return;
    
    const source = dragInfo.current;
    const target = dragOverInfo.current;
    
    // Don't do anything if dropping on itself
    if (source.indices[0] === target.indices[0]) {
        setDraggedOverIndices(null);
        dragInfo.current = null;
        dragOverInfo.current = null;
        return;
    }

    const newExercises = [...tempExercises];
    
    // Extract source items
    const sourceIndices = source.indices.sort((a, b) => a - b);
    const removedItems = newExercises.splice(sourceIndices[0], sourceIndices.length);
    
    // Determine insertion index
    let insertIndex = target.indices[0];
    if (insertIndex > sourceIndices[0]) {
        insertIndex -= sourceIndices.length;
    }
    
    // Logic for adopting Superset ID
    if (source.type === 'item') {
        const targetItem = newExercises[insertIndex] || (insertIndex > 0 ? newExercises[insertIndex-1] : null);
        
        removedItems.forEach(item => {
            if (target.type === 'superset' && targetItem && targetItem.supersetId) {
                 item.supersetId = targetItem.supersetId;
            } 
            else if (target.type === 'item' && targetItem && targetItem.supersetId) {
                 item.supersetId = targetItem.supersetId;
            }
            else if (target.type === 'item' && targetItem && !targetItem.supersetId) {
                 delete item.supersetId;
            }
        });
    }
    
    newExercises.splice(insertIndex, 0, ...removedItems);
    
    setTempExercises(newExercises);
    dragInfo.current = null;
    dragOverInfo.current = null;
    setDraggedOverIndices(null);
  };

  const handleMoveExercise = (fromIndex: number, toIndex: number) => {
    if (!activeWorkout || toIndex < 0 || toIndex >= activeWorkout.exercises.length) return;
    updateActiveWorkout(prev => {
        if (!prev) return null;
        const newExercises = [...prev.exercises];
        const [movedItem] = newExercises.splice(fromIndex, 1);
        newExercises.splice(toIndex, 0, movedItem);
        return { ...prev, exercises: newExercises };
    });
  };

  const handleMoveSuperset = (indices: number[], direction: 'up' | 'down') => {
    const exercisesList = isReorganizeMode ? tempExercises : activeWorkout?.exercises;
    if (!exercisesList) return;

    const newExercises = [...exercisesList];
    const sortedIndices = indices.sort((a, b) => a - b);
    const startIndex = sortedIndices[0];
    const count = sortedIndices.length;
    
    if (direction === 'up') {
        if (startIndex === 0) return;
        const grouped = groupExercises(newExercises, activeWorkout?.supersets);
        const currentGroupIndex = grouped.findIndex(g => g.type === 'superset' && g.indices[0] === startIndex);
        if (currentGroupIndex > 0) {
            const prevGroup = grouped[currentGroupIndex - 1];
            const prevGroupStart = prevGroup.type === 'superset' ? prevGroup.indices[0] : prevGroup.index;
            const removed = newExercises.splice(startIndex, count);
            newExercises.splice(prevGroupStart, 0, ...removed);
        }
    } else {
         const grouped = groupExercises(newExercises, activeWorkout?.supersets);
         const currentGroupIndex = grouped.findIndex(g => g.type === 'superset' && g.indices[0] === startIndex);
         if (currentGroupIndex < grouped.length - 1) {
             const nextGroup = grouped[currentGroupIndex + 1];
             const nextGroupEndIndex = nextGroup.type === 'superset' ? nextGroup.indices[nextGroup.indices.length - 1] : nextGroup.index;
             const insertIndex = nextGroupEndIndex + 1;
             const adjustedInsert = insertIndex - count;
             const removed = newExercises.splice(startIndex, count);
             newExercises.splice(adjustedInsert, 0, ...removed);
         }
    }

    if (isReorganizeMode) {
        setTempExercises(newExercises);
    } else if (activeWorkout) {
        updateActiveWorkout({ ...activeWorkout, exercises: newExercises });
    }
  };

  return {
    isReorganizeMode,
    exercisesToShow: isReorganizeMode ? tempExercises : (activeWorkout?.exercises || []),
    draggedOverIndices,
    dragInfo: dragInfo.current, // Exposed for logic checks if needed, though mostly handled internally
    handlers: {
        handleEnterReorganizeMode,
        handleExitReorganizeMode,
        handleDragStart,
        handleDragEnter,
        handleDrop,
        handleMoveExercise,
        handleMoveSuperset,
    }
  };
};
