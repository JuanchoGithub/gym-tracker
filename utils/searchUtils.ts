
import { Exercise } from '../types';
import { getBodyPartTKey, getCategoryTKey, getMuscleTKey } from './i18nUtils';

// Use a loose type for t to avoid complex type imports and symbol errors
type Translator = (key: any) => string;

const normalizeText = (text: string): string => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export const searchExercises = (
  exercises: Exercise[],
  searchTerm: string,
  t: Translator
): Exercise[] => {
  const trimmedTerm = searchTerm.trim();
  if (!trimmedTerm) return exercises;

  const terms = normalizeText(trimmedTerm).split(/\s+/).filter(term => term.length > 0);

  return exercises.filter((exercise) => {
    const name = normalizeText(exercise.name);
    
    // Get localized and raw values for flexible searching
    const bodyPartKey = getBodyPartTKey(exercise.bodyPart);
    const categoryKey = getCategoryTKey(exercise.category);
    
    const bodyPartLocalized = normalizeText(t(bodyPartKey));
    const categoryLocalized = normalizeText(t(categoryKey));
    
    const bodyPartRaw = normalizeText(exercise.bodyPart);
    const categoryRaw = normalizeText(exercise.category);

    // Gather muscle names (both localized and raw)
    const muscleNames: string[] = [];
    if (exercise.primaryMuscles) {
        exercise.primaryMuscles.forEach(m => {
            muscleNames.push(normalizeText(t(getMuscleTKey(m))));
            muscleNames.push(normalizeText(m));
        });
    }
    if (exercise.secondaryMuscles) {
        exercise.secondaryMuscles.forEach(m => {
            muscleNames.push(normalizeText(t(getMuscleTKey(m))));
            muscleNames.push(normalizeText(m));
        });
    }

    // Every term in the search query must match at least one of the exercise's properties
    return terms.every(term => 
      name.includes(term) || 
      bodyPartLocalized.includes(term) || 
      categoryLocalized.includes(term) ||
      bodyPartRaw.includes(term) ||
      categoryRaw.includes(term) ||
      muscleNames.some(m => m.includes(term))
    );
  });
};
