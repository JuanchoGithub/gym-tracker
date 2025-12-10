
import { Exercise } from '../types';
import { CHEST_EXERCISES } from './exercises_chest';
import { BACK_EXERCISES } from './exercises_back';
import { SHOULDER_EXERCISES } from './exercises_shoulders';
import { ARM_EXERCISES } from './exercises_arms';
import { LEG_EXERCISES } from './exercises_legs';
import { CORE_EXERCISES } from './exercises_core';
import { CARDIO_MOBILITY_EXERCISES } from './exercises_cardio';

export const PREDEFINED_EXERCISES: Exercise[] = [
  ...CHEST_EXERCISES,
  ...BACK_EXERCISES,
  ...SHOULDER_EXERCISES,
  ...ARM_EXERCISES,
  ...LEG_EXERCISES,
  ...CORE_EXERCISES,
  ...CARDIO_MOBILITY_EXERCISES
];
