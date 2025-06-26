import React, { useState } from 'react';
import { Network, Search, FileText, Link, Zap } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const ObsidianIntegration: React.FC = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  
  const knowledgeNodes = [
    { id: 1, title: 'Product Strategy Q1', connections: 12, lastUpdated: '2 hours ago', type: 'strategy' },
    { id: 2, title: 'Market Analysis 2024', connections: 8, lastUpdated: '5 hours ago', type: 'analysis' },
    { id: 3, title: 'Team Meeting Notes', connections: 15, lastUpdated: '1 day ago', type: 'notes' },
    { id: 4, title: 'Competitor Research', connections: 6, lastUpdated: '3 days ago', type: 'research' },
  ];

  const typeColors = {
    strategy: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    analysis: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    notes: 'bg-green-500/10 text-green-400 border-green-500/30',
    research: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
            <Network className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t('obsidian.title')}</h2>
            <p className="text-sm text-slate-400">{t('obsidian.subtitle')}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-400">{t('obsidian.connected')}</span>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('obsidian.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-300 mb-3">{t('obsidian.recent')}</h3>
        {knowledgeNodes.map((node) => (
          <div key={node.id} className="flex items-center justify-between p-4 bg-slate-700/30 border border-slate-600/30 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer group">
            <div className="flex items-center space-x-3">
              <FileText className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
              <div>
                <h4 className="text-white font-medium group-hover:text-blue-400 transition-colors">{node.title}</h4>
                <p className="text-xs text-slate-500">{node.lastUpdated}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className={`px-2 py-1 text-xs rounded-full border ${typeColors[node.type as keyof typeof typeColors]}`}>
                {node.type}
              </span>
              <div className="flex items-center space-x-1 text-slate-400">
                <Link className="h-3 w-3" />
                <span className="text-xs">{node.connections}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-700/50">
        <button className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 hover:scale-105">
          <Zap className="h-4 w-4" />
          <span>{t('obsidian.generate')}</span>
        </button>
      </div>
    </div>
  );
};

export default ObsidianIntegration;