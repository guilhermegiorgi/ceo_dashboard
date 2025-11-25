'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Loader2, Calendar, CheckCircle } from 'lucide-react';
import apiClient from '../services/apiClient';

interface CriticalTask {
  id: string;
  title: string;
  dueDate: string;
  isOverdue: boolean;
}

const CriticalTasksWidget: React.FC = () => {
  const [tasks, setTasks] = useState<CriticalTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCriticalTasks();
  }, []);

  const fetchCriticalTasks = async () => {
    setLoading(true);
    try {
      // Chama o novo endpoint de backend
      const response = await apiClient.getCriticalTasks();
      
      // O endpoint retorna um array de objetos com { path, title, dueDate, isOverdue }
      const criticalTasks: CriticalTask[] = (response.data || []).map((task: any) => ({
        id: task.path,
        title: task.title,
        dueDate: task.dueDate,
        isOverdue: task.isOverdue,
      }));

      setTasks(criticalTasks);
    } catch (error) {
      console.error('Erro ao buscar tarefas críticas:', error);
      // toast.error('Não foi possível carregar as tarefas críticas.');
    } finally {
      setLoading(false);
    }
  };

  const getDueDateLabel = (dueDate: string, isOverdue: boolean) => {
    const date = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (isOverdue) {
      return <span className="text-red-400">Vencida em {taskDate.toLocaleDateString('pt-BR')}</span>;
    }
    
    if (taskDate.getTime() === today.getTime()) {
      return <span className="text-amber-400">Vence Hoje</span>;
    }

    const diffTime = Math.abs(taskDate.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 3) {
      return <span className="text-yellow-400">Vence em {diffDays} dias ({taskDate.toLocaleDateString('pt-BR')})</span>;
    }

    return <span className="text-zinc-400">Vence em {taskDate.toLocaleDateString('pt-BR')}</span>;
  };

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Tarefas Críticas
        </h3>
        <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-300">
          {tasks.length} {tasks.length === 1 ? 'Item' : 'Itens'}
        </span>
      </div>

      <p className="mt-1 text-sm text-zinc-400">
        Foco imediato: tarefas vencidas ou com prazo nos próximos 3 dias.
      </p>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            <span className="ml-2 text-sm text-zinc-500">Carregando...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <CheckCircle className="h-6 w-6 text-emerald-500/50" />
            <p className="mt-2 text-sm text-zinc-500">Nenhuma tarefa crítica pendente. Bom trabalho!</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-start gap-3 rounded-lg p-3 transition duration-150 ${
                task.isOverdue ? 'bg-red-900/20 hover:bg-red-900/30 border border-red-800/50' : 'bg-neutral-800/50 hover:bg-neutral-800/70'
              }`}
            >
              <Clock className={`h-4 w-4 mt-1 ${task.isOverdue ? 'text-red-400' : 'text-yellow-400'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-100">{task.title}</p>
                <div className="flex items-center gap-1 text-xs mt-0.5">
                  <Calendar className="h-3 w-3 text-zinc-500" />
                  {getDueDateLabel(task.dueDate, task.isOverdue)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CriticalTasksWidget;
