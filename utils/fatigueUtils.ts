
import { MuscleGroup, WorkoutSession, Exercise } from '../types';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { MUSCLES } from '../constants/muscles';

// Recovery profiles in hours (time to reach 100% freshness from full fatigue)
const RECOVERY_PROFILES: Record<MuscleGroup, number> = {
  // Large Muscles (Slower recovery)
  [MUSCLES.QUADS]: 72,
  [MUSCLES.HAMSTRINGS]: 72,
  [MUSCLES.GLUTES]: 72,
  [MUSCLES.LOWER_BACK]: 72,
  [MUSCLES.LATS]: 60,
  [MUSCLES.PECTORALS]: 60,
  [MUSCLES.SPINAL_ERECTORS]: 72,
  
  // Medium Muscles
  [MUSCLES.UPPER_CHEST]: 48,
  [MUSCLES.LOWER_CHEST]: 48,
  [MUSCLES.FRONT_DELTS]: 48,
  [MUSCLES.SIDE_DELTS]: 48,
  [MUSCLES.REAR_DELTS]: 48,
  [MUSCLES.TRAPS]: 48,
  [MUSCLES.RHOMBOIDS]: 48,
  [MUSCLES.TERES_MAJOR]: 48,
  [MUSCLES.TRICEPS]: 48,
  [MUSCLES.BICEPS]: 48,
  [MUSCLES.BRACHIALIS]: 48,
  [MUSCLES.SERRATUS_ANTERIOR]: 48,
  [MUSCLES.ADDUCTORS]: 48,
  [MUSCLES.ABDUCTORS]: 48,
  [MUSCLES.GASTROCNEMIUS]: 48,
  [MUSCLES.SOLEUS]: 48,
  
  // Small/Fast Recovery Muscles
  [MUSCLES.ABS]: 24,
  [MUSCLES.OBLIQUES]: 24,
  [MUSCLES.TRANSVERSE_ABDOMINIS]: 24,
  [MUSCLES.FOREARMS]: 24,
  [MUSCLES.WRIST_FLEXORS]: 24,
  [MUSCLES.WRIST_EXTENSORS]: 24,
  [MUSCLES.CALVES]: 48, // General catch-all
  [MUSCLES.ROTATOR_CUFF]: 36,
  [MUSCLES.TIBIALIS_ANTERIOR]: 24,
  [MUSCLES.HIP_FLEXORS]: 36,
  [MUSCLES.CARDIOVASCULAR_SYSTEM]: 24,
};

const DEFAULT_RECOVERY_HOURS = 48;

// How much fatigue (0-100 scale) one set induces (simplified model)
const FATIGUE_PER_SET_PRIMARY = 12;
const FATIGUE_PER_SET_SECONDARY = 6;
const MAX_FATIGUE_CAP = 150; // Cap accumulated fatigue so one crazy workout doesn't ruin you for weeks

export const calculateMuscleFreshness = (history: WorkoutSession[], exercises: Exercise[]): Record<string, number> => {
  const now = Date.now();
  const fatigueMap: Record<string, number> = {};

  // Initialize all known muscles to 0 fatigue (100% freshness) implied
  // We will calculate residual fatigue and subtract from 100

  // Filter history to relevant window (max recovery is 72h, so let's look back 4 days to be safe and catch lingering fatigue)
  const cutoffTime = now - (96 * 60 * 60 * 1000); 
  const recentHistory = history.filter(s => s.endTime > cutoffTime);

  // Helper to look up exercise definitions
  const getExerciseDef = (id: string) => exercises.find(e => e.id === id) || PREDEFINED_EXERCISES.find(e => e.id === id);

  recentHistory.forEach(session => {
    // Hours passed since this workout finished
    const hoursSince = (now - session.endTime) / (1000 * 60 * 60);
    
    session.exercises.forEach(exercise => {
      const def = getExerciseDef(exercise.exerciseId);
      if (!def) return;

      // Count effective sets (ignore warmups for fatigue calculation generally, or weight them lower)
      const effectiveSets = exercise.sets.filter(s => s.type !== 'warmup' && s.isComplete).length;
      if (effectiveSets === 0) return;

      // Apply fatigue to Primary Muscles
      if (def.primaryMuscles) {
        def.primaryMuscles.forEach(muscle => {
            const recoveryDuration = RECOVERY_PROFILES[muscle] || DEFAULT_RECOVERY_HOURS;
            
            // Linear Recovery Model:
            // Fatigue = InitialFatigue * (1 - (HoursPassed / RecoveryDuration))
            // If HoursPassed > RecoveryDuration, fatigue is 0.
            
            if (hoursSince < recoveryDuration) {
                const initialFatigue = effectiveSets * FATIGUE_PER_SET_PRIMARY;
                const remainingFatigue = initialFatigue * (1 - (hoursSince / recoveryDuration));
                fatigueMap[muscle] = (fatigueMap[muscle] || 0) + remainingFatigue;
            }
        });
      }

      // Apply fatigue to Secondary Muscles
      if (def.secondaryMuscles) {
        def.secondaryMuscles.forEach(muscle => {
            const recoveryDuration = RECOVERY_PROFILES[muscle] || DEFAULT_RECOVERY_HOURS;
            if (hoursSince < recoveryDuration) {
                const initialFatigue = effectiveSets * FATIGUE_PER_SET_SECONDARY;
                const remainingFatigue = initialFatigue * (1 - (hoursSince / recoveryDuration));
                fatigueMap[muscle] = (fatigueMap[muscle] || 0) + remainingFatigue;
            }
        });
      }
    });
  });

  // Convert accumulated fatigue to Freshness Score (0-100)
  const freshnessMap: Record<string, number> = {};
  
  // List of all muscles we track to ensure we return a value even if 100%
  const allMuscles = Object.keys(RECOVERY_PROFILES);
  
  allMuscles.forEach(muscle => {
      const fatigue = fatigueMap[muscle] || 0;
      // Clamp fatigue at cap
      const clampedFatigue = Math.min(fatigue, MAX_FATIGUE_CAP);
      // Freshness is inverse of fatigue. 
      // If fatigue is >= 100, freshness is 0 (or very low).
      // We scale it so 0 fatigue = 100 freshness. 100 fatigue = 0 freshness.
      
      let freshness = 100 - clampedFatigue;
      freshness = Math.max(0, Math.round(freshness));
      
      freshnessMap[muscle] = freshness;
  });

  return freshnessMap;
};

export const getFreshnessColor = (score: number): string => {
    // HSL Interpolation: 0 (Red/0deg) -> 100 (Green/120deg)
    const hue = Math.round((score / 100) * 120);
    return `hsl(${hue}, 70%, 45%)`;
};
