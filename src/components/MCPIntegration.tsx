import React, { useState } from 'react';
import { MessageSquare, Cpu, Zap, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const MCPIntegration: React.FC = () => {
  const { t } = useLanguage();
  const [activeAgents, setActiveAgents] = useState(3);
  
  const mcpServices = [
    {
      id: 1,
      name: 'Strategic Analyzer',
      status: 'active',
      lastResponse: '2 min ago',
      queries: 247,
      successRate: 98.5,
      description: 'Analyzes business strategy and market trends'
    },
    {
      id: 2,
      name: 'Financial Insights',
      status: 'active',
      lastResponse: '5 min ago',
      queries: 189,
      successRate: 97.2,
      description: 'Provides financial analysis and forecasting'
    },
    {
      id: 3,
      name: 'Team Performance',
      status: 'idle',
      lastResponse: '15 min ago',
      queries: 156,
      successRate: 96.8,
      description: 'Monitors team productivity and engagement'
    },
    {
      id: 4,
      name: 'Risk Assessment',
      status: 'processing',
      lastResponse: 'Now',
      queries: 98,
      successRate: 99.1,
      description: 'Identifies potential risks and opportunities'
    }
  ];

  const statusConfig = {
    active: { color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle },
    idle: { color: 'text-slate-400', bg: 'bg-slate-500/10', icon: Clock },
    processing: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Zap }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t('mcp.title')}</h2>
            <p className="text-sm text-slate-400">{t('mcp.subtitle')}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-400">{activeAgents} {t('mcp.active')}</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {mcpServices.map((service) => {
          const config = statusConfig[service.status as keyof typeof statusConfig];
          const StatusIcon = config.icon;
          
          return (
            <div key={service.id} className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4 hover:bg-slate-700/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Cpu className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{service.name}</h3>
                    <p className="text-xs text-slate-400">{service.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <StatusIcon className={`h-4 w-4 ${config.color}`} />
                  <span className={`text-xs ${config.color} capitalize`}>{service.status}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-white">{service.queries}</p>
                  <p className="text-xs text-slate-400">{t('mcp.queries')}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-400">{service.successRate}%</p>
                  <p className="text-xs text-slate-400">{t('mcp.success_rate')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">{service.lastResponse}</p>
                  <p className="text-xs text-slate-400">{t('mcp.last_response')}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="pt-4 border-t border-slate-700/50">
        <button className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 hover:scale-105">
          <MessageSquare className="h-4 w-4" />
          <span>{t('mcp.query_all')}</span>
        </button>
      </div>
    </div>
  );
};

export default MCPIntegration;