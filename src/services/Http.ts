// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import { Log } from '../utils/Log.js';
import { Global } from '../utils/Global.js';
import type { JwkKey } from '../types/crypto.js';

//=============================================================================
// UrlUtility
//=============================================================================

export class UrlUtility {
  static addQueryParam(url: string, name: string, value: string): string {
    if (url.indexOf('?') < 0) {
      url += '?';
    }
    if (url[url.length - 1] !== '?') {
      url += '&';
    }
    url += encodeURIComponent(name) + '=' + encodeURIComponent(value);
    return url;
  }

  static parseUrlFragment(
    value: string | undefined,
    delimiter: string = '#',
    global: { location?: Location } = Global,
  ): Record<string, string> {
    if (typeof value !== 'string') {
      value = global.location?.href ?? '';
    }

    let idx = value.lastIndexOf(delimiter);
    if (idx >= 0) {
      value = value.substring(idx + 1);
    }

    if (delimiter === '?') {
      idx = value.indexOf('#');
      if (idx >= 0) {
        value = value.substring(0, idx);
      }
    }

    const params: Record<string, string> = {};
    const regex = /([^&=]+)=([^&]*)/g;
    let m: RegExpExecArray | null;
    let counter = 0;

    while ((m = regex.exec(value))) {
      params[decodeURIComponent(m[1])] = decodeURIComponent(m[2].replace(/\+/g, ' '));
      if (counter++ > 50) {
        Log.error('UrlUtility.parseUrlFragment: response exceeded expected number of parameters', value);
        return { error: 'Response exceeded expected number of parameters' };
      }
    }

    return params;
  }
}

//=============================================================================
// JsonService
//=============================================================================

type JwtHandler = (req: XMLHttpRequest) => Promise<any>;

export class JsonService {
  private _contentTypes: string[];
  private _XMLHttpRequest: typeof XMLHttpRequest;
  private _jwtHandler: JwtHandler | null;

  constructor(
    additionalContentTypes: string[] | null = null,
    XMLHttpRequestCtor: typeof XMLHttpRequest = Global.XMLHttpRequest!,
    jwtHandler: JwtHandler | null = null,
  ) {
    this._contentTypes = additionalContentTypes ? [...additionalContentTypes] : [];
    this._contentTypes.push('application/json');
    if (jwtHandler) {
      this._contentTypes.push('application/jwt');
    }
    this._XMLHttpRequest = XMLHttpRequestCtor;
    this._jwtHandler = jwtHandler;
  }

  getJson(url: string, token?: string): Promise<any> {
    if (!url) {
      Log.error('JsonService.getJson: No url passed');
      throw new Error('url');
    }
    Log.debug('JsonService.getJson, url: ', url);

    return new Promise((resolve, reject) => {
      const req = new this._XMLHttpRequest();
      const _url = new URL(url);
      _url.searchParams.append('_ts', String(Date.now()));
      Log.debug('JsonService.getJson, cache buster url: ', _url.toString());
      req.open('GET', _url.toString());

      const allowedContentTypes = this._contentTypes;
      const jwtHandler = this._jwtHandler;

      req.onload = function () {
        Log.debug('JsonService.getJson: HTTP response received, status', req.status);
        if (req.status === 200) {
          const contentType = req.getResponseHeader('Content-Type');
          if (contentType) {
            const found = allowedContentTypes.find(item => contentType.startsWith(item));
            if (found === 'application/jwt') {
              jwtHandler!(req).then(resolve, reject);
              return;
            }
            if (found) {
              try {
                resolve(JSON.parse(req.responseText));
                return;
              } catch (e: unknown) {
                Log.error('JsonService.getJson: Error parsing JSON response', (e as Error).message);
                reject(e);
                return;
              }
            }
          }
          reject(Error('Invalid response Content-Type: ' + contentType + ', from URL: ' + url));
        } else {
          reject(Error(req.statusText + ' (' + req.status + ')'));
        }
      };

      req.onerror = function () {
        Log.error('JsonService.getJson: network error');
        reject(Error('Network Error'));
      };

      if (token) {
        Log.debug('JsonService.getJson: token passed, setting Authorization header');
        req.setRequestHeader('Authorization', 'Bearer ' + token);
      }

      req.send();
    });
  }

  postForm(url: string, payload: Record<string, any>, basicAuth?: string): Promise<any> {
    if (!url) {
      Log.error('JsonService.postForm: No url passed');
      throw new Error('url');
    }
    Log.debug('JsonService.postForm, url: ', url);

    return new Promise((resolve, reject) => {
      const req = new this._XMLHttpRequest();
      req.open('POST', url);
      const allowedContentTypes = this._contentTypes;

      req.onload = function () {
        Log.debug('JsonService.postForm: HTTP response received, status', req.status);

        if (req.status === 200) {
          const contentType = req.getResponseHeader('Content-Type');
          if (contentType) {
            const found = allowedContentTypes.find(item => contentType.startsWith(item));
            if (found) {
              try {
                resolve(JSON.parse(req.responseText));
                return;
              } catch (e: unknown) {
                Log.error('JsonService.postForm: Error parsing JSON response', (e as Error).message);
                reject(e);
                return;
              }
            }
          }
          reject(Error('Invalid response Content-Type: ' + contentType + ', from URL: ' + url));
          return;
        }

        if (req.status === 400) {
          const contentType = req.getResponseHeader('Content-Type');
          if (contentType) {
            const found = allowedContentTypes.find(item => contentType.startsWith(item));
            if (found) {
              try {
                const body = JSON.parse(req.responseText);
                if (body?.error) {
                  Log.error('JsonService.postForm: Error from server: ', body.error);
                  reject(new Error(body.error));
                  return;
                }
              } catch (e: unknown) {
                Log.error('JsonService.postForm: Error parsing JSON response', (e as Error).message);
                reject(e);
                return;
              }
            }
          }
        }

        reject(Error(req.statusText + ' (' + req.status + ')'));
      };

      req.onerror = function () {
        Log.error('JsonService.postForm: network error');
        reject(Error('Network Error'));
      };

      let body = '';
      for (const key in payload) {
        const value = payload[key];
        if (value) {
          if (body.length > 0) body += '&';
          body += encodeURIComponent(key) + '=' + encodeURIComponent(value);
        }
      }

      req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      if (basicAuth !== undefined) {
        req.setRequestHeader('Authorization', 'Basic ' + btoa(basicAuth));
      }
      req.send(body);
    });
  }
}

//=============================================================================
// MetadataService
//=============================================================================

const OidcMetadataUrlPath = '.well-known/openid-configuration';

export interface OidcMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint?: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
  check_session_iframe?: string;
  revocation_endpoint?: string;
  jwks_uri?: string;
  // OIDC discovery documents may include provider-specific extension fields.
  [key: string]: unknown;
}

export interface MetadataSettings {
  authority?: string;
  metadataUrl?: string;
  metadata?: OidcMetadata;
  metadataSeed?: Partial<OidcMetadata>;
  signingKeys?: JwkKey[];
}

export class MetadataService {
  private _settings: MetadataSettings;
  private _jsonService: JsonService;
  private _metadataUrl: string | undefined;

  constructor(settings: MetadataSettings, JsonServiceCtor: typeof JsonService = JsonService) {
    if (!settings) {
      Log.error('MetadataService: No settings passed to MetadataService');
      throw new Error('settings');
    }
    this._settings = settings;
    this._jsonService = new JsonServiceCtor(['application/jwk-set+json']);
  }

  get metadataUrl(): string | undefined {
    if (!this._metadataUrl) {
      if (this._settings.metadataUrl) {
        this._metadataUrl = this._settings.metadataUrl;
      } else {
        this._metadataUrl = this._settings.authority;
        if (this._metadataUrl && this._metadataUrl.indexOf(OidcMetadataUrlPath) < 0) {
          if (this._metadataUrl[this._metadataUrl.length - 1] !== '/') {
            this._metadataUrl += '/';
          }
          this._metadataUrl += OidcMetadataUrlPath;
        }
      }
    }
    return this._metadataUrl;
  }

  resetSigningKeys(): void {
    this._settings.signingKeys = undefined;
  }

  getMetadata(): Promise<OidcMetadata> {
    if (this._settings.metadata) {
      Log.debug('MetadataService.getMetadata: Returning metadata from settings');
      return Promise.resolve(this._settings.metadata);
    }
    if (!this.metadataUrl) {
      Log.error('MetadataService.getMetadata: No authority or metadataUrl configured on settings');
      return Promise.reject(new Error('No authority or metadataUrl configured on settings'));
    }
    Log.debug('MetadataService.getMetadata: getting metadata from', this.metadataUrl);
    return this._jsonService.getJson(this.metadataUrl).then(metadata => {
      Log.debug('MetadataService.getMetadata: json received');
      const seed = this._settings.metadataSeed || {};
      this._settings.metadata = Object.assign({} as OidcMetadata, seed, metadata);
      return this._settings.metadata!;
    });
  }

  getIssuer(): Promise<string> { return this._getMetadataProperty('issuer'); }
  getAuthorizationEndpoint(): Promise<string> { return this._getMetadataProperty('authorization_endpoint'); }
  getUserInfoEndpoint(): Promise<string> { return this._getMetadataProperty('userinfo_endpoint'); }
  getTokenEndpoint(optional = true): Promise<string | undefined> { return this._getMetadataProperty('token_endpoint', optional); }
  getCheckSessionIframe(): Promise<string | undefined> { return this._getMetadataProperty('check_session_iframe', true); }
  getEndSessionEndpoint(): Promise<string | undefined> { return this._getMetadataProperty('end_session_endpoint', true); }
  getRevocationEndpoint(): Promise<string | undefined> { return this._getMetadataProperty('revocation_endpoint', true); }
  getKeysEndpoint(): Promise<string | undefined> { return this._getMetadataProperty('jwks_uri', true); }

  private _getMetadataProperty(name: string, optional = false): Promise<any> {
    Log.debug('MetadataService.getMetadataProperty for: ' + name);
    return this.getMetadata().then(metadata => {
      Log.debug('MetadataService.getMetadataProperty: metadata received');
      if (metadata[name] === undefined) {
        if (optional) {
          Log.warn('MetadataService.getMetadataProperty: Metadata does not contain optional property ' + name);
          return undefined;
        }
        Log.error('MetadataService.getMetadataProperty: Metadata does not contain property ' + name);
        throw new Error('Metadata does not contain property ' + name);
      }
      return metadata[name];
    });
  }

  getSigningKeys(): Promise<any[]> {
    if (this._settings.signingKeys) {
      Log.debug('MetadataService.getSigningKeys: Returning signingKeys from settings');
      return Promise.resolve(this._settings.signingKeys);
    }
    return this._getMetadataProperty('jwks_uri').then((jwks_uri: string) => {
      Log.debug('MetadataService.getSigningKeys: jwks_uri received', jwks_uri);
      return this._jsonService.getJson(jwks_uri).then(keySet => {
        Log.debug('MetadataService.getSigningKeys: key set received', keySet);
        if (!keySet.keys) {
          Log.error('MetadataService.getSigningKeys: Missing keys on keyset');
          throw new Error('Missing keys on keyset');
        }
        this._settings.signingKeys = keySet.keys;
        return this._settings.signingKeys!;
      });
    });
  }
}
