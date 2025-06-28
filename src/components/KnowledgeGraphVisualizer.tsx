import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Search, 
  Filter, 
  Maximize2,
  Minimize2,
  RefreshCw,
  Zap,
  FileText,
  Link2,
  Tag,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface KnowledgeNode {
  id: string;
  title: string;
  type: 'note' | 'project' | 'insight' | 'decision' | 'person' | 'concept';
  content: string;
  connections: string[];
  tags: string[];
  lastModified: string;
  importance: number;
  x?: number;
  y?: number;
}

interface Connection {
  from: string;
  to: string;
  strength: number;
  type: 'reference' | 'similarity' | 'causal' | 'temporal';
}

const KnowledgeGraphVisualizer: React.FC = () => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [nodes, setNodes] = useState<KnowledgeNode[]>([
    {
      id: '1',
      title: 'AI Healthcare Strategy',
      type: 'project',
      content: 'Strategic initiative to develop AI-powered healthcare tools...',
      connections: ['2', '3', '5'],
      tags: ['healthcare', 'ai', 'strategy'],
      lastModified: '2024-01-20',
      importance: 95
    },
    {
      id: '2',
      title: 'Market Analysis 2024',
      type: 'note',
      content: 'Comprehensive analysis of healthcare AI market trends...',
      connections: ['1', '4', '6'],
      tags: ['market', 'analysis', 'healthcare'],
      lastModified: '2024-01-19',
      importance: 87
    },
    {
      id: '3',
      title: 'First Principles Thinking',
      type: 'concept',
      content: 'Fundamental approach to problem-solving by breaking down complex problems...',
      connections: ['1', '7', '8'],
      tags: ['methodology', 'thinking', 'strategy'],
      lastModified: '2024-01-18',
      importance: 92
    },
    {
      id: '4',
      title: 'Competitor X Analysis',
      type: 'note',
      content: 'Detailed competitive intelligence on major healthcare AI competitor...',
      connections: ['2', '6'],
      tags: ['competitor', 'intelligence', 'healthcare'],
      lastModified: '2024-01-17',
      importance: 78
    },
    {
      id: '5',
      title: 'Cross-Domain Innovation Opportunity',
      type: 'insight',
      content: 'AI-discovered synergy between trading algorithms and healthcare optimization...',
      connections: ['1', '9'],
      tags: ['innovation', 'cross-domain', 'ai-insight'],
      lastModified: '2024-01-20',
      importance: 89
    },
    {
      id: '6',
      title: 'Product Roadmap 2024',
      type: 'project',
      content: 'Strategic product development timeline and priorities...',
      connections: ['2', '4'],
      tags: ['product', 'roadmap', 'planning'],
      lastModified: '2024-01-16',
      importance: 85
    },
    {
      id: '7',
      title: 'Decision: Resource Reallocation',
      type: 'decision',
      content: 'Strategic decision to reallocate engineering resources based on AI insights...',
      connections: ['3', '8'],
      tags: ['decision', 'resources', 'engineering'],
      lastModified: '2024-01-20',
      importance: 82
    },
    {
      id: '8',
      title: 'Team Performance Metrics',
      type: 'note',
      content: 'Analysis of team productivity and performance indicators...',
      connections: ['3', '7'],
      tags: ['team', 'performance', 'metrics'],
      lastModified: '2024-01-19',
      importance: 75
    },
    {
      id: '9',
      title: 'Trading Algorithm Research',
      type: 'note',
      content: 'Research on algorithmic trading strategies and risk management...',
      connections: ['5'],
      tags: ['trading', 'algorithms', 'research'],
      lastModified: '2024-01-15',
      importance: 70
    }
  ]);

  const typeConfig = {
    note: { color: 'bg-blue-500', textColor: 'text-blue-400', icon: FileText },
    project: { color: 'bg-green-500', textColor: 'text-green-400', icon: Network },
    insight: { color: 'bg-purple-500', textColor: 'text-purple-400', icon: Zap },
    decision: { color: 'bg-orange-500', textColor: 'text-orange-400', icon: TrendingUp },
    person: { color: 'bg-pink-500', textColor: 'text-pink-400', icon: FileText },
    concept: { color: 'bg-yellow-500', textColor: 'text-yellow-400', icon: Tag }
  };

  const filteredNodes = nodes.filter(node => {
    const matchesSearch = node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         node.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         node.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterType === 'all' || node.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleAnalyzeGraph = async () => {
    setIsAnalyzing(true);
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Add new AI-discovered connections
    const newInsight: KnowledgeNode = {
      id: Date.now().toString(),
      title: 'Pattern: Success Correlation with First Principles',
      type: 'insight',
      content: 'AI analysis reveals that projects tagged with #first-principles have 340% higher success rate...',
      connections: ['1', '3', '7'],
      tags: ['ai-insight', 'pattern', 'success'],
      lastModified: new Date().toISOString().split('T')[0],
      importance: 94
    };
    
    setNodes([...nodes, newInsight]);
    setIsAnalyzing(false);
  };

  const getNodeSize = (importance: number) => {
    if (importance >= 90) return 'w-4 h-4';
    if (importance >= 80) return 'w-3 h-3';
    return 'w-2 h-2';
  };

  const getConnectionStrength = (nodeId: string, connectedId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    const connected = nodes.find(n => n.id === connectedId);
    if (!node || !connected) return 0;
    
    // Calculate connection strength based on shared tags and content similarity
    const sharedTags = node.tags.filter(tag => connected.tags.includes(tag)).length;
    return Math.min(sharedTags * 20 + 10, 100);
  };

  return (
    <div className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl transition-all duration-300 ${
      isExpanded ? 'fixed inset-4 z-50' : 'p-6'
    }`}>
      <div className="flex items-center justify-between mb-6 p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg">
            <Network className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Knowledge Graph Visualizer</h2>
            <p className="text-sm text-slate-400">Interactive exploration of your Second Brain</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleAnalyzeGraph}
            disabled={isAnalyzing}
            className="flex items-center space-x-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing...' : 'AI Analysis'}</span>
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {isExpanded ? 
              <Minimize2 className="h-4 w-4 text-slate-400" /> : 
              <Maximize2 className="h-4 w-4 text-slate-400" />
            }
          </button>
        </div>
      </div>

      <div className={`${isExpanded ? 'p-6 pt-0' : ''}`}>
        {/* Search and Filter Controls */}
        <div className="flex space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search knowledge graph..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-700/50 border border-slate-600/50 rounded-lg pl-10 pr-8 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">All Types</option>
              <option value="note">Notes</option>
              <option value="project">Projects</option>
              <option value="insight">Insights</option>
              <option value="decision">Decisions</option>
              <option value="concept">Concepts</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graph Visualization Area */}
          <div className="lg:col-span-2">
            <div className={`bg-slate-900/50 border border-slate-700/50 rounded-lg relative overflow-hidden ${
              isExpanded ? 'h-96' : 'h-80'
            }`}>
              <div className="absolute inset-0 p-4">
                {/* Simplified graph visualization */}
                <svg className="w-full h-full">
                  {/* Render connections */}
                  {filteredNodes.map(node => 
                    node.connections.map(connId => {
                      const connectedNode = filteredNodes.find(n => n.id === connId);
                      if (!connectedNode) return null;
                      
                      const strength = getConnectionStrength(node.id, connId);
                      const opacity = strength / 100;
                      
                      return (
                        <line
                          key={`${node.id}-${connId}`}
                          x1={`${(parseInt(node.id) * 73) % 80 + 10}%`}
                          y1={`${(parseInt(node.id) * 47) % 70 + 15}%`}
                          x2={`${(parseInt(connId) * 73) % 80 + 10}%`}
                          y2={`${(parseInt(connId) * 47) % 70 + 15}%`}
                          stroke="rgb(99, 102, 241)"
                          strokeWidth="1"
                          strokeOpacity={opacity}
                        />
                      );
                    })
                  )}
                  
                  {/* Render nodes */}
                  {filteredNodes.map(node => {
                    const config = typeConfig[node.type];
                    return (
                      <g key={node.id}>
                        <circle
                          cx={`${(parseInt(node.id) * 73) % 80 + 10}%`}
                          cy={`${(parseInt(node.id) * 47) % 70 + 15}%`}
                          r={node.importance >= 90 ? "8" : node.importance >= 80 ? "6" : "4"}
                          fill={config.color.replace('bg-', '').replace('-500', '')}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedNode(node)}
                        />
                        <text
                          x={`${(parseInt(node.id) * 73) % 80 + 10}%`}
                          y={`${(parseInt(node.id) * 47) % 70 + 25}%`}
                          textAnchor="middle"
                          className="text-xs fill-slate-300 cursor-pointer"
                          onClick={() => setSelectedNode(node)}
                        >
                          {node.title.length > 15 ? node.title.substring(0, 15) + '...' : node.title}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              
              {/* Graph Controls */}
              <div className="absolute top-4 right-4 flex space-x-2">
                <button className="p-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg transition-colors">
                  <RefreshCw className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Node Details Panel */}
          <div className="space-y-4">
            {selectedNode ? (
              <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  {React.createElement(typeConfig[selectedNode.type].icon, {
                    className: `h-4 w-4 ${typeConfig[selectedNode.type].textColor}`
                  })}
                  <h3 className="text-white font-medium">{selectedNode.title}</h3>
                </div>
                
                <p className="text-sm text-slate-300 mb-3">{selectedNode.content}</p>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-slate-400">Importance: </span>
                    <span className="text-xs text-white">{selectedNode.importance}%</span>
                  </div>
                  
                  <div>
                    <span className="text-xs text-slate-400">Connections: </span>
                    <span className="text-xs text-white">{selectedNode.connections.length}</span>
                  </div>
                  
                  <div>
                    <span className="text-xs text-slate-400">Last Modified: </span>
                    <span className="text-xs text-white">{selectedNode.lastModified}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedNode.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-slate-600/50 text-slate-300 text-xs rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex space-x-2 mt-4">
                  <button className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1 rounded text-sm transition-colors">
                    Open in Obsidian
                  </button>
                  <button className="flex-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-3 py-1 rounded text-sm transition-colors">
                    Generate Insights
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4 text-center">
                <Network className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Click on a node to view details</p>
              </div>
            )}

            {/* Graph Statistics */}
            <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Graph Statistics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Nodes:</span>
                  <span className="text-white">{nodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Connections:</span>
                  <span className="text-white">{nodes.reduce((acc, node) => acc + node.connections.length, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Avg. Importance:</span>
                  <span className="text-white">{Math.round(nodes.reduce((acc, node) => acc + node.importance, 0) / nodes.length)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">AI Insights:</span>
                  <span className="text-purple-400">{nodes.filter(n => n.type === 'insight').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraphVisualizer;