import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Zap, 
  Settings, 
  Play, 
  Pause, 
  RotateCcw,
  Brain,
  Target,
  Search,
  MessageSquare,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface AIAgent {
  id: string;
  name: string;
  type: 'research' | 'analysis' | 'monitoring' | 'execution' | 'creative';
  description: string;
  status: 'active' | 'idle' | 'working' | 'error';
  capabilities: string[];
  currentTask?: string;
  lastOutput?: string;
  performance: {
    tasksCompleted: number;
    successRate: number;
    avgResponseTime: number;
  };
  configuration: {
    autonomyLevel: 'low' | 'medium' | 'high';
    priority: number;
    maxConcurrentTasks: number;
  };
}

interface AgentTask {
  id: string;
  agentId: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  completedAt?: string;
  result?: string;
  dependencies?: string[];
}

const AIAgentOrchestrator: React.FC = () => {
  const { t } = useLanguage();
  const [agents, setAgents] = useState<AIAgent[]>([
    {
      id: '1',
      name: 'Market Research Agent',
      type: 'research',
      description: 'Continuously monitors market trends, competitor activities, and industry developments',
      status: 'active',
      capabilities: ['Web scraping', 'Data analysis', 'Trend identification', 'Report generation'],
      currentTask: 'Analyzing healthcare AI market trends',
      lastOutput: 'Identified 3 new market opportunities in medical imaging',
      performance: {
        tasksCompleted: 247,
        successRate: 94.2,
        avgResponseTime: 3.4
      },
      configuration: {
        autonomyLevel: 'high',
        priority: 1,
        maxConcurrentTasks: 5
      }
    },
    {
      id: '2',
      name: 'Strategic Analysis Agent',
      type: 'analysis',
      description: 'Analyzes business data, identifies patterns, and provides strategic recommendations',
      status: 'working',
      capabilities: ['Data modeling', 'Pattern recognition', 'Strategic planning', 'Risk assessment'],
      currentTask: 'Evaluating resource allocation optimization',
      performance: {
        tasksCompleted: 189,
        successRate: 97.8,
        avgResponseTime: 5.2
      },
      configuration: {
        autonomyLevel: 'medium',
        priority: 2,
        maxConcurrentTasks: 3
      }
    },
    {
      id: '3',
      name: 'Content Creation Agent',
      type: 'creative',
      description: 'Generates marketing content, presentations, and strategic documents',
      status: 'idle',
      capabilities: ['Content writing', 'Presentation design', 'Brand messaging', 'SEO optimization'],
      lastOutput: 'Created investor pitch deck for Q2 funding round',
      performance: {
        tasksCompleted: 156,
        successRate: 91.7,
        avgResponseTime: 8.1
      },
      configuration: {
        autonomyLevel: 'low',
        priority: 3,
        maxConcurrentTasks: 2
      }
    },
    {
      id: '4',
      name: 'Execution Agent',
      type: 'execution',
      description: 'Automates routine tasks, manages workflows, and executes approved actions',
      status: 'active',
      capabilities: ['Task automation', 'Workflow management', 'API integration', 'Process optimization'],
      currentTask: 'Updating project timelines based on new priorities',
      performance: {
        tasksCompleted: 892,
        successRate: 99.1,
        avgResponseTime: 1.2
      },
      configuration: {
        autonomyLevel: 'high',
        priority: 4,
        maxConcurrentTasks: 10
      }
    }
  ]);

  const [tasks, setTasks] = useState<AgentTask[]>([
    {
      id: '1',
      agentId: '1',
      title: 'Competitive Analysis: Healthcare AI',
      description: 'Analyze top 10 competitors in healthcare AI space',
      status: 'running',
      priority: 'high',
      createdAt: '2024-01-20T10:00:00Z'
    },
    {
      id: '2',
      agentId: '2',
      title: 'ROI Analysis: Q1 Projects',
      description: 'Calculate ROI projections for all Q1 initiatives',
      status: 'completed',
      priority: 'medium',
      createdAt: '2024-01-20T09:00:00Z',
      completedAt: '2024-01-20T11:30:00Z',
      result: 'Average ROI projection: 23.4% across 12 projects'
    }
  ]);

  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const statusConfig = {
    active: { color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle },
    idle: { color: 'text-slate-400', bg: 'bg-slate-500/10', icon: Clock },
    working: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Activity },
    error: { color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertTriangle }
  };

  const typeConfig = {
    research: { color: 'text-purple-400', icon: Search },
    analysis: { color: 'text-blue-400', icon: Brain },
    monitoring: { color: 'text-yellow-400', icon: Activity },
    execution: { color: 'text-green-400', icon: Zap },
    creative: { color: 'text-pink-400', icon: MessageSquare }
  };

  const handleStartAgent = (agentId: string) => {
    setAgents(agents.map(agent => 
      agent.id === agentId 
        ? { ...agent, status: 'active' as const }
        : agent
    ));
  };

  const handleStopAgent = (agentId: string) => {
    setAgents(agents.map(agent => 
      agent.id === agentId 
        ? { ...agent, status: 'idle' as const, currentTask: undefined }
        : agent
    ));
  };

  const handleCreateTask = (agentId: string, taskData: Partial<AgentTask>) => {
    const newTask: AgentTask = {
      id: Date.now().toString(),
      agentId,
      title: taskData.title || '',
      description: taskData.description || '',
      status: 'pending',
      priority: taskData.priority || 'medium',
      createdAt: new Date().toISOString()
    };
    
    setTasks([newTask, ...tasks]);
    
    // Update agent status
    setAgents(agents.map(agent => 
      agent.id === agentId 
        ? { ...agent, status: 'working' as const, currentTask: newTask.title }
        : agent
    ));
  };

  const renderAgentCard = (agent: AIAgent) => {
    const statusConf = statusConfig[agent.status];
    const typeConf = typeConfig[agent.type];
    const StatusIcon = statusConf.icon;
    const TypeIcon = typeConf.icon;

    return (
      <div key={agent.id} className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg ${statusConf.bg}`}>
              <TypeIcon className={`h-4 w-4 ${typeConf.color}`} />
            </div>
            <div>
              <h3 className="text-white font-medium">{agent.name}</h3>
              <p className="text-slate-400 text-sm">{agent.description}</p>
              <div className="flex items-center space-x-2 mt-2">
                <span className={`text-xs px-2 py-1 rounded ${typeConf.color} bg-slate-600/30`}>
                  {agent.type.toUpperCase()}
                </span>
                <div className="flex items-center space-x-1">
                  <StatusIcon className={`h-3 w-3 ${statusConf.color}`} />
                  <span className={`text-xs ${statusConf.color}`}>{agent.status.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-1">
            {agent.status === 'idle' ? (
              <button
                onClick={() => handleStartAgent(agent.id)}
                className="p-1 text-green-400 hover:text-green-300 transition-colors"
                title="Start Agent"
              >
                <Play className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => handleStopAgent(agent.id)}
                className="p-1 text-red-400 hover:text-red-300 transition-colors"
                title="Stop Agent"
              >
                <Pause className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setSelectedAgent(agent.id)}
              className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
              title="Configure"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {agent.currentTask && (
          <div className="bg-slate-600/30 rounded-lg p-3 mb-3">
            <div className="flex items-center space-x-2 mb-1">
              <Activity className="h-3 w-3 text-blue-400" />
              <span className="text-xs text-blue-400">CURRENT TASK</span>
            </div>
            <p className="text-sm text-slate-300">{agent.currentTask}</p>
          </div>
        )}

        {agent.lastOutput && !agent.currentTask && (
          <div className="bg-slate-600/30 rounded-lg p-3 mb-3">
            <div className="flex items-center space-x-2 mb-1">
              <CheckCircle className="h-3 w-3 text-green-400" />
              <span className="text-xs text-green-400">LAST OUTPUT</span>
            </div>
            <p className="text-sm text-slate-300">{agent.lastOutput}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{agent.performance.tasksCompleted}</div>
            <div className="text-xs text-slate-400">Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-400">{agent.performance.successRate}%</div>
            <div className="text-xs text-slate-400">Success</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-400">{agent.performance.avgResponseTime}s</div>
            <div className="text-xs text-slate-400">Avg Time</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {agent.capabilities.map((capability, index) => (
            <span key={index} className="px-2 py-1 bg-slate-600/50 text-slate-300 text-xs rounded">
              {capability}
            </span>
          ))}
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedAgent(agent.id);
              setShowCreateTask(true);
            }}
            className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1 rounded text-sm transition-colors"
          >
            Assign Task
          </button>
          <button className="flex-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-3 py-1 rounded text-sm transition-colors">
            View History
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AI Agent Orchestrator</h2>
            <p className="text-sm text-slate-400">Manage and coordinate your AI workforce</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setShowCreateAgent(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            <span>Create Agent</span>
          </button>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {agents.map(renderAgentCard)}
      </div>

      {/* Recent Tasks */}
      <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
        <h3 className="text-white font-medium mb-4">Recent Agent Tasks</h3>
        <div className="space-y-3">
          {tasks.slice(0, 5).map((task) => {
            const agent = agents.find(a => a.id === task.agentId);
            return (
              <div key={task.id} className="flex items-center justify-between p-3 bg-slate-600/30 rounded">
                <div>
                  <h4 className="text-white text-sm font-medium">{task.title}</h4>
                  <p className="text-slate-400 text-xs">Agent: {agent?.name}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded ${
                    task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    task.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                    task.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {task.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(task.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Health */}
      <div className="mt-6 pt-4 border-t border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {agents.filter(a => a.status === 'active').length} active agents • 
            {tasks.filter(t => t.status === 'running').length} running tasks • 
            System health: <span className="text-green-400">Optimal</span>
          </div>
          <button className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200">
            <RotateCcw className="h-4 w-4" />
            <span>Optimize Workflow</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAgentOrchestrator;