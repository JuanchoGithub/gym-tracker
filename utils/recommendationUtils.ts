
import { WorkoutSession, Routine, Exercise, BodyPart } from '../types';
import { calculateMuscleFreshness } from './fatigueUtils';
import { MUSCLES } from '../constants/muscles';
import { generateSmartRoutine, RoutineFocus, RoutineLevel, SurveyAnswers } from './routineGenerator';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { PROGRESSION_PATHS } from '../constants/progression';
import { getExerciseHistory } from './workoutUtils';

export interface Recommendation {
  type: 'rest' | 'workout' | 'promotion' | 'active_recovery';
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

const inferUserProfile = (history: WorkoutSession[]): SurveyAnswers => {
    const defaultProfile: SurveyAnswers = {
        experience: 'intermediate',
        goal: 'muscle',
        equipment: 'gym',
        time: 'medium'
    };

    if (history.length === 0) return defaultProfile;

    const recentSessions = history.slice(0, 10); 
    let barbellCount = 0;
    let dumbbellCount = 0;
    let machineCount = 0;
    let bodyweightCount = 0;
    let totalExercises = 0;

    recentSessions.forEach(s => {
        s.exercises.forEach(we => {
            const def = PREDEFINED_EXERCISES.find(e => e.id === we.exerciseId);
            if (def) {
                totalExercises++;
                if (def.category === 'Barbell') barbellCount++;
                else if (def.category === 'Dumbbell') dumbbellCount++;
                else if (def.category === 'Machine' || def.category === 'Cable') machineCount++;
                else if (def.category === 'Bodyweight' || def.category === 'Assisted Bodyweight') bodyweightCount++;
            }
        });
    });

    if (totalExercises > 0) {
        if (barbellCount > totalExercises * 0.3 || machineCount > totalExercises * 0.3) {
            defaultProfile.equipment = 'gym';
        } else if (dumbbellCount > totalExercises * 0.4) {
            defaultProfile.equipment = 'dumbbell';
        } else if (bodyweightCount > totalExercises * 0.5) {
            defaultProfile.equipment = 'bodyweight';
        }
    }

    let totalReps = 0;
    let setCount = 0;
    recentSessions.forEach(s => {
        s.exercises.forEach(we => {
            we.sets.forEach(set => {
                if (set.type === 'normal' && set.isComplete) {
                    totalReps += set.reps;
                    setCount++;
                }
            });
        });
    });
    
    const avgReps = setCount > 0 ? totalReps / setCount : 10;
    if (avgReps < 6) defaultProfile.goal = 'strength';
    else if (avgReps > 12) defaultProfile.goal = 'endurance';
    else defaultProfile.goal = 'muscle';

    let totalDuration = 0;
    let timedSessions = 0;
    recentSessions.forEach(s => {
        if (s.endTime > s.startTime) {
            totalDuration += (s.endTime - s.startTime);
            timedSessions++;
        }
    });
    const avgDurationMinutes = timedSessions > 0 ? (totalDuration / timedSessions) / 60000 : 45;
    if (avgDurationMinutes < 30) defaultProfile.time = 'short';
    else if (avgDurationMinutes > 70) defaultProfile.time = 'long';
    else defaultProfile.time = 'medium';

    // Infer experience based on workout count and consistency
    if (history.length < 20) defaultProfile.experience = 'beginner';
    else if (history.length < 100) defaultProfile.experience = 'intermediate';
    else defaultProfile.experience = 'advanced';

    return defaultProfile;
};

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
     return {
         type: 'active_recovery',
         titleKey: "rec_title_rest",
         reasonKey: "rec_reason_trained_today",
         suggestedBodyParts: ['Mobility'],
         relevantRoutineIds: routines.filter(r => r.name.includes('Mobility') || r.exercises.some(ex => {
             const def = exercises.find(e => e.id === ex.exerciseId);
             return def?.bodyPart === 'Mobility';
         })).map(r => r.id)
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
          relevantRoutineIds: [nextRoutine.id]
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
                      }
                  };
              }
          }
      }
  }


  // --- PHASE 2: SMART COACH (Advanced / No Custom Plan) ---
  
  const freshness = calculateMuscleFreshness(history, exercises);
  const scores = Object.values(freshness);
  const avgFreshness = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
  const hasFullyFreshMuscle = scores.some(s => s > 90);

  if (avgFreshness < 50 && !hasFullyFreshMuscle) {
     // Check if trained yesterday (either started or ended yesterday, but NOT today)
     const trainedYesterday = lastSession && (
         lastSession.startTime >= yesterdayStart ||
         (lastSession.endTime > 0 && lastSession.endTime >= yesterdayStart)
     );

     return {
         type: 'rest',
         titleKey: "rec_title_rest",
         reasonKey: trainedYesterday ? "rec_reason_rest_growth" : "rec_reason_fatigued",
         suggestedBodyParts: ['Cardio', 'Mobility'],
         relevantRoutineIds: routines.filter(r => 
             r.exercises.some(e => {
                 const exDef = exercises.find(ed => ed.id === e.exerciseId);
                 return exDef?.category === 'Cardio' || exDef?.bodyPart === 'Mobility';
             })
         ).map(r => r.id)
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
  const readyGroups = groups.filter(g => g.score > 85);
  
  if (readyGroups.length > 0) {
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

      const daysText = winner.daysSince === 999 ? 'many' : winner.daysSince.toString();
      
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
          generatedRoutine
      };
  }

  return {
      type: 'workout',
      titleKey: "rec_title_generic",
      titleParams: { focus: 'Cardio / Mobility' },
      reasonKey: "rec_reason_fatigued",
      suggestedBodyParts: ['Cardio', 'Mobility'],
      relevantRoutineIds: routines.filter(r => r.routineType === 'hiit' || r.name.includes('Cardio')).map(r => r.id)
  };
};
