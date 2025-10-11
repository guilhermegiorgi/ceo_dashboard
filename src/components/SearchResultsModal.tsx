import React from 'react';
import { X } from 'lucide-react';

interface SearchResult {
  filename: string;
  matches: { context: string }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  results: SearchResult[];
  isLoading: boolean;
}

const SearchResultsModal: React.FC<Props> = ({ isOpen, onClose, results, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Search Results</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        {isLoading ? (
          <div className="text-center text-slate-400">Searching...</div>
        ) : (
          <div className="space-y-4">
            {results.length > 0 ? (
              results.map((result, index) => (
                <div key={index} className="bg-slate-700 p-4 rounded-lg">
                  <h3 className="font-semibold text-white mb-2">{result.filename}</h3>
                  <ul className="space-y-2">
                    {result.matches.map((match, matchIndex) => (
                      <li key={matchIndex} className="text-sm text-slate-300 border-l-2 border-slate-500 pl-2">
                        ...{match.context}...
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400">No results found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsModal;
