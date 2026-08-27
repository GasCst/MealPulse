import React, { createContext, useContext, useState, useEffect } from 'react';
import { LanguageCode, TRANSLATIONS, SUPPORTED_LANGUAGES, LanguageOption } from '@/constants/translations';
import { ExpoGoSafeAsyncStorage } from '@/services/supabaseService';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: string, defaultText?: string) => string;
  supportedLanguages: LanguageOption[];
}

const STORAGE_KEY = '@mealpulse_language_v2';

const LanguageContext = createContext<LanguageContextType>({
  language: 'it',
  setLanguage: async () => {},
  t: (key: string, defaultText?: string) => defaultText || key,
  supportedLanguages: SUPPORTED_LANGUAGES,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('it');

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const saved = await ExpoGoSafeAsyncStorage.getItem(STORAGE_KEY);
      if (saved && (saved in TRANSLATIONS)) {
        setLanguageState(saved as LanguageCode);
      }
    } catch (e) {
      console.warn('[LanguageContext] Failed to load saved language:', e);
    }
  };

  const setLanguage = async (newLang: LanguageCode) => {
    setLanguageState(newLang);
    try {
      await ExpoGoSafeAsyncStorage.setItem(STORAGE_KEY, newLang);
    } catch (e) {
      console.warn('[LanguageContext] Failed to save language choice:', e);
    }
  };

  const t = (key: string, defaultText?: string): string => {
    const currentDict = TRANSLATIONS[language] || TRANSLATIONS.it;
    if (currentDict && currentDict[key]) {
      return currentDict[key];
    }
    // Fallback to English, then Italian, then provided defaultText, then key
    const enDict = TRANSLATIONS.en;
    if (enDict && enDict[key]) {
      return enDict[key];
    }
    const itDict = TRANSLATIONS.it;
    if (itDict && itDict[key]) {
      return itDict[key];
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
