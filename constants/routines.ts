

import { Routine, PerformedSet, WorkoutExercise } from '../types';
import { PREDEFINED_EXERCISES } from './exercises';

const createSets = (count: number, reps: number, isWarmup: boolean = false): PerformedSet[] => Array.from({ length: count }, (_, i) => ({
  id: `set-${Date.now()}-${Math.random()}-${i}`,
  reps,
  weight: 0,
  type: isWarmup ? 'warmup' : 'normal',
  isComplete: false
}));

const createWorkoutExercise = (exerciseId: string, sets: PerformedSet[], restTime: number, note?: string): WorkoutExercise => {
    const exercise = PREDEFINED_EXERCISES.find(ex => ex.id === exerciseId);
    if (exercise && exercise.isTimed) {
        sets.forEach(set => {
            set.type = 'timed';
            set.time = 60; // default to 60 seconds
            if(set.reps === 0 || set.reps > 1) {
                set.reps = 1; // for timed sets, reps is usually 1 (meaning one round of that time)
            }
        });
    }

    return {
        id: `re-${Math.random()}`,
        exerciseId,
        sets,
        note,
        restTime: {
            normal: restTime,
            warmup: 60,
            drop: 30,
            timed: 10,
            effort: 180,
            failure: 300
        }
    };
};

const createHiitExercise = (exerciseId: string): WorkoutExercise => ({
    id: `we-${exerciseId}-${Math.random()}`,
    exerciseId,
    sets: [{ id: `set-${Math.random()}`, reps: 1, weight: 0, type: 'normal', isComplete: false }], // Dummy set for type compatibility
    restTime: { normal: 0, warmup: 0, drop: 0, timed: 0, effort: 0, failure: 0 },
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

const sevenMinWorkout: Routine = {
    id: 'rt-hiit-7min',
    name: 'Classic 7-Minute Workout',
    description: '12 bodyweight exercises performed for 30 seconds with 10 seconds of rest in between.',
    exercises: [
        createHiitExercise('ex-129'), // Jumping Jacks
        createHiitExercise('ex-111'), // Wall Sit
        createHiitExercise('ex-23'),  // Push-Up
        createHiitExercise('ex-20'),  // Crunches
        createHiitExercise('ex-161'), // Step-Up (Bodyweight)
        createHiitExercise('ex-160'), // Squat (Bodyweight)
        createHiitExercise('ex-89'),  // Bench Dip
        createHiitExercise('ex-15'),  // Plank
        createHiitExercise('ex-158'), // High Knees
        createHiitExercise('ex-162'), // Lunge (Bodyweight)
        createHiitExercise('ex-159'), // Push-up and Rotation
        createHiitExercise('ex-157'), // Side Plank
    ],
    isTemplate: true,
    routineType: 'hiit',
    hiitConfig: {
        workTime: 30,
        restTime: 10,
        prepareTime: 10,
    },
    originId: 'rt-hiit-7min'
};

const beginnerHiitExercises = [
    createHiitExercise('ex-129'), // Jumping Jacks
    createHiitExercise('ex-160'), // Squat (Bodyweight)
    createHiitExercise('ex-131'), // Mountain Climber
    createHiitExercise('ex-23'),  // Push-up
    createHiitExercise('ex-104'), // Glute Bridge
];

const beginnerHiit: Routine = {
    id: 'rt-hiit-beginner',
    name: 'Beginner HIIT Circuit',
    description: 'A 15-minute workout with 30s work and 30s rest. Complete 3 rounds.',
    exercises: [...beginnerHiitExercises, ...beginnerHiitExercises, ...beginnerHiitExercises],
    isTemplate: true,
    routineType: 'hiit',
    hiitConfig: {
        workTime: 30,
        restTime: 30,
        prepareTime: 10,
    },
    originId: 'rt-hiit-beginner'
};

// --- Anatoly Inspired Routines ---

const anatolySquat: Routine = {
    id: 'rt-anatoly-squat',
    name: 'Anatoly - Squat Focus (Day A)',
    description: 'Focus on maximal leg strength and explosive power. Use ~80% 1RM for main lifts.',
    exercises: [
        createWorkoutExercise('ex-2', createSets(4, 5), 180, 'anatoly_squat_ex_1_note'),
        createWorkoutExercise('ex-101', createSets(3, 8), 120, 'anatoly_squat_ex_2_note'),
        createWorkoutExercise('ex-98', createSets(3, 8), 120, 'anatoly_squat_ex_3_note'),
        createWorkoutExercise('ex-9', createSets(3, 10), 90, 'anatoly_squat_ex_4_note'),
        createWorkoutExercise('ex-18', createSets(3, 12), 60),
        createWorkoutExercise('ex-15', createSets(3, 1), 60), // Plank
    ],
    isTemplate: true,
    originId: 'rt-anatoly-squat',
    routineType: 'strength',
    tags: ['powerbuilding', 'legs']
};

const anatolyBench: Routine = {
    id: 'rt-anatoly-bench',
    name: 'Anatoly - Bench Focus (Day B)',
    description: 'Upper body pushing strength and hypertrophy. 80% 1RM on bench.',
    exercises: [
        createWorkoutExercise('ex-1', createSets(4, 5), 180, 'anatoly_bench_ex_1_note'),
        createWorkoutExercise('ex-87', createSets(3, 8), 120, 'anatoly_bench_ex_2_note'),
        createWorkoutExercise('ex-11', createSets(3, 10), 90, 'anatoly_bench_ex_3_note'),
        createWorkoutExercise('ex-4', createSets(3, 8), 120, 'anatoly_bench_ex_4_note'),
        createWorkoutExercise('ex-24', createSets(3, 10), 90), // Dips
        createWorkoutExercise('ex-5', createSets(3, 8), 90, 'anatoly_bench_ex_6_note'),
    ],
    isTemplate: true,
    originId: 'rt-anatoly-bench',
    routineType: 'strength',
    tags: ['powerbuilding', 'push']
};

const anatolyDeadlift: Routine = {
    id: 'rt-anatoly-deadlift',
    name: 'Anatoly - Deadlift Focus (Day C)',
    description: 'Posterior chain power and back thickness. 80% 1RM on deadlifts.',
    exercises: [
        createWorkoutExercise('ex-3', createSets(4, 5), 180, 'anatoly_deadlift_ex_1_note'),
        createWorkoutExercise('ex-3', createSets(3, 6), 150, 'anatoly_deadlift_ex_2_note'),
        createWorkoutExercise('ex-104', createSets(3, 10), 90, 'anatoly_deadlift_ex_3_note'),
        createWorkoutExercise('ex-6', createSets(3, 8), 120, 'anatoly_deadlift_ex_4_note'),
        createWorkoutExercise('ex-41', createSets(3, 12), 60, 'anatoly_deadlift_ex_5_note'),
        createWorkoutExercise('ex-156', createSets(3, 12), 60), // Hanging Leg Raise
    ],
    isTemplate: true,
    originId: 'rt-anatoly-deadlift',
    routineType: 'strength',
    tags: ['powerbuilding', 'pull']
};

const anatolyAccessory: Routine = {
    id: 'rt-anatoly-accessory',
    name: 'Anatoly - Accessory (Day D)',
    description: 'Explosive power and weak point training. Use ~70% 1RM for paused lifts.',
    exercises: [
        createWorkoutExercise('ex-1', createSets(4, 5), 150, 'anatoly_accessory_ex_1_note'),
        createWorkoutExercise('ex-2', createSets(3, 5), 150, 'anatoly_accessory_ex_2_note'),
        createWorkoutExercise('ex-40', createSets(3, 8), 90, 'anatoly_accessory_ex_3_note'),
        createWorkoutExercise('ex-7', createSets(3, 12), 60, 'anatoly_accessory_ex_4_note'),
        createWorkoutExercise('ex-85', createSets(3, 12), 60, 'anatoly_accessory_ex_5_note'),
    ],
    isTemplate: true,
    originId: 'rt-anatoly-accessory',
    routineType: 'strength',
    tags: ['powerbuilding', 'accessory']
};


export const PREDEFINED_ROUTINES: Routine[] = [
  anatolySquat,
  anatolyBench,
  anatolyDeadlift,
  anatolyAccessory,
  strongLiftsA,
  strongLiftsB,
  phulUpper,
  phulLower,
  pplPush,
  pplPull,
  pplLegs,
  fullBody,
  sevenMinWorkout,
  beginnerHiit,
];