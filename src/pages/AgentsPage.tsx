import React, { useState } from 'react';
import AgentManager from '../components/AgentManager';
import StrategicInsights from '../components/StrategicInsights';
import SearchResultsModal from '../components/SearchResultsModal';
import apiClient from '../services/apiClient';
import { Search } from 'lucide-react';

const AgentsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchLoading(true);
    setIsModalOpen(true);
    try {
      const response = await apiClient.request<any>('/api/obsidian/search', {
        method: 'POST',
        body: { query: searchQuery },
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearchLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Painel Estratégico</h1>
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in Second Brain..."
            className="bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
        </form>
      </div>
      <StrategicInsights />
      <div>
        <h1 className="text-3xl font-bold mb-4">Gerenciador de Agentes de IA</h1>
        <AgentManager />
      </div>
      <SearchResultsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        results={searchResults}
        isLoading={isSearchLoading}
      />
    </div>
  );
};

export default AgentsPage;
