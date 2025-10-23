// Setup file for backend tests

// Extend Jest matchers
require('@testing-library/jest-dom');

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock process.env for tests
process.env.NODE_ENV = 'test';

// Global test utilities
global.createMockReq = (overrides = {}) => ({
  user: { id: 'test-user-123', email: 'test@example.com' },
  headers: { authorization: 'Bearer test-token' },
  path: '/api/brain/search',
  query: {},
  ...overrides,
});

global.createMockResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  setHeader: jest.fn().mockReturnThis(),
  write: jest.fn().mockReturnThis(),
  end: jest.fn().mockReturnThis(),
});

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
  jest.restoreAllMocks();
});
