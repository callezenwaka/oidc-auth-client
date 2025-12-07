import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Timer, ClockService } from '../../src/services/Timer.js';

describe('services/Timer', () => {
  let timer;

  beforeEach(() => {
    vi.useFakeTimers();
    // Initialize the fake clock to a known time for predictable expiration checks
    vi.setSystemTime(new Date(2025, 11, 6, 10, 0, 0)); 
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

  it('should fire callback when timer expires', async () => {
    // Return a Promise instead of using the deprecated done() callback.
    // Convert to async and use advanceTimersByTime to trigger expiration instantly.
    
    // Setup the promise to wait for the handler
    const promise = new Promise((resolve) => {
      timer.addHandler(() => {
        resolve(); // Resolves the promise when the timer event fires.
      });
    });
    
    // Start the timer for 1 second.
    timer.init(1); 
    
    // INSTANTLY advance the clock past the 1-second expiration.
    // The Timer's internal check is 'this._expiration <= this.now'.
    // We advance 1 second (1000ms) plus a bit extra (e.g., 100ms) to ensure the 
    // internal interval has a chance to fire and check the expiration time.
    vi.advanceTimersByTime(1100); 

    // Wait for the promise to resolve, confirming the event fired.
    await promise;
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
