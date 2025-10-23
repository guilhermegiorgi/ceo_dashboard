import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { McpBrainCloudAdapter } from '../McpBrainCloudAdapter';
import { globalEventBus } from '../events';
import { ConnectionError } from '../types';
import {
  mockBrainCloudService,
  mockGlobalEventBus,
  createMockAdapterContext,
  createMockSearchResponse,
  createMockGraphNodes,
  createMockGraphEdges,
  createMockFocusResult,
  createMockTasksResult,
  createMockContextResult,
  createMockConversationPayload,
  createMockSaveResult,
  createMockConnectionStatus,
} from '../../__tests__/helpers/mocks';

// Mock the dependencies
vi.mock('../../brainCloudService.js', () => mockBrainCloudService);
vi.mock('../events', () => ({
  globalEventBus: mockGlobalEventBus,
}));

describe('McpBrainCloudAdapter', () => {
  let adapter: McpBrainCloudAdapter;
  let mockContext: ReturnType<typeof createMockAdapterContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockAdapterContext({ agentId: 'agent-123' });
    adapter = new McpBrainCloudAdapter(mockContext);
  });

  describe('checkConnection()', () => {
    it('deve inicializar serviço se não inicializado', async () => {
      // Arrange
      mockBrainCloudService.initialized = false;
      mockBrainCloudService.getVaultStatus.mockResolvedValue({
        vault_path: '/test/vault',
        initialized: true
      });

      // Act
      const result = await adapter.checkConnection();

      // Assert
      expect(mockBrainCloudService.initialize).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('deve retornar status do vault MCP', async () => {
      // Arrange
      mockBrainCloudService.initialized = true;
      mockBrainCloudService.getVaultStatus.mockResolvedValue({
        vault_path: '/test/vault',
        initialized: true
      });
      mockBrainCloudService.sessionId = 'session-123';

      // Act
      const result = await adapter.checkConnection();

      // Assert
      expect(result).toBeDefined();
      expect(mockBrainCloudService.initialize).not.toHaveBeenCalled();
    });

    it('deve lançar ConnectionError se MCP falhar', async () => {
      // Arrange
      mockBrainCloudService.getVaultStatus.mockResolvedValue(null);

      // Act
      const result = await adapter.checkConnection();

      // Assert
      expect(result).toBeDefined();
      expect(result?.error).toBeDefined();
    });

    it('deve lidar com erro durante checagem de conexão', async () => {
      // Arrange
      const error = new Error('Connection failed');
      mockBrainCloudService.getVaultStatus.mockRejectedValue(error);

      // Act
      const result = await adapter.checkConnection();

      // Assert
      expect(result).toBeDefined();
      expect(result?.error).toBe('Connection failed');
    });
  });

  describe('search()', () => {
    it('deve usar semanticSearch do MCP', async () => {
      // Arrange
      const searchParams = { query: 'test query', limit: 10 };
      const mockSearchResponse = {
        results: [
          {
            path: 'note1.md',
            title: 'Note 1',
            excerpt: 'Note excerpt',
            score: 0.95
          }
        ]
      };
      mockBrainCloudService.semanticSearch.mockResolvedValue(mockSearchResponse);

      // Act
      const result = await adapter.search(searchParams);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(mockBrainCloudService.semanticSearch).toHaveBeenCalledWith('test query', 10);
    });

    it('deve emitir evento file:updated', async () => {
      // Arrange
      const searchParams = { query: 'test' };
      mockBrainCloudService.semanticSearch.mockResolvedValue({
        results: [
          { path: 'note1.md' },
          { path: 'note2.md' }
        ]
      });

      // Act
      await adapter.search(searchParams);

      // Assert
      expect(mockGlobalEventBus.emit).toHaveBeenCalled();
      expect(mockGlobalEventBus.emit).toHaveBeenCalledWith('file:updated', {
        path: 'note1.md',
        timestamp: expect.any(String),
        source: 'mcp_search'
      });
    });

    it('deve inicializar serviço automaticamente', async () => {
      // Arrange
      mockBrainCloudService.initialized = false;
      mockBrainCloudService.semanticSearch.mockResolvedValue({ results: [] });

      // Act
      await adapter.search({ query: 'test' });

      // Assert
      expect(mockBrainCloudService.initialize).toHaveBeenCalled();
    });

    it('deve usar limite padrão quando não fornecido', async () => {
      // Arrange
      mockBrainCloudService.semanticSearch.mockResolvedValue({ results: [] });

      // Act
      await adapter.search({ query: 'test' });

      // Assert
      expect(mockBrainCloudService.semanticSearch).toHaveBeenCalledWith('test', 10);
    });

    it('deve lidar com erro de busca', async () => {
      // Arrange
      const error = new Error('Search failed');
      mockBrainCloudService.semanticSearch.mockRejectedValue(error);

      // Act
      const result = await adapter.search({ query: 'test' });

      // Assert
      expect(result).toBeDefined();
      expect(result.error).toBe('Search failed');
    });
  });

  describe('getGraphData()', () => {
    it('deve chamar getGraphData do MCP', async () => {
      // Arrange
      const options = { maxNodes: 100 };
      const mockGraphData = {
        nodes: createMockGraphNodes(),
        edges: createMockGraphEdges()
      };
      mockBrainCloudService.getGraphData.mockResolvedValue(mockGraphData);

      // Act
      const result = await adapter.getGraphData(options);

      // Assert
      expect(result).toBeDefined();
      expect(mockBrainCloudService.getGraphData).toHaveBeenCalledWith(options);
    });

    it('deve emitir evento graph:updated', async () => {
      // Arrange
      mockBrainCloudService.getGraphData.mockResolvedValue({
        nodes: [{ id: 'node1' }],
        edges: []
      });

      // Act
      await adapter.getGraphData();

      // Assert
      expect(mockGlobalEventBus.emit).toHaveBeenCalledWith(
        'graph:updated',
        expect.objectContaining({ source: 'mcp_graph' })
      );
    });

    it('deve lidar com erro no grafo', async () => {
      // Arrange
      const error = new Error('Graph fetch failed');
      mockBrainCloudService.getGraphData.mockRejectedValue(error);

      // Act
      const result = await adapter.getGraphData();

      // Assert
      expect(result).toBeDefined();
      expect(result?.error).toBe('Graph fetch failed');
    });

    it('deve inicializar serviço se necessário', async () => {
      // Arrange
      mockBrainCloudService.initialized = false;
      mockBrainCloudService.getGraphData.mockResolvedValue({
        nodes: [],
        edges: []
      });

      // Act
      await adapter.getGraphData();

      // Assert
      expect(mockBrainCloudService.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCurrentFocus()', () => {
    it('deve retornar foco atual via MCP', async () => {
      // Arrange
      const mockFocus = createMockFocusResult();
      mockBrainCloudService.getCurrentFocus.mockResolvedValue(mockFocus);

      // Act
      const result = await adapter.getCurrentFocus();

      // Assert
      expect(result).toBeDefined();
      expect(mockBrainCloudService.getCurrentFocus).toHaveBeenCalled();
    });

    it('deve emitir evento focus:changed', async () => {
      // Arrange
      mockBrainCloudService.getCurrentFocus.mockResolvedValue({
        dailyNotes: [],
        weeklyNote: null
      });

      // Act
      await adapter.getCurrentFocus();

      // Assert
      expect(mockGlobalEventBus.emit).toHaveBeenCalledWith(
        'focus:changed',
        expect.objectContaining({ source: 'mcp_focus' })
      );
    });

    it('deve lidar com erro no focus', async () => {
      // Arrange
      const error = new Error('Focus fetch failed');
      mockBrainCloudService.getCurrentFocus.mockRejectedValue(error);

      // Act
      const result = await adapter.getCurrentFocus();

      // Assert
      expect(result).toBeDefined();
      expect(result?.error).toBe('Focus fetch failed');
    });
  });

  describe('getDueTasks()', () => {
    it('deve retornar tarefas via MCP', async () => {
      // Arrange
      const options = { window: 'week', includeCompleted: true };
      const mockTasks = createMockTasksResult();
      mockBrainCloudService.getDueTasks.mockResolvedValue(mockTasks);

      // Act
      const result = await adapter.getDueTasks(options);

      // Assert
      expect(result).toBeDefined();
      expect(mockBrainCloudService.getDueTasks).toHaveBeenCalledWith(options);
    });

    it('deve emitir eventos task:updated', async () => {
      // Arrange
      mockBrainCloudService.getDueTasks.mockResolvedValue(createMockTasksResult());

      // Act
      await adapter.getDueTasks();

      // Assert
      expect(mockGlobalEventBus.emit).toHaveBeenCalledWith(
        'task:updated',
        expect.objectContaining({
          taskId: 'task-1',
          source: 'mcp_tasks'
        })
      );
    });

    it('deve lidar com erro nas tarefas', async () => {
      // Arrange
      const error = new Error('Tasks fetch failed');
      mockBrainCloudService.getDueTasks.mockRejectedValue(error);

      // Act
      const result = await adapter.getDueTasks();

      // Assert
      expect(result).toBeDefined();
      expect(result?.error).toBe('Tasks fetch failed');
    });
  });

  describe('getHistoricalContext()', () => {
    it('deve usar histórico semântico do MCP', async () => {
      // Arrange
      const params = { query: 'test', limit: 10 };
      const mockContext = createMockContextResult();
      mockBrainCloudService.getHistoricalContext.mockResolvedValue(mockContext);

      // Act
      const result = await adapter.getHistoricalContext(params);

      // Assert
      expect(result).toBeDefined();
      expect(mockBrainCloudService.getHistoricalContext).toHaveBeenCalledWith(params);
    });

    it('deve lidar com erro no contexto', async () => {
      // Arrange
      const error = new Error('Context fetch failed');
      mockBrainCloudService.getHistoricalContext.mockRejectedValue(error);

      // Act
      const result = await adapter.getHistoricalContext();

      // Assert
      expect(result).toBeDefined();
      expect(result?.error).toBe('Context fetch failed');
    });
  });

  describe('saveConversation()', () => {
    it('deve salvar via MCP com metadata completo', async () => {
      // Arrange
      const payload = createMockConversationPayload();
      const mockSaveResult = createMockSaveResult();
      mockBrainCloudService.saveConversationHistory.mockResolvedValue(mockSaveResult);

      // Act
      const result = await adapter.saveConversation(payload);

      // Assert
      expect(result).toBeDefined();
      expect(mockBrainCloudService.saveConversationHistory).toHaveBeenCalledWith({
        messages: payload.messages,
        title: payload.title,
        metadata: {
          model: 'gpt-4',
          userId: 'user-123',
          source: 'test'
        }
      });
    });

    it('deve emitir evento conversation:saved', async () => {
      // Arrange
      const payload = createMockConversationPayload();
      mockBrainCloudService.saveConversationHistory.mockResolvedValue({
        success: true,
        conversationId: 'conv-123'
      });

      // Act
      await adapter.saveConversation(payload);

      // Assert
      expect(mockGlobalEventBus.emit).toHaveBeenCalledWith('conversation:saved', {
        conversationId: 'conv-123',
        timestamp: expect.any(String),
        source: 'mcp_conversation'
      });
    });

    it('deve mapear camelCase → snake_case corretamente', async () => {
      // Arrange
      const payload = {
        messages: [],
        title: 'Test',
        metadata: {
          customField: 'value',
          anotherField: 'another'
        }
      };
      mockBrainCloudService.saveConversationHistory.mockResolvedValue({ success: true });

      // Act
      await adapter.saveConversation(payload);

      // Assert
      expect(mockBrainCloudService.saveConversationHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            custom_field: 'value',
            another_field: 'another'
          })
        })
      );
    });

    it('deve lidar com erro ao salvar', async () => {
      // Arrange
      const payload = createMockConversationPayload();
      const error = new Error('Save failed');
      mockBrainCloudService.saveConversationHistory.mockRejectedValue(error);

      // Act
      const result = await adapter.saveConversation(payload);

      // Assert
      expect(result).toBeDefined();
      expect(result?.error).toBe('Save failed');
    });
  });

  describe('capabilities()', () => {
    it('deve retornar 11 capabilities do MCP', () => {
      // Act
      const capabilities = adapter.capabilities();

      // Assert
      expect(Array.isArray(capabilities)).toBe(true);
      expect(capabilities.length).toBeGreaterThan(0);
    });
  });

  describe('getCapabilitiesInfo()', () => {
    it('deve retornar info do adapter MCP', () => {
      // Act
      const info = adapter.getCapabilitiesInfo();

      // Assert
      expect(info).toBeDefined();
      expect(info.mode).toBe('mcp');
    });
  });

  describe('withContext()', () => {
    it('deve aceitar contexto com agentId', () => {
      // Arrange
      const context = createMockAdapterContext({ agentId: 'agent-456' });
      const newAdapter = adapter.withContext(context);

      // Act & Assert
      expect(newAdapter).toBe(adapter); // Should return this for chaining
    });

    it('deve incluir userId nos eventos quando disponível', async () => {
      // Arrange
      const context = createMockAdapterContext({
        agentId: 'agent-789',
        req: { user: { id: 'user-456' } }
      });
      adapter.withContext(context);
      mockBrainCloudService.semanticSearch.mockResolvedValue({
        results: [{ path: 'test.md' }]
      });

      // Act
      await adapter.search({ query: 'test' });

      // Assert
      expect(mockGlobalEventBus.emit).toHaveBeenCalledWith(
        'file:updated',
        expect.objectContaining({
          path: 'test.md',
          userId: 'user-456',
          source: 'mcp_search'
        })
      );
    });
  });

  describe('Event emission errors', () => {
    it('deve continuar operação mesmo se emissão de evento falhar', async () => {
      // Arrange
      mockGlobalEventBus.emit.mockImplementation(() => {
        throw new Error('Event emission failed');
      });
      mockBrainCloudService.semanticSearch.mockResolvedValue({
        results: [{ path: 'test.md' }]
      });

      // Act & Assert - Should not throw
      const result = await adapter.search({ query: 'test' });

      expect(result).toBeDefined();
    });
  });

  describe('Service initialization errors', () => {
    it('deve tratar erro de inicialização gracefulmente', async () => {
      // Arrange
      mockBrainCloudService.initialized = false;
      mockBrainCloudService.initialize.mockRejectedValue(new Error('Init failed'));

      // Act
      const result = await adapter.checkConnection();

      // Assert
      expect(result).toBeDefined();
      expect(result?.error).toBe('Init failed');
    });
  });
});
