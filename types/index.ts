
import { MUSCLES } from '../constants/muscles';
import { Recommendation } from '../utils/recommendationUtils';

export type BodyPart = 'Chest' | 'Back' | 'Legs' | 'Glutes' | 'Shoulders' | 'Biceps' | 'Triceps' | 'Core' | 'Full Body' | 'Calves' | 'Forearms' | 'Mobility' | 'Cardio';

export type MuscleGroup = typeof MUSCLES[keyof typeof MUSCLES];

export type ExerciseCategory = 'Barbell' | 'Dumbbell' | 'Machine' | 'Cable' | 'Bodyweight' | 'Assisted Bodyweight' | 'Kettlebell' | 'Plyometrics' | 'Reps Only' | 'Cardio' | 'Duration' | 'Smith Machine';

export interface Exercise {
  id: string;
  name: string;
  bodyPart: BodyPart;
  category: ExerciseCategory;
  notes?: string;
  isTimed?: boolean;
  isUnilateral?: boolean;
  primaryMuscles?: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  updatedAt?: number;
  deletedAt?: number | null;
}

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure' | 'timed';

export interface PerformedSet {
  id: string;
  reps: number;
  weight: number;
  time?: number;
  type: SetType;
  isComplete?: boolean;
  completedAt?: number;
  rest?: number;
  isWeightInherited?: boolean;
  isRepsInherited?: boolean;
  isTimeInherited?: boolean;
  actualRest?: number;
  historicalWeight?: number;
  historicalReps?: number;
  historicalTime?: number;
  storedBodyWeight?: number;
}

export interface WorkoutExercise {
  id: string;
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
  previousVersion?: {
    exerciseId: string;
    sets: PerformedSet[];
    note?: string;
  };
}

export interface SupersetDefinition {
  id: string;
  name: string;
  color?: string;
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  exercises: WorkoutExercise[];
  supersets?: Record<string, SupersetDefinition>;
  isTemplate?: boolean;
  lastUsed?: number;
  originId?: string;
  routineType?: 'strength' | 'hiit';
  hiitConfig?: {
    workTime: number;
    restTime: number;
    prepareTime?: number;
  };
  tags?: string[];
  updatedAt?: number;
  deletedAt?: number | null;
}

export interface WorkoutSession {
  id: string;
  routineId: string;
  routineName: string;
  startTime: number;
  endTime: number;
  lastUpdated?: number;
  exercises: WorkoutExercise[];
  supersets?: Record<string, SupersetDefinition>;
  prCount?: number;
  updatedAt?: number;
  deletedAt?: number | null;
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
  date: number;
  weight: number;
}

export interface UnlockEvent {
  date: number;
  fromExercise: string;
  toExercise: string;
}

export interface OneRepMaxEntry {
  exerciseId: string;
  weight: number;
  date: number;
  method: 'calculated' | 'tested';
}

export interface AutoUpdateEntry {
  oldWeight: number;
  newWeight: number;
  date: number;
}

export type UserGoal = 'strength' | 'muscle' | 'endurance';

export interface Profile {
  gender?: 'male' | 'female';
  height?: number;
  weightHistory: WeightEntry[];
  unlocks?: UnlockEvent[];
  oneRepMaxes?: Record<string, OneRepMaxEntry>;
  oneRepMaxSnoozes?: Record<string, number>;
  autoUpdated1RMs?: Record<string, AutoUpdateEntry>;
  promotionSnoozes?: Record<string, number>;
  mainGoal?: UserGoal;
  smartGoalDetection?: boolean;
  bioAdaptiveEngine?: boolean; // New: Toggle for individual recovery/density logic
  goalMismatchSnoozedUntil?: number;
  lastImported?: number;
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
  stock?: number;
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

export interface ActiveTimerInfo {
  exerciseId: string;
  setId: string;
  targetTime: number;
  totalDuration: number;
  initialDuration: number;
  isPaused: boolean;
  timeLeftWhenPaused: number;
}

export interface TimedSetInfo {
  exercise: WorkoutExercise;
  set: PerformedSet;
}

export interface UserStatistics {
  recommendation: Recommendation | null;
  activePromotion: Recommendation | null;
  freshness: Record<string, number>;
  imbalanceRecommendation: Recommendation | null;
  goalMismatchRecommendation: Recommendation | null;
  lastCalculated: number;
  performanceEfficiency?: number; // New: 0-100 score based on density trend
}
