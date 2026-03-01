
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StartPage } from '@/components/pages/StartPage';
import { useGameStore } from '@/store';
import { MemoryRouter } from 'react-router-dom';

// Mock store
vi.mock('@/store', () => ({
  useGameStore: vi.fn(),
}));

// Mock router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('StartPage Component', () => {
  const mockStartNewGame = vi.fn();
  const mockGetSaveList = vi.fn();
  const mockLoadFromStorage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useGameStore as any).mockReturnValue({
      startNewGame: mockStartNewGame,
      getSaveList: mockGetSaveList,
      loadFromStorage: mockLoadFromStorage,
    });
    mockGetSaveList.mockReturnValue([]);
  });

  it('renders start page correctly', () => {
    render(
      <MemoryRouter>
        <StartPage />
      </MemoryRouter>
    );

    expect(screen.getByText('去美国')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('输入你的名字...')).toBeInTheDocument();
    expect(screen.getByText('开始游戏')).toBeInTheDocument();
  });

  it('handles character name input', () => {
    render(
      <MemoryRouter>
        <StartPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('输入你的名字...');
    fireEvent.change(input, { target: { value: 'Test Player' } });
    expect(input).toHaveValue('Test Player');
  });

  it('starts new game with valid name', async () => {
    render(
      <MemoryRouter>
        <StartPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('输入你的名字...');
    fireEvent.change(input, { target: { value: 'Test Player' } });

    const startButton = screen.getByText('开始游戏').closest('button');
    fireEvent.click(startButton!);

    await waitFor(() => {
      expect(mockStartNewGame).toHaveBeenCalledWith('Test Player');
      expect(mockNavigate).toHaveBeenCalledWith('/game');
    });
  });

  it('shows error for empty name', () => {
    render(
      <MemoryRouter>
        <StartPage />
      </MemoryRouter>
    );

    const startButton = screen.getByText('开始游戏').closest('button');
    fireEvent.click(startButton!);

    expect(screen.getByText('请输入角色名称')).toBeInTheDocument();
    expect(mockStartNewGame).not.toHaveBeenCalled();
  });

  it('loads save game', () => {
    mockGetSaveList.mockReturnValue(['save_123', 'save_456']);
    mockLoadFromStorage.mockReturnValue(true);

    render(
      <MemoryRouter>
        <StartPage />
      </MemoryRouter>
    );

    // Click load game button
    const loadButton = screen.getByText('加载存档 (2)').closest('button');
    fireEvent.click(loadButton!);

    // Select save
    const saveOption = screen.getByText('存档 1').closest('button');
    fireEvent.click(saveOption!);

    expect(mockLoadFromStorage).toHaveBeenCalledWith('save_123');
    expect(mockNavigate).toHaveBeenCalledWith('/game');
  });

  it('bug: fails to show error if load fails in load menu', () => {
    mockGetSaveList.mockReturnValue(['save_123']);
    mockLoadFromStorage.mockReturnValue(false);

    render(
      <MemoryRouter>
        <StartPage />
      </MemoryRouter>
    );

    // Click load game button
    const loadButton = screen.getByText('加载存档 (1)').closest('button');
    fireEvent.click(loadButton!);

    // Select save
    const saveOption = screen.getByText('存档 1').closest('button');
    fireEvent.click(saveOption!);

    // After fix: The error should now be visible in the load menu
    expect(screen.queryByText('加载存档失败')).toBeInTheDocument();
    
    // We are still in the load menu so user can try again or go back
    expect(screen.getByText('选择存档')).toBeInTheDocument();
  });
});
