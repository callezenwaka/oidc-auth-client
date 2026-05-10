// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import { Log } from '../utils/Log.js';
import { OidcClientSettings, UserManagerSettings } from './Settings.js';
import type { OidcClientSettingsArgs, UserManagerSettingsArgs } from './Settings.js';
import { ErrorResponse } from '../protocol/Responses.js';
import { SigninRequest } from '../protocol/Requests.js';
import type { SigninRequestArgs } from '../protocol/Requests.js';
import { SigninResponse } from '../protocol/Responses.js';
import { SignoutRequest } from '../protocol/Requests.js';
import type { SignoutRequestArgs } from '../protocol/Requests.js';
import { SignoutResponse } from '../protocol/Responses.js';
import { SigninState, State } from './Session.js';
import { User } from '../models/User.js';
import type { UserProfile } from '../types/user.js';
import type { StateStore } from '../types/storage.js';
import { UserManagerEvents } from './Events.js';
import { SilentRenewService, SessionMonitor } from './Session.js';
import { TokenRevocationClient, TokenClient } from '../protocol/TokenService.js';
import { JoseUtil, generateRandom } from '../crypto/Crypto.js';
import type { JoseUtilType } from '../crypto/Crypto.js';
import type { INavigator, NavigateParams, NavigatorResponse } from '../types/navigator.js';

//=============================================================================
// OidcClient - Low-level OIDC protocol client
//=============================================================================

export interface CreateSigninRequestArgs {
  response_type?: string;
  scope?: string;
  redirect_uri?: string;
  data?: unknown;
  state?: unknown;
  prompt?: string;
  display?: string;
  max_age?: number;
  ui_locales?: string;
  id_token_hint?: string;
  login_hint?: string;
  acr_values?: string;
  resource?: string;
  request?: string;
  request_uri?: string;
  response_mode?: string | null;
  extraQueryParams?: Record<string, string>;
  extraTokenParams?: Record<string, unknown>;
  request_type?: string;
  skipUserInfo?: boolean;
}

export interface CreateSignoutRequestArgs {
  id_token_hint?: string;
  data?: unknown;
  state?: unknown;
  post_logout_redirect_uri?: string;
  extraQueryParams?: Record<string, string>;
  request_type?: string;
}

export class OidcClient {
  protected _settings: OidcClientSettings;

  constructor(settings: OidcClientSettings | OidcClientSettingsArgs = {}) {
    if (settings instanceof OidcClientSettings) {
      this._settings = settings;
    } else {
      this._settings = new OidcClientSettings(settings);
    }
  }

  get _stateStore(): StateStore {
    return this.settings.stateStore;
  }
  get _validator() {
    return this.settings.validator;
  }
  get _metadataService() {
    return this.settings.metadataService;
  }

  get settings(): OidcClientSettings {
    return this._settings;
  }
  get metadataService() {
    return this._metadataService;
  }

  async createSigninRequest(
    {
      response_type,
      scope,
      redirect_uri,
      data,
      state,
      prompt,
      display,
      max_age,
      ui_locales,
      id_token_hint,
      login_hint,
      acr_values,
      resource,
      request,
      request_uri,
      response_mode,
      extraQueryParams,
      extraTokenParams,
      request_type,
      skipUserInfo,
    }: CreateSigninRequestArgs = {},
    stateStore?: StateStore,
  ): Promise<SigninRequest> {
    Log.debug('OidcClient.createSigninRequest');

    const client_id = this._settings.client_id;
    response_type = response_type || this._settings.response_type;
    scope = scope || this._settings.scope;
    redirect_uri = redirect_uri || this._settings.redirect_uri;

    prompt = prompt || this._settings.prompt;
    display = display || this._settings.display;
    max_age = max_age || this._settings.max_age;
    ui_locales = ui_locales || this._settings.ui_locales;
    acr_values = acr_values || this._settings.acr_values;
    resource = resource || this._settings.resource;
    response_mode = response_mode || this._settings.response_mode;
    extraQueryParams = extraQueryParams || this._settings.extraQueryParams;
    extraTokenParams = extraTokenParams || this._settings.extraTokenParams;

    const authority = this._settings.authority;

    if (SigninRequest.isCode(response_type) && response_type !== 'code') {
      return Promise.reject(new Error('OpenID Connect hybrid flow is not supported'));
    }

    const url = await this._metadataService.getAuthorizationEndpoint();
    Log.debug('OidcClient.createSigninRequest: Received authorization endpoint', url);

    // Pre-compute PKCE code_verifier + code_challenge (jose requires async SHA-256)
    let code_verifier: string | undefined;
    let code_challenge: string | undefined;
    if (SigninRequest.isCode(response_type!)) {
      code_verifier = generateRandom() + generateRandom() + generateRandom();
      code_challenge = await JoseUtil.calculatePKCECodeChallenge(code_verifier);
    }

    const signinRequest = new SigninRequest({
      url: url!,
      client_id: client_id!,
      redirect_uri: redirect_uri!,
      response_type: response_type!,
      scope: scope!,
      data: data || state,
      authority: authority!,
      prompt,
      display,
      max_age,
      ui_locales,
      id_token_hint,
      login_hint,
      acr_values,
      resource,
      request,
      request_uri,
      extraQueryParams,
      extraTokenParams,
      request_type,
      response_mode,
      client_secret: this._settings.client_secret,
      skipUserInfo,
      code_verifier,
      code_challenge,
    } as SigninRequestArgs);

    const signinState = signinRequest.state;
    const store = stateStore || this._stateStore;
    await store.set(signinState.id, signinState.toStorageString());
    return signinRequest;
  }

  readSigninResponseState(
    url: string,
    stateStore?: StateStore,
    removeState: boolean = false,
  ): Promise<{ state: SigninState; response: SigninResponse }> {
    Log.debug('OidcClient.readSigninResponseState');

    const useQuery =
      this._settings.response_mode === 'query' ||
      (!this._settings.response_mode && SigninRequest.isCode(this._settings.response_type));
    const delimiter = useQuery ? '?' : '#';

    const response = new SigninResponse(url, delimiter);

    if (!response.state) {
      Log.error('OidcClient.readSigninResponseState: No state in response');
      return Promise.reject(new Error('No state in response'));
    }

    const store = stateStore || this._stateStore;
    const stateApi = removeState
      ? store.remove.bind(store)
      : store.get.bind(store);

    return stateApi(response.state as string).then(storedStateString => {
      if (!storedStateString) {
        Log.error('OidcClient.readSigninResponseState: No matching state found in storage');
        throw new Error('No matching state found in storage');
      }

      const state = SigninState.fromStorageString(storedStateString);
      return { state, response };
    });
  }

  processSigninResponse(url: string, stateStore?: StateStore): Promise<SigninResponse> {
    Log.debug('OidcClient.processSigninResponse');

    return this.readSigninResponseState(url, stateStore, true).then(({ state, response }) => {
      Log.debug('OidcClient.processSigninResponse: Received state from storage; validating response');
      return this._validator.validateSigninResponse(state, response);
    });
  }

  createSignoutRequest(
    {
      id_token_hint,
      data,
      state,
      post_logout_redirect_uri,
      extraQueryParams,
      request_type,
    }: CreateSignoutRequestArgs = {},
    stateStore?: StateStore,
  ): Promise<SignoutRequest> {
    Log.debug('OidcClient.createSignoutRequest');

    post_logout_redirect_uri = post_logout_redirect_uri || this._settings.post_logout_redirect_uri;
    extraQueryParams = extraQueryParams || this._settings.extraQueryParams;

    return this._metadataService.getEndSessionEndpoint().then(url => {
      if (!url) {
        Log.error('OidcClient.createSignoutRequest: No end session endpoint url returned');
        throw new Error('no end session endpoint');
      }

      Log.debug('OidcClient.createSignoutRequest: Received end session endpoint', url);

      const request = new SignoutRequest({
        url,
        id_token_hint,
        post_logout_redirect_uri,
        data: data || state,
        extraQueryParams,
        request_type,
      });

      const signoutState = request.state;
      if (signoutState) {
        Log.debug('OidcClient.createSignoutRequest: Signout request has state to persist');
        const store = stateStore || this._stateStore;
        store.set(signoutState.id, signoutState.toStorageString());
      }

      return request;
    });
  }

  readSignoutResponseState(
    url: string,
    stateStore?: StateStore,
    removeState: boolean = false,
  ): Promise<{ state: State | undefined; response: SignoutResponse }> {
    Log.debug('OidcClient.readSignoutResponseState');

    const response = new SignoutResponse(url);
    if (!response.state) {
      Log.debug('OidcClient.readSignoutResponseState: No state in response');

      if (response.error) {
        Log.warn('OidcClient.readSignoutResponseState: Response was error: ', response.error);
        return Promise.reject(new ErrorResponse({
          error: response.error,
          error_description: response.error_description,
          error_uri: response.error_uri,
          state: typeof response.state === 'string' ? response.state : undefined,
        }));
      }

      return Promise.resolve({ state: undefined, response });
    }

    const stateKey = response.state as string;
    const store = stateStore || this._stateStore;
    const stateApi = removeState
      ? store.remove.bind(store)
      : store.get.bind(store);

    return stateApi(stateKey).then(storedStateString => {
      if (!storedStateString) {
        Log.error('OidcClient.readSignoutResponseState: No matching state found in storage');
        throw new Error('No matching state found in storage');
      }

      const state = State.fromStorageString(storedStateString);
      return { state, response };
    });
  }

  processSignoutResponse(url: string, stateStore?: StateStore): Promise<SignoutResponse> {
    Log.debug('OidcClient.processSignoutResponse');

    return this.readSignoutResponseState(url, stateStore, true).then(({ state, response }) => {
      if (state) {
        Log.debug('OidcClient.processSignoutResponse: Received state from storage; validating response');
        return this._validator.validateSignoutResponse(state, response);
      } else {
        Log.debug('OidcClient.processSignoutResponse: No state from storage; skipping validating response');
        return response;
      }
    });
  }

  clearStaleState(stateStore?: StateStore): Promise<void[]> {
    Log.debug('OidcClient.clearStaleState');
    const store = stateStore || this._stateStore;
    return State.clearStaleState(store, this.settings.staleStateAge);
  }
}

//=============================================================================
// UserManager - High-level user management (extends OidcClient)
//=============================================================================

export interface UserManagerSigninArgs extends CreateSigninRequestArgs {
  useReplaceToNavigate?: boolean;
  popupWindowFeatures?: string;
  popupWindowTarget?: string;
  silentRequestTimeout?: number;
  refresh_token?: string;
  id_token_hint?: string;
  current_sub?: string;
}

export interface UserManagerSignoutArgs extends CreateSignoutRequestArgs {
  useReplaceToNavigate?: boolean;
  popupWindowFeatures?: string;
  popupWindowTarget?: string;
  display?: string;
}

export class UserManager extends OidcClient {
  protected _settings: UserManagerSettings;
  private _events: UserManagerEvents;
  private _silentRenewService: SilentRenewService;
  private _sessionMonitor: SessionMonitor | undefined;
  private _tokenRevocationClient: TokenRevocationClient;
  private _tokenClient: TokenClient;
  private _joseUtil: JoseUtilType;

  constructor(
    settings: UserManagerSettings | UserManagerSettingsArgs = {},
    SilentRenewServiceCtor: typeof SilentRenewService = SilentRenewService,
    SessionMonitorCtor: typeof SessionMonitor = SessionMonitor,
    TokenRevocationClientCtor: typeof TokenRevocationClient = TokenRevocationClient,
    TokenClientCtor: typeof TokenClient = TokenClient,
    joseUtil: JoseUtilType = JoseUtil,
  ) {
    if (!(settings instanceof UserManagerSettings)) {
      settings = new UserManagerSettings(settings);
    }
    super(settings);

    this._settings = settings as UserManagerSettings;
    this._events = new UserManagerEvents(settings);
    this._silentRenewService = new SilentRenewServiceCtor(this);

    // order is important for the following properties; these services depend upon the events.
    if (this.settings.automaticSilentRenew) {
      Log.debug('UserManager.ctor: automaticSilentRenew is configured, setting up silent renew');
      this.startSilentRenew();
    }

    if (this.settings.monitorSession) {
      Log.debug('UserManager.ctor: monitorSession is configured, setting up session monitor');
      this._sessionMonitor = new SessionMonitorCtor(this);
    }

    this._tokenRevocationClient = new TokenRevocationClientCtor(this._settings);
    this._tokenClient = new TokenClientCtor(this._settings);
    this._joseUtil = joseUtil;
  }

  get settings(): UserManagerSettings {
    return this._settings;
  }

  private get _redirectNavigator() {
    return this.settings.redirectNavigator;
  }
  private get _popupNavigator() {
    return this.settings.popupNavigator;
  }
  private get _iframeNavigator() {
    return this.settings.iframeNavigator;
  }
  private get _userStore() {
    return this.settings.userStore;
  }

  get events(): UserManagerEvents {
    return this._events;
  }

  getUser(): Promise<User | null> {
    return this._loadUser().then(user => {
      if (user) {
        Log.info('UserManager.getUser: user loaded');
        this._events.load(user, false);
        return user;
      } else {
        Log.info('UserManager.getUser: user not found in storage');
        return null;
      }
    });
  }

  removeUser(): Promise<void> {
    return this.storeUser(null).then(() => {
      Log.info('UserManager.removeUser: user removed from storage');
      this._events.unload();
    });
  }

  signinRedirect(args: UserManagerSigninArgs = {}): Promise<void> {
    args = Object.assign({}, args);
    args.request_type = 'si:r';
    const navParams: NavigateParams = {
      useReplaceToNavigate: args.useReplaceToNavigate,
    };
    return this._signinStart(args, this._redirectNavigator, navParams).then(() => {
      Log.info('UserManager.signinRedirect: successful');
    });
  }

  signinRedirectCallback(url?: string): Promise<User> {
    return this._signinEnd(url || this._redirectNavigator.url!).then(user => {
      if (user.profile && user.profile.sub) {
        Log.info('UserManager.signinRedirectCallback: successful, signed in sub: ', user.profile.sub);
      } else {
        Log.info('UserManager.signinRedirectCallback: no sub');
      }
      return user;
    });
  }

  signinPopup(args: UserManagerSigninArgs = {}): Promise<User> {
    args = Object.assign({}, args);
    args.request_type = 'si:p';
    const url = args.redirect_uri || this.settings.popup_redirect_uri || this.settings.redirect_uri;
    if (!url) {
      Log.error('UserManager.signinPopup: No popup_redirect_uri or redirect_uri configured');
      return Promise.reject(new Error('No popup_redirect_uri or redirect_uri configured'));
    }

    args.redirect_uri = url;
    args.display = 'popup';

    return this._signin(args, this._popupNavigator, {
      startUrl: url,
      popupWindowFeatures: args.popupWindowFeatures || this.settings.popupWindowFeatures,
      popupWindowTarget: args.popupWindowTarget || this.settings.popupWindowTarget,
    }).then(user => {
      if (user.profile && user.profile.sub) {
        Log.info('UserManager.signinPopup: signinPopup successful, signed in sub: ', user.profile.sub);
      } else {
        Log.info('UserManager.signinPopup: no sub');
      }
      return user;
    });
  }

  signinPopupCallback(url?: string): Promise<User | undefined> {
    return this._signinCallback(url, this._popupNavigator)
      .catch((err: Error) => {
        Log.error('UserManager.signinPopupCallback error: ' + err?.message);
        return undefined;
      });
  }

  signinSilent(args: UserManagerSigninArgs = {}): Promise<User | null> {
    args = Object.assign({}, args);

    // first determine if we have a refresh token, or need to use iframe
    return this._loadUser().then(user => {
      if (user && user.refresh_token) {
        args.refresh_token = user.refresh_token;
        return this._useRefreshToken(args);
      } else {
        args.request_type = 'si:s';
        args.id_token_hint =
          args.id_token_hint ||
          (this.settings.includeIdTokenInSilentRenew && user && user.id_token) ||
          undefined;
        if (user && this._settings.validateSubOnSilentRenew) {
          Log.debug('UserManager.signinSilent, subject prior to silent renew: ', user.profile?.sub);
          args.current_sub = user.profile?.sub;
        }
        return this._signinSilentIframe(args);
      }
    });
  }

  private _useRefreshToken(args: UserManagerSigninArgs = {}): Promise<User | null> {
    return this._tokenClient.exchangeRefreshToken(args).then(result => {
      if (!result) {
        Log.error('UserManager._useRefreshToken: No response returned from token endpoint');
        return Promise.reject('No response returned from token endpoint');
      }
      if (!result.access_token) {
        Log.error('UserManager._useRefreshToken: No access token returned from token endpoint');
        return Promise.reject('No access token returned from token endpoint');
      }

      return this._loadUser().then(user => {
        if (user) {
          let idTokenValidation = Promise.resolve();
          if (result.id_token) {
            idTokenValidation = this._validateIdTokenFromTokenRefreshToken(
              user.profile,
              result.id_token,
            );
          }

          return idTokenValidation.then(() => {
            Log.debug('UserManager._useRefreshToken: refresh token response success');
            user.id_token = result.id_token || user.id_token;
            user.access_token = result.access_token;
            user.refresh_token = result.refresh_token || user.refresh_token;
            user.expires_in = result.expires_in;

            return this.storeUser(user).then(() => {
              this._events.load(user);
              return user;
            });
          });
        } else {
          return null;
        }
      });
    });
  }

  private _validateIdTokenFromTokenRefreshToken(profile: UserProfile, id_token: string): Promise<void> {
    return this._metadataService.getIssuer().then(issuer => {
      return this.settings.getEpochTime().then(now => {
        return this._joseUtil
          .validateJwtAttributes(id_token, issuer, this._settings.client_id!, this._settings.clockSkew, now)
          .then(payload => {
            if (!payload) {
              Log.error('UserManager._validateIdTokenFromTokenRefreshToken: Failed to validate id_token');
              return Promise.reject(new Error('Failed to validate id_token'));
            }
            if (payload.sub !== profile.sub) {
              Log.error('UserManager._validateIdTokenFromTokenRefreshToken: sub in id_token does not match current sub');
              return Promise.reject(new Error('sub in id_token does not match current sub'));
            }
            if (payload.auth_time && payload.auth_time !== profile.auth_time) {
              Log.error('UserManager._validateIdTokenFromTokenRefreshToken: auth_time in id_token does not match original auth_time');
              return Promise.reject(new Error('auth_time in id_token does not match original auth_time'));
            }
            if (payload.azp && payload.azp !== profile.azp) {
              Log.error('UserManager._validateIdTokenFromTokenRefreshToken: azp in id_token does not match original azp');
              return Promise.reject(new Error('azp in id_token does not match original azp'));
            }
            if (!payload.azp && profile.azp) {
              Log.error('UserManager._validateIdTokenFromTokenRefreshToken: azp not in id_token, but present in original id_token');
              return Promise.reject(new Error('azp not in id_token, but present in original id_token'));
            }
          });
      });
    });
  }

  private _signinSilentIframe(args: UserManagerSigninArgs = {}): Promise<User | null> {
    const url = args.redirect_uri || this.settings.silent_redirect_uri || this.settings.redirect_uri;
    if (!url) {
      Log.error('UserManager.signinSilent: No silent_redirect_uri configured');
      return Promise.reject(new Error('No silent_redirect_uri configured'));
    }

    args.redirect_uri = url;
    args.prompt = args.prompt || 'none';

    return this._signin(args, this._iframeNavigator, {
      startUrl: url,
      silentRequestTimeout: args.silentRequestTimeout || this.settings.silentRequestTimeout,
    }).then(user => {
      if (user.profile && user.profile.sub) {
        Log.info('UserManager.signinSilent: successful, signed in sub: ', user.profile.sub);
      } else {
        Log.info('UserManager.signinSilent: no sub');
      }
      return user;
    });
  }

  signinSilentCallback(url?: string): Promise<User | undefined> {
    return this._signinCallback(url, this._iframeNavigator);
  }

  signinCallback(url?: string): Promise<User | undefined> {
    return this.readSigninResponseState(url!).then(({ state, response }) => {
      if (state.request_type === 'si:r') {
        return this.signinRedirectCallback(url);
      }
      if (state.request_type === 'si:p') {
        return this.signinPopupCallback(url);
      }
      if (state.request_type === 'si:s') {
        return this.signinSilentCallback(url);
      }
      return Promise.reject(new Error('invalid response_type in state'));
    });
  }

  signoutCallback(url?: string, keepOpen?: boolean): Promise<SignoutResponse | void> {
    return this.readSignoutResponseState(url!).then(({ state, response }) => {
      if (state) {
        if (state.request_type === 'so:r') {
          return this.signoutRedirectCallback(url);
        }
        if (state.request_type === 'so:p') {
          return this.signoutPopupCallback(url, keepOpen);
        }
        return Promise.reject(new Error('invalid response_type in state'));
      }
      return response;
    });
  }

  querySessionStatus(args: UserManagerSigninArgs = {}): Promise<{ session_state: string; sub?: string; sid?: string } | null> {
    args = Object.assign({}, args);

    args.request_type = 'si:s'; // this acts like a signin silent
    const url = args.redirect_uri || this.settings.silent_redirect_uri || this.settings.redirect_uri;
    if (!url) {
      Log.error('UserManager.querySessionStatus: No silent_redirect_uri configured');
      return Promise.reject(new Error('No silent_redirect_uri configured'));
    }

    args.redirect_uri = url;
    args.prompt = 'none';
    args.response_type = args.response_type || this.settings.query_status_response_type;
    args.scope = args.scope || 'openid';
    args.skipUserInfo = true;

    return this._signinStart(args, this._iframeNavigator, {
      startUrl: url,
      silentRequestTimeout: args.silentRequestTimeout || this.settings.silentRequestTimeout,
    }).then(navResponse => {
      return this.processSigninResponse(navResponse.url)
        .then(signinResponse => {
          Log.debug('UserManager.querySessionStatus: got signin response');

          if (signinResponse.session_state && signinResponse.profile?.sub) {
            Log.info('UserManager.querySessionStatus: querySessionStatus success for sub: ', signinResponse.profile.sub);
            return {
              session_state: signinResponse.session_state,
              sub: signinResponse.profile.sub,
              sid: signinResponse.profile.sid,
            };
          } else {
            Log.info('querySessionStatus successful, user not authenticated');
            return null;
          }
        })
        .catch(err => {
          if (err.session_state && this.settings.monitorAnonymousSession) {
            if (
              err.message === 'login_required' ||
              err.message === 'consent_required' ||
              err.message === 'interaction_required' ||
              err.message === 'account_selection_required'
            ) {
              Log.info('UserManager.querySessionStatus: querySessionStatus success for anonymous user');
              return { session_state: err.session_state };
            }
          }
          throw err;
        });
    });
  }

  private _signin(args: UserManagerSigninArgs, navigator: INavigator, navigatorParams: NavigateParams = {}): Promise<User> {
    return this._signinStart(args, navigator, navigatorParams).then(navResponse => {
      return this._signinEnd(navResponse.url, args);
    });
  }

  private _signinStart(args: UserManagerSigninArgs, navigator: INavigator, navigatorParams: NavigateParams = {}): Promise<NavigatorResponse> {
    return navigator.prepare(navigatorParams).then(handle => {
      Log.debug('UserManager._signinStart: got navigator window handle');

      return this.createSigninRequest(args)
        .then(signinRequest => {
          Log.debug('UserManager._signinStart: got signin request');

          const navigateParams: NavigateParams & { url: string } = {
            ...navigatorParams,
            url: signinRequest.url,
            id: signinRequest.state.id,
          };

          return handle.navigate(navigateParams);
        })
        .catch((err: Error) => {
          if (handle.close) {
            Log.debug('UserManager._signinStart: Error after preparing navigator, closing navigator window');
            handle.close();
          }
          throw err;
        });
    });
  }

  private _signinEnd(url: string, args: UserManagerSigninArgs = {}): Promise<User> {
    return this.processSigninResponse(url).then(signinResponse => {
      Log.debug('UserManager._signinEnd: got signin response');

      const user = new User(signinResponse);

      if (args.current_sub) {
        if (args.current_sub !== user.profile?.sub) {
          Log.debug('UserManager._signinEnd: current user does not match user returned from signin. sub from signin: ', user.profile?.sub);
          return Promise.reject(new Error('login_required'));
        } else {
          Log.debug('UserManager._signinEnd: current user matches user returned from signin');
        }
      }

      return this.storeUser(user).then(() => {
        Log.debug('UserManager._signinEnd: user stored');
        this._events.load(user);
        return user;
      });
    });
  }

  private _signinCallback(url: string | undefined, navigator: INavigator): Promise<User | undefined> {
    Log.debug('UserManager._signinCallback');
    const useQuery =
      this._settings.response_mode === 'query' ||
      (!this._settings.response_mode && SigninRequest.isCode(this._settings.response_type));
    const delimiter = useQuery ? '?' : '#';
    return navigator.callback!(url, undefined, delimiter).then(() => undefined);
  }

  signoutRedirect(args: UserManagerSignoutArgs = {}): Promise<void> {
    args = Object.assign({}, args);
    args.request_type = 'so:r';
    const postLogoutRedirectUri = args.post_logout_redirect_uri || this.settings.post_logout_redirect_uri;
    if (postLogoutRedirectUri) {
      args.post_logout_redirect_uri = postLogoutRedirectUri;
    }
    const navParams: NavigateParams = {
      useReplaceToNavigate: args.useReplaceToNavigate,
    };
    return this._signoutStart(args, this._redirectNavigator, navParams).then(() => {
      Log.info('UserManager.signoutRedirect: successful');
    });
  }

  signoutRedirectCallback(url?: string): Promise<SignoutResponse> {
    return this._signoutEnd(url || this._redirectNavigator.url!).then(response => {
      Log.info('UserManager.signoutRedirectCallback: successful');
      return response;
    });
  }

  signoutPopup(args: UserManagerSignoutArgs = {}): Promise<void> {
    args = Object.assign({}, args);
    args.request_type = 'so:p';
    const url =
      args.post_logout_redirect_uri ||
      this.settings.popup_post_logout_redirect_uri ||
      this.settings.post_logout_redirect_uri;
    args.post_logout_redirect_uri = url;
    args.display = 'popup';
    if (args.post_logout_redirect_uri) {
      args.state = args.state || {};
    }

    return this._signout(args, this._popupNavigator, {
      startUrl: url,
      popupWindowFeatures: args.popupWindowFeatures || this.settings.popupWindowFeatures,
      popupWindowTarget: args.popupWindowTarget || this.settings.popupWindowTarget,
    }).then(() => {
      Log.info('UserManager.signoutPopup: successful');
    });
  }

  signoutPopupCallback(url?: string | boolean, keepOpen?: boolean): Promise<void> {
    if (typeof keepOpen === 'undefined' && typeof url === 'boolean') {
      keepOpen = url;
      url = undefined;
    }

    const delimiter = '?';
    return this._popupNavigator.callback!(url as string | undefined, keepOpen, delimiter).then(() => {
      Log.info('UserManager.signoutPopupCallback: successful');
    });
  }

  private _signout(args: UserManagerSignoutArgs, navigator: INavigator, navigatorParams: NavigateParams = {}): Promise<SignoutResponse> {
    return this._signoutStart(args, navigator, navigatorParams).then(navResponse => {
      return this._signoutEnd(navResponse.url);
    });
  }

  private _signoutStart(args: UserManagerSignoutArgs = {}, navigator: INavigator, navigatorParams: NavigateParams = {}): Promise<NavigatorResponse> {
    return navigator.prepare(navigatorParams).then(handle => {
      Log.debug('UserManager._signoutStart: got navigator window handle');

      return this._loadUser()
        .then(user => {
          Log.debug('UserManager._signoutStart: loaded current user from storage');

          const revokePromise = this._settings.revokeAccessTokenOnSignout
            ? this._revokeInternal(user)
            : Promise.resolve(false);
          return revokePromise.then(() => {
            const id_token = args.id_token_hint || (user && user.id_token);
            if (id_token) {
              Log.debug('UserManager._signoutStart: Setting id_token into signout request');
              args.id_token_hint = id_token;
            }

            return this.removeUser().then(() => {
              Log.debug('UserManager._signoutStart: user removed, creating signout request');

              return this.createSignoutRequest(args).then(signoutRequest => {
                Log.debug('UserManager._signoutStart: got signout request');

                const navigateParams: NavigateParams & { url: string } = {
                  ...navigatorParams,
                  url: signoutRequest.url,
                  id: signoutRequest.state?.id,
                };

                return handle.navigate(navigateParams);
              });
            });
          });
        })
        .catch((err: Error) => {
          if (handle.close) {
            Log.debug('UserManager._signoutStart: Error after preparing navigator, closing navigator window');
            handle.close();
          }
          throw err;
        });
    });
  }

  private _signoutEnd(url: string): Promise<SignoutResponse> {
    return this.processSignoutResponse(url).then(signoutResponse => {
      Log.debug('UserManager._signoutEnd: got signout response');
      return signoutResponse;
    });
  }

  revokeAccessToken(): Promise<void> {
    return this._loadUser()
      .then(user => {
        return this._revokeInternal(user, true).then(success => {
          if (success) {
            Log.debug('UserManager.revokeAccessToken: removing token properties from user and re-storing');

            user!.access_token = '';
            user!.refresh_token = '';
            user!.expires_at = undefined;
            user!.token_type = '';

            return this.storeUser(user!).then(() => {
              Log.debug('UserManager.revokeAccessToken: user stored');
              this._events.load(user!);
            });
          }
          return;
        });
      })
      .then(() => {
        Log.info('UserManager.revokeAccessToken: access token revoked successfully');
      });
  }

  private _revokeInternal(user: User | null, required?: boolean): Promise<boolean> {
    if (user) {
      const access_token = user.access_token;
      const refresh_token = user.refresh_token;

      return this._revokeAccessTokenInternal(access_token, required).then(atSuccess => {
        return this._revokeRefreshTokenInternal(refresh_token, required).then(rtSuccess => {
          if (!atSuccess && !rtSuccess) {
            Log.debug('UserManager.revokeAccessToken: no need to revoke due to no token(s), or JWT format');
          }
          return atSuccess || rtSuccess;
        });
      });
    }

    return Promise.resolve(false);
  }

  private _revokeAccessTokenInternal(access_token: string | null | undefined, required?: boolean): Promise<boolean> {
    // check for JWT vs. reference token
    if (!access_token || access_token.indexOf('.') >= 0) {
      return Promise.resolve(false);
    }
    return this._tokenRevocationClient.revoke(access_token, required).then(() => true);
  }

  private _revokeRefreshTokenInternal(refresh_token: string | null | undefined, required?: boolean): Promise<boolean> {
    if (!refresh_token) {
      return Promise.resolve(false);
    }
    return this._tokenRevocationClient.revoke(refresh_token, required, 'refresh_token').then(() => true);
  }

  startSilentRenew(): void {
    this._silentRenewService.start();
  }

  stopSilentRenew(): void {
    this._silentRenewService.stop();
  }

  get _userStoreKey(): string {
    return `user:${this.settings.authority}:${this.settings.client_id}`;
  }

  private _loadUser(): Promise<User | null> {
    return this._userStore.get(this._userStoreKey).then(storageString => {
      if (storageString) {
        Log.debug('UserManager._loadUser: user storageString loaded');
        return User.fromStorageString(storageString);
      }
      Log.debug('UserManager._loadUser: no user storageString');
      return null;
    });
  }

  storeUser(user: User | null): Promise<void> {
    if (user) {
      Log.debug('UserManager.storeUser: storing user');
      const storageString = user.toStorageString();
      return this._userStore.set(this._userStoreKey, storageString);
    } else {
      Log.debug('storeUser.storeUser: removing user');
      return this._userStore.remove(this._userStoreKey).then(() => {});
    }
  }
}
