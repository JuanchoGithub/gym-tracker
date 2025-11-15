import { BodyPart, ExerciseCategory } from '../types';

export const BODY_PART_OPTIONS: ReadonlyArray<BodyPart> = ['Chest', 'Back', 'Legs', 'Glutes', 'Shoulders', 'Biceps', 'Triceps', 'Core', 'Full Body', 'Calves', 'Forearms', 'Mobility', 'Cardio'];

// FIX: Added 'Duration' to the list of category options.
export const CATEGORY_OPTIONS: ReadonlyArray<ExerciseCategory> = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Assisted Bodyweight', 'Kettlebell', 'Plyometrics', 'Reps Only', 'Cardio', 'Duration'];