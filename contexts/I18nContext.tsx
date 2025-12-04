import React, { createContext, ReactNode, useCallback } from 'react';
import { en } from '../locales/en';
import { es } from '../locales/es';
// FIX: Corrected import paths to point to the index files.
import { instructionsEn } from '../locales/instructions/en';
import { instructionsEs } from '../locales/instructions/es';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { en_exercises } from '../locales/en_exercises';
import { es_exercises } from '../locales/es_exercises';
import { en_supplements } from '../locales/en_supplements';
import { es_supplements } from '../locales/es_supplements';
import { en_supplement_explanations } from '../locales/en_supplement_explanations';
import { es_supplement_explanations } from '../locales/es_supplement_explanations';

// Fix: Combine translations and instructions into single objects for each language.
const translations = {
  en: { ...en, ...instructionsEn, ...en_exercises, ...en_supplements, ...en_supplement_explanations },
  es: { ...es, ...instructionsEs, ...es_exercises, ...es_supplements, ...es_supplement_explanations },
};

type Locale = 'en' | 'es';
export type TranslationKey = keyof typeof translations.en | keyof typeof translations.es;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, replacements?: Record<string, string | number>) => string;
  t_ins: (key: string) => { title: string; steps: string[] };
}

export const I18nContext = createContext<I18nContextType>({} as I18nContextType);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useLocalStorage<Locale>('locale', (() => {
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'es' ? 'es' : 'en';
  })());

  const t = useCallback(
    (key: TranslationKey, replacements?: Record<string, string | number>): string => {
      // Safety fallback: if locale is somehow invalid (e.g. corrupted local storage), default to 'en'
      const safeLocale = translations[locale] ? locale : 'en';
      let message = translations[safeLocale][key as keyof typeof translations[Locale]] || translations['en'][key as keyof typeof en] || key;
      
      if (typeof message !== 'string') {
          // FIX: The 'key' from TranslationKey could theoretically be a symbol or number,
          // even if we only use strings. Explicitly convert to string for type safety.
          return String(key);
      }

      if (replacements) {
        // FIX: Replaced forEach with a for...of loop to preserve type narrowing for the 'message' variable.
        // The forEach callback created a new closure, causing TypeScript to lose track of the narrowed type.
        for (const placeholder of Object.keys(replacements)) {
          message = message.replace(`{${placeholder}}`, String(replacements[placeholder]));
        }
      }

      return message;
    },
    [locale]
  );
  
  const t_ins = useCallback((key: string): { title: string; steps: string[] } => {
    const keyTyped = key as TranslationKey;
    const safeLocale = translations[locale] ? locale : 'en';
    const instructionSet = translations[safeLocale][keyTyped as keyof typeof translations[Locale]] || translations['en'][keyTyped as keyof typeof en];
    
    if (typeof instructionSet === 'object' && instructionSet !== null && 'title' in instructionSet && 'steps' in instructionSet) {
        // FIX: Removed @ts-ignore and added an explicit type assertion.
        // The type guard ensures this is safe.
        return instructionSet as { title: string, steps: string[] };
    }

    return { title: key, steps: ['Instructions not found.'] };
  }, [locale]);

  const value = { locale, setLocale, t, t_ins };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};