
import { Routine, PerformedSet, WorkoutExercise } from '../types';

const createSets = (count: number, reps: number, isWarmup: boolean = false): PerformedSet[] => Array.from({ length: count }, (_, i) => ({
  id: `set-${Date.now()}-${Math.random()}-${i}`,
  reps,
  weight: 0,
  type: isWarmup ? 'warmup' : 'normal',
  isComplete: false
}));

const createWorkoutExercise = (exerciseId: string, sets: PerformedSet[], restTime: number): WorkoutExercise => ({
    id: `re-${Math.random()}`,
    exerciseId,
    sets,
    restTime: {
        normal: restTime,
        warmup: 60,
        drop: 30,
    }
});

export const PREDEFINED_ROUTINES: Routine[] = [
  {
    id: 'rt-1',
    name: 'StrongLifts 5x5 - Workout A',
    description: 'A classic strength program focusing on compound lifts.',
    exercises: [
      createWorkoutExercise('ex-2', createSets(5, 5), 90),
      createWorkoutExercise('ex-1', createSets(5, 5), 90),
      createWorkoutExercise('ex-5', createSets(5, 5), 90),
    ]
  },
  {
    id: 'rt-2',
    name: 'StrongLifts 5x5 - Workout B',
    description: 'The second workout of the 5x5 program.',
    exercises: [
      createWorkoutExercise('ex-2', createSets(5, 5), 90),
      createWorkoutExercise('ex-4', createSets(5, 5), 90),
      createWorkoutExercise('ex-3', createSets(1, 5), 180),
    ]
  },
  {
    id: 'rt-3',
    name: 'PHUL - Upper Power',
    description: 'Power Hypertrophy Upper Lower training program.',
    exercises: [
      createWorkoutExercise('ex-1', createSets(4, 5), 90),
      createWorkoutExercise('ex-12', createSets(4, 10), 60),
      createWorkoutExercise('ex-5', createSets(4, 5), 90),
      createWorkoutExercise('ex-10', createSets(4, 10), 60),
      createWorkoutExercise('ex-4', createSets(3, 8), 75),
      createWorkoutExercise('ex-7', createSets(3, 10), 60),
      createWorkoutExercise('ex-8', createSets(3, 10), 60),
    ]
  },
  {
    id: 'rt-4',
    name: 'PHUL - Lower Power',
    description: 'Power Hypertrophy Upper Lower training program.',
    exercises: [
      createWorkoutExercise('ex-2', createSets(4, 5), 90),
      createWorkoutExercise('ex-3', createSets(4, 5), 120),
      createWorkoutExercise('ex-9', createSets(4, 12), 60),
      createWorkoutExercise('ex-16', createSets(4, 10), 60),
      createWorkoutExercise('ex-18', createSets(5, 15), 45),
    ]
  }
];