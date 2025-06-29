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
      label: 'Visão Executiva',
      icon: Home,
      description: 'Painel principal com métricas essenciais',
      color: 'text-blue-400',
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'business-intelligence',
      label: 'Inteligência de Negócios',
      icon: BarChart3,
      description: 'KPIs, métricas e análises',
      color: 'text-emerald-400',
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      id: 'market-intelligence',
      label: 'Inteligência de Mercado',
      icon: Globe,
      description: 'Oportunidades e tendências de mercado',
      color: 'text-purple-400',
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      id: 'predictive-analytics',
      label: 'Análise Preditiva',
      icon: TrendingUp,
      description: 'Previsões e análise de cenários',
      color: 'text-orange-400',
      gradient: 'from-orange-500 to-red-600'
    },
    {
      id: 'ai-orchestrator',
      label: 'Orquestrador de IA',
      icon: Bot,
      description: 'Gerenciar força de trabalho IA',
      color: 'text-cyan-400',
      gradient: 'from-cyan-500 to-blue-600'
    },
    {
      id: 'knowledge-graph',
      label: 'Grafo de Conhecimento',
      icon: Network,
      description: 'Visualizar conexões de conhecimento',
      color: 'text-indigo-400',
      gradient: 'from-indigo-500 to-purple-600'
    },
    {
      id: 'synergy-intelligence',
      label: 'Inteligência de Sinergia',
      icon: Brain,
      description: 'Descobrir conexões ocultas',
      color: 'text-pink-400',
      gradient: 'from-pink-500 to-rose-600'
    },
    {
      id: 'strategic-sessions',
      label: 'Sessões Estratégicas',
      icon: Calendar,
      description: 'Planejar reuniões estratégicas',
      color: 'text-violet-400',
      gradient: 'from-violet-500 to-purple-600'
    },
    {
      id: 'decision-journal',
      label: 'Diário de Decisões',
      icon: BookOpen,
      description: 'Rastrear decisões e resultados',
      color: 'text-green-400',
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      id: 'projects',
      label: 'Gestão de Projetos',
      icon: Target,
      description: 'Gerenciar projetos ativos',
      color: 'text-yellow-400',
      gradient: 'from-yellow-500 to-orange-600'
    },
    {
      id: 'obsidian',
      label: 'Segundo Cérebro',
      icon: Zap,
      description: 'Integração com Obsidian',
      color: 'text-teal-400',
      gradient: 'from-teal-500 to-cyan-600'
    },
    {
      id: 'mcp',
      label: 'Serviços MCP',
      icon: Activity,
      description: 'Protocolos de serviços IA',
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
      {/* Mobile Menu Button - Fixed Position */}
      <button
        onClick={handleToggleMobile}
        className="lg:hidden fixed top-4 left-4 z-[60] p-3 bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-xl text-white hover:bg-slate-700/95 transition-all duration-200 shadow-xl"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[45]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Fixed Position Over Main Content */}
      <div className={`
        fixed top-0 left-0 h-full bg-slate-900/98 backdrop-blur-md border-r border-slate-700/50 z-[50] flex flex-col
        transition-all duration-300 ease-in-out shadow-2xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'w-20' : 'w-80'}
      `}>
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-slate-700/50 bg-slate-900/95">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">GG.AI Labs</h1>
                  <p className="text-xs text-slate-400">Painel do CEO</p>
                </div>
              </div>
            )}
            
            <button
              onClick={handleToggleCollapse}
              className="hidden lg:flex p-2 hover:bg-slate-800/50 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Navigation - All Items Visible */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleSectionSelect(item.id)}
                  className={`
                    w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 group
                    ${isActive 
                      ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg scale-[1.02]` 
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white hover:scale-[1.01]'
                    }
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? item.label : ''}
                >
                  <div className={`
                    p-2 rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-white/20 shadow-inner' 
                      : 'bg-slate-700/30 group-hover:bg-slate-600/50'
                    }
                  `}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  {!isCollapsed && (
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium text-sm truncate">{item.label}</div>
                      <div className="text-xs opacity-70 truncate">{item.description}</div>
                    </div>
                  )}
                  
                  {!isCollapsed && isActive && (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-lg" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-slate-700/50 bg-slate-900/95">
          <button
            onClick={() => handleSectionSelect('settings')}
            className={`
              w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200
              ${activeSection === 'settings' 
                ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-lg' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? 'Configurações' : ''}
          >
            <div className="p-2 bg-slate-700/30 rounded-lg">
              <Settings className="h-4 w-4" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 text-left">
                <div className="font-medium text-sm">Configurações</div>
                <div className="text-xs opacity-70">Configuração do sistema</div>
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