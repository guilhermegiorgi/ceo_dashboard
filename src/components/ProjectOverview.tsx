import React, { useState } from 'react';
import { 
  Briefcase, 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Plus,
  Trash2,
  X,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Search
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProjects } from '../hooks/useAPI';

interface Project {
  id: string;
  name: string;
  status: 'Planejamento' | 'Em Andamento' | 'Em Espera' | 'Concluído' | 'Cancelado';
  progress: number;
  team_size: number;
  budget: string;
  deadline: string;
  priority: 'alta' | 'média' | 'baixa';
  roi: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

const ProjectOverview: React.FC = () => {
  const { t } = useLanguage();
  const { data: projects, loading, refetch: refetchProjects } = useProjects();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const [newProject, setNewProject] = useState<Partial<Project>>({
    name: '',
    status: 'Planejamento',
    progress: 0,
    team_size: 1,
    budget: '',
    deadline: '',
    priority: 'média',
    roi: '+0%',
    description: ''
  });

  const statusConfig = {
    'Planejamento': { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    'Em Andamento': { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
    'Em Espera': { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
    'Concluído': { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
    'Cancelado': { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' }
  };

  const priorityColors = {
    alta: 'bg-red-500/20 border-red-500/30',
    média: 'bg-yellow-500/20 border-yellow-500/30',
    baixa: 'bg-green-500/20 border-green-500/30'
  };

  const filteredProjects = (projects || []).filter((project: Project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || project.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  }).sort((a: Project, b: Project) => a.name.localeCompare(b.name));

  // Mockup para createProject e updateProject - a lógica real virá do useAPI ou hook específico
  const createProject = async (projectData: Partial<Project>) => {
    console.log('Criando projeto:', projectData);
    // Simula uma chamada de API bem-sucedida
    return Promise.resolve();
  };

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.budget || !newProject.deadline) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      await createProject(newProject);
      setShowCreateForm(false);
      setNewProject({
        name: '',
        status: 'Planejamento',
        progress: 0,
        team_size: 1,
        budget: '',
        deadline: '',
        priority: 'média',
        roi: '+0%',
        description: ''
      });
      refetchProjects(); // Atualiza a lista de projetos
      alert('Projeto criado com sucesso!');
    } catch (error) {
      console.error('Falha ao criar projeto:', error);
      alert('Falha ao criar projeto. Tente novamente.');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm(`Tem certeza que deseja excluir o projeto ${projectId}?`)) {
      return;
    }

    try {
      // Em uma aplicação real, isso chamaria a API de exclusão
      console.log(`Simulando a exclusão do projeto com ID: ${projectId}`);
      alert('Projeto excluído com sucesso!');
      refetchProjects();
    } catch (error) {
      console.error('Falha ao excluir projeto:', error);
      alert('Falha ao excluir projeto. Tente novamente.');
    }
  };

  const getProjectStats = () => {
    if (!projects) return { total: 0, completed: 0, inProgress: 0, overdue: 0 };
    const total = projects.length;
    const completed = projects.filter((p: Project) => p.status === 'Concluído').length;
    const inProgress = projects.filter((p: Project) => p.status === 'Em Andamento').length;
    const overdue = projects.filter((p: Project) => {
      const deadline = new Date(p.deadline);
      return deadline < new Date() && p.status !== 'Concluído';
    }).length;

    return { total, completed, inProgress, overdue };
  };

  const stats = getProjectStats();

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Criar Novo Projeto</h2>
          <button 
            onClick={() => {
              setShowCreateForm(false);
              setNewProject({
                name: '',
                status: 'Planejamento',
                progress: 0,
                team_size: 1,
                budget: '',
                deadline: '',
                priority: 'média',
                roi: '+0%',
                description: ''
              });
            }}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Nome do Projeto *</label>
            <input
              type="text"
              value={newProject.name}
              onChange={(e) => setNewProject({...newProject, name: e.target.value})}
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
              placeholder="Digite o nome do projeto..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
              <select
                value={newProject.status}
                onChange={(e) => setNewProject({...newProject, status: e.target.value as any})}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
              >
                <option value="Planejamento">Planejamento</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Em Espera">Em Espera</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Prioridade</label>
              <select
                value={newProject.priority}
                onChange={(e) => setNewProject({...newProject, priority: e.target.value as any})}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
              >
                <option value="alta">Alta Prioridade</option>
                <option value="média">Média Prioridade</option>
                <option value="baixa">Baixa Prioridade</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Orçamento *</label>
              <input
                type="text"
                value={newProject.budget}
                onChange={(e) => setNewProject({...newProject, budget: e.target.value})}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                placeholder="ex: R$ 150K"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tamanho da Equipe</label>
              <input
                type="number"
                value={newProject.team_size}
                onChange={(e) => setNewProject({...newProject, team_size: parseInt(e.target.value)})}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                min="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Prazo *</label>
              <input
                type="date"
                value={newProject.deadline}
                onChange={(e) => setNewProject({...newProject, deadline: e.target.value})}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">ROI Esperado</label>
              <input
                type="text"
                value={newProject.roi}
                onChange={(e) => setNewProject({...newProject, roi: e.target.value})}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                placeholder="ex: +35%"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Progresso: {newProject.progress}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={newProject.progress}
              onChange={(e) => setNewProject({...newProject, progress: parseInt(e.target.value)})}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Descrição</label>
            <textarea
              value={newProject.description}
              onChange={(e) => setNewProject({...newProject, description: e.target.value})}
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white h-20 focus:outline-none focus:ring-2 focus:ring-green-500/50"
              placeholder="Descrição do projeto..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleCreateProject}
              className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
            >
              Criar Projeto
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewProject({
                  name: '',
                  status: 'Planejamento',
                  progress: 0,
                  team_size: 1,
                  budget: '',
                  deadline: '',
                  priority: 'média',
                  roi: '+0%',
                  description: ''
                });
              }}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
            >
              Cancelar
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
          <div className="p-2 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t('projects.title')}</h2>
            <p className="text-sm text-slate-400">{t('projects.subtitle')}</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Projeto</span>
        </button>
      </div>

      {/* Project Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-slate-400">Total</span>
          </div>
          <div className="text-xl font-bold text-blue-400">{stats.total}</div>
        </div>

        <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-sm text-slate-400">Concluídos</span>
          </div>
          <div className="text-xl font-bold text-green-400">{stats.completed}</div>
        </div>

        <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Clock className="h-4 w-4 text-yellow-400" />
            <span className="text-sm text-slate-400">Em Andamento</span>
          </div>
          <div className="text-xl font-bold text-yellow-400">{stats.inProgress}</div>
        </div>

        <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-sm text-slate-400">Atrasados</span>
          </div>
          <div className="text-xl font-bold text-red-400">{stats.overdue}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar projetos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50"
          />
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
        >
          <option value="all">Todos os Status</option>
          <option value="Planejamento">Planejamento</option>
          <option value="Em Andamento">Em Andamento</option>
          <option value="Em Espera">Em Espera</option>
          <option value="Concluído">Concluído</option>
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
        >
          <option value="all">Todas as Prioridades</option>
          <option value="alta">Alta</option>
          <option value="média">Média</option>
          <option value="baixa">Baixa</option>
        </select>
      </div>
      
      {/* Projects List */}
      <div className="space-y-4">
        {filteredProjects.map((project: Project) => {
          const statusConf = statusConfig[project.status as keyof typeof statusConfig];
          const isOverdue = new Date(project.deadline) < new Date() && project.status !== 'Concluído';
          
          return (
            <div key={project.id} className={`border border-slate-600/50 rounded-lg p-4 hover:bg-slate-700/30 transition-all duration-200 ${priorityColors[project.priority as keyof typeof priorityColors]}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                    <div className="flex space-x-1">
                      {/* A funcionalidade de edição será reativada no futuro */}
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  
                  {project.description && (
                    <p className="text-sm text-slate-300 mb-2">{project.description}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 mt-2">
                    <span className={`px-2 py-1 text-xs rounded-full border ${statusConf.bg} ${statusConf.border} ${statusConf.color}`}>
                      {project.status}
                    </span>
                    
                    <div className="flex items-center space-x-1 text-slate-400">
                      <Users className="h-3 w-3" />
                      <span className="text-xs">{project.team_size} membros</span>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-slate-400">
                      <Calendar className="h-3 w-3" />
                      <span className={`text-xs ${isOverdue ? 'text-red-400' : ''}`}>
                        {project.deadline}
                        {isOverdue && ' (Atrasado)'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center space-x-1 text-green-400 mb-1">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">ROI {project.roi}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-slate-400">
                    <DollarSign className="h-3 w-3" />
                    <span className="text-sm">{project.budget}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Progresso</span>
                  <span className="text-sm text-white font-medium">{project.progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-teal-500 transition-all duration-1000"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-8">
          <Briefcase className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Nenhum projeto encontrado com os critérios especificados</p>
        </div>
      )}
    </div>
  );
};

export default ProjectOverview;