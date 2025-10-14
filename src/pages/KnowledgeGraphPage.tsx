import React, { useState, useEffect } from "react";
import {
  Network,
  Search,
  Filter,
  Download,
  Share,
  RefreshCw,
  FileText,
  Settings as SettingsIcon,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import apiClient from "../services/apiClient";

interface KnowledgeNode {
  id: string;
  title: string;
  type: "note" | "project" | "insight" | "decision" | "person" | "concept";
  content: string;
  connections: string[];
  tags: string[];
  lastModified: string;
  importance: number;
}

interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    filepath?: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type?: string;
  }>;
}

const KnowledgeGraphPage: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadGraphData();
  }, []);

  const loadGraphData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getGraphData();
      setGraphData(response);
    } catch (error) {
      console.error("Failed to load graph data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeGraph = async () => {
    setIsAnalyzing(true);
    try {
      await apiClient.analyzeKnowledgeGraph();
      await loadGraphData();
    } catch (error) {
      console.error("Failed to analyze graph:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportGraph = () => {
    const exportData = {
      nodes: graphData?.nodes || [],
      edges: graphData?.edges || [],
      metadata: {
        exportDate: new Date().toISOString(),
        totalNodes: graphData?.nodes.length || 0,
        totalEdges: graphData?.edges.length || 0,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `knowledge-graph-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareGraph = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Knowledge Graph",
          text: `Grafo de conhecimento com ${graphData?.nodes.length || 0} nós`,
          url: window.location.href,
        });
      } catch {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copiado!");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-800 border-t-emerald-500" />
          <p className="text-sm text-zinc-400">
            Carregando grafo de conhecimento...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full flex-col transition-all ${
        isExpanded ? "fixed inset-0 z-50 bg-neutral-950" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/95 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-700 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20">
            <Network className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Knowledge Graph</h1>
            <p className="text-sm text-zinc-500">
              Exploração interativa do seu Segundo Cérebro
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportGraph}
            className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-zinc-300 transition hover:border-neutral-600 hover:text-zinc-100"
          >
            <Download className="h-4 w-4" />
            <span>Exportar</span>
          </button>

          <button
            onClick={handleShareGraph}
            className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-zinc-300 transition hover:border-neutral-600 hover:text-zinc-100"
          >
            <Share className="h-4 w-4" />
            <span>Compartilhar</span>
          </button>

          <button
            onClick={handleAnalyzeGraph}
            disabled={isAnalyzing}
            className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300 transition hover:border-purple-500/50 hover:bg-purple-500/20 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isAnalyzing ? "animate-spin" : ""}`}
            />
            <span>{isAnalyzing ? "Analisando..." : "Análise IA"}</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-zinc-400 transition hover:border-neutral-600 hover:text-zinc-100"
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>

          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-zinc-400 transition hover:border-neutral-600 hover:text-zinc-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 gap-6 overflow-hidden p-6">
        {/* Graph Visualization */}
        <div className="flex flex-1 flex-col gap-4">
          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar no grafo de conhecimento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-neutral-600 focus:outline-none"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-xl border border-neutral-800 bg-neutral-900 py-2 pl-10 pr-8 text-sm text-zinc-100 focus:border-neutral-600 focus:outline-none"
              >
                <option value="all">Todos os tipos</option>
                <option value="note">Notas</option>
                <option value="project">Projetos</option>
                <option value="insight">Insights</option>
                <option value="decision">Decisões</option>
                <option value="concept">Conceitos</option>
              </select>
            </div>
          </div>

          {/* Graph Canvas */}
          <div className="relative flex-1 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="h-full w-full">
                {/* Render edges */}
                {graphData?.edges.map((edge, idx) => {
                  const sourceNode = graphData.nodes.find(
                    (n) => n.id === edge.source
                  );
                  const targetNode = graphData.nodes.find(
                    (n) => n.id === edge.target
                  );
                  if (!sourceNode || !targetNode) return null;

                  const sourceX = ((parseInt(sourceNode.id) * 73) % 80) + 10;
                  const sourceY = ((parseInt(sourceNode.id) * 47) % 70) + 15;
                  const targetX = ((parseInt(targetNode.id) * 73) % 80) + 10;
                  const targetY = ((parseInt(targetNode.id) * 47) % 70) + 15;

                  return (
                    <line
                      key={`edge-${idx}`}
                      x1={`${sourceX}%`}
                      y1={`${sourceY}%`}
                      x2={`${targetX}%`}
                      y2={`${targetY}%`}
                      stroke="rgb(52, 211, 153)"
                      strokeWidth="1"
                      strokeOpacity="0.3"
                      className={isAnimating ? "animate-pulse" : ""}
                    />
                  );
                })}

                {/* Render nodes */}
                {graphData?.nodes.map((node) => {
                  const x = ((parseInt(node.id) * 73) % 80) + 10;
                  const y = ((parseInt(node.id) * 47) % 70) + 15;

                  return (
                    <g key={node.id}>
                      <circle
                        cx={`${x}%`}
                        cy={`${y}%`}
                        r="6"
                        fill="rgb(52, 211, 153)"
                        className="cursor-pointer transition-opacity hover:opacity-80"
                        onClick={() =>
                          setSelectedNode({
                            id: node.id,
                            title: node.label,
                            type: "note",
                            content: "",
                            connections: [],
                            tags: [],
                            lastModified: "",
                            importance: 0,
                          })
                        }
                      />
                      <text
                        x={`${x}%`}
                        y={`${y + 10}%`}
                        textAnchor="middle"
                        className="cursor-pointer fill-zinc-300 text-xs"
                        onClick={() =>
                          setSelectedNode({
                            id: node.id,
                            title: node.label,
                            type: "note",
                            content: "",
                            connections: [],
                            tags: [],
                            lastModified: "",
                            importance: 0,
                          })
                        }
                      >
                        {node.label.length > 15
                          ? node.label.substring(0, 15) + "..."
                          : node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Graph Controls */}
            <div className="absolute right-4 top-4 flex gap-2">
              <button
                onClick={() => setIsAnimating(!isAnimating)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/80 backdrop-blur transition hover:border-neutral-600"
                title={isAnimating ? "Pausar animação" : "Reproduzir animação"}
              >
                {isAnimating ? (
                  <Pause className="h-4 w-4 text-zinc-400" />
                ) : (
                  <Play className="h-4 w-4 text-zinc-400" />
                )}
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/80 backdrop-blur transition hover:border-neutral-600"
              >
                <SettingsIcon className="h-4 w-4 text-zinc-400" />
              </button>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="absolute right-4 top-16 w-64 space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/95 p-4 backdrop-blur">
                <h4 className="font-medium text-zinc-100">
                  Configurações do Grafo
                </h4>

                <div>
                  <label className="mb-1 block text-xs text-zinc-400">
                    Modo de visualização
                  </label>
                  <select className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1 text-sm text-zinc-100">
                    <option value="network">Rede</option>
                    <option value="hierarchy">Hierarquia</option>
                    <option value="timeline">Linha do tempo</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300">Mostrar labels</span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="peer sr-only"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-neutral-700 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-focus:outline-none"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300">
                    Simulação física
                  </span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="peer sr-only"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-neutral-700 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-focus:outline-none"></div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex w-80 flex-col gap-4">
          {/* Node Details */}
          <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            {selectedNode ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                    <FileText className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-zinc-100">
                      {selectedNode.title}
                    </h3>
                    <p className="text-xs text-zinc-500">{selectedNode.type}</p>
                  </div>
                </div>

                <p className="text-sm text-zinc-300">{selectedNode.content}</p>

                <div className="space-y-2 border-t border-neutral-800 pt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Importância:</span>
                    <span className="text-zinc-100">
                      {selectedNode.importance}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Conexões:</span>
                    <span className="text-zinc-100">
                      {selectedNode.connections?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Última modificação:</span>
                    <span className="text-zinc-100">
                      {selectedNode.lastModified}
                    </span>
                  </div>
                </div>

                {selectedNode.tags && selectedNode.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 border-t border-neutral-800 pt-3">
                    {selectedNode.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-zinc-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 border-t border-neutral-800 pt-3">
                  <button className="flex-1 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-300 transition hover:border-blue-500/50 hover:bg-blue-500/20">
                    Abrir no Obsidian
                  </button>
                  <button className="flex-1 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs text-purple-300 transition hover:border-purple-500/50 hover:bg-purple-500/20">
                    Gerar Insights
                  </button>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Network className="mb-3 h-12 w-12 text-zinc-700" />
                <p className="text-sm text-zinc-500">
                  Clique em um nó para ver detalhes
                </p>
              </div>
            )}
          </div>

          {/* Graph Stats */}
          <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <h4 className="font-medium text-zinc-100">Estatísticas do Grafo</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Total de nós:</span>
                <span className="text-zinc-100">
                  {graphData?.nodes.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Total de conexões:</span>
                <span className="text-zinc-100">
                  {graphData?.edges.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Densidade:</span>
                <span className="text-zinc-100">
                  {graphData && graphData.nodes.length > 0
                    ? (
                        (graphData.edges.length /
                          (graphData.nodes.length *
                            (graphData.nodes.length - 1))) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraphPage;
