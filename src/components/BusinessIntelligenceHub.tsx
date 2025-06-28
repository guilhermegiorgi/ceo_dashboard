import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  DollarSign,
  Users,
  Target,
  Calendar,
  Globe,
  Zap,
  RefreshCw,
  Download,
  Share,
  Filter,
  Eye,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface KPI {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  category: 'financial' | 'operational' | 'strategic' | 'customer';
  status: 'on-track' | 'at-risk' | 'critical';
  lastUpdated: string;
}

interface BusinessMetric {
  id: string;
  title: string;
  description: string;
  value: string;
  change: string;
  trend: 'positive' | 'negative' | 'neutral';
  category: string;
  importance: 'high' | 'medium' | 'low';
  dataPoints: { date: string; value: number }[];
}

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  timestamp: string;
  actionRequired: boolean;
}

const BusinessIntelligenceHub: React.FC = () => {
  const { t } = useLanguage();
  const [activeView, setActiveView] = useState<'overview' | 'kpis' | 'metrics' | 'alerts'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [kpis, setKpis] = useState<KPI[]>([
    {
      id: '1',
      name: 'Monthly Recurring Revenue',
      value: 2400000,
      target: 2500000,
      unit: '$',
      trend: 'up',
      change: 12.5,
      category: 'financial',
      status: 'on-track',
      lastUpdated: '2024-01-20T10:00:00Z'
    },
    {
      id: '2',
      name: 'Customer Acquisition Cost',
      value: 1250,
      target: 1000,
      unit: '$',
      trend: 'up',
      change: 8.3,
      category: 'customer',
      status: 'at-risk',
      lastUpdated: '2024-01-20T09:30:00Z'
    },
    {
      id: '3',
      name: 'Net Promoter Score',
      value: 72,
      target: 75,
      unit: '',
      trend: 'up',
      change: 5.2,
      category: 'customer',
      status: 'on-track',
      lastUpdated: '2024-01-20T08:00:00Z'
    },
    {
      id: '4',
      name: 'Employee Productivity Index',
      value: 87,
      target: 90,
      unit: '%',
      trend: 'stable',
      change: 1.1,
      category: 'operational',
      status: 'on-track',
      lastUpdated: '2024-01-20T07:00:00Z'
    }
  ]);

  const [metrics, setMetrics] = useState<BusinessMetric[]>([
    {
      id: '1',
      title: 'Revenue Growth Rate',
      description: 'Year-over-year revenue growth percentage',
      value: '23.5%',
      change: '+3.2% from last quarter',
      trend: 'positive',
      category: 'Financial',
      importance: 'high',
      dataPoints: [
        { date: '2024-01', value: 20.3 },
        { date: '2024-02', value: 21.8 },
        { date: '2024-03', value: 23.5 }
      ]
    },
    {
      id: '2',
      title: 'Market Share',
      description: 'Percentage of total addressable market captured',
      value: '12.8%',
      change: '+2.1% from last quarter',
      trend: 'positive',
      category: 'Strategic',
      importance: 'high',
      dataPoints: [
        { date: '2024-01', value: 10.7 },
        { date: '2024-02', value: 11.5 },
        { date: '2024-03', value: 12.8 }
      ]
    },
    {
      id: '3',
      title: 'Customer Lifetime Value',
      description: 'Average revenue generated per customer over their lifetime',
      value: '$45,200',
      change: '+8.7% from last quarter',
      trend: 'positive',
      category: 'Customer',
      importance: 'medium',
      dataPoints: [
        { date: '2024-01', value: 41500 },
        { date: '2024-02', value: 43200 },
        { date: '2024-03', value: 45200 }
      ]
    }
  ]);

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      title: 'Customer Acquisition Cost Spike',
      message: 'CAC has increased by 25% over the past 2 weeks, exceeding target threshold',
      severity: 'warning',
      category: 'Customer',
      timestamp: '2024-01-20T10:30:00Z',
      actionRequired: true
    },
    {
      id: '2',
      title: 'Revenue Target Achievement',
      message: 'Q1 revenue target achieved 2 weeks ahead of schedule',
      severity: 'info',
      category: 'Financial',
      timestamp: '2024-01-20T09:15:00Z',
      actionRequired: false
    },
    {
      id: '3',
      title: 'Competitor Price Drop',
      message: 'Major competitor reduced pricing by 15%, potential impact on conversion rates',
      severity: 'critical',
      category: 'Strategic',
      timestamp: '2024-01-20T08:45:00Z',
      actionRequired: true
    }
  ]);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRefreshing(false);
    alert('Business intelligence data refreshed successfully!');
  };

  const categoryColors = {
    financial: 'text-green-400',
    operational: 'text-blue-400',
    strategic: 'text-purple-400',
    customer: 'text-orange-400'
  };

  const statusColors = {
    'on-track': 'bg-green-500/20 text-green-400',
    'at-risk': 'bg-yellow-500/20 text-yellow-400',
    'critical': 'bg-red-500/20 text-red-400'
  };

  const severityColors = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.slice(0, 4).map((kpi) => (
          <div key={kpi.id} className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-300">{kpi.name}</h3>
              <span className={`px-2 py-1 text-xs rounded ${statusColors[kpi.status]}`}>
                {kpi.status.replace('-', ' ').toUpperCase()}
              </span>
            </div>
            
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl font-bold text-white">
                {kpi.unit === '$' ? `$${(kpi.value / 1000000).toFixed(1)}M` : 
                 kpi.unit === '%' ? `${kpi.value}%` : 
                 kpi.value.toLocaleString()}
              </span>
              <div className={`flex items-center space-x-1 ${
                kpi.trend === 'up' ? 'text-green-400' : 
                kpi.trend === 'down' ? 'text-red-400' : 'text-slate-400'
              }`}>
                <TrendingUp className={`h-3 w-3 ${kpi.trend === 'down' ? 'rotate-180' : ''}`} />
                <span className="text-xs">{kpi.change > 0 ? '+' : ''}{kpi.change}%</span>
              </div>
            </div>
            
            <div className="text-xs text-slate-400">
              Target: {kpi.unit === '$' ? `$${(kpi.target / 1000000).toFixed(1)}M` : 
                      kpi.unit === '%' ? `${kpi.target}%` : 
                      kpi.target.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Alerts */}
      <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-6">
        <h3 className="text-white font-medium mb-4">Recent Alerts</h3>
        <div className="space-y-3">
          {alerts.slice(0, 3).map((alert) => (
            <div key={alert.id} className={`border rounded-lg p-3 ${severityColors[alert.severity]}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{alert.title}</h4>
                  <p className="text-sm opacity-80 mt-1">{alert.message}</p>
                  <div className="flex items-center space-x-2 mt-2 text-xs opacity-60">
                    <span>{alert.category}</span>
                    <span>•</span>
                    <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
                {alert.actionRequired && (
                  <button className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-xs transition-colors">
                    Action Required
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {metrics.slice(0, 2).map((metric) => (
          <div key={metric.id} className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-white font-medium">{metric.title}</h3>
                <p className="text-slate-400 text-sm">{metric.description}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded ${
                metric.importance === 'high' ? 'bg-red-500/20 text-red-400' :
                metric.importance === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {metric.importance.toUpperCase()}
              </span>
            </div>
            
            <div className="flex items-center space-x-4 mb-3">
              <span className="text-3xl font-bold text-white">{metric.value}</span>
              <span className={`text-sm ${
                metric.trend === 'positive' ? 'text-green-400' :
                metric.trend === 'negative' ? 'text-red-400' : 'text-slate-400'
              }`}>
                {metric.change}
              </span>
            </div>
            
            <div className="text-xs text-slate-400">
              Category: {metric.category}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderKPIs = () => (
    <div className="space-y-4">
      {kpis.map((kpi) => (
        <div key={kpi.id} className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold text-lg">{kpi.name}</h3>
              <span className={`text-sm ${categoryColors[kpi.category]}`}>
                {kpi.category.charAt(0).toUpperCase() + kpi.category.slice(1)}
              </span>
            </div>
            
            <div className="text-right">
              <span className={`px-3 py-1 text-sm rounded ${statusColors[kpi.status]}`}>
                {kpi.status.replace('-', ' ').toUpperCase()}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-slate-400 mb-1">Current Value</div>
              <div className="text-2xl font-bold text-white">
                {kpi.unit === '$' ? `$${(kpi.value / 1000000).toFixed(1)}M` : 
                 kpi.unit === '%' ? `${kpi.value}%` : 
                 kpi.value.toLocaleString()}{kpi.unit && kpi.unit !== '$' && kpi.unit !== '%' ? kpi.unit : ''}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-slate-400 mb-1">Target</div>
              <div className="text-2xl font-bold text-blue-400">
                {kpi.unit === '$' ? `$${(kpi.target / 1000000).toFixed(1)}M` : 
                 kpi.unit === '%' ? `${kpi.target}%` : 
                 kpi.target.toLocaleString()}{kpi.unit && kpi.unit !== '$' && kpi.unit !== '%' ? kpi.unit : ''}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-slate-400 mb-1">Progress</div>
              <div className="text-2xl font-bold text-purple-400">
                {((kpi.value / kpi.target) * 100).toFixed(1)}%
              </div>
            </div>
            
            <div>
              <div className="text-sm text-slate-400 mb-1">Trend</div>
              <div className={`flex items-center space-x-2 ${
                kpi.trend === 'up' ? 'text-green-400' : 
                kpi.trend === 'down' ? 'text-red-400' : 'text-slate-400'
              }`}>
                <TrendingUp className={`h-5 w-5 ${kpi.trend === 'down' ? 'rotate-180' : ''}`} />
                <span className="text-xl font-bold">
                  {kpi.change > 0 ? '+' : ''}{kpi.change}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-600/30">
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>Last updated: {new Date(kpi.lastUpdated).toLocaleString()}</span>
              <div className="flex space-x-2">
                <button className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1 rounded transition-colors">
                  View Details
                </button>
                <button className="bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1 rounded transition-colors">
                  Set Alert
                </button>
              </div>
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
          <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Business Intelligence Hub</h2>
            <p className="text-sm text-slate-400">Real-time business metrics and performance analytics</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <button
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-6 bg-slate-700/30 rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview', icon: Eye },
          { id: 'kpis', label: 'KPIs', icon: Target },
          { id: 'metrics', label: 'Metrics', icon: BarChart3 },
          { id: 'alerts', label: 'Alerts', icon: AlertTriangle }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg transition-colors ${
                activeView === tab.id
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
      {activeView === 'overview' && renderOverview()}
      {activeView === 'kpis' && renderKPIs()}
      {activeView === 'metrics' && (
        <div className="space-y-4">
          {metrics.map((metric) => (
            <div key={metric.id} className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold text-lg">{metric.title}</h3>
                  <p className="text-slate-400 text-sm">{metric.description}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded ${
                  metric.importance === 'high' ? 'bg-red-500/20 text-red-400' :
                  metric.importance === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {metric.importance.toUpperCase()}
                </span>
              </div>
              
              <div className="flex items-center space-x-6 mb-4">
                <div className="text-3xl font-bold text-white">{metric.value}</div>
                <div className={`text-sm ${
                  metric.trend === 'positive' ? 'text-green-400' :
                  metric.trend === 'negative' ? 'text-red-400' : 'text-slate-400'
                }`}>
                  {metric.change}
                </div>
                <div className="text-sm text-slate-400">Category: {metric.category}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {activeView === 'alerts' && (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div key={alert.id} className={`border rounded-lg p-4 ${severityColors[alert.severity]}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold">{alert.title}</h3>
                    <span className="text-xs opacity-60">{alert.category}</span>
                  </div>
                  <p className="text-sm opacity-80 mb-3">{alert.message}</p>
                  <div className="text-xs opacity-60">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="flex space-x-2">
                  {alert.actionRequired && (
                    <button className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-sm transition-colors">
                      Take Action
                    </button>
                  )}
                  <button className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-sm transition-colors">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BusinessIntelligenceHub;