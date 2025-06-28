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
      label: 'Executive Overview',
      icon: Home,
      description: 'Main dashboard with key metrics',
      color: 'text-blue-400',
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'business-intelligence',
      label: 'Business Intelligence',
      icon: BarChart3,
      description: 'KPIs, metrics and analytics',
      color: 'text-emerald-400',
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      id: 'market-intelligence',
      label: 'Market Intelligence',
      icon: Globe,
      description: 'Market opportunities and trends',
      color: 'text-purple-400',
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      id: 'predictive-analytics',
      label: 'Predictive Analytics',
      icon: TrendingUp,
      description: 'Forecasting and scenario analysis',
      color: 'text-orange-400',
      gradient: 'from-orange-500 to-red-600'
    },
    {
      id: 'ai-orchestrator',
      label: 'AI Agent Orchestrator',
      icon: Bot,
      description: 'Manage AI workforce',
      color: 'text-cyan-400',
      gradient: 'from-cyan-500 to-blue-600'
    },
    {
      id: 'knowledge-graph',
      label: 'Knowledge Graph',
      icon: Network,
      description: 'Visualize knowledge connections',
      color: 'text-indigo-400',
      gradient: 'from-indigo-500 to-purple-600'
    },
    {
      id: 'synergy-intelligence',
      label: 'Synergy Intelligence',
      icon: Brain,
      description: 'Discover hidden connections',
      color: 'text-pink-400',
      gradient: 'from-pink-500 to-rose-600'
    },
    {
      id: 'strategic-sessions',
      label: 'Strategic Sessions',
      icon: Calendar,
      description: 'Plan strategic meetings',
      color: 'text-violet-400',
      gradient: 'from-violet-500 to-purple-600'
    },
    {
      id: 'decision-journal',
      label: 'Decision Journal',
      icon: BookOpen,
      description: 'Track decisions and outcomes',
      color: 'text-green-400',
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      id: 'projects',
      label: 'Project Management',
      icon: Target,
      description: 'Manage active projects',
      color: 'text-yellow-400',
      gradient: 'from-yellow-500 to-orange-600'
    },
    {
      id: 'obsidian',
      label: 'Second Brain',
      icon: Zap,
      description: 'Obsidian integration',
      color: 'text-teal-400',
      gradient: 'from-teal-500 to-cyan-600'
    },
    {
      id: 'mcp',
      label: 'MCP Services',
      icon: Activity,
      description: 'AI service protocols',
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
                  <h1 className="text-lg font-bold text-white">GG.AI Labs</h1>
                  <p className="text-xs text-slate-400">CEO Dashboard</p>
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
            title={isCollapsed ? 'Settings' : ''}
          >
            <div className="p-2 bg-slate-700/30 rounded-lg">
              <Settings className="h-4 w-4" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 text-left">
                <div className="font-medium text-sm">Settings</div>
                <div className="text-xs opacity-70">System configuration</div>
              </div>
            )}
          </button>
          
          {!isCollapsed && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <div className="text-xs text-slate-500 text-center">
                v1.0.0 • Intelligence Augmentation Platform
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;