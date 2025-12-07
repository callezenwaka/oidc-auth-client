import { describe, it, expect, beforeEach } from 'vitest';
import { User } from '../../src/models/User.js';

describe('models/User', () => {
  const validUserData = {
    id_token: 'eyJhbGc...',
    access_token: 'access_token_value',
    token_type: 'Bearer',
    scope: 'openid profile',
    profile: {
      sub: '123456',
      name: 'John Doe',
    },
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    session_state: 'session_state_value',
  };

  it('should create a User instance', () => {
    const user = new User(validUserData);
    expect(user).toBeInstanceOf(User);
  });

  it('should have correct properties', () => {
    const user = new User(validUserData);
    expect(user.id_token).toBe(validUserData.id_token);
    expect(user.access_token).toBe(validUserData.access_token);
    expect(user.token_type).toBe(validUserData.token_type);
    expect(user.scope).toBe(validUserData.scope);
    expect(user.profile).toEqual(validUserData.profile);
    expect(user.session_state).toBe(validUserData.session_state);
  });

  it('should calculate expires_in correctly', () => {
    const user = new User(validUserData);
    expect(user.expires_in).toBeGreaterThan(0);
    expect(user.expires_in).toBeLessThanOrEqual(3600);
  });

  it('should determine if token is expired', () => {
    const expiredData = {
      ...validUserData,
      expires_at: Math.floor(Date.now() / 1000) - 100,
    };
    const expiredUser = new User(expiredData);
    expect(expiredUser.expired).toBe(true);

    const validUser = new User(validUserData);
    expect(validUser.expired).toBe(false);
  });

  it('should parse scopes correctly', () => {
    const user = new User(validUserData);
    expect(user.scopes).toEqual(['openid', 'profile']);
  });

  it('should serialize to storage string', () => {
    const user = new User(validUserData);
    const storageString = user.toStorageString();
    expect(storageString).toBeTypeOf('string');
    expect(() => JSON.parse(storageString)).not.toThrow();
  });

  it('should deserialize from storage string', () => {
    const user = new User(validUserData);
    const storageString = user.toStorageString();
    const restoredUser = User.fromStorageString(storageString);

    expect(restoredUser).toBeInstanceOf(User);
    expect(restoredUser.access_token).toBe(user.access_token);
    expect(restoredUser.profile).toEqual(user.profile);
  });
});
