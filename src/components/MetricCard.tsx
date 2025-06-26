import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  description?: string;
  translationKey?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  trend,
  icon: Icon,
  description,
  translationKey
}) => {
  const { t } = useLanguage();

  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    neutral: 'text-slate-400'
  };

  const trendBg = {
    up: 'bg-emerald-400/10',
    down: 'bg-red-400/10',
    neutral: 'bg-slate-400/10'
  };

  const displayTitle = translationKey ? t(translationKey) : title;
  const displayValue = translationKey ? t(`${translationKey}.value`) : value;
  const displayChange = translationKey ? t(`${translationKey}.change`) : change;
  const displayDescription = translationKey ? t(`${translationKey}.desc`) : description;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800/70 transition-all duration-300 hover:scale-105">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div className={`p-2 rounded-lg ${trendBg[trend]}`}>
              <Icon className={`h-5 w-5 ${trendColors[trend]}`} />
            </div>
            <h3 className="text-sm font-medium text-slate-400">{displayTitle}</h3>
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl font-bold text-white">{displayValue}</p>
            <p className={`text-sm font-medium ${trendColors[trend]}`}>
              {displayChange}
            </p>
            {displayDescription && (
              <p className="text-xs text-slate-500 mt-2">{displayDescription}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricCard;