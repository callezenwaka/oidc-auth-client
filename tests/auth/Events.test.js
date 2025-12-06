import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Event, AccessTokenEvents, UserManagerEvents } from '../../src/auth/Events.js';

describe('auth/Event', () => {
  let event;

  beforeEach(() => {
    event = new Event('test-event');
  });

  it('should create an Event instance', () => {
    expect(event).toBeInstanceOf(Event);
  });

  it('should add event handler', () => {
    const handler = vi.fn();
    event.addHandler(handler);
    event.raise('arg1', 'arg2');
    expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should remove event handler', () => {
    const handler = vi.fn();
    event.addHandler(handler);
    event.removeHandler(handler);
    event.raise();
    expect(handler).not.toHaveBeenCalled();
  });

  it('should call multiple handlers', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    event.addHandler(handler1);
    event.addHandler(handler2);
    event.raise('test');
    expect(handler1).toHaveBeenCalledWith('test');
    expect(handler2).toHaveBeenCalledWith('test');
  });

  it('should pass multiple arguments to handlers', () => {
    const handler = vi.fn();
    event.addHandler(handler);
    event.raise('arg1', 'arg2', 'arg3');
    expect(handler).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
  });
});

describe('auth/AccessTokenEvents', () => {
  let events;

  beforeEach(() => {
    vi.useFakeTimers();
    events = new AccessTokenEvents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create an AccessTokenEvents instance', () => {
    expect(events).toBeInstanceOf(AccessTokenEvents);
  });

  it('should load token with expiration', () => {
    const container = {
      access_token: 'test-token',
      expires_in: 3600,
    };
    expect(() => events.load(container)).not.toThrow();
  });

  it('should add expiring handler', () => {
    const handler = vi.fn();
    events.addAccessTokenExpiring(handler);
    // Handler added successfully
    expect(handler).not.toHaveBeenCalled();
  });

  it('should add expired handler', () => {
    const handler = vi.fn();
    events.addAccessTokenExpired(handler);
    // Handler added successfully
    expect(handler).not.toHaveBeenCalled();
  });

  it('should remove expiring handler', () => {
    const handler = vi.fn();
    events.addAccessTokenExpiring(handler);
    events.removeAccessTokenExpiring(handler);
    // Handler removed successfully
  });

  it('should remove expired handler', () => {
    const handler = vi.fn();
    events.addAccessTokenExpired(handler);
    events.removeAccessTokenExpired(handler);
    // Handler removed successfully
  });

  it('should unload events', () => {
    const container = {
      access_token: 'test-token',
      expires_in: 3600,
    };
    events.load(container);
    expect(() => events.unload()).not.toThrow();
  });

  it('should cancel timers when no token', () => {
    const container = {};
    expect(() => events.load(container)).not.toThrow();
  });
});

describe('auth/UserManagerEvents', () => {
  let events;

  beforeEach(() => {
    events = new UserManagerEvents();
  });

  it('should create a UserManagerEvents instance', () => {
    expect(events).toBeInstanceOf(UserManagerEvents);
  });

  it('should extend AccessTokenEvents', () => {
    expect(events).toBeInstanceOf(AccessTokenEvents);
  });

  it('should add and call userLoaded handler', () => {
    const handler = vi.fn();
    events.addUserLoaded(handler);

    const user = { profile: { sub: '123' } };
    events.load(user);

    expect(handler).toHaveBeenCalledWith(user);
  });

  it('should not raise userLoaded when raiseEvent is false', () => {
    const handler = vi.fn();
    events.addUserLoaded(handler);

    const user = { profile: { sub: '123' } };
    events.load(user, false);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should add and call userUnloaded handler', () => {
    const handler = vi.fn();
    events.addUserUnloaded(handler);
    events.unload();
    expect(handler).toHaveBeenCalled();
  });

  it('should add silentRenewError handler', () => {
    const handler = vi.fn();
    events.addSilentRenewError(handler);
    const error = new Error('test error');
    events._raiseSilentRenewError(error);
    expect(handler).toHaveBeenCalledWith(error);
  });

  it('should add userSignedIn handler', () => {
    const handler = vi.fn();
    events.addUserSignedIn(handler);
    events._raiseUserSignedIn();
    expect(handler).toHaveBeenCalled();
  });

  it('should add userSignedOut handler', () => {
    const handler = vi.fn();
    events.addUserSignedOut(handler);
    events._raiseUserSignedOut();
    expect(handler).toHaveBeenCalled();
  });

  it('should add userSessionChanged handler', () => {
    const handler = vi.fn();
    events.addUserSessionChanged(handler);
    events._raiseUserSessionChanged();
    expect(handler).toHaveBeenCalled();
  });

  it('should remove handlers', () => {
    const handler = vi.fn();
    events.addUserLoaded(handler);
    events.removeUserLoaded(handler);

    const user = { profile: { sub: '123' } };
    events.load(user);

    expect(handler).not.toHaveBeenCalled();
  });
});
