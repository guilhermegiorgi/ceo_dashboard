import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Globe, 
  Target, 
  Zap, 
  Brain,
  AlertTriangle,
  DollarSign,
  Users,
  Calendar,
  BarChart3,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Share,
  Download
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface MarketOpportunity {
  id: string;
  title: string;
  description: string;
  market: string;
  potentialValue: string;
  timeToMarket: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  competitorCount: number;
  trendDirection: 'up' | 'down' | 'stable';
  keyFactors: string[];
  actionItems: string[];
  sources: string[];
}

interface CompetitorInsight {
  id: string;
  competitor: string;
  movement: string;
  impact: 'positive' | 'negative' | 'neutral';
  urgency: 'high' | 'medium' | 'low';
  recommendation: string;
  source: string;
  timestamp: string;
}

const MarketIntelligenceEngine: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'opportunities' | 'competitors' | 'trends'>('opportunities');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMarket, setFilterMarket] = useState('all');

  const [opportunities, setOpportunities] = useState<MarketOpportunity[]>([
    {
      id: '1',
      title: 'AI-Powered Healthcare Diagnostics',
      description: 'Emerging opportunity in AI-driven medical imaging and diagnostic tools for small clinics',
      market: 'Healthcare',
      potentialValue: '$2.3B',
      timeToMarket: '18 months',
      confidence: 87,
      riskLevel: 'medium',
      competitorCount: 12,
      trendDirection: 'up',
      keyFactors: ['Regulatory approval pathway clear', 'Growing demand from rural clinics', 'AI technology maturity'],
      actionItems: ['Conduct regulatory research', 'Partner with medical institutions', 'Develop MVP'],
      sources: ['FDA reports', 'Market research', 'Industry analysis']
    },
    {
      id: '2',
      title: 'Sustainable Supply Chain Analytics',
      description: 'AI platform for optimizing supply chains with sustainability metrics and carbon footprint tracking',
      market: 'Enterprise Software',
      potentialValue: '$1.8B',
      timeToMarket: '12 months',
      confidence: 92,
      riskLevel: 'low',
      competitorCount: 8,
      trendDirection: 'up',
      keyFactors: ['ESG compliance requirements', 'Supply chain disruptions', 'Carbon tracking mandates'],
      actionItems: ['Build sustainability metrics engine', 'Secure enterprise partnerships', 'Develop carbon API'],
      sources: ['ESG reports', 'Supply chain studies', 'Regulatory updates']
    }
  ]);

  const [competitorInsights, setCompetitorInsights] = useState<CompetitorInsight[]>([
    {
      id: '1',
      competitor: 'TechCorp AI',
      movement: 'Acquired healthcare AI startup MedVision for $150M',
      impact: 'negative',
      urgency: 'high',
      recommendation: 'Accelerate healthcare AI development or consider strategic partnerships',
      source: 'Industry news',
      timestamp: '2 hours ago'
    },
    {
      id: '2',
      competitor: 'DataFlow Systems',
      movement: 'Launched new supply chain optimization platform',
      impact: 'negative',
      urgency: 'medium',
      recommendation: 'Differentiate with sustainability focus and carbon tracking',
      source: 'Product launch announcement',
      timestamp: '1 day ago'
    }
  ]);

  const handleDeepAnalysis = async () => {
    setIsAnalyzing(true);
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Add new opportunity discovered by AI
    const newOpportunity: MarketOpportunity = {
      id: Date.now().toString(),
      title: 'Edge AI for Manufacturing Quality Control',
      description: 'Real-time quality control using edge AI devices in manufacturing lines',
      market: 'Manufacturing',
      potentialValue: '$950M',
      timeToMarket: '15 months',
      confidence: 78,
      riskLevel: 'medium',
      competitorCount: 6,
      trendDirection: 'up',
      keyFactors: ['Industry 4.0 adoption', 'Edge computing maturity', 'Quality control automation'],
      actionItems: ['Research edge AI hardware', 'Connect with manufacturers', 'Develop proof of concept'],
      sources: ['Manufacturing reports', 'Edge computing trends', 'Quality control studies']
    };
    
    setOpportunities([newOpportunity, ...opportunities]);
    setIsAnalyzing(false);
    alert('Deep market analysis completed! New opportunity discovered.');
  };

  const renderOpportunities = () => (
    <div className="space-y-4">
      {opportunities.map((opportunity) => (
        <div key={opportunity.id} className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold text-lg mb-2">{opportunity.title}</h3>
              <p className="text-slate-300 text-sm mb-3">{opportunity.description}</p>
              
              <div className="flex items-center space-x-4 mb-3">
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                  {opportunity.market}
                </span>
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-3 w-3 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">{opportunity.potentialValue}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  <span className="text-slate-400 text-sm">{opportunity.timeToMarket}</span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-slate-400 mb-1">Confidence</div>
              <div className="text-2xl font-bold text-green-400">{opportunity.confidence}%</div>
              <div className={`text-xs px-2 py-1 rounded mt-1 ${
                opportunity.riskLevel === 'low' ? 'bg-green-500/20 text-green-400' :
                opportunity.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {opportunity.riskLevel.toUpperCase()} RISK
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2">Key Success Factors</h4>
              <ul className="space-y-1">
                {opportunity.keyFactors.map((factor, index) => (
                  <li key={index} className="text-sm text-slate-400 flex items-center space-x-2">
                    <div className="w-1 h-1 bg-blue-400 rounded-full" />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2">Recommended Actions</h4>
              <ul className="space-y-1">
                {opportunity.actionItems.map((action, index) => (
                  <li key={index} className="text-sm text-slate-400 flex items-center space-x-2">
                    <Target className="h-3 w-3 text-green-400" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-600/30">
            <div className="flex items-center space-x-4 text-sm text-slate-400">
              <span>{opportunity.competitorCount} competitors</span>
              <div className="flex items-center space-x-1">
                <TrendingUp className={`h-3 w-3 ${
                  opportunity.trendDirection === 'up' ? 'text-green-400' :
                  opportunity.trendDirection === 'down' ? 'text-red-400' : 'text-slate-400'
                }`} />
                <span>Trending {opportunity.trendDirection}</span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1 rounded text-sm transition-colors">
                Deep Dive
              </button>
              <button className="bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1 rounded text-sm transition-colors">
                Create Project
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCompetitors = () => (
    <div className="space-y-4">
      {competitorInsights.map((insight) => (
        <div key={insight.id} className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-white font-medium">{insight.competitor}</h3>
              <p className="text-slate-300 text-sm mt-1">{insight.movement}</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs rounded ${
                insight.impact === 'positive' ? 'bg-green-500/20 text-green-400' :
                insight.impact === 'negative' ? 'bg-red-500/20 text-red-400' :
                'bg-slate-500/20 text-slate-400'
              }`}>
                {insight.impact.toUpperCase()}
              </span>
              <span className={`px-2 py-1 text-xs rounded ${
                insight.urgency === 'high' ? 'bg-red-500/20 text-red-400' :
                insight.urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {insight.urgency.toUpperCase()}
              </span>
            </div>
          </div>
          
          <div className="bg-slate-600/30 rounded-lg p-3 mb-3">
            <h4 className="text-sm font-medium text-slate-300 mb-1">AI Recommendation</h4>
            <p className="text-sm text-slate-400">{insight.recommendation}</p>
          </div>
          
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Source: {insight.source}</span>
            <span>{insight.timestamp}</span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Market Intelligence Engine</h2>
            <p className="text-sm text-slate-400">AI-powered market analysis and opportunity discovery</p>
          </div>
        </div>
        
        <button
          onClick={handleDeepAnalysis}
          disabled={isAnalyzing}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
        >
          <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Analyzing...' : 'Deep Analysis'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-slate-700/30 rounded-lg p-1">
        {[
          { id: 'opportunities', label: 'Market Opportunities', icon: Target },
          { id: 'competitors', label: 'Competitor Intelligence', icon: Eye },
          { id: 'trends', label: 'Market Trends', icon: TrendingUp }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-600/20 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search opportunities, competitors, trends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        
        <select
          value={filterMarket}
          onChange={(e) => setFilterMarket(e.target.value)}
          className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          <option value="all">All Markets</option>
          <option value="healthcare">Healthcare</option>
          <option value="enterprise">Enterprise Software</option>
          <option value="manufacturing">Manufacturing</option>
          <option value="fintech">FinTech</option>
        </select>
      </div>

      {/* Content */}
      {activeTab === 'opportunities' && renderOpportunities()}
      {activeTab === 'competitors' && renderCompetitors()}
      {activeTab === 'trends' && (
        <div className="text-center py-12">
          <TrendingUp className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Market trends analysis coming soon...</p>
        </div>
      )}
    </div>
  );
};

export default MarketIntelligenceEngine;