
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useConsole } from '@/devtools/hooks/useConsole';
import { commandRegistry } from '@/devtools/commandRegistry';
import { useGameStore } from '@/store';

// Mock dependencies
vi.mock('@/store', () => ({
  useGameStore: vi.fn(),
  setState: vi.fn(),
}));

vi.mock('@/devtools/commandRegistry', () => ({
  commandRegistry: {
    execute: vi.fn(),
    getArgumentSuggestions: vi.fn(),
  },
}));

describe('useConsole Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useGameStore as any).mockImplementation((selector?: any) => {
      const store = { state: {} };
      return typeof selector === 'function' ? selector(store) : store;
    });
    (commandRegistry.execute as any).mockReturnValue({ success: true, message: 'Executed' });
    (commandRegistry.getArgumentSuggestions as any).mockReturnValue([]);
    
    // Mock localStorage
    const localStorageMock = (function() {
      let store: any = {};
      return {
        getItem: function(key: string) {
          return store[key] || null;
        },
        setItem: function(key: string, value: string) {
          store[key] = value.toString();
        },
        clear: function() {
          store = {};
        },
        removeItem: function(key: string) {
          delete store[key];
        }
      };
    })();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useConsole());

    expect(result.current.state.history).toEqual([]);
    expect(result.current.state.currentInput).toBe('');
    expect(result.current.state.output.length).toBeGreaterThan(0); // System welcome message
  });

  it('should execute a command and update output', () => {
    const { result } = renderHook(() => useConsole());

    act(() => {
      result.current.executeCommand('/test');
    });

    expect(commandRegistry.execute).toHaveBeenCalledWith('/test', expect.anything());
    expect(result.current.state.output).toHaveLength(3); // System + Input + Output
    expect(result.current.state.output[1].content).toBe('> /test');
    expect(result.current.state.output[2].content).toBe('Executed');
  });

  it('should add command to history', () => {
    const { result } = renderHook(() => useConsole());

    act(() => {
      result.current.executeCommand('/cmd1');
    });

    expect(result.current.state.history).toEqual(['/cmd1']);

    act(() => {
      result.current.executeCommand('/cmd2');
    });

    expect(result.current.state.history).toEqual(['/cmd2', '/cmd1']);
  });

  it('should navigate history', () => {
    const { result } = renderHook(() => useConsole());

    act(() => {
      result.current.executeCommand('/cmd1');
      result.current.executeCommand('/cmd2');
    });

    // Up (older)
    act(() => {
      result.current.navigateHistory('up');
    });
    expect(result.current.state.currentInput).toBe('/cmd2');

    // Up (older)
    act(() => {
      result.current.navigateHistory('up');
    });
    expect(result.current.state.currentInput).toBe('/cmd1');

    // Down (newer)
    act(() => {
      result.current.navigateHistory('down');
    });
    expect(result.current.state.currentInput).toBe('/cmd2');
  });

  it('should clear output', () => {
    const { result } = renderHook(() => useConsole());

    act(() => {
      result.current.executeCommand('/test');
      result.current.clearOutput();
    });

    expect(result.current.state.output).toHaveLength(1); // Reset to system message
  });

  it('should handle suggestions', () => {
    (commandRegistry.getArgumentSuggestions as any).mockReturnValue(['suggestion1', 'suggestion2']);
    const { result } = renderHook(() => useConsole());

    act(() => {
      result.current.setCurrentInput('/s');
    });

    expect(result.current.state.showSuggestions).toBe(true);
    expect(result.current.state.suggestions).toEqual(['suggestion1', 'suggestion2']);

    // Navigate suggestions
    act(() => {
      result.current.navigateSuggestions('down');
    });
    expect(result.current.state.selectedSuggestion).toBe(1);

    // Apply suggestion
    act(() => {
      result.current.applySuggestion();
    });
    // Implementation logic might vary slightly on how it replaces input, but assuming it replaces the last part
    expect(result.current.state.currentInput).toContain('suggestion2');
    expect(result.current.state.showSuggestions).toBe(false);
  });
});
