import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import McpToolsRenderer from '../McpToolsRenderer';

// Mock de ícones
vi.mock('lucide-react', () => ({
  Cpu: vi.fn(),
}));

describe('McpToolsRenderer', () => {
  const mockTools = [
    {
      id: 'tool-1',
      title: 'Test Tool',
      description: 'A test MCP tool',
    },
    {
      id: 'tool-2', 
      title: 'Debug Tool',
      description: 'A debugging tool',
    },
  ];

  it('renders MCP tools correctly', () => {
    render(
      <McpToolsRenderer
        availableMcpTools={mockTools}
        onToolClick={vi.fn()}
      />
    );

    expect(screen.getByText('Test Tool')).toBeInTheDocument();
    expect(screen.getByText('Debug Tool')).toBeInTheDocument();
    expect(screen.getByText('A test MCP tool')).toBeInTheDocument();
    expect(screen.getByText('A debugging tool')).toBeInTheDocument();
  });

  it('displays tool IDs as code', () => {
    render(
      <McpToolsRenderer
        availableMcpTools={mockTools}
        onToolClick={vi.fn()}
      />
    );

    expect(screen.getByText('tool-1')).toBeInTheDocument();
    expect(screen.getByText('tool-2')).toBeInTheDocument();
  });

  it('handles empty tools list', () => {
    render(
      <McpToolsRenderer
        availableMcpTools={[]}
        onToolClick={vi.fn()}
      />
    );

    // Should not crash and should show empty state
    expect(document.querySelector('.space-y-3')).toBeInTheDocument();
  });
});
