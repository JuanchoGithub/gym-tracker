
import { useContext, useCallback } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useI18n } from './useI18n';
import { TranslationKey } from '../contexts/I18nContext';

export const useExerciseName = () => {
    const { useLocalizedExerciseNames } = useContext(AppContext);
    const { t } = useI18n();

    const getName = useCallback((exercise: { id: string, name: string } | undefined | null) => {
        if (!exercise) return '';
        if (!useLocalizedExerciseNames) return exercise.name;
        
        // Assuming exercise.id matches translation key (e.g., 'ex-1')
        const translated = t(exercise.id as TranslationKey);
        
        // If translation returns the key itself, it means no translation found, use fallback name
        return translated !== exercise.id ? translated : exercise.name;
    }, [useLocalizedExerciseNames, t]);

    return getName;
};
