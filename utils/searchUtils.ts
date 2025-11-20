
import { Exercise } from '../types';
import { getBodyPartTKey, getCategoryTKey } from './i18nUtils';

// Use a loose type for t to avoid complex type imports
type Translator = (key: string) => string;

export const searchExercises = (
  exercises: Exercise[],
  searchTerm: string,
  t: Translator
): Exercise[] => {
  const trimmedTerm = searchTerm.trim();
  if (!trimmedTerm) return exercises;

  const terms = trimmedTerm.toLowerCase().split(/\s+/).filter(term => term.length > 0);

  return exercises.filter((exercise) => {
    const name = exercise.name.toLowerCase();
    
    // Get localized and raw values for flexible searching
    const bodyPartKey = getBodyPartTKey(exercise.bodyPart);
    const categoryKey = getCategoryTKey(exercise.category);
    
    const bodyPartLocalized = t(bodyPartKey).toLowerCase();
    const categoryLocalized = t(categoryKey).toLowerCase();
    
    const bodyPartRaw = exercise.bodyPart.toLowerCase();
    const categoryRaw = exercise.category.toLowerCase();

    // Every term in the search query must match at least one of the exercise's properties
    return terms.every(term => 
      name.includes(term) || 
      bodyPartLocalized.includes(term) || 
      categoryLocalized.includes(term) ||
      bodyPartRaw.includes(term) ||
      categoryRaw.includes(term)
    );
  });
};
