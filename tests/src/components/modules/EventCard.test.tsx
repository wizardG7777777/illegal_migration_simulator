
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { EventCard } from '@/components/modules/EventCard';
import { GameEvent, EventCategory } from '@/types';

// Mock types
const mockEvent: GameEvent = {
  id: 'test_event',
  name: 'Test Event',
  description: 'This is a test event description.',
  category: 'FIXED' as EventCategory,
  execution: {
    repeatable: true,
    actionPointCost: 2,
    moneyCost: 100,
    moneyCurrency: 'CNY',
  },
  slots: [
    {
      id: 'slot1',
      name: 'Required Slot',
      tags: ['tool'],
      required: true,
      description: 'A required tool slot',
    },
    {
      id: 'slot2',
      name: 'Optional Slot',
      tags: ['food'],
      required: false,
      description: 'An optional food slot',
    },
  ],
  choices: [
    {
      id: 'choice1',
      name: 'Option 1',
      description: 'First option',
    },
    {
      id: 'choice2',
      name: 'Option 2 (Attribute Check)',
      description: 'Second option',
      condition: {
        type: 'ATTRIBUTE',
        attribute: 'strength',
        operator: '>=',
        value: 10,
      },
    },
  ],
  scenes: ['scene1'],
};

const mockInventoryItems = [
  { itemId: 'item1', name: 'Hammer', tags: ['tool'], priority: 1 },
  { itemId: 'item2', name: 'Apple', tags: ['food'], priority: 2 },
];

const mockAttributes = {
  strength: 12,
  intelligence: 8,
};

describe('EventCard Component', () => {
  it('renders event details correctly', () => {
    render(
      <EventCard
        event={mockEvent}
        inventoryItems={mockInventoryItems}
        characterAttributes={mockAttributes}
        onExecute={vi.fn()}
      />
    );

    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('This is a test event description.')).toBeInTheDocument();
    expect(screen.getByText('固定事件')).toBeInTheDocument();
    expect(screen.getByText('消耗: 2 行动点')).toBeInTheDocument();
    expect(screen.getByText('¥100')).toBeInTheDocument();
  });

  it('renders slots and handles selection', () => {
    render(
      <EventCard
        event={mockEvent}
        inventoryItems={mockInventoryItems}
        characterAttributes={mockAttributes}
        onExecute={vi.fn()}
      />
    );

    // Check slots rendered
    expect(screen.getByText('Required Slot')).toBeInTheDocument();
    expect(screen.getByText('Optional Slot')).toBeInTheDocument();

    // Select item in required slot
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'item1' } });
    expect(selects[0]).toHaveValue('item1');
  });

  it('validates required slots before enabling choices', () => {
    const onExecute = vi.fn();
    render(
      <EventCard
        event={mockEvent}
        inventoryItems={mockInventoryItems}
        characterAttributes={mockAttributes}
        onExecute={onExecute}
      />
    );

    const option1Button = screen.getByText('Option 1').closest('button');
    // Initially disabled because required slot is empty
    expect(option1Button).toBeDisabled();

    // Select required item
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'item1' } });

    // Should be enabled now
    expect(option1Button).not.toBeDisabled();

    fireEvent.click(option1Button!);
    expect(onExecute).toHaveBeenCalledWith('choice1', expect.objectContaining({ slot1: 'item1' }));
  });

  it('validates attribute conditions for choices', () => {
    // Render with low strength
    const lowAttributes = { ...mockAttributes, strength: 5 };
    render(
      <EventCard
        event={mockEvent}
        inventoryItems={mockInventoryItems}
        characterAttributes={lowAttributes}
        onExecute={vi.fn()}
      />
    );

    const option2Button = screen.getByText('Option 2 (Attribute Check)').closest('button');
    expect(option2Button).toBeDisabled();
    expect(screen.getByText('需要 strength >= 10')).toBeInTheDocument();
  });

  it('handles execution with slot selections', () => {
    const onExecute = vi.fn();
    render(
      <EventCard
        event={mockEvent}
        inventoryItems={mockInventoryItems}
        characterAttributes={mockAttributes}
        onExecute={onExecute}
      />
    );

    // Select items for both slots
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'item1' } }); // Required
    fireEvent.change(selects[1], { target: { value: 'item2' } }); // Optional

    const option1Button = screen.getByText('Option 1').closest('button');
    fireEvent.click(option1Button!);

    expect(onExecute).toHaveBeenCalledWith('choice1', {
      slot1: 'item1',
      slot2: 'item2',
    });
  });
});
