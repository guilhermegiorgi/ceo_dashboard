import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage, Language } from '../contexts/LanguageContext';

const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'pt' : 'en');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="relative flex items-center space-x-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 hover:border-slate-500/50 rounded-lg px-3 py-2 transition-all duration-300 group"
      title={language === 'en' ? 'Mudar para Português' : 'Switch to English'}
    >
      <Globe className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
      
      <div className="flex items-center space-x-1">
        <span 
          className={`text-sm font-medium transition-all duration-300 ${
            language === 'en' 
              ? 'text-white scale-105' 
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          EN
        </span>
        
        <div className="w-px h-4 bg-slate-600"></div>
        
        <span 
          className={`text-sm font-medium transition-all duration-300 ${
            language === 'pt' 
              ? 'text-white scale-105' 
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          PT
        </span>
      </div>
      
      {/* Animated indicator */}
      <div 
        className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ${
          language === 'en' ? 'w-1/2' : 'w-1/2 translate-x-full'
        }`}
      />
    </button>
  );
};

export default LanguageToggle;