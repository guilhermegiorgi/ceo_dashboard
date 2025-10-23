import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShortcutsRenderer from '../ShortcutsRenderer';

// Mock de ícones
vi.mock('lucide-react', () => ({
  Command: vi.fn(),
  Option: vi.fn(),
}));

describe('ShortcutsRenderer', () => {
  const mockShortcuts = [
    {
      combo: ['Cmd', 'K'],
      description: 'Open command palette',
    },
    {
      combo: ['Shift', '?'],
      description: 'Show help',
    },
  ];

  it('renders shortcuts correctly', () => {
    render(
      <ShortcutsRenderer
        shortcutList={mockShortcuts}
      />
    );

    expect(screen.getByText('Open command palette')).toBeInTheDocument();
    expect(screen.getByText('Show help')).toBeInTheDocument();
    expect(screen.getByText('Cmd')).toBeInTheDocument();
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('displays key combinations properly', () => {
    render(
      <ShortcutsRenderer
        shortcutList={mockShortcuts}
      />
    );

    const keys = screen.getAllByTestId(/key-/);
    expect(keys).toHaveLength(4); // Cmd, K, Shift, ?
  });

  it('handles empty shortcuts list', () => {
    render(
      <ShortcutsRenderer
        shortcutList={[]}
      />
    );

    expect(document.querySelector('.space-y-3')).toBeInTheDocument();
  });
});
