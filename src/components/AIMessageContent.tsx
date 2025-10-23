import React from 'react';
import { Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Theme {
  theme: string;
  summary: string;
  confidence: number;
}

interface ParsedResponse {
  title: string;
  generatedAt: string;
  themes: Theme[];
}

interface AIMessageContentProps {
  text: string;
}

const AIMessageContent: React.FC<AIMessageContentProps> = ({ text }) => {
  const parseResponse = (responseText: string): ParsedResponse | null => {
    // Guard against undefined/null responseText
    if (!responseText || typeof responseText !== 'string') {
      return null;
    }
    
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (error) {
        console.error('Failed to parse AI response JSON:', error);
        return null;
      }
    }
    return null;
  };

  // Guard against undefined text prop
  if (!text) {
    return null;
  }

  const data = parseResponse(text);

  if (data && Array.isArray(data.themes)) {
    return (
      <div className="space-y-3 text-slate-300">
        <h3 className="font-bold text-md text-white">{data.title}</h3>
        <ul className="space-y-2 list-inside">
          {data.themes.map((item, index) => (
            <li key={index} className="p-2 bg-slate-600/50 rounded-md">
              <strong className="font-semibold text-indigo-300 flex items-center">
                <Info className="h-4 w-4 mr-2 flex-shrink-0" />
                {item.theme}
              </strong>
              <p className="text-sm text-slate-400 mt-1 ml-6">{item.summary}</p>
              <div className="text-xs text-slate-500 mt-2 ml-6">Confiança: {(item.confidence * 100).toFixed(0)}%</div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500 text-right pt-2">
          Gerado em: {new Date(data.generatedAt).toLocaleString()}
        </p>
      </div>
    );
  }

  // Fallback to render plain text with Markdown formatting
  return (
    <div className="prose prose-invert prose-sm max-w-none prose-headings:text-slate-200 prose-p:text-slate-300 prose-strong:text-slate-200 prose-ul:list-disc prose-ol:list-decimal prose-li:text-slate-300">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {text}
      </ReactMarkdown>
    </div>
  );
};

export default AIMessageContent;
