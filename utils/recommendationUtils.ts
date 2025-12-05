
import { WorkoutSession, Routine, Exercise, BodyPart, Profile } from '../types';
import { calculateMuscleFreshness, calculateSystemicFatigue } from './fatigueUtils';
import { MUSCLES } from '../constants/muscles';
import { generateSmartRoutine, RoutineFocus, RoutineLevel } from './routineGenerator';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { PROGRESSION_PATHS } from '../constants/progression';
import { getExerciseHistory } from './workoutUtils';
import { predictNextRoutine, getProtectedMuscles, generateGapSession } from './smartCoachUtils';
import { inferUserProfile, MOVEMENT_PATTERNS, calculateMaxStrengthProfile, calculateMedianWorkoutDuration } from '../services/analyticsService';

export interface Recommendation {
  type: 'rest' | 'workout' | 'promotion' | 'active_recovery' | 'imbalance' | 'deload' | 'update_1rm';
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
  update1RMData?: {
      exerciseId: string;
      exerciseName: string;
      oldMax: number;
      newMax: number;
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
    // REQUIREMENT: Newbies should be on rails. 
    // Disable imbalance detection until the user has logged at least 15 workouts (~5 weeks).
    // This prevents the system from flagging "Squat Dominant" just because they haven't Deadlifted yet.
    if (history.length < 15) {
        return null;
    }

    const currentProfile = calculateMaxStrengthProfile(history);
    const MIN_STRENGTH_THRESHOLD = 40; // kg, ignore very beginners for ratios
    const max1RM = Math.max(currentProfile.SQUAT, currentProfile.DEADLIFT, currentProfile.BENCH);

    // Need at least one significant lift to perform analysis
    if (max1RM < MIN_STRENGTH_THRESHOLD) {
        return null;
    }

    // Calculate historical profile (14 days ago) to check for trends
    const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
    const historicalDate = Date.now() - TWO_WEEKS_MS;
    const historicalProfile = calculateMaxStrengthProfile(history, historicalDate);

    let worstImbalance: Recommendation | null = null;
    let maxDeviation = 0.15; // Threshold: 15% deviation initiates a warning

    // --- CHECK 1: RATIOS (SYMMETRY & STRUCTURAL) ---

    const analyzePair = (
        liftA: keyof typeof currentProfile, 
        liftB: keyof typeof currentProfile, 
        ratio: number, 
        titleKey: string, 
        reasonKey: string, 
        bodyParts: BodyPart[],
        targetPatterns: string[]
    ) => {
        const valA = currentProfile[liftA];
        const valB = currentProfile[liftB];

        if (valA > MIN_STRENGTH_THRESHOLD && valB > 0) {
            const targetB = valA * ratio;
            // Check if Lift B is lagging behind Lift A (e.g., DL lagging behind Squat)
            if (valB < targetB) {
                const currentDiff = targetB - valB;
                const currentDeviation = currentDiff / targetB;

                if (currentDeviation > maxDeviation) {
                    // TREND CHECK: Was it bad 2 weeks ago?
                    const histValA = historicalProfile[liftA] || 0;
                    const histValB = historicalProfile[liftB] || 0;

                    // If historically untrained in one, it's a new imbalance -> ignore (allow time to settle)
                    if (histValA < MIN_STRENGTH_THRESHOLD || histValB < MIN_THRESHOLD_FOR_RATIO_CHECK(MIN_STRENGTH_THRESHOLD)) {
                         return null;
                    }

                    const histTargetB = histValA * ratio;
                    const histDiff = histTargetB - histValB;
                    const histDeviation = histDiff / histTargetB;

                    // Logic:
                    // 1. If historical deviation was small (< 10%), this is a new spike -> Ignore (could be cycle phase).
                    // 2. If current deviation is LESS than historical deviation, we are improving -> Ignore.
                    // 3. Only flag if it persisted (was high before) AND is stable or getting worse.
                    
                    if (histDeviation > 0.10 && currentDeviation >= histDeviation) {
                        return {
                            type: 'imbalance' as const,
                            titleKey,
                            reasonKey,
                            reasonParams: { [liftA.toLowerCase()]: Math.round(valA), [liftB.toLowerCase()]: Math.round(valB) },
                            suggestedBodyParts: bodyParts,
                            relevantRoutineIds: routines.filter(r => 
                                r.exercises.some(e => targetPatterns.includes(e.exerciseId))
                            ).map(r => r.id)
                        };
                    }
                }
            }
        }
        return null;
    };

    // Lower threshold for historical check to avoid filtering out legitimate beginners who are progressing
    const MIN_THRESHOLD_FOR_RATIO_CHECK = (base: number) => base * 0.5;

    // 1a: Squat vs Deadlift (4:5 Ratio)
    const sqDl = analyzePair('SQUAT', 'DEADLIFT', RATIOS.SQ_DL, 'imbalance_squat_deadlift_title', 'imbalance_squat_deadlift_desc', ['Back', 'Legs'], MOVEMENT_PATTERNS.DEADLIFT);
    if (sqDl) { worstImbalance = sqDl; maxDeviation = (sqDl.reasonParams?.deadlift as number / sqDl.reasonParams?.squat as number); }

    // 1b: Bench vs Squat (3:4 Ratio)
    const bnSq = analyzePair('BENCH', 'SQUAT', RATIOS.BN_SQ, 'imbalance_bench_squat_title', 'imbalance_bench_squat_desc', ['Legs'], MOVEMENT_PATTERNS.SQUAT);
    if (bnSq) { worstImbalance = bnSq; }

    // 1c: OHP vs Bench (2:3 Ratio)
    const ohBn = analyzePair('BENCH', 'OHP', RATIOS.OH_BN, 'imbalance_ohp_bench_title', 'imbalance_ohp_bench_desc', ['Shoulders'], MOVEMENT_PATTERNS.OHP);
    if (ohBn) { worstImbalance = ohBn; }

    // 1d: Horizontal Push (Bench) vs Pull (Row) (~1:1 Ratio)
    // Allow 15% variance, so target is 0.85
    const pushPull = analyzePair('BENCH', 'ROW', 0.85, 'imbalance_push_pull_title', 'imbalance_push_pull_desc', ['Back', 'Shoulders'], MOVEMENT_PATTERNS.ROW);
    if (pushPull) { worstImbalance = pushPull; }
    
    // 1e: Vertical Push (OHP) vs Vertical Pull (~1:1 Ratio)
    const vertBal = analyzePair('OHP', 'VERTICAL_PULL', 0.85, 'imbalance_vertical_balance_title', 'imbalance_vertical_balance_desc', ['Back'], MOVEMENT_PATTERNS.VERTICAL_PULL);
    if (vertBal) { worstImbalance = vertBal; }
    
    // --- CHECK 2: PROFICIENCY GAPS (STANDARDIZATION) ---
    if (currentBodyWeight && currentBodyWeight > 0 && gender && worstImbalance === null) {
        // Only calculate if we haven't found a critical ratio imbalance yet (or maybe treat this as lower priority)
        // We assume 'male' as default for physiology if not specified, but typically gender is required for this.
        const profGender = gender;

        const levelSquat = getProficiency('SQUAT', currentProfile.SQUAT, currentBodyWeight, profGender);
        const levelBench = getProficiency('BENCH', currentProfile.BENCH, currentBodyWeight, profGender);
        const levelDeadlift = getProficiency('DEADLIFT', currentProfile.DEADLIFT, currentBodyWeight, profGender);
        const levelOhp = getProficiency('OHP', currentProfile.OHP, currentBodyWeight, profGender);

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
  // REQUIREMENT: Stay "on rails" for first ~5 weeks (15 sessions)
  const isOnboardingPhase = history.length < 15;
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
         reasonParams: { volume: volume.toString() },
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
      // If last routine wasn't one of ours (e.g. random workout), start over at 0.
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
