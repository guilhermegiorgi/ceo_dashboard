"use client";

import React, { ReactNode, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
  isTimelineCollapsed: boolean;
  onExpandTimeline: () => void;
  onCollapseTimeline: () => void;
  onResizeStart: (clientX: number) => void;
  onResizeTouchStart: (event: React.TouchEvent<HTMLDivElement>) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  isTimelineCollapsed,
  onExpandTimeline,
  onCollapseTimeline,
  onResizeStart,
  onResizeTouchStart,
}) => {
  const layoutRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={layoutRef} className="flex flex-1 min-h-0 gap-4">
      {children}
      
      {/* Timeline Collapse/Expand Button */}
      {isTimelineCollapsed ? (
        <div className="flex items-center">
          <button
            onClick={onExpandTimeline}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-zinc-300 shadow-lg shadow-black/20 transition hover:border-neutral-600 hover:text-zinc-100"
            aria-label="Exibir timeline"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div
            onMouseDown={onResizeStart}
            onTouchStart={onResizeTouchStart}
            className="relative my-2 hidden w-1 cursor-col-resize rounded-full bg-neutral-800 transition hover:bg-neutral-600 xl:block"
          >
            <span className="absolute inset-y-0 -inset-x-1" />
          </div>
        </>
      )}
      
      {/* Extra space for potential future use */}
      <div className="sr-only" aria-hidden="true">
        <p>Layout wrapper with 3-column grid: [sidebar] [main] [dock]</p>
      </div>
    </div>
  );
};

export default MainLayout;
