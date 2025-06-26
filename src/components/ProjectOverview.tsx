import React from 'react';
import { Briefcase, Users, Calendar, DollarSign, Target, TrendingUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const ProjectOverview: React.FC = () => {
  const { t } = useLanguage();

  const projects = [
    {
      id: 1,
      name: 'AI Product Launch',
      status: 'In Progress',
      progress: 75,
      team: 8,
      budget: '$150K',
      deadline: '2024-02-15',
      priority: 'high',
      roi: '+35%'
    },
    {
      id: 2,
      name: 'Market Expansion',
      status: 'Planning',
      progress: 25,
      team: 5,
      budget: '$80K',
      deadline: '2024-03-01',
      priority: 'medium',
      roi: '+20%'
    },
    {
      id: 3,
      name: 'Infrastructure Upgrade',
      status: 'In Progress',
      progress: 60,
      team: 12,
      budget: '$200K',
      deadline: '2024-01-30',
      priority: 'high',
      roi: '+15%'
    }
  ];

  const statusColors = {
    'In Progress': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    'Planning': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    'Completed': 'bg-green-500/10 text-green-400 border-green-500/30'
  };

  const priorityColors = {
    high: 'bg-red-500/20',
    medium: 'bg-yellow-500/20',
    low: 'bg-green-500/20'
  };

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
      </div>
      
      <div className="space-y-4">
        {projects.map((project) => (
          <div key={project.id} className={`border border-slate-600/50 rounded-lg p-4 hover:bg-slate-700/30 transition-all duration-200 ${priorityColors[project.priority as keyof typeof priorityColors]}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                <div className="flex items-center space-x-4 mt-2">
                  <span className={`px-2 py-1 text-xs rounded-full border ${statusColors[project.status as keyof typeof statusColors]}`}>
                    {project.status}
                  </span>
                  <div className="flex items-center space-x-1 text-slate-400">
                    <Users className="h-3 w-3" />
                    <span className="text-xs">{project.team} {t('projects.members')}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-slate-400">
                    <Calendar className="h-3 w-3" />
                    <span className="text-xs">{project.deadline}</span>
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
                <span className="text-sm text-slate-400">{t('projects.progress')}</span>
                <span className="text-sm text-white font-medium">{project.progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-1000"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectOverview;