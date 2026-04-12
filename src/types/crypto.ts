// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

//=============================================================================
// JwtHeader — decoded JWT header fields
//=============================================================================

export interface JwtHeader {
  alg?: string;
  kid?: string;
  [key: string]: unknown;
}

//=============================================================================
// JwkKey — cross-module JWKS key shape (OIDC/OAuth2 signing key)
//=============================================================================

export interface JwkKey {
  kty?: string;
  use?: string;
  alg?: string;
  kid?: string;
  n?: string;
  e?: string;
  crv?: string;
  x?: string;
  y?: string;
  x5c?: string[];
  [key: string]: unknown;
}

//=============================================================================
// JwtPayload — standard + extensible JWT claims
//=============================================================================

export interface JwtPayload {
  iss?: string;
  aud?: string | string[];
  azp?: string;
  iat?: number;
  nbf?: number;
  exp?: number;
  // OIDC/OAuth2 providers may include arbitrary additional claims.
  [key: string]: any;
}

//=============================================================================
// ParsedJwt — decoded JWT header + payload
//=============================================================================

export interface ParsedJwt {
  header: JwtHeader;
  payload: JwtPayload;
}
