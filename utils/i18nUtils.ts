import { TranslationKey } from '../contexts/I18nContext';

export const getBodyPartTKey = (bodyPart: string): TranslationKey => {
    return `body_part_${bodyPart.toLowerCase().replace(/ /g, '_')}` as TranslationKey;
}

export const getCategoryTKey = (category: string): TranslationKey => {
    return `category_${category.toLowerCase().replace(/ /g, '_')}` as TranslationKey;
}
