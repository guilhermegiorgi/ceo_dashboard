import React, { useState } from 'react';
import { Brain, Settings, User, Bell, Menu, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';
import SettingsModal from './SettingsModal';
import NotificationsModal from './NotificationsModal';
import UserProfileModal from './UserProfileModal';

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
      type: 'insight',
      read: false
    },
    {
      id: 2,
      title: 'Strategic Session Scheduled',
      message: 'Cross-domain innovation workshop set for tomorrow',
      time: '1 hour ago',
      type: 'session',
      read: false
    },
    {
      id: 3,
      title: 'Decision Journal Updated',
      message: 'Resource reallocation decision validated',
      time: '3 hours ago',
      type: 'decision',
      read: true
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

  const closeAllModals = () => {
    setShowNotifications(false);
    setShowSettings(false);
    setShowUserMenu(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4 relative z-40">
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
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
            
            {/* Settings */}
            <div className="relative">
              <button 
                onClick={handleSettingsClick}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Settings className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            
            {/* User Menu */}
            <div className="relative">
              <button 
                onClick={handleUserClick}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <User className="h-5 w-5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modals */}
      {showNotifications && (
        <NotificationsModal 
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
        />
      )}

      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)}
        />
      )}

      {showUserMenu && (
        <UserProfileModal 
          onClose={() => setShowUserMenu(false)}
        />
      )}

      {/* Backdrop */}
      {(showNotifications || showSettings || showUserMenu) && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={closeAllModals}
        />
      )}
    </>
  );
};

export default Header;