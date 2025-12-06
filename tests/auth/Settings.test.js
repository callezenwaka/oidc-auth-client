import { describe, it, expect, beforeEach } from 'vitest';
import { OidcClientSettings, UserManagerSettings } from '../../src/auth/Settings.js';

describe('auth/OidcClientSettings', () => {
  it('should create an OidcClientSettings instance', () => {
    const settings = new OidcClientSettings({
      authority: 'https://example.com',
      client_id: 'test-client',
      redirect_uri: 'https://app.com/callback',
    });
    expect(settings).toBeInstanceOf(OidcClientSettings);
  });

  it('should have required properties', () => {
    const settings = new OidcClientSettings({
      authority: 'https://example.com',
      client_id: 'test-client',
      redirect_uri: 'https://app.com/callback',
    });
    expect(settings.authority).toBe('https://example.com');
    expect(settings.client_id).toBe('test-client');
    expect(settings.redirect_uri).toBe('https://app.com/callback');
  });

  it('should have default values', () => {
    const settings = new OidcClientSettings({
      authority: 'https://example.com',
      client_id: 'test-client',
      redirect_uri: 'https://app.com/callback',
    });
    expect(settings.response_type).toBe('id_token');
    expect(settings.scope).toBe('openid');
    expect(settings.filterProtocolClaims).toBe(true);
    expect(settings.loadUserInfo).toBe(true);
  });

  it('should construct metadataUrl from authority', () => {
    const settings = new OidcClientSettings({
      authority: 'https://example.com',
      client_id: 'test-client',
      redirect_uri: 'https://app.com/callback',
    });
    expect(settings.metadataUrl).toBe('https://example.com/.well-known/openid-configuration');
  });

  it('should allow setting metadata', () => {
    const settings = new OidcClientSettings({
      authority: 'https://example.com',
      client_id: 'test-client',
      redirect_uri: 'https://app.com/callback',
    });
    const metadata = { issuer: 'https://example.com' };
    settings.metadata = metadata;
    expect(settings.metadata).toBe(metadata);
  });

  it('should throw error when setting client_id twice', () => {
    const settings = new OidcClientSettings({
      authority: 'https://example.com',
      client_id: 'test-client',
      redirect_uri: 'https://app.com/callback',
    });
    expect(() => {
      settings.client_id = 'new-client';
    }).toThrow();
  });

  it('should have getEpochTime method', async () => {
    const settings = new OidcClientSettings({
      authority: 'https://example.com',
      client_id: 'test-client',
      redirect_uri: 'https://app.com/callback',
    });
    const time = await settings.getEpochTime();
    expect(time).toBeTypeOf('number');
  });
});

describe('auth/UserManagerSettings - Composition Pattern', () => {
  it('should create a UserManagerSettings instance', () => {
    const settings = new UserManagerSettings({
      authority: 'https://example.com',
      client_id: 'test-client',
      redirect_uri: 'https://app.com/callback',
    });
    expect(settings).toBeInstanceOf(UserManagerSettings);
  });

  it('should delegate OidcClientSettings properties via composition', () => {
    const settings = new UserManagerSettings({
      authority: 'https://example.com',
      client_id: 'test-client',
      redirect_uri: 'https://app.com/callback',
      response_type: 'code',
      scope: 'openid profile email',
    });

    // These should be delegated to the composed OidcClientSettings instance
    expect(settings.authority).toBe('https://example.com');
    expect(settings.client_id).toBe('test-client');
    expect(settings.redirect_uri).toBe('https://app.com/callback');
    expect(settings.response_type).toBe('code');
    expect(settings.scope).toBe('openid profile email');
  });

  it('should have UserManager-specific properties', () => {
    const settings = new UserManagerSettings({
      authority: 'https://example.com',
      client_id: 'test-client',
      redirect_uri: 'https://app.com/callback',
      automaticSilentRenew: true,
      monitorSession: false,
    });

    expect(settings.automaticSilentRenew).toBe(true);
    expect(settings.monitorSession).toBe(false);
  });

  it('should have default UserManager values', () => {
    const settings = new UserManagerSettings({
      authority: 'https://example.com',
      client_id: 'test-client',
      redirect_uri: 'https://app.com/callback',
    });

    expect(settings.automaticSilentRenew).toBe(false);
    expect(settings.monitorSession).toBe(true);
    expect(settings.includeIdTokenInSilentRenew).toBe(true);
  });

  it('should delegate getEpochTime to composed OidcClientSettings', async () => {
    const settings = new UserManagerSettings({
      authority: 'https://example.com',
      client_id: 'test-client',
      redirect_uri: 'https://app.com/callback',
    });

    const time = await settings.getEpochTime();
    expect(time).toBeTypeOf('number');
  });

  it('should have navigators', () => {
    const settings = new UserManagerSettings({
      authority: 'https://example.com',
      client_id: 'test-client',
      redirect_uri: 'https://app.com/callback',
    });

    expect(settings.redirectNavigator).toBeDefined();
    expect(settings.popupNavigator).toBeDefined();
    expect(settings.iframeNavigator).toBeDefined();
  });

  it('should determine query_status_response_type based on response_type', () => {
    const codeSettings = new UserManagerSettings({
      authority: 'https://example.com',
      client_id: 'test-client',
      redirect_uri: 'https://app.com/callback',
      response_type: 'code',
    });
    expect(codeSettings.query_status_response_type).toBe('code');

    const idTokenSettings = new UserManagerSettings({
      authority: 'https://example.com',
      client_id: 'test-client',
      redirect_uri: 'https://app.com/callback',
      response_type: 'id_token',
    });
    expect(idTokenSettings.query_status_response_type).toBe('id_token');
  });
});
