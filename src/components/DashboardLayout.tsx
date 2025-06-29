import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MetricCard from './MetricCard';
import EnhancedAIInsightCard from './EnhancedAIInsightCard';
import BusinessIntelligenceHub from './BusinessIntelligenceHub';
import MarketIntelligenceEngine from './MarketIntelligenceEngine';
import PredictiveAnalytics from './PredictiveAnalytics';
import AIAgentOrchestrator from './AIAgentOrchestrator';
import KnowledgeGraphVisualizer from './KnowledgeGraphVisualizer';
import ProactiveSynergyPanel from './ProactiveSynergyPanel';
import StrategicSessionPlanner from './StrategicSessionPlanner';
import DecisionJournal from './DecisionJournal';
import ProjectOverview from './ProjectOverview';
import ObsidianIntegration from './ObsidianIntegration';
import MCPIntegration from './MCPIntegration';
import FeedbackLoopTracker from './FeedbackLoopTracker';
import SettingsModal from './SettingsModal';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Target, 
  Brain,
  Zap,
  BarChart3,
  Clock,
  RefreshCw,
  Activity
} from 'lucide-react';

const DashboardLayout: React.FC = () => {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState('overview');
  const [showSettings, setShowSettings] = useState(false);

  const metrics = [
    {
      title: 'Crescimento da Receita',
      value: 'R$ 12,8M',
      change: '+23,5% do último trimestre',
      trend: 'up' as const,
      icon: DollarSign,
      description: 'Performance forte em todas as linhas de produto'
    },
    {
      title: 'Score de Eficiência IA',
      value: '94,2%',
      change: '+8,1% este mês',
      trend: 'up' as const,
      icon: Brain,
      description: 'Agentes IA operando com performance máxima'
    },
    {
      title: 'Projetos Ativos',
      value: '12',
      change: '3 lançados esta semana',
      trend: 'up' as const,
      icon: Target,
      description: 'Iniciativas estratégicas no cronograma'
    },
    {
      title: 'Produtividade da Equipe',
      value: '87%',
      change: '+5,2% de melhoria',
      trend: 'up' as const,
      icon: TrendingUp,
      description: 'Aprimorada por insights alimentados por IA'
    }
  ];

  const enhancedInsights = [
    {
      id: '1',
      title: 'Oportunidade de Mercado Detectada',
      insight: 'Análise das suas notas do Obsidian revela um potencial novo segmento de mercado em ferramentas de IA para saúde. Cruzamento com tendências da indústria mostra 340% de potencial de crescimento.',
      confidence: 92,
      priority: 'high' as const,
      actionable: true,
      timestamp: '5 minutos atrás',
      connectedNotes: ['Pesquisa IA Saúde.md', 'Análise de Mercado 2024.md', 'Inteligência Competitiva.md'],
      suggestedActions: [
        'Conduzir análise de tamanho de mercado',
        'Identificar principais concorrentes',
        'Desenvolver roadmap de MVP',
        'Garantir financiamento inicial'
      ],
      relatedProjects: ['Lançamento Produto IA', 'Expansão de Mercado']
    },
    {
      id: '2',
      title: 'Otimização de Performance da Equipe',
      insight: 'Suas notas de reunião indicam que a velocidade de engenharia poderia aumentar 25% realocando recursos do Projeto Alpha para Beta baseado na pontuação de prioridade atual.',
      confidence: 87,
      priority: 'medium' as const,
      actionable: true,
      timestamp: '12 minutos atrás',
      connectedNotes: ['Métricas Performance Equipe.md', 'Status Projeto Alpha.md', 'Alocação de Recursos.md'],
      suggestedActions: [
        'Revisar compromissos de sprint atuais',
        'Analisar capacidade da equipe',
        'Realocar desenvolvedores sênior',
        'Atualizar cronogramas de projeto'
      ],
      relatedProjects: ['Upgrade de Infraestrutura']
    }
  ];

  const handleAnalyzeKnowledge = async () => {
    try {
      alert('Iniciando análise abrangente do grafo de conhecimento...');
    } catch (error) {
      console.error('Falha ao analisar conhecimento:', error);
    }
  };

  const handleGenerateStrategy = async () => {
    try {
      alert('Gerando relatório estratégico baseado nos insights atuais...');
    } catch (error) {
      console.error('Falha ao gerar estratégia:', error);
    }
  };

  const handleScheduleReview = async () => {
    try {
      alert('Agendando sessão de revisão IA para próxima semana...');
    } catch (error) {
      console.error('Falha ao agendar revisão:', error);
    }
  };

  const renderContent = () => {
    if (activeSection === 'settings') {
      return <SettingsModal onClose={() => setActiveSection('overview')} />;
    }

    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-8">
            {/* Metrics Overview */}
            <section>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Visão Executiva</h2>
                  <p className="text-slate-400">Inteligência de negócios e métricas em tempo real</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric, index) => (
                  <MetricCard key={index} {...metric} />
                ))}
              </div>
            </section>

            {/* Enhanced AI Insights */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Insights Alimentados por IA</h2>
                    <p className="text-slate-400">Recomendações estratégicas do seu segundo cérebro</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-400">Análise ao Vivo</span>
                </div>
              </div>
              
              <div className="space-y-6">
                {enhancedInsights.map((insight, index) => (
                  <EnhancedAIInsightCard key={index} {...insight} />
                ))}
              </div>
            </section>

            {/* Feedback Loop Tracker */}
            <section>
              <FeedbackLoopTracker />
            </section>

            {/* Quick Actions */}
            <section className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Ações Rápidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={handleAnalyzeKnowledge}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-4 px-6 rounded-lg transition-all duration-200 hover:scale-105"
                >
                  <Brain className="h-5 w-5" />
                  <span>Analisar Grafo de Conhecimento</span>
                </button>
                
                <button 
                  onClick={handleGenerateStrategy}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-medium py-4 px-6 rounded-lg transition-all duration-200 hover:scale-105"
                >
                  <Target className="h-5 w-5" />
                  <span>Gerar Relatório Estratégico</span>
                </button>
                
                <button 
                  onClick={handleScheduleReview}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium py-4 px-6 rounded-lg transition-all duration-200 hover:scale-105"
                >
                  <Clock className="h-5 w-5" />
                  <span>Agendar Revisão IA</span>
                </button>
              </div>
            </section>
          </div>
        );

      case 'business-intelligence':
        return <BusinessIntelligenceHub />;

      case 'market-intelligence':
        return <MarketIntelligenceEngine />;

      case 'predictive-analytics':
        return <PredictiveAnalytics />;

      case 'ai-orchestrator':
        return <AIAgentOrchestrator />;

      case 'knowledge-graph':
        return <KnowledgeGraphVisualizer />;

      case 'synergy-intelligence':
        return <ProactiveSynergyPanel />;

      case 'strategic-sessions':
        return <StrategicSessionPlanner />;

      case 'decision-journal':
        return <DecisionJournal />;

      case 'projects':
        return <ProjectOverview />;

      case 'obsidian':
        return <ObsidianIntegration />;

      case 'mcp':
        return <MCPIntegration />;

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Activity className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Seção em desenvolvimento</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;