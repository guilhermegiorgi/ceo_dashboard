import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Target,
  Brain,
  CheckCircle,
  AlertTriangle,
  Clock,
  Filter,
  Search,
  Plus,
  BarChart3,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAPI } from '../hooks/useAPI';

interface DecisionEntry {
  id: string;
  title: string;
  description: string;
  context: string;
  decision: string;
  rationale: string;
  expected_outcome: string;
  actual_outcome?: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  category: 'strategic' | 'operational' | 'financial' | 'product' | 'people';
  status: 'pending' | 'implemented' | 'validated' | 'failed';
  created_date: string;
  review_date?: string;
  tags: string[];
  related_insights: string[];
  lessons?: string;
  would_do_again?: boolean;
}

const DecisionJournal: React.FC = () => {
  const { t } = useLanguage();
  const { apiClient } = useAPI();
  
  const [decisions, setDecisions] = useState<DecisionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDecision, setEditingDecision] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  const [newDecision, setNewDecision] = useState<Partial<DecisionEntry>>({
    title: '',
    description: '',
    context: '',
    decision: '',
    rationale: '',
    expected_outcome: '',
    confidence: 75,
    impact: 'medium',
    category: 'strategic',
    tags: [],
    related_insights: []
  });

  const categoryConfig = {
    strategic: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
    operational: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
    financial: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
    product: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
    people: { color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30' }
  };

  const statusConfig = {
    pending: { color: 'text-yellow-400', icon: Clock, label: 'Pending' },
    implemented: { color: 'text-blue-400', icon: Target, label: 'Implemented' },
    validated: { color: 'text-green-400', icon: CheckCircle, label: 'Validated' },
    failed: { color: 'text-red-400', icon: AlertTriangle, label: 'Failed' }
  };

  const impactConfig = {
    high: { color: 'text-red-400', label: 'High Impact' },
    medium: { color: 'text-yellow-400', label: 'Medium Impact' },
    low: { color: 'text-green-400', label: 'Low Impact' }
  };

  useEffect(() => {
    fetchDecisions();
    fetchAnalytics();
  }, []);

  const fetchDecisions = async () => {
    try {
      setLoading(true);
      const data = await apiClient.request('/api/decisions');
      setDecisions(data);
    } catch (error) {
      console.error('Failed to fetch decisions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await apiClient.request('/api/decisions/analytics');
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const handleCreateDecision = async () => {
    if (!newDecision.title || !newDecision.description || !newDecision.decision || !newDecision.rationale) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await apiClient.request('/api/decisions', {
        method: 'POST',
        body: newDecision
      });
      
      await fetchDecisions();
      await fetchAnalytics();
      setShowCreateForm(false);
      resetNewDecision();
      alert('Decision recorded successfully!');
    } catch (error) {
      console.error('Failed to create decision:', error);
      alert('Failed to record decision. Please try again.');
    }
  };

  const handleUpdateDecision = async (decisionId: string, updates: Partial<DecisionEntry>) => {
    try {
      await apiClient.request(`/api/decisions/${decisionId}`, {
        method: 'PUT',
        body: updates
      });
      
      await fetchDecisions();
      await fetchAnalytics();
      setEditingDecision(null);
      alert('Decision updated successfully!');
    } catch (error) {
      console.error('Failed to update decision:', error);
      alert('Failed to update decision. Please try again.');
    }
  };

  const handleDeleteDecision = async (decisionId: string) => {
    if (!confirm('Are you sure you want to delete this decision?')) {
      return;
    }

    try {
      await apiClient.request(`/api/decisions/${decisionId}`, {
        method: 'DELETE'
      });
      
      await fetchDecisions();
      await fetchAnalytics();
      alert('Decision deleted successfully!');
    } catch (error) {
      console.error('Failed to delete decision:', error);
      alert('Failed to delete decision. Please try again.');
    }
  };

  const resetNewDecision = () => {
    setNewDecision({
      title: '',
      description: '',
      context: '',
      decision: '',
      rationale: '',
      expected_outcome: '',
      confidence: 75,
      impact: 'medium',
      category: 'strategic',
      tags: [],
      related_insights: []
    });
  };

  const filteredDecisions = decisions.filter(decision => {
    const matchesSearch = decision.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         decision.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         decision.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || decision.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || decision.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Record New Decision</h2>
          <button 
            onClick={() => {
              setShowCreateForm(false);
              resetNewDecision();
            }}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Decision Title *</label>
            <input
              type="text"
              value={newDecision.title}
              onChange={(e) => setNewDecision({...newDecision, title: e.target.value})}
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="Enter decision title..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
              <select 
                value={newDecision.category}
                onChange={(e) => setNewDecision({...newDecision, category: e.target.value as any})}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="strategic">Strategic</option>
                <option value="operational">Operational</option>
                <option value="financial">Financial</option>
                <option value="product">Product</option>
                <option value="people">People</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Impact Level</label>
              <select 
                value={newDecision.impact}
                onChange={(e) => setNewDecision({...newDecision, impact: e.target.value as any})}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="high">High Impact</option>
                <option value="medium">Medium Impact</option>
                <option value="low">Low Impact</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Context & Background *</label>
            <textarea
              value={newDecision.context}
              onChange={(e) => setNewDecision({...newDecision, context: e.target.value})}
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white h-20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="What led to this decision?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Decision Made *</label>
            <textarea
              value={newDecision.decision}
              onChange={(e) => setNewDecision({...newDecision, decision: e.target.value})}
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white h-20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="What exactly was decided?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Rationale *</label>
            <textarea
              value={newDecision.rationale}
              onChange={(e) => setNewDecision({...newDecision, rationale: e.target.value})}
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white h-20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="Why was this decision made?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Expected Outcome *</label>
            <textarea
              value={newDecision.expected_outcome}
              onChange={(e) => setNewDecision({...newDecision, expected_outcome: e.target.value})}
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white h-16 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="What do you expect to happen?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Confidence Level: {newDecision.confidence}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={newDecision.confidence}
              onChange={(e) => setNewDecision({...newDecision, confidence: parseInt(e.target.value)})}
              className="w-full"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button 
              onClick={handleCreateDecision}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
            >
              Record Decision
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                resetNewDecision();
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
          <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Decision Journal</h2>
            <p className="text-sm text-slate-400">Track decisions, outcomes, and learnings</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
          <span>Record Decision</span>
        </button>
      </div>

      {/* Statistics Dashboard */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="h-4 w-4 text-green-400" />
              <span className="text-sm text-slate-400">Success Rate</span>
            </div>
            <div className="text-2xl font-bold text-green-400">{analytics.successRate}%</div>
          </div>

          <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Brain className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-slate-400">Avg Confidence</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">{analytics.averageConfidence}%</div>
          </div>

          <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-slate-400">Total Decisions</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">{analytics.totalDecisions}</div>
          </div>

          <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-slate-400">Pending Review</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">{analytics.pendingReview}</div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex space-x-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search decisions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          <option value="all">All Categories</option>
          <option value="strategic">Strategic</option>
          <option value="operational">Operational</option>
          <option value="financial">Financial</option>
          <option value="product">Product</option>
          <option value="people">People</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="implemented">Implemented</option>
          <option value="validated">Validated</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Decision Entries */}
      <div className="space-y-4">
        {filteredDecisions.map((decision) => {
          const categoryConf = categoryConfig[decision.category];
          const statusConf = statusConfig[decision.status];
          const impactConf = impactConfig[decision.impact];
          const StatusIcon = statusConf.icon;

          return (
            <div key={decision.id} className={`border rounded-xl p-4 ${categoryConf.bg} ${categoryConf.border}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-white font-semibold">{decision.title}</h3>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setEditingDecision(decision.id)}
                        className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteDecision(decision.id)}
                        className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 mb-2">{decision.description}</p>
                  <div className="flex items-center space-x-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${categoryConf.bg} ${categoryConf.color}`}>
                      {decision.category.toUpperCase()}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full bg-slate-700/50 ${impactConf.color}`}>
                      {impactConf.label}
                    </span>
                    <div className="flex items-center space-x-1">
                      <StatusIcon className={`h-3 w-3 ${statusConf.color}`} />
                      <span className={`text-xs ${statusConf.color}`}>{statusConf.label}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-slate-400 mb-1">Confidence</div>
                  <div className={`text-lg font-bold ${categoryConf.color}`}>{decision.confidence}%</div>
                  <div className="text-xs text-slate-500">{decision.created_date}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-1">Decision & Rationale</h4>
                  <p className="text-sm text-slate-400">{decision.decision}</p>
                  <p className="text-xs text-slate-500 mt-1">{decision.rationale}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-1">Expected vs Actual</h4>
                  <p className="text-sm text-slate-400">{decision.expected_outcome}</p>
                  {decision.actual_outcome && (
                    <p className="text-xs text-green-400 mt-1">✓ {decision.actual_outcome}</p>
                  )}
                </div>
              </div>

              {decision.lessons && (
                <div className="bg-slate-700/30 rounded-lg p-3 mb-4">
                  <h4 className="text-sm font-medium text-slate-300 mb-1">Lessons Learned</h4>
                  <p className="text-sm text-slate-400">{decision.lessons}</p>
                  {decision.would_do_again !== undefined && (
                    <div className="flex items-center space-x-2 mt-2">
                      {decision.would_do_again ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                      <span className={`text-xs ${decision.would_do_again ? 'text-green-400' : 'text-red-400'}`}>
                        Would {decision.would_do_again ? '' : 'not '}do again
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {decision.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {filteredDecisions.length} decisions shown • 
            Last updated: {decisions[0]?.review_date || 'Never'}
          </div>
          <button 
            onClick={fetchAnalytics}
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105"
          >
            <Brain className="h-4 w-4" />
            <span>Generate Decision Insights</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecisionJournal;