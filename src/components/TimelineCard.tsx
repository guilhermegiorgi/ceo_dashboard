"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Link2, Sparkles } from "lucide-react";

export type TimelineCard =
  | {
      id: string;
      type: "message";
      author: "user" | "assistant";
      title: string;
      body: string;
      timestamp: string;
      actions?: Array<{ label: string; icon: React.ReactNode }>;
    }
  | {
      id: string;
      type: "insight";
      title: string;
      body: string;
      tags: string[];
      impact: string;
      timestamp: string;
      confidence: number;
    }
  | {
      id: string;
      type: "note";
      title: string;
      snippet: string;
      related: string[];
      timestamp: string;
    }
  | {
      id: string;
      type: "agent";
      title: string;
      status: "running" | "completed" | "scheduled";
      description: string;
      nextRun?: string;
      timestamp: string;
    };

interface TimelineCardProps {
  event: TimelineCard;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
}

const TimelineCard: React.FC<TimelineCardProps> = ({ event, onSelect, isSelected = false }) => {
  const handleClick = () => {
    if (onSelect) {
      onSelect(event.id);
    }
  };

  const renderActions = () => {
    if (event.type === "message" && event.actions) {
      return (
        <div className="flex gap-2 mt-3">
          {event.actions.map((action, index) => (
            <button
              key={index}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
              onClick={() => onSelect?.(event.id)}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderTags = () => {
    if (event.type === "insight" && event.tags) {
      return (
        <div className="flex flex-wrap gap-1 mt-2">
          {event.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 text-xs bg-emerald-900/50 text-emerald-300 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderRelated = () => {
    if (event.type === "note" && event.related) {
      return (
        <div className="mt-2 text-xs text-zinc-400">
          Relacionado: {event.related.join(" • ")}
        </div>
      );
    }
    return null;
  };

  const renderStatus = () => {
    if (event.type === "agent") {
      const statusColors = {
        running: "text-sky-300",
        completed: "text-emerald-300",
        scheduled: "text-zinc-300",
      };
      return (
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs ${statusColors[event.status]}`}>
            {event.status === "running" && "🔄"}
            {event.status === "completed" && "✅"}
            {event.status === "scheduled" && "⏰"}
            {" " + event.status}
          </span>
          {event.nextRun && (
            <span className="text-xs text-zinc-400">{event.nextRun}</span>
          )}
        </div>
      );
    }
    return null;
  };

  const renderConfidence = () => {
    if (event.type === "insight" && event.confidence) {
      const confidenceColor = event.confidence >= 0.8 ? "text-emerald-300" : 
                              event.confidence >= 0.6 ? "text-amber-300" : "text-rose-300";
      return (
        <div className="mt-2">
          <span className={`text-xs ${confidenceColor}`}>
            Confiança: {Math.round(event.confidence * 100)}%
          </span>
          {event.impact && (
            <span className="ml-2 text-xs text-zinc-400">
              {event.impact}
            </span>
          )}
        </div>
      );
    }
    return null;
  };

  const getAuthorIndicator = () => {
    if (event.type === "message") {
      return event.author === "user" ? "👤" : "🤖";
    }
    if (event.type === "insight") return "💡";
    if (event.type === "note") return "📝";
    if (event.type === "agent") return "⚙️";
    return "📌";
  };

  return (
    <div
      className={`bg-zinc-800 rounded-lg p-4 border transition-all cursor-pointer hover:bg-zinc-700 ${
        isSelected ? "border-blue-500 bg-zinc-700/50" : "border-zinc-700"
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{getAuthorIndicator()}</span>
          <h3 className="text-sm font-medium text-white">{event.title}</h3>
        </div>
        <span className="text-xs text-zinc-400">{event.timestamp}</span>
      </div>
      
      <div className="text-sm text-zinc-300 mb-2">
        {event.type === "note" ? event.snippet : event.body}
      </div>

      {renderActions()}
      {renderTags()}
      {renderRelated()}
      {renderStatus()}
      {renderConfidence()}
    </div>
  );
};

export default TimelineCard;
