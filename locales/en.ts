
import { en_common } from './modules/en_common';
import { en_train } from './modules/en_train';
import { en_history } from './modules/en_history';
import { en_profile } from './modules/en_profile';
import { en_coach } from './modules/en_coach';
import { en_templates } from './modules/en_templates';
import { en_exercise_data } from './modules/en_exercise_data';
import { en_supplements_ui } from './modules/en_supplements_ui';
import { en_onerepmax } from './modules/en_onerepmax';

export const en = {
  ...en_common,
  ...en_train,
  ...en_history,
  ...en_profile,
  ...en_coach,
  ...en_templates,
  ...en_exercise_data,
  ...en_supplements_ui,
  ...en_onerepmax,
};