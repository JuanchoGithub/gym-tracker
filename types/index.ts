export type BodyPart = 'Chest' | 'Back' | 'Legs' | 'Glutes' | 'Shoulders' | 'Biceps' | 'Triceps' | 'Core' | 'Full Body' | 'Calves' | 'Forearms' | 'Mobility' | 'Cardio';

export type ExerciseCategory = 'Barbell' | 'Dumbbell' | 'Machine' | 'Cable' | 'Bodyweight' | 'Assisted Bodyweight' | 'Kettlebell' | 'Plyometrics' | 'Reps Only' | 'Cardio' | 'Duration';

export interface Exercise {
  id: string;
  name: string;
  bodyPart: BodyPart;
  category: ExerciseCategory;
  notes?: string;
}

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure';

export interface PerformedSet {
  id: string;
  reps: number;
  weight: number;
  type: SetType;
  isComplete?: boolean; // Added for tracking during workout
  rest?: number; // Optional override for rest time in seconds
}

export interface WorkoutExercise {
  id: string; // Unique ID for this instance in the routine/workout
  exerciseId: string;
  sets: PerformedSet[];
  restTime: {
    normal: number;
    warmup: number;
    drop: number;
  };
  note?: string;
  barWeight?: number;
}

export interface Routine {
  id:string;
  name: string;
  description: string;
  exercises: WorkoutExercise[];
  isTemplate?: boolean; // true for templates
  lastUsed?: number; // timestamp for latest workouts
  originId?: string; // The ID of the template this was based on
}

export interface WorkoutSession {
  id:string;
  routineId: string; // ID of the routine this session was started from
  routineName: string;
  startTime: number; // timestamp
  endTime: number; // timestamp
  exercises: WorkoutExercise[]; // This will store the completed sets
}

export interface ChartDataPoint {
    date: number;
    label: string;
    value: number;
}