import React, { createContext, useState, ReactNode, useCallback } from 'react';
import { en } from '../locales/en';
import { es } from '../locales/es';
// FIX: Corrected import paths to point to the index files.
import { instructionsEn } from '../locales/instructions/en';
import { instructionsEs } from '../locales/instructions/es';

// Fix: Combine translations and instructions into single objects for each language.
const translations = {
  en: { ...en, ...instructionsEn },
  es: { ...es, ...instructionsEs },
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
  const [locale, setLocale] = useState<Locale>(() => {
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'es' ? 'es' : 'en';
  });

  const t = useCallback(
    (key: TranslationKey, replacements?: Record<string, string | number>): string => {
      let message = translations[locale][key as keyof typeof translations[Locale]] || translations['en'][key as keyof typeof en] || key;
      
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
    const instructionSet = translations[locale][keyTyped as keyof typeof translations[Locale]] || translations['en'][keyTyped as keyof typeof en];
    
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