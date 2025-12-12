
import { Exercise } from '../types';
import { MUSCLES } from './muscles';

export const MOBILITY_EXERCISES: Exercise[] = [
  // Mobility
  { id: 'ex-138', name: 'Sun Salutation', bodyPart: 'Mobility', category: 'Bodyweight', isTimed: true, primaryMuscles: [MUSCLES.CARDIOVASCULAR_SYSTEM], secondaryMuscles: [] },
  { id: 'ex-153', name: 'Foam Rolling', bodyPart: 'Mobility', category: 'Bodyweight', isTimed: true, primaryMuscles: [], secondaryMuscles: [] },
  { id: 'ex-154', name: 'Hip Flexor Stretch', bodyPart: 'Mobility', category: 'Bodyweight', isTimed: true, isUnilateral: true, primaryMuscles: [MUSCLES.HIP_FLEXORS], secondaryMuscles: [] },
  { id: 'ex-155', name: 'Cat-Cow Stretch', bodyPart: 'Mobility', category: 'Bodyweight', isTimed: true, primaryMuscles: [MUSCLES.LOWER_BACK], secondaryMuscles: [MUSCLES.ABS] },
];
