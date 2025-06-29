import React, { useState } from 'react';
import { 
  Menu,
  X,
  BarChart3,
  Brain,
  Network,
  Calendar,
  BookOpen,
  Target,
  Zap,
  Globe,
  TrendingUp,
  Bot,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Home,
  Activity
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange }) => {
  const { t } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      id: 'overview',
      label: t('nav.overview'),
      icon: Home,
      description: t('nav.overview.desc'),
      color: 'text-blue-400',
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'business-intelligence',
      label: t('nav.business_intelligence'),
      icon: BarChart3,
      description: t('nav.business_intelligence.desc'),
      color: 'text-emerald-400',
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      id: 'market-intelligence',
      label: t('nav.market_intelligence'),
      icon: Globe,
      description: t('nav.market_intelligence.desc'),
      color: 'text-purple-400',
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      id: 'predictive-analytics',
      label: t('nav.predictive_analytics'),
      icon: TrendingUp,
      description: t('nav.predictive_analytics.desc'),
      color: 'text-orange-400',
      gradient: 'from-orange-500 to-red-600'
    },
    {
      id: 'ai-orchestrator',
      label: t('nav.ai_orchestrator'),
      icon: Bot,
      description: t('nav.ai_orchestrator.desc'),
      color: 'text-cyan-400',
      gradient: 'from-cyan-500 to-blue-600'
    },
    {
      id: 'knowledge-graph',
      label: t('nav.knowledge_graph'),
      icon: Network,
      description: t('nav.knowledge_graph.desc'),
      color: 'text-indigo-400',
      gradient: 'from-indigo-500 to-purple-600'
    },
    {
      id: 'synergy-intelligence',
      label: t('nav.synergy_intelligence'),
      icon: Brain,
      description: t('nav.synergy_intelligence.desc'),
      color: 'text-pink-400',
      gradient: 'from-pink-500 to-rose-600'
    },
    {
      id: 'strategic-sessions',
      label: t('nav.strategic_sessions'),
      icon: Calendar,
      description: t('nav.strategic_sessions.desc'),
      color: 'text-violet-400',
      gradient: 'from-violet-500 to-purple-600'
    },
    {
      id: 'decision-journal',
      label: t('nav.decision_journal'),
      icon: BookOpen,
      description: t('nav.decision_journal.desc'),
      color: 'text-green-400',
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      id: 'projects',
      label: t('nav.projects'),
      icon: Target,
      description: t('nav.projects.desc'),
      color: 'text-yellow-400',
      gradient: 'from-yellow-500 to-orange-600'
    },
    {
      id: 'obsidian',
      label: t('nav.obsidian'),
      icon: Zap,
      description: t('nav.obsidian.desc'),
      color: 'text-teal-400',
      gradient: 'from-teal-500 to-cyan-600'
    },
    {
      id: 'mcp',
      label: t('nav.mcp'),
      icon: Activity,
      description: t('nav.mcp.desc'),
      color: 'text-red-400',
      gradient: 'from-red-500 to-pink-600'
    }
  ];

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleMobile = () => {
    setIsOpen(!isOpen);
  };

  const handleSectionSelect = (sectionId: string) => {
    onSectionChange(sectionId);
    setIsOpen(false); // Close mobile menu after selection
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={handleToggleMobile}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700 transition-colors"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative top-0 left-0 h-full bg-slate-900/95 backdrop-blur-sm border-r border-slate-700/50 z-40
        transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'w-16' : 'w-80'}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">{t('header.title')}</h1>
                  <p className="text-xs text-slate-400">{t('header.subtitle')}</p>
                </div>
              </div>
            )}
            
            <button
              onClick={handleToggleCollapse}
              className="hidden lg:flex p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleSectionSelect(item.id)}
                  className={`
                    w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg scale-105` 
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? item.label : ''}
                >
                  <div className={`
                    p-2 rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-white/20' 
                      : 'bg-slate-700/30'
                    }
                  `}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  {!isCollapsed && (
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{item.label}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  )}
                  
                  {!isCollapsed && isActive && (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/50">
          <button
            onClick={() => handleSectionSelect('settings')}
            className={`
              w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200
              ${activeSection === 'settings' 
                ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? t('nav.settings') : ''}
          >
            <div className="p-2 bg-slate-700/30 rounded-lg">
              <Settings className="h-4 w-4" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 text-left">
                <div className="font-medium text-sm">{t('nav.settings')}</div>
                <div className="text-xs opacity-70">{t('nav.settings.desc')}</div>
              </div>
            )}
          </button>
          
          {!isCollapsed && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <div className="text-xs text-slate-500 text-center">
                v1.0.0 • Plataforma de Amplificação de Inteligência
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;