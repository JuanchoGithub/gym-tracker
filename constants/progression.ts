
export interface ProgressionCriteria {
  minWeightRatio?: number; // Weight relative to bodyweight (e.g., 0.5 = 50% BW)
  minReps: number;
  requiredSessions: number; // How many times criteria must be met
}

export interface ProgressionPath {
  baseExerciseId: string;
  targetExerciseId: string;
  criteria: ProgressionCriteria;
  reasonKey: string;
}

export const PROGRESSION_PATHS: ProgressionPath[] = [
  {
    baseExerciseId: 'ex-109', // Goblet Squat
    targetExerciseId: 'ex-2', // Barbell Squat
    criteria: { minWeightRatio: 0.35, minReps: 10, requiredSessions: 3 },
    reasonKey: 'progression_reason_squat'
  },
  {
    baseExerciseId: 'ex-23', // Push Up
    targetExerciseId: 'ex-1', // Bench Press
    criteria: { minReps: 20, requiredSessions: 3 }, // High rep pushups -> Bench
    reasonKey: 'progression_reason_bench'
  },
  {
    baseExerciseId: 'ex-5', // Barbell Row (Note: Assuming beginner might start here or we map inverted row)
    targetExerciseId: 'ex-6', // Pull Up
    criteria: { minWeightRatio: 0.7, minReps: 5, requiredSessions: 3 }, // Strong rows -> Pull ups
    reasonKey: 'progression_reason_pullup'
  },
  {
    baseExerciseId: 'ex-98', // RDL
    targetExerciseId: 'ex-3', // Deadlift
    criteria: { minWeightRatio: 0.6, minReps: 8, requiredSessions: 3 },
    reasonKey: 'progression_reason_deadlift'
  }
];
