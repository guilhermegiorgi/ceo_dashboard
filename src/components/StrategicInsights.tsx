import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { toast } from 'react-hot-toast';

// Definição das interfaces para os dados
interface InsightItem {
  text: string;
  sourceNote: string;
}

interface StrategicInsightsData {
  keyFindings: InsightItem[];
  recommendations: InsightItem[];
  summary: string;
  lastUpdated: string;
}

const StrategicInsights: React.FC = () => {
  const [insights, setInsights] = useState<StrategicInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.request<any>('/insights/strategic', { method: 'GET' });
        if (response && response.success) {
          setInsights(response.data);
        } else {
          throw new Error(response.message || 'Falha ao buscar insights');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido';
        setError(errorMessage);
        toast.error(`Erro ao carregar insights: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, []);

  if (isLoading) {
    return <div className="text-center p-8">Carregando insights estratégicos...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">Erro: {error}</div>;
  }

  if (!insights) {
    return <div className="text-center p-8">Nenhum insight disponível no momento.</div>;
  }

  return (
    <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Insights Estratégicos</h2>
      <p className="text-sm text-gray-400 mb-6">{insights.summary} (Atualizado em: {new Date(insights.lastUpdated).toLocaleString()})</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Key Findings */}
        <div>
          <h3 className="text-xl font-semibold mb-3 text-blue-400">Principais Achados</h3>
          <ul className="space-y-3">
            {insights.keyFindings.map((item, index) => (
              <li key={index} className="bg-gray-700 p-3 rounded-md">
                <p>{item.text}</p>
                <span className="text-xs text-gray-500 mt-1 block">Fonte: {item.sourceNote}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommendations */}
        <div>
          <h3 className="text-xl font-semibold mb-3 text-green-400">Recomendações</h3>
          <ul className="space-y-3">
            {insights.recommendations.map((item, index) => (
              <li key={index} className="bg-gray-700 p-3 rounded-md">
                <p>{item.text}</p>
                <span className="text-xs text-gray-500 mt-1 block">Fonte: {item.sourceNote}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StrategicInsights;
