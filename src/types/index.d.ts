// TypeScript definitions for OIDC Client Library
// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

//=============================================================================
// Utils
//=============================================================================

export class Log {
  static readonly NONE: number;
  static readonly ERROR: number;
  static readonly WARN: number;
  static readonly INFO: number;
  static readonly DEBUG: number;

  static level: number;
  static logger: Console;

  static reset(): void;
  static debug(...args: any[]): void;
  static info(...args: any[]): void;
  static warn(...args: any[]): void;
  static error(...args: any[]): void;
}

//=============================================================================
// Models
//=============================================================================

export interface UserProfile {
  sub: string;
  sid?: string;
  [key: string]: any;
}

export class User {
  constructor(data: {
    id_token?: string;
    session_state?: string | null;
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    scope?: string;
    profile?: UserProfile;
    expires_at?: number;
    state?: any;
  });

  readonly id_token: string;
  readonly session_state: string | null;
  readonly access_token: string;
  readonly refresh_token: string;
  readonly token_type: string;
  readonly scope: string;
  readonly profile: UserProfile;
  readonly expires_at: number;
  readonly state: any;
  readonly expired: boolean;
  readonly expires_in: number;
  readonly scopes: string[];

  toStorageString(): string;
  static fromStorageString(storageString: string): User;
}

//=============================================================================
// Storage
//=============================================================================

export class WebStorageStateStore {
  constructor(config?: { prefix?: string; store?: Storage });
  set(key: string, value: any): Promise<void>;
  get(key: string): Promise<any>;
  remove(key: string): Promise<any>;
  getAllKeys(): Promise<string[]>;
}

export class InMemoryWebStorage {
  constructor();
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  get length(): number;
  key(index: number): string | null;
}

//=============================================================================
// Services
//=============================================================================

export class Timer {
  constructor(name: string, timer?: any, nowFunc?: () => number);
  readonly now: number;
  readonly expiration: number;
  init(duration: number): void;
  cancel(): void;
}

export class ClockService {
  getEpochTime(): Promise<number>;
}

export class UrlUtility {
  static addQueryParam(url: string, name: string, value: string): string;
  static parseUrlFragment(value: string, delimiter?: string, global?: any): any;
}

export class JsonService {
  constructor(
    additionalContentTypes?: string[],
    XMLHttpRequestCtor?: any,
    jwtHandler?: any
  );
  getJson(url: string, token?: string): Promise<any>;
  postForm(url: string, payload: any, basicAuth?: string): Promise<any>;
}

export class MetadataService {
  constructor(settings: OidcClientSettings);
  getMetadata(): Promise<OidcMetadata>;
  getIssuer(): Promise<string>;
  getAuthorizationEndpoint(): Promise<string>;
  getUserInfoEndpoint(): Promise<string>;
  getTokenEndpoint(): Promise<string | undefined>;
  getCheckSessionIframe(): Promise<string | undefined>;
  getEndSessionEndpoint(): Promise<string | undefined>;
  getRevocationEndpoint(): Promise<string | undefined>;
  getKeysEndpoint(): Promise<string | undefined>;
  getSigningKeys(): Promise<any>;
  resetSigningKeys(): void;
}

//=============================================================================
// Crypto
//=============================================================================

export function generateRandom(): string;

export class JoseUtil {
  static parseJwt(jwt: string): any;
  static validateJwt(
    jwt: string,
    key: any,
    issuer: string,
    audience: string,
    clockSkew?: number,
    now?: number,
    timeInsensitive?: boolean
  ): Promise<any>;
  static validateJwtAttributes(
    jwt: any,
    issuer: string,
    audience: string,
    clockSkew?: number,
    now?: number,
    timeInsensitive?: boolean
  ): void;
  static hashString(value: string, alg: string): string;
  static hexToBase64Url(hex: string): string;
}

//=============================================================================
// Protocol
//=============================================================================

export interface OidcMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint?: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
  check_session_iframe?: string;
  revocation_endpoint?: string;
  jwks_uri?: string;
  [key: string]: any;
}

export class SigninRequest {
  constructor(config: {
    url: string;
    client_id: string;
    redirect_uri: string;
    response_type: string;
    scope: string;
    authority: string;
    data?: any;
    prompt?: string;
    display?: string;
    max_age?: number;
    ui_locales?: string;
    id_token_hint?: string;
    login_hint?: string;
    acr_values?: string;
    resource?: string;
    response_mode?: string;
    request?: string;
    request_uri?: string;
    extraQueryParams?: any;
    request_type?: string;
    client_secret?: string;
    extraTokenParams?: any;
    skipUserInfo?: boolean;
  });

  readonly url: string;
  readonly state: State;

  static isOidc(response_type: string): boolean;
  static isOAuth(response_type: string): boolean;
  static isCode(response_type: string): boolean;
}

export class SignoutRequest {
  constructor(config: {
    url: string;
    id_token_hint?: string;
    post_logout_redirect_uri?: string;
    data?: any;
    extraQueryParams?: any;
    request_type?: string;
  });

  readonly url: string;
  readonly state: State | null;
}

export class SigninResponse {
  constructor(url: string, delimiter?: string);

  readonly code: string;
  readonly state: string;
  readonly id_token: string;
  readonly session_state: string;
  readonly access_token: string;
  readonly token_type: string;
  readonly scope: string;
  readonly profile: UserProfile;
  readonly expires_in: number;
  readonly error: string;
  readonly error_description: string;
  readonly error_uri: string;
  readonly isOpenIdConnect: boolean;
}

export class SignoutResponse {
  constructor(url: string);

  readonly state: string;
  readonly error: string;
  readonly error_description: string;
  readonly error_uri: string;
}

export class ErrorResponse extends Error {
  constructor(
    config: {
      error: string;
      error_description?: string;
      error_uri?: string;
      state?: string;
      session_state?: string;
    },
    form?: any
  );

  readonly error: string;
  readonly error_description: string;
  readonly error_uri: string;
  readonly state: string;
  readonly session_state: string;
  readonly name: string;
  readonly message: string;
}

export class ResponseValidator {
  constructor(settings: OidcClientSettings);

  validateSigninResponse(
    response: SigninResponse,
    state: SigninState
  ): Promise<SigninResponse>;
  validateSignoutResponse(
    response: SignoutResponse,
    state: State
  ): Promise<SignoutResponse>;
}

export class TokenClient {
  constructor(settings: OidcClientSettings, JsonServiceCtor?: typeof JsonService);

  exchangeCode(args?: {
    client_id?: string;
    client_secret?: string;
    code?: string;
    redirect_uri?: string;
    code_verifier?: string;
    extraTokenParams?: any;
  }): Promise<any>;

  exchangeRefreshToken(args?: {
    client_id?: string;
    client_secret?: string;
    refresh_token?: string;
    scope?: string;
    timeoutInSeconds?: number;
  }): Promise<any>;
}

export class TokenRevocationClient {
  constructor(settings: OidcClientSettings, JsonServiceCtor?: typeof JsonService);

  revoke(token: string, required?: boolean, type?: string): Promise<void>;
}

export class UserInfoService {
  constructor(settings: OidcClientSettings, JsonServiceCtor?: typeof JsonService);

  getClaims(token: string): Promise<any>;
}

//=============================================================================
// Navigation
//=============================================================================

export interface NavigateParams {
  url: string;
  id?: string;
  useReplaceToNavigate?: boolean;
  silentRequestTimeout?: number;
  popupWindowFeatures?: string;
  popupWindowTarget?: string;
}

export class RedirectNavigator {
  prepare(): Promise<RedirectNavigator>;
  navigate(params: NavigateParams): Promise<void>;
  readonly url: string;
}

export class PopupWindow {
  constructor(params: any);
  readonly promise: Promise<any>;
  navigate(params: NavigateParams): Promise<any>;
  close(): void;
  static notifyOpener(url?: string, keepOpen?: boolean, delimiter?: string): void;
}

export class PopupNavigator {
  prepare(params: any): Promise<PopupWindow>;
  callback(url?: string, keepOpen?: boolean, delimiter?: string): Promise<void>;
}

export class IFrameWindow {
  constructor(params: any);
  readonly promise: Promise<any>;
  navigate(params: NavigateParams): Promise<any>;
  close(): void;
  static notifyParent(url?: string): void;
}

export class IFrameNavigator {
  prepare(params: any): Promise<IFrameWindow>;
  callback(url?: string): Promise<void>;
}

export class CheckSessionIFrame {
  constructor(
    callback: () => void,
    client_id: string,
    url: string,
    interval?: number,
    stopOnError?: boolean
  );
  load(): Promise<void>;
  start(session_state: string): void;
  stop(): void;
}

export class CordovaPopupWindow {
  constructor(params: any);
  readonly promise: Promise<any>;
  navigate(params: NavigateParams): Promise<any>;
  close(): void;
}

export class CordovaPopupNavigator {
  prepare(params: any): Promise<CordovaPopupWindow>;
}

export class CordovaIFrameNavigator {
  prepare(params: any): Promise<CordovaPopupWindow>;
}

//=============================================================================
// Auth - Settings
//=============================================================================

export interface OidcClientSettingsConfig {
  authority?: string;
  metadataUrl?: string;
  metadata?: OidcMetadata;
  signingKeys?: any[];
  metadataSeed?: any;
  client_id?: string;
  client_secret?: string;
  response_type?: string;
  scope?: string;
  redirect_uri?: string;
  post_logout_redirect_uri?: string;
  client_authentication?: string;
  prompt?: string;
  display?: string;
  max_age?: number;
  ui_locales?: string;
  acr_values?: string;
  resource?: string;
  response_mode?: string;
  filterProtocolClaims?: boolean;
  loadUserInfo?: boolean;
  staleStateAge?: number;
  clockSkew?: number;
  clockService?: ClockService;
  userInfoJwtIssuer?: string;
  mergeClaims?: boolean;
  stateStore?: WebStorageStateStore;
  ResponseValidatorCtor?: typeof ResponseValidator;
  MetadataServiceCtor?: typeof MetadataService;
  extraQueryParams?: any;
  extraTokenParams?: any;
}

export class OidcClientSettings {
  constructor(config?: OidcClientSettingsConfig);

  client_id: string;
  readonly client_secret: string;
  readonly response_type: string;
  readonly scope: string;
  readonly redirect_uri: string;
  readonly post_logout_redirect_uri: string;
  readonly client_authentication: string;
  readonly prompt: string;
  readonly display: string;
  readonly max_age: number;
  readonly ui_locales: string;
  readonly acr_values: string;
  readonly resource: string;
  readonly response_mode: string;
  authority: string;
  readonly metadataUrl: string;
  metadata: OidcMetadata;
  metadataSeed: any;
  signingKeys: any[];
  readonly filterProtocolClaims: boolean;
  readonly loadUserInfo: boolean;
  readonly staleStateAge: number;
  readonly clockSkew: number;
  readonly userInfoJwtIssuer: string;
  readonly mergeClaims: boolean;
  readonly stateStore: WebStorageStateStore;
  readonly validator: ResponseValidator;
  readonly metadataService: MetadataService;
  extraQueryParams: any;
  extraTokenParams: any;

  getEpochTime(): Promise<number>;
}

export interface UserManagerSettingsConfig extends OidcClientSettingsConfig {
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
  redirectNavigator?: RedirectNavigator;
  popupNavigator?: PopupNavigator;
  iframeNavigator?: IFrameNavigator;
  userStore?: WebStorageStateStore;
}

export class UserManagerSettings {
  constructor(config?: UserManagerSettingsConfig);

  // All OidcClientSettings properties (delegated via composition)
  client_id: string;
  readonly client_secret: string;
  readonly response_type: string;
  readonly scope: string;
  readonly redirect_uri: string;
  readonly post_logout_redirect_uri: string;
  readonly client_authentication: string;
  readonly prompt: string;
  readonly display: string;
  readonly max_age: number;
  readonly ui_locales: string;
  readonly acr_values: string;
  readonly resource: string;
  readonly response_mode: string;
  authority: string;
  readonly metadataUrl: string;
  metadata: OidcMetadata;
  metadataSeed: any;
  signingKeys: any[];
  readonly filterProtocolClaims: boolean;
  readonly loadUserInfo: boolean;
  readonly staleStateAge: number;
  readonly clockSkew: number;
  readonly userInfoJwtIssuer: string;
  readonly mergeClaims: boolean;
  readonly stateStore: WebStorageStateStore;
  readonly validator: ResponseValidator;
  readonly metadataService: MetadataService;
  extraQueryParams: any;
  extraTokenParams: any;

  // UserManager-specific properties
  readonly popup_redirect_uri: string;
  readonly popup_post_logout_redirect_uri: string;
  readonly popupWindowFeatures: string;
  readonly popupWindowTarget: string;
  readonly silent_redirect_uri: string;
  readonly silentRequestTimeout: number;
  readonly automaticSilentRenew: boolean;
  readonly validateSubOnSilentRenew: boolean;
  readonly includeIdTokenInSilentRenew: boolean;
  readonly accessTokenExpiringNotificationTime: number;
  readonly monitorSession: boolean;
  readonly monitorAnonymousSession: boolean;
  readonly checkSessionInterval: number;
  readonly stopCheckSessionOnError: boolean;
  readonly query_status_response_type: string;
  readonly revokeAccessTokenOnSignout: boolean;
  readonly redirectNavigator: RedirectNavigator;
  readonly popupNavigator: PopupNavigator;
  readonly iframeNavigator: IFrameNavigator;
  readonly userStore: WebStorageStateStore;

  getEpochTime(): Promise<number>;
}

//=============================================================================
// Auth - Events
//=============================================================================

export type EventCallback = (...args: any[]) => void;

export class Event {
  constructor(name: string);
  addHandler(callback: EventCallback): void;
  removeHandler(callback: EventCallback): void;
  raise(...params: any[]): void;
}

export class AccessTokenEvents {
  constructor(config?: {
    accessTokenExpiringNotificationTime?: number;
    accessTokenExpiringTimer?: Timer;
    accessTokenExpiredTimer?: Timer;
  });

  load(container: { access_token?: string; expires_in?: number }): void;
  unload(): void;
  addAccessTokenExpiring(callback: EventCallback): void;
  removeAccessTokenExpiring(callback: EventCallback): void;
  addAccessTokenExpired(callback: EventCallback): void;
  removeAccessTokenExpired(callback: EventCallback): void;
}

export class UserManagerEvents extends AccessTokenEvents {
  constructor(settings?: any);

  load(user: User, raiseEvent?: boolean): void;
  unload(): void;

  addUserLoaded(callback: (user: User) => void): void;
  removeUserLoaded(callback: (user: User) => void): void;
  addUserUnloaded(callback: () => void): void;
  removeUserUnloaded(callback: () => void): void;
  addSilentRenewError(callback: (error: Error) => void): void;
  removeSilentRenewError(callback: (error: Error) => void): void;
  addUserSignedIn(callback: () => void): void;
  removeUserSignedIn(callback: () => void): void;
  addUserSignedOut(callback: () => void): void;
  removeUserSignedOut(callback: () => void): void;
  addUserSessionChanged(callback: () => void): void;
  removeUserSessionChanged(callback: () => void): void;
}

//=============================================================================
// Auth - Session
//=============================================================================

export class State {
  constructor(config?: {
    id?: string;
    data?: any;
    created?: number;
    request_type?: string;
  });

  readonly id: string;
  readonly data: any;
  readonly created: number;
  readonly request_type: string;

  toStorageString(): string;
  static fromStorageString(storageString: string): State;
  static clearStaleState(storage: WebStorageStateStore, age: number): Promise<void>;
}

export class SigninState extends State {
  constructor(config?: {
    id?: string;
    data?: any;
    created?: number;
    request_type?: string;
    nonce?: boolean | string;
    authority?: string;
    client_id?: string;
    redirect_uri?: string;
    code_verifier?: boolean | string;
    response_mode?: string;
    client_secret?: string;
    scope?: string;
    extraTokenParams?: any;
    skipUserInfo?: boolean;
  });

  readonly nonce: string;
  readonly authority: string;
  readonly client_id: string;
  readonly redirect_uri: string;
  readonly code_verifier: string;
  readonly code_challenge: string;
  readonly response_mode: string;
  readonly client_secret: string;
  readonly scope: string;
  readonly extraTokenParams: any;
  readonly skipUserInfo: boolean;

  toStorageString(): string;
  static fromStorageString(storageString: string): SigninState;
}

export class SessionMonitor {
  constructor(
    userManager: UserManager,
    CheckSessionIFrameCtor?: typeof CheckSessionIFrame,
    timer?: any
  );
}

export class SilentRenewService {
  constructor(userManager: UserManager);
  start(): void;
  stop(): void;
}

//=============================================================================
// Auth - Client
//=============================================================================

export class OidcClient {
  constructor(settings: OidcClientSettings);

  readonly settings: OidcClientSettings;
  readonly metadataService: MetadataService;

  createSigninRequest(args?: {
    response_type?: string;
    scope?: string;
    redirect_uri?: string;
    data?: any;
    state?: any;
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
    response_mode?: string;
    extraQueryParams?: any;
    extraTokenParams?: any;
    request_type?: string;
    skipUserInfo?: boolean;
  }): Promise<SigninRequest>;

  processSigninResponse(url?: string, delimiter?: string): Promise<SigninResponse>;

  createSignoutRequest(args?: {
    id_token_hint?: string;
    post_logout_redirect_uri?: string;
    data?: any;
    state?: any;
    extraQueryParams?: any;
    request_type?: string;
  }): Promise<SignoutRequest>;

  processSignoutResponse(url?: string): Promise<SignoutResponse>;

  clearStaleState(): Promise<void>;
}

export class UserManager extends OidcClient {
  constructor(settings: UserManagerSettings);

  readonly settings: UserManagerSettings;
  readonly events: UserManagerEvents;

  getUser(): Promise<User | null>;
  storeUser(user: User): Promise<void>;
  removeUser(): Promise<void>;

  signinRedirect(args?: any): Promise<void>;
  signinRedirectCallback(url?: string): Promise<User>;

  signinPopup(args?: any): Promise<User>;
  signinPopupCallback(url?: string, keepOpen?: boolean, delimiter?: string): Promise<void>;

  signinSilent(args?: any): Promise<User>;
  signinSilentCallback(url?: string): Promise<User | undefined>;

  querySessionStatus(args?: any): Promise<any>;

  revokeAccessToken(): Promise<void>;

  signoutRedirect(args?: any): Promise<void>;
  signoutRedirectCallback(url?: string): Promise<SignoutResponse>;

  signoutPopup(args?: any): Promise<void>;
  signoutPopupCallback(url?: string, keepOpen?: boolean): Promise<void>;

  startSilentRenew(): void;
  stopSilentRenew(): void;

  clearStaleState(): Promise<void>;
}

//=============================================================================
// Version
//=============================================================================

export const Version: string;
