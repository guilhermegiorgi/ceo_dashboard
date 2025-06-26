import React from 'react';
import { Bot, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface AIInsightProps {
  title: string;
  insight: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  timestamp: string;
}

const AIInsightCard: React.FC<AIInsightProps> = ({
  title,
  insight,
  confidence,
  priority,
  actionable,
  timestamp
}) => {
  const { t } = useLanguage();

  const priorityColors = {
    high: 'bg-red-500/10 border-red-500/30 text-red-400',
    medium: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    low: 'bg-blue-500/10 border-blue-500/30 text-blue-400'
  };

  const priorityIcons = {
    high: AlertTriangle,
    medium: TrendingUp,
    low: Zap
  };

  const PriorityIcon = priorityIcons[priority];

  return (
    <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800/60 transition-all duration-300">
      <div className="flex items-start space-x-4">
        <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex-shrink-0">
          <Bot className="h-5 w-5 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <div className={`px-2 py-1 rounded-full border text-xs font-medium ${priorityColors[priority]}`}>
              <div className="flex items-center space-x-1">
                <PriorityIcon className="h-3 w-3" />
                <span>{t(`insights.priority.${priority}`)}</span>
              </div>
            </div>
          </div>
          
          <p className="text-slate-300 mb-4 leading-relaxed">{insight}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500">{t('insights.confidence')}</span>
                <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-1000"
                    style={{ width: `${confidence}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400">{confidence}%</span>
              </div>
              
              {actionable && (
                <span className="px-2 py-1 bg-green-500/10 border border-green-500/30 text-green-400 text-xs rounded-full">
                  {t('insights.actionable')}
                </span>
              )}
            </div>
            
            <span className="text-xs text-slate-500">{timestamp}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsightCard;