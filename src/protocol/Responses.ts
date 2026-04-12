// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import { Log } from '../utils/Log.js';
import { UrlUtility } from '../services/Http.js';
import type { UserProfile } from '../types/user.js';

const OidcScope = 'openid';

//=============================================================================
// SigninResponse
//=============================================================================

export class SigninResponse {
  error: string | undefined;
  error_description: string | undefined;
  error_uri: string | undefined;
  code: string | undefined;
  state: unknown;
  id_token: string | undefined;
  session_state: string | undefined;
  access_token: string | undefined;
  token_type: string | undefined;
  scope: string | undefined;
  profile: UserProfile | undefined;
  expires_at: number | undefined;

  constructor(url: string, delimiter: string = '#') {
    const values = UrlUtility.parseUrlFragment(url, delimiter);

    this.error = values.error;
    this.error_description = values.error_description;
    this.error_uri = values.error_uri;
    this.code = values.code;
    this.state = values.state;
    this.id_token = values.id_token;
    this.session_state = values.session_state;
    this.access_token = values.access_token;
    this.token_type = values.token_type;
    this.scope = values.scope;
    this.profile = undefined;
    this.expires_in = values.expires_in;
  }

  get expires_in(): number | undefined {
    if (this.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      return this.expires_at - now;
    }
    return undefined;
  }
  set expires_in(value: string | number | undefined) {
    const expires_in = parseInt(String(value));
    if (typeof expires_in === 'number' && expires_in > 0) {
      const now = Math.floor(Date.now() / 1000);
      this.expires_at = now + expires_in;
    }
  }

  get expired(): boolean | undefined {
    const expires_in = this.expires_in;
    return expires_in !== undefined ? expires_in <= 0 : undefined;
  }

  get scopes(): string[] {
    return (this.scope || '').split(' ');
  }

  get isOpenIdConnect(): boolean {
    return this.scopes.indexOf(OidcScope) >= 0 || !!this.id_token;
  }
}

//=============================================================================
// SignoutResponse
//=============================================================================

export class SignoutResponse {
  error: string | undefined;
  error_description: string | undefined;
  error_uri: string | undefined;
  state: unknown;

  constructor(url: string) {
    const values = UrlUtility.parseUrlFragment(url, '?');
    this.error = values.error;
    this.error_description = values.error_description;
    this.error_uri = values.error_uri;
    this.state = values.state;
  }
}

//=============================================================================
// ErrorResponse
//=============================================================================

export interface ErrorResponseData {
  error: string;
  error_description?: string;
  error_uri?: string;
  state?: string;
  session_state?: string;
}

export class ErrorResponse extends Error {
  error: string;
  error_description: string | undefined;
  error_uri: string | undefined;
  state: string | undefined;
  session_state: string | undefined;

  constructor({ error, error_description, error_uri, state, session_state }: ErrorResponseData) {
    if (!error) {
      Log.error('No error passed to ErrorResponse');
      throw new Error('error');
    }

    const message = error_description ? `${error}: ${error_description}` : error;
    super(message);

    this.name = error;
    this.error = error;
    this.error_description = error_description;
    this.error_uri = error_uri;
    this.state = state;
    this.session_state = session_state;
  }
}
