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

const strongLiftsA: Routine = {
    id: 'rt-1',
    name: 'StrongLifts 5x5 - Workout A',
    description: 'A classic strength program focusing on compound lifts.',
    exercises: [
      createWorkoutExercise('ex-2', createSets(5, 5), 90),
      createWorkoutExercise('ex-1', createSets(5, 5), 90),
      createWorkoutExercise('ex-5', createSets(5, 5), 90),
    ],
    isTemplate: true,
    originId: 'rt-1'
};

const strongLiftsB: Routine = {
    id: 'rt-2',
    name: 'StrongLifts 5x5 - Workout B',
    description: 'The second workout of the 5x5 program.',
    exercises: [
      createWorkoutExercise('ex-2', createSets(5, 5), 90),
      createWorkoutExercise('ex-4', createSets(5, 5), 90),
      createWorkoutExercise('ex-3', createSets(1, 5), 180),
    ],
    isTemplate: true,
    originId: 'rt-2'
};

const phulUpper: Routine = {
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
    ],
    isTemplate: true,
    originId: 'rt-3'
};

const phulLower: Routine = {
    id: 'rt-4',
    name: 'PHUL - Lower Power',
    description: 'Power Hypertrophy Upper Lower training program.',
    exercises: [
      createWorkoutExercise('ex-2', createSets(4, 5), 90),
      createWorkoutExercise('ex-3', createSets(4, 5), 120),
      createWorkoutExercise('ex-9', createSets(4, 12), 60),
      createWorkoutExercise('ex-16', createSets(4, 10), 60),
      createWorkoutExercise('ex-18', createSets(5, 15), 45),
    ],
    isTemplate: true,
    originId: 'rt-4'
};

const pplPush: Routine = {
    id: 'rt-ppl-push',
    name: 'PPL - Push Day',
    description: 'Focuses on chest, shoulders, and triceps.',
    exercises: [
        createWorkoutExercise('ex-1', createSets(4, 8), 90),
        createWorkoutExercise('ex-12', createSets(4, 12), 60),
        createWorkoutExercise('ex-4', createSets(3, 10), 75),
        createWorkoutExercise('ex-56', createSets(4, 15), 45),
        createWorkoutExercise('ex-85', createSets(4, 12), 45),
        createWorkoutExercise('ex-8', createSets(4, 12), 60),
    ],
    isTemplate: true,
    originId: 'rt-ppl-push'
};

const pplPull: Routine = {
    id: 'rt-ppl-pull',
    name: 'PPL - Pull Day',
    description: 'Focuses on back and biceps.',
    exercises: [
        createWorkoutExercise('ex-6', createSets(4, 8), 90),
        createWorkoutExercise('ex-5', createSets(4, 10), 75),
        createWorkoutExercise('ex-10', createSets(4, 12), 60),
        createWorkoutExercise('ex-38', createSets(4, 12), 60),
        createWorkoutExercise('ex-7', createSets(4, 12), 45),
        createWorkoutExercise('ex-73', createSets(4, 15), 45),
    ],
    isTemplate: true,
    originId: 'rt-ppl-pull'
};

const pplLegs: Routine = {
    id: 'rt-ppl-legs',
    name: 'PPL - Leg Day',
    description: 'Focuses on quads, hamstrings, glutes, and calves.',
    exercises: [
        createWorkoutExercise('ex-2', createSets(4, 8), 120),
        createWorkoutExercise('ex-98', createSets(4, 10), 90),
        createWorkoutExercise('ex-9', createSets(4, 12), 75),
        createWorkoutExercise('ex-16', createSets(4, 15), 60),
        createWorkoutExercise('ex-18', createSets(5, 20), 45),
    ],
    isTemplate: true,
    originId: 'rt-ppl-legs'
};

const fullBody: Routine = {
    id: 'rt-full-body',
    name: 'Full Body Blast',
    description: 'A comprehensive workout hitting all major muscle groups.',
    exercises: [
        createWorkoutExercise('ex-2', createSets(3, 10), 90),
        createWorkoutExercise('ex-1', createSets(3, 10), 90),
        createWorkoutExercise('ex-5', createSets(3, 10), 90),
        createWorkoutExercise('ex-4', createSets(3, 10), 75),
        createWorkoutExercise('ex-15', createSets(3, 1), 60), // Plank, 1 rep = hold
    ],
    isTemplate: true,
    originId: 'rt-full-body'
};


export const PREDEFINED_ROUTINES: Routine[] = [
  strongLiftsA,
  strongLiftsB,
  phulUpper,
  phulLower,
  pplPush,
  pplPull,
  pplLegs,
  fullBody,
];