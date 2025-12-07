import { describe, it, expect } from 'vitest';
import { SigninRequest, SignoutRequest } from '../../src/protocol/Requests.js';

describe('protocol/SigninRequest', () => {
  const validConfig = {
    url: 'https://example.com/authorize',
    client_id: 'test-client',
    redirect_uri: 'https://app.com/callback',
    response_type: 'code',
    scope: 'openid profile',
    authority: 'https://example.com',
  };

  it('should create a SigninRequest instance', () => {
    const request = new SigninRequest(validConfig);
    expect(request).toBeInstanceOf(SigninRequest);
  });

  it('should generate authorization URL', () => {
    const request = new SigninRequest(validConfig);
    expect(request.url).toContain('https://example.com/authorize');
    expect(request.url).toContain('client_id=test-client');
    expect(request.url).toContain('redirect_uri=');
    expect(request.url).toContain('response_type=code');
    expect(request.url).toContain('scope=openid%20profile');
  });

  it('should include state parameter', () => {
    const request = new SigninRequest(validConfig);
    expect(request.url).toContain('state=');
    expect(request.state).toBeDefined();
    expect(request.state.id).toBeDefined();
  });

  it('should include optional parameters', () => {
    const config = {
      ...validConfig,
      prompt: 'login',
      display: 'popup',
      max_age: 3600,
      ui_locales: 'en-US',
    };
    const request = new SigninRequest(config);

    expect(request.url).toContain('prompt=login');
    expect(request.url).toContain('display=popup');
    expect(request.url).toContain('max_age=3600');
    expect(request.url).toContain('ui_locales=en-US');
  });

  it('should detect OIDC response type', () => {
    expect(SigninRequest.isOidc('id_token')).toBe(true);
    expect(SigninRequest.isOidc('id_token token')).toBe(true);
    expect(SigninRequest.isOidc('code id_token')).toBe(true);
    expect(SigninRequest.isOidc('code')).toBe(false);
    expect(SigninRequest.isOidc('token')).toBe(false);
  });

  it('should detect OAuth response type', () => {
    expect(SigninRequest.isOAuth('token')).toBe(true);
    expect(SigninRequest.isOAuth('id_token token')).toBe(true);
    expect(SigninRequest.isOAuth('code')).toBe(false);
  });

  it('should detect code flow', () => {
    expect(SigninRequest.isCode('code')).toBe(true);
    expect(SigninRequest.isCode('code id_token')).toBe(true);
    expect(SigninRequest.isCode('id_token')).toBe(false);
  });
});

describe('protocol/SignoutRequest', () => {
  const validConfig = {
    url: 'https://example.com/endsession',
    id_token_hint: 'eyJhbGc...',
    post_logout_redirect_uri: 'https://app.com',
  };

  it('should create a SignoutRequest instance', () => {
    const request = new SignoutRequest(validConfig);
    expect(request).toBeInstanceOf(SignoutRequest);
  });

  it('should generate end session URL', () => {
    const request = new SignoutRequest(validConfig);
    expect(request.url).toContain('https://example.com/endsession');
  });

  it('should include id_token_hint if provided', () => {
    const request = new SignoutRequest(validConfig);
    expect(request.url).toContain('id_token_hint=');
  });

  it('should include post_logout_redirect_uri if provided', () => {
    const request = new SignoutRequest(validConfig);
    expect(request.url).toContain('post_logout_redirect_uri=');
  });

  it('should work without optional parameters', () => {
    const request = new SignoutRequest({
      url: 'https://example.com/endsession',
    });
    expect(request.url).toBe('https://example.com/endsession');
  });

  it('should include state when data is provided', () => {
    const request = new SignoutRequest({
      ...validConfig,
      data: { custom: 'data' },
    });
    expect(request.state).toBeDefined();
    expect(request.url).toContain('state=');
  });
});
