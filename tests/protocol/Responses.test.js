import { describe, it, expect } from 'vitest';
import { SigninResponse, SignoutResponse, ErrorResponse } from '../../src/protocol/Responses.js';

describe('protocol/SigninResponse', () => {
  it('should parse authorization code response', () => {
    const url = 'https://app.com/callback?code=abc123&state=xyz789';
    const response = new SigninResponse(url, '?');

    expect(response.code).toBe('abc123');
    expect(response.state).toBe('xyz789');
  });

  it('should parse implicit flow response', () => {
    const url = 'https://app.com/callback#access_token=token123&token_type=Bearer&expires_in=3600&state=xyz789';
    const response = new SigninResponse(url);

    expect(response.access_token).toBe('token123');
    expect(response.token_type).toBe('Bearer');
    expect(response.expires_in).toBe(3600);
    expect(response.state).toBe('xyz789');
  });

  it('should parse id_token response', () => {
    const url = 'https://app.com/callback#id_token=eyJhbGc...&state=xyz789';
    const response = new SigninResponse(url);

    expect(response.id_token).toBeDefined();
    expect(response.state).toBe('xyz789');
  });

  it('should parse error response', () => {
    const url = 'https://app.com/callback?error=invalid_request&error_description=Missing+parameter&state=xyz789';
    const response = new SigninResponse(url, '?');

    expect(response.error).toBe('invalid_request');
    expect(response.error_description).toBe('Missing parameter');
    expect(response.state).toBe('xyz789');
  });

  it('should detect OIDC response', () => {
    const oidcUrl = 'https://app.com/callback#id_token=eyJhbGc...&state=xyz789';
    const response = new SigninResponse(oidcUrl);
    expect(response.isOpenIdConnect).toBe(true);

    const oauthUrl = 'https://app.com/callback#access_token=token&state=xyz789';
    const oauthResponse = new SigninResponse(oauthUrl);
    expect(oauthResponse.isOpenIdConnect).toBe(false);
  });

  it('should parse session_state', () => {
    const url = 'https://app.com/callback#access_token=token&session_state=session123&state=xyz789';
    const response = new SigninResponse(url);
    expect(response.session_state).toBe('session123');
  });

  it('should parse scope', () => {
    const url = 'https://app.com/callback#access_token=token&scope=openid+profile&state=xyz789';
    const response = new SigninResponse(url);
    expect(response.scope).toBe('openid profile');
  });
});

describe('protocol/SignoutResponse', () => {
  it('should parse signout response', () => {
    const url = 'https://app.com/signout?state=xyz789';
    const response = new SignoutResponse(url);
    expect(response.state).toBe('xyz789');
  });

  it('should parse error response', () => {
    const url = 'https://app.com/signout?error=server_error&error_description=Server+error&state=xyz789';
    const response = new SignoutResponse(url);

    expect(response.error).toBe('server_error');
    expect(response.error_description).toBe('Server error');
    expect(response.state).toBe('xyz789');
  });

  it('should handle response without state', () => {
    const url = 'https://app.com/signout';
    const response = new SignoutResponse(url);
    expect(response.state).toBeUndefined();
  });
});

describe('protocol/ErrorResponse', () => {
  it('should create an ErrorResponse instance', () => {
    const error = new ErrorResponse({ error: 'invalid_request' });
    expect(error).toBeInstanceOf(ErrorResponse);
    expect(error).toBeInstanceOf(Error);
  });

  it('should have error properties', () => {
    const error = new ErrorResponse({
      error: 'invalid_request',
      error_description: 'Missing parameter',
      error_uri: 'https://example.com/errors',
    });

    expect(error.error).toBe('invalid_request');
    expect(error.error_description).toBe('Missing parameter');
    expect(error.error_uri).toBe('https://example.com/errors');
  });

  it('should have error message', () => {
    const error = new ErrorResponse({
      error: 'invalid_request',
      error_description: 'Missing parameter',
    });

    expect(error.message).toContain('invalid_request');
    expect(error.message).toContain('Missing parameter');
  });

  it('should have error name', () => {
    const error = new ErrorResponse({ error: 'invalid_request' });
    expect(error.name).toBe('invalid_request');
  });

  it('should include state and session_state', () => {
    const error = new ErrorResponse({
      error: 'error',
      state: 'state123',
      session_state: 'session123',
    });

    expect(error.state).toBe('state123');
    expect(error.session_state).toBe('session123');
  });
});
