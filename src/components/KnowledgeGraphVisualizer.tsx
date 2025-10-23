import React, { useState } from 'react';
import {
  Network,
  Search,
  Filter,
  Maximize2,
  Minimize2,
  RefreshCw,
  Zap,
  FileText,
  Tag,
  TrendingUp,
  Settings,
  Download,
  Share,
  Play,
  Pause
} from 'lucide-react';
import { useKnowledgeGraph } from '../hooks/useKnowledgeGraph';

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

type ViewMode = 'network' | 'hierarchy' | 'timeline';

const KnowledgeGraphVisualizer: React.FC = () => {
  const { nodes, loading, analyzeGraph } = useKnowledgeGraph();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('network');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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
    const matchesTags = selectedTags.length === 0 || selectedTags.some(tag => node.tags.includes(tag));
    return matchesSearch && matchesFilter && matchesTags;
  });

  const handleAnalyzeGraph = async () => {
    setIsAnalyzing(true);
    try {
      await analyzeGraph();
      alert('Knowledge graph analysis completed! New insights have been generated.');
    } catch (error) {
      console.error('Failed to analyze graph:', error);
      alert('Failed to analyze knowledge graph. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportGraph = () => {
    const exportData = {
      nodes: filteredNodes,
      metadata: {
        exportDate: new Date().toISOString(),
        totalNodes: nodes.length,
        filteredNodes: filteredNodes.length,
        filters: { type: filterType, search: searchQuery, tags: selectedTags }
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knowledge-graph-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareGraph = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Knowledge Graph Analysis',
          text: `Knowledge graph with ${filteredNodes.length} nodes`,
          url: window.location.href
        });
      } catch {
        console.log('Share cancelled');
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const getAllTags = () => {
    const allTags = new Set<string>();
    nodes.forEach(node => {
      node.tags.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  };

  const renderNetworkView = () => (
    <div className={`bg-slate-900/50 border border-slate-700/50 rounded-lg relative overflow-hidden ${
      isExpanded ? 'h-96' : 'h-80'
    }`}>
      <div className="absolute inset-0 p-4">
        <svg className="w-full h-full">
          {/* Render connections */}
          {filteredNodes.map(node => 
            node.connections.map(connId => {
              const connectedNode = filteredNodes.find(n => n.id === connId);
              if (!connectedNode) return null;
              
              const strength = Math.min(
                node.tags.filter(tag => connectedNode.tags.includes(tag)).length * 20 + 10, 
                100
              );
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
                  className={isAnimating ? 'animate-pulse' : ''}
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
        <button
          onClick={() => setIsAnimating(!isAnimating)}
          className="p-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg transition-colors"
          title={isAnimating ? 'Pause Animation' : 'Play Animation'}
        >
          {isAnimating ? <Pause className="h-4 w-4 text-slate-400" /> : <Play className="h-4 w-4 text-slate-400" />}
        </button>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg transition-colors"
        >
          <Settings className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 bg-slate-800 border border-slate-700 rounded-lg p-4 w-64 z-10">
          <h4 className="text-white font-medium mb-3">Graph Settings</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1">View Mode</label>
              <select
                value={viewMode}
                onChange={(event) => {
                  const value = event.target.value as ViewMode;
                  if (value === 'network' || value === 'hierarchy' || value === 'timeline') {
                    setViewMode(value);
                  }
                }}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
              >
                <option value="network">Network</option>
                <option value="hierarchy">Hierarchy</option>
                <option value="timeline">Timeline</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Show Labels</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Physics Simulation</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderNodeDetails = () => {
    if (!selectedNode) {
      return (
        <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4 text-center">
          <Network className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Click on a node to view details</p>
        </div>
      );
    }

    const config = typeConfig[selectedNode.type];
    const Icon = config.icon;

    return (
      <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Icon className={`h-4 w-4 ${config.textColor}`} />
          <h3 className="text-white font-medium">{selectedNode.title}</h3>
        </div>
        
        <p className="text-sm text-slate-300 mb-3">{selectedNode.content}</p>
        
        <div className="space-y-2">
          <div>
            <span className="text-xs text-slate-400">Type: </span>
            <span className={`text-xs ${config.textColor}`}>{selectedNode.type}</span>
          </div>
          
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
    );
  };

  const renderGraphStats = () => (
    <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
      <h4 className="text-white font-medium mb-3">Graph Statistics</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Total Nodes:</span>
          <span className="text-white">{nodes.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Filtered:</span>
          <span className="text-white">{filteredNodes.length}</span>
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
  );

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        </div>
      </div>
    );
  }

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
            onClick={handleExportGraph}
            className="flex items-center space-x-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          
          <button
            onClick={handleShareGraph}
            className="flex items-center space-x-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <Share className="h-4 w-4" />
            <span>Share</span>
          </button>
          
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

        {/* Tag Filter */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Tag className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-300">Filter by tags:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {getAllTags().slice(0, 10).map(tag => (
              <button
                key={tag}
                onClick={() => {
                  if (selectedTags.includes(tag)) {
                    setSelectedTags(selectedTags.filter(t => t !== tag));
                  } else {
                    setSelectedTags([...selectedTags, tag]);
                  }
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graph Visualization Area */}
          <div className="lg:col-span-2">
            {renderNetworkView()}
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {renderNodeDetails()}
            {renderGraphStats()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraphVisualizer;
