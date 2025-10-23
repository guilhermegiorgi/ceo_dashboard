"use client";

import React from "react";
import { ChevronRight } from "lucide-react";

interface ProjectCardProps {
  project: {
    id: string;
    title: string;
    status: string;
    progress: number;
    dueDate?: string;
  };
  onClick?: (id: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(project.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "ativo":
        return "bg-emerald-500";
      case "pending":
      case "pendente":
        return "bg-amber-500";
      case "completed":
      case "concluído":
        return "bg-sky-500";
      case "on_hold":
      case "em pausa":
        return "bg-rose-500";
      default:
        return "bg-zinc-500";
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return "bg-emerald-500";
    if (progress >= 50) return "bg-amber-500";
    if (progress >= 25) return "bg-orange-500";
    return "bg-rose-500";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const formattedDate = date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    
    if (diffDays < 0) {
      return { date: formattedDate, label: "Vencido", color: "text-rose-300" };
    } else if (diffDays === 0) {
      return { date: formattedDate, label: "Hoje", color: "text-amber-300" };
    } else if (diffDays <= 3) {
      return { date: formattedDate, label: `Em ${diffDays} dias`, color: "text-orange-300" };
    } else {
      return { date: formattedDate, label: null, color: "text-zinc-300" };
    }
  };

  const dateInfo = formatDate(project.dueDate);

  return (
    <div
      className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 hover:bg-zinc-700 cursor-pointer transition-colors"
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-white mb-2">
            {project.title}
          </h3>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`} />
            <span className="text-xs text-zinc-400 capitalize">
              {project.status}
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-400" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Progresso</span>
          <span className="text-zinc-300">{Math.round(project.progress)}%</span>
        </div>
        
        <div className="w-full bg-zinc-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(project.progress)}`}
            style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
          />
        </div>

        {dateInfo && (
          <div className="pt-2 border-t border-zinc-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Prazo</span>
              <div className="text-right">
                <span className={dateInfo.color}>{dateInfo.date}</span>
                {dateInfo.label && (
                  <div className={dateInfo.color}>{dateInfo.label}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCard;
