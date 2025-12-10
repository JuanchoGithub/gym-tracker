
import { Exercise } from '../types';
import { MUSCLES } from './muscles';

export const CORE_EXERCISES: Exercise[] = [
  { id: 'ex-20', name: 'Crunches', bodyPart: 'Core', category: 'Bodyweight', primaryMuscles: [MUSCLES.ABS], secondaryMuscles: [] },
  { id: 'ex-15', name: 'Plank', bodyPart: 'Core', category: 'Bodyweight', isTimed: true, primaryMuscles: [MUSCLES.ABS, MUSCLES.TRANSVERSE_ABDOMINIS], secondaryMuscles: [MUSCLES.OBLIQUES, MUSCLES.FRONT_DELTS] },
  { id: 'ex-117', name: 'Russian Twist', bodyPart: 'Core', category: 'Dumbbell', primaryMuscles: [MUSCLES.OBLIQUES, MUSCLES.ABS], secondaryMuscles: [MUSCLES.HIP_FLEXORS] },
  { id: 'ex-118', name: 'Leg Raise', bodyPart: 'Core', category: 'Bodyweight', primaryMuscles: [MUSCLES.ABS, MUSCLES.HIP_FLEXORS], secondaryMuscles: [] },
  { id: 'ex-119', name: 'Woodchopper', bodyPart: 'Core', category: 'Cable', primaryMuscles: [MUSCLES.OBLIQUES, MUSCLES.ABS], secondaryMuscles: [MUSCLES.FRONT_DELTS] },
  { id: 'ex-120', name: 'Pallof Press', bodyPart: 'Core', category: 'Cable', primaryMuscles: [MUSCLES.OBLIQUES, MUSCLES.TRANSVERSE_ABDOMINIS], secondaryMuscles: [MUSCLES.ABS] },
  { id: 'ex-121', name: 'Bird Dog', bodyPart: 'Core', category: 'Bodyweight', primaryMuscles: [MUSCLES.LOWER_BACK, MUSCLES.ABS], secondaryMuscles: [MUSCLES.GLUTES, MUSCLES.FRONT_DELTS] },
  { id: 'ex-122', name: 'Dead Bug', bodyPart: 'Core', category: 'Bodyweight', primaryMuscles: [MUSCLES.ABS, MUSCLES.TRANSVERSE_ABDOMINIS], secondaryMuscles: [] },
  { id: 'ex-123', name: 'Cable Crunch', bodyPart: 'Core', category: 'Cable', primaryMuscles: [MUSCLES.ABS], secondaryMuscles: [] },
  { id: 'ex-124', name: 'Ab Wheel Rollout', bodyPart: 'Core', category: 'Reps Only', primaryMuscles: [MUSCLES.ABS, MUSCLES.LATS], secondaryMuscles: [MUSCLES.TRANSVERSE_ABDOMINIS, MUSCLES.TRICEPS] },
  { id: 'ex-125', name: 'Flutter Kick', bodyPart: 'Core', category: 'Bodyweight', isTimed: true, primaryMuscles: [MUSCLES.ABS, MUSCLES.HIP_FLEXORS], secondaryMuscles: [] },
  { id: 'ex-126', name: 'V-Up', bodyPart: 'Core', category: 'Bodyweight', primaryMuscles: [MUSCLES.ABS, MUSCLES.HIP_FLEXORS], secondaryMuscles: [] },
  { id: 'ex-127', name: 'Side Bend', bodyPart: 'Core', category: 'Dumbbell', primaryMuscles: [MUSCLES.OBLIQUES], secondaryMuscles: [MUSCLES.FOREARMS] },
  { id: 'ex-128', name: 'Vacuum', bodyPart: 'Core', category: 'Bodyweight', isTimed: true, primaryMuscles: [MUSCLES.TRANSVERSE_ABDOMINIS], secondaryMuscles: [] },
  { id: 'ex-156', name: 'Hanging Leg Raise', bodyPart: 'Core', category: 'Assisted Bodyweight', primaryMuscles: [MUSCLES.ABS, MUSCLES.HIP_FLEXORS], secondaryMuscles: [MUSCLES.FOREARMS, MUSCLES.LATS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-157', name: 'Side Plank', bodyPart: 'Core', category: 'Bodyweight', isTimed: true, primaryMuscles: [MUSCLES.OBLIQUES], secondaryMuscles: [MUSCLES.ABS, MUSCLES.SIDE_DELTS] },
  { id: 'ex-159', name: 'Push-up and Rotation', bodyPart: 'Core', category: 'Bodyweight', primaryMuscles: [MUSCLES.OBLIQUES, MUSCLES.ABS], secondaryMuscles: [MUSCLES.PECTORALS, MUSCLES.FRONT_DELTS] },
];
