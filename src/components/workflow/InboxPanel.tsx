"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import InboxNoteCard from "../InboxNoteCard";
import { InboxNote } from "../../services/apiClient";

interface InboxPanelProps {
  inboxNotes: InboxNote[];
  inboxLoading: boolean;
  inboxError: string | null;
  expandedInboxPath: string | null;
  expandedInboxContent?: string | null;
  expandedInboxFrontmatter?: any | null;
  expandedInboxLoading?: boolean;
  onExpand: (path: string) => void;
}

const InboxPanel: React.FC<InboxPanelProps> = ({
  inboxNotes,
  inboxLoading,
  inboxError,
  expandedInboxPath,
  expandedInboxContent,
  expandedInboxFrontmatter,
  expandedInboxLoading,
  onExpand
}) => {
  if (inboxLoading) {
    return (
      <div className="flex h-24 items-center justify-center gap-2 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
        Carregando notas da inbox...
      </div>
    );
  }

  if (inboxError) {
    return <p className="text-xs text-rose-400">{inboxError}</p>;
  }

  if (inboxNotes.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        Nenhuma nota bruta encontrada na inbox. Capture algo via WhatsApp ou
        composer para alimentar este painel.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {inboxNotes.map((note) => {
        const isExpanded = expandedInboxPath === note.path;
        
        // Merge expanded content into note if this is the expanded one
        const enrichedNote = isExpanded && expandedInboxContent
          ? {
              ...note,
              content: expandedInboxContent,
              frontmatter: expandedInboxFrontmatter || note.frontmatter,
            }
          : note;
        
        return (
          <InboxNoteCard
            key={note.path}
            note={enrichedNote}
            isExpanded={isExpanded}
            onExpand={onExpand}
          />
        );
      })}
      
      {expandedInboxLoading && expandedInboxPath && (
        <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          Carregando conteúdo...
        </div>
      )}
    </div>
  );
};

export default InboxPanel;
