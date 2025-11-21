import React, { useState, useRef, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
}

export function ChatInput({
    onSend,
    disabled = false,
    placeholder = "Type your message...",
    className,
}: ChatInputProps) {
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (value.trim() && !disabled) {
            onSend(value.trim());
            setValue("");
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(e.target.value);
        // Auto-resize textarea
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    };

    return (
        <div className={cn("border-t bg-background p-4", className)}>
            <div className="flex gap-2 items-end">
                <Textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="min-h-[60px] max-h-[200px] resize-none"
                    rows={1}
                />
                <Button
                    onClick={handleSend}
                    disabled={disabled || !value.trim()}
                    size="icon"
                    className="h-[60px] w-[60px] flex-shrink-0"
                >
                    {disabled ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Send className="h-5 w-5" />
                    )}
                </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
                Press Enter to send, Shift+Enter for new line
            </p>
        </div>
    );
}
