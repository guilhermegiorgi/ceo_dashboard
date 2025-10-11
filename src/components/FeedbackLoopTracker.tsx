import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Clock,
  BrainCircuit,
  RotateCcw,
  AlertTriangle,
  FileText,
  Target,
  Zap
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import apiClient, { FeedbackAction } from '../services/apiClient';

const FeedbackLoopTracker: React.FC = () => {
  const { t } = useLanguage();
  const [feedbackActions, setFeedbackActions] = useState<FeedbackAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeedbackActions = async () => {
      try {
        setLoading(true);
        const actions = await apiClient.getFeedbackActions();
        setFeedbackActions(actions);
        setError(null);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchFeedbackActions();
  }, []);

  const handleCreateFeedbackAction = async (type: string, title: string, description: string) => {
    try {
      await apiClient.createFeedbackAction({
        type,
        title,
        description,
        impact: 'Ação criada automaticamente pelo sistema'
      });

      // Recarregar ações após criar
      const actions = await apiClient.getFeedbackActions();
      setFeedbackActions(actions);
      setError(null);
    } catch (error) {
      console.error('Erro ao criar feedback action:', error);
      setError('Erro ao criar ação de feedback');
    }
  };

  const handleUpdateActionStatus = async (actionId: string, newStatus: string) => {
    try {
      await apiClient.updateFeedbackActionStatus(actionId, newStatus);

      // Recarregar ações após atualizar
      const actions = await apiClient.getFeedbackActions();
      setFeedbackActions(actions);
      setError(null);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setError('Erro ao atualizar status da ação');
    }
  };

  const statusConfig: { [key in FeedbackAction['status']]: { color: string, bg: string, icon: React.ElementType } } = {
    pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Clock },
    processing: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: RotateCcw },
    completed: { color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle },
    failed: { color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertTriangle },
  };

  const typeConfig: { [key in FeedbackAction['type']]: { labelKey: string, icon: React.ElementType } } = {
    decision: { labelKey: 'feedbackLoop.types.decision', icon: Target },
    insight_validation: { labelKey: 'feedbackLoop.types.insight_validation', icon: CheckCircle },
    action_taken: { labelKey: 'feedbackLoop.types.action_taken', icon: Zap },
    learning_captured: { labelKey: 'feedbackLoop.types.learning_captured', icon: BrainCircuit },
  };

  const handleViewNote = (noteTitle: string) => {
    window.open(`obsidian://open?file=${encodeURIComponent(noteTitle)}`);
  };

  const handleViewProject = (projectName: string) => {
    console.log('Navigating to project:', projectName);
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-center p-6">
          <RotateCcw className="h-8 w-8 animate-spin text-slate-400" />
          <p className="ml-3 text-slate-400">{t('feedbackLoop.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <div className="p-6 text-center text-red-400 flex flex-col items-center">
          <AlertTriangle className="h-8 w-8 mb-2"/>
          <p>{t('feedbackLoop.error')}: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">{t('feedbackLoop.title')}</h2>
        <span className="text-sm text-slate-400">{t('feedbackLoop.subtitle')}</span>
      </div>
      <div className="space-y-4">
        {feedbackActions.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            <p>{t('feedbackLoop.noActions')}</p>
          </div>
        ) : (
          feedbackActions.map((action) => {
            const statusConf = statusConfig[action.status] || statusConfig.pending;
            const typeConf = typeConfig[action.type] || typeConfig.learning_captured;
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
                          <TypeIcon className={`h-3 w-3 ${statusConf.color}`} />
                          <span className={`text-xs ${statusConf.color}`}>{t(typeConf.labelKey)}</span>
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
                        <div className="text-xs text-slate-400">{t('feedbackLoop.note')}</div>
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
                        <div className="text-xs text-slate-400">{t('feedbackLoop.project')}</div>
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
                        <div className="text-xs text-slate-400">{t('feedbackLoop.impact')}</div>
                        <div className="text-sm text-slate-300">{action.impact}</div>
                      </div>
                    </div>
                  )}
                </div>

                {action.status === 'processing' && (
                  <div className="mt-4 pt-3 border-t border-slate-700/50">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-blue-400">{t('feedbackLoop.processing')}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FeedbackLoopTracker;
