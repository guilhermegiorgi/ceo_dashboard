import React, { useState } from 'react';
import { 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  FileText, 
  Target,
  Calendar,
  User,
  Zap,
  RotateCcw
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface FeedbackAction {
  id: string;
  type: 'decision' | 'insight_validation' | 'action_taken' | 'learning_captured';
  title: string;
  description: string;
  timestamp: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  obsidianNote?: string;
  relatedProject?: string;
  impact?: string;
}

const FeedbackLoopTracker: React.FC = () => {
  const { t } = useLanguage();
  const [feedbackActions, setFeedbackActions] = useState<FeedbackAction[]>([
    {
      id: '1',
      type: 'decision',
      title: 'Market Opportunity - AI Healthcare Tools',
      description: 'Created action plan and assigned tasks to AI Product Launch project',
      timestamp: '2 minutes ago',
      status: 'completed',
      obsidianNote: 'Decision Log - Market Opportunity AI Healthcare.md',
      relatedProject: 'AI Product Launch',
      impact: 'High - Strategic pivot approved'
    },
    {
      id: '2',
      type: 'insight_validation',
      title: 'Team Performance Optimization',
      description: 'Validated resource reallocation recommendation through team lead consultation',
      timestamp: '15 minutes ago',
      status: 'processing',
      obsidianNote: 'Insight Validation - Team Performance.md',
      relatedProject: 'Infrastructure Upgrade',
      impact: 'Medium - Process improvement identified'
    },
    {
      id: '3',
      type: 'learning_captured',
      title: 'Cross-Domain Pattern Discovery',
      description: 'Documented synergy between trading algorithms and agricultural optimization',
      timestamp: '1 hour ago',
      status: 'completed',
      obsidianNote: 'Learning - Cross Domain Patterns.md',
      impact: 'High - New market vertical identified'
    }
  ]);

  const statusConfig = {
    pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Clock },
    processing: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: RotateCcw },
    completed: { color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle },
    failed: { color: 'text-red-400', bg: 'bg-red-500/10', icon: Target }
  };

  const typeConfig = {
    decision: { color: 'text-purple-400', icon: Target, label: 'Decision Made' },
    insight_validation: { color: 'text-blue-400', icon: CheckCircle, label: 'Insight Validated' },
    action_taken: { color: 'text-green-400', icon: Zap, label: 'Action Taken' },
    learning_captured: { color: 'text-orange-400', icon: FileText, label: 'Learning Captured' }
  };

  const handleViewNote = (noteTitle: string) => {
    console.log('Opening Obsidian note:', noteTitle);
    // This would integrate with Obsidian API to open the specific note
  };

  const handleViewProject = (projectName: string) => {
    console.log('Navigating to project:', projectName);
    // This would navigate to the project details
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg">
            <RotateCcw className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Feedback Loop Tracker</h2>
            <p className="text-sm text-slate-400">Closing the loop between insights and actions</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm text-green-400 font-medium">
              {feedbackActions.filter(a => a.status === 'completed').length} Completed
            </div>
            <div className="text-xs text-slate-400">
              {feedbackActions.filter(a => a.status === 'processing').length} In Progress
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {feedbackActions.map((action) => {
          const statusConf = statusConfig[action.status];
          const typeConf = typeConfig[action.type];
          const StatusIcon = statusConf.icon;
          const TypeIcon = typeConf.icon;

          return (
            <div key={action.id} className="border border-slate-700/50 rounded-lg p-4 hover:bg-slate-700/20 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${statusConf.bg}`}>
                    <StatusIcon className={`h-4 w-4 ${statusConf.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-white font-medium">{action.title}</h3>
                      <div className="flex items-center space-x-1">
                        <TypeIcon className={`h-3 w-3 ${typeConf.color}`} />
                        <span className={`text-xs ${typeConf.color}`}>{typeConf.label}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300">{action.description}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-xs px-2 py-1 rounded-full ${statusConf.bg} ${statusConf.color}`}>
                    {action.status.toUpperCase()}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{action.timestamp}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {action.obsidianNote && (
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-400">Second Brain Note</div>
                      <button
                        onClick={() => handleViewNote(action.obsidianNote!)}
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {action.obsidianNote}
                      </button>
                    </div>
                  </div>
                )}

                {action.relatedProject && (
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-400">Related Project</div>
                      <button
                        onClick={() => handleViewProject(action.relatedProject!)}
                        className="text-sm text-green-400 hover:text-green-300 transition-colors"
                      >
                        {action.relatedProject}
                      </button>
                    </div>
                  </div>
                )}

                {action.impact && (
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-400">Impact</div>
                      <div className="text-sm text-slate-300">{action.impact}</div>
                    </div>
                  </div>
                )}
              </div>

              {action.status === 'processing' && (
                <div className="mt-4 pt-3 border-t border-slate-700/50">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-blue-400">Processing feedback to Second Brain...</span>
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
            Feedback loop health: <span className="text-green-400 font-medium">Excellent</span> • 
            Average completion time: <span className="text-blue-400">2.3 minutes</span>
          </div>
          <button className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105">
            <RotateCcw className="h-4 w-4" />
            <span>Sync All Feedback</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackLoopTracker;