import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'pt';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    // Header
    'header.title': 'GG.AI Labs',
    'header.subtitle': 'CEO Dashboard',
    
    // Metrics
    'metrics.title': 'Executive Overview',
    'metrics.subtitle': 'Real-time business intelligence and metrics',
    'metrics.revenue': 'Revenue Growth',
    'metrics.revenue.value': '$2.4M',
    'metrics.revenue.change': '+23.5% from last quarter',
    'metrics.revenue.desc': 'Strong performance across all product lines',
    'metrics.ai_efficiency': 'AI Efficiency Score',
    'metrics.ai_efficiency.value': '94.2%',
    'metrics.ai_efficiency.change': '+8.1% this month',
    'metrics.ai_efficiency.desc': 'AI agents operating at peak performance',
    'metrics.active_projects': 'Active Projects',
    'metrics.active_projects.value': '12',
    'metrics.active_projects.change': '3 launched this week',
    'metrics.active_projects.desc': 'Strategic initiatives on track',
    'metrics.team_productivity': 'Team Productivity',
    'metrics.team_productivity.value': '87%',
    'metrics.team_productivity.change': '+5.2% improvement',
    'metrics.team_productivity.desc': 'Enhanced by AI-powered insights',
    
    // AI Insights
    'insights.title': 'AI-Powered Insights',
    'insights.subtitle': 'Strategic recommendations from your second brain',
    'insights.live': 'Live Analysis',
    'insights.confidence': 'Confidence:',
    'insights.actionable': 'Actionable',
    'insights.priority.high': 'HIGH',
    'insights.priority.medium': 'MEDIUM',
    'insights.priority.low': 'LOW',
    
    // Obsidian Integration
    'obsidian.title': 'Obsidian Knowledge Graph',
    'obsidian.subtitle': 'Second Brain Integration',
    'obsidian.connected': 'Connected',
    'obsidian.search': 'Search your knowledge graph...',
    'obsidian.recent': 'Recent Knowledge Nodes',
    'obsidian.generate': 'Generate AI Insights from Knowledge Graph',
    
    // Project Overview
    'projects.title': 'Project Overview',
    'projects.subtitle': 'Active initiatives and progress',
    'projects.progress': 'Progress',
    'projects.members': 'members',
    
    // MCP Integration
    'mcp.title': 'MCP Integration',
    'mcp.subtitle': 'Model Context Protocol Services',
    'mcp.active': 'Active',
    'mcp.queries': 'Queries',
    'mcp.success_rate': 'Success Rate',
    'mcp.last_response': 'Last Response',
    'mcp.query_all': 'Query All MCP Services',
    
    // Quick Actions
    'actions.title': 'Quick Actions',
    'actions.analyze': 'Analyze Knowledge Graph',
    'actions.strategy': 'Generate Strategy Report',
    'actions.schedule': 'Schedule AI Review',
    
    // Time
    'time.minutes_ago': 'minutes ago',
    'time.hour_ago': 'hour ago',
    'time.hours_ago': 'hours ago',
    'time.day_ago': 'day ago',
    'time.days_ago': 'days ago',
    'time.now': 'Now'
  },
  pt: {
    // Header
    'header.title': 'GG.AI Labs',
    'header.subtitle': 'Painel do CEO',
    
    // Metrics
    'metrics.title': 'Visão Executiva',
    'metrics.subtitle': 'Inteligência de negócios e métricas em tempo real',
    'metrics.revenue': 'Crescimento da Receita',
    'metrics.revenue.value': 'R$ 12,8M',
    'metrics.revenue.change': '+23,5% do último trimestre',
    'metrics.revenue.desc': 'Performance forte em todas as linhas de produto',
    'metrics.ai_efficiency': 'Score de Eficiência IA',
    'metrics.ai_efficiency.value': '94,2%',
    'metrics.ai_efficiency.change': '+8,1% este mês',
    'metrics.ai_efficiency.desc': 'Agentes IA operando com performance máxima',
    'metrics.active_projects': 'Projetos Ativos',
    'metrics.active_projects.value': '12',
    'metrics.active_projects.change': '3 lançados esta semana',
    'metrics.active_projects.desc': 'Iniciativas estratégicas no cronograma',
    'metrics.team_productivity': 'Produtividade da Equipe',
    'metrics.team_productivity.value': '87%',
    'metrics.team_productivity.change': '+5,2% de melhoria',
    'metrics.team_productivity.desc': 'Aprimorada por insights alimentados por IA',
    
    // AI Insights
    'insights.title': 'Insights Alimentados por IA',
    'insights.subtitle': 'Recomendações estratégicas do seu segundo cérebro',
    'insights.live': 'Análise ao Vivo',
    'insights.confidence': 'Confiança:',
    'insights.actionable': 'Acionável',
    'insights.priority.high': 'ALTA',
    'insights.priority.medium': 'MÉDIA',
    'insights.priority.low': 'BAIXA',
    
    // Obsidian Integration
    'obsidian.title': 'Grafo de Conhecimento Obsidian',
    'obsidian.subtitle': 'Integração do Segundo Cérebro',
    'obsidian.connected': 'Conectado',
    'obsidian.search': 'Pesquise seu grafo de conhecimento...',
    'obsidian.recent': 'Nós de Conhecimento Recentes',
    'obsidian.generate': 'Gerar Insights IA do Grafo de Conhecimento',
    
    // Project Overview
    'projects.title': 'Visão Geral dos Projetos',
    'projects.subtitle': 'Iniciativas ativas e progresso',
    'projects.progress': 'Progresso',
    'projects.members': 'membros',
    
    // MCP Integration
    'mcp.title': 'Integração MCP',
    'mcp.subtitle': 'Serviços do Protocolo de Contexto de Modelo',
    'mcp.active': 'Ativo',
    'mcp.queries': 'Consultas',
    'mcp.success_rate': 'Taxa de Sucesso',
    'mcp.last_response': 'Última Resposta',
    'mcp.query_all': 'Consultar Todos os Serviços MCP',
    
    // Quick Actions
    'actions.title': 'Ações Rápidas',
    'actions.analyze': 'Analisar Grafo de Conhecimento',
    'actions.strategy': 'Gerar Relatório Estratégico',
    'actions.schedule': 'Agendar Revisão IA',
    
    // Time
    'time.minutes_ago': 'minutos atrás',
    'time.hour_ago': 'hora atrás',
    'time.hours_ago': 'horas atrás',
    'time.day_ago': 'dia atrás',
    'time.days_ago': 'dias atrás',
    'time.now': 'Agora'
  }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};