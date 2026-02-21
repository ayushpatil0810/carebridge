// ============================================================
// Language Selector — Switch app language via i18next
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGES = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'mr', label: 'Marathi', native: 'मराठी' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు' },
    { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
    { code: 'bn', label: 'Bengali', native: 'বাংলা' },
    { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
];

export default function LanguageSelector() {
    const { i18n, t } = useTranslation();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

    useEffect(() => {
        function handleClickOutside(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const changeLang = (code) => {
        i18n.changeLanguage(code);
        setOpen(false);
    };

    return (
        <div className="language-selector" ref={ref}>
            <button
                className="language-selector-btn"
                onClick={() => setOpen(!open)}
                title={t('sidebar.language')}
            >
                <Globe size={14} />
                <span>{currentLang.native}</span>
            </button>
            {open && (
                <ul className="language-selector-dropdown">
                    {LANGUAGES.map(lang => (
                        <li
                            key={lang.code}
                            className={`language-option ${lang.code === i18n.language ? 'active' : ''}`}
                            onClick={() => changeLang(lang.code)}
                        >
                            <span className="lang-native">{lang.native}</span>
                            <span className="lang-label">{lang.label}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
