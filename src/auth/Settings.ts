// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import { Log } from '../utils/Log.js';
import { ClockService } from '../services/Timer.js';
import { WebStorageStateStore } from '../storage/Storage.js';
import { ResponseValidator } from '../protocol/ResponseValidator.js';
import { MetadataService } from '../services/Http.js';
import { RedirectNavigator, PopupNavigator, IFrameNavigator } from '../navigation/Navigator.js';
import type { INavigator } from '../types/navigator.js';
import { Global } from '../utils/Global.js';
import { SigninRequest } from '../protocol/Requests.js';
import type { OidcMetadata } from '../services/Http.js';
import type { JwkKey } from '../types/crypto.js';
import type { StateStore } from '../types/storage.js';

const OidcMetadataUrlPath = '.well-known/openid-configuration';

const DefaultResponseType = 'id_token';
const DefaultScope = 'openid';
const DefaultClientAuthentication = 'client_secret_post';
const DefaultStaleStateAge = 60 * 15; // seconds
const DefaultClockSkewInSeconds = 60 * 5;
const DefaultAccessTokenExpiringNotificationTime = 60;
const DefaultCheckSessionInterval = 2000;

//=============================================================================
// OidcClientSettings - OIDC protocol configuration
//=============================================================================

export interface OidcClientSettingsArgs {
  // metadata related
  authority?: string;
  metadataUrl?: string;
  metadata?: OidcMetadata;
  signingKeys?: JwkKey[];
  metadataSeed?: Partial<OidcMetadata>;
  // client related
  client_id?: string;
  client_secret?: string;
  response_type?: string;
  scope?: string;
  redirect_uri?: string;
  post_logout_redirect_uri?: string;
  client_authentication?: string;
  // optional protocol
  prompt?: string;
  display?: string;
  max_age?: number;
  ui_locales?: string;
  acr_values?: string;
  resource?: string;
  response_mode?: string | null;
  // behavior flags
  filterProtocolClaims?: boolean;
  loadUserInfo?: boolean;
  staleStateAge?: number;
  clockSkew?: number;
  clockService?: ClockService;
  userInfoJwtIssuer?: string;
  mergeClaims?: boolean;
  // constructors for DI
  stateStore?: StateStore;
  ResponseValidatorCtor?: typeof ResponseValidator;
  MetadataServiceCtor?: typeof MetadataService;
  // extra params
  extraQueryParams?: Record<string, string>;
  extraTokenParams?: Record<string, unknown>;
}

export class OidcClientSettings {
  private _authority: string | undefined;
  private _metadataUrl: string | undefined;
  private _metadata: OidcMetadata | undefined;
  private _metadataSeed: Partial<OidcMetadata> | undefined;
  private _signingKeys: JwkKey[] | undefined;

  private _client_id: string | undefined;
  private _client_secret: string | undefined;
  private _response_type: string;
  private _scope: string;
  private _redirect_uri: string | undefined;
  private _post_logout_redirect_uri: string | undefined;
  private _client_authentication: string;

  private _prompt: string | undefined;
  private _display: string | undefined;
  private _max_age: number | undefined;
  private _ui_locales: string | undefined;
  private _acr_values: string | undefined;
  private _resource: string | undefined;
  private _response_mode: string | null | undefined;

  private _filterProtocolClaims: boolean;
  private _loadUserInfo: boolean;
  private _staleStateAge: number;
  private _clockSkew: number;
  private _clockService: ClockService;
  private _userInfoJwtIssuer: string;
  private _mergeClaims: boolean;

  private _stateStore: StateStore;
  private _validator: ResponseValidator;
  private _metadataService: MetadataService;

  private _extraQueryParams: Record<string, string>;
  private _extraTokenParams: Record<string, unknown>;

  constructor({
    // metadata related
    authority,
    metadataUrl,
    metadata,
    signingKeys,
    metadataSeed,
    // client related
    client_id,
    client_secret,
    response_type = DefaultResponseType,
    scope = DefaultScope,
    redirect_uri,
    post_logout_redirect_uri,
    client_authentication = DefaultClientAuthentication,
    // optional protocol
    prompt,
    display,
    max_age,
    ui_locales,
    acr_values,
    resource,
    response_mode,
    // behavior flags
    filterProtocolClaims = true,
    loadUserInfo = true,
    staleStateAge = DefaultStaleStateAge,
    clockSkew = DefaultClockSkewInSeconds,
    clockService = new ClockService(),
    userInfoJwtIssuer = 'OP',
    mergeClaims = false,
    // other behavior
    stateStore = new WebStorageStateStore(),
    ResponseValidatorCtor = ResponseValidator,
    MetadataServiceCtor = MetadataService,
    // extra query params
    extraQueryParams = {},
    extraTokenParams = {},
  }: OidcClientSettingsArgs = {}) {
    this._authority = authority;
    this._metadataUrl = metadataUrl;
    this._metadata = metadata;
    this._metadataSeed = metadataSeed;
    this._signingKeys = signingKeys;

    this._client_id = client_id;
    this._client_secret = client_secret;
    this._response_type = response_type;
    this._scope = scope;
    this._redirect_uri = redirect_uri;
    this._post_logout_redirect_uri = post_logout_redirect_uri;
    this._client_authentication = client_authentication;

    this._prompt = prompt;
    this._display = display;
    this._max_age = max_age;
    this._ui_locales = ui_locales;
    this._acr_values = acr_values;
    this._resource = resource;
    this._response_mode = response_mode;

    this._filterProtocolClaims = !!filterProtocolClaims;
    this._loadUserInfo = !!loadUserInfo;
    this._staleStateAge = staleStateAge;
    this._clockSkew = clockSkew;
    this._clockService = clockService;
    this._userInfoJwtIssuer = userInfoJwtIssuer;
    this._mergeClaims = !!mergeClaims;

    this._stateStore = stateStore;
    this._validator = new ResponseValidatorCtor(this);
    this._metadataService = new MetadataServiceCtor(this);

    this._extraQueryParams = typeof extraQueryParams === 'object' ? extraQueryParams : {};
    this._extraTokenParams = typeof extraTokenParams === 'object' ? extraTokenParams : {};
  }

  // client config
  get client_id(): string | undefined { return this._client_id; }
  set client_id(value: string | undefined) {
    if (!this._client_id) {
      this._client_id = value;
    } else {
      Log.error('OidcClientSettings.set_client_id: client_id has already been assigned.');
      throw new Error('client_id has already been assigned.');
    }
  }
  get client_secret(): string | undefined { return this._client_secret; }
  get response_type(): string { return this._response_type; }
  get scope(): string { return this._scope; }
  get redirect_uri(): string | undefined { return this._redirect_uri; }
  get post_logout_redirect_uri(): string | undefined { return this._post_logout_redirect_uri; }
  get client_authentication(): string { return this._client_authentication; }

  // optional protocol params
  get prompt(): string | undefined { return this._prompt; }
  get display(): string | undefined { return this._display; }
  get max_age(): number | undefined { return this._max_age; }
  get ui_locales(): string | undefined { return this._ui_locales; }
  get acr_values(): string | undefined { return this._acr_values; }
  get resource(): string | undefined { return this._resource; }
  get response_mode(): string | null | undefined { return this._response_mode; }

  // metadata
  get authority(): string | undefined { return this._authority; }
  set authority(value: string | undefined) {
    if (!this._authority) {
      this._authority = value;
    } else {
      Log.error('OidcClientSettings.set_authority: authority has already been assigned.');
      throw new Error('authority has already been assigned.');
    }
  }
  get metadataUrl(): string | undefined {
    if (!this._metadataUrl) {
      this._metadataUrl = this.authority;

      if (this._metadataUrl && this._metadataUrl.indexOf(OidcMetadataUrlPath) < 0) {
        if (this._metadataUrl[this._metadataUrl.length - 1] !== '/') {
          this._metadataUrl += '/';
        }
        this._metadataUrl += OidcMetadataUrlPath;
      }
    }
    return this._metadataUrl;
  }

  // settable/cachable metadata values
  get metadata(): OidcMetadata | undefined { return this._metadata; }
  set metadata(value: OidcMetadata | undefined) { this._metadata = value; }
  get metadataSeed(): Partial<OidcMetadata> | undefined { return this._metadataSeed; }
  set metadataSeed(value: Partial<OidcMetadata> | undefined) { this._metadataSeed = value; }

  get signingKeys(): JwkKey[] | undefined { return this._signingKeys; }
  set signingKeys(value: JwkKey[] | undefined) { this._signingKeys = value; }

  // behavior flags
  get filterProtocolClaims(): boolean { return this._filterProtocolClaims; }
  get loadUserInfo(): boolean { return this._loadUserInfo; }
  get staleStateAge(): number { return this._staleStateAge; }
  get clockSkew(): number { return this._clockSkew; }
  get userInfoJwtIssuer(): string { return this._userInfoJwtIssuer; }
  get mergeClaims(): boolean { return this._mergeClaims; }

  get stateStore(): StateStore { return this._stateStore; }
  get validator(): ResponseValidator { return this._validator; }
  get metadataService(): MetadataService { return this._metadataService; }

  // extra query params
  get extraQueryParams(): Record<string, string> { return this._extraQueryParams; }
  set extraQueryParams(value: Record<string, string>) {
    if (typeof value === 'object') {
      this._extraQueryParams = value;
    } else {
      this._extraQueryParams = {};
    }
  }

  // extra token params
  get extraTokenParams(): Record<string, unknown> { return this._extraTokenParams; }
  set extraTokenParams(value: Record<string, unknown>) {
    if (typeof value === 'object') {
      this._extraTokenParams = value;
    } else {
      this._extraTokenParams = {};
    }
  }

  // get the time
  getEpochTime(): Promise<number> {
    return this._clockService.getEpochTime();
  }
}

//=============================================================================
// UserManagerSettings - User management configuration (extends OidcClientSettings)
//=============================================================================

export interface UserManagerSettingsArgs extends OidcClientSettingsArgs {
  popup_redirect_uri?: string;
  popup_post_logout_redirect_uri?: string;
  popupWindowFeatures?: string;
  popupWindowTarget?: string;
  silent_redirect_uri?: string;
  silentRequestTimeout?: number;
  automaticSilentRenew?: boolean;
  validateSubOnSilentRenew?: boolean;
  includeIdTokenInSilentRenew?: boolean;
  accessTokenExpiringNotificationTime?: number;
  monitorSession?: boolean;
  monitorAnonymousSession?: boolean;
  checkSessionInterval?: number;
  stopCheckSessionOnError?: boolean;
  query_status_response_type?: string;
  revokeAccessTokenOnSignout?: boolean;
  redirectNavigator?: INavigator;
  popupNavigator?: INavigator;
  iframeNavigator?: INavigator;
  userStore?: StateStore;
}

export class UserManagerSettings extends OidcClientSettings {
  private _popup_redirect_uri: string | undefined;
  private _popup_post_logout_redirect_uri: string | undefined;
  private _popupWindowFeatures: string | undefined;
  private _popupWindowTarget: string | undefined;

  private _silent_redirect_uri: string | undefined;
  private _silentRequestTimeout: number | undefined;
  private _automaticSilentRenew: boolean;
  private _validateSubOnSilentRenew: boolean;
  private _includeIdTokenInSilentRenew: boolean;
  private _accessTokenExpiringNotificationTime: number;

  private _monitorSession: boolean;
  private _monitorAnonymousSession: boolean;
  private _checkSessionInterval: number;
  private _stopCheckSessionOnError: boolean;
  private _query_status_response_type: string;
  private _revokeAccessTokenOnSignout: boolean;

  private _redirectNavigator: INavigator;
  private _popupNavigator: INavigator;
  private _iframeNavigator: INavigator;
  private _userStore: StateStore;

  constructor(settings: UserManagerSettingsArgs = {}) {
    super(settings);

    this._popup_redirect_uri = settings.popup_redirect_uri;
    this._popup_post_logout_redirect_uri = settings.popup_post_logout_redirect_uri;
    this._popupWindowFeatures = settings.popupWindowFeatures;
    this._popupWindowTarget = settings.popupWindowTarget;

    this._silent_redirect_uri = settings.silent_redirect_uri;
    this._silentRequestTimeout = settings.silentRequestTimeout;
    this._automaticSilentRenew = settings.automaticSilentRenew || false;
    this._validateSubOnSilentRenew = settings.validateSubOnSilentRenew || false;
    this._includeIdTokenInSilentRenew = settings.includeIdTokenInSilentRenew !== false;
    this._accessTokenExpiringNotificationTime =
      settings.accessTokenExpiringNotificationTime || DefaultAccessTokenExpiringNotificationTime;

    this._monitorSession = settings.monitorSession !== false;
    this._monitorAnonymousSession = settings.monitorAnonymousSession || false;
    this._checkSessionInterval = settings.checkSessionInterval || DefaultCheckSessionInterval;
    this._stopCheckSessionOnError = settings.stopCheckSessionOnError !== false;

    if (settings.query_status_response_type) {
      this._query_status_response_type = settings.query_status_response_type;
    } else if (settings.response_type) {
      this._query_status_response_type = SigninRequest.isOidc(settings.response_type)
        ? 'id_token'
        : 'code';
    } else {
      this._query_status_response_type = 'id_token';
    }
    this._revokeAccessTokenOnSignout = settings.revokeAccessTokenOnSignout || false;

    this._redirectNavigator = settings.redirectNavigator || new RedirectNavigator();
    this._popupNavigator = settings.popupNavigator || new PopupNavigator();
    this._iframeNavigator = settings.iframeNavigator || new IFrameNavigator();

    this._userStore = settings.userStore || new WebStorageStateStore({ store: Global.sessionStorage });
  }

  get popup_redirect_uri(): string | undefined { return this._popup_redirect_uri; }
  get popup_post_logout_redirect_uri(): string | undefined { return this._popup_post_logout_redirect_uri; }
  get popupWindowFeatures(): string | undefined { return this._popupWindowFeatures; }
  get popupWindowTarget(): string | undefined { return this._popupWindowTarget; }

  get silent_redirect_uri(): string | undefined { return this._silent_redirect_uri; }
  get silentRequestTimeout(): number | undefined { return this._silentRequestTimeout; }
  get automaticSilentRenew(): boolean { return this._automaticSilentRenew; }
  get validateSubOnSilentRenew(): boolean { return this._validateSubOnSilentRenew; }
  get includeIdTokenInSilentRenew(): boolean { return this._includeIdTokenInSilentRenew; }
  get accessTokenExpiringNotificationTime(): number { return this._accessTokenExpiringNotificationTime; }

  get monitorSession(): boolean { return this._monitorSession; }
  get monitorAnonymousSession(): boolean { return this._monitorAnonymousSession; }
  get checkSessionInterval(): number { return this._checkSessionInterval; }
  get stopCheckSessionOnError(): boolean { return this._stopCheckSessionOnError; }
  get query_status_response_type(): string { return this._query_status_response_type; }
  get revokeAccessTokenOnSignout(): boolean { return this._revokeAccessTokenOnSignout; }

  get redirectNavigator(): INavigator { return this._redirectNavigator; }
  get popupNavigator(): INavigator { return this._popupNavigator; }
  get iframeNavigator(): INavigator { return this._iframeNavigator; }

  get userStore(): StateStore { return this._userStore; }
}
