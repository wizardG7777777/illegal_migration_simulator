
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setCommand } from '@/devtools/commands/set';
import { CommandContext } from '@/devtools/commandRegistry';
import { CharacterSystem } from '@/systems/character/CharacterSystem';

// Mock CharacterSystem
vi.mock('@/systems/character/CharacterSystem', () => ({
  CharacterSystem: {
    modifyMoney: vi.fn(),
    modifyResource: vi.fn(),
    modifyAttribute: vi.fn(),
  },
}));

describe('/set command', () => {
  let mockContext: CommandContext;
  let mockState: any;

  beforeEach(() => {
    mockState = {
      character: {
        resources: {
          money: { cny: 100, usd: 50 },
          health: { current: 80, max: 100, min: 0 },
          mental: { current: 60, max: 100, min: 0 },
          actionPoints: { current: 3, max: 5, min: 0 },
        },
        attributes: {
          physique: 10,
          intelligence: 10,
          english: 5,
          social: 5,
          riskAwareness: 5,
          survival: 5,
        },
      },
    };

    mockContext = {
      getState: vi.fn().mockReturnValue(mockState),
      setState: vi.fn(),
      store: {} as any,
    };
  });

  it('should set money (absolute value)', () => {
    (CharacterSystem.modifyMoney as any).mockReturnValue({ ...mockState, money: { cny: 1000 } });

    const result = setCommand.execute(['money', '1000', 'CNY'], mockContext);

    expect(result.success).toBe(true);
    expect(CharacterSystem.modifyMoney).toHaveBeenCalledWith(mockState, 'CNY', 900); // 1000 - 100 = 900 delta
  });

  it('should set money (relative value)', () => {
    (CharacterSystem.modifyMoney as any).mockReturnValue({ ...mockState, money: { usd: 100 } });

    const result = setCommand.execute(['money', '+50', 'USD'], mockContext);

    expect(result.success).toBe(true);
    expect(CharacterSystem.modifyMoney).toHaveBeenCalledWith(mockState, 'USD', 50);
  });

  it('should set resource (health)', () => {
    (CharacterSystem.modifyResource as any).mockReturnValue({ ...mockState, health: 90 });

    const result = setCommand.execute(['health', '90'], mockContext);

    expect(result.success).toBe(true);
    expect(CharacterSystem.modifyResource).toHaveBeenCalledWith(mockState, 'health', 10); // 90 - 80 = 10 delta
  });

  it('should set attribute (physique)', () => {
    (CharacterSystem.modifyAttribute as any).mockReturnValue({ ...mockState, physique: 15 });

    const result = setCommand.execute(['physique', '15'], mockContext);

    expect(result.success).toBe(true);
    expect(CharacterSystem.modifyAttribute).toHaveBeenCalledWith(mockState, 'physique', 5); // 15 - 10 = 5 delta
  });

  it('should handle invalid arguments', () => {
    const result = setCommand.execute(['unknown', '100'], mockContext);
    expect(result.success).toBe(false);
    expect(result.error).toContain('未知目标');
  });

  it('should handle missing arguments', () => {
    const result = setCommand.execute(['money'], mockContext);
    expect(result.success).toBe(false);
    expect(result.error).toContain('参数不足');
  });

  it('should handle invalid numeric value', () => {
    const result = setCommand.execute(['health', 'invalid'], mockContext);
    expect(result.success).toBe(false);
    expect(result.error).toContain('无效数值');
  });
  
  it('should handle attribute command syntax', () => {
      (CharacterSystem.modifyAttribute as any).mockReturnValue({ ...mockState, intelligence: 12 });
      
      const result = setCommand.execute(['attribute', 'intelligence', '12'], mockContext);
      
      expect(result.success).toBe(true);
      expect(CharacterSystem.modifyAttribute).toHaveBeenCalledWith(mockState, 'intelligence', 2);
  });
});
