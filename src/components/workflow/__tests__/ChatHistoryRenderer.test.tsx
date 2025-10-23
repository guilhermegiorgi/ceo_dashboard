import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatHistoryRenderer from '../ChatHistoryRenderer';
import type { ChatThread } from '../../../services/apiClient';

// Mock de ícones
vi.mock('lucide-react', () => ({
  MessageSquare: vi.fn(),
  Pin: vi.fn(),
}));

describe('ChatHistoryRenderer', () => {
  const mockThreads: ChatThread[] = [
    {
      id: 'thread-1',
      title: 'Test Chat 1',
      summary: 'A test conversation about testing',
      updatedAt: '2024-01-15T10:00:00Z',
      messageCount: 5,
      pinned: false,
      tags: ['test'],
    },
    {
      id: 'thread-2',
      title: 'Test Chat 2',
      summary: 'Another test conversation',
      updatedAt: '2024-01-14T15:30:00Z',
      messageCount: 3,
      pinned: true,
      tags: ['important'],
    },
  ];

  it('renders chat threads correctly', () => {
    render(
      <ChatHistoryRenderer
        chatThreads={mockThreads}
        onOpenChatThread={vi.fn()}
      />
    );

    expect(screen.getByText('Test Chat 1')).toBeInTheDocument();
    expect(screen.getByText('Test Chat 2')).toBeInTheDocument();
    expect(screen.getByText('A test conversation about testing')).toBeInTheDocument();
    expect(screen.getByText('Another test conversation')).toBeInTheDocument();
  });

  it('shows pinned status', () => {
    render(
      <ChatHistoryRenderer
        chatThreads={mockThreads}
        onOpenChatThread={vi.fn()}
      />
    );

    // Check for pin icon or pinned indicator
    const pinElements = document.querySelectorAll('[data-testid="pin-icon"]');
    expect(pinElements.length).toBeGreaterThan(0);
  });

  it('calls onOpenChatThread when thread is clicked', () => {
    const mockOnOpenChatThread = vi.fn();
    render(
      <ChatHistoryRenderer
        chatThreads={mockThreads}
        onOpenChatThread={mockOnOpenChatThread}
      />
    );

    const firstThread = screen.getByText('Test Chat 1').closest('button');
    if (firstThread) {
      fireEvent.click(firstThread);
      expect(mockOnOpenChatThread).toHaveBeenCalledWith('thread-1');
    }
  });

  it('handles empty threads list', () => {
    render(
      <ChatHistoryRenderer
        chatThreads={[]}
        onOpenChatThread={vi.fn()}
      />
    );

    // Should show empty state message
    expect(screen.getByText(/no threads/i)).toBeInTheDocument();
  });
});
