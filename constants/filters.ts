
import { BodyPart, ExerciseCategory, MuscleGroup } from '../types';

export const BODY_PART_OPTIONS: ReadonlyArray<BodyPart> = ['Chest', 'Back', 'Legs', 'Glutes', 'Shoulders', 'Biceps', 'Triceps', 'Core', 'Full Body', 'Calves', 'Forearms', 'Mobility', 'Cardio'];

export const CATEGORY_OPTIONS: ReadonlyArray<ExerciseCategory> = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Assisted Bodyweight', 'Kettlebell', 'Plyometrics', 'Reps Only', 'Cardio', 'Duration'];

export const MUSCLE_GROUP_OPTIONS: ReadonlyArray<MuscleGroup> = [
  'Pectorals', 'Upper Chest', 'Lower Chest', 'Serratus Anterior',
  'Lats', 'Traps', 'Rhomboids', 'Lower Back', 'Teres Major', 'Spinal Erectors',
  'Front Delts', 'Side Delts', 'Rear Delts', 'Rotator Cuff',
  'Biceps', 'Triceps', 'Brachialis', 'Forearms', 'Wrist Flexors', 'Wrist Extensors',
  'Quads', 'Hamstrings', 'Glutes', 'Adductors', 'Abductors', 'Calves', 'Soleus', 'Gastrocnemius', 'Tibialis Anterior', 'Hip Flexors',
  'Abs', 'Obliques', 'Transverse Abdominis',
  'Cardiovascular System'
];
