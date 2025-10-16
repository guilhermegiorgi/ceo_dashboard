import React, { useState, useEffect } from 'react';
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
  ArrowRight,
  Edit,
  Trash2,
  CalendarPlus
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAPI } from '../hooks/useAPI';

interface StrategicSession {
  id: string;
  title: string;
  type: 'synergy_exploration' | 'gap_analysis' | 'pattern_validation' | 'strategic_alignment';
  description: string;
  suggested_duration: number;
  participants: string[];
  preparation_notes: string[];
  expected_outcomes: string[];
  priority: 'high' | 'medium' | 'low';
  trigger_insight?: string;
  scheduled_date?: string;
  status: 'suggested' | 'scheduled' | 'completed';
}

const StrategicSessionPlanner: React.FC = () => {
  const { t } = useLanguage();
  const api = useAPI();
  
  const [sessions, setSessions] = useState<StrategicSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [schedulingSession, setSchedulingSession] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');

  const [newSession, setNewSession] = useState<Partial<StrategicSession>>({
    title: '',
    type: 'synergy_exploration',
    description: '',
    suggested_duration: 90,
    participants: [''],
    preparation_notes: [''],
    expected_outcomes: [''],
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

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await api.apiClient.request('/api/sessions');
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSession = async (sessionId: string) => {
    if (!scheduleDate) {
      alert('Please select a date');
      return;
    }

    try {
      await api.apiClient.request(`/api/sessions/${sessionId}/schedule`, {
        method: 'POST',
        body: { date: scheduleDate }
      });
      
      await fetchSessions();
      setSchedulingSession(null);
      setScheduleDate('');
      alert('Session scheduled successfully!');
    } catch (error) {
      console.error('Failed to schedule session:', error);
      alert('Failed to schedule session. Please try again.');
    }
  };

  const handleCreateSession = async () => {
    if (!newSession.title || !newSession.description) {
      alert('Please fill in title and description');
      return;
    }

    try {
      await api.apiClient.request('/api/sessions', {
        method: 'POST',
        body: newSession
      });
      
      await fetchSessions();
      setShowCreateForm(false);
      resetNewSession();
      alert('Session created successfully!');
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to create session. Please try again.');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      await api.apiClient.request(`/api/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      
      await fetchSessions();
      alert('Session deleted successfully!');
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  const handleGenerateAISessions = async () => {
    try {
      const insights = await api.apiClient.request('/api/insights');
      await api.apiClient.request('/api/sessions/generate', {
        method: 'POST',
        body: { insights: insights.slice(0, 3) }
      });
      
      await fetchSessions();
      alert('AI sessions generated successfully!');
    } catch (error) {
      console.error('Failed to generate AI sessions:', error);
      alert('Failed to generate AI sessions. Please try again.');
    }
  };

  const resetNewSession = () => {
    setNewSession({
      title: '',
      type: 'synergy_exploration',
      description: '',
      suggested_duration: 90,
      participants: [''],
      preparation_notes: [''],
      expected_outcomes: [''],
      priority: 'medium'
    });
  };

  const addArrayItem = (field: 'participants' | 'preparation_notes' | 'expected_outcomes') => {
    setNewSession({
      ...newSession,
      [field]: [...(newSession[field] || []), '']
    });
  };

  const updateArrayItem = (field: 'participants' | 'preparation_notes' | 'expected_outcomes', index: number, value: string) => {
    const array = [...(newSession[field] || [])];
    array[index] = value;
    setNewSession({
      ...newSession,
      [field]: array
    });
  };

  const removeArrayItem = (field: 'participants' | 'preparation_notes' | 'expected_outcomes', index: number) => {
    const array = [...(newSession[field] || [])];
    if (array.length > 1) {
      array.splice(index, 1);
      setNewSession({
        ...newSession,
        [field]: array
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Create Strategic Session</h2>
          <button 
            onClick={() => {
              setShowCreateForm(false);
              resetNewSession();
            }}
            className="text-slate-400 hover:text-white transition-colors"
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
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Enter session title..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Session Type</label>
              <select
                value={newSession.type}
                onChange={(e) => setNewSession({...newSession, type: e.target.value as any})}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                value={newSession.suggested_duration}
                onChange={(e) => setNewSession({...newSession, suggested_duration: parseInt(e.target.value)})}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              value={newSession.description}
              onChange={(e) => setNewSession({...newSession, description: e.target.value})}
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white h-20 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Describe the session objectives..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Participants</label>
            {newSession.participants?.map((participant, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={participant}
                  onChange={(e) => updateArrayItem('participants', index, e.target.value)}
                  placeholder={`Participant ${index + 1}`}
                  className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                {(newSession.participants?.length || 0) > 1 && (
                  <button
                    onClick={() => removeArrayItem('participants', index)}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => addArrayItem('participants')}
              className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span>Add Participant</span>
            </button>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleCreateSession}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
            >
              Create Session
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                resetNewSession();
              }}
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
        
        <div className="flex space-x-2">
          <button
            onClick={handleGenerateAISessions}
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
          >
            <Brain className="h-4 w-4" />
            <span>Generate AI Sessions</span>
          </button>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            <span>Create Session</span>
          </button>
        </div>
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

                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className="flex items-center space-x-1 text-slate-400 mb-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">{session.suggested_duration} min</span>
                    </div>
                    {session.scheduled_date && (
                      <div className="text-xs text-blue-400">{session.scheduled_date}</div>
                    )}
                  </div>
                  
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setEditingSession(session.id)}
                      className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-slate-300 text-sm mb-4">{session.description}</p>

              {session.trigger_insight && (
                <div className="mb-4 p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Zap className="h-3 w-3 text-yellow-400" />
                    <span className="text-xs text-yellow-400">Triggered by AI Insight</span>
                  </div>
                  <span className="text-sm text-slate-300">{session.trigger_insight}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <h4 className="text-xs text-slate-400 mb-2">Participants</h4>
                  <div className="space-y-1">
                    {session.participants.slice(0, 3).map((participant, index) => (
                      <div key={index} className="flex items-center space-x-1">
                        <Users className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-300">{participant}</span>
                      </div>
                    ))}
                    {session.participants.length > 3 && (
                      <span className="text-xs text-slate-400">+{session.participants.length - 3} more</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs text-slate-400 mb-2">Preparation Notes</h4>
                  <div className="space-y-1">
                    {session.preparation_notes.slice(0, 3).map((note, index) => (
                      <div key={index} className="flex items-center space-x-1">
                        <FileText className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-300">{note}</span>
                      </div>
                    ))}
                    {session.preparation_notes.length > 3 && (
                      <span className="text-xs text-slate-400">+{session.preparation_notes.length - 3} more</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs text-slate-400 mb-2">Expected Outcomes</h4>
                  <div className="space-y-1">
                    {session.expected_outcomes.slice(0, 2).map((outcome, index) => (
                      <div key={index} className="flex items-center space-x-1">
                        <Target className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-300">{outcome}</span>
                      </div>
                    ))}
                    {session.expected_outcomes.length > 2 && (
                      <span className="text-xs text-slate-400">+{session.expected_outcomes.length - 2} more</span>
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
                    <>
                      {schedulingSession === session.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            className="bg-slate-700/50 border border-slate-600/50 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                          <button
                            onClick={() => handleScheduleSession(session.id)}
                            className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-2 py-1 rounded text-sm transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setSchedulingSession(null)}
                            className="bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 px-2 py-1 rounded text-sm transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSchedulingSession(session.id)}
                          className="flex items-center space-x-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1 rounded-lg text-sm transition-colors"
                        >
                          <CalendarPlus className="h-3 w-3" />
                          <span>Schedule</span>
                        </button>
                      )}
                    </>
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
        </div>
      </div>
    </div>
  );
};

export default StrategicSessionPlanner;