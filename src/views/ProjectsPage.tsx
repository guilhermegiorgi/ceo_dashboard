'use client';

import React, { useState, useEffect } from "react";
import {
  FolderKanban,
  Plus,
  Search,
  Brain,
  Tag,
  FileText,
  Calendar,
  Users,
  DollarSign,
  BarChart3,
  Trash2,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import apiClient from "../services/apiClient";

interface Project {
  id: string;
  name: string;
  description?: string;
  status?: string;
  progress?: number;
  team_size?: number;
  budget?: string;
  deadline?: string;
  priority?: string;
  roi?: string;
  brain_directories?: string[];
  brain_tags?: string[];
  brain_context_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface BrainContext {
  directories: string[];
  recentNotes: number;
  activeTags: string[];
  contextEnabled: boolean;
}

type GraphNode = {
  id?: string;
  tags?: string[];
};

const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [brainContext, setBrainContext] = useState<BrainContext>({
    directories: [],
    recentNotes: 0,
    activeTags: [],
    contextEnabled: false,
  });

  // Form state for modal
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "Planning",
    progress: 0,
    team_size: 1,
    budget: "",
    deadline: "",
    priority: "medium",
    roi: "+0%",
    brain_directories: [] as string[],
    brain_tags: [] as string[],
    brain_context_enabled: true,
  });

  useEffect(() => {
    loadProjects();
    loadBrainContext();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getProjects();
      setProjects(data || []);
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBrainContext = async () => {
    try {
      // Obter estrutura do vault para projetos
      const response = await apiClient.getGraphData("5 - INSIGHTS-IA", false, true);
      const graphData = response.graph as { nodes?: GraphNode[] } | undefined;
      const nodesList = Array.isArray(graphData?.nodes) ? graphData!.nodes : [];

      // Extrair diretórios relevantes
      const directories: string[] = [];
      const tags: string[] = [];

      nodesList.forEach((node) => {
        if (node.id) {
          const pathParts = node.id.split('/');
          if (pathParts.length > 1) {
            const dir = pathParts[0] + '/' + pathParts[1];
            if (!directories.includes(dir)) {
              directories.push(dir);
            }
          }

          if (Array.isArray(node.tags)) {
            node.tags.forEach((tag) => {
              const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
              if (!tags.includes(cleanTag)) {
                tags.push(cleanTag);
              }
            });
          }
        }
      });

      setBrainContext({
        directories: directories.slice(0, 10), // Limit to 10 directories
        recentNotes: nodesList.length,
        activeTags: tags.slice(0, 15), // Limit to 15 tags
        contextEnabled: true,
      });
    } catch (error) {
      console.error("Error loading Brain Cloud context:", error);
      setBrainContext({
        directories: [],
        recentNotes: 0,
        activeTags: [],
        contextEnabled: false,
      });
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingProject) {
        await apiClient.updateProject(editingProject.id, formData);
      } else {
        await apiClient.createProject(formData);
      }
      
      await loadProjects();
      setShowModal(false);
      setEditingProject(null);
      resetForm();
    } catch (error) {
      console.error("Error saving project:", error);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
      status: project.status || "Planning",
      progress: project.progress || 0,
      team_size: project.team_size || 1,
      budget: project.budget || "",
      deadline: project.deadline || "",
      priority: project.priority || "medium",
      roi: project.roi || "+0%",
      brain_directories: project.brain_directories || [],
      brain_tags: project.brain_tags || [],
      brain_context_enabled: project.brain_context_enabled !== false,
    });
    setShowModal(true);
  };

  const handleDelete = async (projectId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este projeto?")) {
      try {
        await apiClient.deleteProject(projectId);
        await loadProjects();
      } catch (error) {
        console.error("Error deleting project:", error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      status: "Planning",
      progress: 0,
      team_size: 1,
      budget: "",
      deadline: "",
      priority: "medium",
      roi: "+0%",
      brain_directories: [],
      brain_tags: [],
      brain_context_enabled: true,
    });
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'in progress':
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'planning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-zinc-500" />;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
      case 'medium':
        return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'low':
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      default:
        return 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10';
    }
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/95 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <FolderKanban className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100">Projetos</h1>
              <p className="text-sm text-zinc-500">
                Gerencie seus projetos com contexto do Brain Cloud
              </p>
            </div>
          </div>
          
          <button
            onClick={() => {
              setEditingProject(null);
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 transition hover:border-blue-500/50 hover:bg-blue-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Projeto</span>
          </button>
        </div>

        {/* Brain Cloud Context Status */}
        <div className="mt-4 flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-zinc-300">Brain Cloud Conectado</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-500">
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>{brainContext.recentNotes} notas</span>
            </div>
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              <span>{brainContext.activeTags.length} tags</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar projetos..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FolderKanban className="h-12 w-12 text-zinc-700 mb-4" />
            <p className="text-lg font-medium text-zinc-400">Nenhum projeto encontrado</p>
            <p className="text-sm text-zinc-600 mt-2">
              {searchTerm ? "Tente uma busca diferente" : "Crie seu primeiro projeto"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-zinc-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-zinc-400 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {getStatusIcon(project.status)}
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-zinc-500 mb-1">
                    <span>Progresso</span>
                    <span>{project.progress || 0}%</span>
                  </div>
                  <div className="w-full rounded-full bg-zinc-800 h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${project.progress || 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Brain Integration */}
                {project.brain_context_enabled && (
                  <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-3 w-3 text-emerald-400" />
                      <span className="text-xs font-medium text-emerald-300">Contexto Brain Cloud</span>
                    </div>
                    
                    {project.brain_directories && project.brain_directories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {project.brain_directories.slice(0, 3).map((dir, idx) => (
                          <span
                            key={idx}
                            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300"
                          >
                            {dir}
                          </span>
                        ))}
                        {project.brain_directories.length > 3 && (
                          <span className="text-xs text-zinc-500">+{project.brain_directories.length - 3}</span>
                        )}
                      </div>
                    )}
                    
                    {project.brain_tags && project.brain_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {project.brain_tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300"
                          >
                            {tag}
                          </span>
                        ))}
                        {project.brain_tags.length > 3 && (
                          <span className="text-xs text-zinc-500">+{project.brain_tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata */}
                <div className="space-y-2 text-xs text-zinc-500">
                  {project.deadline && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>Prazo: {new Date(project.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {project.team_size && (
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      <span>Equipe: {project.team_size} pessoas</span>
                    </div>
                  )}
                  
                  {project.budget && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3 w-3" />
                      <span>Orçamento: {project.budget}</span>
                    </div>
                  )}
                  
                  {project.roi && (
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-3 w-3" />
                      <span>ROI: {project.roi}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                  <span className={`rounded-full border px-2 py-1 text-xs font-medium ${getPriorityColor(project.priority)}`}>
                    {project.priority || 'Medium'}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(project)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 transition hover:border-rose-500 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-100">
                {editingProject ? 'Editar Projeto' : 'Novo Projeto'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingProject(null);
                  resetForm();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Nome do Projeto *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Planning">Planejamento</option>
                    <option value="in progress">Em Progresso</option>
                    <option value="completed">Concluído</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Progresso (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Tamanho da Equipe
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.team_size}
                    onChange={(e) => setFormData({ ...formData, team_size: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Orçamento
                  </label>
                  <input
                    type="text"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Prazo
                  </label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    ROI
                  </label>
                  <input
                    type="text"
                    value={formData.roi}
                    onChange={(e) => setFormData({ ...formData, roi: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Brain Cloud Integration */}
              <div className="border-t border-zinc-800 pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="h-4 w-4 text-emerald-400" />
                  <label className="text-sm font-medium text-zinc-300">
                    Integração com Brain Cloud
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.brain_context_enabled}
                      onChange={(e) => setFormData({ ...formData, brain_context_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {formData.brain_context_enabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">
                        Diretórios do Brain Cloud
                      </label>
                      <select
                        multiple
                        value={formData.brain_directories}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value);
                          setFormData({ ...formData, brain_directories: selected });
                        }}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                      >
                        {brainContext.directories.map((dir) => (
                          <option key={dir} value={dir}>
                            {dir}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-zinc-500 mt-1">
                        Segure Ctrl/Cmd para múltipla seleção
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">
                        Tags do Brain Cloud
                      </label>
                      <select
                        multiple
                        value={formData.brain_tags}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value);
                          setFormData({ ...formData, brain_tags: selected });
                        }}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                      >
                        {brainContext.activeTags.map((tag) => (
                          <option key={tag} value={tag}>
                            {tag}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-zinc-500 mt-1">
                        Segure Ctrl/Cmd para múltipla seleção
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:border-emerald-500/50 hover:bg-emerald-500/20"
                >
                  {editingProject ? 'Atualizar' : 'Criar'} Projeto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProject(null);
                    resetForm();
                  }}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-100"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
