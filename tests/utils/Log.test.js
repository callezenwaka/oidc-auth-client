import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Log } from '../../src/utils/Log.js';

describe('utils/Log', () => {
  beforeEach(() => {
    Log.reset();
  });

  it('should export Log class', () => {
    expect(Log).toBeDefined();
  });

  it('should have log levels', () => {
    expect(Log.NONE).toBe(0);
    expect(Log.ERROR).toBe(1);
    expect(Log.WARN).toBe(2);
    expect(Log.INFO).toBe(3);
    expect(Log.DEBUG).toBe(4);
  });

  it('should set log level', () => {
    Log.level = Log.DEBUG;
    expect(Log.level).toBe(Log.DEBUG);
  });

  it('should log debug messages when level is DEBUG', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    Log.level = Log.DEBUG;
    Log.debug('test message');
    expect(spy).toHaveBeenCalledWith('test message');
    spy.mockRestore();
  });

  it('should not log debug messages when level is ERROR', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    Log.level = Log.ERROR;
    Log.debug('test message');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should reset to default settings', () => {
    Log.level = Log.DEBUG;
    Log.reset();
    expect(Log.level).toBe(Log.INFO);
  });
});
