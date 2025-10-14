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
  Users,
  Plus,
  Trash2
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useInsights, useObsidian } from '../hooks/useInsightsService';
import { useProjects } from '../hooks/useProjects';

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
  id?: string;
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
  relatedProjects = [],
  id
}) => {
  const { t } = useLanguage();
  const { createActionPlan } = useInsights();
  const { createNote } = useObsidian();
  const { projects } = useProjects();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActionPlan, setShowActionPlan] = useState(false);
  const [showConnectedNotes, setShowConnectedNotes] = useState(false);
  const [showQuestionPremise, setShowQuestionPremise] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  
  const [actionPlan, setActionPlan] = useState({
    title: '',
    tasks: [''],
    assignedProject: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    deadline: ''
  });

  const [questionText, setQuestionText] = useState('');

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

  const handleExpandAnalysis = () => {
    setIsExpanded(!isExpanded);
  };

  const handleShowConnectedNotes = () => {
    setShowConnectedNotes(!showConnectedNotes);
  };

  const handleCreateActionPlan = () => {
    setActionPlan({
      ...actionPlan,
      title: `Action Plan: ${title}`
    });
    setShowActionPlan(true);
  };

  const handleQuestionPremise = () => {
    setShowQuestionPremise(!showQuestionPremise);
  };

  const handleAddTask = () => {
    setActionPlan({
      ...actionPlan,
      tasks: [...actionPlan.tasks, '']
    });
  };

  const handleRemoveTask = (index: number) => {
    if (actionPlan.tasks.length > 1) {
      const newTasks = actionPlan.tasks.filter((_, i) => i !== index);
      setActionPlan({
        ...actionPlan,
        tasks: newTasks
      });
    }
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
    if (!actionPlan.title || !actionPlan.assignedProject || actionPlan.tasks.some(task => !task.trim())) {
      alert('Please fill in all required fields');
      return;
    }

    setIsCreatingPlan(true);
    
    try {
      // Create action plan via API
      if (id) {
        await createActionPlan(id, actionPlan);
      }

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
        folder: 'Decision Logs'
      };

      await createNote(feedbackNote.title, feedbackNote.content, feedbackNote.folder);
      
      setShowActionPlan(false);
      alert('Action plan created and decision logged to Second Brain!');
    } catch (error) {
      console.error('Failed to create action plan:', error);
      alert('Failed to create action plan. Please try again.');
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!questionText.trim()) {
      alert('Please enter your question');
      return;
    }

    try {
      // Create question note in Obsidian
      const questionNote = {
        title: `Question - ${title}`,
        content: `# Question About: ${title}

## Original Insight
${insight}

## Question/Challenge
${questionText}

## Context
- Confidence Level: ${confidence}%
- Priority: ${priority}
- Date: ${new Date().toISOString().split('T')[0]}
- Source: AI Dashboard Insight

## Tags
#question #ai-insight #premise-challenge

## Next Steps
- [ ] Research alternative perspectives
- [ ] Gather additional data
- [ ] Consult domain experts
- [ ] Re-evaluate assumptions

## Links
${connectedNotes.map(note => `[[${note}]]`).join('\n')}
`,
        folder: 'Questions'
      };

      await createNote(questionNote.title, questionNote.content, questionNote.folder);
      
      setShowQuestionPremise(false);
      setQuestionText('');
      alert('Question logged to Second Brain for further investigation!');
    } catch (error) {
      console.error('Failed to create question note:', error);
      alert('Failed to log question. Please try again.');
    }
  };

  if (showActionPlan) {
    return (
      <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Create Action Plan</h3>
          <button 
            onClick={() => setShowActionPlan(false)}
            className="text-slate-400 hover:text-white transition-colors"
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
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Tasks</label>
            {actionPlan.tasks.map((task, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={task}
                  onChange={(e) => handleTaskChange(index, e.target.value)}
                  placeholder={`Task ${index + 1}`}
                  className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                {actionPlan.tasks.length > 1 && (
                  <button
                    onClick={() => handleRemoveTask(index)}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={handleAddTask}
              className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span>Add Task</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Assign to Project</label>
              <select
                value={actionPlan.assignedProject}
                onChange={(e) => setActionPlan({...actionPlan, assignedProject: e.target.value})}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="">Select Project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.name}>{project.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Deadline</label>
              <input
                type="date"
                value={actionPlan.deadline}
                onChange={(e) => setActionPlan({...actionPlan, deadline: e.target.value})}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleSubmitActionPlan}
              disabled={isCreatingPlan}
              className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
            >
              {isCreatingPlan ? 'Creating...' : 'Create & Log Decision'}
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

  if (showQuestionPremise) {
    return (
      <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Question Premise</h3>
          <button 
            onClick={() => setShowQuestionPremise(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Your Question or Challenge</label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="What assumptions would you like to challenge? What alternative perspectives should be considered?"
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white h-24 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="bg-slate-700/30 rounded-lg p-3">
            <h4 className="text-sm font-medium text-slate-300 mb-2">Original Insight</h4>
            <p className="text-sm text-slate-400">{insight}</p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleSubmitQuestion}
              className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
            >
              Log Question to Second Brain
            </button>
            <button
              onClick={() => setShowQuestionPremise(false)}
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
              onClick={handleExpandAnalysis}
              className="flex items-center space-x-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1 rounded-lg text-sm transition-colors"
            >
              <Brain className="h-3 w-3" />
              <span>Expand Analysis</span>
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            <button
              onClick={handleShowConnectedNotes}
              className="flex items-center space-x-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-3 py-1 rounded-lg text-sm transition-colors"
            >
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

            <button
              onClick={handleQuestionPremise}
              className="flex items-center space-x-1 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 px-3 py-1 rounded-lg text-sm transition-colors"
            >
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

          {/* Connected Notes Modal */}
          {showConnectedNotes && (
            <div className="border-t border-slate-700/50 pt-4">
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-slate-300">Connected Notes</h4>
                  <button
                    onClick={() => setShowConnectedNotes(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-2">
                  {connectedNotes.map((note, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-slate-600/30 rounded">
                      <FileText className="h-3 w-3 text-slate-400" />
                      <span className="text-sm text-slate-300">{note}</span>
                      <button className="ml-auto text-blue-400 hover:text-blue-300 text-xs">
                        Open
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedAIInsightCard;
