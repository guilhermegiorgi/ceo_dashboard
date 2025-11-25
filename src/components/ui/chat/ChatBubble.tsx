import React from "react";
import { cn } from "@/lib/utils";
import { User, Bot } from "lucide-react";

interface ChatBubbleProps {
    role: "user" | "assistant";
    content?: string;
    isThinking?: boolean;
    className?: string;
    children?: React.ReactNode;
}

export function ChatBubble({ role, content, isThinking = false, className, children }: ChatBubbleProps) {
    const isUser = role === "user";

    return (
        <div
            className={cn(
                "flex gap-3 w-full",
                isUser ? "justify-end" : "justify-start",
                className
            )}
        >
            {!isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                </div>
            )}

            <div
                className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                    isUser
                        ? "bg-primary text-primary-foreground"
                        : isThinking
                            ? "bg-muted/50 text-muted-foreground italic border border-dashed border-muted-foreground/30"
                            : "bg-muted text-foreground"
                )}
            >
                {children ? children : <div className="whitespace-pre-wrap break-words">{content}</div>}
            </div>

            {isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                </div>
            )}
        </div>
    );
}
