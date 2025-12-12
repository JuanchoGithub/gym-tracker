
import { Exercise } from '../types';
import { MUSCLES } from './muscles';

export const BACK_EXERCISES: Exercise[] = [
  { id: 'ex-5', name: 'Barbell Row', bodyPart: 'Back', category: 'Barbell', primaryMuscles: [MUSCLES.LATS, MUSCLES.RHOMBOIDS, MUSCLES.TRAPS], secondaryMuscles: [MUSCLES.BICEPS, MUSCLES.BRACHIALIS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS, MUSCLES.REAR_DELTS, MUSCLES.LOWER_BACK] },
  { id: 'ex-10', name: 'Lat Pulldown', bodyPart: 'Back', category: 'Cable', primaryMuscles: [MUSCLES.LATS], secondaryMuscles: [MUSCLES.BICEPS, MUSCLES.BRACHIALIS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS, MUSCLES.TERES_MAJOR] },
  { id: 'ex-3', name: 'Deadlift', bodyPart: 'Back', category: 'Barbell', primaryMuscles: [MUSCLES.LOWER_BACK, MUSCLES.HAMSTRINGS, MUSCLES.GLUTES, MUSCLES.TRAPS], secondaryMuscles: [MUSCLES.LATS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS, MUSCLES.QUADS, MUSCLES.ABS] },
  { id: 'ex-6', name: 'Pull Up', bodyPart: 'Back', category: 'Assisted Bodyweight', primaryMuscles: [MUSCLES.LATS, MUSCLES.TERES_MAJOR], secondaryMuscles: [MUSCLES.BICEPS, MUSCLES.BRACHIALIS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS, MUSCLES.RHOMBOIDS, MUSCLES.TRAPS] },
  { id: 'ex-38', name: 'Seated Row', bodyPart: 'Back', category: 'Cable', primaryMuscles: [MUSCLES.LATS, MUSCLES.RHOMBOIDS, MUSCLES.TRAPS], secondaryMuscles: [MUSCLES.BICEPS, MUSCLES.BRACHIALIS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS, MUSCLES.REAR_DELTS] },
  { id: 'ex-39', name: 'T-Bar Row', bodyPart: 'Back', category: 'Machine', primaryMuscles: [MUSCLES.LATS, MUSCLES.TRAPS, MUSCLES.RHOMBOIDS], secondaryMuscles: [MUSCLES.BICEPS, MUSCLES.BRACHIALIS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS, MUSCLES.LOWER_BACK] },
  { id: 'ex-40', name: 'Single-Arm Dumbbell Row', bodyPart: 'Back', category: 'Dumbbell', isUnilateral: true, primaryMuscles: [MUSCLES.LATS], secondaryMuscles: [MUSCLES.BICEPS, MUSCLES.BRACHIALIS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS, MUSCLES.RHOMBOIDS, MUSCLES.REAR_DELTS] },
  { id: 'ex-41', name: 'Face Pull', bodyPart: 'Back', category: 'Cable', primaryMuscles: [MUSCLES.REAR_DELTS, MUSCLES.ROTATOR_CUFF, MUSCLES.TRAPS], secondaryMuscles: [MUSCLES.RHOMBOIDS, MUSCLES.BICEPS, MUSCLES.FOREARMS] },
  { id: 'ex-42', name: 'Inverted Row', bodyPart: 'Back', category: 'Bodyweight', primaryMuscles: [MUSCLES.LATS, MUSCLES.RHOMBOIDS], secondaryMuscles: [MUSCLES.BICEPS, MUSCLES.BRACHIALIS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS, MUSCLES.REAR_DELTS, MUSCLES.ABS] },
  { id: 'ex-43', name: 'Rack Pull', bodyPart: 'Back', category: 'Barbell', primaryMuscles: [MUSCLES.TRAPS, MUSCLES.LOWER_BACK], secondaryMuscles: [MUSCLES.LATS, MUSCLES.GLUTES, MUSCLES.HAMSTRINGS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-44', name: 'Straight-Arm Pulldown', bodyPart: 'Back', category: 'Cable', primaryMuscles: [MUSCLES.LATS, MUSCLES.TERES_MAJOR], secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.ABS, MUSCLES.SERRATUS_ANTERIOR] },
  { id: 'ex-45', name: 'Hyperextension', bodyPart: 'Back', category: 'Bodyweight', primaryMuscles: [MUSCLES.LOWER_BACK], secondaryMuscles: [MUSCLES.GLUTES, MUSCLES.HAMSTRINGS, MUSCLES.SPINAL_ERECTORS] },
  { id: 'ex-46', name: 'Superman', bodyPart: 'Back', category: 'Bodyweight', primaryMuscles: [MUSCLES.LOWER_BACK], secondaryMuscles: [MUSCLES.GLUTES, MUSCLES.SPINAL_ERECTORS] },
  { id: 'ex-47', name: 'Renegade Row', bodyPart: 'Back', category: 'Dumbbell', isUnilateral: true, primaryMuscles: [MUSCLES.LATS, MUSCLES.ABS], secondaryMuscles: [MUSCLES.BICEPS, MUSCLES.BRACHIALIS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS, MUSCLES.FRONT_DELTS, MUSCLES.OBLIQUES] },
  { id: 'ex-48', name: 'Meadows Row', bodyPart: 'Back', category: 'Barbell', isUnilateral: true, primaryMuscles: [MUSCLES.LATS, MUSCLES.RHOMBOIDS], secondaryMuscles: [MUSCLES.BICEPS, MUSCLES.BRACHIALIS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS, MUSCLES.REAR_DELTS] },
  { id: 'ex-49', name: 'Cable Pull-Over', bodyPart: 'Back', category: 'Cable', primaryMuscles: [MUSCLES.LATS], secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.SERRATUS_ANTERIOR, MUSCLES.ABS] },
  { id: 'ex-50', name: 'Chin-Up', bodyPart: 'Back', category: 'Assisted Bodyweight', primaryMuscles: [MUSCLES.LATS, MUSCLES.BICEPS], secondaryMuscles: [MUSCLES.BRACHIALIS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS, MUSCLES.RHOMBOIDS] },
  { id: 'ex-51', name: 'Shrugs', bodyPart: 'Back', category: 'Dumbbell', primaryMuscles: [MUSCLES.TRAPS], secondaryMuscles: [MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-52', name: 'Reverse Grip Pulldown', bodyPart: 'Back', category: 'Cable', primaryMuscles: [MUSCLES.LATS, MUSCLES.BICEPS], secondaryMuscles: [MUSCLES.BRACHIALIS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS, MUSCLES.RHOMBOIDS] },
  { id: 'ex-53', name: 'Band Pull-Apart', bodyPart: 'Back', category: 'Reps Only', primaryMuscles: [MUSCLES.REAR_DELTS, MUSCLES.RHOMBOIDS], secondaryMuscles: [MUSCLES.TRAPS] },
  { id: 'ex-54', name: 'Farmer\'s Carry', bodyPart: 'Back', category: 'Dumbbell', isTimed: true, primaryMuscles: [MUSCLES.TRAPS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS], secondaryMuscles: [MUSCLES.ABS, MUSCLES.OBLIQUES, MUSCLES.GLUTES, MUSCLES.QUADS, MUSCLES.HAMSTRINGS] },
  { id: 'ex-55', name: 'Good Morning', bodyPart: 'Back', category: 'Barbell', primaryMuscles: [MUSCLES.LOWER_BACK, MUSCLES.HAMSTRINGS, MUSCLES.GLUTES], secondaryMuscles: [MUSCLES.ABS, MUSCLES.SPINAL_ERECTORS] },
  { id: 'ex-148', name: 'Kettlebell High Pull', bodyPart: 'Back', category: 'Kettlebell', isUnilateral: true, primaryMuscles: [MUSCLES.TRAPS, MUSCLES.REAR_DELTS], secondaryMuscles: [MUSCLES.LATS, MUSCLES.BICEPS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS] },
];