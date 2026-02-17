
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import de from '../locales/de.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import it from '../locales/it.json';

export type Locale = 'de-DE' | 'en-US' | 'es-ES' | 'fr-FR' | 'it-IT';
type Translations = typeof de;

const translations: Record<Locale, Translations> = {
  'de-DE': de,
  'en-US': en,
  'es-ES': es,
  'fr-FR': fr,
  'it-IT': it,
};

interface LanguageContextType {
  language: Locale;
  setLanguage: (lang: Locale) => void;
  t: (key: keyof Translations) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Locale>('de-DE');

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    const storedLang = localStorage.getItem('impostor_language') as Locale;
    if (storedLang && translations[storedLang]) {
      setLanguage(storedLang);
    }
  }, []);

  const handleSetLanguage = (lang: Locale) => {
    setLanguage(lang);
    localStorage.setItem('impostor_language', lang);
  };

  const t = (key: keyof Translations) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
