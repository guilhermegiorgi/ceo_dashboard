import React from 'react';
import { Brain, Settings, User, Bell } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';

const Header: React.FC = () => {
  const { t } = useLanguage();

  return (
    <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{t('header.title')}</h1>
            <p className="text-sm text-slate-400">{t('header.subtitle')}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <LanguageToggle />
          
          <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors relative">
            <Bell className="h-5 w-5 text-slate-400" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
          </button>
          <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <Settings className="h-5 w-5 text-slate-400" />
          </button>
          <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <User className="h-5 w-5 text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;