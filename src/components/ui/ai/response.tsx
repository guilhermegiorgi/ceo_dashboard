"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Opcional: corrige marcas incompletas durante streaming
function parseIncompleteMarkdown(text: string): string {
  if (!text || typeof text !== "string") return text;
  let result = text;
  const linkImagePattern = /(!?\[)([^\]]*?)$/;
  const linkMatch = result.match(linkImagePattern);
  if (linkMatch) {
    const startIndex = result.lastIndexOf(linkMatch[1]);
    result = result.substring(0, startIndex);
  }
  const boldPattern = /(\*\*)([^*]*?)$/;
  const boldMatch = result.match(boldPattern);
  if (boldMatch) {
    const asteriskPairs = (result.match(/\*\*/g) || []).length;
    if (asteriskPairs % 2 === 1) result = `${result}**`;
  }
  const inlineCodePattern = /(`)([^`]*?)$/;
  const inlineCodeMatch = result.match(inlineCodePattern);
  if (inlineCodeMatch) {
    const allTripleBackticks = (result.match(/```/g) || []).length;
    const insideIncompleteCodeBlock = allTripleBackticks % 2 === 1;
    if (!insideIncompleteCodeBlock) {
      const singles = (result.match(/`/g) || []).length;
      if (singles % 2 === 1) result = `${result}\``;
    }
  }
  return result;
}

type ResponseProps = {
  children: string;
  className?: string;
  parseMarkdown?: boolean;
};

export function Response({
  children,
  className,
  parseMarkdown = true,
}: ResponseProps) {
  const content =
    parseMarkdown && typeof children === "string"
      ? parseIncompleteMarkdown(children)
      : children;

  return (
    <div
      className={cn(
        "prose prose-invert prose-sm max-w-none leading-relaxed",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
