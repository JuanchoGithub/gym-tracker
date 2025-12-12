
import { Exercise } from '../types';
import { MUSCLES } from './muscles';

export const SHOULDER_EXERCISES: Exercise[] = [
  { id: 'ex-4', name: 'Overhead Press', bodyPart: 'Shoulders', category: 'Barbell', primaryMuscles: [MUSCLES.FRONT_DELTS, MUSCLES.SIDE_DELTS], secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.UPPER_CHEST, MUSCLES.SERRATUS_ANTERIOR, MUSCLES.TRAPS] },
  { id: 'ex-56', name: 'Lateral Raise', bodyPart: 'Shoulders', category: 'Dumbbell', primaryMuscles: [MUSCLES.SIDE_DELTS], secondaryMuscles: [MUSCLES.TRAPS, MUSCLES.FOREARMS] },
  { id: 'ex-57', name: 'Front Raise', bodyPart: 'Shoulders', category: 'Dumbbell', primaryMuscles: [MUSCLES.FRONT_DELTS], secondaryMuscles: [MUSCLES.UPPER_CHEST, MUSCLES.FOREARMS] },
  { id: 'ex-58', name: 'Rear Delt Fly', bodyPart: 'Shoulders', category: 'Dumbbell', primaryMuscles: [MUSCLES.REAR_DELTS], secondaryMuscles: [MUSCLES.RHOMBOIDS, MUSCLES.TRAPS, MUSCLES.FOREARMS] },
  { id: 'ex-59', name: 'Upright Row', bodyPart: 'Shoulders', category: 'Barbell', primaryMuscles: [MUSCLES.SIDE_DELTS, MUSCLES.TRAPS], secondaryMuscles: [MUSCLES.BICEPS, MUSCLES.BRACHIALIS, MUSCLES.FOREARMS, MUSCLES.FRONT_DELTS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-60', name: 'Arnold Press', bodyPart: 'Shoulders', category: 'Dumbbell', primaryMuscles: [MUSCLES.FRONT_DELTS, MUSCLES.SIDE_DELTS], secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.TRAPS] },
  { id: 'ex-61', name: 'Cable Lateral Raise', bodyPart: 'Shoulders', category: 'Cable', isUnilateral: true, primaryMuscles: [MUSCLES.SIDE_DELTS], secondaryMuscles: [MUSCLES.FOREARMS] },
  { id: 'ex-62', name: 'Pike Push-Up', bodyPart: 'Shoulders', category: 'Bodyweight', primaryMuscles: [MUSCLES.FRONT_DELTS], secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.UPPER_CHEST, MUSCLES.SERRATUS_ANTERIOR, MUSCLES.TRAPS] },
  { id: 'ex-63', name: 'Handstand Push-Up', bodyPart: 'Shoulders', category: 'Bodyweight', primaryMuscles: [MUSCLES.FRONT_DELTS, MUSCLES.TRICEPS], secondaryMuscles: [MUSCLES.SIDE_DELTS, MUSCLES.SERRATUS_ANTERIOR, MUSCLES.TRAPS] },
  { id: 'ex-64', name: 'Egyptian Lateral Raise', bodyPart: 'Shoulders', category: 'Dumbbell', isUnilateral: true, primaryMuscles: [MUSCLES.SIDE_DELTS], secondaryMuscles: [MUSCLES.FOREARMS] },
  { id: 'ex-65', name: 'Y-Raise', bodyPart: 'Shoulders', category: 'Dumbbell', primaryMuscles: [MUSCLES.SIDE_DELTS, MUSCLES.TRAPS], secondaryMuscles: [MUSCLES.REAR_DELTS, MUSCLES.FOREARMS] },
  { id: 'ex-66', name: 'Cuban Press', bodyPart: 'Shoulders', category: 'Dumbbell', primaryMuscles: [MUSCLES.ROTATOR_CUFF, MUSCLES.SIDE_DELTS], secondaryMuscles: [MUSCLES.TRAPS, MUSCLES.FOREARMS] },
  { id: 'ex-67', name: 'Machine Shoulder Press', bodyPart: 'Shoulders', category: 'Machine', primaryMuscles: [MUSCLES.FRONT_DELTS], secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.SIDE_DELTS] },
  { id: 'ex-68', name: 'Behind-the-Neck Press', bodyPart: 'Shoulders', category: 'Barbell', primaryMuscles: [MUSCLES.SIDE_DELTS, MUSCLES.FRONT_DELTS], secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.TRAPS] },
  { id: 'ex-69', name: 'Plate Front Raise', bodyPart: 'Shoulders', category: 'Reps Only', primaryMuscles: [MUSCLES.FRONT_DELTS], secondaryMuscles: [MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-70', name: 'Band Shoulder Press', bodyPart: 'Shoulders', category: 'Reps Only', primaryMuscles: [MUSCLES.FRONT_DELTS], secondaryMuscles: [MUSCLES.TRICEPS] },
  { id: 'ex-71', name: 'Dumbbell Shrugs', bodyPart: 'Shoulders', category: 'Dumbbell', primaryMuscles: [MUSCLES.TRAPS], secondaryMuscles: [MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-72', name: 'Wall Slide', bodyPart: 'Shoulders', category: 'Bodyweight', primaryMuscles: [MUSCLES.ROTATOR_CUFF, MUSCLES.SERRATUS_ANTERIOR], secondaryMuscles: [MUSCLES.TRAPS] },
];