import React from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import Header from './components/Header';
import MetricCard from './components/MetricCard';
import EnhancedAIInsightCard from './components/EnhancedAIInsightCard';
import ObsidianIntegration from './components/ObsidianIntegration';
import ProjectOverview from './components/ProjectOverview';
import MCPIntegration from './components/MCPIntegration';
import ProactiveSynergyPanel from './components/ProactiveSynergyPanel';
import FeedbackLoopTracker from './components/FeedbackLoopTracker';
import StrategicSessionPlanner from './components/StrategicSessionPlanner';
import KnowledgeGraphVisualizer from './components/KnowledgeGraphVisualizer';
import DecisionJournal from './components/DecisionJournal';
import { useLanguage } from './contexts/LanguageContext';
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

function DashboardContent() {
  const { t } = useLanguage();

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
    },
    {
      id: '3',
      title: 'Strategic Knowledge Gap',
      insight: 'Your knowledge graph shows limited connections between competitive analysis and product roadmap. Suggest scheduling strategic alignment session.',
      confidence: 78,
      priority: 'low' as const,
      actionable: true,
      timestamp: '1 hour ago',
      connectedNotes: ['Competitive Analysis/', 'Product Roadmap 2024.md', 'Strategic Planning.md'],
      suggestedActions: [
        'Schedule strategy alignment meeting',
        'Create competitive feature matrix',
        'Update roadmap priorities',
        'Document strategic decisions'
      ],
      relatedProjects: ['AI Product Launch', 'Market Expansion']
    }
  ];

  const handleAnalyzeKnowledge = async () => {
    try {
      // This would trigger a comprehensive analysis
      alert('Starting comprehensive knowledge graph analysis...');
      // In a real implementation, this would call the API
    } catch (error) {
      console.error('Failed to analyze knowledge:', error);
    }
  };

  const handleGenerateStrategy = async () => {
    try {
      // This would generate a strategy report
      alert('Generating strategic report based on current insights...');
      // In a real implementation, this would call the API
    } catch (error) {
      console.error('Failed to generate strategy:', error);
    }
  };

  const handleScheduleReview = async () => {
    try {
      // This would schedule an AI review
      alert('Scheduling AI review session for next week...');
      // In a real implementation, this would integrate with calendar
    } catch (error) {
      console.error('Failed to schedule review:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics Overview */}
        <section className="mb-8">
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

        {/* Knowledge Graph Visualizer */}
        <section className="mb-8">
          <KnowledgeGraphVisualizer />
        </section>

        {/* Proactive Synergy Panel */}
        <section className="mb-8">
          <ProactiveSynergyPanel />
        </section>

        {/* Enhanced AI Insights */}
        <section className="mb-8">
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

        {/* Strategic Session Planner */}
        <section className="mb-8">
          <StrategicSessionPlanner />
        </section>

        {/* Decision Journal */}
        <section className="mb-8">
          <DecisionJournal />
        </section>

        {/* Feedback Loop Tracker */}
        <section className="mb-8">
          <FeedbackLoopTracker />
        </section>

        {/* Integration Panels */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          <ObsidianIntegration />
          <ProjectOverview />
        </div>
        
        <div className="mb-8">
          <MCPIntegration />
        </div>

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
      </main>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <DashboardContent />
    </LanguageProvider>
  );
}

export default App;