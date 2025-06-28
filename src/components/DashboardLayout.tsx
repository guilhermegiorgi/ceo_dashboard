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
      title: 'Revenue Growth',
      value: '$2.4M',
      change: '+23.5% from last quarter',
      trend: 'up' as const,
      icon: DollarSign,
      description: 'Strong performance across all product lines',
      translationKey: 'metrics.revenue'
    },
    {
      title: 'AI Efficiency Score',
      value: '94.2%',
      change: '+8.1% this month',
      trend: 'up' as const,
      icon: Brain,
      description: 'AI agents operating at peak performance',
      translationKey: 'metrics.ai_efficiency'
    },
    {
      title: 'Active Projects',
      value: '12',
      change: '3 launched this week',
      trend: 'up' as const,
      icon: Target,
      description: 'Strategic initiatives on track',
      translationKey: 'metrics.active_projects'
    },
    {
      title: 'Team Productivity',
      value: '87%',
      change: '+5.2% improvement',
      trend: 'up' as const,
      icon: TrendingUp,
      description: 'Enhanced by AI-powered insights',
      translationKey: 'metrics.team_productivity'
    }
  ];

  const enhancedInsights = [
    {
      id: '1',
      title: 'Market Opportunity Detected',
      insight: 'Analysis of your Obsidian notes reveals a potential new market segment in AI healthcare tools. Cross-referencing with industry trends shows 340% growth potential.',
      confidence: 92,
      priority: 'high' as const,
      actionable: true,
      timestamp: '5 minutes ago',
      connectedNotes: ['Healthcare AI Research.md', 'Market Analysis 2024.md', 'Competitive Intelligence.md'],
      suggestedActions: [
        'Conduct market size analysis',
        'Identify key competitors',
        'Develop MVP roadmap',
        'Secure initial funding'
      ],
      relatedProjects: ['AI Product Launch', 'Market Expansion']
    },
    {
      id: '2',
      title: 'Team Performance Optimization',
      insight: 'Your meeting notes indicate that engineering velocity could increase by 25% by reallocating resources from Project Alpha to Beta based on current priority scoring.',
      confidence: 87,
      priority: 'medium' as const,
      actionable: true,
      timestamp: '12 minutes ago',
      connectedNotes: ['Team Performance Metrics.md', 'Project Alpha Status.md', 'Resource Allocation.md'],
      suggestedActions: [
        'Review current sprint commitments',
        'Analyze team capacity',
        'Reallocate senior developers',
        'Update project timelines'
      ],
      relatedProjects: ['Infrastructure Upgrade']
    }
  ];

  const handleAnalyzeKnowledge = async () => {
    try {
      alert('Starting comprehensive knowledge graph analysis...');
    } catch (error) {
      console.error('Failed to analyze knowledge:', error);
    }
  };

  const handleGenerateStrategy = async () => {
    try {
      alert('Generating strategic report based on current insights...');
    } catch (error) {
      console.error('Failed to generate strategy:', error);
    }
  };

  const handleScheduleReview = async () => {
    try {
      alert('Scheduling AI review session for next week...');
    } catch (error) {
      console.error('Failed to schedule review:', error);
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
                  <h2 className="text-2xl font-bold text-white">{t('metrics.title')}</h2>
                  <p className="text-slate-400">{t('metrics.subtitle')}</p>
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
                    <h2 className="text-2xl font-bold text-white">{t('insights.title')}</h2>
                    <p className="text-slate-400">{t('insights.subtitle')}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-400">{t('insights.live')}</span>
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
              <h2 className="text-xl font-bold text-white mb-4">{t('actions.title')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={handleAnalyzeKnowledge}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-4 px-6 rounded-lg transition-all duration-200 hover:scale-105"
                >
                  <Brain className="h-5 w-5" />
                  <span>{t('actions.analyze')}</span>
                </button>
                
                <button 
                  onClick={handleGenerateStrategy}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-medium py-4 px-6 rounded-lg transition-all duration-200 hover:scale-105"
                >
                  <Target className="h-5 w-5" />
                  <span>{t('actions.strategy')}</span>
                </button>
                
                <button 
                  onClick={handleScheduleReview}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium py-4 px-6 rounded-lg transition-all duration-200 hover:scale-105"
                >
                  <Clock className="h-5 w-5" />
                  <span>{t('actions.schedule')}</span>
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
              <p className="text-slate-400">Section under development</p>
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