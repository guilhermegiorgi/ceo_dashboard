import React, { useState } from 'react';
import { 
  Zap, 
  Link2, 
  AlertTriangle, 
  TrendingUp, 
  Brain,
  ArrowRight,
  MessageSquare,
  Calendar,
  Target,
  Lightbulb,
  GitBranch,
  Eye
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface SynergyCard {
  id: string;
  type: 'unexpected_connection' | 'knowledge_gap' | 'success_pattern' | 'strategic_question';
  title: string;
  description: string;
  confidence: number;
  urgency: 'high' | 'medium' | 'low';
  connectedElements: string[];
  suggestedAction: string;
  potentialImpact: string;
}

const ProactiveSynergyPanel: React.FC = () => {
  const { t } = useLanguage();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const synergyCards: SynergyCard[] = [
    {
      id: '1',
      type: 'unexpected_connection',
      title: 'Cross-Domain Pattern Discovery',
      description: 'Your notes on "algorithmic trading strategies" and "agricultural optimization" both reference the same mathematical model (Monte Carlo simulations). There might be an opportunity to apply trading risk management techniques to crop yield optimization.',
      confidence: 87,
      urgency: 'high',
      connectedElements: ['Trading Algorithms.md', 'AgTech Research.md', 'Risk Management Framework.md'],
      suggestedAction: 'Schedule a strategic session to explore cross-pollination opportunities',
      potentialImpact: 'Could unlock a new market vertical worth $2.3M+ based on similar cross-industry applications'
    },
    {
      id: '2',
      type: 'knowledge_gap',
      title: 'Strategic Alignment Gap Detected',
      description: 'You have 8 detailed notes about "Competitor X" analysis, but none of them are linked to your "Product Roadmap 2024". This disconnect might be causing strategic blind spots in product planning.',
      confidence: 92,
      urgency: 'medium',
      connectedElements: ['Competitor Analysis/', 'Product Roadmap 2024.md', 'Market Intelligence/'],
      suggestedAction: 'Create linking session between competitive intelligence and product strategy',
      potentialImpact: 'Better competitive positioning could increase market share by 15-20%'
    },
    {
      id: '3',
      type: 'success_pattern',
      title: 'First Principles Success Pattern',
      description: 'Analysis of your last 5 successful projects shows they all started with notes tagged #first-principles. Your current "AI Healthcare" project lacks this foundational thinking approach.',
      confidence: 94,
      urgency: 'medium',
      connectedElements: ['Project Success Archive/', 'AI Healthcare Project.md', 'First Principles Thinking.md'],
      suggestedAction: 'Apply first-principles analysis to current AI Healthcare initiative',
      potentialImpact: 'Following this pattern historically increases project success rate by 340%'
    },
    {
      id: '4',
      type: 'strategic_question',
      title: 'Resource Allocation Paradox',
      description: 'Your meeting notes show 60% of engineering time is allocated to "maintenance", but your strategic notes emphasize "innovation-first culture". This misalignment might be limiting growth potential.',
      confidence: 78,
      urgency: 'high',
      connectedElements: ['Engineering Allocation.md', 'Innovation Strategy.md', 'Team Performance Metrics'],
      suggestedAction: 'Conduct resource reallocation analysis with engineering leadership',
      potentialImpact: 'Optimized allocation could accelerate innovation timeline by 6-8 months'
    }
  ];

  const typeConfig = {
    unexpected_connection: {
      icon: GitBranch,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      label: 'Unexpected Connection'
    },
    knowledge_gap: {
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      label: 'Knowledge Gap'
    },
    success_pattern: {
      icon: TrendingUp,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      label: 'Success Pattern'
    },
    strategic_question: {
      icon: Lightbulb,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      label: 'Strategic Question'
    }
  };

  const urgencyColors = {
    high: 'bg-red-500/20 text-red-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-green-500/20 text-green-400'
  };

  const handleExploreConnection = (cardId: string) => {
    console.log('Exploring connection:', cardId);
    // This would trigger deeper analysis
  };

  const handleScheduleSession = (cardId: string) => {
    console.log('Scheduling strategic session for:', cardId);
    // This would integrate with calendar
  };

  const handleCreateNote = (cardId: string) => {
    const card = synergyCards.find(c => c.id === cardId);
    if (!card) return;

    const synergyNote = {
      title: `Synergy Analysis - ${card.title}`,
      content: `# Synergy Analysis: ${card.title}

## Discovery
${card.description}

## Connected Elements
${card.connectedElements.map(element => `- [[${element}]]`).join('\n')}

## Confidence Level
${card.confidence}%

## Suggested Action
${card.suggestedAction}

## Potential Impact
${card.potentialImpact}

## Next Steps
- [ ] Review connected elements
- [ ] Validate assumptions
- [ ] Create action plan
- [ ] Schedule follow-up

## Tags
#synergy-analysis #ai-discovery #strategic-thinking

## Created
${new Date().toISOString().split('T')[0]}
`,
      timestamp: new Date().toISOString()
    };

    console.log('Creating synergy note:', synergyNote);
    alert('Synergy analysis note created in Second Brain!');
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Proactive Synergy Intelligence</h2>
            <p className="text-sm text-slate-400">Discovering latent connections and strategic opportunities</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-purple-400">Analyzing</span>
        </div>
      </div>

      <div className="space-y-4">
        {synergyCards.map((card) => {
          const config = typeConfig[card.type];
          const Icon = config.icon;
          const isSelected = selectedCard === card.id;

          return (
            <div 
              key={card.id} 
              className={`border rounded-xl p-4 transition-all duration-300 cursor-pointer ${config.bg} ${config.border} hover:bg-opacity-20`}
              onClick={() => setSelectedCard(isSelected ? null : card.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-white font-medium">{card.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${urgencyColors[card.urgency]}`}>
                        {card.urgency.toUpperCase()}
                      </span>
                    </div>
                    <span className={`text-xs ${config.color}`}>{config.label}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Confidence</div>
                    <div className={`text-sm font-medium ${config.color}`}>{card.confidence}%</div>
                  </div>
                  <Eye className={`h-4 w-4 ${isSelected ? config.color : 'text-slate-400'}`} />
                </div>
              </div>

              <p className="text-slate-300 text-sm mb-3 leading-relaxed">{card.description}</p>

              {isSelected && (
                <div className="border-t border-slate-700/50 pt-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Connected Elements</h4>
                    <div className="flex flex-wrap gap-2">
                      {card.connectedElements.map((element, index) => (
                        <span key={index} className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded">
                          {element}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Potential Impact</h4>
                    <p className="text-sm text-green-400">{card.potentialImpact}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExploreConnection(card.id);
                      }}
                      className="flex items-center space-x-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                      <Link2 className="h-3 w-3" />
                      <span>Explore Connection</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScheduleSession(card.id);
                      }}
                      className="flex items-center space-x-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                      <Calendar className="h-3 w-3" />
                      <span>Schedule Session</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateNote(card.id);
                      }}
                      className="flex items-center space-x-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>Create Analysis Note</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {synergyCards.length} synergies discovered • Last scan: 2 minutes ago
          </div>
          <button className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105">
            <Brain className="h-4 w-4" />
            <span>Deep Scan Knowledge Graph</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProactiveSynergyPanel;