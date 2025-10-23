import type { 
  SearchResultItem, 
  GraphNode, 
  GraphEdge, 
  DailyNote, 
  TaskItem, 
  ContextItem 
} from '../../adapters/types';

export const createMockReq = (overrides: any = {}) => ({
  user: { id: 'user-123', email: 'test@example.com' },
  headers: { authorization: 'Bearer valid-token' },
  path: '/api/brain/search',
  query: {},
  ...overrides,
});

export const createMockAdapterContext = (overrides: any = {}) => ({
  req: createMockReq(),
  agentId: undefined,
  source: 'test',
  ...overrides,
});

export const createMockSearchResponse = (): SearchResultItem[] => [
  { 
    path: 'note1.md', 
    title: 'Note 1', 
    snippet: 'Test note 1 content',
    score: 0.95,
    metadata: { created: '2024-01-01', updated: '2024-01-01' },
    tags: ['test', 'note']
  },
  { 
    path: 'note2.md', 
    title: 'Note 2', 
    snippet: 'Test note 2 content',
    score: 0.87,
    metadata: { created: '2024-01-02', updated: '2024-01-02' },
    tags: ['test', 'note']
  },
];

export const createMockGraphNodes = (): GraphNode[] => [
  { 
    id: 'node1', 
    type: 'note', 
    title: 'Note 1',
    path: 'note1.md',
    metadata: { created: '2024-01-01' }
  },
  { 
    id: 'node2', 
    type: 'project', 
    title: 'Project 1',
    path: 'project1.md',
    metadata: { created: '2024-01-02' }
  },
];

export const createMockGraphEdges = (): GraphEdge[] => [
  { 
    source: 'node1', 
    target: 'node2', 
    type: 'references',
    metadata: { created: '2024-01-01' }
  },
];

export const createMockFocusResult = () => ({
  dailyNotes: [
    {
      date: '2024-01-01',
      title: 'Daily Note - Jan 1, 2024',
      path: 'Daily/2024-01-01.md',
      content: 'Daily note content',
      metadata: { created: '2024-01-01', updated: '2024-01-01' }
    } as DailyNote,
    {
      date: '2024-01-02',
      title: 'Daily Note - Jan 2, 2024',
      path: 'Daily/2024-01-02.md',
      content: 'Daily note content 2',
      metadata: { created: '2024-01-02', updated: '2024-01-02' }
    } as DailyNote,
  ],
  weeklyNote: {
    date: '2024-W01',
    title: 'Week 1 - 2024',
    path: '5 - INSIGHTS-IA/FOCO-SEMANAL.md',
    content: 'Weekly note content',
    metadata: { created: '2024-01-01', updated: '2024-01-01' }
  } as DailyNote,
});

export const createMockTasksResult = () => ({
  tasks: [
    {
      id: 'task-1',
      title: 'Test task 1',
      status: 'pending',
      priority: 'high',
      dueDate: '2024-01-15',
      path: 'Tasks/task-1.md',
    } as TaskItem,
    {
      id: 'task-2',
      title: 'Test task 2',
      status: 'completed',
      priority: 'medium',
      dueDate: '2024-01-10',
      path: 'Tasks/task-2.md',
    } as TaskItem,
  ],
  overdue: [],
  upcoming: [
    {
      id: 'task-1',
      title: 'Test task 1',
      status: 'pending',
      priority: 'high',
      dueDate: '2024-01-15',
      path: 'Tasks/task-1.md',
    } as TaskItem,
  ],
});

export const createMockContextResult = (): ContextItem[] => [
  {
    title: 'Relevant item 1',
    path: 'item1.md',
    snippet: 'Item 1 content',
    score: 0.92,
    metadata: { created: '2024-01-01', updated: '2024-01-01' },
    source: 'search'
  },
  {
    title: 'Relevant item 2',
    path: 'item2.md',
    snippet: 'Item 2 content',
    score: 0.87,
    metadata: { created: '2024-01-02', updated: '2024-01-02' },
    source: 'historical'
  },
];

export const createMockConversationPayload = () => ({
  messages: [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Test message 1',
      timestamp: '2024-01-01T10:00:00Z',
      metadata: { source: 'chat' }
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Test response 1',
      timestamp: '2024-01-01T10:01:00Z',
      metadata: { source: 'ai' }
    }
  ],
  title: 'Test Conversation',
  metadata: {
    model: 'gpt-4',
    userId: 'user-123',
    source: 'test'
  }
});

export const createMockSaveResult = () => ({
  success: true,
  conversationId: 'conv-123',
  chunks: ['chunk-1', 'chunk-2'],
  timestamp: '2024-01-01T10:00:00Z',
  path: 'Conversations/Test Conversation.md'
});

export const createMockConnectionStatus = (connected: boolean = true) => ({
  connected,
  mode: connected ? 'rest' : 'disconnected',
  endpoint: connected ? 'http://localhost:8080/api/brain' : undefined,
  error: connected ? undefined : 'Connection failed',
  timestamp: '2024-01-01T10:00:00Z'
});

// Mock events for testing SSE
export const createMockBrainEvent = (type: string, data: any = {}) => ({
  type,
  timestamp: new Date().toISOString(),
  data,
  userId: 'user-123',
  source: 'test'
});

// Mock BrainCloudClient
export const mockBrainCloudClient = {
  search: vi.fn(),
  getGraphData: vi.fn(),
  getCurrentFocus: vi.fn(),
  getDueTasks: vi.fn(),
  getHistoricalContext: vi.fn(),
  saveConversation: vi.fn(),
};

// Mock BrainCloudService (for MCP adapter)
export const mockBrainCloudService = {
  initialize: vi.fn(),
  getVaultStatus: vi.fn(),
  semanticSearch: vi.fn(),
  getGraphData: vi.fn(),
  getCurrentFocus: vi.fn(),
  getDueTasks: vi.fn(),
  getHistoricalContext: vi.fn(),
  saveConversationHistory: vi.fn(),
  initialized: false,
};

// Mock global event bus
export const mockGlobalEventBus = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  removeAllListeners: vi.fn(),
};
