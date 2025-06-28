import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Target, 
  AlertTriangle,
  Calendar,
  DollarSign,
  Users,
  Zap,
  Brain,
  RefreshCw,
  Download,
  Settings,
  Eye,
  Filter
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Prediction {
  id: string;
  title: string;
  description: string;
  category: 'revenue' | 'market' | 'risk' | 'opportunity' | 'performance';
  timeframe: '1M' | '3M' | '6M' | '1Y';
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  currentValue: number;
  predictedValue: number;
  trend: 'up' | 'down' | 'stable';
  factors: string[];
  recommendations: string[];
  dataPoints: { date: string; value: number; predicted?: boolean }[];
}

interface ScenarioAnalysis {
  id: string;
  name: string;
  description: string;
  probability: number;
  impact: number;
  outcomes: {
    revenue: { change: number; confidence: number };
    market: { change: number; confidence: number };
    resources: { change: number; confidence: number };
  };
  triggers: string[];
  mitigations: string[];
}

const PredictiveAnalytics: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'predictions' | 'scenarios' | 'models'>('predictions');
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y'>('3M');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [predictions, setPredictions] = useState<Prediction[]>([
    {
      id: '1',
      title: 'Q2 Revenue Projection',
      description: 'Revenue growth prediction based on current pipeline and market trends',
      category: 'revenue',
      timeframe: '3M',
      confidence: 87,
      impact: 'high',
      currentValue: 2400000,
      predictedValue: 3100000,
      trend: 'up',
      factors: ['Strong pipeline conversion', 'Market expansion', 'Product-market fit improvement'],
      recommendations: ['Increase sales team capacity', 'Accelerate product development', 'Expand marketing reach'],
      dataPoints: [
        { date: '2024-01', value: 2000000 },
        { date: '2024-02', value: 2200000 },
        { date: '2024-03', value: 2400000 },
        { date: '2024-04', value: 2700000, predicted: true },
        { date: '2024-05', value: 2900000, predicted: true },
        { date: '2024-06', value: 3100000, predicted: true }
      ]
    },
    {
      id: '2',
      title: 'Market Share Growth',
      description: 'Predicted market share expansion in healthcare AI segment',
      category: 'market',
      timeframe: '6M',
      confidence: 78,
      impact: 'high',
      currentValue: 12,
      predictedValue: 18,
      trend: 'up',
      factors: ['Competitive advantage in AI', 'Strategic partnerships', 'Product differentiation'],
      recommendations: ['Strengthen competitive moat', 'Accelerate partnership deals', 'Invest in R&D'],
      dataPoints: [
        { date: '2024-01', value: 10 },
        { date: '2024-02', value: 11 },
        { date: '2024-03', value: 12 },
        { date: '2024-04', value: 13, predicted: true },
        { date: '2024-05', value: 15, predicted: true },
        { date: '2024-06', value: 18, predicted: true }
      ]
    },
    {
      id: '3',
      title: 'Churn Risk Alert',
      description: 'Predicted customer churn based on engagement patterns',
      category: 'risk',
      timeframe: '1M',
      confidence: 92,
      impact: 'medium',
      currentValue: 5,
      predictedValue: 8,
      trend: 'up',
      factors: ['Decreased product usage', 'Support ticket increase', 'Competitive pressure'],
      recommendations: ['Implement retention program', 'Improve customer success', 'Address product gaps'],
      dataPoints: [
        { date: '2024-01', value: 3 },
        { date: '2024-02', value: 4 },
        { date: '2024-03', value: 5 },
        { date: '2024-04', value: 8, predicted: true }
      ]
    }
  ]);

  const [scenarios, setScenarios] = useState<ScenarioAnalysis[]>([
    {
      id: '1',
      name: 'Economic Downturn',
      description: 'Impact of potential economic recession on business performance',
      probability: 35,
      impact: 85,
      outcomes: {
        revenue: { change: -25, confidence: 78 },
        market: { change: -15, confidence: 82 },
        resources: { change: -20, confidence: 75 }
      },
      triggers: ['GDP decline', 'Market volatility', 'Reduced enterprise spending'],
      mitigations: ['Diversify revenue streams', 'Reduce operational costs', 'Focus on essential products']
    },
    {
      id: '2',
      name: 'AI Breakthrough',
      description: 'Major AI advancement accelerates market adoption',
      probability: 60,
      impact: 90,
      outcomes: {
        revenue: { change: 150, confidence: 85 },
        market: { change: 200, confidence: 80 },
        resources: { change: 75, confidence: 88 }
      },
      triggers: ['Technology breakthrough', 'Regulatory approval', 'Market validation'],
      mitigations: ['Scale infrastructure', 'Hire key talent', 'Secure funding']
    }
  ]);

  const categoryConfig = {
    revenue: { color: 'text-green-400', bg: 'bg-green-500/10', icon: DollarSign },
    market: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: BarChart3 },
    risk: { color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertTriangle },
    opportunity: { color: 'text-purple-400', bg: 'bg-purple-500/10', icon: Target },
    performance: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: TrendingUp }
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Add new prediction
    const newPrediction: Prediction = {
      id: Date.now().toString(),
      title: 'Team Productivity Forecast',
      description: 'Predicted team performance based on current metrics and planned initiatives',
      category: 'performance',
      timeframe: timeframe,
      confidence: 83,
      impact: 'medium',
      currentValue: 87,
      predictedValue: 94,
      trend: 'up',
      factors: ['AI tool adoption', 'Process optimization', 'Team training'],
      recommendations: ['Accelerate AI tool rollout', 'Standardize processes', 'Invest in training'],
      dataPoints: [
        { date: '2024-03', value: 87 },
        { date: '2024-04', value: 89, predicted: true },
        { date: '2024-05', value: 92, predicted: true },
        { date: '2024-06', value: 94, predicted: true }
      ]
    };
    
    setPredictions([newPrediction, ...predictions]);
    setIsAnalyzing(false);
    alert('Predictive analysis completed! New forecast generated.');
  };

  const formatValue = (value: number, category: string) => {
    switch (category) {
      case 'revenue':
        return `$${(value / 1000000).toFixed(1)}M`;
      case 'market':
        return `${value}%`;
      case 'risk':
        return `${value}%`;
      case 'performance':
        return `${value}%`;
      default:
        return value.toString();
    }
  };

  const renderPredictions = () => (
    <div className="space-y-6">
      {predictions.filter(p => p.timeframe === timeframe).map((prediction) => {
        const config = categoryConfig[prediction.category];
        const Icon = config.icon;
        const change = ((prediction.predictedValue - prediction.currentValue) / prediction.currentValue) * 100;

        return (
          <div key={prediction.id} className={`border rounded-xl p-6 ${config.bg} border-slate-600/30`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${config.bg}`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">{prediction.title}</h3>
                  <p className="text-slate-300 text-sm mt-1">{prediction.description}</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-slate-400 mb-1">Confidence</div>
                <div className={`text-2xl font-bold ${config.color}`}>{prediction.confidence}%</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Current Value</div>
                <div className="text-2xl font-bold text-white">
                  {formatValue(prediction.currentValue, prediction.category)}
                </div>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Predicted Value</div>
                <div className={`text-2xl font-bold ${config.color}`}>
                  {formatValue(prediction.predictedValue, prediction.category)}
                </div>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Expected Change</div>
                <div className={`text-2xl font-bold flex items-center space-x-1 ${
                  change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-slate-400'
                }`}>
                  <TrendingUp className={`h-5 w-5 ${change < 0 ? 'rotate-180' : ''}`} />
                  <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Key Factors</h4>
                <ul className="space-y-1">
                  {prediction.factors.map((factor, index) => (
                    <li key={index} className="text-sm text-slate-400 flex items-center space-x-2">
                      <div className="w-1 h-1 bg-blue-400 rounded-full" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {prediction.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-slate-400 flex items-center space-x-2">
                      <Target className="h-3 w-3 text-green-400" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-600/30">
              <div className="flex items-center space-x-4 text-sm text-slate-400">
                <span>Timeframe: {prediction.timeframe}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  prediction.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                  prediction.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {prediction.impact.toUpperCase()} IMPACT
                </span>
              </div>
              
              <div className="flex space-x-2">
                <button className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1 rounded text-sm transition-colors">
                  View Details
                </button>
                <button className="bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1 rounded text-sm transition-colors">
                  Create Action Plan
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderScenarios = () => (
    <div className="space-y-6">
      {scenarios.map((scenario) => (
        <div key={scenario.id} className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold text-lg">{scenario.name}</h3>
              <p className="text-slate-300 text-sm mt-1">{scenario.description}</p>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-slate-400 mb-1">Probability</div>
              <div className="text-2xl font-bold text-yellow-400">{scenario.probability}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-600/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-400" />
                <span className="text-sm text-slate-300">Revenue Impact</span>
              </div>
              <div className={`text-xl font-bold ${
                scenario.outcomes.revenue.change > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {scenario.outcomes.revenue.change > 0 ? '+' : ''}{scenario.outcomes.revenue.change}%
              </div>
              <div className="text-xs text-slate-400">
                Confidence: {scenario.outcomes.revenue.confidence}%
              </div>
            </div>
            
            <div className="bg-slate-600/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-slate-300">Market Impact</span>
              </div>
              <div className={`text-xl font-bold ${
                scenario.outcomes.market.change > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {scenario.outcomes.market.change > 0 ? '+' : ''}{scenario.outcomes.market.change}%
              </div>
              <div className="text-xs text-slate-400">
                Confidence: {scenario.outcomes.market.confidence}%
              </div>
            </div>
            
            <div className="bg-slate-600/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-slate-300">Resource Impact</span>
              </div>
              <div className={`text-xl font-bold ${
                scenario.outcomes.resources.change > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {scenario.outcomes.resources.change > 0 ? '+' : ''}{scenario.outcomes.resources.change}%
              </div>
              <div className="text-xs text-slate-400">
                Confidence: {scenario.outcomes.resources.confidence}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2">Triggers</h4>
              <ul className="space-y-1">
                {scenario.triggers.map((trigger, index) => (
                  <li key={index} className="text-sm text-slate-400 flex items-center space-x-2">
                    <AlertTriangle className="h-3 w-3 text-yellow-400" />
                    <span>{trigger}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2">Mitigations</h4>
              <ul className="space-y-1">
                {scenario.mitigations.map((mitigation, index) => (
                  <li key={index} className="text-sm text-slate-400 flex items-center space-x-2">
                    <Target className="h-3 w-3 text-green-400" />
                    <span>{mitigation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Predictive Analytics</h2>
            <p className="text-sm text-slate-400">AI-powered forecasting and scenario analysis</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="1M">1 Month</option>
            <option value="3M">3 Months</option>
            <option value="6M">6 Months</option>
            <option value="1Y">1 Year</option>
          </select>
          
          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
          >
            <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing...' : 'Run Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-slate-700/30 rounded-lg p-1">
        {[
          { id: 'predictions', label: 'Predictions', icon: TrendingUp },
          { id: 'scenarios', label: 'Scenario Analysis', icon: Target },
          { id: 'models', label: 'Models', icon: Settings }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'predictions' && renderPredictions()}
      {activeTab === 'scenarios' && renderScenarios()}
      {activeTab === 'models' && (
        <div className="text-center py-12">
          <Settings className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Model configuration coming soon...</p>
        </div>
      )}
    </div>
  );
};

export default PredictiveAnalytics;