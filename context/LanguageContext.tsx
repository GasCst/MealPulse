import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageCode, TRANSLATIONS, SUPPORTED_LANGUAGES, LanguageOption } from '@/constants/translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: string) => string;
  supportedLanguages: LanguageOption[];
}

const STORAGE_KEY = '@mealpulse_language';

const LanguageContext = createContext<LanguageContextType>({
  language: 'it',
  setLanguage: async () => {},
  t: (key: string) => key,
  supportedLanguages: SUPPORTED_LANGUAGES,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('it');

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
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
      await AsyncStorage.setItem(STORAGE_KEY, newLang);
    } catch (e) {
      console.warn('[LanguageContext] Failed to save language choice:', e);
    }
  };

  const t = (key: string): string => {
    const langDict = TRANSLATIONS[language] || TRANSLATIONS.it;
    return langDict[key] || TRANSLATIONS.en[key] || key;
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
