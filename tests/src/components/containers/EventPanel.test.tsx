
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventPanel } from '@/components/containers/EventPanel';
import { useGameStore } from '@/store';
import { EventSystem } from '@/systems/event/EventSystem';
import { ItemSystem } from '@/systems/item/ItemSystem';
import { GameEvent } from '@/types';

// Mock store
vi.mock('@/store', () => ({
  useGameStore: vi.fn(),
}));

// Mock systems
vi.mock('@/systems/event/EventSystem', () => ({
  EventSystem: {
    getAvailableChoices: vi.fn(),
  },
}));

vi.mock('@/systems/item/ItemSystem', () => ({
  ItemSystem: {
    getMatchingItems: vi.fn(),
  },
}));

const mockEvent: GameEvent = {
  id: 'event1',
  name: 'Test Event 1',
  description: 'Description 1',
  category: 'FIXED',
  execution: {
    repeatable: true,
    actionPointCost: 2,
    moneyCost: 50,
    moneyCurrency: 'CNY',
  },
  slots: [],
  choices: [
    { id: 'c1', name: 'Choice 1', effects: {} },
  ],
  scenes: ['act1'],
};



describe('EventPanel Component', () => {
  const mockState = {
    character: {
      resources: {
        money: { cny: 100, usd: 0 },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useGameStore as any).mockImplementation((selector?: any) => {
      const store = { state: mockState };
      return typeof selector === 'function' ? selector(store) : store;
    });
    (EventSystem.getAvailableChoices as any).mockReturnValue(mockEvent.choices);
    (ItemSystem.getMatchingItems as any).mockReturnValue([]);
  });

  it('renders available events grouped by category', () => {
    render(
      <EventPanel
        mode="list"
        onExecuteEvent={vi.fn()}
        actionPoints={5}
      />
    );

    expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    expect(screen.getByText('Chain Event')).toBeInTheDocument();
    
    // Check categories
    expect(screen.getByText('待办事项')).toBeInTheDocument(); // Chain events header
    expect(screen.getByText('常规行动')).toBeInTheDocument(); // Fixed events header
  });

  it('expands event details on click', () => {
    render(
      <EventPanel
        mode="list"
        onExecuteEvent={vi.fn()}
        actionPoints={5}
      />
    );

    const eventHeader = screen.getByText('Test Event 1');
    fireEvent.click(eventHeader);

    expect(screen.getByText('Description 1')).toBeInTheDocument();
    expect(screen.getByText('Choice 1')).toBeInTheDocument();
  });

  it('handles event execution', () => {
    const onExecute = vi.fn();
    render(
      <EventPanel
        mode="list"
        onExecuteEvent={onExecute}
        actionPoints={5}
      />
    );

    // Expand
    fireEvent.click(screen.getByText('Test Event 1'));

    // Select choice
    const choiceButton = screen.getByText('Choice 1').closest('button');
    fireEvent.click(choiceButton!);

    // Execute
    const executeButton = screen.getByText('执行').closest('button');
    fireEvent.click(executeButton!);

    expect(onExecute).toHaveBeenCalledWith('event1', 'c1', {});
  });

  it('disables execution if action points are insufficient', () => {
    render(
      <EventPanel
        mode="list"
        onExecuteEvent={vi.fn()}
        actionPoints={1} // Cost is 2
      />
    );

    // Expand
    fireEvent.click(screen.getByText('Test Event 1'));
    
    // Check AP warning in header
    expect(screen.getByText('AP: 2')).toHaveClass('text-red-400');

    // Check execute button
    const executeButton = screen.getByText('行动点不足').closest('button');
    expect(executeButton).toBeDisabled();
  });

  it('disables execution if money is insufficient', () => {
    const poorState = {
      character: {
        resources: {
          money: { cny: 0, usd: 0 }, // Cost is 50
        },
      },
    };
    (useGameStore as any).mockReturnValue({ state: poorState });
    (useGameStore as any).mockImplementation((selector?: any) => {
      const store = { state: poorState };
      return typeof selector === 'function' ? selector(store) : store;
    });

    render(
      <EventPanel
        mode="list"
        onExecuteEvent={vi.fn()}
        actionPoints={5}
      />
    );

    // The test expectation needs to be updated since mode="list" uses presenter
    // which gets events from store, not from props
    // Check the component renders
    expect(screen.getByText('可用行动')).toBeInTheDocument();

    // Check execute button
    const executeButton = screen.getByText('资金不足').closest('button');
    expect(executeButton).toBeDisabled();
  });
});
