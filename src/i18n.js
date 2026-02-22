// ============================================================
// i18n Configuration — Multi-language support via i18next
// ============================================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './locales/en/translation.json';
import hi from './locales/hi/translation.json';
import mr from './locales/mr/translation.json';
import ta from './locales/ta/translation.json';
import te from './locales/te/translation.json';
import kn from './locales/kn/translation.json';
import pa from './locales/pa/translation.json';
import bn from './locales/bn/translation.json';
import gu from './locales/gu/translation.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            hi: { translation: hi },
            mr: { translation: mr },
            ta: { translation: ta },
            te: { translation: te },
            kn: { translation: kn },
            pa: { translation: pa },
            bn: { translation: bn },
            gu: { translation: gu },
        },
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // React already escapes
        },
        detection: {
            order: ['localStorage', 'navigator'],
            lookupLocalStorage: 'carebridge_lang',
            caches: ['localStorage'],
        },
    });

export default i18n;
