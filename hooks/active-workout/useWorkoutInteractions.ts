
import { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { ActiveWorkoutContext } from '../../contexts/ActiveWorkoutContext';
import { TimerContext } from '../../contexts/TimerContext';
import { WorkoutExercise, PerformedSet, Exercise, Routine } from '../../types';
import { useExerciseName } from '../useExerciseName';
import { getTimerDuration } from '../../utils/workoutUtils';
import { cancelTimerNotification } from '../../services/notificationService';

export const useWorkoutInteractions = () => {
    const { getExerciseById, rawExercises } = useContext(AppContext);
    const { 
        activeWorkout, 
        updateActiveWorkout, 
        setCollapsedExerciseIds, 
        setCollapsedSupersetIds,
        collapsedExerciseIds,
        collapsedSupersetIds,
        endWorkout,
        discardActiveWorkout
    } = useContext(ActiveWorkoutContext);
    
    const { activeTimerInfo, setActiveTimerInfo, activeTimedSet, setActiveTimedSet } = useContext(TimerContext);
    const getExName = useExerciseName(); // Using the hook function

    // --- Validation Logic ---
    const validateWorkout = (t: (key: string, replacements?: any) => string): string[] => {
        if (!activeWorkout) return [];
        
        const errors: string[] = [];
    
        activeWorkout.exercises.forEach(ex => {
            const exerciseInfo = getExerciseById(ex.exerciseId);
            if (!exerciseInfo) return;
    
            const isWeightOptional = ['Reps Only', 'Cardio', 'Duration', 'Bodyweight', 'Assisted Bodyweight', 'Plyometrics'].includes(exerciseInfo.category);
            const name = getExName(exerciseInfo); // Using hook derived name if possible, or fallback
            
            ex.sets.forEach((set, idx) => {
                if (!set.isComplete) return;
    
                let setErrors = [];
                if (set.type === 'timed') {
                     if ((set.time ?? 0) <= 0) setErrors.push(t('workout_error_time', { set: idx + 1 }));
                     if (set.reps <= 0) setErrors.push(t('workout_error_reps', { set: idx + 1 }));
                } else {
                     if (!isWeightOptional && set.weight <= 0) setErrors.push(t('workout_error_weight', { set: idx + 1 }));
                     if (set.reps <= 0) setErrors.push(t('workout_error_reps', { set: idx + 1 }));
                }
    
                if (setErrors.length > 0) {
                    errors.push(`${name}: ${setErrors.join(', ')}`);
                }
            });
        });
    
        return errors;
    };

    // --- Exercise Updates ---
    const handleUpdateExercises = (updatedExercises: WorkoutExercise[]) => {
        updateActiveWorkout(prev => {
            if (!prev) return null;
            const newExercisesList = prev.exercises.map(ex => {
                const updated = updatedExercises.find(u => u.id === ex.id);
                return updated || ex;
            });
            return { ...prev, exercises: newExercisesList };
        });
    };

    const handleUpdateExercise = (updatedExercise: WorkoutExercise, scrollToItem?: (id: string) => void) => {
        if (!activeWorkout) return;

        const originalExercise = activeWorkout.exercises.find(ex => ex.id === updatedExercise.id);
        if (!originalExercise) return;

        let justCompletedSet: PerformedSet | null = null;
        let justUncompletedSet: PerformedSet | null = null;
        let justCompletedSetIndex: number = -1;

        for (const [index, updatedSet] of updatedExercise.sets.entries()) {
            const originalSet = originalExercise.sets.find(s => s.id === updatedSet.id);
            if (originalSet && !originalSet.isComplete && updatedSet.isComplete) {
                justCompletedSet = updatedSet;
                justCompletedSetIndex = index;
                break;
            }
            if (originalSet && originalSet.isComplete && !updatedSet.isComplete) {
                justUncompletedSet = updatedSet;
                break;
            }
        }

        updateActiveWorkout(prev => {
            if (!prev) return null;
            let workoutToUpdate = { ...prev };

            // Handle Actual Rest Time Logging
            if (justCompletedSet && activeTimerInfo && !activeTimerInfo.isPaused) {
                const elapsedSeconds = Math.round((Date.now() - (activeTimerInfo.targetTime - activeTimerInfo.totalDuration * 1000)) / 1000);
                
                const prevExerciseIndex = workoutToUpdate.exercises.findIndex(e => e.id === activeTimerInfo.exerciseId);
                if (prevExerciseIndex > -1) {
                    const prevSetIndex = workoutToUpdate.exercises[prevExerciseIndex].sets.findIndex(s => s.id === activeTimerInfo.setId);
                    if (prevSetIndex > -1) {
                        workoutToUpdate.exercises[prevExerciseIndex].sets[prevSetIndex].actualRest = elapsedSeconds;
                    }
                }
            }
            
            const updatedExercises = workoutToUpdate.exercises.map(ex =>
                ex.id === updatedExercise.id ? updatedExercise : ex
            );
            workoutToUpdate = { ...workoutToUpdate, exercises: updatedExercises };
            return workoutToUpdate;
        });

        // Timer Logic
        if (justCompletedSet) {
             // Only start timer if not playing superset mode (handled elsewhere)
             const duration = getTimerDuration(justCompletedSet, updatedExercise, justCompletedSetIndex);
             setActiveTimerInfo({
                 exerciseId: updatedExercise.id,
                 setId: justCompletedSet.id,
                 targetTime: Date.now() + duration * 1000,
                 totalDuration: duration,
                 initialDuration: duration,
                 isPaused: false,
                 timeLeftWhenPaused: 0,
             });

             // Auto-collapse logic
             if (!updatedExercise.supersetId) {
                 if (updatedExercise.sets.every(s => s.isComplete)) {
                     if (!collapsedExerciseIds.includes(updatedExercise.id)) {
                         setCollapsedExerciseIds(prev => [...prev, updatedExercise.id]);
                         if (scrollToItem) scrollToItem(updatedExercise.id);
                     }
                 }
             } else {
                 const supersetId = updatedExercise.supersetId;
                 const allSupersetExercises = activeWorkout.exercises.filter(ex => ex.supersetId === supersetId);
                 // Need to account for the current update which might not be in state yet
                 const allComplete = allSupersetExercises.every(ex => {
                     if (ex.id === updatedExercise.id) return updatedExercise.sets.every(s => s.isComplete);
                     return ex.sets.every(s => s.isComplete);
                 });
                 
                 if (allComplete) {
                     if (!collapsedSupersetIds.includes(supersetId)) {
                         setCollapsedSupersetIds(prev => [...prev, supersetId]);
                         if (scrollToItem) scrollToItem(supersetId);
                     }
                 }
             }
        } else if (justUncompletedSet && activeTimerInfo && activeTimerInfo.setId === justUncompletedSet.id) {
            setActiveTimerInfo(null);
            cancelTimerNotification('rest-timer-finished');
        }
    };

    const handleRemoveExercise = (exerciseId: string) => {
        if (!activeWorkout) return;
        if (activeTimerInfo && activeTimerInfo.exerciseId === exerciseId) {
            setActiveTimerInfo(null);
            cancelTimerNotification('rest-timer-finished');
        }
        if (activeTimedSet && activeTimedSet.exercise.id === exerciseId) {
            setActiveTimedSet(null);
        }
        setCollapsedExerciseIds(prev => prev.filter(id => id !== exerciseId));

        updateActiveWorkout(prev => {
            if (!prev) return null;
            const updatedExercises = prev.exercises.filter(ex => ex.id !== exerciseId);
            return { ...prev, exercises: updatedExercises };
        });
    };

    // --- Superset Logic ---
    const handleCreateSuperset = (exerciseId: string) => {
        if (!activeWorkout) return;
        const newSupersetId = `superset-${Date.now()}`;
        
        updateActiveWorkout(prev => {
            if (!prev) return null;
            const exerciseIndex = prev.exercises.findIndex(ex => ex.id === exerciseId);
            if (exerciseIndex === -1) return prev;

            const newSupersetDef = { id: newSupersetId, name: 'Superset', color: 'indigo' };
            const updatedExercises = [...prev.exercises];
            updatedExercises[exerciseIndex] = { ...updatedExercises[exerciseIndex], supersetId: newSupersetId };

            return {
                ...prev,
                exercises: updatedExercises,
                supersets: { ...prev.supersets, [newSupersetId]: newSupersetDef }
            };
        });
        setCollapsedSupersetIds(prev => [...prev, newSupersetId]);
    };

    const handleJoinSuperset = (exerciseId: string, targetSupersetId: string) => {
        if (!activeWorkout) return;
        updateActiveWorkout(prev => {
            if (!prev) return null;
            const currentExercise = prev.exercises.find(ex => ex.id === exerciseId);
            if (!currentExercise) return prev; 

            const exercisesWithoutItem = prev.exercises.filter(ex => ex.id !== exerciseId);
            
            let insertionIndex = -1;
            for (let i = exercisesWithoutItem.length - 1; i >= 0; i--) {
                if (exercisesWithoutItem[i].supersetId === targetSupersetId) {
                    insertionIndex = i;
                    break;
                }
            }

            const updatedItem = { ...currentExercise, supersetId: targetSupersetId };
            const finalExercises = [...exercisesWithoutItem];
            
            if (insertionIndex !== -1) {
                finalExercises.splice(insertionIndex + 1, 0, updatedItem);
            } else {
                finalExercises.push(updatedItem);
            }

            return { ...prev, exercises: finalExercises };
        });
    };

    const handleUngroupSuperset = (supersetId: string) => {
        if (!activeWorkout) return;
        updateActiveWorkout(prev => {
            if (!prev) return null;
            const updatedExercises = prev.exercises.map(ex => {
                if (ex.supersetId === supersetId) {
                    const { supersetId: _, ...rest } = ex;
                    return rest;
                }
                return ex;
            });
            const updatedSupersets = { ...prev.supersets };
            delete updatedSupersets[supersetId];
            return { ...prev, exercises: updatedExercises, supersets: updatedSupersets };
        });
        setCollapsedSupersetIds(prev => prev.filter(id => id !== supersetId));
    };

    const handleRenameSuperset = (supersetId: string, newName: string) => {
        updateActiveWorkout(prev => {
            if (!prev || !prev.supersets) return prev;
            return {
                ...prev,
                supersets: {
                    ...prev.supersets,
                    [supersetId]: { ...prev.supersets[supersetId], name: newName }
                }
            };
        });
    };

    // --- Misc Handlers ---
    const handleToggleCollapse = (exerciseId: string, scrollToItem?: (id: string) => void) => {
        setCollapsedExerciseIds(prevIds => {
            const newSet = new Set(prevIds);
            if (newSet.has(exerciseId)) {
                newSet.delete(exerciseId);
            } else {
                newSet.add(exerciseId);
                if (scrollToItem) scrollToItem(exerciseId);
            }
            return Array.from(newSet);
        });
    };

    const handleToggleSupersetCollapse = (supersetId: string, scrollToItem?: (id: string) => void) => {
        setCollapsedSupersetIds(prevIds => {
            const newSet = new Set(prevIds);
            if (newSet.has(supersetId)) {
                newSet.delete(supersetId);
            } else {
                newSet.add(supersetId);
                if (scrollToItem) scrollToItem(supersetId);
            }
            return Array.from(newSet);
        });
    };

    return {
        validateWorkout,
        handleUpdateExercise,
        handleUpdateExercises,
        handleRemoveExercise,
        handleCreateSuperset,
        handleJoinSuperset,
        handleUngroupSuperset,
        handleRenameSuperset,
        handleToggleCollapse,
        handleToggleSupersetCollapse,
        endWorkout,
        discardActiveWorkout,
        activeTimedSet,
        setActiveTimedSet,
    };
};
