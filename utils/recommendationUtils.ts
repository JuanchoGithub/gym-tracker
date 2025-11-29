
import { WorkoutSession, Routine, Exercise, BodyPart } from '../types';
import { calculateMuscleFreshness, calculateSystemicFatigue } from './fatigueUtils';
import { MUSCLES } from '../constants/muscles';
import { generateSmartRoutine, RoutineFocus, RoutineLevel } from './routineGenerator';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { PROGRESSION_PATHS } from '../constants/progression';
import { getExerciseHistory, calculate1RM } from './workoutUtils';
import { formatWeightDisplay } from './weightUtils';
import { predictNextRoutine, getProtectedMuscles, generateGapSession } from './smartCoachUtils';
import { inferUserProfile, MOVEMENT_PATTERNS, calculateMaxStrengthProfile, calculateMedianWorkoutDuration } from '../services/analyticsService';

export interface Recommendation {
  type: 'rest' | 'workout' | 'promotion' | 'active_recovery' | 'imbalance' | 'deload';
  titleKey: string;
  titleParams?: Record<string, string | number>;
  reasonKey: string;
  reasonParams?: Record<string, string | number>;
  suggestedBodyParts: BodyPart[];
  relevantRoutineIds: string[];
  generatedRoutine?: Routine;
  promotionData?: {
      fromId: string;
      toId: string;
      fromName: string;
      toName: string;
  };
  systemicFatigue?: {
      score: number;
      level: 'Low' | 'Medium' | 'High';
  };
}

const PUSH_MUSCLES = [MUSCLES.PECTORALS, MUSCLES.FRONT_DELTS, MUSCLES.TRICEPS];
const PULL_MUSCLES = [MUSCLES.LATS, MUSCLES.TRAPS, MUSCLES.BICEPS];
const LEG_MUSCLES = [MUSCLES.QUADS, MUSCLES.HAMSTRINGS, MUSCLES.GLUTES];

const ROUTINE_LEVELS: Record<string, RoutineLevel> = {
    'rt-1': 'beginner', // StrongLifts A
    'rt-2': 'beginner', // StrongLifts B
    'rt-3': 'intermediate', // PHUL Upper
    'rt-4': 'intermediate', // PHUL Lower
    'rt-ppl-push': 'intermediate', // PPL Push
    'rt-ppl-pull': 'intermediate', // PPL Pull
    'rt-ppl-legs': 'intermediate', // PPL Legs
    'rt-full-body': 'beginner', // Full Body
    'rt-hiit-7min': 'beginner',
    'rt-hiit-beginner': 'beginner',
};

// Strength Standards (Multipliers of Bodyweight)
type ProficiencyLevel = 'Untrained' | 'Novice' | 'Intermediate' | 'Advanced' | 'Elite';

const LEVEL_SCORES: Record<ProficiencyLevel, number> = {
    'Untrained': 0,
    'Novice': 1,
    'Intermediate': 2,
    'Advanced': 3,
    'Elite': 4
};

const STRENGTH_STANDARDS = {
    male: {
        SQUAT: { nov: 1.1, int: 1.5, adv: 2.1, elite: 2.6 },
        BENCH: { nov: 0.8, int: 1.1, adv: 1.45, elite: 1.9 },
        DEADLIFT: { nov: 1.3, int: 1.7, adv: 2.3, elite: 2.9 },
        OHP: { nov: 0.55, int: 0.75, adv: 0.95, elite: 1.2 },
    },
    female: {
        SQUAT: { nov: 0.8, int: 1.1, adv: 1.5, elite: 1.9 },
        BENCH: { nov: 0.5, int: 0.7, adv: 0.95, elite: 1.25 },
        DEADLIFT: { nov: 1.0, int: 1.3, adv: 1.8, elite: 2.3 },
        OHP: { nov: 0.35, int: 0.5, adv: 0.7, elite: 0.9 },
    }
};

const getProficiency = (lift: 'SQUAT' | 'BENCH' | 'DEADLIFT' | 'OHP', weight: number, bw: number, gender: 'male' | 'female'): ProficiencyLevel => {
    const standards = STRENGTH_STANDARDS[gender][lift];
    const ratio = weight / bw;
    
    if (ratio >= standards.elite) return 'Elite';
    if (ratio >= standards.adv) return 'Advanced';
    if (ratio >= standards.int) return 'Intermediate';
    if (ratio >= standards.nov) return 'Novice';
    return 'Untrained';
};

// Ratios based on 2:3:4:5 rule (OHP:Bench:Squat:Deadlift)
const RATIOS = {
    SQ_DL: 1.25, // Deadlift (5) / Squat (4) = 1.25
    BN_SQ: 1.33, // Squat (4) / Bench (3) = 1.33
    OH_BN: 0.66, // OHP (2) / Bench (3) = 0.66
};

export const detectImbalances = (history: WorkoutSession[], routines: Routine[], currentBodyWeight?: number, gender?: 'male' | 'female'): Recommendation | null => {
    const s = calculateMaxStrengthProfile(history);
    const MIN_STRENGTH_THRESHOLD = 40; // kg, ignore very beginners for ratios
    const max1RM = Math.max(s.SQUAT, s.DEADLIFT, s.BENCH);

    // Need at least one significant lift to perform analysis
    if (max1RM < MIN_STRENGTH_THRESHOLD) {
        return null;
    }

    let worstImbalance: Recommendation | null = null;
    let maxDeviation = 0.15; // Threshold: 15% deviation initiates a warning

    // --- CHECK 1: RATIOS (SYMMETRY & STRUCTURAL) ---

    // 1a: Squat vs Deadlift (4:5 Ratio)
    if (s.SQUAT > MIN_STRENGTH_THRESHOLD && s.DEADLIFT > 0) {
        const targetDL = s.SQUAT * RATIOS.SQ_DL;
        if (s.DEADLIFT < targetDL) {
            const deviation = (targetDL - s.DEADLIFT) / targetDL;
            if (deviation > maxDeviation) {
                maxDeviation = deviation;
                worstImbalance = {
                    type: 'imbalance',
                    titleKey: 'imbalance_squat_deadlift_title',
                    reasonKey: 'imbalance_squat_deadlift_desc',
                    reasonParams: { squat: Math.round(s.SQUAT), deadlift: Math.round(s.DEADLIFT) },
                    suggestedBodyParts: ['Back', 'Legs'], // Focus on posterior chain
                    relevantRoutineIds: routines.filter(r => 
                        r.exercises.some(e => MOVEMENT_PATTERNS.DEADLIFT.includes(e.exerciseId))
                    ).map(r => r.id)
                };
            }
        }
    }

    // 1b: Bench vs Squat (3:4 Ratio)
    if (s.BENCH > MIN_STRENGTH_THRESHOLD && s.SQUAT > 0) {
        const targetSquat = s.BENCH * RATIOS.BN_SQ;
        if (s.SQUAT < targetSquat) {
            const deviation = (targetSquat - s.SQUAT) / targetSquat;
            if (deviation > maxDeviation) {
                maxDeviation = deviation;
                worstImbalance = {
                    type: 'imbalance',
                    titleKey: 'imbalance_bench_squat_title',
                    reasonKey: 'imbalance_bench_squat_desc',
                    reasonParams: { bench: Math.round(s.BENCH), squat: Math.round(s.SQUAT) },
                    suggestedBodyParts: ['Legs'],
                    relevantRoutineIds: routines.filter(r => 
                        r.exercises.some(e => MOVEMENT_PATTERNS.SQUAT.includes(e.exerciseId))
                    ).map(r => r.id)
                };
            }
        }
    }

    // 1c: OHP vs Bench (2:3 Ratio)
    if (s.BENCH > MIN_STRENGTH_THRESHOLD && s.OHP > 0) {
        const targetOHP = s.BENCH * RATIOS.OH_BN;
        if (s.OHP < targetOHP) {
            const deviation = (targetOHP - s.OHP) / targetOHP;
            if (deviation > maxDeviation) {
                maxDeviation = deviation;
                worstImbalance = {
                    type: 'imbalance',
                    titleKey: 'imbalance_ohp_bench_title',
                    reasonKey: 'imbalance_ohp_bench_desc',
                    reasonParams: { bench: Math.round(s.BENCH), ohp: Math.round(s.OHP) },
                    suggestedBodyParts: ['Shoulders'],
                    relevantRoutineIds: routines.filter(r => 
                        r.exercises.some(e => MOVEMENT_PATTERNS.OHP.includes(e.exerciseId))
                    ).map(r => r.id)
                };
            }
        }
    }

    // 1d: Horizontal Push (Bench) vs Pull (Row) (~1:1 Ratio)
    if (s.BENCH > MIN_STRENGTH_THRESHOLD && s.ROW > 0) {
        const targetRow = s.BENCH;
        if (s.ROW < targetRow * 0.85) { // Allow 15% variance
             const deviation = (targetRow - s.ROW) / targetRow;
             if (deviation > maxDeviation) {
                 maxDeviation = deviation;
                 worstImbalance = {
                     type: 'imbalance',
                     titleKey: 'imbalance_push_pull_title',
                     reasonKey: 'imbalance_push_pull_desc',
                     reasonParams: { push: Math.round(s.BENCH), pull: Math.round(s.ROW) },
                     suggestedBodyParts: ['Back', 'Shoulders'],
                     relevantRoutineIds: routines.filter(r => 
                        r.exercises.some(e => MOVEMENT_PATTERNS.ROW.includes(e.exerciseId))
                    ).map(r => r.id)
                 };
             }
        }
    }

    // 1e: Vertical Push (OHP) vs Vertical Pull (~1:1 Ratio)
    if (s.OHP > MIN_STRENGTH_THRESHOLD && s.VERTICAL_PULL > 0) {
        const targetPull = s.OHP;
        if (s.VERTICAL_PULL < targetPull * 0.85) {
            const deviation = (targetPull - s.VERTICAL_PULL) / targetPull;
             if (deviation > maxDeviation) {
                 maxDeviation = deviation;
                 worstImbalance = {
                     type: 'imbalance',
                     titleKey: 'imbalance_vertical_balance_title',
                     reasonKey: 'imbalance_vertical_balance_desc',
                     reasonParams: { push: Math.round(s.OHP), pull: Math.round(s.VERTICAL_PULL) },
                     suggestedBodyParts: ['Back'],
                     relevantRoutineIds: routines.filter(r => 
                        r.exercises.some(e => MOVEMENT_PATTERNS.VERTICAL_PULL.includes(e.exerciseId))
                    ).map(r => r.id)
                 };
             }
        }
    }
    
    // --- CHECK 2: PROFICIENCY GAPS (STANDARDIZATION) ---
    if (currentBodyWeight && currentBodyWeight > 0 && gender && worstImbalance === null) {
        // Only calculate if we haven't found a critical ratio imbalance yet (or maybe treat this as lower priority)
        // We assume 'male' as default for physiology if not specified, but typically gender is required for this.
        const profGender = gender;

        const levelSquat = getProficiency('SQUAT', s.SQUAT, currentBodyWeight, profGender);
        const levelBench = getProficiency('BENCH', s.BENCH, currentBodyWeight, profGender);
        const levelDeadlift = getProficiency('DEADLIFT', s.DEADLIFT, currentBodyWeight, profGender);
        const levelOhp = getProficiency('OHP', s.OHP, currentBodyWeight, profGender);

        const scoreUpper = Math.max(LEVEL_SCORES[levelBench], LEVEL_SCORES[levelOhp]);
        const scoreLower = Math.max(LEVEL_SCORES[levelSquat], LEVEL_SCORES[levelDeadlift]);

        // Gap Threshold: 2 levels difference is worth a notification (e.g. Advanced vs Novice)
        // 1.5 allows for "High Intermediate" vs "Low Novice" effectively.
        
        if (scoreUpper >= scoreLower + 2) {
             worstImbalance = {
                type: 'imbalance',
                titleKey: 'imbalance_upper_dominant_title',
                reasonKey: 'imbalance_upper_dominant_desc',
                reasonParams: { 
                    upper_level: t(levelBench === 'Untrained' ? levelOhp : levelBench), // Use the localized string key
                    lower_level: t(levelSquat === 'Untrained' ? levelDeadlift : levelSquat) 
                },
                suggestedBodyParts: ['Legs'],
                relevantRoutineIds: routines.filter(r => r.exercises.some(e => MOVEMENT_PATTERNS.SQUAT.includes(e.exerciseId) || MOVEMENT_PATTERNS.DEADLIFT.includes(e.exerciseId))).map(r => r.id)
            };
        } else if (scoreLower >= scoreUpper + 2) {
             worstImbalance = {
                type: 'imbalance',
                titleKey: 'imbalance_lower_dominant_title',
                reasonKey: 'imbalance_lower_dominant_desc',
                reasonParams: { 
                    lower_level: t(levelSquat === 'Untrained' ? levelDeadlift : levelSquat),
                    upper_level: t(levelBench === 'Untrained' ? levelOhp : levelBench)
                },
                suggestedBodyParts: ['Chest', 'Shoulders', 'Back'],
                relevantRoutineIds: routines.filter(r => r.exercises.some(e => MOVEMENT_PATTERNS.BENCH.includes(e.exerciseId) || MOVEMENT_PATTERNS.OHP.includes(e.exerciseId))).map(r => r.id)
            };
        }
    }
    
    // Helper function to make TS happy with key access in reasonParams
    function t(key: string) { return key; } // Dummy, the actual translation happens in the UI component

    return worstImbalance;
}

export const getWorkoutRecommendation = (
  history: WorkoutSession[],
  routines: Routine[],
  exercises: Exercise[],
  t: (key: string) => string,
  currentBodyweight?: number
): Recommendation | null => {
  const userProfile = inferUserProfile(history);
  const customRoutines = routines.filter(r => !r.id.startsWith('rt-'));
  const isOnboardingPhase = history.length < 10;
  const lastSession = history.length > 0 ? history[0] : null;
  
  // Calculate Systemic Fatigue
  const systemicFatigue = calculateSystemicFatigue(history, exercises);

  // --- PHASE 0: CHECK ALREADY TRAINED TODAY ---
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
  
  // Check if a session started OR ended today
  const trainedToday = lastSession && (
      lastSession.startTime >= todayStart || 
      (lastSession.endTime > 0 && lastSession.endTime >= todayStart)
  );

  if (trainedToday) {
      const volume = lastSession?.exercises.reduce((total, ex) => {
        return total + ex.sets.reduce((t, s) => t + (s.isComplete ? s.weight * s.reps : 0), 0);
      }, 0) || 0;

     return {
         type: 'active_recovery',
         titleKey: "rec_title_workout_complete",
         reasonKey: "rec_reason_workout_complete",
         reasonParams: { volume: formatWeightDisplay(volume, 'kg') + ' kg' }, // Default to kg, will be formatted in UI if needed
         suggestedBodyParts: ['Mobility'],
         relevantRoutineIds: routines.filter(r => r.name.includes('Mobility') || r.exercises.some(ex => {
             const def = exercises.find(e => e.id === ex.exerciseId);
             return def?.bodyPart === 'Mobility';
         })).map(r => r.id),
         systemicFatigue
     };
  }
  
  // Calculate median duration to tune recommendations
  const durationProfile = calculateMedianWorkoutDuration(history);
  
  // --- PHASE 0.5: SYSTEMIC FATIGUE OVERRIDE ---
  if (systemicFatigue.level === 'High') {
      return {
          type: 'deload',
          titleKey: 'rec_title_deload',
          reasonKey: 'rec_reason_cns_fatigue',
          reasonParams: { score: systemicFatigue.score.toString() },
          suggestedBodyParts: ['Mobility', 'Cardio'],
          relevantRoutineIds: [],
          generatedRoutine: generateGapSession([], exercises, history, t, userProfile.equipment, durationProfile), // Unconstrained gap session
          systemicFatigue
      };
  }

  // Check if user is a "Rookie" (Very low history or explicitly beginner profile)
  const isRookie = history.length < 5 || (userProfile.experience === 'beginner' && history.length < 10);

  // --- PHASE 1: STICKY PLAN (Beginner / New User) ---
  // If user is new AND has custom routines (from wizard), stick to them.
  if (isOnboardingPhase && customRoutines.length > 0) {
      if (history.length === 0) {
           // Fresh start
           return {
              type: 'workout',
              titleKey: "rec_title_onboarding_complete",
              reasonKey: "rec_reason_onboarding_complete",
              suggestedBodyParts: [],
              relevantRoutineIds: [customRoutines[0].id], // Suggest the first one
              systemicFatigue
          };
      }
      
      // Determine Next Routine in Sequence
      const lastRoutineIndex = customRoutines.findIndex(r => r.id === lastSession?.routineId);
      const nextIndex = lastRoutineIndex === -1 ? 0 : (lastRoutineIndex + 1) % customRoutines.length;
      const nextRoutine = customRoutines[nextIndex];

      return {
          type: 'workout',
          titleKey: "rec_title_next_up",
          titleParams: { routine: nextRoutine.name },
          reasonKey: "rec_reason_next_up",
          reasonParams: { routine: nextRoutine.name },
          suggestedBodyParts: [],
          relevantRoutineIds: [nextRoutine.id],
          systemicFatigue
      };
  }

  // --- CHECK FOR PROMOTIONS (Runs for everyone) ---
  for (const path of PROGRESSION_PATHS) {
      const exHistory = getExerciseHistory(history, path.baseExerciseId);
      if (exHistory.length === 0) continue;

      let sessionsMetCriteria = 0;
      for (const entry of exHistory) {
          const bestSet = entry.exerciseData.sets.reduce((best, current) => {
              if (!current.isComplete || current.type !== 'normal') return best;
              return (current.weight * current.reps > best.weight * best.reps) ? current : best;
          }, { weight: 0, reps: 0, type: 'normal', id: '', isComplete: false });
          
          let met = true;
          if (path.criteria.minReps && bestSet.reps < path.criteria.minReps) met = false;
          if (path.criteria.minWeightRatio && currentBodyweight) {
              if (bestSet.weight < (currentBodyweight * path.criteria.minWeightRatio)) met = false;
          }
          
          if (met) sessionsMetCriteria++;
          if (sessionsMetCriteria >= path.criteria.requiredSessions) break;
      }

      if (sessionsMetCriteria >= path.criteria.requiredSessions) {
          const fromEx = exercises.find(e => e.id === path.baseExerciseId) || PREDEFINED_EXERCISES.find(e => e.id === path.baseExerciseId);
          const toEx = exercises.find(e => e.id === path.targetExerciseId) || PREDEFINED_EXERCISES.find(e => e.id === path.targetExerciseId);
          
          if (fromEx && toEx) {
              const relevantRoutineIds = routines.filter(r => r.exercises.some(e => e.exerciseId === path.baseExerciseId)).map(r => r.id);
              if (relevantRoutineIds.length > 0) {
                  return {
                      type: 'promotion',
                      titleKey: 'rec_title_promotion',
                      titleParams: { exercise: fromEx.name },
                      reasonKey: path.reasonKey,
                      reasonParams: { from: fromEx.name, to: toEx.name },
                      suggestedBodyParts: [],
                      relevantRoutineIds,
                      promotionData: {
                          fromId: fromEx.id,
                          toId: toEx.id,
                          fromName: fromEx.name,
                          toName: toEx.name
                      },
                      systemicFatigue
                  };
              }
          }
      }
  }

  // --- PHASE 2: SMART COACH (Advanced / No Custom Plan) ---
  
  const freshness = calculateMuscleFreshness(history, exercises);
  const scores = Object.values(freshness);
  const avgFreshness = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
  
  // Check if any muscle is notably fresh (>90%) which usually indicates ready for a specific workout
  // If everything is fatigued (<60%), we should consider active recovery
  const hasFreshMuscles = scores.some(s => s > 80);

  // Predict next routine to see if we should protect muscles for it
  const predictedNextRoutine = predictNextRoutine(history, routines);
  
  // Check if we need a Gap Session (Active Recovery)
  // Trigger if: 
  // 1. Local fatigue is high (avg < 60) AND no specific muscle group is super fresh
  // 2. OR if user explicitly trained yesterday and we want to ensure recovery for a predicted heavy day tomorrow
  
  const trainedYesterday = lastSession && (
     lastSession.startTime >= yesterdayStart ||
     (lastSession.endTime > 0 && lastSession.endTime >= yesterdayStart)
  );

  if ((avgFreshness < 60 && !hasFreshMuscles) || (trainedYesterday && predictedNextRoutine)) {
     
     let protectedMuscles: any[] = [];
     if (predictedNextRoutine) {
         // If we know what's coming next, protect those muscles
         protectedMuscles = getProtectedMuscles(predictedNextRoutine, exercises);
     } else {
         // If we don't know, protect whatever is currently most fatigued
         protectedMuscles = Object.entries(freshness)
            .filter(([_, score]) => score < 50)
            .map(([muscle]) => muscle);
     }
     
     const gapSession = generateGapSession(protectedMuscles, exercises, history, t, userProfile.equipment, durationProfile);
     
     return {
         type: 'active_recovery',
         titleKey: "rec_title_gap_workout",
         reasonKey: predictedNextRoutine ? "rec_reason_gap_predict" : "rec_reason_fatigued",
         reasonParams: { next_routine: predictedNextRoutine?.name || t('common_next_session') },
         suggestedBodyParts: ['Cardio', 'Mobility', 'Core'],
         relevantRoutineIds: [],
         generatedRoutine: gapSession,
         systemicFatigue
     };
  }

  const getGroupData = (id: string, muscleNames: string[], bodyParts: BodyPart[], focusKey: RoutineFocus) => {
      const groupScores = muscleNames.map(m => freshness[m] !== undefined ? freshness[m] : 100); 
      const score = groupScores.reduce((a,b) => a + b, 0) / groupScores.length;
      let lastTrainedTime = 0;
      for (const session of history) {
          if (session.startTime <= lastTrainedTime) continue;
          let hitGroup = false;
          for (const ex of session.exercises) {
              const def = exercises.find(e => e.id === ex.exerciseId);
              if (def && def.primaryMuscles?.some(m => muscleNames.includes(m))) {
                  hitGroup = true;
                  break;
              }
          }
          if (hitGroup) {
              lastTrainedTime = session.startTime;
              break; 
          }
      }
      const daysSince = lastTrainedTime === 0 ? 999 : Math.floor((Date.now() - lastTrainedTime) / (1000 * 60 * 60 * 24));
      return { id, score, daysSince, bodyParts, focusKey };
  };

  const pushGroup = getGroupData('Push', PUSH_MUSCLES, ['Chest', 'Shoulders', 'Triceps'], 'push');
  const pullGroup = getGroupData('Pull', PULL_MUSCLES, ['Back', 'Biceps'], 'pull');
  const legsGroup = getGroupData('Legs', LEG_MUSCLES, ['Legs', 'Glutes', 'Calves'], 'legs');

  const groups = [pushGroup, pullGroup, legsGroup];
  // Find groups that are "ready" (High freshness)
  const readyGroups = groups.filter(g => g.score > 80);
  
  // If we have a prediction, prioritize it if it's ready
  if (predictedNextRoutine) {
      const predictedFocus = predictedNextRoutine.name.toLowerCase();
      const matchingGroup = readyGroups.find(g => predictedFocus.includes(g.id.toLowerCase()));
      if (matchingGroup) {
          // The predicted routine is ready to go!
           return {
              type: 'workout',
              titleKey: "rec_title_next_up", // "Next Up: {routine}"
              titleParams: { routine: predictedNextRoutine.name },
              reasonKey: "rec_reason_fresh",
              reasonParams: { muscles: matchingGroup.bodyParts[0], days: matchingGroup.daysSince.toString() },
              suggestedBodyParts: matchingGroup.bodyParts,
              relevantRoutineIds: [predictedNextRoutine.id],
              systemicFatigue
          };
      }
  }

  if (readyGroups.length > 0) {
      // Standard fallback: Suggest most rested group
      readyGroups.sort((a, b) => b.daysSince - a.daysSince);
      const winner = readyGroups[0];
      
      let titleKey = 'rec_title_generic';
      if (winner.id === 'Push') titleKey = 'rec_title_push';
      if (winner.id === 'Pull') titleKey = 'rec_title_pull';
      if (winner.id === 'Legs') titleKey = 'rec_title_legs';

      const relevantRoutineIds = routines.filter(r => {
          // 1. Filter by Level Suitability
          const isCustom = !r.id.startsWith('rt-');
          const routineLevel = ROUTINE_LEVELS[r.id];
          const userLevel = userProfile.experience;

          if (!isCustom) {
              // If Rookie, hide complex compound routines unless specifically generated for them
              if (isRookie && (r.id === 'rt-1' || r.id === 'rt-2')) return false;

              // If Beginner, only show Beginner routines
              if (userLevel === 'beginner' && routineLevel !== 'beginner') return false;
          }

          // 2. Filter by Muscle Focus
          const nameMatch = r.name.toLowerCase().includes(winner.id.toLowerCase());
          if (nameMatch) return true;
          const targetCount = r.exercises.reduce((count, ex) => {
              const exDef = exercises.find(e => e.id === ex.exerciseId);
              if (exDef && winner.bodyParts.includes(exDef.bodyPart)) {
                  return count + 1;
              }
              return count;
          }, 0);
          return r.exercises.length > 0 && (targetCount / r.exercises.length) > 0.4;
      }).map(r => r.id);

      const daysText = winner.daysSince === 999 ? t('common_many') : winner.daysSince.toString();
      
      // Only generate a smart routine if we are in the advanced phase or really need one
      const generatedRoutine = isOnboardingPhase ? undefined : generateSmartRoutine(winner.focusKey, userProfile, t);

      return {
          type: 'workout',
          titleKey,
          titleParams: { focus: winner.id },
          reasonKey: winner.daysSince > 4 ? 'rec_reason_neglected' : 'rec_reason_fresh',
          reasonParams: { muscles: winner.bodyParts[0], days: daysText },
          suggestedBodyParts: winner.bodyParts,
          relevantRoutineIds,
          generatedRoutine,
          systemicFatigue
      };
  }

  // Fallback if everything is somewhat fatigued but no specific prediction
  return {
      type: 'workout',
      titleKey: "rec_title_generic",
      titleParams: { focus: 'Cardio / Mobility' },
      reasonKey: "rec_reason_fatigued",
      suggestedBodyParts: ['Cardio', 'Mobility'],
      relevantRoutineIds: routines.filter(r => r.routineType === 'hiit' || r.name.includes('Cardio')).map(r => r.id),
      systemicFatigue
  };
};
