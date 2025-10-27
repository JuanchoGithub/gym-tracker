
import { WorkoutSession, PerformedSet } from '../types';

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
      if (set.isComplete) {
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
