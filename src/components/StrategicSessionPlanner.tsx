import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  Target, 
  Brain,
  Plus,
  MapPin,
  FileText,
  Zap,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface StrategicSession {
  id: string;
  title: string;
  type: 'synergy_exploration' | 'gap_analysis' | 'pattern_validation' | 'strategic_alignment';
  description: string;
  suggestedDuration: number;
  participants: string[];
  preparationNotes: string[];
  expectedOutcomes: string[];
  priority: 'high' | 'medium' | 'low';
  triggerInsight?: string;
  scheduledDate?: string;
  status: 'suggested' | 'scheduled' | 'completed';
}

const StrategicSessionPlanner: React.FC = () => {
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<StrategicSession[]>([
    {
      id: '1',
      title: 'Cross-Domain Innovation Workshop',
      type: 'synergy_exploration',
      description: 'Explore the synergy between trading algorithms and agricultural optimization identified by the AI system.',
      suggestedDuration: 120,
      participants: ['CTO', 'Head of AI', 'AgTech Consultant', 'Risk Management Lead'],
      preparationNotes: [
        'Trading Algorithms.md',
        'AgTech Research.md', 
        'Risk Management Framework.md',
        'Monte Carlo Applications.md'
      ],
      expectedOutcomes: [
        'Validate cross-domain applicability',
        'Identify pilot project opportunities',
        'Define technical requirements',
        'Estimate market potential'
      ],
      priority: 'high',
      triggerInsight: 'Cross-Domain Pattern Discovery',
      status: 'suggested'
    },
    {
      id: '2',
      title: 'Competitive Intelligence Alignment',
      type: 'gap_analysis',
      description: 'Bridge the gap between competitive analysis and product roadmap planning.',
      suggestedDuration: 90,
      participants: ['Product Manager', 'Market Intelligence Lead', 'Strategy Director'],
      preparationNotes: [
        'Competitor Analysis/',
        'Product Roadmap 2024.md',
        'Market Intelligence/',
        'Feature Comparison Matrix.md'
      ],
      expectedOutcomes: [
        'Link competitive insights to product features',
        'Update roadmap priorities',
        'Create competitive response framework',
        'Establish regular sync process'
      ],
      priority: 'medium',
      triggerInsight: 'Strategic Alignment Gap Detected',
      status: 'suggested'
    },
    {
      id: '3',
      title: 'First Principles Application Session',
      type: 'pattern_validation',
      description: 'Apply proven first-principles methodology to AI Healthcare project.',
      suggestedDuration: 180,
      participants: ['Project Lead', 'Technical Architect', 'Domain Expert'],
      preparationNotes: [
        'First Principles Thinking.md',
        'AI Healthcare Project.md',
        'Project Success Archive/',
        'Healthcare Domain Research.md'
      ],
      expectedOutcomes: [
        'Fundamental problem decomposition',
        'Assumption validation',
        'Alternative approach identification',
        'Risk mitigation strategies'
      ],
      priority: 'high',
      triggerInsight: 'First Principles Success Pattern',
      status: 'scheduled',
      scheduledDate: '2024-01-25'
    }
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSession, setNewSession] = useState<Partial<StrategicSession>>({
    title: '',
    type: 'synergy_exploration',
    description: '',
    suggestedDuration: 90,
    participants: [''],
    preparationNotes: [''],
    expectedOutcomes: [''],
    priority: 'medium'
  });

  const typeConfig = {
    synergy_exploration: {
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      label: 'Synergy Exploration',
      icon: Brain
    },
    gap_analysis: {
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      label: 'Gap Analysis',
      icon: Target
    },
    pattern_validation: {
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      label: 'Pattern Validation',
      icon: CheckCircle
    },
    strategic_alignment: {
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      label: 'Strategic Alignment',
      icon: Zap
    }
  };

  const statusConfig = {
    suggested: { color: 'text-yellow-400', label: 'AI Suggested' },
    scheduled: { color: 'text-blue-400', label: 'Scheduled' },
    completed: { color: 'text-green-400', label: 'Completed' }
  };

  const handleScheduleSession = (sessionId: string) => {
    setSessions(sessions.map(session => 
      session.id === sessionId 
        ? { ...session, status: 'scheduled' as const, scheduledDate: '2024-01-26' }
        : session
    ));
  };

  const handleCreateSession = () => {
    const session: StrategicSession = {
      id: Date.now().toString(),
      ...newSession as StrategicSession,
      status: 'suggested'
    };
    setSessions([...sessions, session]);
    setShowCreateForm(false);
    setNewSession({
      title: '',
      type: 'synergy_exploration',
      description: '',
      suggestedDuration: 90,
      participants: [''],
      preparationNotes: [''],
      expectedOutcomes: [''],
      priority: 'medium'
    });
  };

  if (showCreateForm) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Create Strategic Session</h2>
          <button 
            onClick={() => setShowCreateForm(false)}
            className="text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Session Title</label>
            <input
              type="text"
              value={newSession.title}
              onChange={(e) => setNewSession({...newSession, title: e.target.value})}
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white"
              placeholder="Enter session title..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Session Type</label>
              <select
                value={newSession.type}
                onChange={(e) => setNewSession({...newSession, type: e.target.value as any})}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white"
              >
                <option value="synergy_exploration">Synergy Exploration</option>
                <option value="gap_analysis">Gap Analysis</option>
                <option value="pattern_validation">Pattern Validation</option>
                <option value="strategic_alignment">Strategic Alignment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Duration (minutes)</label>
              <input
                type="number"
                value={newSession.suggestedDuration}
                onChange={(e) => setNewSession({...newSession, suggestedDuration: parseInt(e.target.value)})}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              value={newSession.description}
              onChange={(e) => setNewSession({...newSession, description: e.target.value})}
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white h-20"
              placeholder="Describe the session objectives..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleCreateSession}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
            >
              Create Session
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Strategic Session Planner</h2>
            <p className="text-sm text-slate-400">AI-suggested strategic thinking sessions</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
          <span>Create Session</span>
        </button>
      </div>

      <div className="space-y-4">
        {sessions.map((session) => {
          const typeConf = typeConfig[session.type];
          const statusConf = statusConfig[session.status];
          const TypeIcon = typeConf.icon;

          return (
            <div key={session.id} className={`border rounded-xl p-4 ${typeConf.bg} ${typeConf.border}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${typeConf.bg}`}>
                    <TypeIcon className={`h-4 w-4 ${typeConf.color}`} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{session.title}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs ${typeConf.color}`}>{typeConf.label}</span>
                      <span className={`text-xs ${statusConf.color}`}>• {statusConf.label}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center space-x-1 text-slate-400 mb-1">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">{session.suggestedDuration} min</span>
                  </div>
                  {session.scheduledDate && (
                    <div className="text-xs text-blue-400">{session.scheduledDate}</div>
                  )}
                </div>
              </div>

              <p className="text-slate-300 text-sm mb-4">{session.description}</p>

              {session.triggerInsight && (
                <div className="mb-4 p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Zap className="h-3 w-3 text-yellow-400" />
                    <span className="text-xs text-yellow-400">Triggered by AI Insight</span>
                  </div>
                  <span className="text-sm text-slate-300">{session.triggerInsight}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <h4 className="text-xs text-slate-400 mb-2">Participants</h4>
                  <div className="space-y-1">
                    {session.participants.map((participant, index) => (
                      <div key={index} className="flex items-center space-x-1">
                        <Users className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-300">{participant}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs text-slate-400 mb-2">Preparation Notes</h4>
                  <div className="space-y-1">
                    {session.preparationNotes.slice(0, 3).map((note, index) => (
                      <div key={index} className="flex items-center space-x-1">
                        <FileText className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-300">{note}</span>
                      </div>
                    ))}
                    {session.preparationNotes.length > 3 && (
                      <span className="text-xs text-slate-400">+{session.preparationNotes.length - 3} more</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs text-slate-400 mb-2">Expected Outcomes</h4>
                  <div className="space-y-1">
                    {session.expectedOutcomes.slice(0, 2).map((outcome, index) => (
                      <div key={index} className="flex items-center space-x-1">
                        <Target className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-300">{outcome}</span>
                      </div>
                    ))}
                    {session.expectedOutcomes.length > 2 && (
                      <span className="text-xs text-slate-400">+{session.expectedOutcomes.length - 2} more</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    session.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                    session.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {session.priority.toUpperCase()} PRIORITY
                  </span>
                </div>

                <div className="flex space-x-2">
                  {session.status === 'suggested' && (
                    <button
                      onClick={() => handleScheduleSession(session.id)}
                      className="flex items-center space-x-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                      <Calendar className="h-3 w-3" />
                      <span>Schedule</span>
                    </button>
                  )}
                  
                  <button className="flex items-center space-x-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1 rounded-lg text-sm transition-colors">
                    <ArrowRight className="h-3 w-3" />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {sessions.filter(s => s.status === 'suggested').length} AI-suggested sessions • 
            {sessions.filter(s => s.status === 'scheduled').length} scheduled • 
            {sessions.filter(s => s.status === 'completed').length} completed
          </div>
          <button className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105">
            <Brain className="h-4 w-4" />
            <span>Generate More Sessions</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StrategicSessionPlanner;