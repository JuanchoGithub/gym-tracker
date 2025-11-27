
import { WorkoutSession, Routine, Exercise, BodyPart } from '../types';
import { calculateMuscleFreshness } from './fatigueUtils';
import { MUSCLES } from '../constants/muscles';

export interface Recommendation {
  type: 'rest' | 'workout';
  titleKey: string;
  titleParams?: Record<string, string | number>;
  reasonKey: string;
  reasonParams?: Record<string, string | number>;
  suggestedBodyParts: BodyPart[];
  relevantRoutineIds: string[];
}

// Helper mappings
const PUSH_MUSCLES = [MUSCLES.PECTORALS, MUSCLES.FRONT_DELTS, MUSCLES.TRICEPS];
const PULL_MUSCLES = [MUSCLES.LATS, MUSCLES.TRAPS, MUSCLES.BICEPS];
const LEG_MUSCLES = [MUSCLES.QUADS, MUSCLES.HAMSTRINGS, MUSCLES.GLUTES];

// Function to get the timestamp of the last time a muscle was trained
const getLastTrainedDate = (history: WorkoutSession[], muscles: string[]): number => {
  let lastDate = 0;
  const muscleSet = new Set(muscles);

  // Iterate through history (newest first is standard, but we check all)
  // Optimization: since history is usually sorted newest first in AppContext, 
  // we can stop early? No, because we need to check specific exercises.
  
  for (const session of history) {
    if (session.endTime <= lastDate) continue; // Already found a more recent one (if we processed out of order, but let's be safe)

    // Check exercises in this session
    // We need exercise definitions to map ID to muscles.
    // This function assumes we can access definitions or they are passed.
    // Actually, this function is helper, let's move logic inside main function where we have exercises list.
  }
  return lastDate;
};

export const getWorkoutRecommendation = (
  history: WorkoutSession[],
  routines: Routine[],
  exercises: Exercise[]
): Recommendation | null => {
  if (history.length === 0) {
      const fullBodyRoutines = routines.filter(r => r.name.toLowerCase().includes('full body') || r.name.toLowerCase().includes('cuerpo completo'));
      return {
          type: 'workout',
          titleKey: "rec_title_generic",
          titleParams: { focus: 'Full Body' },
          reasonKey: "rec_reason_neglected",
          reasonParams: { muscles: 'Full Body', days: '∞' },
          suggestedBodyParts: ['Full Body'],
          relevantRoutineIds: fullBodyRoutines.map(r => r.id)
      };
  }

  const freshness = calculateMuscleFreshness(history, exercises);
  
  // 1. Global Fatigue
  const scores = Object.values(freshness);
  const avgFreshness = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
  const hasFullyFreshMuscle = scores.some(s => s > 90);

  if (avgFreshness < 50 && !hasFullyFreshMuscle) {
     return {
         type: 'rest',
         titleKey: "rec_title_rest",
         reasonKey: "rec_reason_fatigued",
         suggestedBodyParts: ['Mobility', 'Cardio'],
         relevantRoutineIds: routines.filter(r => 
             r.exercises.some(e => {
                 const exDef = exercises.find(ed => ed.id === e.exerciseId);
                 return exDef?.category === 'Cardio' || exDef?.bodyPart === 'Mobility';
             })
         ).map(r => r.id)
     };
  }

  // 2. Find Neglected/Fresh Groups
  
  const getGroupData = (id: string, muscleNames: string[], bodyParts: BodyPart[]) => {
      const groupScores = muscleNames.map(m => freshness[m] !== undefined ? freshness[m] : 100); 
      const score = groupScores.reduce((a,b) => a + b, 0) / groupScores.length;

      // Calculate days since last trained for this group (min days aka most recent session involving any of these muscles)
      let lastTrainedTime = 0;
      
      // We scan history for the most recent session that hit ANY of these muscles significantly
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
              break; // Found the most recent one because history is sorted desc
          }
      }

      const daysSince = lastTrainedTime === 0 ? 999 : Math.floor((Date.now() - lastTrainedTime) / (1000 * 60 * 60 * 24));

      return { id, score, daysSince, bodyParts };
  };

  const pushGroup = getGroupData('Push', PUSH_MUSCLES, ['Chest', 'Shoulders', 'Triceps']);
  const pullGroup = getGroupData('Pull', PULL_MUSCLES, ['Back', 'Biceps']);
  const legsGroup = getGroupData('Legs', LEG_MUSCLES, ['Legs', 'Glutes', 'Calves']);

  const groups = [pushGroup, pullGroup, legsGroup];

  // Logic: 
  // 1. Filter for groups that are "Ready" (score > 85)
  // 2. Sort by Days Since Last Trained (Descending - most neglected first)
  
  const readyGroups = groups.filter(g => g.score > 85);
  
  if (readyGroups.length > 0) {
      readyGroups.sort((a, b) => b.daysSince - a.daysSince);
      const winner = readyGroups[0];
      
      // Construct title key
      let titleKey = 'rec_title_generic';
      if (winner.id === 'Push') titleKey = 'rec_title_push';
      if (winner.id === 'Pull') titleKey = 'rec_title_pull';
      if (winner.id === 'Legs') titleKey = 'rec_title_legs';

      // Determine relevant routines
      // A routine is relevant if it hits the primary body part of the winner group
      const relevantRoutineIds = routines.filter(r => {
          // Simple heuristic: check if routine name contains the group name (e.g. "Push") OR hits the body parts
          const nameMatch = r.name.toLowerCase().includes(winner.id.toLowerCase());
          if (nameMatch) return true;

          // Deep check exercises
          const targetCount = r.exercises.reduce((count, ex) => {
              const exDef = exercises.find(e => e.id === ex.exerciseId);
              if (exDef && winner.bodyParts.includes(exDef.bodyPart)) {
                  return count + 1;
              }
              return count;
          }, 0);
          
          // If > 40% of exercises match, it's relevant
          return r.exercises.length > 0 && (targetCount / r.exercises.length) > 0.4;
      }).map(r => r.id);

      const daysText = winner.daysSince === 999 ? 'many' : winner.daysSince.toString();

      return {
          type: 'workout',
          titleKey,
          titleParams: { focus: winner.id },
          reasonKey: winner.daysSince > 4 ? 'rec_reason_neglected' : 'rec_reason_fresh',
          reasonParams: { muscles: winner.bodyParts[0], days: daysText }, // e.g., "Back" or "Chest"
          suggestedBodyParts: winner.bodyParts,
          relevantRoutineIds
      };
  }

  // Default: Full Body or Cardio if everything is kinda meh
  return {
      type: 'workout',
      titleKey: "rec_title_generic",
      titleParams: { focus: 'Cardio / Mobility' },
      reasonKey: "rec_reason_fatigued",
      suggestedBodyParts: ['Cardio', 'Mobility'],
      relevantRoutineIds: routines.filter(r => r.routineType === 'hiit' || r.name.includes('Cardio')).map(r => r.id)
  };
};
