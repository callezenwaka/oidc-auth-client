// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import { Log } from '../utils/Log.js';
import {
  importJWK,
  jwtVerify,
  decodeJwt,
  decodeProtectedHeader,
  base64url,
} from 'jose';
import type { JwkKey, JwtPayload, ParsedJwt } from '../types/crypto.js';
export type { JwtPayload, ParsedJwt } from '../types/crypto.js';

//=============================================================================
// Random generation
//=============================================================================

export function generateRandom(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

//=============================================================================
// JoseUtil — JWT parsing, verification, and PKCE via the `jose` library
//=============================================================================

export class JoseUtil {
  static parseJwt(jwt: string): ParsedJwt | undefined {
    Log.debug('JoseUtil.parseJwt');
    try {
      const header = decodeProtectedHeader(jwt);
      const payload = decodeJwt(jwt);
      return {
        header: { alg: header.alg, kid: header.kid, ...header },
        payload: payload as JwtPayload,
      };
    } catch (e: unknown) {
      Log.error(e);
      return undefined;
    }
  }

  static async validateJwt(
    jwt: string,
    key: JwkKey,
    issuer: string,
    audience: string,
    clockSkew: number = 0,
    _now?: number,
    timeInsensitive?: boolean,
  ): Promise<JwtPayload> {
    Log.debug('JoseUtil.validateJwt');
    try {
      const alg = decodeProtectedHeader(jwt).alg ?? 'RS256';
      const cryptoKey = await importJWK(key, alg);
      const { payload } = await jwtVerify(jwt, cryptoKey, {
        issuer,
        audience,
        clockTolerance: clockSkew,
        ...( timeInsensitive ? { currentDate: new Date(0) } : {} ),
      });
      return payload as JwtPayload;
    } catch (e: unknown) {
      Log.error((e as Error)?.message || String(e));
      return Promise.reject(new Error('JWT validation failed: ' + (e as Error)?.message));
    }
  }

  static async validateJwtAttributes(
    jwt: string,
    issuer: string,
    audience: string,
    clockSkew: number = 0,
    _now?: number,
    timeInsensitive?: boolean,
  ): Promise<JwtPayload> {
    // Validates claims only (no signature check). Used when the signature has
    // already been verified separately (e.g. refresh token flow).
    Log.debug('JoseUtil.validateJwtAttributes');
    const parsed = JoseUtil.parseJwt(jwt);
    if (!parsed) return Promise.reject(new Error('Failed to parse JWT'));
    const payload = parsed.payload;

    if (!payload.iss) return Promise.reject(new Error('issuer was not provided'));
    if (payload.iss !== issuer) return Promise.reject(new Error('Invalid issuer in token: ' + payload.iss));
    if (!payload.aud) return Promise.reject(new Error('aud was not provided'));

    const validAudience = payload.aud === audience ||
      (Array.isArray(payload.aud) && payload.aud.includes(audience));
    if (!validAudience) return Promise.reject(new Error('Invalid audience in token: ' + String(payload.aud)));

    if (payload.azp && payload.azp !== audience)
      return Promise.reject(new Error('Invalid azp in token: ' + String(payload.azp)));

    if (!timeInsensitive) {
      const now = Math.floor(Date.now() / 1000);
      const lower = now + clockSkew;
      const upper = now - clockSkew;

      if (!payload.iat) return Promise.reject(new Error('iat was not provided'));
      if (lower < payload.iat) return Promise.reject(new Error('iat is in the future: ' + payload.iat));
      if (payload.nbf && lower < payload.nbf) return Promise.reject(new Error('nbf is in the future: ' + payload.nbf));
      if (!payload.exp) return Promise.reject(new Error('exp was not provided'));
      if (payload.exp < upper) return Promise.reject(new Error('exp is in the past: ' + payload.exp));
    }

    return payload;
  }

  static async hashString(value: string, alg: string): Promise<string> {
    // Returns hex-encoded hash. Used for at_hash validation in ResponseValidator.
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashAlg = alg.replace('SHA', 'SHA-') as AlgorithmIdentifier;
    const hashBuffer = await crypto.subtle.digest(hashAlg, data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static hexToBase64Url(hex: string): string {
    // Converts a hex-encoded string to base64url. Used for at_hash comparison.
    const bytes = new Uint8Array(hex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    return base64url.encode(bytes);
  }

  static async calculatePKCECodeChallenge(codeVerifier: string): Promise<string> {
    // SHA-256 hash of the code verifier, base64url-encoded (S256 method).
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64url.encode(new Uint8Array(digest));
  }
}

// Utility type — the static shape of JoseUtil
export type JoseUtilType = typeof JoseUtil;
export default JoseUtil;
