
import { Exercise } from '../types';
import { MUSCLES } from './muscles';

export const CARDIO_MOBILITY_EXERCISES: Exercise[] = [
  // Cardio
  { id: 'ex-19', name: 'Running', bodyPart: 'Cardio', category: 'Cardio', isTimed: true, primaryMuscles: [MUSCLES.CARDIOVASCULAR_SYSTEM], secondaryMuscles: [MUSCLES.QUADS, MUSCLES.HAMSTRINGS, MUSCLES.CALVES] },
  { id: 'ex-115', name: 'Cycling (Stationary)', bodyPart: 'Cardio', category: 'Cardio', isTimed: true, primaryMuscles: [MUSCLES.CARDIOVASCULAR_SYSTEM, MUSCLES.QUADS], secondaryMuscles: [MUSCLES.CALVES] },
  { id: 'ex-129', name: 'Jumping Jacks', bodyPart: 'Cardio', category: 'Cardio', isTimed: true, primaryMuscles: [MUSCLES.CARDIOVASCULAR_SYSTEM], secondaryMuscles: [MUSCLES.CALVES, MUSCLES.SIDE_DELTS] },
  { id: 'ex-131', name: 'Mountain Climber', bodyPart: 'Cardio', category: 'Cardio', isTimed: true, primaryMuscles: [MUSCLES.CARDIOVASCULAR_SYSTEM, MUSCLES.ABS], secondaryMuscles: [MUSCLES.FRONT_DELTS, MUSCLES.HIP_FLEXORS] },
  { id: 'ex-135', name: 'Jump Rope', bodyPart: 'Cardio', category: 'Cardio', isTimed: true, primaryMuscles: [MUSCLES.CARDIOVASCULAR_SYSTEM, MUSCLES.CALVES], secondaryMuscles: [] },
  { id: 'ex-136', name: 'Stair Climber', bodyPart: 'Cardio', category: 'Cardio', isTimed: true, primaryMuscles: [MUSCLES.CARDIOVASCULAR_SYSTEM, MUSCLES.GLUTES, MUSCLES.QUADS], secondaryMuscles: [MUSCLES.CALVES] },
  { id: 'ex-158', name: 'High Knees', bodyPart: 'Cardio', category: 'Cardio', isTimed: true, primaryMuscles: [MUSCLES.CARDIOVASCULAR_SYSTEM, MUSCLES.HIP_FLEXORS], secondaryMuscles: [MUSCLES.CALVES] },

  // Full Body
  { id: 'ex-130', name: 'Burpee', bodyPart: 'Full Body', category: 'Cardio', isTimed: true, primaryMuscles: [MUSCLES.CARDIOVASCULAR_SYSTEM, MUSCLES.PECTORALS, MUSCLES.QUADS], secondaryMuscles: [MUSCLES.FRONT_DELTS, MUSCLES.ABS] },
  { id: 'ex-132', name: 'Rowing (Machine)', bodyPart: 'Full Body', category: 'Cardio', isTimed: true, primaryMuscles: [MUSCLES.CARDIOVASCULAR_SYSTEM, MUSCLES.LATS], secondaryMuscles: [MUSCLES.QUADS, MUSCLES.HAMSTRINGS, MUSCLES.BICEPS, MUSCLES.LOWER_BACK] },
  { id: 'ex-133', name: 'Battle Rope', bodyPart: 'Full Body', category: 'Cardio', isTimed: true, primaryMuscles: [MUSCLES.CARDIOVASCULAR_SYSTEM, MUSCLES.FRONT_DELTS], secondaryMuscles: [MUSCLES.BICEPS, MUSCLES.TRICEPS, MUSCLES.ABS] },
  { id: 'ex-134', name: 'Kettlebell Swing', bodyPart: 'Full Body', category: 'Kettlebell', primaryMuscles: [MUSCLES.GLUTES, MUSCLES.HAMSTRINGS], secondaryMuscles: [MUSCLES.LOWER_BACK, MUSCLES.FRONT_DELTS, MUSCLES.FOREARMS] },
  { id: 'ex-137', name: 'Swimming', bodyPart: 'Full Body', category: 'Cardio', isTimed: true, primaryMuscles: [MUSCLES.CARDIOVASCULAR_SYSTEM, MUSCLES.LATS], secondaryMuscles: [MUSCLES.FRONT_DELTS, MUSCLES.QUADS] },
  { id: 'ex-145', name: 'Turkish Get-Up', bodyPart: 'Full Body', category: 'Kettlebell', primaryMuscles: [MUSCLES.FRONT_DELTS, MUSCLES.ABS], secondaryMuscles: [MUSCLES.QUADS, MUSCLES.GLUTES, MUSCLES.TRICEPS] },
  { id: 'ex-146', name: 'Kettlebell Clean & Press', bodyPart: 'Full Body', category: 'Kettlebell', primaryMuscles: [MUSCLES.FRONT_DELTS, MUSCLES.GLUTES, MUSCLES.HAMSTRINGS], secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.TRAPS] },
  { id: 'ex-147', name: 'Kettlebell Snatch', bodyPart: 'Full Body', category: 'Kettlebell', primaryMuscles: [MUSCLES.GLUTES, MUSCLES.HAMSTRINGS, MUSCLES.FRONT_DELTS], secondaryMuscles: [MUSCLES.LOWER_BACK, MUSCLES.TRAPS] },
  { id: 'ex-149', name: 'Medicine Ball Slam', bodyPart: 'Full Body', category: 'Reps Only', primaryMuscles: [MUSCLES.LATS, MUSCLES.ABS], secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.FRONT_DELTS] },

  // Mobility
  { id: 'ex-138', name: 'Sun Salutation', bodyPart: 'Mobility', category: 'Bodyweight', isTimed: true, primaryMuscles: [MUSCLES.CARDIOVASCULAR_SYSTEM], secondaryMuscles: [] },
  { id: 'ex-153', name: 'Foam Rolling', bodyPart: 'Mobility', category: 'Bodyweight', isTimed: true, primaryMuscles: [], secondaryMuscles: [] },
  { id: 'ex-154', name: 'Hip Flexor Stretch', bodyPart: 'Mobility', category: 'Bodyweight', isTimed: true, primaryMuscles: [MUSCLES.HIP_FLEXORS], secondaryMuscles: [] },
  { id: 'ex-155', name: 'Cat-Cow Stretch', bodyPart: 'Mobility', category: 'Bodyweight', isTimed: true, primaryMuscles: [MUSCLES.LOWER_BACK], secondaryMuscles: [MUSCLES.ABS] },
];
