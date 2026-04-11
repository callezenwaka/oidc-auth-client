// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import { Log } from '../utils/Log.js';
import { MetadataService } from '../services/Http.js';
import { UserInfoService, TokenClient } from './TokenService.js';
import { ErrorResponse } from './Responses.js';
import { JoseUtil } from '../crypto/Crypto.js';
import type { JoseUtilType } from '../crypto/Crypto.js';
import type { SigninResponse } from './Responses.js';
import type { SignoutResponse } from './Responses.js';
import type { UserProfile } from '../models/User.js';

const ProtocolClaims = ['nonce', 'at_hash', 'iat', 'nbf', 'exp', 'aud', 'iss', 'c_hash'];

export interface ValidatorSettings {
  authority?: string;
  client_id?: string;
  clockSkew?: number;
  loadUserInfo?: boolean;
  mergeClaims?: boolean;
  filterProtocolClaims?: boolean;
  getEpochTime(): Promise<number>;
  [key: string]: any;
}

export class ResponseValidator {
  private _settings: ValidatorSettings;
  private _metadataService: MetadataService;
  private _userInfoService: UserInfoService;
  private _joseUtil: JoseUtilType;
  private _tokenClient: TokenClient;

  constructor(
    settings: ValidatorSettings,
    MetadataServiceCtor: typeof MetadataService = MetadataService,
    UserInfoServiceCtor: typeof UserInfoService = UserInfoService,
    joseUtil: JoseUtilType = JoseUtil,
    TokenClientCtor: typeof TokenClient = TokenClient,
  ) {
    if (!settings) { Log.error('ResponseValidator.ctor: No settings passed to ResponseValidator'); throw new Error('settings'); }
    this._settings = settings;
    this._metadataService = new MetadataServiceCtor(this._settings);
    this._userInfoService = new UserInfoServiceCtor(this._settings);
    this._joseUtil = joseUtil;
    this._tokenClient = new TokenClientCtor(this._settings);
  }

  validateSigninResponse(state: any, response: SigninResponse): Promise<SigninResponse> {
    Log.debug('ResponseValidator.validateSigninResponse');
    return this._processSigninParams(state, response).then(response => {
      Log.debug('ResponseValidator.validateSigninResponse: state processed');
      return this._validateTokens(state, response).then(response => {
        Log.debug('ResponseValidator.validateSigninResponse: tokens validated');
        return this._processClaims(state, response).then(response => {
          Log.debug('ResponseValidator.validateSigninResponse: claims processed');
          return response;
        });
      });
    });
  }

  validateSignoutResponse(state: any, response: SignoutResponse): Promise<SignoutResponse> {
    if (state.id !== response.state) {
      Log.error('ResponseValidator.validateSignoutResponse: State does not match');
      return Promise.reject(new Error('State does not match'));
    }
    Log.debug('ResponseValidator.validateSignoutResponse: state validated');
    response.state = state.data;

    if (response.error) {
      Log.warn('ResponseValidator.validateSignoutResponse: Response was error', response.error);
      return Promise.reject(new ErrorResponse(response as any));
    }
    return Promise.resolve(response);
  }

  private _processSigninParams(state: any, response: SigninResponse): Promise<SigninResponse> {
    if (state.id !== response.state) {
      Log.error('ResponseValidator._processSigninParams: State does not match');
      return Promise.reject(new Error('State does not match'));
    }
    if (!state.client_id) {
      Log.error('ResponseValidator._processSigninParams: No client_id on state');
      return Promise.reject(new Error('No client_id on state'));
    }
    if (!state.authority) {
      Log.error('ResponseValidator._processSigninParams: No authority on state');
      return Promise.reject(new Error('No authority on state'));
    }

    if (!this._settings.authority) {
      this._settings.authority = state.authority;
    } else if (this._settings.authority !== state.authority) {
      Log.error('ResponseValidator._processSigninParams: authority mismatch on settings vs. signin state');
      return Promise.reject(new Error('authority mismatch on settings vs. signin state'));
    }

    if (!this._settings.client_id) {
      this._settings.client_id = state.client_id;
    } else if (this._settings.client_id !== state.client_id) {
      Log.error('ResponseValidator._processSigninParams: client_id mismatch on settings vs. signin state');
      return Promise.reject(new Error('client_id mismatch on settings vs. signin state'));
    }

    Log.debug('ResponseValidator._processSigninParams: state validated');
    response.state = state.data;

    if (response.error) {
      Log.warn('ResponseValidator._processSigninParams: Response was error', response.error);
      return Promise.reject(new ErrorResponse(response as any));
    }
    if (state.nonce && !response.id_token) {
      Log.error('ResponseValidator._processSigninParams: Expecting id_token in response');
      return Promise.reject(new Error('No id_token in response'));
    }
    if (!state.nonce && response.id_token) {
      Log.error('ResponseValidator._processSigninParams: Not expecting id_token in response');
      return Promise.reject(new Error('Unexpected id_token in response'));
    }
    if (state.code_verifier && !response.code) {
      Log.error('ResponseValidator._processSigninParams: Expecting code in response');
      return Promise.reject(new Error('No code in response'));
    }
    if (!state.code_verifier && response.code) {
      Log.error('ResponseValidator._processSigninParams: Not expecting code in response');
      return Promise.reject(new Error('Unexpected code in response'));
    }
    if (!response.scope) {
      response.scope = state.scope;
    }

    return Promise.resolve(response);
  }

  private _processClaims(state: any, response: SigninResponse): Promise<SigninResponse> {
    if (response.isOpenIdConnect) {
      Log.debug('ResponseValidator._processClaims: response is OIDC, processing claims');
      response.profile = this._filterProtocolClaims(response.profile);

      if (state.skipUserInfo !== true && this._settings.loadUserInfo && response.access_token) {
        Log.debug('ResponseValidator._processClaims: loading user info');
        return this._userInfoService.getClaims(response.access_token).then(claims => {
          Log.debug('ResponseValidator._processClaims: user info claims received from user info endpoint');
          if (claims.sub !== response.profile!.sub) {
            Log.error('ResponseValidator._processClaims: sub from user info endpoint does not match sub in id_token');
            return Promise.reject(new Error('sub from user info endpoint does not match sub in id_token'));
          }
          response.profile = this._mergeClaims(response.profile!, claims) as UserProfile;
          Log.debug('ResponseValidator._processClaims: user info claims received, updated profile:', response.profile);
          return response;
        });
      }
      Log.debug('ResponseValidator._processClaims: not loading user info');
    } else {
      Log.debug('ResponseValidator._processClaims: response is not OIDC, not processing claims');
    }
    return Promise.resolve(response);
  }

  private _mergeClaims(claims1: Record<string, any>, claims2: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = Object.assign({}, claims1);
    for (const name in claims2) {
      let values: any[] = claims2[name];
      if (!Array.isArray(values)) values = [values];
      for (const value of values) {
        if (!result[name]) {
          result[name] = value;
        } else if (Array.isArray(result[name])) {
          if (!result[name].includes(value)) result[name].push(value);
        } else if (result[name] !== value) {
          if (typeof value === 'object' && this._settings.mergeClaims) {
            result[name] = this._mergeClaims(result[name], value);
          } else {
            result[name] = [result[name], value];
          }
        }
      }
    }
    return result;
  }

  private _filterProtocolClaims(claims: any): any {
    Log.debug('ResponseValidator._filterProtocolClaims, incoming claims:', claims);
    const result = Object.assign({}, claims);
    if (this._settings.filterProtocolClaims) {
      ProtocolClaims.forEach(type => delete result[type]);
      Log.debug('ResponseValidator._filterProtocolClaims: protocol claims filtered', result);
    } else {
      Log.debug('ResponseValidator._filterProtocolClaims: protocol claims not filtered');
    }
    return result;
  }

  private _validateTokens(state: any, response: SigninResponse): Promise<SigninResponse> {
    if (response.code) {
      Log.debug('ResponseValidator._validateTokens: Validating code');
      return this._processCode(state, response);
    }
    if (response.id_token) {
      if (response.access_token) {
        Log.debug('ResponseValidator._validateTokens: Validating id_token and access_token');
        return this._validateIdTokenAndAccessToken(state, response);
      }
      Log.debug('ResponseValidator._validateTokens: Validating id_token');
      return this._validateIdToken(state, response);
    }
    Log.debug('ResponseValidator._validateTokens: No code to process or id_token to validate');
    return Promise.resolve(response);
  }

  private _processCode(state: any, response: SigninResponse): Promise<SigninResponse> {
    const request: Record<string, any> = {
      client_id: state.client_id,
      client_secret: state.client_secret,
      code: response.code,
      redirect_uri: state.redirect_uri,
      code_verifier: state.code_verifier,
    };
    if (state.extraTokenParams && typeof state.extraTokenParams === 'object') {
      Object.assign(request, state.extraTokenParams);
    }
    return this._tokenClient.exchangeCode(request).then(tokenResponse => {
      for (const key in tokenResponse) {
        (response as any)[key] = tokenResponse[key];
      }
      if (response.id_token) {
        Log.debug('ResponseValidator._processCode: token response successful, processing id_token');
        return this._validateIdTokenAttributes(state, response);
      }
      Log.debug('ResponseValidator._processCode: token response successful, returning response');
      return response;
    });
  }

  private _validateIdTokenAttributes(state: any, response: SigninResponse): Promise<SigninResponse> {
    return this._metadataService.getIssuer().then(issuer => {
      const audience = state.client_id;
      const clockSkewInSeconds = this._settings.clockSkew;
      Log.debug('ResponseValidator._validateIdTokenAttributes: Validating JWT attributes; using clock skew (in seconds) of: ', clockSkewInSeconds);
      return this._settings.getEpochTime().then(now => {
        return this._joseUtil.validateJwtAttributes(response.id_token!, issuer, audience, clockSkewInSeconds, now)
          .then(payload => {
            if (state.nonce && state.nonce !== payload.nonce) {
              Log.error('ResponseValidator._validateIdTokenAttributes: Invalid nonce in id_token');
              return Promise.reject(new Error('Invalid nonce in id_token'));
            }
            if (!payload.sub) {
              Log.error('ResponseValidator._validateIdTokenAttributes: No sub present in id_token');
              return Promise.reject(new Error('No sub present in id_token'));
            }
            response.profile = payload as any;
            return response;
          });
      });
    });
  }

  private _validateIdTokenAndAccessToken(state: any, response: SigninResponse): Promise<SigninResponse> {
    return this._validateIdToken(state, response).then(response => this._validateAccessToken(response));
  }

  private _getSigningKeyForJwt(jwt: any): Promise<any> {
    return this._metadataService.getSigningKeys().then(keys => {
      const kid = jwt.header.kid;
      if (!keys) {
        Log.error('ResponseValidator._validateIdToken: No signing keys from metadata');
        return Promise.reject(new Error('No signing keys from metadata'));
      }
      Log.debug('ResponseValidator._validateIdToken: Received signing keys');
      if (!kid) {
        const filtered = this._filterByAlg(keys, jwt.header.alg);
        if (filtered.length > 1) {
          Log.error('ResponseValidator._validateIdToken: No kid found in id_token and more than one key found in metadata');
          return Promise.reject(new Error('No kid found in id_token and more than one key found in metadata'));
        }
        return Promise.resolve(filtered[0]);
      }
      return Promise.resolve(keys.find((k: any) => k.kid === kid));
    });
  }

  private _getSigningKeyForJwtWithSingleRetry(jwt: any): Promise<any> {
    return this._getSigningKeyForJwt(jwt).then(key => {
      if (!key) {
        this._metadataService.resetSigningKeys();
        return this._getSigningKeyForJwt(jwt);
      }
      return Promise.resolve(key);
    });
  }

  private _validateIdToken(state: any, response: SigninResponse): Promise<SigninResponse> {
    if (!state.nonce) {
      Log.error('ResponseValidator._validateIdToken: No nonce on state');
      return Promise.reject(new Error('No nonce on state'));
    }
    const jwt = this._joseUtil.parseJwt(response.id_token!);
    if (!jwt?.header || !jwt?.payload) {
      Log.error('ResponseValidator._validateIdToken: Failed to parse id_token', jwt);
      return Promise.reject(new Error('Failed to parse id_token'));
    }
    if (state.nonce !== jwt.payload.nonce) {
      Log.error('ResponseValidator._validateIdToken: Invalid nonce in id_token');
      return Promise.reject(new Error('Invalid nonce in id_token'));
    }
    return this._metadataService.getIssuer().then(issuer => {
      Log.debug('ResponseValidator._validateIdToken: Received issuer');
      return this._getSigningKeyForJwtWithSingleRetry(jwt).then(key => {
        if (!key) {
          Log.error('ResponseValidator._validateIdToken: No key matching kid or alg found in signing keys');
          return Promise.reject(new Error('No key matching kid or alg found in signing keys'));
        }
        const audience = state.client_id;
        const clockSkewInSeconds = this._settings.clockSkew;
        Log.debug('ResponseValidator._validateIdToken: Validating JWT; using clock skew (in seconds) of: ', clockSkewInSeconds);
        return this._joseUtil.validateJwt(response.id_token!, key, issuer, audience, clockSkewInSeconds).then(() => {
          Log.debug('ResponseValidator._validateIdToken: JWT validation successful');
          if (!jwt.payload.sub) {
            Log.error('ResponseValidator._validateIdToken: No sub present in id_token');
            return Promise.reject(new Error('No sub present in id_token'));
          }
          response.profile = jwt.payload as any;
          return response;
        });
      });
    });
  }

  private _filterByAlg(keys: any[], alg: string): any[] {
    let kty: string | null = null;
    if (alg.startsWith('RS')) kty = 'RSA';
    else if (alg.startsWith('PS')) kty = 'PS';
    else if (alg.startsWith('ES')) kty = 'EC';
    else { Log.debug('ResponseValidator._filterByAlg: alg not supported: ', alg); return []; }
    Log.debug('ResponseValidator._filterByAlg: Looking for keys that match kty: ', kty);
    keys = keys.filter(k => k.kty === kty);
    Log.debug('ResponseValidator._filterByAlg: Number of keys that match kty: ', kty, keys.length);
    return keys;
  }

  private _validateAccessToken(response: SigninResponse): Promise<SigninResponse> {
    if (!response.profile) {
      Log.error('ResponseValidator._validateAccessToken: No profile loaded from id_token');
      return Promise.reject(new Error('No profile loaded from id_token'));
    }
    if (!(response.profile as any).at_hash) {
      Log.error('ResponseValidator._validateAccessToken: No at_hash in id_token');
      return Promise.reject(new Error('No at_hash in id_token'));
    }
    if (!response.id_token) {
      Log.error('ResponseValidator._validateAccessToken: No id_token');
      return Promise.reject(new Error('No id_token'));
    }
    const jwt = this._joseUtil.parseJwt(response.id_token);
    if (!jwt?.header) {
      Log.error('ResponseValidator._validateAccessToken: Failed to parse id_token', jwt);
      return Promise.reject(new Error('Failed to parse id_token'));
    }
    const hashAlg: string = jwt.header.alg;
    if (!hashAlg || hashAlg.length !== 5) {
      Log.error('ResponseValidator._validateAccessToken: Unsupported alg:', hashAlg);
      return Promise.reject(new Error('Unsupported alg: ' + hashAlg));
    }
    const hashBitsStr = hashAlg.substring(2, 5);
    const hashBits = parseInt(hashBitsStr);
    if (hashBits !== 256 && hashBits !== 384 && hashBits !== 512) {
      Log.error('ResponseValidator._validateAccessToken: Unsupported alg:', hashAlg, hashBits);
      return Promise.reject(new Error('Unsupported alg: ' + hashAlg));
    }

    const sha = 'sha' + hashBits;
    const hash = this._joseUtil.hashString(response.access_token!, sha);
    if (!hash) {
      Log.error('ResponseValidator._validateAccessToken: access_token hash failed:', sha);
      return Promise.reject(new Error('Failed to validate at_hash'));
    }

    const left = hash.substring(0, hash.length / 2);
    const left_b64u = this._joseUtil.hexToBase64Url(left);
    if (left_b64u !== (response.profile as any).at_hash) {
      Log.error('ResponseValidator._validateAccessToken: Failed to validate at_hash', left_b64u, (response.profile as any).at_hash);
      return Promise.reject(new Error('Failed to validate at_hash'));
    }

    Log.debug('ResponseValidator._validateAccessToken: success');
    return Promise.resolve(response);
  }
}
