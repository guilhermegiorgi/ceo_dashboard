'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bell, Settings, User, Search } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import LanguageToggle from './LanguageToggle';
import NotificationsModal from './NotificationsModal';
import UserProfileModal from './UserProfileModal';

const Header: React.FC = () => {
  const { t } = useLanguage();
  const { user, loading: userLoading } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifications = [
    {
      id: 1,
      title: 'Novo Insight de IA Disponível',
      message: 'Oportunidade de mercado detectada em IA para saúde',
      time: '2 minutos atrás',
      type: 'insight',
      read: false
    },
    {
      id: 2,
      title: 'Sessão Estratégica Agendada',
      message: 'Workshop de inovação cross-domain marcado para amanhã',
      time: '1 hora atrás',
      type: 'session',
      read: false
    },
    {
      id: 3,
      title: 'Diário de Decisões Atualizado',
      message: 'Decisão de realocação de recursos validada',
      time: '3 horas atrás',
      type: 'decision',
      read: true
    }
  ];

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  };

  const handleUserClick = () => {
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false);
  };

  const closeAllModals = () => {
    setShowNotifications(false);
    setShowUserMenu(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-6 relative z-30 flex items-center h-16">
        <div className="flex items-center justify-between w-full">
          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('header.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Right Side Actions */}
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
            <Link 
              href="/settings"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors block"
              onClick={closeAllModals}
            >
              <Settings className="h-5 w-5 text-slate-400" />
            </Link>
            
            {/* User Menu */}
            <div className="relative">
              <button 
                onClick={handleUserClick}
                className="flex items-center space-x-2 p-1 hover:bg-slate-800 rounded-lg transition-colors"
              >
                {user?.picture ? (
                  <img 
                    src={user.picture} 
                    alt={user.name || 'User'} 
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => {
                      // Fallback to gradient if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div 
                  className={`w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center ${user?.picture ? 'hidden' : ''}`}
                >
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="hidden md:block text-left">
                  {userLoading ? (
                    <>
                      <div className="text-sm font-medium text-white">Carregando...</div>
                      <div className="text-xs text-slate-400">...</div>
                    </>
                  ) : user ? (
                    <>
                      <div className="text-sm font-medium text-white">{user.name || 'Usuário'}</div>
                      <div className="text-xs text-slate-400">{user.email || ''}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-medium text-white">Admin CEO</div>
                      <div className="text-xs text-slate-400">GG.AI Labs</div>
                    </>
                  )}
                </div>
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

      {showUserMenu && (
        <UserProfileModal 
          onClose={() => setShowUserMenu(false)}
          onOpenSettings={() => {
            // Navigate to settings - implement as needed
            setShowUserMenu(false);
          }}
        />
      )}

      {/* Backdrop */}
      {(showNotifications || showUserMenu) && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20"
          onClick={closeAllModals}
        />
      )}
    </>
  );
};

export default Header;
