
import { Exercise } from '../types';
import { MUSCLES } from './muscles';

export const ARM_EXERCISES: Exercise[] = [
  // Biceps
  { id: 'ex-7', name: 'Barbell Curl', bodyPart: 'Biceps', category: 'Barbell', primaryMuscles: [MUSCLES.BICEPS], secondaryMuscles: [MUSCLES.FOREARMS, MUSCLES.BRACHIALIS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-13', name: 'Bicep Curl', bodyPart: 'Biceps', category: 'Dumbbell', primaryMuscles: [MUSCLES.BICEPS], secondaryMuscles: [MUSCLES.FOREARMS, MUSCLES.BRACHIALIS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-73', name: 'Hammer Curl', bodyPart: 'Biceps', category: 'Dumbbell', primaryMuscles: [MUSCLES.BRACHIALIS, MUSCLES.FOREARMS], secondaryMuscles: [MUSCLES.BICEPS, MUSCLES.WRIST_EXTENSORS] },
  { id: 'ex-74', name: 'Concentration Curl', bodyPart: 'Biceps', category: 'Dumbbell', primaryMuscles: [MUSCLES.BICEPS], secondaryMuscles: [MUSCLES.BRACHIALIS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-75', name: 'Preacher Curl', bodyPart: 'Biceps', category: 'Machine', primaryMuscles: [MUSCLES.BICEPS], secondaryMuscles: [MUSCLES.BRACHIALIS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-76', name: 'Cable Curl', bodyPart: 'Biceps', category: 'Cable', primaryMuscles: [MUSCLES.BICEPS], secondaryMuscles: [MUSCLES.FOREARMS, MUSCLES.BRACHIALIS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-77', name: 'Incline Dumbbell Curl', bodyPart: 'Biceps', category: 'Dumbbell', primaryMuscles: [MUSCLES.BICEPS], secondaryMuscles: [MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS] }, // Stretch focused
  { id: 'ex-78', name: '21s Curl', bodyPart: 'Biceps', category: 'Barbell', primaryMuscles: [MUSCLES.BICEPS], secondaryMuscles: [MUSCLES.FOREARMS, MUSCLES.BRACHIALIS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-79', name: 'Spider Curl', bodyPart: 'Biceps', category: 'Barbell', primaryMuscles: [MUSCLES.BICEPS], secondaryMuscles: [MUSCLES.BRACHIALIS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-80', name: 'Zottman Curl', bodyPart: 'Biceps', category: 'Dumbbell', primaryMuscles: [MUSCLES.BICEPS, MUSCLES.FOREARMS], secondaryMuscles: [MUSCLES.BRACHIALIS, MUSCLES.WRIST_EXTENSORS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-81', name: 'Bayesian Cable Curl', bodyPart: 'Biceps', category: 'Cable', primaryMuscles: [MUSCLES.BICEPS], secondaryMuscles: [MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-82', name: 'Isometric Bicep Hold', bodyPart: 'Biceps', category: 'Bodyweight', primaryMuscles: [MUSCLES.BICEPS], secondaryMuscles: [MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-83', name: 'Band Curl', bodyPart: 'Biceps', category: 'Reps Only', primaryMuscles: [MUSCLES.BICEPS], secondaryMuscles: [MUSCLES.FOREARMS] },
  { id: 'ex-84', name: 'Drag Curl', bodyPart: 'Biceps', category: 'Barbell', primaryMuscles: [MUSCLES.BICEPS], secondaryMuscles: [MUSCLES.REAR_DELTS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS] },

  // Triceps
  { id: 'ex-8', name: 'Skull Crusher', bodyPart: 'Triceps', category: 'Barbell', primaryMuscles: [MUSCLES.TRICEPS], secondaryMuscles: [MUSCLES.FOREARMS] },
  { id: 'ex-14', name: 'Tricep Extension', bodyPart: 'Triceps', category: 'Cable', primaryMuscles: [MUSCLES.TRICEPS], secondaryMuscles: [MUSCLES.FOREARMS] },
  { id: 'ex-85', name: 'Tricep Pushdown', bodyPart: 'Triceps', category: 'Cable', primaryMuscles: [MUSCLES.TRICEPS], secondaryMuscles: [MUSCLES.ABS, MUSCLES.FOREARMS] },
  { id: 'ex-86', name: 'Overhead Tricep Extension', bodyPart: 'Triceps', category: 'Dumbbell', primaryMuscles: [MUSCLES.TRICEPS], secondaryMuscles: [MUSCLES.FOREARMS] },
  { id: 'ex-87', name: 'Close-Grip Bench Press', bodyPart: 'Triceps', category: 'Barbell', primaryMuscles: [MUSCLES.TRICEPS], secondaryMuscles: [MUSCLES.PECTORALS, MUSCLES.FRONT_DELTS] },
  { id: 'ex-88', name: 'French Press', bodyPart: 'Triceps', category: 'Barbell', primaryMuscles: [MUSCLES.TRICEPS], secondaryMuscles: [MUSCLES.FOREARMS] },
  { id: 'ex-89', name: 'Bench Dip', bodyPart: 'Triceps', category: 'Bodyweight', primaryMuscles: [MUSCLES.TRICEPS], secondaryMuscles: [MUSCLES.FRONT_DELTS, MUSCLES.PECTORALS] },
  { id: 'ex-90', name: 'Rope Pushdown', bodyPart: 'Triceps', category: 'Cable', primaryMuscles: [MUSCLES.TRICEPS], secondaryMuscles: [MUSCLES.FOREARMS] },
  { id: 'ex-91', name: 'JM Press', bodyPart: 'Triceps', category: 'Barbell', primaryMuscles: [MUSCLES.TRICEPS], secondaryMuscles: [MUSCLES.PECTORALS, MUSCLES.FRONT_DELTS, MUSCLES.FOREARMS] },
  { id: 'ex-92', name: 'Kickback', bodyPart: 'Triceps', category: 'Dumbbell', primaryMuscles: [MUSCLES.TRICEPS], secondaryMuscles: [MUSCLES.REAR_DELTS] },
  { id: 'ex-93', name: 'Reverse Grip Pushdown', bodyPart: 'Triceps', category: 'Cable', primaryMuscles: [MUSCLES.TRICEPS], secondaryMuscles: [MUSCLES.FOREARMS] },
  { id: 'ex-94', name: 'Cross-Body Extension', bodyPart: 'Triceps', category: 'Dumbbell', primaryMuscles: [MUSCLES.TRICEPS], secondaryMuscles: [MUSCLES.FOREARMS] },
  { id: 'ex-95', name: 'Band Pushdown', bodyPart: 'Triceps', category: 'Reps Only', primaryMuscles: [MUSCLES.TRICEPS], secondaryMuscles: [] },
  { id: 'ex-96', name: 'Partial Tricep Extension', bodyPart: 'Triceps', category: 'Cable', primaryMuscles: [MUSCLES.TRICEPS], secondaryMuscles: [] },
  { id: 'ex-97', name: 'Isometric Tricep Squeeze', bodyPart: 'Triceps', category: 'Bodyweight', primaryMuscles: [MUSCLES.TRICEPS], secondaryMuscles: [] },

  // Forearms
  { id: 'ex-139', name: 'Wrist Curl', bodyPart: 'Forearms', category: 'Dumbbell', primaryMuscles: [MUSCLES.WRIST_FLEXORS], secondaryMuscles: [MUSCLES.FOREARMS] },
  { id: 'ex-140', name: 'Reverse Wrist Curl', bodyPart: 'Forearms', category: 'Dumbbell', primaryMuscles: [MUSCLES.WRIST_EXTENSORS], secondaryMuscles: [MUSCLES.FOREARMS] },
];
