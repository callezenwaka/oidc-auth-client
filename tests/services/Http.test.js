import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UrlUtility, JsonService, MetadataService } from '../../src/services/Http.js';
import { OidcClientSettings } from '../../src/auth/Settings.js';

describe('services/UrlUtility', () => {
  it('should add query parameter to URL', () => {
    const url = UrlUtility.addQueryParam('https://example.com', 'foo', 'bar');
    expect(url).toBe('https://example.com?foo=bar');
  });

  it('should add query parameter to URL with existing params', () => {
    const url = UrlUtility.addQueryParam('https://example.com?existing=param', 'foo', 'bar');
    expect(url).toBe('https://example.com?existing=param&foo=bar');
  });

  it('should parse URL fragment', () => {
    const url = 'https://example.com#access_token=abc&state=xyz';
    const params = UrlUtility.parseUrlFragment(url);
    expect(params.access_token).toBe('abc');
    expect(params.state).toBe('xyz');
  });

  it('should parse URL query string', () => {
    const url = 'https://example.com?code=abc&state=xyz';
    const params = UrlUtility.parseUrlFragment(url, '?');
    expect(params.code).toBe('abc');
    expect(params.state).toBe('xyz');
  });

  it('should handle URL without fragment', () => {
    const url = 'https://example.com';
    const params = UrlUtility.parseUrlFragment(url);
    expect(params).toEqual({});
  });
});

describe('services/JsonService', () => {
  let jsonService;

  beforeEach(() => {
    jsonService = new JsonService();
  });

  it('should create a JsonService instance', () => {
    expect(jsonService).toBeInstanceOf(JsonService);
  });

  // Note: Full HTTP testing would require mocking XMLHttpRequest or fetch
  // These tests verify the class structure
  it('should have getJson method', () => {
    expect(jsonService.getJson).toBeTypeOf('function');
  });

  it('should have postForm method', () => {
    expect(jsonService.postForm).toBeTypeOf('function');
  });
});

describe('services/MetadataService', () => {
  let metadataService;
  let settings;

  beforeEach(() => {
    settings = new OidcClientSettings({
      authority: 'https://example.com',
      client_id: 'test-client',
      redirect_uri: 'https://app.com/callback',
    });
    metadataService = new MetadataService(settings);
  });

  it('should create a MetadataService instance', () => {
    expect(metadataService).toBeInstanceOf(MetadataService);
  });

  it('should construct metadata URL from authority', () => {
    expect(settings.metadataUrl).toContain('/.well-known/openid-configuration');
  });

  it('should have getMetadata method', () => {
    expect(metadataService.getMetadata).toBeTypeOf('function');
  });

  it('should have getIssuer method', () => {
    expect(metadataService.getIssuer).toBeTypeOf('function');
  });

  it('should have getAuthorizationEndpoint method', () => {
    expect(metadataService.getAuthorizationEndpoint).toBeTypeOf('function');
  });

  it('should have getSigningKeys method', () => {
    expect(metadataService.getSigningKeys).toBeTypeOf('function');
  });

  it('should reset signing keys', () => {
    expect(() => metadataService.resetSigningKeys()).not.toThrow();
  });
});
