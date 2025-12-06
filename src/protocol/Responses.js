/* eslint-disable */
// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import {Log} from '../utils/Log.js';
import {UrlUtility} from '../services/Http.js';

const OidcScope = 'openid';

//=============================================================================
// SigninResponse - Parse sign-in callback
//=============================================================================

export class SigninResponse {
  constructor(url, delimiter = '#') {
    var values = UrlUtility.parseUrlFragment(url, delimiter);

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
    this.profile = undefined; // will be set from ResponseValidator

    this.expires_in = values.expires_in;
  }

  get expires_in() {
    if (this.expires_at) {
      let now = parseInt(Date.now() / 1000);
      return this.expires_at - now;
    }
    return undefined;
  }
  set expires_in(value) {
    let expires_in = parseInt(value);
    if (typeof expires_in === 'number' && expires_in > 0) {
      let now = parseInt(Date.now() / 1000);
      this.expires_at = now + expires_in;
    }
  }

  get expired() {
    let expires_in = this.expires_in;
    if (expires_in !== undefined) {
      return expires_in <= 0;
    }
    return undefined;
  }

  get scopes() {
    return (this.scope || '').split(' ');
  }

  get isOpenIdConnect() {
    return this.scopes.indexOf(OidcScope) >= 0 || !!this.id_token;
  }
}

//=============================================================================
// SignoutResponse - Parse sign-out callback
//=============================================================================

export class SignoutResponse {
  constructor(url) {
    var values = UrlUtility.parseUrlFragment(url, '?');

    this.error = values.error;
    this.error_description = values.error_description;
    this.error_uri = values.error_uri;

    this.state = values.state;
  }
}

//=============================================================================
// ErrorResponse - Error response handling
//=============================================================================

export class ErrorResponse extends Error {
  constructor({
    error,
    error_description,
    error_uri,
    state,
    session_state,
  } = {}) {
    if (!error) {
      Log.error('No error passed to ErrorResponse');
      throw new Error('error');
    }

    super(error_description || error);

    this.name = 'ErrorResponse';

    this.error = error;
    this.error_description = error_description;
    this.error_uri = error_uri;

    this.state = state;
    this.session_state = session_state;
  }
}
