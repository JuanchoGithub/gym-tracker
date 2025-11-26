
import { BodyPart, MuscleGroup } from '../types';

export const MUSCLES = {
  // Chest
  PECTORALS: 'Pectorals',
  UPPER_CHEST: 'Upper Chest',
  LOWER_CHEST: 'Lower Chest',
  SERRATUS_ANTERIOR: 'Serratus Anterior',

  // Back
  LATS: 'Lats',
  TRAPS: 'Traps',
  RHOMBOIDS: 'Rhomboids',
  LOWER_BACK: 'Lower Back',
  TERES_MAJOR: 'Teres Major',
  SPINAL_ERECTORS: 'Spinal Erectors',

  // Shoulders
  FRONT_DELTS: 'Front Delts',
  SIDE_DELTS: 'Side Delts',
  REAR_DELTS: 'Rear Delts',
  ROTATOR_CUFF: 'Rotator Cuff',

  // Arms
  BICEPS: 'Biceps',
  TRICEPS: 'Triceps',
  BRACHIALIS: 'Brachialis',
  FOREARMS: 'Forearms',
  WRIST_FLEXORS: 'Wrist Flexors',
  WRIST_EXTENSORS: 'Wrist Extensors',

  // Legs
  QUADS: 'Quads',
  HAMSTRINGS: 'Hamstrings',
  GLUTES: 'Glutes',
  ADDUCTORS: 'Adductors',
  ABDUCTORS: 'Abductors',
  CALVES: 'Calves',
  SOLEUS: 'Soleus',
  GASTROCNEMIUS: 'Gastrocnemius',
  TIBIALIS_ANTERIOR: 'Tibialis Anterior',
  HIP_FLEXORS: 'Hip Flexors',

  // Core
  ABS: 'Abs',
  OBLIQUES: 'Obliques',
  TRANSVERSE_ABDOMINIS: 'Transverse Abdominis',

  // Cardio
  CARDIOVASCULAR_SYSTEM: 'Cardiovascular System',
} as const;

export const BODY_PART_TO_MUSCLES: Record<BodyPart, MuscleGroup[]> = {
  'Chest': [MUSCLES.PECTORALS, MUSCLES.UPPER_CHEST, MUSCLES.LOWER_CHEST, MUSCLES.SERRATUS_ANTERIOR],
  'Back': [MUSCLES.LATS, MUSCLES.TRAPS, MUSCLES.RHOMBOIDS, MUSCLES.LOWER_BACK, MUSCLES.TERES_MAJOR, MUSCLES.SPINAL_ERECTORS],
  'Shoulders': [MUSCLES.FRONT_DELTS, MUSCLES.SIDE_DELTS, MUSCLES.REAR_DELTS, MUSCLES.ROTATOR_CUFF],
  'Biceps': [MUSCLES.BICEPS, MUSCLES.BRACHIALIS, MUSCLES.FOREARMS],
  'Triceps': [MUSCLES.TRICEPS],
  'Legs': [MUSCLES.QUADS, MUSCLES.HAMSTRINGS, MUSCLES.ADDUCTORS, MUSCLES.ABDUCTORS, MUSCLES.TIBIALIS_ANTERIOR],
  'Glutes': [MUSCLES.GLUTES],
  'Core': [MUSCLES.ABS, MUSCLES.OBLIQUES, MUSCLES.TRANSVERSE_ABDOMINIS, MUSCLES.LOWER_BACK],
  'Calves': [MUSCLES.CALVES, MUSCLES.SOLEUS, MUSCLES.GASTROCNEMIUS],
  'Forearms': [MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS, MUSCLES.WRIST_EXTENSORS],
  'Full Body': Object.values(MUSCLES), // Heuristic
  'Cardio': [MUSCLES.CARDIOVASCULAR_SYSTEM, MUSCLES.QUADS, MUSCLES.CALVES],
  'Mobility': Object.values(MUSCLES),
};
