// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import { Log } from '../utils/Log.js';
import { Global } from '../utils/Global.js';
import { JsonService, MetadataService } from '../services/Http.js';
import { JoseUtil } from '../crypto/Crypto.js';
import type { JoseUtilType } from '../crypto/Crypto.js';
import type { ParsedJwt } from '../crypto/Crypto.js';

export interface TokenSettings {
  authority?: string;
  client_id?: string;
  client_secret?: string;
  redirect_uri?: string;
  _client_authentication?: string;
  userInfoJwtIssuer?: string;
  clockSkew?: number;
  [key: string]: any;
}

//=============================================================================
// TokenClient
//=============================================================================

export class TokenClient {
  private _settings: TokenSettings;
  private _jsonService: JsonService;
  private _metadataService: MetadataService;

  constructor(
    settings: TokenSettings,
    JsonServiceCtor: typeof JsonService = JsonService,
    MetadataServiceCtor: typeof MetadataService = MetadataService,
  ) {
    if (!settings) { Log.error('TokenClient.ctor: No settings passed'); throw new Error('settings'); }
    this._settings = settings;
    this._jsonService = new JsonServiceCtor();
    this._metadataService = new MetadataServiceCtor(this._settings);
  }

  exchangeCode(args: Record<string, any> = {}): Promise<any> {
    args = Object.assign({}, args);
    args.grant_type = args.grant_type || 'authorization_code';
    args.client_id = args.client_id || this._settings.client_id;
    args.client_secret = args.client_secret || this._settings.client_secret;
    args.redirect_uri = args.redirect_uri || this._settings.redirect_uri;

    let basicAuth: string | undefined;
    const client_authentication = args._client_authentication || this._settings._client_authentication;
    delete args._client_authentication;

    if (!args.code) { Log.error('TokenClient.exchangeCode: No code passed'); return Promise.reject(new Error('A code is required')); }
    if (!args.redirect_uri) { Log.error('TokenClient.exchangeCode: No redirect_uri passed'); return Promise.reject(new Error('A redirect_uri is required')); }
    if (!args.code_verifier) { Log.error('TokenClient.exchangeCode: No code_verifier passed'); return Promise.reject(new Error('A code_verifier is required')); }
    if (!args.client_id) { Log.error('TokenClient.exchangeCode: No client_id passed'); return Promise.reject(new Error('A client_id is required')); }
    if (!args.client_secret && client_authentication === 'client_secret_basic') {
      Log.error('TokenClient.exchangeCode: No client_secret passed');
      return Promise.reject(new Error('A client_secret is required'));
    }

    if (client_authentication === 'client_secret_basic') {
      basicAuth = args.client_id + ':' + args.client_secret;
      delete args.client_id;
      delete args.client_secret;
    }

    return this._metadataService.getTokenEndpoint(false).then(url => {
      Log.debug('TokenClient.exchangeCode: Received token endpoint');
      return this._jsonService.postForm(url!, args, basicAuth).then(response => {
        Log.debug('TokenClient.exchangeCode: response received');
        return response;
      });
    });
  }

  exchangeRefreshToken(args: Record<string, any> = {}): Promise<any> {
    args = Object.assign({}, args);
    args.grant_type = args.grant_type || 'refresh_token';
    args.client_id = args.client_id || this._settings.client_id;
    args.client_secret = args.client_secret || this._settings.client_secret;

    let basicAuth: string | undefined;
    const client_authentication = args._client_authentication || this._settings._client_authentication;
    delete args._client_authentication;

    if (!args.refresh_token) { Log.error('TokenClient.exchangeRefreshToken: No refresh_token passed'); return Promise.reject(new Error('A refresh_token is required')); }
    if (!args.client_id) { Log.error('TokenClient.exchangeRefreshToken: No client_id passed'); return Promise.reject(new Error('A client_id is required')); }

    if (client_authentication === 'client_secret_basic') {
      basicAuth = args.client_id + ':' + args.client_secret;
      delete args.client_id;
      delete args.client_secret;
    }

    return this._metadataService.getTokenEndpoint(false).then(url => {
      Log.debug('TokenClient.exchangeRefreshToken: Received token endpoint');
      return this._jsonService.postForm(url!, args, basicAuth).then(response => {
        Log.debug('TokenClient.exchangeRefreshToken: response received');
        return response;
      });
    });
  }
}

//=============================================================================
// TokenRevocationClient
//=============================================================================

const AccessTokenTypeHint = 'access_token';
const RefreshTokenTypeHint = 'refresh_token';

export class TokenRevocationClient {
  private _settings: TokenSettings;
  private _XMLHttpRequestCtor: typeof XMLHttpRequest;
  private _metadataService: MetadataService;

  constructor(
    settings: TokenSettings,
    XMLHttpRequestCtor: typeof XMLHttpRequest = Global.XMLHttpRequest!,
    MetadataServiceCtor: typeof MetadataService = MetadataService,
  ) {
    if (!settings) { Log.error('TokenRevocationClient.ctor: No settings provided'); throw new Error('No settings provided.'); }
    this._settings = settings;
    this._XMLHttpRequestCtor = XMLHttpRequestCtor;
    this._metadataService = new MetadataServiceCtor(this._settings);
  }

  revoke(token: string, required?: boolean, type: string = 'access_token'): Promise<void> {
    if (!token) { Log.error('TokenRevocationClient.revoke: No token provided'); throw new Error('No token provided.'); }
    if (type !== AccessTokenTypeHint && type !== RefreshTokenTypeHint) {
      Log.error('TokenRevocationClient.revoke: Invalid token type');
      throw new Error('Invalid token type.');
    }

    return this._metadataService.getRevocationEndpoint().then(url => {
      if (!url) {
        if (required) {
          Log.error('TokenRevocationClient.revoke: Revocation not supported');
          throw new Error('Revocation not supported');
        }
        return;
      }
      Log.debug('TokenRevocationClient.revoke: Revoking ' + type);
      return this._revoke(url, this._settings.client_id!, this._settings.client_secret, token, type);
    });
  }

  private _revoke(url: string, client_id: string, client_secret: string | undefined, token: string, type: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new this._XMLHttpRequestCtor();
      xhr.open('POST', url);

      xhr.onload = () => {
        Log.debug('TokenRevocationClient.revoke: HTTP response received, status', xhr.status);
        if (xhr.status === 200) { resolve(); }
        else { reject(Error(xhr.statusText + ' (' + xhr.status + ')')); }
      };
      xhr.onerror = () => {
        Log.debug('TokenRevocationClient.revoke: Network Error.');
        reject('Network Error');
      };

      let body = 'client_id=' + encodeURIComponent(client_id);
      if (client_secret) body += '&client_secret=' + encodeURIComponent(client_secret);
      body += '&token_type_hint=' + encodeURIComponent(type);
      body += '&token=' + encodeURIComponent(token);

      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      xhr.send(body);
    });
  }
}

//=============================================================================
// UserInfoService
//=============================================================================

export class UserInfoService {
  private _settings: TokenSettings;
  private _jsonService: JsonService;
  private _metadataService: MetadataService;
  private _joseUtil: JoseUtilType;

  constructor(
    settings: TokenSettings,
    JsonServiceCtor: typeof JsonService = JsonService,
    MetadataServiceCtor: typeof MetadataService = MetadataService,
    joseUtil: JoseUtilType = JoseUtil,
  ) {
    if (!settings) { Log.error('UserInfoService.ctor: No settings passed'); throw new Error('settings'); }
    this._settings = settings;
    this._jsonService = new JsonServiceCtor(
      undefined,
      undefined,
      this._getClaimsFromJwt.bind(this),
    );
    this._metadataService = new MetadataServiceCtor(this._settings);
    this._joseUtil = joseUtil;
  }

  getClaims(token: string): Promise<any> {
    if (!token) { Log.error('UserInfoService.getClaims: No token passed'); return Promise.reject(new Error('A token is required')); }
    return this._metadataService.getUserInfoEndpoint().then(url => {
      Log.debug('UserInfoService.getClaims: received userinfo url', url);
      return this._jsonService.getJson(url, token).then(claims => {
        Log.debug('UserInfoService.getClaims: claims received', claims);
        return claims;
      });
    });
  }

  private _getClaimsFromJwt(req: XMLHttpRequest): Promise<any> {
    try {
      const jwt: ParsedJwt | undefined = this._joseUtil.parseJwt(req.responseText);
      if (!jwt?.header || !jwt?.payload) {
        Log.error('UserInfoService._getClaimsFromJwt: Failed to parse JWT', jwt);
        return Promise.reject(new Error('Failed to parse id_token'));
      }

      const kid = jwt.header.kid;

      let issuerPromise: Promise<string>;
      switch (this._settings.userInfoJwtIssuer) {
        case 'OP':
          issuerPromise = this._metadataService.getIssuer();
          break;
        case 'ANY':
          issuerPromise = Promise.resolve(jwt.payload.iss as string);
          break;
        default:
          issuerPromise = Promise.resolve(this._settings.userInfoJwtIssuer as string);
          break;
      }

      return issuerPromise.then(issuer => {
        Log.debug('UserInfoService._getClaimsFromJwt: Received issuer:' + issuer);
        return this._metadataService.getSigningKeys().then(keys => {
          if (!keys) {
            Log.error('UserInfoService._getClaimsFromJwt: No signing keys from metadata');
            return Promise.reject(new Error('No signing keys from metadata'));
          }

          Log.debug('UserInfoService._getClaimsFromJwt: Received signing keys');
          let key: any;
          if (!kid) {
            keys = this._filterByAlg(keys, jwt.header.alg);
            if (keys.length > 1) {
              Log.error('UserInfoService._getClaimsFromJwt: No kid found in id_token and more than one key found in metadata');
              return Promise.reject(new Error('No kid found in id_token and more than one key found in metadata'));
            }
            key = keys[0];
          } else {
            key = keys.find((k: any) => k.kid === kid);
          }

          if (!key) {
            Log.error('UserInfoService._getClaimsFromJwt: No key matching kid or alg found in signing keys');
            return Promise.reject(new Error('No key matching kid or alg found in signing keys'));
          }

          const audience = this._settings.client_id;
          const clockSkewInSeconds = this._settings.clockSkew;
          Log.debug('UserInfoService._getClaimsFromJwt: Validating JWT; using clock skew (in seconds) of: ', clockSkewInSeconds);

          return this._joseUtil.validateJwt(req.responseText, key, issuer, audience!, clockSkewInSeconds, undefined, true)
            .then(() => {
              Log.debug('UserInfoService._getClaimsFromJwt: JWT validation successful');
              return jwt.payload;
            });
        });
      });
    } catch (e: any) {
      Log.error('UserInfoService._getClaimsFromJwt: Error parsing JWT response', e.message);
      return Promise.reject(e);
    }
  }

  private _filterByAlg(keys: any[], alg: string): any[] {
    let kty: string | null = null;
    if (alg.startsWith('RS')) kty = 'RSA';
    else if (alg.startsWith('PS')) kty = 'PS';
    else if (alg.startsWith('ES')) kty = 'EC';
    else { Log.debug('UserInfoService._filterByAlg: alg not supported: ', alg); return []; }
    Log.debug('UserInfoService._filterByAlg: Looking for keys that match kty: ', kty);
    keys = keys.filter(k => k.kty === kty);
    Log.debug('UserInfoService._filterByAlg: Number of keys that match kty: ', kty, keys.length);
    return keys;
  }
}
