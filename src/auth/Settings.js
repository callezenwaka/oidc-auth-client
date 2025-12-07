/* eslint-disable */
// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import {Log} from '../utils/Log.js';
import {ClockService} from '../services/Timer.js';
import {WebStorageStateStore} from '../storage/Storage.js';
import {ResponseValidator} from '../protocol/ResponseValidator.js';
import {MetadataService} from '../services/Http.js';
import {RedirectNavigator, PopupNavigator, IFrameNavigator} from '../navigation/Navigator.js';
import {Global} from '../utils/Global.js';
import {SigninRequest} from '../protocol/Requests.js';

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

export class OidcClientSettings {
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
  } = {}) {
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

    this._extraQueryParams =
      typeof extraQueryParams === 'object' ? extraQueryParams : {};
    this._extraTokenParams =
      typeof extraTokenParams === 'object' ? extraTokenParams : {};
  }

  // client config
  get client_id() {
    return this._client_id;
  }
  set client_id(value) {
    if (!this._client_id) {
      this._client_id = value;
    } else {
      Log.error(
        'OidcClientSettings.set_client_id: client_id has already been assigned.',
      );
      throw new Error('client_id has already been assigned.');
    }
  }
  get client_secret() {
    return this._client_secret;
  }
  get response_type() {
    return this._response_type;
  }
  get scope() {
    return this._scope;
  }
  get redirect_uri() {
    return this._redirect_uri;
  }
  get post_logout_redirect_uri() {
    return this._post_logout_redirect_uri;
  }
  get client_authentication() {
    return this._client_authentication;
  }

  // optional protocol params
  get prompt() {
    return this._prompt;
  }
  get display() {
    return this._display;
  }
  get max_age() {
    return this._max_age;
  }
  get ui_locales() {
    return this._ui_locales;
  }
  get acr_values() {
    return this._acr_values;
  }
  get resource() {
    return this._resource;
  }
  get response_mode() {
    return this._response_mode;
  }

  // metadata
  get authority() {
    return this._authority;
  }
  set authority(value) {
    if (!this._authority) {
      this._authority = value;
    } else {
      Log.error(
        'OidcClientSettings.set_authority: authority has already been assigned.',
      );
      throw new Error('authority has already been assigned.');
    }
  }
  get metadataUrl() {
    if (!this._metadataUrl) {
      this._metadataUrl = this.authority;

      if (
        this._metadataUrl &&
        this._metadataUrl.indexOf(OidcMetadataUrlPath) < 0
      ) {
        if (this._metadataUrl[this._metadataUrl.length - 1] !== '/') {
          this._metadataUrl += '/';
        }
        this._metadataUrl += OidcMetadataUrlPath;
      }
    }

    return this._metadataUrl;
  }

  // settable/cachable metadata values
  get metadata() {
    return this._metadata;
  }
  set metadata(value) {
    this._metadata = value;
  }
  get metadataSeed() {
    return this._metadataSeed;
  }
  set metadataSeed(value) {
    this._metadataSeed = value;
  }

  get signingKeys() {
    return this._signingKeys;
  }
  set signingKeys(value) {
    this._signingKeys = value;
  }

  // behavior flags
  get filterProtocolClaims() {
    return this._filterProtocolClaims;
  }
  get loadUserInfo() {
    return this._loadUserInfo;
  }
  get staleStateAge() {
    return this._staleStateAge;
  }
  get clockSkew() {
    return this._clockSkew;
  }
  get userInfoJwtIssuer() {
    return this._userInfoJwtIssuer;
  }
  get mergeClaims() {
    return this._mergeClaims;
  }

  get stateStore() {
    return this._stateStore;
  }
  get validator() {
    return this._validator;
  }
  get metadataService() {
    return this._metadataService;
  }

  // extra query params
  get extraQueryParams() {
    return this._extraQueryParams;
  }
  set extraQueryParams(value) {
    if (typeof value === 'object') {
      this._extraQueryParams = value;
    } else {
      this._extraQueryParams = {};
    }
  }

  // extra token params
  get extraTokenParams() {
    return this._extraTokenParams;
  }
  set extraTokenParams(value) {
    if (typeof value === 'object') {
      this._extraTokenParams = value;
    } else {
      this._extraTokenParams = {};
    }
  }

  // get the time
  getEpochTime() {
    return this._clockService.getEpochTime();
  }
}

//=============================================================================
// UserManagerSettings - User management configuration (uses COMPOSITION)
//=============================================================================

export class UserManagerSettings {
  constructor(settings = {}) {
    // COMPOSITION: Create an OidcClientSettings instance instead of extending
    this._oidcSettings = new OidcClientSettings(settings);

    // User Manager specific settings
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

    this._userStore = settings.userStore || new WebStorageStateStore({store: Global.sessionStorage});
  }

  // Delegate all OidcClientSettings properties to the composed instance
  get client_id() { return this._oidcSettings.client_id; }
  set client_id(value) { this._oidcSettings.client_id = value; }
  get client_secret() { return this._oidcSettings.client_secret; }
  get response_type() { return this._oidcSettings.response_type; }
  get scope() { return this._oidcSettings.scope; }
  get redirect_uri() { return this._oidcSettings.redirect_uri; }
  get post_logout_redirect_uri() { return this._oidcSettings.post_logout_redirect_uri; }
  get client_authentication() { return this._oidcSettings.client_authentication; }

  get prompt() { return this._oidcSettings.prompt; }
  get display() { return this._oidcSettings.display; }
  get max_age() { return this._oidcSettings.max_age; }
  get ui_locales() { return this._oidcSettings.ui_locales; }
  get acr_values() { return this._oidcSettings.acr_values; }
  get resource() { return this._oidcSettings.resource; }
  get response_mode() { return this._oidcSettings.response_mode; }

  get authority() { return this._oidcSettings.authority; }
  set authority(value) { this._oidcSettings.authority = value; }
  get metadataUrl() { return this._oidcSettings.metadataUrl; }
  get metadata() { return this._oidcSettings.metadata; }
  set metadata(value) { this._oidcSettings.metadata = value; }
  get metadataSeed() { return this._oidcSettings.metadataSeed; }
  set metadataSeed(value) { this._oidcSettings.metadataSeed = value; }
  get signingKeys() { return this._oidcSettings.signingKeys; }
  set signingKeys(value) { this._oidcSettings.signingKeys = value; }

  get filterProtocolClaims() { return this._oidcSettings.filterProtocolClaims; }
  get loadUserInfo() { return this._oidcSettings.loadUserInfo; }
  get staleStateAge() { return this._oidcSettings.staleStateAge; }
  get clockSkew() { return this._oidcSettings.clockSkew; }
  get userInfoJwtIssuer() { return this._oidcSettings.userInfoJwtIssuer; }
  get mergeClaims() { return this._oidcSettings.mergeClaims; }

  get stateStore() { return this._oidcSettings.stateStore; }
  get validator() { return this._oidcSettings.validator; }
  get metadataService() { return this._oidcSettings.metadataService; }

  get extraQueryParams() { return this._oidcSettings.extraQueryParams; }
  set extraQueryParams(value) { this._oidcSettings.extraQueryParams = value; }
  get extraTokenParams() { return this._oidcSettings.extraTokenParams; }
  set extraTokenParams(value) { this._oidcSettings.extraTokenParams = value; }

  getEpochTime() { return this._oidcSettings.getEpochTime(); }

  // UserManager-specific getters
  get popup_redirect_uri() {
    return this._popup_redirect_uri;
  }
  get popup_post_logout_redirect_uri() {
    return this._popup_post_logout_redirect_uri;
  }
  get popupWindowFeatures() {
    return this._popupWindowFeatures;
  }
  get popupWindowTarget() {
    return this._popupWindowTarget;
  }

  get silent_redirect_uri() {
    return this._silent_redirect_uri;
  }
  get silentRequestTimeout() {
    return this._silentRequestTimeout;
  }
  get automaticSilentRenew() {
    return this._automaticSilentRenew;
  }
  get validateSubOnSilentRenew() {
    return this._validateSubOnSilentRenew;
  }
  get includeIdTokenInSilentRenew() {
    return this._includeIdTokenInSilentRenew;
  }
  get accessTokenExpiringNotificationTime() {
    return this._accessTokenExpiringNotificationTime;
  }

  get monitorSession() {
    return this._monitorSession;
  }
  get monitorAnonymousSession() {
    return this._monitorAnonymousSession;
  }
  get checkSessionInterval() {
    return this._checkSessionInterval;
  }
  get stopCheckSessionOnError() {
    return this._stopCheckSessionOnError;
  }
  get query_status_response_type() {
    return this._query_status_response_type;
  }
  get revokeAccessTokenOnSignout() {
    return this._revokeAccessTokenOnSignout;
  }

  get redirectNavigator() {
    return this._redirectNavigator;
  }
  get popupNavigator() {
    return this._popupNavigator;
  }
  get iframeNavigator() {
    return this._iframeNavigator;
  }

  get userStore() {
    return this._userStore;
  }
}
