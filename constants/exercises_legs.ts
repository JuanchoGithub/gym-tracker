
import { Exercise } from '../types';
import { MUSCLES } from './muscles';

export const LEG_EXERCISES: Exercise[] = [
  // Legs (Quads/Hams)
  { id: 'ex-16', name: 'Leg Curl', bodyPart: 'Legs', category: 'Machine', primaryMuscles: [MUSCLES.HAMSTRINGS], secondaryMuscles: [MUSCLES.CALVES] },
  { id: 'ex-17', name: 'Leg Extension', bodyPart: 'Legs', category: 'Machine', primaryMuscles: [MUSCLES.QUADS], secondaryMuscles: [] },
  { id: 'ex-9', name: 'Leg Press', bodyPart: 'Legs', category: 'Machine', primaryMuscles: [MUSCLES.QUADS, MUSCLES.GLUTES], secondaryMuscles: [MUSCLES.HAMSTRINGS, MUSCLES.CALVES] },
  { id: 'ex-2', name: 'Barbell Squat', bodyPart: 'Legs', category: 'Barbell', primaryMuscles: [MUSCLES.QUADS, MUSCLES.GLUTES], secondaryMuscles: [MUSCLES.HAMSTRINGS, MUSCLES.LOWER_BACK, MUSCLES.ADDUCTORS, MUSCLES.ABS, MUSCLES.SPINAL_ERECTORS] },
  { id: 'ex-98', name: 'Romanian Deadlift', bodyPart: 'Legs', category: 'Barbell', primaryMuscles: [MUSCLES.HAMSTRINGS, MUSCLES.GLUTES], secondaryMuscles: [MUSCLES.LOWER_BACK, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS, MUSCLES.ADDUCTORS] },
  { id: 'ex-99', name: 'Dumbbell Walking Lunge', bodyPart: 'Legs', category: 'Dumbbell', isUnilateral: true, primaryMuscles: [MUSCLES.QUADS, MUSCLES.GLUTES], secondaryMuscles: [MUSCLES.HAMSTRINGS, MUSCLES.CALVES, MUSCLES.ADDUCTORS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-100', name: 'Bulgarian Split Squat', bodyPart: 'Legs', category: 'Dumbbell', isUnilateral: true, primaryMuscles: [MUSCLES.QUADS, MUSCLES.GLUTES], secondaryMuscles: [MUSCLES.HAMSTRINGS, MUSCLES.ADDUCTORS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-101', name: 'Front Squat', bodyPart: 'Legs', category: 'Barbell', primaryMuscles: [MUSCLES.QUADS], secondaryMuscles: [MUSCLES.GLUTES, MUSCLES.LOWER_BACK, MUSCLES.ABS, MUSCLES.TRAPS, MUSCLES.RHOMBOIDS] },
  { id: 'ex-102', name: 'Hack Squat', bodyPart: 'Legs', category: 'Machine', primaryMuscles: [MUSCLES.QUADS], secondaryMuscles: [MUSCLES.GLUTES, MUSCLES.CALVES] },
  { id: 'ex-103', name: 'Dumbbell Step-Up', bodyPart: 'Legs', category: 'Dumbbell', isUnilateral: true, primaryMuscles: [MUSCLES.QUADS, MUSCLES.GLUTES], secondaryMuscles: [MUSCLES.CALVES, MUSCLES.HAMSTRINGS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-108', name: 'Sumo Squat', bodyPart: 'Legs', category: 'Dumbbell', primaryMuscles: [MUSCLES.QUADS, MUSCLES.ADDUCTORS, MUSCLES.GLUTES], secondaryMuscles: [MUSCLES.HAMSTRINGS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-109', name: 'Goblet Squat', bodyPart: 'Legs', category: 'Dumbbell', primaryMuscles: [MUSCLES.QUADS, MUSCLES.GLUTES], secondaryMuscles: [MUSCLES.ABS, MUSCLES.TRAPS, MUSCLES.FOREARMS, MUSCLES.BICEPS] },
  { id: 'ex-110', name: 'Pistol Squat', bodyPart: 'Legs', category: 'Bodyweight', isUnilateral: true, primaryMuscles: [MUSCLES.QUADS, MUSCLES.GLUTES], secondaryMuscles: [MUSCLES.CALVES, MUSCLES.ABS] },
  { id: 'ex-111', name: 'Wall Sit', bodyPart: 'Legs', category: 'Bodyweight', isTimed: true, primaryMuscles: [MUSCLES.QUADS], secondaryMuscles: [MUSCLES.CALVES] },
  { id: 'ex-112', name: 'Sissy Squat', bodyPart: 'Legs', category: 'Bodyweight', primaryMuscles: [MUSCLES.QUADS], secondaryMuscles: [MUSCLES.ABS] },
  { id: 'ex-113', name: 'Jefferson Squat', bodyPart: 'Legs', category: 'Barbell', primaryMuscles: [MUSCLES.QUADS, MUSCLES.GLUTES, MUSCLES.ADDUCTORS], secondaryMuscles: [MUSCLES.HAMSTRINGS, MUSCLES.FOREARMS, MUSCLES.WRIST_FLEXORS] },
  { id: 'ex-114', name: 'Band Leg Curl', bodyPart: 'Legs', category: 'Reps Only', isUnilateral: true, primaryMuscles: [MUSCLES.HAMSTRINGS], secondaryMuscles: [] },
  { id: 'ex-116', name: 'Box Jump', bodyPart: 'Legs', category: 'Plyometrics', primaryMuscles: [MUSCLES.QUADS, MUSCLES.GLUTES, MUSCLES.CALVES], secondaryMuscles: [MUSCLES.HAMSTRINGS] },
  { id: 'ex-150', name: 'Broad Jump', bodyPart: 'Legs', category: 'Plyometrics', primaryMuscles: [MUSCLES.QUADS, MUSCLES.GLUTES, MUSCLES.HAMSTRINGS], secondaryMuscles: [MUSCLES.CALVES] },
  { id: 'ex-151', name: 'Tuck Jump', bodyPart: 'Legs', category: 'Plyometrics', primaryMuscles: [MUSCLES.QUADS, MUSCLES.CALVES], secondaryMuscles: [MUSCLES.ABS] },
  { id: 'ex-152', name: 'Depth Jump', bodyPart: 'Legs', category: 'Plyometrics', primaryMuscles: [MUSCLES.QUADS, MUSCLES.GLUTES, MUSCLES.CALVES], secondaryMuscles: [] },
  { id: 'ex-160', name: 'Squat', bodyPart: 'Legs', category: 'Bodyweight', primaryMuscles: [MUSCLES.QUADS, MUSCLES.GLUTES], secondaryMuscles: [MUSCLES.HAMSTRINGS] },
  { id: 'ex-161', name: 'Step-Up', bodyPart: 'Legs', category: 'Bodyweight', isUnilateral: true, primaryMuscles: [MUSCLES.QUADS, MUSCLES.GLUTES], secondaryMuscles: [MUSCLES.CALVES] },
  { id: 'ex-162', name: 'Lunge', bodyPart: 'Legs', category: 'Bodyweight', isUnilateral: true, primaryMuscles: [MUSCLES.QUADS, MUSCLES.GLUTES], secondaryMuscles: [MUSCLES.HAMSTRINGS] },

  // Glutes
  { id: 'ex-104', name: 'Glute Bridge', bodyPart: 'Glutes', category: 'Bodyweight', primaryMuscles: [MUSCLES.GLUTES], secondaryMuscles: [MUSCLES.HAMSTRINGS] },
  { id: 'ex-141', name: 'Barbell Hip Thrust', bodyPart: 'Glutes', category: 'Barbell', primaryMuscles: [MUSCLES.GLUTES], secondaryMuscles: [MUSCLES.HAMSTRINGS, MUSCLES.QUADS] },
  { id: 'ex-142', name: 'Glute Kickback', bodyPart: 'Glutes', category: 'Cable', isUnilateral: true, primaryMuscles: [MUSCLES.GLUTES], secondaryMuscles: [MUSCLES.HAMSTRINGS] },
  { id: 'ex-143', name: 'Hip Abduction Machine', bodyPart: 'Glutes', category: 'Machine', primaryMuscles: [MUSCLES.GLUTES, MUSCLES.ABDUCTORS], secondaryMuscles: [] },
  { id: 'ex-144', name: 'Single-Leg Glute Bridge', bodyPart: 'Glutes', category: 'Bodyweight', isUnilateral: true, primaryMuscles: [MUSCLES.GLUTES], secondaryMuscles: [MUSCLES.HAMSTRINGS] },

  // Calves
  { id: 'ex-18', name: 'Calf Raise', bodyPart: 'Calves', category: 'Machine', primaryMuscles: [MUSCLES.GASTROCNEMIUS, MUSCLES.SOLEUS], secondaryMuscles: [] },
  { id: 'ex-105', name: 'Seated Calf Raise', bodyPart: 'Calves', category: 'Machine', primaryMuscles: [MUSCLES.SOLEUS], secondaryMuscles: [] },
  { id: 'ex-106', name: 'Donkey Calf Raise', bodyPart: 'Calves', category: 'Machine', primaryMuscles: [MUSCLES.GASTROCNEMIUS], secondaryMuscles: [] },
  { id: 'ex-107', name: 'Leg Press Calf Raise', bodyPart: 'Calves', category: 'Machine', primaryMuscles: [MUSCLES.GASTROCNEMIUS, MUSCLES.SOLEUS], secondaryMuscles: [] },
];