import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { IconRail } from '../../packages/frontend/src/components/IconRail';
import { useAppStore } from '../../packages/frontend/src/store/index';

beforeEach(() => {
  useAppStore.setState({
    activeView: 'chat',
    connectionStatus: 'disconnected',
    activeFeature: null,
  });
});

afterEach(() => {
  cleanup();
});

describe('IconRail', () => {
  it('renders all three nav items (Chat, Docs, Kanban)', () => {
    render(<IconRail />);

    expect(screen.getByTitle('Chat')).toBeInTheDocument();
    expect(screen.getByTitle('Docs')).toBeInTheDocument();
    expect(screen.getByTitle('Kanban')).toBeInTheDocument();
  });

  it('clicking a nav item switches active view in store', () => {
    render(<IconRail />);

    expect(useAppStore.getState().activeView).toBe('chat');

    fireEvent.click(screen.getByTitle('Docs'));
    expect(useAppStore.getState().activeView).toBe('docs');

    fireEvent.click(screen.getByTitle('Kanban'));
    expect(useAppStore.getState().activeView).toBe('kanban');
  });

  it('active item has visual indicator class', () => {
    render(<IconRail />);

    // Initially chat is active
    const chatButton = screen.getByTitle('Chat');
    const docsButton = screen.getByTitle('Docs');
    const kanbanButton = screen.getByTitle('Kanban');

    expect(chatButton.className).toContain('bg-zinc-100');
    expect(docsButton.className).not.toContain('bg-zinc-100');
    expect(kanbanButton.className).not.toContain('bg-zinc-100');

    // Click Kanban and verify indicator moves
    fireEvent.click(kanbanButton);
    expect(kanbanButton.className).toContain('bg-zinc-100');
    expect(chatButton.className).not.toContain('bg-zinc-100');
  });
});
