
import { WorkoutSession, PerformedSet, WorkoutExercise, Routine, SupersetDefinition } from '../types';

export type ExerciseHistory = {
  session: WorkoutSession;
  exerciseData: {
    sets: PerformedSet[];
  };
}[];

export type PersonalRecords = {
  maxWeight: { value: number; set: PerformedSet; session: WorkoutSession } | null;
  maxReps: { value: number; set: PerformedSet; session: WorkoutSession } | null;
  maxVolume: { value: number; set: PerformedSet; session: WorkoutSession } | null;
};

// Epley formula for estimating 1 Rep Max
export const calculate1RM = (weight: number, reps: number): number => {
  if (reps === 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
};

export const getExerciseHistory = (history: WorkoutSession[], exerciseId: string): ExerciseHistory => {
  return history
    .map(session => {
      const exerciseData = session.exercises.find(ex => ex.exerciseId === exerciseId);
      return exerciseData ? { session, exerciseData: { sets: exerciseData.sets.filter(s => s.isComplete) } } : null;
    })
    .filter((entry): entry is { session: WorkoutSession; exerciseData: { sets: PerformedSet[] } } => 
        entry !== null && entry.exerciseData.sets.length > 0
    )
    .sort((a, b) => b.session.startTime - a.session.startTime);
};

export const calculateRecords = (exerciseHistory: ExerciseHistory): PersonalRecords => {
  const records: PersonalRecords = {
    maxWeight: null,
    maxReps: null,
    maxVolume: null,
  };

  exerciseHistory.forEach(({ session, exerciseData }) => {
    exerciseData.sets.forEach(set => {
      if (set.isComplete && set.type === 'normal') {
        // Max Weight
        if (!records.maxWeight || set.weight > records.maxWeight.value) {
          records.maxWeight = { value: set.weight, set, session };
        }
        // Max Reps
        if (!records.maxReps || set.reps > records.maxReps.value) {
          records.maxReps = { value: set.reps, set, session };
        }
        // Max Volume
        const volume = set.weight * set.reps;
        if (!records.maxVolume || volume > records.maxVolume.value) {
          records.maxVolume = { value: volume, set, session };
        }
      }
    });
  });

  return records;
};

export const findBestSet = (sets: PerformedSet[]): PerformedSet | null => {
    if (!sets || sets.length === 0) {
        return null;
    }
    
    const normalSets = sets.filter(s => s.type === 'normal');
    if (normalSets.length === 0) {
        return null;
    }

    return normalSets.reduce((best, current) => {
        if (!best) return current;
        const best1RM = calculate1RM(best.weight, best.reps);
        const current1RM = calculate1RM(current.weight, current.reps);
        return current1RM > best1RM ? current : best;
    }, normalSets[0]);
};

export const getTimerDuration = (set: PerformedSet, workoutExercise: WorkoutExercise, setIndex: number): number => {
    if (set.rest !== undefined && set.rest !== null) return set.rest;
    const restTime = workoutExercise.restTime;
    let duration: number;

    switch (set.type) {
        case 'warmup': 
            duration = restTime.warmup;
            break;
        case 'drop': 
            duration = restTime.drop;
            break;
        case 'timed': 
            duration = restTime.timed;
            break;
        case 'failure':
            duration = restTime.failure;
            break;
        case 'normal':
        default: 
            duration = restTime.normal;
    }

    const isLastSetOfExercise = setIndex === workoutExercise.sets.length - 1;
    const isLastWarmup = set.type === 'warmup' && 
                        setIndex < workoutExercise.sets.length - 1 &&
                        workoutExercise.sets[setIndex + 1].type !== 'warmup';

    if (isLastSetOfExercise || isLastWarmup) {
        duration *= 2;
    }
    
    return duration;
};


// Helper to group exercises into supersets for rendering
export type GroupedExerciseItem = 
    | { type: 'single', exercise: WorkoutExercise, index: number }
    | { type: 'superset', exercises: WorkoutExercise[], supersetId: string, definition?: SupersetDefinition, indices: number[] };

export const groupExercises = (exercises: WorkoutExercise[], supersets?: Record<string, SupersetDefinition>): GroupedExerciseItem[] => {
    const grouped: GroupedExerciseItem[] = [];
    let currentSuperset: WorkoutExercise[] = [];
    let currentSupersetId: string | null = null;
    let currentIndices: number[] = [];

    exercises.forEach((exercise, index) => {
        if (exercise.supersetId) {
            if (currentSupersetId && currentSupersetId !== exercise.supersetId) {
                // Finish previous superset
                 grouped.push({
                    type: 'superset',
                    exercises: currentSuperset,
                    supersetId: currentSupersetId,
                    definition: supersets?.[currentSupersetId],
                    indices: currentIndices
                });
                currentSuperset = [exercise];
                currentIndices = [index];
                currentSupersetId = exercise.supersetId;
            } else {
                // Continue or start new superset
                currentSuperset.push(exercise);
                currentIndices.push(index);
                currentSupersetId = exercise.supersetId;
            }
        } else {
            // If we were tracking a superset, push it
            if (currentSupersetId) {
                 grouped.push({
                    type: 'superset',
                    exercises: currentSuperset,
                    supersetId: currentSupersetId,
                    definition: supersets?.[currentSupersetId],
                    indices: currentIndices
                });
                currentSuperset = [];
                currentIndices = [];
                currentSupersetId = null;
            }
            grouped.push({ type: 'single', exercise, index });
        }
    });

    // Push remaining superset
    if (currentSupersetId && currentSuperset.length > 0) {
        grouped.push({
            type: 'superset',
            exercises: currentSuperset,
            supersetId: currentSupersetId,
            definition: supersets?.[currentSupersetId],
            indices: currentIndices
        });
    }

    return grouped;
};
