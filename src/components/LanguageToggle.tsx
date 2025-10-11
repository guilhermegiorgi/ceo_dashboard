import React from 'react';

import { useLanguage, Language } from '../contexts/LanguageContext';

const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const getButtonClasses = (lang: Language) => {
    const isActive = language === lang;
    return `px-3 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 ${
      isActive
        ? 'bg-slate-700/80 text-white shadow-inner'
        : 'bg-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
    }`;
  };

  return (
    <div className="flex items-center space-x-1 bg-slate-800/70 border border-slate-700/60 rounded-lg p-1">
      <button
        onClick={() => setLanguage('en')}
        className={getButtonClasses('en')}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('pt')}
        className={getButtonClasses('pt')}
        aria-pressed={language === 'pt'}
      >
        PT
      </button>
    </div>
  );
};

export default LanguageToggle;