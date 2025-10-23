"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { NodeDefinition, NodeCategory } from "./types";

interface ComponentPaletteProps {
  definitions: NodeDefinition[];
  onAdd: (definitionId: string) => void;
}

const CATEGORY_ORDER: NodeCategory[] = [
  "Triggers",
  "Actions",
  "Conditionals",
  "Loops",
  "Utilities",
];

export default function ComponentPalette({
  definitions,
  onAdd,
}: ComponentPaletteProps) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<NodeCategory, boolean>>({
    Triggers: false,
    Actions: false,
    Conditionals: false,
    Loops: false,
    Utilities: false,
  });

  const grouped = useMemo(() => {
    const byCategory = new Map<NodeCategory, NodeDefinition[]>();
    definitions.forEach((definition) => {
      const matchesQuery = query
        ? `${definition.label} ${definition.description}`
            .toLowerCase()
            .includes(query.toLowerCase())
        : true;
      if (!matchesQuery) return;
      const list = byCategory.get(definition.category) ?? [];
      list.push(definition);
      byCategory.set(definition.category, list);
    });
    CATEGORY_ORDER.forEach((category) => {
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
    });
    return byCategory;
  }, [definitions, query]);

  return (
    <aside className="flex h-full w-72 flex-col border-r border-zinc-800 bg-zinc-950/80">
      <div className="border-b border-zinc-800 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Components
        </p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search components"
          className="mt-2 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {CATEGORY_ORDER.map((category) => {
          const items = grouped.get(category) ?? [];
          const isCollapsed = collapsed[category];
          return (
            <section key={category} className="border-b border-zinc-900/60">
              <button
                type="button"
                onClick={() =>
                  setCollapsed((prev) => ({
                    ...prev,
                    [category]: !prev[category],
                  }))
                }
                className="flex w-full items-center justify-between bg-zinc-950/70 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400 hover:bg-zinc-900/80"
              >
                <span>{category}</span>
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {!isCollapsed && (
                <ul className="space-y-1 p-2">
                  {items.length === 0 ? (
                    <li className="rounded bg-zinc-900/50 px-3 py-2 text-xs text-zinc-500">
                      No components
                    </li>
                  ) : (
                    items.map((definition) => {
                      const Icon = definition.icon;
                      return (
                        <li key={definition.id}>
                          <div
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData(
                                "application/x-workflow-node",
                                definition.id
                              );
                              event.dataTransfer.effectAllowed = "copy";
                            }}
                            onClick={() => onAdd(definition.id)}
                            className="group flex cursor-grab items-start gap-2 rounded-lg border border-transparent bg-zinc-900/60 px-3 py-2 text-left text-sm text-zinc-200 transition hover:border-emerald-400/60 hover:bg-zinc-900"
                          >
                            <span
                              className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md ${definition.color} text-white shadow-inner`}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="flex-1">
                              <span className="flex items-center gap-2">
                                <strong className="text-sm font-semibold">
                                  {definition.label}
                                </strong>
                                {definition.badge && (
                                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                                    {definition.badge}
                                  </span>
                                )}
                              </span>
                              <span className="mt-1 block text-xs text-zinc-400">
                                {definition.description}
                              </span>
                            </span>
                            <Plus className="h-4 w-4 text-zinc-500 transition group-hover:text-emerald-400" />
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
