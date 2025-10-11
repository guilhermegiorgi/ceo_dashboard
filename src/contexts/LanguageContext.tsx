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
    // Sidebar
    'sidebar.insightsHub': 'Insights Hub',
    'sidebar.cognitoChat': 'Cognito AI Chat',
    'sidebar.knowledgeGraph': 'Knowledge Graph',
    'sidebar.decisionJournal': 'Decision Journal',
    'sidebar.sessionPlanner': 'Session Planner',
    'sidebar.marketIntelligence': 'Market Intelligence',
    'sidebar.agentPanel': 'Agent Panel',
    'sidebar.settings': 'Settings',

    // Intelligence Hub
    'intelligenceHub.title': 'Intelligence Hub',
    'intelligenceHub.subtitle': 'Connecting insights, driving decisions.',

    // Header
    'header.title': 'GG.AI Labs',
    'header.subtitle': 'CEO Dashboard',
    'header.search': 'Search across all systems...',

    // Navigation
    'nav.overview': 'Executive Overview',
    'nav.overview.desc': 'Main dashboard with key metrics',
    'nav.business_intelligence': 'Business Intelligence',
    'nav.business_intelligence.desc': 'KPIs, metrics and analytics',
    'nav.market_intelligence': 'Market Intelligence',
    'nav.market_intelligence.desc': 'Market opportunities and trends',
    'nav.predictive_analytics': 'Predictive Analytics',
    'nav.predictive_analytics.desc': 'Forecasting and scenario analysis',
    'nav.ai_orchestrator': 'AI Agent Orchestrator',
    'nav.ai_orchestrator.desc': 'Manage AI workforce',
    'nav.knowledge_graph': 'Knowledge Graph',
    'nav.knowledge_graph.desc': 'Visualize knowledge connections',
    'nav.synergy_intelligence': 'Synergy Intelligence',
    'nav.synergy_intelligence.desc': 'Discover hidden connections',
    'nav.strategic_sessions': 'Strategic Sessions',
    'nav.strategic_sessions.desc': 'Plan strategic meetings',
    'nav.decision_journal': 'Decision Journal',
    'nav.decision_journal.desc': 'Track decisions and outcomes',
    'nav.projects': 'Project Management',
    'nav.projects.desc': 'Manage active projects',
    'nav.obsidian': 'Second Brain',
    'nav.obsidian.desc': 'Obsidian integration',
    'nav.mcp': 'MCP Services',
    'nav.mcp.desc': 'AI service protocols',
    'nav.settings': 'Settings',
    'nav.settings.desc': 'System configuration',

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
    'insights.expand': 'Expand Analysis',
    'insights.connected_notes': 'Connected Notes',
    'insights.create_plan': 'Create Action Plan',
    'insights.question': 'Question Premise',

    // Obsidian Integration
    'obsidian.title': 'Obsidian Knowledge Graph',
    'obsidian.subtitle': 'Second Brain Integration',
    'obsidian.connected': 'Connected',
    'obsidian.search': 'Search your knowledge graph...',
    'obsidian.recent': 'Recent Knowledge Nodes',
    'obsidian.generate': 'Generate AI Insights from Knowledge Graph',

    // Feedback Loop Tracker
    'feedbackLoop.title': 'Feedback Loop Tracker',
    'feedbackLoop.subtitle': 'Monitoring automated actions and learnings',
    'feedbackLoop.loading': 'Loading feedback actions...',
    'feedbackLoop.error': 'Failed to load feedback actions',
    'feedbackLoop.noActions': 'No pending feedback actions.',
    'feedbackLoop.note': 'Second Brain Note',
    'feedbackLoop.project': 'Related Project',
    'feedbackLoop.impact': 'Impact',
    'feedbackLoop.processing': 'Processing feedback to Second Brain...',
    'feedbackLoop.types.decision': 'Decision',
    'feedbackLoop.types.insight_validation': 'Insight Validation',
    'feedbackLoop.types.action_taken': 'Action Taken',
    'feedbackLoop.types.learning_captured': 'Learning Captured',

    // Project Overview
    'projects.title': 'Project Overview',
    'projects.subtitle': 'Active initiatives and progress',
    'projects.progress': 'Progress',
    'projects.members': 'members',
    'projects.new': 'New Project',
    'projects.status': 'Status',
    'projects.priority': 'Priority',
    'projects.budget': 'Budget',
    'projects.deadline': 'Deadline',
    'projects.team_size': 'Team Size',
    'projects.roi': 'ROI',
    'projects.description': 'Description',
    'projects.create': 'Create Project',
    'projects.edit': 'Edit Project',
    'projects.delete': 'Delete Project',
    'projects.save': 'Save',
    'projects.cancel': 'Cancel',

    // MCP Integration
    'mcp.title': 'MCP Integration',
    'mcp.subtitle': 'Model Context Protocol Services',
    'mcp.active': 'Active',
    'mcp.queries': 'Queries',
    'mcp.success_rate': 'Success Rate',
    'mcp.last_response': 'Last Response',
    'mcp.query_all': 'Query All MCP Services',
    'mcp.query': 'Query',
    'mcp.test_connection': 'Test Connection',
    'mcp.health': 'Health',
    'mcp.services': 'Services',
    'mcp.capabilities': 'Capabilities',

    // Quick Actions
    'actions.title': 'Quick Actions',
    'actions.analyze': 'Analyze Knowledge Graph',
    'actions.strategy': 'Generate Strategy Report',
    'actions.schedule': 'Schedule AI Review',

    // Settings
    'settings.title': 'Settings',
    'settings.api': 'API Configuration',
    'settings.preferences': 'Preferences',
    'settings.notifications': 'Notifications',
    'settings.security': 'Security',
    'settings.data': 'Data Management',
    'settings.save': 'Save Settings',
    'settings.close': 'Close',
    'settings.export': 'Export Settings',
    'settings.import': 'Import Settings',
    'settings.reset': 'Reset to Defaults',

    // Notifications
    'notifications.title': 'Notifications',
    'notifications.mark_read': 'Mark as Read',
    'notifications.mark_all_read': 'Mark All Read',
    'notifications.delete': 'Delete',
    'notifications.settings': 'Notification Settings',
    'notifications.search': 'Search notifications...',
    'notifications.filter': 'Filter',
    'notifications.empty': 'No notifications found',

    // User Profile
    'profile.title': 'Account',
    'profile.profile': 'Profile',
    'profile.security': 'Security',
    'profile.billing': 'Billing',
    'profile.activity': 'Activity',
    'profile.edit': 'Edit Profile',
    'profile.save': 'Save Changes',
    'profile.cancel': 'Cancel',
    'profile.sign_out': 'Sign Out',
    'profile.change_password': 'Change Password',
    'profile.enable_2fa': 'Enable 2FA',
    'profile.manage_keys': 'Manage Keys',

    // Business Intelligence
    'bi.title': 'Business Intelligence Hub',
    'bi.subtitle': 'Real-time business metrics and performance analytics',
    'bi.overview': 'Overview',
    'bi.kpis': 'KPIs',
    'bi.metrics': 'Metrics',
    'bi.alerts': 'Alerts',
    'bi.refresh': 'Refresh',
    'bi.export': 'Export',
    'bi.share': 'Share',

    // Market Intelligence
    'market.title': 'Market Intelligence Engine',
    'market.subtitle': 'AI-powered market analysis and opportunity discovery',
    'market.deep_analysis': 'Deep Analysis',
    'market.analyzing': 'Analyzing...',
    'market.tabs.opportunities': 'Market Opportunities',
    'market.tabs.competitors': 'Competitor Intelligence',
    'market.tabs.trends': 'Market Trends',
    'market.searchPlaceholder': 'Search opportunities, competitors, trends...',
    'market.filter.all': 'All Markets',
    'market.filter.healthcare': 'Healthcare',
    'market.filter.enterprise': 'Enterprise Software',
    'market.filter.manufacturing': 'Manufacturing',
    'market.filter.fintech': 'FinTech',
    'market.trends.soon': 'Market trends analysis coming soon...',

    // Predictive Analytics
    'predictive.title': 'Predictive Analytics',
    'predictive.subtitle': 'AI-powered forecasting and scenario analysis',
    'predictive.predictions': 'Predictions',
    'predictive.scenarios': 'Scenario Analysis',
    'predictive.models': 'Models',
    'predictive.run_analysis': 'Run Analysis',

    // AI Orchestrator
    'orchestrator.title': 'AI Agent Orchestrator',
    'orchestrator.subtitle': 'Manage and coordinate your AI workforce',
    'orchestrator.create_agent': 'Create Agent',
    'orchestrator.assign_task': 'Assign Task',
    'orchestrator.view_history': 'View History',
    'orchestrator.optimize': 'Optimize Workflow',

    // Knowledge Graph
    'knowledge.title': 'Knowledge Graph Visualizer',
    'knowledge.subtitle': 'Interactive exploration of your Second Brain',
    'knowledge.search': 'Search knowledge graph...',
    'knowledge.filter': 'Filter',
    'knowledge.analyze': 'AI Analysis',
    'knowledge.export': 'Export',
    'knowledge.share': 'Share',
    'knowledge.stats': 'Graph Statistics',

    // Synergy Intelligence
    'synergy.title': 'Proactive Synergy Intelligence',
    'synergy.subtitle': 'Discovering latent connections and strategic opportunities',
    'synergy.analyzing': 'Analyzing',
    'synergy.explore': 'Explore Connection',
    'synergy.schedule': 'Schedule Session',
    'synergy.create_note': 'Create Analysis Note',
    'synergy.deep_scan': 'Deep Scan Knowledge Graph',

    // Strategic Sessions
    'sessions.title': 'Strategic Session Planner',
    'sessions.subtitle': 'AI-suggested strategic thinking sessions',
    'sessions.generate': 'Generate AI Sessions',
    'sessions.create': 'Create Session',
    'sessions.schedule': 'Schedule',
    'sessions.view_details': 'View Details',
    'sessions.participants': 'Participants',
    'sessions.preparation': 'Preparation Notes',
    'sessions.outcomes': 'Expected Outcomes',

    // Decision Journal
    'decisions.title': 'Decision Journal',
    'decisions.subtitle': 'Track decisions, outcomes, and learnings',
    'decisions.record': 'Record Decision',
    'decisions.success_rate': 'Success Rate',
    'decisions.confidence': 'Avg Confidence',
    'decisions.total': 'Total Decisions',
    'decisions.pending': 'Pending Review',
    'decisions.search': 'Search decisions...',
    'decisions.generate_insights': 'Generate Decision Insights',

    // Cognito Chat
    'cognitoChat.title': 'Cognito AI Chat',
    'cognitoChat.subtitle': 'Chat with the AI to get real-time insights and answers.',

    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.info': 'Info',
    'common.confirm': 'Confirm',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.create': 'Create',
    'common.update': 'Update',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.refresh': 'Refresh',
    'common.view': 'View',
    'common.close': 'Close',
    'common.open': 'Open',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.all': 'All',
    'common.none': 'None',
    'common.select': 'Select',
    'common.clear': 'Clear',
    'common.reset': 'Reset',
    'common.apply': 'Apply',
    'common.submit': 'Submit',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.back': 'Back',
    'common.forward': 'Forward',
    'common.up': 'Up',
    'common.down': 'Down',
    'common.left': 'Left',
    'common.right': 'Right',

    // Common CRUD
    'common.creating': 'Creating...',
    'common.updating': 'Updating...',
    'common.deleting': 'Deleting...',
    'common.create_success': 'Item created successfully.',
    'common.update_success': 'Item updated successfully.',
    'common.delete_success': 'Item deleted successfully.',
    'common.create_error': 'Error creating item.',
    'common.update_error': 'Error updating item.',
    'common.delete_error': 'Error deleting item.',
    'common.delete_confirm_message': 'Are you sure you want to delete {item}?',

    // Agent Manager
    'agent.panelTitle': 'Agent Control Panel',
    'agent.create': 'Create New Agent',
    'agent.name': 'Agent Name',
    'agent.type': 'Type',
    'agent.status': 'Status',
    'agent.schedule': 'Schedule',
    'agent.lastRun': 'Last Run',
    'agent.actions': 'Actions',
    'agent.runNow': 'Run',

    // Time
    'time.minutes_ago': 'minutes ago',
    'time.hour_ago': 'hour ago',
    'time.hours_ago': 'hours ago',
    'time.day_ago': 'day ago',
    'time.days_ago': 'days ago',
    'time.now': 'Now',
    'time.today': 'Today',
    'time.yesterday': 'Yesterday',
    'time.this_week': 'This week',
    'time.last_week': 'Last week',
    'time.this_month': 'This month',
    'time.last_month': 'Last month',
  },
  pt: {
    // Sidebar
    'sidebar.insightsHub': 'Hub de Insights',
    'sidebar.cognitoChat': 'Chat Cognito AI',
    'sidebar.knowledgeGraph': 'Grafo de Conhecimento',
    'sidebar.decisionJournal': 'Diário de Decisões',
    'sidebar.sessionPlanner': 'Planejador de Sessões',
    'sidebar.marketIntelligence': 'Inteligência de Mercado',
    'sidebar.agentPanel': 'Painel de Agentes',
    'sidebar.settings': 'Configurações',

    // Intelligence Hub
    'intelligenceHub.title': 'Hub de Inteligência',
    'intelligenceHub.subtitle': 'Conectando insights, impulsionando decisões.',

    // Header
    'header.title': 'GG.AI Labs',
    'header.subtitle': 'Painel do CEO',
    'header.search': 'Pesquisar em todos os sistemas...',

    // Navigation
    'nav.overview': 'Visão Geral Executiva',
    'nav.overview.desc': 'Painel principal com métricas chave',
    'nav.business_intelligence': 'Inteligência de Negócios',
    'nav.business_intelligence.desc': 'KPIs, métricas e análises',
    'nav.market_intelligence': 'Inteligência de Mercado',
    'nav.market_intelligence.desc': 'Oportunidades e tendências de mercado',
    'nav.predictive_analytics': 'Análise Preditiva',
    'nav.predictive_analytics.desc': 'Previsões e análise de cenários',
    'nav.ai_orchestrator': 'Orquestrador de Agentes AI',
    'nav.ai_orchestrator.desc': 'Gerencie a força de trabalho de IA',
    'nav.knowledge_graph': 'Grafo de Conhecimento',
    'nav.knowledge_graph.desc': 'Visualize conexões de conhecimento',
    'nav.synergy_intelligence': 'Inteligência de Sinergia',
    'nav.synergy_intelligence.desc': 'Descubra conexões ocultas',
    'nav.strategic_sessions': 'Sessões Estratégicas',
    'nav.strategic_sessions.desc': 'Planeje reuniões estratégicas',
    'nav.decision_journal': 'Diário de Decisões',
    'nav.decision_journal.desc': 'Acompanhe decisões e resultados',
    'nav.projects': 'Gestão de Projetos',
    'nav.projects.desc': 'Gerencie projetos ativos',
    'nav.obsidian': 'Segundo Cérebro',
    'nav.obsidian.desc': 'Integração com Obsidian',
    'nav.mcp': 'MCP Services',
    'nav.mcp.desc': 'Protocolos de serviço de IA',
    'nav.settings': 'Configurações',
    'nav.settings.desc': 'Configuração do sistema',

    // Metrics
    'metrics.title': 'Visão Geral Executiva',
    'metrics.subtitle': 'Business intelligence e métricas em tempo real',
    'metrics.revenue': 'Crescimento da Receita',
    'metrics.revenue.value': 'R$12.5M',
    'metrics.revenue.change': '+23.5% do último trimestre',
    'metrics.revenue.desc': 'Forte desempenho em todas as linhas de produtos',
    'metrics.ai_efficiency': 'Pontuação de Eficiência de IA',
    'metrics.ai_efficiency.value': '94.2%',
    'metrics.ai_efficiency.change': '+8.1% este mês',
    'metrics.ai_efficiency.desc': 'Agentes de IA operando com desempenho máximo',
    'metrics.active_projects': 'Projetos Ativos',
    'metrics.active_projects.value': '12',
    'metrics.active_projects.change': '3 lançados esta semana',
    'metrics.active_projects.desc': 'Iniciativas estratégicas no caminho certo',
    'metrics.team_productivity': 'Produtividade da Equipe',
    'metrics.team_productivity.value': '87%',
    'metrics.team_productivity.change': '+5.2% de melhoria',
    'metrics.team_productivity.desc': 'Aprimorado por insights de IA',

    // AI Insights
    'insights.title': 'Insights de IA',
    'insights.subtitle': 'Recomendações estratégicas do seu segundo cérebro',
    'insights.live': 'Análise ao Vivo',
    'insights.confidence': 'Confiança:',
    'insights.actionable': 'Acionável',
    'insights.priority.high': 'ALTA',
    'insights.priority.medium': 'MÉDIA',
    'insights.priority.low': 'BAIXA',
    'insights.expand': 'Expandir Análise',
    'insights.connected_notes': 'Notas Conectadas',
    'insights.create_plan': 'Criar Plano de Ação',
    'insights.question': 'Questionar Premissa',

    // Obsidian Integration
    'obsidian.title': 'Grafo de Conhecimento Obsidian',
    'obsidian.subtitle': 'Integração com o Segundo Cérebro',
    'obsidian.connected': 'Conectado',
    'obsidian.search': 'Pesquise em seu grafo de conhecimento...',
    'obsidian.recent': 'Nós de Conhecimento Recentes',
    'obsidian.generate': 'Gerar Insights de IA do Grafo de Conhecimento',

    // Feedback Loop Tracker
    'feedbackLoop.title': 'Monitor de Ciclo de Feedback',
    'feedbackLoop.subtitle': 'Monitorando ações e aprendizados automatizados',
    'feedbackLoop.loading': 'Carregando ações de feedback...',
    'feedbackLoop.error': 'Falha ao carregar as ações de feedback',
    'feedbackLoop.noActions': 'Nenhuma ação de feedback pendente.',
    'feedbackLoop.note': 'Nota do Segundo Cérebro',
    'feedbackLoop.project': 'Projeto Relacionado',
    'feedbackLoop.impact': 'Impacto',
    'feedbackLoop.processing': 'Processando feedback para o Segundo Cérebro...',
    'feedbackLoop.types.decision': 'Decisão',
    'feedbackLoop.types.insight_validation': 'Validação de Insight',
    'feedbackLoop.types.action_taken': 'Ação Tomada',
    'feedbackLoop.types.learning_captured': 'Aprendizado Capturado',

    // Project Overview
    'projects.title': 'Visão Geral de Projetos',
    'projects.subtitle': 'Iniciativas ativas e progresso',
    'projects.progress': 'Progresso',
    'projects.members': 'membros',
    'projects.new': 'Novo Projeto',
    'projects.status': 'Status',
    'projects.priority': 'Prioridade',
    'projects.budget': 'Orçamento',
    'projects.deadline': 'Prazo',
    'projects.team_size': 'Tamanho da Equipe',
    'projects.roi': 'ROI',
    'projects.description': 'Descrição',
    'projects.create': 'Criar Projeto',
    'projects.edit': 'Editar Projeto',
    'projects.delete': 'Excluir Projeto',
    'projects.save': 'Salvar',
    'projects.cancel': 'Cancelar',

    // MCP Integration
    'mcp.title': 'Integração MCP',
    'mcp.subtitle': 'Serviços do Protocolo de Contexto do Modelo',
    'mcp.active': 'Ativo',
    'mcp.queries': 'Consultas',
    'mcp.success_rate': 'Taxa de Sucesso',
    'mcp.last_response': 'Última Resposta',
    'mcp.query_all': 'Consultar Todos os Serviços MCP',
    'mcp.query': 'Consultar',
    'mcp.test_connection': 'Testar Conexão',
    'mcp.health': 'Saúde',
    'mcp.services': 'Serviços',
    'mcp.capabilities': 'Capacidades',

    // Quick Actions
    'actions.title': 'Ações Rápidas',
    'actions.analyze': 'Analisar Grafo de Conhecimento',
    'actions.strategy': 'Gerar Relatório de Estratégia',
    'actions.schedule': 'Agendar Revisão de IA',

    // Settings
    'settings.title': 'Configurações',
    'settings.api': 'Configuração da API',
    'settings.preferences': 'Preferências',
    'settings.notifications': 'Notificações',
    'settings.security': 'Segurança',
    'settings.data': 'Gerenciamento de Dados',
    'settings.save': 'Salvar Configurações',
    'settings.close': 'Fechar',
    'settings.export': 'Exportar Configurações',
    'settings.import': 'Importar Configurações',
    'settings.reset': 'Restaurar Padrões',

    // Notifications
    'notifications.title': 'Notificações',
    'notifications.mark_read': 'Marcar como Lida',
    'notifications.mark_all_read': 'Marcar Todas como Lidas',
    'notifications.delete': 'Excluir',
    'notifications.settings': 'Configurações de Notificação',
    'notifications.search': 'Buscar notificações...',
    'notifications.filter': 'Filtrar',
    'notifications.empty': 'Nenhuma notificação encontrada',

    // User Profile
    'profile.title': 'Conta',
    'profile.profile': 'Perfil',
    'profile.security': 'Segurança',
    'profile.billing': 'Faturamento',
    'profile.activity': 'Atividade',
    'profile.edit': 'Editar Perfil',
    'profile.save': 'Salvar Alterações',
    'profile.cancel': 'Cancelar',
    'profile.sign_out': 'Sair',
    'profile.change_password': 'Alterar Senha',
    'profile.enable_2fa': 'Habilitar 2FA',
    'profile.manage_keys': 'Gerenciar Chaves',

    // Business Intelligence
    'bi.title': 'Hub de Business Intelligence',
    'bi.subtitle': 'Métricas de negócios e análises de desempenho em tempo real',
    'bi.overview': 'Visão Geral',
    'bi.kpis': 'KPIs',
    'bi.metrics': 'Métricas',
    'bi.alerts': 'Alertas',
    'bi.refresh': 'Atualizar',
    'bi.export': 'Exportar',
    'bi.share': 'Compartilhar',

    // Market Intelligence
    'market.title': 'Motor de Inteligência de Mercado',
    'market.subtitle': 'Análise de mercado e descoberta de oportunidades com IA',
    'market.deep_analysis': 'Análise Profunda',
    'market.analyzing': 'Analisando...',
    'market.tabs.opportunities': 'Oportunidades de Mercado',
    'market.tabs.competitors': 'Inteligência Competitiva',
    'market.tabs.trends': 'Tendências de Mercado',
    'market.searchPlaceholder': 'Buscar oportunidades, concorrentes, tendências...',
    'market.filter.all': 'Todos os Mercados',
    'market.filter.healthcare': 'Saúde',
    'market.filter.enterprise': 'Software Corporativo',
    'market.filter.manufacturing': 'Manufatura',
    'market.filter.fintech': 'FinTech',
    'market.trends.soon': 'Análise de tendências de mercado em breve...',

    // Predictive Analytics
    'predictive.title': 'Análise Preditiva',
    'predictive.subtitle': 'Previsões e análise de cenários com IA',
    'predictive.predictions': 'Previsões',
    'predictive.scenarios': 'Análise de Cenários',
    'predictive.models': 'Modelos',
    'predictive.run_analysis': 'Executar Análise',

    // AI Orchestrator
    'orchestrator.title': 'Orquestrador de Agentes de IA',
    'orchestrator.subtitle': 'Gerencie e coordene sua força de trabalho de IA',
    'orchestrator.create_agent': 'Criar Agente',
    'orchestrator.assign_task': 'Atribuir Tarefa',
    'orchestrator.view_history': 'Ver Histórico',
    'orchestrator.optimize': 'Otimizar Fluxo de Trabalho',

    // Knowledge Graph
    'knowledge.title': 'Visualizador do Grafo de Conhecimento',
    'knowledge.subtitle': 'Exploração interativa do seu Segundo Cérebro',
    'knowledge.search': 'Buscar no grafo de conhecimento...',
    'knowledge.filter': 'Filtrar',
    'knowledge.analyze': 'Análise de IA',
    'knowledge.export': 'Exportar',
    'knowledge.share': 'Compartilhar',
    'knowledge.stats': 'Estatísticas do Grafo',

    // Synergy Intelligence
    'synergy.title': 'Inteligência de Sinergia Proativa',
    'synergy.subtitle': 'Descobrindo conexões latentes e oportunidades estratégicas',
    'synergy.analyzing': 'Analisando',
    'synergy.explore': 'Explorar Conexão',
    'synergy.schedule': 'Agendar Sessão',
    'synergy.create_note': 'Criar Nota de Análise',
    'synergy.deep_scan': 'Scan Profundo do Grafo de Conhecimento',

    // Strategic Sessions
    'sessions.title': 'Planejador de Sessões Estratégicas',
    'sessions.subtitle': 'Sessões de pensamento estratégico sugeridas por IA',
    'sessions.generate': 'Gerar Sessões de IA',
    'sessions.create': 'Criar Sessão',
    'sessions.schedule': 'Agendar',
    'sessions.view_details': 'Ver Detalhes',
    'sessions.participants': 'Participantes',
    'sessions.preparation': 'Notas de Preparação',
    'sessions.outcomes': 'Resultados Esperados',

    // Decision Journal
    'decisions.title': 'Diário de Decisões',
    'decisions.subtitle': 'Acompanhe decisões, resultados e aprendizados',
    'decisions.record': 'Registrar Decisão',
    'decisions.success_rate': 'Taxa de Sucesso',
    'decisions.confidence': 'Confiança Média',
    'decisions.total': 'Total de Decisões',
    'decisions.pending': 'Revisão Pendente',
    'decisions.search': 'Buscar decisões...',
    'decisions.generate_insights': 'Gerar Insights de Decisão',

    // Cognito Chat
    'cognitoChat.title': 'Cognito AI Chat',
    'cognitoChat.subtitle': 'Converse com a IA para obter insights e respostas em tempo real.',
    
    // Common
    'common.loading': 'Carregando...',
    'common.error': 'Erro',
    'common.success': 'Sucesso',
    'common.warning': 'Aviso',
    'common.info': 'Informação',
    'common.confirm': 'Confirmar',
    'common.cancel': 'Cancelar',
    'common.save': 'Salvar',
    'common.edit': 'Editar',
    'common.delete': 'Excluir',
    'common.create': 'Criar',
    'common.update': 'Atualizar',
    'common.search': 'Pesquisar',
    'common.filter': 'Filtrar',
    'common.export': 'Exportar',
    'common.import': 'Importar',
    'common.refresh': 'Atualizar',
    'common.view': 'Visualizar',
    'common.close': 'Fechar',
    'common.open': 'Abrir',
    'common.yes': 'Sim',
    'common.no': 'Não',
    'common.all': 'Todos',
    'common.none': 'Nenhum',
    'common.select': 'Selecionar',
    'common.clear': 'Limpar',
    'common.reset': 'Redefinir',
    'common.apply': 'Aplicar',
    'common.submit': 'Enviar',
    'common.next': 'Próximo',
    'common.previous': 'Anterior',
    'common.back': 'Voltar',
    'common.forward': 'Avançar',
    'common.up': 'Cima',
    'common.down': 'Baixo',
    'common.left': 'Esquerda',
    'common.right': 'Direita',

    // Common CRUD
    'common.creating': 'Criando...',
    'common.updating': 'Atualizando...',
    'common.deleting': 'Deletando...',
    'common.create_success': 'Item criado com sucesso.',
    'common.update_success': 'Item atualizado com sucesso.',
    'common.delete_success': 'Item deletado com sucesso.',
    'common.create_error': 'Erro ao criar o item.',
    'common.update_error': 'Erro ao atualizar o item.',
    'common.delete_error': 'Erro ao deletar o item.',
    'common.delete_confirm_message': 'Tem certeza que deseja deletar {item}?',

    // Agent Manager
    'agent.panelTitle': 'Painel de Controle de Agentes',
    'agent.create': 'Criar Novo Agente',
    'agent.name': 'Nome do Agente',
    'agent.type': 'Tipo',
    'agent.status': 'Status',
    'agent.schedule': 'Agendamento',
    'agent.lastRun': 'Última Execução',
    'agent.actions': 'Ações',
    'agent.runNow': 'Executar',
    
    // Time
    'time.minutes_ago': 'minutos atrás',
    'time.hour_ago': 'hora atrás',
    'time.hours_ago': 'horas atrás',
    'time.day_ago': 'dia atrás',
    'time.days_ago': 'dias atrás',
    'time.now': 'Agora',
    'time.today': 'Hoje',
    'time.yesterday': 'Ontem',
    'time.this_week': 'Esta semana',
    'time.last_week': 'Semana passada',
    'time.this_month': 'Este mês',
    'time.last_month': 'Mês passado'
  }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('pt');

  const t = (key: string): string => {
    const langTranslations = translations[language];
    if (!langTranslations) {
      return key;
    }
    return langTranslations[key as keyof typeof langTranslations] || key;
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
