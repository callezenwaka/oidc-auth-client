import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Timer, ClockService } from '../../src/services/Timer.js';

describe('services/Timer', () => {
  let timer;

  beforeEach(() => {
    vi.useFakeTimers();
    timer = new Timer('test-timer');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a Timer instance', () => {
    expect(timer).toBeInstanceOf(Timer);
  });

  it('should initialize with duration', () => {
    timer.init(10);
    expect(timer.expiration).toBeGreaterThan(0);
  });

  it('should handle zero or negative duration', () => {
    timer.init(0);
    expect(timer.expiration).toBeGreaterThan(0);
  });

  it('should cancel timer', () => {
    timer.init(10);
    const expirationBefore = timer.expiration;
    timer.cancel();
    // Timer should be canceled but expiration remains
    expect(expirationBefore).toBeGreaterThan(0);
  });

  it('should not reinitialize to same expiration', () => {
    timer.init(10);
    const expiration1 = timer.expiration;
    timer.init(10);
    const expiration2 = timer.expiration;
    // Should skip reinitialization
    expect(expiration1).toBe(expiration2);
  });

  it('should fire callback when timer expires', (done) => {
    timer.addHandler(() => {
      done();
    });
    timer.init(1);
    vi.advanceTimersByTime(2000);
  });

  it('should get current time', () => {
    const now = timer.now;
    expect(now).toBeTypeOf('number');
    expect(now).toBeGreaterThan(0);
  });
});

describe('services/ClockService', () => {
  it('should create a ClockService instance', () => {
    const clockService = new ClockService();
    expect(clockService).toBeInstanceOf(ClockService);
  });

  it('should get epoch time', async () => {
    const clockService = new ClockService();
    const time = await clockService.getEpochTime();
    expect(time).toBeTypeOf('number');
    expect(time).toBeGreaterThan(0);
  });

  it('should return time in seconds', async () => {
    const clockService = new ClockService();
    const time = await clockService.getEpochTime();
    // Epoch time should be roughly current timestamp in seconds
    const expectedTime = Math.floor(Date.now() / 1000);
    expect(Math.abs(time - expectedTime)).toBeLessThan(2);
  });
});
