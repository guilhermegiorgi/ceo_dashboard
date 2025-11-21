import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ChatMessageListProps {
    children: React.ReactNode;
    className?: string;
}

export function ChatMessageList({ children, className }: ChatMessageListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [children]);

    return (
        <div
            ref={scrollRef}
            className={cn(
                "flex-1 overflow-y-auto px-4 py-6 space-y-4",
                "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
                className
            )}
        >
            {children}
        </div>
    );
}
