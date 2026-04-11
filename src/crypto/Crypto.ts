// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import { Log } from '../utils/Log.js';
import {
  jws as jsrsasignJws,
  KeyUtil as jsrsasignKeyUtil,
  X509 as jsrsasignX509,
  crypto as jsrsasignCrypto,
  hextob64u as jsrsasignHextob64u,
  b64tohex as jsrsasignB64tohex,
  AllowedSigningAlgs as jsrsasignAllowedSigningAlgs,
} from './jsrsasign.js';
import {
  jws as rsaJws,
  KeyUtil as rsaKeyUtil,
  X509 as rsaX509,
  crypto as rsaCrypto,
  hextob64u as rsaHextob64u,
  b64tohex as rsaB64tohex,
  AllowedSigningAlgs as rsaAllowedSigningAlgs,
} from './rsa.js';
import type { JWS, KeyUtilType, X509Type, CryptoType } from './jsrsasign.js';

//=============================================================================
// Types
//=============================================================================

export interface CryptoBackend {
  jws: JWS;
  KeyUtil: KeyUtilType;
  X509: X509Type;
  crypto: CryptoType;
  hextob64u: (hex: string) => string;
  b64tohex: (b64: string) => string;
  AllowedSigningAlgs: string[];
}

export interface JwtPayload {
  iss?: string;
  aud?: string | string[];
  azp?: string;
  iat?: number;
  nbf?: number;
  exp?: number;
  [key: string]: any;
}

export interface ParsedJwt {
  header: any;
  payload: JwtPayload;
}

//=============================================================================
// Random UUID generation
//=============================================================================

const _crypto = typeof window !== 'undefined'
  ? ((window as any).crypto || (window as any).msCrypto as Crypto | null)
  : null;

function _cryptoUuidv4(): string {
  return (([1e7] as any) + -1e3 + -4e3 + -8e3 + -1e11).replace(
    /[018]/g,
    (c: number) => (c ^ (_crypto!.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
  );
}

function _uuidv4(): string {
  return (([1e7] as any) + -1e3 + -4e3 + -8e3 + -1e11).replace(
    /[018]/g,
    (c: number) => (c ^ ((Math.random() * 16) >> (c / 4))).toString(16),
  );
}

export function generateRandom(): string {
  const hasCrypto = _crypto != null;
  const hasRandomValues = hasCrypto && typeof _crypto!.getRandomValues !== 'undefined';
  return (hasRandomValues ? _cryptoUuidv4() : _uuidv4()).replace(/-/g, '');
}

//=============================================================================
// JOSE utility factory
//=============================================================================

export function getJoseUtil(cryptoLib: CryptoBackend) {
  const { jws, KeyUtil, X509, crypto, hextob64u, b64tohex, AllowedSigningAlgs } = cryptoLib;

  return class JoseUtil {
    static parseJwt(jwt: string): ParsedJwt | undefined {
      Log.debug('JoseUtil.parseJwt');
      try {
        const token = jws.JWS.parse(jwt);
        return { header: token.headerObj, payload: token.payloadObj };
      } catch (e) {
        Log.error(e);
        return undefined;
      }
    }

    static validateJwt(
      jwt: string,
      key: any,
      issuer: string,
      audience: string,
      clockSkew?: number,
      now?: number,
      timeInsensitive?: boolean,
    ): Promise<JwtPayload> {
      Log.debug('JoseUtil.validateJwt');
      try {
        if (key.kty === 'RSA') {
          if (key.e && key.n) {
            key = KeyUtil.getKey(key);
          } else if (key.x5c?.length) {
            key = X509.getPublicKeyFromCertHex(b64tohex(key.x5c[0]));
          } else {
            Log.error('JoseUtil.validateJwt: RSA key missing key material', key);
            return Promise.reject(new Error('RSA key missing key material'));
          }
        } else if (key.kty === 'EC') {
          if (key.crv && key.x && key.y) {
            key = KeyUtil.getKey(key);
          } else {
            Log.error('JoseUtil.validateJwt: EC key missing key material', key);
            return Promise.reject(new Error('EC key missing key material'));
          }
        } else {
          Log.error('JoseUtil.validateJwt: Unsupported key type', key?.kty);
          return Promise.reject(new Error('Unsupported key type: ' + key?.kty));
        }
        return JoseUtil._validateJwt(jwt, key, issuer, audience, clockSkew, now, timeInsensitive);
      } catch (e: any) {
        Log.error(e?.message || e);
        return Promise.reject('JWT validation failed');
      }
    }

    static validateJwtAttributes(
      jwt: string,
      issuer: string,
      audience: string,
      clockSkew: number = 0,
      now: number = Math.floor(Date.now() / 1000),
      timeInsensitive?: boolean,
    ): Promise<JwtPayload> {
      const parsed = JoseUtil.parseJwt(jwt);
      if (!parsed) return Promise.reject(new Error('Failed to parse JWT'));
      const payload = parsed.payload;

      if (!payload.iss) {
        Log.error('JoseUtil._validateJwt: issuer was not provided');
        return Promise.reject(new Error('issuer was not provided'));
      }
      if (payload.iss !== issuer) {
        Log.error('JoseUtil._validateJwt: Invalid issuer in token', payload.iss);
        return Promise.reject(new Error('Invalid issuer in token: ' + payload.iss));
      }
      if (!payload.aud) {
        Log.error('JoseUtil._validateJwt: aud was not provided');
        return Promise.reject(new Error('aud was not provided'));
      }
      const validAudience = payload.aud === audience ||
        (Array.isArray(payload.aud) && payload.aud.includes(audience));
      if (!validAudience) {
        Log.error('JoseUtil._validateJwt: Invalid audience in token', payload.aud);
        return Promise.reject(new Error('Invalid audience in token: ' + payload.aud));
      }
      if (payload.azp && payload.azp !== audience) {
        Log.error('JoseUtil._validateJwt: Invalid azp in token', payload.azp);
        return Promise.reject(new Error('Invalid azp in token: ' + payload.azp));
      }

      if (!timeInsensitive) {
        const lowerNow = now + clockSkew;
        const upperNow = now - clockSkew;

        if (!payload.iat) {
          Log.error('JoseUtil._validateJwt: iat was not provided');
          return Promise.reject(new Error('iat was not provided'));
        }
        if (lowerNow < payload.iat) {
          Log.error('JoseUtil._validateJwt: iat is in the future', payload.iat);
          return Promise.reject(new Error('iat is in the future: ' + payload.iat));
        }
        if (payload.nbf && lowerNow < payload.nbf) {
          Log.error('JoseUtil._validateJwt: nbf is in the future', payload.nbf);
          return Promise.reject(new Error('nbf is in the future: ' + payload.nbf));
        }
        if (!payload.exp) {
          Log.error('JoseUtil._validateJwt: exp was not provided');
          return Promise.reject(new Error('exp was not provided'));
        }
        if (payload.exp < upperNow) {
          Log.error('JoseUtil._validateJwt: exp is in the past', payload.exp);
          return Promise.reject(new Error('exp is in the past:' + payload.exp));
        }
      }

      return Promise.resolve(payload);
    }

    static _validateJwt(
      jwt: string,
      key: any,
      issuer: string,
      audience: string,
      clockSkew?: number,
      now?: number,
      timeInsensitive?: boolean,
    ): Promise<JwtPayload> {
      return JoseUtil.validateJwtAttributes(jwt, issuer, audience, clockSkew, now, timeInsensitive)
        .then(payload => {
          try {
            if (!jws.JWS.verify(jwt, key, AllowedSigningAlgs)) {
              Log.error('JoseUtil._validateJwt: signature validation failed');
              return Promise.reject(new Error('signature validation failed'));
            }
            return payload;
          } catch (e: any) {
            Log.error(e?.message || e);
            return Promise.reject(new Error('signature validation failed'));
          }
        });
    }

    static hashString(value: string, alg: string): string | undefined {
      try {
        return crypto.Util.hashString(value, alg);
      } catch (e) {
        Log.error(e);
        return undefined;
      }
    }

    static hexToBase64Url(value: string): string | undefined {
      try {
        return hextob64u(value);
      } catch (e) {
        Log.error(e);
        return undefined;
      }
    }
  };
}

//=============================================================================
// Pre-configured instances
//=============================================================================

export const JoseUtil = getJoseUtil({
  jws: jsrsasignJws,
  KeyUtil: jsrsasignKeyUtil,
  X509: jsrsasignX509,
  crypto: jsrsasignCrypto,
  hextob64u: jsrsasignHextob64u,
  b64tohex: jsrsasignB64tohex,
  AllowedSigningAlgs: jsrsasignAllowedSigningAlgs,
});

export const JoseUtilRsa = getJoseUtil({
  jws: rsaJws,
  KeyUtil: rsaKeyUtil,
  X509: rsaX509,
  crypto: rsaCrypto,
  hextob64u: rsaHextob64u,
  b64tohex: rsaB64tohex,
  AllowedSigningAlgs: rsaAllowedSigningAlgs,
});

export default JoseUtil;

// Utility type — the static shape returned by getJoseUtil()
export type JoseUtilType = typeof JoseUtil;
