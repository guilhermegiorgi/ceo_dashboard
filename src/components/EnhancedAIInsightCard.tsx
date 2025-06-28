import React, { useState } from 'react';
import { 
  Bot, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  MessageSquare,
  FileText,
  Target,
  CheckCircle,
  ArrowRight,
  Brain,
  Link2,
  Calendar,
  Users
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface AIInsightProps {
  title: string;
  insight: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  timestamp: string;
  connectedNotes?: string[];
  suggestedActions?: string[];
  relatedProjects?: string[];
}

const EnhancedAIInsightCard: React.FC<AIInsightProps> = ({
  title,
  insight,
  confidence,
  priority,
  actionable,
  timestamp,
  connectedNotes = [],
  suggestedActions = [],
  relatedProjects = []
}) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActionPlan, setShowActionPlan] = useState(false);
  const [actionPlan, setActionPlan] = useState({
    title: '',
    tasks: [''],
    assignedProject: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    deadline: ''
  });

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

  const handleCreateActionPlan = () => {
    setActionPlan({
      ...actionPlan,
      title: `Action Plan: ${title}`
    });
    setShowActionPlan(true);
  };

  const handleAddTask = () => {
    setActionPlan({
      ...actionPlan,
      tasks: [...actionPlan.tasks, '']
    });
  };

  const handleTaskChange = (index: number, value: string) => {
    const newTasks = [...actionPlan.tasks];
    newTasks[index] = value;
    setActionPlan({
      ...actionPlan,
      tasks: newTasks
    });
  };

  const handleSubmitActionPlan = async () => {
    // This would integrate with the project management system
    console.log('Creating action plan:', actionPlan);
    
    // Simulate API call to create project tasks
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create feedback note in Obsidian
    const feedbackNote = {
      title: `Decision Log - ${title}`,
      content: `# Decision Log: ${title}

## Original Insight
${insight}

## Decision Made
Action plan created and tasks assigned to project: ${actionPlan.assignedProject}

## Action Items
${actionPlan.tasks.map((task, i) => `${i + 1}. ${task}`).join('\n')}

## Context
- Confidence Level: ${confidence}%
- Priority: ${priority}
- Date: ${new Date().toISOString().split('T')[0]}
- Source: AI Dashboard Insight

## Tags
#decision-log #ai-insight #action-taken

## Links
[[${actionPlan.assignedProject}]]
${connectedNotes.map(note => `[[${note}]]`).join('\n')}
`,
      timestamp: new Date().toISOString()
    };

    console.log('Creating feedback note:', feedbackNote);
    setShowActionPlan(false);
    
    // Show success feedback
    alert('Action plan created and decision logged to Second Brain!');
  };

  if (showActionPlan) {
    return (
      <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Create Action Plan</h3>
          <button 
            onClick={() => setShowActionPlan(false)}
            className="text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Plan Title</label>
            <input
              type="text"
              value={actionPlan.title}
              onChange={(e) => setActionPlan({...actionPlan, title: e.target.value})}
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Tasks</label>
            {actionPlan.tasks.map((task, index) => (
              <input
                key={index}
                type="text"
                value={task}
                onChange={(e) => handleTaskChange(index, e.target.value)}
                placeholder={`Task ${index + 1}`}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white mb-2"
              />
            ))}
            <button
              onClick={handleAddTask}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              + Add Task
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Assign to Project</label>
              <select
                value={actionPlan.assignedProject}
                onChange={(e) => setActionPlan({...actionPlan, assignedProject: e.target.value})}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Select Project</option>
                <option value="AI Product Launch">AI Product Launch</option>
                <option value="Market Expansion">Market Expansion</option>
                <option value="Infrastructure Upgrade">Infrastructure Upgrade</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Deadline</label>
              <input
                type="date"
                value={actionPlan.deadline}
                onChange={(e) => setActionPlan({...actionPlan, deadline: e.target.value})}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleSubmitActionPlan}
              className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
            >
              Create & Log Decision
            </button>
            <button
              onClick={() => setShowActionPlan(false)}
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
          
          {/* Confidence and Status */}
          <div className="flex items-center justify-between mb-4">
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

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1 rounded-lg text-sm transition-colors"
            >
              <Brain className="h-3 w-3" />
              <span>Expand Analysis</span>
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            <button className="flex items-center space-x-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-3 py-1 rounded-lg text-sm transition-colors">
              <Link2 className="h-3 w-3" />
              <span>Connected Notes ({connectedNotes.length})</span>
            </button>

            <button
              onClick={handleCreateActionPlan}
              className="flex items-center space-x-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1 rounded-lg text-sm transition-colors"
            >
              <Target className="h-3 w-3" />
              <span>Create Action Plan</span>
            </button>

            <button className="flex items-center space-x-1 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 px-3 py-1 rounded-lg text-sm transition-colors">
              <MessageSquare className="h-3 w-3" />
              <span>Question Premise</span>
            </button>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="border-t border-slate-700/50 pt-4 space-y-4">
              {connectedNotes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Connected Knowledge</h4>
                  <div className="flex flex-wrap gap-2">
                    {connectedNotes.map((note, index) => (
                      <span key={index} className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded">
                        {note}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {suggestedActions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Suggested Actions</h4>
                  <ul className="space-y-1">
                    {suggestedActions.map((action, index) => (
                      <li key={index} className="flex items-center space-x-2 text-sm text-slate-400">
                        <ArrowRight className="h-3 w-3" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {relatedProjects.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Related Projects</h4>
                  <div className="flex flex-wrap gap-2">
                    {relatedProjects.map((project, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded">
                        {project}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedAIInsightCard;