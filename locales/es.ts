
import { es_common } from './modules/es_common';
import { es_train } from './modules/es_train';
import { es_history } from './modules/es_history';
import { es_profile } from './modules/es_profile';
import { es_coach } from './modules/es_coach';
import { es_templates } from './modules/es_templates';
import { es_exercise_data } from './modules/es_exercise_data';
import { es_supplements_ui } from './modules/es_supplements_ui';

export const es = {
  ...es_common,
  ...es_train,
  ...es_history,
  ...es_profile,
  ...es_coach,
  ...es_templates,
  ...es_exercise_data,
  ...es_supplements_ui,
};
