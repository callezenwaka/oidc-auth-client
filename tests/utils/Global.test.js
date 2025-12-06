import { describe, it, expect } from 'vitest';
import { Global } from '../../src/utils/Global.js';

describe('utils/Global', () => {
  it('should export Global class', () => {
    expect(Global).toBeDefined();
  });

  it('should provide access to localStorage', () => {
    expect(Global.localStorage).toBeDefined();
  });

  it('should provide access to sessionStorage', () => {
    expect(Global.sessionStorage).toBeDefined();
  });

  it('should provide access to location', () => {
    expect(Global.location).toBeDefined();
  });

  it('should provide timer utilities', () => {
    expect(Global.timer).toBeDefined();
    expect(Global.timer.setInterval).toBeTypeOf('function');
    expect(Global.timer.clearInterval).toBeTypeOf('function');
  });
});
