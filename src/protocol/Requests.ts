// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import { Log } from '../utils/Log.js';
import { UrlUtility } from '../services/Http.js';
import { SigninState, State } from '../auth/Session.js';

//=============================================================================
// SigninRequest
//=============================================================================

export interface SigninRequestArgs {
  // mandatory
  url: string;
  client_id: string;
  redirect_uri: string;
  response_type: string;
  scope: string;
  authority: string;
  // optional
  data?: any;
  prompt?: string;
  display?: string;
  max_age?: number;
  ui_locales?: string;
  id_token_hint?: string;
  login_hint?: string;
  acr_values?: string;
  resource?: string;
  response_mode?: string | null;
  request?: string;
  request_uri?: string;
  extraQueryParams?: Record<string, string>;
  request_type?: string;
  client_secret?: string;
  extraTokenParams?: Record<string, any>;
  skipUserInfo?: boolean;
}

export class SigninRequest {
  url: string;
  state: InstanceType<typeof SigninState>;

  constructor(args: SigninRequestArgs) {
    const {
      url: rawUrl, client_id, redirect_uri, response_type, scope, authority,
      data, prompt, display, max_age, ui_locales, id_token_hint, login_hint,
      acr_values, resource, request, request_uri, extraQueryParams,
      request_type, client_secret, extraTokenParams, skipUserInfo,
    } = args;

    if (!rawUrl) { Log.error('SigninRequest.ctor: No url passed'); throw new Error('url'); }
    if (!client_id) { Log.error('SigninRequest.ctor: No client_id passed'); throw new Error('client_id'); }
    if (!redirect_uri) { Log.error('SigninRequest.ctor: No redirect_uri passed'); throw new Error('redirect_uri'); }
    if (!response_type) { Log.error('SigninRequest.ctor: No response_type passed'); throw new Error('response_type'); }
    if (!scope) { Log.error('SigninRequest.ctor: No scope passed'); throw new Error('scope'); }
    if (!authority) { Log.error('SigninRequest.ctor: No authority passed'); throw new Error('authority'); }

    const oidc = SigninRequest.isOidc(response_type);
    const code = SigninRequest.isCode(response_type);
    const response_mode_resolved = args.response_mode ?? (code ? 'query' : null);

    this.state = new SigninState({
      nonce: oidc,
      data,
      client_id,
      authority,
      redirect_uri,
      code_verifier: code,
      request_type,
      response_mode: response_mode_resolved,
      client_secret,
      scope,
      extraTokenParams,
      skipUserInfo,
    });

    let url = UrlUtility.addQueryParam(rawUrl, 'client_id', client_id);
    url = UrlUtility.addQueryParam(url, 'redirect_uri', redirect_uri);
    url = UrlUtility.addQueryParam(url, 'response_type', response_type);
    url = UrlUtility.addQueryParam(url, 'scope', scope);
    url = UrlUtility.addQueryParam(url, 'state', this.state.id);

    if (oidc) {
      url = UrlUtility.addQueryParam(url, 'nonce', this.state.nonce);
    }
    if (code) {
      url = UrlUtility.addQueryParam(url, 'code_challenge', this.state.code_challenge!);
      url = UrlUtility.addQueryParam(url, 'code_challenge_method', 'S256');
    }

    const optional: Record<string, any> = {
      prompt, display, max_age, ui_locales, id_token_hint,
      login_hint, acr_values, resource, request, request_uri,
      response_mode: response_mode_resolved,
    };
    for (const key in optional) {
      if (optional[key]) url = UrlUtility.addQueryParam(url, key, optional[key] as string);
    }
    for (const key in extraQueryParams) {
      url = UrlUtility.addQueryParam(url, key, extraQueryParams[key]);
    }

    this.url = url;
  }

  static isOidc(response_type: string): boolean {
    return response_type.split(/\s+/g).includes('id_token');
  }

  static isOAuth(response_type: string): boolean {
    return response_type.split(/\s+/g).includes('token');
  }

  static isCode(response_type: string): boolean {
    return response_type.split(/\s+/g).includes('code');
  }
}

//=============================================================================
// SignoutRequest
//=============================================================================

export interface SignoutRequestArgs {
  url: string;
  id_token_hint?: string;
  post_logout_redirect_uri?: string;
  data?: any;
  extraQueryParams?: Record<string, string>;
  request_type?: string;
}

export class SignoutRequest {
  url: string;
  state: InstanceType<typeof State> | undefined;

  constructor({ url: rawUrl, id_token_hint, post_logout_redirect_uri, data, extraQueryParams, request_type }: SignoutRequestArgs) {
    if (!rawUrl) { Log.error('SignoutRequest.ctor: No url passed'); throw new Error('url'); }

    let url = rawUrl;

    if (id_token_hint) {
      url = UrlUtility.addQueryParam(url, 'id_token_hint', id_token_hint);
    }
    if (post_logout_redirect_uri) {
      url = UrlUtility.addQueryParam(url, 'post_logout_redirect_uri', post_logout_redirect_uri);
      if (data) {
        this.state = new State({ data, request_type });
        url = UrlUtility.addQueryParam(url, 'state', this.state.id);
      }
    }
    for (const key in extraQueryParams) {
      url = UrlUtility.addQueryParam(url, key, extraQueryParams[key]);
    }

    this.url = url;
  }
}
