
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
  // Cap reps at 12 for e1RM calculation accuracy, though the formula works higher, it gets less accurate.
  // We use the raw input for now as standard Epley.
  return Math.round(weight * (1 + reps / 30));
};

export const estimateRepsFromPercentage = (percentage: number): number => {
    if (percentage >= 100) return 1;
    if (percentage >= 95) return 2;
    if (percentage >= 90) return 4;
    if (percentage >= 85) return 6;
    if (percentage >= 80) return 8;
    if (percentage >= 75) return 10;
    if (percentage >= 70) return 12;
    if (percentage >= 65) return 15;
    if (percentage >= 60) return 20;
    return 25;
};

export const getExerciseHistory = (history: WorkoutSession[], exerciseId: string): ExerciseHistory => {
  return history
    .map(session => {
      // Filter to get ALL instances of this exercise in the session (e.g., if added multiple times or in supersets)
      const matchingExercises = session.exercises.filter(ex => ex.exerciseId === exerciseId);
      
      if (matchingExercises.length === 0) return null;

      // Merge sets from all instances that are completed
      const allSets = matchingExercises.flatMap(ex => ex.sets).filter(s => s.isComplete);

      if (allSets.length === 0) return null;

      return { session, exerciseData: { sets: allSets } };
    })
    .filter((entry): entry is { session: WorkoutSession; exerciseData: { sets: PerformedSet[] } } => 
        entry !== null
    )
    .sort((a, b) => b.session.startTime - a.session.startTime); // Descending: Newest first
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

export interface ProtocolStep {
    reps: number;
    percentage: number;
    rest: number;
    labelKey: string;
    instructionKey: string;
    type: 'warmup' | 'attempt';
}

export const generate1RMProtocol = (target1RM: number): ProtocolStep[] => {
    return [
        {
            reps: 10,
            percentage: 0.5,
            rest: 60,
            labelKey: 'orm_wizard_step_warmup_1',
            instructionKey: 'orm_wizard_instructions_warmup_1',
            type: 'warmup'
        },
        {
            reps: 5,
            percentage: 0.75,
            rest: 120,
            labelKey: 'orm_wizard_step_warmup_2',
            instructionKey: 'orm_wizard_instructions_warmup_2',
            type: 'warmup'
        },
        {
            reps: 1,
            percentage: 0.9,
            rest: 180,
            labelKey: 'orm_wizard_step_warmup_3',
            instructionKey: 'orm_wizard_instructions_warmup_3',
            type: 'warmup'
        },
        {
            reps: 1,
            percentage: 1.0,
            rest: 300,
            labelKey: 'orm_wizard_step_attempt',
            instructionKey: 'orm_wizard_instructions_attempt',
            type: 'attempt'
        }
    ];
};
