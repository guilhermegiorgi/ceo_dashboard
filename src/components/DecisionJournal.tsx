import React, { useState } from 'react';
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
  BarChart3
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface DecisionEntry {
  id: string;
  title: string;
  description: string;
  context: string;
  decision: string;
  rationale: string;
  expectedOutcome: string;
  actualOutcome?: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  category: 'strategic' | 'operational' | 'financial' | 'product' | 'people';
  status: 'pending' | 'implemented' | 'validated' | 'failed';
  createdDate: string;
  reviewDate?: string;
  tags: string[];
  relatedInsights: string[];
  lessons?: string;
  wouldDoAgain?: boolean;
}

const DecisionJournal: React.FC = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [decisions, setDecisions] = useState<DecisionEntry[]>([
    {
      id: '1',
      title: 'Resource Reallocation to AI Healthcare',
      description: 'Decision to reallocate 40% of engineering resources from maintenance to AI healthcare initiative',
      context: 'AI insight identified significant market opportunity in healthcare AI tools with 340% growth potential',
      decision: 'Reallocate resources and fast-track AI healthcare project',
      rationale: 'Market timing is critical, and our technical capabilities align well with identified opportunity',
      expectedOutcome: 'Launch MVP within 6 months, capture early market share',
      actualOutcome: 'MVP launched in 5.5 months, secured 3 pilot customers',
      confidence: 85,
      impact: 'high',
      category: 'strategic',
      status: 'validated',
      createdDate: '2024-01-15',
      reviewDate: '2024-01-20',
      tags: ['ai', 'healthcare', 'resource-allocation', 'market-opportunity'],
      relatedInsights: ['Market Opportunity Detected', 'Cross-Domain Pattern Discovery'],
      lessons: 'AI insights proved accurate. Early market entry was crucial for competitive advantage.',
      wouldDoAgain: true
    },
    {
      id: '2',
      title: 'Reject Partnership with TechCorp',
      description: 'Decision to decline strategic partnership offer from TechCorp despite attractive terms',
      context: 'TechCorp offered partnership with $2M investment but required exclusive technology licensing',
      decision: 'Decline partnership and pursue independent growth',
      rationale: 'Maintaining technology independence is crucial for long-term competitive advantage',
      expectedOutcome: 'Slower initial growth but better long-term positioning',
      confidence: 70,
      impact: 'high',
      category: 'strategic',
      status: 'implemented',
      createdDate: '2024-01-10',
      tags: ['partnership', 'independence', 'technology', 'long-term'],
      relatedInsights: ['Strategic Independence Analysis'],
      lessons: 'Still monitoring outcomes. Independence preserved but growth slower than projected.'
    },
    {
      id: '3',
      title: 'Implement First Principles Methodology',
      description: 'Decision to mandate first principles thinking for all new project initiatives',
      context: 'AI analysis revealed 340% higher success rate for projects using first principles approach',
      decision: 'Require first principles analysis for all projects >$50K',
      rationale: 'Historical data shows clear correlation between first principles thinking and project success',
      expectedOutcome: 'Improved project success rate and better resource utilization',
      confidence: 92,
      impact: 'medium',
      category: 'operational',
      status: 'implemented',
      createdDate: '2024-01-12',
      tags: ['methodology', 'first-principles', 'project-management', 'success-rate'],
      relatedInsights: ['First Principles Success Pattern'],
      lessons: 'Early results positive. Teams initially resistant but now embracing the methodology.'
    }
  ]);

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

  const filteredDecisions = decisions.filter(decision => {
    const matchesSearch = decision.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         decision.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         decision.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || decision.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || decision.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getSuccessRate = () => {
    const validatedDecisions = decisions.filter(d => d.status === 'validated');
    const failedDecisions = decisions.filter(d => d.status === 'failed');
    const total = validatedDecisions.length + failedDecisions.length;
    return total > 0 ? Math.round((validatedDecisions.length / total) * 100) : 0;
  };

  const getAverageConfidence = () => {
    return Math.round(decisions.reduce((acc, d) => acc + d.confidence, 0) / decisions.length);
  };

  if (showCreateForm) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Record New Decision</h2>
          <button 
            onClick={() => setShowCreateForm(false)}
            className="text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Decision Title</label>
            <input
              type="text"
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white"
              placeholder="Enter decision title..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
              <select className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white">
                <option value="strategic">Strategic</option>
                <option value="operational">Operational</option>
                <option value="financial">Financial</option>
                <option value="product">Product</option>
                <option value="people">People</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Impact Level</label>
              <select className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white">
                <option value="high">High Impact</option>
                <option value="medium">Medium Impact</option>
                <option value="low">Low Impact</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Context & Background</label>
            <textarea
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white h-20"
              placeholder="What led to this decision?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Decision Made</label>
            <textarea
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white h-20"
              placeholder="What exactly was decided?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Rationale</label>
            <textarea
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white h-20"
              placeholder="Why was this decision made?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Expected Outcome</label>
            <textarea
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white h-16"
              placeholder="What do you expect to happen?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Confidence Level (%)</label>
            <input
              type="range"
              min="0"
              max="100"
              className="w-full"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200">
              Record Decision
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="h-4 w-4 text-green-400" />
            <span className="text-sm text-slate-400">Success Rate</span>
          </div>
          <div className="text-2xl font-bold text-green-400">{getSuccessRate()}%</div>
        </div>

        <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Brain className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-slate-400">Avg Confidence</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">{getAverageConfidence()}%</div>
        </div>

        <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-slate-400">Total Decisions</span>
          </div>
          <div className="text-2xl font-bold text-purple-400">{decisions.length}</div>
        </div>

        <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-4 w-4 text-yellow-400" />
            <span className="text-sm text-slate-400">Pending Review</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">
            {decisions.filter(d => d.status === 'implemented').length}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search decisions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
          className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                  <h3 className="text-white font-semibold mb-1">{decision.title}</h3>
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
                  <div className="text-xs text-slate-500">{decision.createdDate}</div>
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
                  <p className="text-sm text-slate-400">{decision.expectedOutcome}</p>
                  {decision.actualOutcome && (
                    <p className="text-xs text-green-400 mt-1">✓ {decision.actualOutcome}</p>
                  )}
                </div>
              </div>

              {decision.lessons && (
                <div className="bg-slate-700/30 rounded-lg p-3 mb-4">
                  <h4 className="text-sm font-medium text-slate-300 mb-1">Lessons Learned</h4>
                  <p className="text-sm text-slate-400">{decision.lessons}</p>
                  {decision.wouldDoAgain !== undefined && (
                    <div className="flex items-center space-x-2 mt-2">
                      {decision.wouldDoAgain ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                      <span className={`text-xs ${decision.wouldDoAgain ? 'text-green-400' : 'text-red-400'}`}>
                        Would {decision.wouldDoAgain ? '' : 'not '}do again
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
            Last updated: {decisions[0]?.reviewDate || 'Never'}
          </div>
          <button className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105">
            <Brain className="h-4 w-4" />
            <span>Generate Decision Insights</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecisionJournal;