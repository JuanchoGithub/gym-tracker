
import { MUSCLES } from '../constants/muscles';

export type BodyPart = 'Chest' | 'Back' | 'Legs' | 'Glutes' | 'Shoulders' | 'Biceps' | 'Triceps' | 'Core' | 'Full Body' | 'Calves' | 'Forearms' | 'Mobility' | 'Cardio';

export type MuscleGroup = typeof MUSCLES[keyof typeof MUSCLES];

// FIX: Added 'Duration' to the ExerciseCategory type to match its usage in the application.
export type ExerciseCategory = 'Barbell' | 'Dumbbell' | 'Machine' | 'Cable' | 'Bodyweight' | 'Assisted Bodyweight' | 'Kettlebell' | 'Plyometrics' | 'Reps Only' | 'Cardio' | 'Duration' | 'Smith Machine';

export interface Exercise {
  id: string;
  name: string;
  bodyPart: BodyPart;
  category: ExerciseCategory;
  notes?: string;
  isTimed?: boolean;
  primaryMuscles?: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
}

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure' | 'timed';

export interface PerformedSet {
  id: string;
  reps: number;
  weight: number;
  time?: number; // duration in seconds for timed sets
  type: SetType;
  isComplete?: boolean; // Added for tracking during workout
  completedAt?: number; // Timestamp when the set was marked complete
  rest?: number; // Optional override for rest time in seconds
  isWeightInherited?: boolean;
  isRepsInherited?: boolean;
  isTimeInherited?: boolean;
  actualRest?: number; // The actual rest time taken after this set
  historicalWeight?: number;
  historicalReps?: number;
  historicalTime?: number;
  storedBodyWeight?: number; // Snapshot of user bodyweight when set was completed
}

export interface WorkoutExercise {
  id: string; // Unique ID for this instance in the routine/workout
  exerciseId: string;
  sets: PerformedSet[];
  restTime: {
    normal: number;
    warmup: number;
    drop: number;
    timed: number;
    effort: number;
    failure: number;
  };
  note?: string;
  barWeight?: number;
  supersetId?: string;
}

export interface SupersetDefinition {
  id: string;
  name: string;
  color?: string;
}

export interface Routine {
  id:string;
  name: string;
  description: string;
  exercises: WorkoutExercise[];
  supersets?: Record<string, SupersetDefinition>;
  isTemplate?: boolean; // true for templates
  lastUsed?: number; // timestamp for latest workouts
  originId?: string; // The ID of the template this was based on
  routineType?: 'strength' | 'hiit';
  hiitConfig?: {
    workTime: number;
    restTime: number;
    prepareTime?: number;
  };
  tags?: string[]; // e.g., ['recovery', 'generated', 'gap_session']
}

export interface WorkoutSession {
  id:string;
  routineId: string; // ID of the routine this session was started from
  routineName: string;
  startTime: number;
  endTime: number; // timestamp
  exercises: WorkoutExercise[]; // This will store the completed sets
  supersets?: Record<string, SupersetDefinition>;
  prCount?: number;
}

export interface ActiveHiitSession {
    routine: Routine;
    startTime: number;
}

export interface ChartDataPoint {
    date: number;
    label: string;
    value: number;
}

export interface WeightEntry {
  date: number; // timestamp
  weight: number; // in kg
}

export interface UnlockEvent {
  date: number;
  fromExercise: string;
  toExercise: string;
}

export interface OneRepMaxEntry {
  exerciseId: string;
  weight: number; // in kg
  date: number;
  method: 'calculated' | 'tested'; // 'calculated' from e.g. a 5x5 set, 'tested' via the wizard
}

export interface AutoUpdateEntry {
    oldWeight: number;
    newWeight: number;
    date: number;
}

export interface Profile {
  gender?: 'male' | 'female';
  height?: number; // in cm
  weightHistory: WeightEntry[];
  unlocks?: UnlockEvent[];
  oneRepMaxes?: Record<string, OneRepMaxEntry>; // Keyed by Exercise ID
  oneRepMaxSnoozes?: Record<string, number>; // Keyed by Exercise ID, value is timestamp until which to snooze updates
  autoUpdated1RMs?: Record<string, AutoUpdateEntry>; // Keyed by Exercise ID, tracks pending notifications for auto-updates
}

export interface SupplementInfo {
  dob: string;
  weight: number;
  height: number;
  gender: 'male' | 'female';
  activityLevel: 'beginner' | 'intermediate' | 'advanced';
  trainingDays: string[];
  trainingTime: 'morning' | 'afternoon' | 'night';
  routineType: 'strength' | 'cardio' | 'mixed';
  objective: 'gain' | 'lose' | 'maintain' | 'recover';
  proteinConsumption: number | 'unknown';
  deficiencies: string[];
  desiredSupplements: string[];
  allergies: string[];
  medicalConditions: string;
  consumptionPreferences: string;
  hydration: number;
}

export interface SupplementPlanItem {
    id: string;
    time: string;
    supplement: string;
    dosage: string;
    notes: string;
    isCustom?: boolean;
    trainingDayOnly?: boolean;
    restDayOnly?: boolean;
    stock?: number; // Number of servings remaining
}

export interface SupplementPlan {
    info: SupplementInfo;
    plan: SupplementPlanItem[];
    warnings: string[];
    general_tips: string[];
    createdAt: number;
}

export type SupplementSuggestionAction = {
  type: 'ADD';
  item: SupplementPlanItem;
} | {
  type: 'UPDATE';
  itemId: string;
  updates: Partial<Omit<SupplementPlanItem, 'id'>>;
} | {
  type: 'REMOVE';
  itemId: string;
};

export interface SupplementSuggestion {
  id: string;
  title: string;
  reason: string;
  action: SupplementSuggestionAction;
  identifier: string;
}

export interface RejectedSuggestion {
  identifier: string;
  rejectedAt: number;
}
