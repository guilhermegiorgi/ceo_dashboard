import React, { useState } from 'react';
import { Brain, Settings, User, Bell, Menu, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';

const Header: React.FC = () => {
  const { t } = useLanguage();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifications = [
    {
      id: 1,
      title: 'New AI Insight Available',
      message: 'Market opportunity detected in healthcare AI',
      time: '2 minutes ago',
      type: 'insight'
    },
    {
      id: 2,
      title: 'Strategic Session Scheduled',
      message: 'Cross-domain innovation workshop set for tomorrow',
      time: '1 hour ago',
      type: 'session'
    },
    {
      id: 3,
      title: 'Decision Journal Updated',
      message: 'Resource reallocation decision validated',
      time: '3 hours ago',
      type: 'decision'
    }
  ];

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    setShowSettings(false);
    setShowUserMenu(false);
  };

  const handleSettingsClick = () => {
    setShowSettings(!showSettings);
    setShowNotifications(false);
    setShowUserMenu(false);
  };

  const handleUserClick = () => {
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false);
    setShowSettings(false);
  };

  const handleExportData = () => {
    // Simulate data export
    const data = {
      insights: 'AI insights data...',
      decisions: 'Decision journal data...',
      sessions: 'Strategic sessions data...',
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Dashboard data exported successfully!');
    setShowSettings(false);
  };

  const handleBackupData = () => {
    // Simulate backup
    alert('Data backup initiated. You will receive a confirmation email when complete.');
    setShowSettings(false);
  };

  const handleClearCache = () => {
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    alert('Cache cleared successfully!');
    setShowSettings(false);
  };

  return (
    <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4 relative">
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
          
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={handleNotificationClick}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors relative"
            >
              <Bell className="h-5 w-5 text-slate-400" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                <div className="p-4 border-b border-slate-700">
                  <h3 className="text-white font-medium">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="p-4 border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors cursor-pointer">
                      <h4 className="text-white text-sm font-medium">{notification.title}</h4>
                      <p className="text-slate-400 text-xs mt-1">{notification.message}</p>
                      <span className="text-slate-500 text-xs">{notification.time}</span>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-slate-700">
                  <button className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Settings */}
          <div className="relative">
            <button 
              onClick={handleSettingsClick}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Settings className="h-5 w-5 text-slate-400" />
            </button>
            
            {showSettings && (
              <div className="absolute right-0 top-12 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                <div className="p-4 border-b border-slate-700">
                  <h3 className="text-white font-medium">Settings</h3>
                </div>
                <div className="p-2">
                  <button 
                    onClick={handleExportData}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700/50 rounded transition-colors"
                  >
                    Export Dashboard Data
                  </button>
                  <button 
                    onClick={handleBackupData}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700/50 rounded transition-colors"
                  >
                    Backup to Cloud
                  </button>
                  <button 
                    onClick={handleClearCache}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700/50 rounded transition-colors"
                  >
                    Clear Cache
                  </button>
                  <div className="border-t border-slate-700 my-2"></div>
                  <button className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700/50 rounded transition-colors">
                    API Configuration
                  </button>
                  <button className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700/50 rounded transition-colors">
                    Preferences
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* User Menu */}
          <div className="relative">
            <button 
              onClick={handleUserClick}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <User className="h-5 w-5 text-slate-400" />
            </button>
            
            {showUserMenu && (
              <div className="absolute right-0 top-12 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                <div className="p-4 border-b border-slate-700">
                  <div className="text-white font-medium">CEO Dashboard</div>
                  <div className="text-slate-400 text-sm">admin@gg-ai-labs.com</div>
                </div>
                <div className="p-2">
                  <button className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700/50 rounded transition-colors">
                    Profile Settings
                  </button>
                  <button className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700/50 rounded transition-colors">
                    Account Security
                  </button>
                  <button className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700/50 rounded transition-colors">
                    Billing & Usage
                  </button>
                  <div className="border-t border-slate-700 my-2"></div>
                  <button className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-500/10 rounded transition-colors">
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;