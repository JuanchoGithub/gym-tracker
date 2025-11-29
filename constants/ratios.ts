
import { BodyPart, ExerciseCategory } from '../types';

export interface ExerciseRatio {
    targetId: string;
    ratio: number;
}

export const ANCHOR_EXERCISES = {
  SQUAT: 'ex-2',
  BENCH: 'ex-1',
  DEADLIFT: 'ex-3',
  OHP: 'ex-4'
};

// 1. High Precision Ratios (Specific Exercise ID)
// Ratios: Anchor * Ratio = Accessory
// Inverse (Normalizing): Accessory / Ratio = Anchor
export const EXERCISE_RATIOS: Record<string, { anchorId: string, ratio: number }> = {
    // --- SQUAT ACCESSORIES ---
    'ex-101': { anchorId: ANCHOR_EXERCISES.SQUAT, ratio: 0.85 }, // Front Squat
    'ex-109': { anchorId: ANCHOR_EXERCISES.SQUAT, ratio: 0.50 }, // Goblet Squat
    'ex-9':   { anchorId: ANCHOR_EXERCISES.SQUAT, ratio: 2.50 }, // Leg Press
    'ex-102': { anchorId: ANCHOR_EXERCISES.SQUAT, ratio: 1.10 }, // Hack Squat
    'ex-113': { anchorId: ANCHOR_EXERCISES.SQUAT, ratio: 0.90 }, // Jefferson Squat
    'ex-160': { anchorId: ANCHOR_EXERCISES.SQUAT, ratio: 0.30 }, // Air Squat (High rep endurance mapping)
    'ex-100': { anchorId: ANCHOR_EXERCISES.SQUAT, ratio: 0.40 }, // Bulgarian Split Squat (Per leg)
    'ex-99':  { anchorId: ANCHOR_EXERCISES.SQUAT, ratio: 0.35 }, // Walking Lunge (Per leg)

    // --- DEADLIFT ACCESSORIES ---
    'ex-98': { anchorId: ANCHOR_EXERCISES.DEADLIFT, ratio: 0.75 }, // RDL
    'ex-43': { anchorId: ANCHOR_EXERCISES.DEADLIFT, ratio: 1.10 }, // Rack Pull
    'ex-134':{ anchorId: ANCHOR_EXERCISES.DEADLIFT, ratio: 0.40 }, // KB Swing
    'ex-51': { anchorId: ANCHOR_EXERCISES.DEADLIFT, ratio: 0.90 }, // Shrugs (Strength correlation)
    
    // --- BENCH ACCESSORIES ---
    'ex-12': { anchorId: ANCHOR_EXERCISES.BENCH, ratio: 0.35 }, // Incline DB Press (Per hand)
    'ex-25': { anchorId: ANCHOR_EXERCISES.BENCH, ratio: 0.80 }, // Incline Barbell
    'ex-11': { anchorId: ANCHOR_EXERCISES.BENCH, ratio: 0.25 }, // DB Fly (Per hand)
    'ex-22': { anchorId: ANCHOR_EXERCISES.BENCH, ratio: 1.05 }, // Decline Bench
    'ex-87': { anchorId: ANCHOR_EXERCISES.BENCH, ratio: 0.90 }, // Close Grip Bench
    'ex-31': { anchorId: ANCHOR_EXERCISES.BENCH, ratio: 1.20 }, // Machine Chest Press (Leverage advantage)
    'ex-24': { anchorId: ANCHOR_EXERCISES.BENCH, ratio: 1.10 }, // Dips (Bodyweight + Load vs Bench) - rough estimate
    'ex-23': { anchorId: ANCHOR_EXERCISES.BENCH, ratio: 0.60 }, // Pushups (Endurance mapping)
    'ex-32': { anchorId: ANCHOR_EXERCISES.BENCH, ratio: 0.50 }, // Low-to-High Cable Fly
    'ex-33': { anchorId: ANCHOR_EXERCISES.BENCH, ratio: 0.50 }, // High-to-Low Cable Fly

    // --- OHP ACCESSORIES ---
    'ex-60': { anchorId: ANCHOR_EXERCISES.OHP, ratio: 0.35 }, // Arnold Press (Per hand)
    'ex-67': { anchorId: ANCHOR_EXERCISES.OHP, ratio: 1.10 }, // Machine Shoulder Press
    'ex-56': { anchorId: ANCHOR_EXERCISES.OHP, ratio: 0.15 }, // Lateral Raise
    'ex-4':  { anchorId: ANCHOR_EXERCISES.OHP, ratio: 1.00 }, // Self
    'ex-146':{ anchorId: ANCHOR_EXERCISES.OHP, ratio: 0.80 }, // KB Clean & Press (Single arm usually, or double) - Conservative for single
    'ex-145':{ anchorId: ANCHOR_EXERCISES.OHP, ratio: 0.40 }, // Turkish Get Up
    
    // --- BAND / REPS ONLY OVERRIDES ---
    'ex-83': { anchorId: ANCHOR_EXERCISES.DEADLIFT, ratio: 0.40 }, // Band Curl (Approximate resistance correlation to pulling strength)
};

// 2. Fallback Maps (Pattern Matching)
export const BODY_PART_ANCHORS: Partial<Record<BodyPart, string>> = {
    'Chest': ANCHOR_EXERCISES.BENCH,
    'Shoulders': ANCHOR_EXERCISES.OHP,
    'Triceps': ANCHOR_EXERCISES.BENCH,
    'Legs': ANCHOR_EXERCISES.SQUAT,
    'Glutes': ANCHOR_EXERCISES.DEADLIFT,
    'Back': ANCHOR_EXERCISES.DEADLIFT, // Or row if we had one as anchor
    'Biceps': ANCHOR_EXERCISES.DEADLIFT, // Pulling strength correlation
};

// Multiplier against the Anchor
export const CATEGORY_RATIOS: Partial<Record<ExerciseCategory, number>> = {
    'Barbell': 0.8,
    'Dumbbell': 0.35, // Per hand, approx 0.7 total
    'Machine': 1.2,
    'Cable': 0.5,
    'Kettlebell': 0.3, // Per hand
    'Smith Machine': 0.95,
    'Bodyweight': 0.4, // Very rough estimate for bodyweight moves vs loaded barbell
    'Assisted Bodyweight': 0.4,
    'Plyometrics': 0, // N/A
    'Reps Only': 0,
    'Cardio': 0,
    'Duration': 0,
};

// Used for Cascade Suggestions (Parent -> Children)
export const PARENT_CHILD_EXERCISES: Record<string, ExerciseRatio[]> = {
    // Barbell Squat
    'ex-2': [
        { targetId: 'ex-101', ratio: 0.85 },
        { targetId: 'ex-109', ratio: 0.50 },
        { targetId: 'ex-9', ratio: 2.5 },
        { targetId: 'ex-102', ratio: 1.1 },
    ],
    // Deadlift
    'ex-3': [
        { targetId: 'ex-98', ratio: 0.75 },
        { targetId: 'ex-43', ratio: 1.1 },
    ],
    // Bench Press
    'ex-1': [
        { targetId: 'ex-12', ratio: 0.35 },
        { targetId: 'ex-25', ratio: 0.8 },
        { targetId: 'ex-11', ratio: 0.25 },
        { targetId: 'ex-22', ratio: 1.05 },
        { targetId: 'ex-87', ratio: 0.9 },
    ],
    // Overhead Press
    'ex-4': [
        { targetId: 'ex-60', ratio: 0.35 },
        { targetId: 'ex-67', ratio: 1.1 },
    ],
};
