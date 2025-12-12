
import { WorkoutSession, PerformedSet, WorkoutExercise, Routine, SupersetDefinition, Exercise } from '../types';

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

// Lombardi formula for estimating 1 Rep Max
// This is chosen over Epley for better accuracy at higher rep ranges (preventing overestimation).
export const calculate1RM = (weight: number, reps: number, bodyWeight: number = 0): number => {
  if (reps === 0) return 0;
  
  // If weight is 0 (e.g. bodyweight exercise), use provided bodyweight if available.
  const load = weight + bodyWeight;
  
  if (load === 0) return 0;

  if (reps === 1) return load;
  
  // Cap reps at 20. While Lombardi is better than Epley for high reps, 
  // calculating a strength max from >20 reps (cardio/endurance) is statistically invalid.
  const effectiveReps = Math.min(reps, 20);
  
  // Formula: Weight * Reps ^ 0.10
  return Math.round(load * Math.pow(effectiveReps, 0.10));
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

/**
 * Heuristically determines if a workout session counts as 'heavy' or 'light'.
 * Used for auto-detecting day overrides in the supplement schedule.
 */
export const detectWorkoutIntensity = (workout: WorkoutSession, allExercises: Exercise[]): 'heavy' | 'light' => {
    let isHeavy = false;
    
    for (const ex of workout.exercises) {
        // Must have done at least one set
        const performedSets = ex.sets.filter(s => s.isComplete);
        if (performedSets.length === 0) continue;
        
        const def = allExercises.find(e => e.id === ex.exerciseId);
        if (!def) continue;

        // Rule 1: Heavy Compound Check (Category Priority)
        // Barbell and Smith Machine movements almost always imply CNS load
        if (['Barbell', 'Smith Machine'].includes(def.category)) {
            isHeavy = true;
            break;
        }
        
        // Scan Sets for Intensity Markers
        for (const set of performedSets) {
            // Rule 2: Effort Check
            // Going to failure or using drop sets implies high intensity regardless of exercise
            if (set.type === 'failure' || set.type === 'drop') {
                isHeavy = true;
                break;
            }
            
            // Rule 3: Load Check
            // Filter out "pink dumbbell" rehab work.
            // For Bodyweight moves, check if they added significant external load.
            if (['Bodyweight', 'Plyometrics', 'Assisted Bodyweight'].includes(def.category)) {
                 const addedLoad = set.weight - (set.storedBodyWeight || 0);
                 if (addedLoad > 10) {
                     isHeavy = true;
                     break;
                 }
            } else {
                 // For external weights, just check the absolute load
                 if (set.weight > 10) {
                     isHeavy = true;
                     break;
                 }
            }
        }
        
        if (isHeavy) break;
    }
    
    return isHeavy ? 'heavy' : 'light';
};

/**
 * Factory for creating a smart WorkoutExercise with defaults and overrides.
 */
export const createSmartWorkoutExercise = (
    exercise: Exercise | undefined,
    defaults: { sets: number, reps: number, weight: number, restTime: any },
    supersetId?: string
): WorkoutExercise => {
    if (!exercise) {
        // Fallback for missing definition
        return {
             id: `we-${Date.now()}-${Math.random()}`,
             exerciseId: 'unknown',
             sets: [],
             restTime: defaults.restTime,
             supersetId
        };
    }

    let finalSetsCount = defaults.sets;
    let finalReps = defaults.reps;
    let finalWeight = defaults.weight;
    let finalTime = exercise.isTimed ? 60 : undefined;
    let finalType: 'normal' | 'timed' = exercise.isTimed ? 'timed' : 'normal';

    // Unilateral Logic: Double sets by default
    if (exercise.isUnilateral) {
        finalSetsCount *= 2;
    }
    
    // Generic Default Logic for Timed Sets
    if (finalType === 'timed') {
        finalReps = 1; // 1 round implies duration
        finalWeight = 0; // Usually 0 for timed, unless weighted plank etc
    }

    // Specific Overrides for "Flow" type exercises
    // IMPORTANT: These come AFTER generic defaults to ensure specific behavior sticks.
    if (exercise.id === 'ex-138') { // Sun Salutation
        finalType = 'timed'; // Treat as timed (user request) but with 3 reps
        finalReps = 3;       // Specific: 3 Reps
        finalWeight = 0;
    }
    if (exercise.id === 'ex-121') { // Bird Dog
        finalType = 'normal'; // Do for reps
        finalReps = 10;
        finalTime = undefined;
        finalWeight = 0;
    }

    // Rest Time Tuning
    const restTime = { ...defaults.restTime };
    if (exercise.bodyPart === 'Mobility' || (finalType === 'timed' && exercise.category === 'Bodyweight')) {
         restTime.normal = 30; // Shorter rest for mobility/timed bodyweight
    }

    const sets = Array.from({ length: finalSetsCount }, () => ({
        id: `set-${Date.now()}-${Math.random()}`,
        reps: finalReps,
        weight: finalWeight,
        time: finalTime,
        type: finalType,
        isComplete: false
    }));

    return {
        id: `we-${Date.now()}-${Math.random()}`,
        exerciseId: exercise.id,
        sets,
        restTime,
        supersetId
    };
};

/**
 * Calculates suggested weights for warmup sets based on the working weight.
 * Returns 3 values [50%, 75%, 90%] for Full Protocol.
 */
export const calculateWarmupWeights = (workingWeight: number, count: number, increment: number = 2.5): number[] => {
    // Round to nearest increment
    const round = (w: number) => {
        if (increment === 0) return w; // Safety
        return Math.round(w / increment) * increment;
    };

    if (workingWeight === 0) {
        return Array(count).fill(0);
    }

    if (count === 3) {
        return [
            round(workingWeight * 0.5),
            round(workingWeight * 0.75),
            round(workingWeight * 0.9)
        ];
    } else if (count === 1) {
        return [round(workingWeight * 0.6)]; // Generic feeder/primer
    } else if (count === 2) {
        return [round(workingWeight * 0.5), round(workingWeight * 0.8)];
    }

    return Array(count).fill(0);
};
