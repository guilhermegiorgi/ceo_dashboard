"use client";

import React, { useMemo } from "react";
import { ChevronDown, ChevronRight, FileText, Hash, Calendar } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type InboxNote = {
  path: string;
  title?: string;
  snippet?: string;
  modified?: string;
  size?: number;
  frontmatter?: Record<string, any> | string;
  tags?: string[];
  excerpt?: string;
  created?: string;
  content?: string;  
};

interface InboxNoteCardProps {
  note: InboxNote;
  onExpand?: (path: string) => void;
  isExpanded?: boolean;
}

const InboxNoteCard: React.FC<InboxNoteCardProps> = ({ note, onExpand, isExpanded = false }) => {
  const noteId = note.path || note.title || 'unknown';
  
  // Parse frontmatter if it comes as string
  const parsedFrontmatter = useMemo(() => {
    if (!note.frontmatter) return null;
    
    if (typeof note.frontmatter === 'string') {
      try {
        return JSON.parse(note.frontmatter);
      } catch (e) {
        console.warn('Failed to parse frontmatter:', e);
        return null;
      }
    }
    
    return note.frontmatter;
  }, [note.frontmatter]);
  
  const handleClick = () => {
    if (onExpand && note.path) {
      onExpand(note.path);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Hoje";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Ontem";
    } else {
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const getFileName = (path: string) => {
    const parts = path.split("/");
    return parts[parts.length - 1] || path;
  };

  const getFileExtension = (path: string) => {
    const parts = path.split(".");
    return parts.length > 1 ? parts[parts.length - 1] : "";
  };

  const modified = formatDate(note.modified || note.created);

  return (
    <div className="bg-zinc-800 rounded-lg border border-zinc-700 hover:bg-zinc-700 cursor-pointer transition-colors">
      <div
        className="p-4"
        onClick={handleClick}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4 text-zinc-400 flex-shrink-0" />
            </div>
            <h3 className="text-sm font-medium text-white truncate flex-1">
              {note.title || getFileName(note.path)}
            </h3>
            <button
              className="p-1 hover:bg-zinc-600 rounded transition-colors flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-zinc-400" />
              )}
            </button>
          </div>
        </div>

        <div className="text-xs text-zinc-500 mb-2">
          {getFileName(note.path)}
        </div>

        {note.excerpt && (
          <div className="text-sm text-zinc-300 line-clamp-2 mb-3">
            {note.excerpt}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {note.tags && note.tags.length > 0 && (
              <div className="flex items-center gap-1 text-zinc-400">
                <Hash className="h-3 w-3" />
                <span className="text-xs">
                  {note.tags.length} {note.tags.length === 1 ? "tag" : "tags"}
                </span>
              </div>
            )}
            
            {modified && (
              <div className="flex items-center gap-1 text-zinc-400">
                <Calendar className="h-3 w-3" />
                <span className="text-xs">{modified}</span>
              </div>
            )}
          </div>

          {getFileExtension(note.path) && (
            <span className="text-xs px-2 py-1 bg-zinc-700 text-zinc-300 rounded">
              {getFileExtension(note.path).toUpperCase()}
            </span>
          )}
        </div>

        {isExpanded && parsedFrontmatter && Object.keys(parsedFrontmatter).length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-700">
            <div className="text-xs text-zinc-400 mb-2">Metadados:</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(parsedFrontmatter).map(([key, value]) => (
                <div key={key} className="text-xs">
                  <span className="text-zinc-500 capitalize font-medium">{key}:</span>
                  <span className="text-zinc-300 ml-2 block truncate">
                    {Array.isArray(value) 
                      ? value.join(', ')
                      : typeof value === "string" 
                        ? value 
                        : JSON.stringify(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isExpanded && note.content && (
          <div className="mt-3 pt-3 border-t border-zinc-700">
            <div className="text-xs text-zinc-400 mb-2">Conteúdo:</div>
            <div className="prose prose-invert prose-sm max-w-none max-h-96 overflow-y-auto p-3 bg-zinc-900/50 rounded">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {note.content}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {isExpanded && note.tags && note.tags.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-700">
            <div className="flex flex-wrap gap-1">
              {note.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-zinc-700 text-zinc-300 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxNoteCard;
