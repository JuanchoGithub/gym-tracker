
import { Exercise } from '../types';
import { MUSCLES } from './muscles';

export const CHEST_EXERCISES: Exercise[] = [
  { id: 'ex-1', name: 'Bench Press', bodyPart: 'Chest', category: 'Barbell', primaryMuscles: [MUSCLES.PECTORALS, MUSCLES.FRONT_DELTS], secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.SERRATUS_ANTERIOR] },
  { id: 'ex-11', name: 'Dumbbell Fly', bodyPart: 'Chest', category: 'Dumbbell', primaryMuscles: [MUSCLES.PECTORALS], secondaryMuscles: [MUSCLES.FRONT_DELTS, MUSCLES.BICEPS] }, // Biceps stabilize the fly
  { id: 'ex-12', name: 'Incline Dumbbell Press', bodyPart: 'Chest', category: 'Dumbbell', primaryMuscles: [MUSCLES.UPPER_CHEST, MUSCLES.FRONT_DELTS], secondaryMuscles: [MUSCLES.TRICEPS] },
  { id: 'ex-21', name: 'Cable Crossover', bodyPart: 'Chest', category: 'Cable', primaryMuscles: [MUSCLES.PECTORALS, MUSCLES.LOWER_CHEST], secondaryMuscles: [MUSCLES.FRONT_DELTS, MUSCLES.BICEPS] },
  { id: 'ex-22', name: 'Decline Bench Press', bodyPart: 'Chest', category: 'Barbell', primaryMuscles: [MUSCLES.LOWER_CHEST, MUSCLES.PECTORALS], secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.FRONT_DELTS] },
  { id: 'ex-23', name: 'Push-Up', bodyPart: 'Chest', category: 'Bodyweight', primaryMuscles: [MUSCLES.PECTORALS, MUSCLES.FRONT_DELTS], secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.ABS, MUSCLES.SERRATUS_ANTERIOR] },
  { id: 'ex-24', name: 'Dips', bodyPart: 'Chest', category: 'Assisted Bodyweight', primaryMuscles: [MUSCLES.LOWER_CHEST, MUSCLES.TRICEPS], secondaryMuscles: [MUSCLES.FRONT_DELTS, MUSCLES.PECTORALS] },
  { id: 'ex-25', name: 'Incline Bench Press', bodyPart: 'Chest', category: 'Barbell', primaryMuscles: [MUSCLES.UPPER_CHEST, MUSCLES.FRONT_DELTS], secondaryMuscles: [MUSCLES.TRICEPS] },
  { id: 'ex-26', name: 'Pec Deck Fly', bodyPart: 'Chest', category: 'Machine', primaryMuscles: [MUSCLES.PECTORALS], secondaryMuscles: [MUSCLES.FRONT_DELTS] },
  { id: 'ex-27', name: 'Svend Press', bodyPart: 'Chest', category: 'Reps Only', primaryMuscles: [MUSCLES.PECTORALS], secondaryMuscles: [MUSCLES.FRONT_DELTS, MUSCLES.TRICEPS] },
  { id: 'ex-28', name: 'Landmine Press', bodyPart: 'Chest', category: 'Barbell', primaryMuscles: [MUSCLES.UPPER_CHEST, MUSCLES.FRONT_DELTS], secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.SERRATUS_ANTERIOR] },
  { id: 'ex-29', name: 'Deficit Push-Up', bodyPart: 'Chest', category: 'Bodyweight', primaryMuscles: [MUSCLES.PECTORALS], secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.FRONT_DELTS] },
  { id: 'ex-30', name: 'Archer Push-Up', bodyPart: 'Chest', category: 'Bodyweight', primaryMuscles: [MUSCLES.PECTORALS, MUSCLES.TRICEPS], secondaryMuscles: [MUSCLES.FRONT_DELTS, MUSCLES.ABS] },
  { id: 'ex-31', name: 'Machine Chest Press', bodyPart: 'Chest', category: 'Machine', primaryMuscles: [MUSCLES.PECTORALS], secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.FRONT_DELTS] },
  { id: 'ex-32', name: 'Low-to-High Cable Fly', bodyPart: 'Chest', category: 'Cable', primaryMuscles: [MUSCLES.UPPER_CHEST], secondaryMuscles: [MUSCLES.FRONT_DELTS, MUSCLES.BICEPS] },
  { id: 'ex-33', name: 'High-to-Low Cable Fly', bodyPart: 'Chest', category: 'Cable', primaryMuscles: [MUSCLES.LOWER_CHEST], secondaryMuscles: [MUSCLES.FRONT_DELTS, MUSCLES.BICEPS] },
  { id: 'ex-34', name: 'Plate Press', bodyPart: 'Chest', category: 'Reps Only', primaryMuscles: [MUSCLES.PECTORALS], secondaryMuscles: [MUSCLES.FRONT_DELTS, MUSCLES.TRICEPS] },
  { id: 'ex-35', name: 'Suspension Push-Up', bodyPart: 'Chest', category: 'Assisted Bodyweight', primaryMuscles: [MUSCLES.PECTORALS, MUSCLES.ABS], secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.FRONT_DELTS, MUSCLES.SERRATUS_ANTERIOR] },
  { id: 'ex-36', name: 'Isometric Chest Squeeze', bodyPart: 'Chest', category: 'Bodyweight', isTimed: true, primaryMuscles: [MUSCLES.PECTORALS], secondaryMuscles: [] },
  { id: 'ex-37', name: 'Speed Bench Press', bodyPart: 'Chest', category: 'Barbell', primaryMuscles: [MUSCLES.PECTORALS, MUSCLES.TRICEPS], secondaryMuscles: [MUSCLES.FRONT_DELTS] },
];
