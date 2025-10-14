import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Cpu, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Send,
  RefreshCw,
  Settings,
  BarChart3,
  Activity,
  Search,
  Filter
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useMCP } from '../hooks/useMCP';

const MCPIntegration: React.FC = () => {
  const { t } = useLanguage();
  const { services, loading, queryService, queryAllServices } = useMCP();
  
  const [query, setQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const statusConfig = {
    active: { color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle },
    idle: { color: 'text-slate-400', bg: 'bg-slate-500/10', icon: Clock },
    processing: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Zap },
    error: { color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertCircle }
  };

  const filteredServices = services.filter(service => {
    return filterStatus === 'all' || service.status === filterStatus;
  });

  const handleQuery = async () => {
    if (!query.trim()) {
      alert('Por favor, digite uma consulta');
      return;
    }

    setIsQuerying(true);
    try {
      let results;
      if (selectedService === 'all') {
        results = await queryAllServices(query);
        setQueryResults(results.responses || []);
      } else {
        const result = await queryService(selectedService, query);
        setQueryResults([{
          serviceId: selectedService,
          serviceName: services.find(s => s.id === selectedService)?.name || 'Desconhecido',
          success: true,
          response: result
        }]);
      }
      
      alert('Consulta concluída com sucesso!');
    } catch (error) {
      console.error('Falha ao consultar serviços MCP:', error);
      alert('Falha ao consultar serviços MCP. Tente novamente.');
    } finally {
      setIsQuerying(false);
    }
  };

  const getServiceHealth = () => {
    const total = services.length;
    const active = services.filter(s => s.status === 'active').length;
    const avgSuccessRate = services.reduce((acc, s) => acc + s.successRate, 0) / total;
    const totalQueries = services.reduce((acc, s) => acc + s.queries, 0);

    return { total, active, avgSuccessRate, totalQueries };
  };

  const health = getServiceHealth();

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t('mcp.title')}</h2>
            <p className="text-sm text-slate-400">{t('mcp.subtitle')}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-400">{health.active}/{health.total} Ativos</span>
          </div>
          
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Settings className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Health Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Activity className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-slate-400">Serviços</span>
          </div>
          <div className="text-xl font-bold text-blue-400">{health.total}</div>
        </div>

        <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-sm text-slate-400">Ativos</span>
          </div>
          <div className="text-xl font-bold text-green-400">{health.active}</div>
        </div>

        <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <BarChart3 className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-slate-400">Taxa de Sucesso</span>
          </div>
          <div className="text-xl font-bold text-purple-400">{health.avgSuccessRate.toFixed(1)}%</div>
        </div>

        <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <MessageSquare className="h-4 w-4 text-cyan-400" />
            <span className="text-sm text-slate-400">Total de Consultas</span>
          </div>
          <div className="text-xl font-bold text-cyan-400">{health.totalQueries}</div>
        </div>
      </div>

      {/* Query Interface */}
      <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4 mb-6">
        <h3 className="text-white font-medium mb-4">Consultar Serviços MCP</h3>
        
        <div className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digite sua consulta para os agentes IA..."
                className="w-full bg-slate-600/50 border border-slate-500/50 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
              />
            </div>
            
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="bg-slate-600/50 border border-slate-500/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="all">Todos os Serviços</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
            
            <button
              onClick={handleQuery}
              disabled={isQuerying}
              className="flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
            >
              {isQuerying ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>{isQuerying ? 'Consultando...' : 'Consultar'}</span>
            </button>
          </div>

          {/* Query Results */}
          {queryResults.length > 0 && (
            <div className="mt-4 space-y-3">
              <h4 className="text-white font-medium">Resultados da Consulta:</h4>
              {queryResults.map((result, index) => (
                <div key={index} className="bg-slate-600/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-cyan-400 font-medium">{result.serviceName}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      result.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {result.success ? 'Sucesso' : 'Erro'}
                    </span>
                  </div>
                  
                  {result.success ? (
                    <div className="text-sm text-slate-300">
                      {typeof result.response === 'object' ? (
                        <pre className="whitespace-pre-wrap">{JSON.stringify(result.response, null, 2)}</pre>
                      ) : (
                        <p>{result.response}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-red-400">{result.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Services Filter */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-300">Filtrar por status:</span>
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        >
          <option value="all">Todos os Status</option>
          <option value="active">Ativo</option>
          <option value="idle">Inativo</option>
          <option value="processing">Processando</option>
          <option value="error">Erro</option>
        </select>
      </div>
      
      {/* Services Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {filteredServices.map((service) => {
          const config = statusConfig[service.status as keyof typeof statusConfig];
          const StatusIcon = config.icon;
          
          return (
            <div key={service.id} className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4 hover:bg-slate-700/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Cpu className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{service.name}</h3>
                    <p className="text-xs text-slate-400">{service.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <StatusIcon className={`h-4 w-4 ${config.color}`} />
                  <span className={`text-xs ${config.color} capitalize`}>{service.status}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center mb-3">
                <div>
                  <p className="text-lg font-bold text-white">{service.queries}</p>
                  <p className="text-xs text-slate-400">Consultas</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-400">{service.successRate}%</p>
                  <p className="text-xs text-slate-400">Taxa de Sucesso</p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">{service.lastResponse}</p>
                  <p className="text-xs text-slate-400">Última Resposta</p>
                </div>
              </div>

              {showAdvanced && service.capabilities && (
                <div className="border-t border-slate-600/30 pt-3">
                  <h4 className="text-xs text-slate-400 mb-2">Capacidades:</h4>
                  <div className="flex flex-wrap gap-1">
                    {service.capabilities.map((capability, index) => (
                      <span key={index} className="px-2 py-1 bg-slate-600/50 text-slate-300 text-xs rounded">
                        {capability}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="pt-4 border-t border-slate-700/50">
        <button 
          onClick={() => queryAllServices('Gerar insights estratégicos do contexto de negócios atual')}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 hover:scale-105"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Consultar Todos os Serviços</span>
        </button>
      </div>
    </div>
  );
};

export default MCPIntegration;
