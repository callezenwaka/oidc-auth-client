import { describe, it, expect, beforeEach, vi } from 'vitest';
import { State, SigninState, SilentRenewService } from '../../src/auth/Session.js';
import { InMemoryWebStorage } from '../../src/storage/Storage.js';

describe('auth/State', () => {
  it('should create a State instance', () => {
    const state = new State();
    expect(state).toBeInstanceOf(State);
  });

  it('should generate id if not provided', () => {
    const state = new State();
    expect(state.id).toBeDefined();
    expect(state.id.length).toBeGreaterThan(0);
  });

  it('should use provided id', () => {
    const state = new State({ id: 'custom-id' });
    expect(state.id).toBe('custom-id');
  });

  it('should store custom data', () => {
    const data = { foo: 'bar', num: 42 };
    const state = new State({ data });
    expect(state.data).toEqual(data);
  });

  it('should have created timestamp', () => {
    const state = new State();
    expect(state.created).toBeTypeOf('number');
    expect(state.created).toBeGreaterThan(0);
  });

  it('should use provided created timestamp', () => {
    const created = 1234567890;
    const state = new State({ created });
    expect(state.created).toBe(created);
  });

  it('should serialize to storage string', () => {
    const state = new State({ data: { test: 'value' } });
    const str = state.toStorageString();
    expect(str).toBeTypeOf('string');
    const parsed = JSON.parse(str);
    expect(parsed.id).toBe(state.id);
    expect(parsed.data).toEqual(state.data);
  });

  it('should deserialize from storage string', () => {
    const original = new State({ data: { test: 'value' } });
    const str = original.toStorageString();
    const restored = State.fromStorageString(str);
    expect(restored.id).toBe(original.id);
    expect(restored.data).toEqual(original.data);
  });

  it('should clear stale state from storage', async () => {
    const storage = {
      getAllKeys: vi.fn().mockResolvedValue(['key1', 'key2']),
      get: vi.fn()
        .mockResolvedValueOnce(new State({ created: Date.now() / 1000 - 1000 }).toStorageString())
        .mockResolvedValueOnce(new State({ created: Date.now() / 1000 }).toStorageString()),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    await State.clearStaleState(storage, 500);

    // Should remove the stale state (created 1000 seconds ago)
    expect(storage.remove).toHaveBeenCalled();
  });
});

describe('auth/SigninState', () => {
  it('should create a SigninState instance', () => {
    const state = new SigninState();
    expect(state).toBeInstanceOf(SigninState);
  });

  it('should extend State', () => {
    const state = new SigninState();
    expect(state).toBeInstanceOf(State);
  });

  it('should generate nonce when true', () => {
    const state = new SigninState({ nonce: true });
    expect(state.nonce).toBeDefined();
    expect(state.nonce.length).toBeGreaterThan(0);
  });

  it('should use provided nonce', () => {
    const state = new SigninState({ nonce: 'custom-nonce' });
    expect(state.nonce).toBe('custom-nonce');
  });

  it('should generate code_verifier when true', () => {
    const state = new SigninState({ code_verifier: true });
    expect(state.code_verifier).toBeDefined();
    expect(state.code_verifier.length).toBeGreaterThan(0);
  });

  it('should store pre-computed code_challenge', () => {
    const state = new SigninState({ code_verifier: true, code_challenge: 'abc123' });
    expect(state.code_challenge).toBeDefined();
    expect(state.code_challenge).toBe('abc123');
  });

  it('should store signin-specific properties', () => {
    const state = new SigninState({
      authority: 'https://example.com',
      client_id: 'test-client',
      redirect_uri: 'https://app.com/callback',
      scope: 'openid profile',
    });

    expect(state.authority).toBe('https://example.com');
    expect(state.client_id).toBe('test-client');
    expect(state.redirect_uri).toBe('https://app.com/callback');
    expect(state.scope).toBe('openid profile');
  });

  it('should serialize signin state', () => {
    const state = new SigninState({
      nonce: 'test-nonce',
      authority: 'https://example.com',
      client_id: 'test-client',
    });

    const str = state.toStorageString();
    const parsed = JSON.parse(str);

    expect(parsed.nonce).toBe('test-nonce');
    expect(parsed.authority).toBe('https://example.com');
    expect(parsed.client_id).toBe('test-client');
  });

  it('should deserialize signin state', () => {
    const original = new SigninState({
      nonce: 'test-nonce',
      authority: 'https://example.com',
      client_id: 'test-client',
    });

    const str = original.toStorageString();
    const restored = SigninState.fromStorageString(str);

    expect(restored).toBeInstanceOf(SigninState);
    expect(restored.nonce).toBe(original.nonce);
    expect(restored.authority).toBe(original.authority);
    expect(restored.client_id).toBe(original.client_id);
  });
});

describe('auth/SilentRenewService', () => {
  let mockUserManager;
  let service;

  beforeEach(() => {
    mockUserManager = {
      events: {
        addAccessTokenExpiring: vi.fn(),
        removeAccessTokenExpiring: vi.fn(),
      },
      getUser: vi.fn().mockResolvedValue(null),
      signinSilent: vi.fn().mockResolvedValue({ profile: { sub: '123' } }),
    };
    service = new SilentRenewService(mockUserManager);
  });

  it('should create a SilentRenewService instance', () => {
    expect(service).toBeInstanceOf(SilentRenewService);
  });

  it('should start silent renew', () => {
    service.start();
    expect(mockUserManager.events.addAccessTokenExpiring).toHaveBeenCalled();
    expect(mockUserManager.getUser).toHaveBeenCalled();
  });

  it('should stop silent renew', () => {
    service.start();
    service.stop();
    expect(mockUserManager.events.removeAccessTokenExpiring).toHaveBeenCalled();
  });

  it('should not start twice', () => {
    service.start();
    service.start();
    // Should only add handler once
    expect(mockUserManager.events.addAccessTokenExpiring).toHaveBeenCalledTimes(1);
  });

  it('should handle token expiring event', async () => {
    service.start();
    const callback = mockUserManager.events.addAccessTokenExpiring.mock.calls[0][0];

    // Simulate token expiring
    await callback();

    expect(mockUserManager.signinSilent).toHaveBeenCalled();
  });
});
