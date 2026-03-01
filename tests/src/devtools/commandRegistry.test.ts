
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandRegistry, ConsoleCommand, CommandContext } from '@/devtools/commandRegistry';

describe('CommandRegistry', () => {
  let registry: CommandRegistry;
  let mockContext: CommandContext;

  beforeEach(() => {
    registry = new CommandRegistry();
    mockContext = {
      getState: vi.fn(),
      setState: vi.fn(),
      store: {} as any,
    };
  });

  it('should register and retrieve a command', () => {
    const command: ConsoleCommand = {
      name: 'test',
      description: 'Test command',
      usage: '/test',
      examples: [],
      execute: vi.fn().mockReturnValue({ success: true, message: 'Executed' }),
    };

    registry.register(command);
    expect(registry.getCommand('test')).toBe(command);
    expect(registry.getCommand('TEST')).toBe(command); // Case insensitive
  });

  it('should register and use aliases', () => {
    const command: ConsoleCommand = {
      name: 'test',
      description: 'Test command',
      usage: '/test',
      examples: [],
      execute: vi.fn().mockReturnValue({ success: true, message: 'Executed' }),
    };

    registry.register(command);
    registry.registerAlias('t', 'test');

    const result = registry.execute('/t', mockContext);
    expect(result.success).toBe(true);
    expect(command.execute).toHaveBeenCalled();
  });

  it('should execute a command with arguments', () => {
    const executeMock = vi.fn().mockReturnValue({ success: true, message: 'Executed' });
    const command: ConsoleCommand = {
      name: 'test',
      description: 'Test command',
      usage: '/test <arg1> <arg2>',
      examples: [],
      execute: executeMock,
    };

    registry.register(command);
    registry.execute('/test arg1 "arg 2"', mockContext);

    expect(executeMock).toHaveBeenCalledWith(['arg1', 'arg 2'], mockContext);
  });

  it('should return error for unknown command', () => {
    const result = registry.execute('/unknown', mockContext);
    expect(result.success).toBe(false);
    expect(result.error).toContain('未知命令');
  });

  it('should handle empty input', () => {
    const result = registry.execute('   ', mockContext);
    expect(result.success).toBe(false);
    expect(result.message).toBe('');
  });

  it('should provide command suggestions', () => {
    registry.register({ name: 'help', description: '', usage: '', examples: [], execute: vi.fn() });
    registry.register({ name: 'history', description: '', usage: '', examples: [], execute: vi.fn() });
    registry.registerAlias('h', 'help');

    const suggestions = registry.getCommandSuggestions('h');
    expect(suggestions).toContain('help');
    expect(suggestions).toContain('history');
    // 别名现在显示为 "alias (target)" 格式
    expect(suggestions).toContain('h (help)');
  });
});
