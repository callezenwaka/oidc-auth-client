// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import { Log } from '../utils/Log.js';
import { generateRandom } from '../crypto/Crypto.js';
import { CheckSessionIFrame } from '../navigation/Navigator.js';
import { Global } from '../utils/Global.js';
import type { StateStore } from '../types/storage.js';
import type { TimerService } from '../utils/Global.js';

//=============================================================================
// State - Base state class for OIDC requests
//=============================================================================

export interface StateArgs {
  id?: string;
  data?: unknown;
  created?: number;
  request_type?: string;
}

export class State {
  private _id: string;
  private _data: unknown;
  private _created: number;
  private _request_type: string | undefined;

  constructor({ id, data, created, request_type }: StateArgs = {}) {
    this._id = id || generateRandom();
    this._data = data;

    if (typeof created === 'number' && created > 0) {
      this._created = created;
    } else {
      this._created = Math.floor(Date.now() / 1000);
    }
    this._request_type = request_type;
  }

  get id(): string { return this._id; }
  get data(): unknown { return this._data; }
  get created(): number { return this._created; }
  get request_type(): string | undefined { return this._request_type; }

  toStorageString(): string {
    Log.debug('State.toStorageString');
    return JSON.stringify({
      id: this.id,
      data: this.data,
      created: this.created,
      request_type: this.request_type,
    });
  }

  static fromStorageString(storageString: string): State {
    Log.debug('State.fromStorageString');
    return new State(JSON.parse(storageString));
  }

  static clearStaleState(storage: StateStore, age: number): Promise<void[]> {
    const cutoff = Date.now() / 1000 - age;

    return storage.getAllKeys().then(keys => {
      Log.debug('State.clearStaleState: got keys', keys);

      const promises: Promise<void>[] = [];
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const p = storage.get(key).then(item => {
          let remove = false;

          if (item) {
            try {
              const state = State.fromStorageString(item);
              Log.debug('State.clearStaleState: got item from key: ', key, state.created);

              if (state.created <= cutoff) {
                remove = true;
              }
            } catch (e: unknown) {
              Log.error('State.clearStaleState: Error parsing state for key', key, (e as Error).message);
              remove = true;
            }
          } else {
            Log.debug('State.clearStaleState: no item in storage for key: ', key);
            remove = true;
          }

          if (remove) {
            Log.debug('State.clearStaleState: removed item for key: ', key);
            return storage.remove(key);
          }
        }) as Promise<void>;

        promises.push(p);
      }

      Log.debug('State.clearStaleState: waiting on promise count:', promises.length);
      return Promise.all(promises);
    });
  }
}

//=============================================================================
// SigninState - Extended state for signin requests (extends State)
//=============================================================================

export interface SigninStateArgs extends StateArgs {
  nonce?: boolean | string;
  authority?: string;
  client_id?: string;
  redirect_uri?: string;
  code_verifier?: boolean | string;
  code_challenge?: string;
  response_mode?: string | null;
  client_secret?: string;
  scope?: string;
  extraTokenParams?: Record<string, unknown>;
  skipUserInfo?: boolean;
}

export class SigninState extends State {
  private _nonce: string | undefined;
  private _code_verifier: string | undefined;
  private _code_challenge: string | undefined;
  private _redirect_uri: string | undefined;
  private _authority: string | undefined;
  private _client_id: string | undefined;
  private _response_mode: string | null | undefined;
  private _client_secret: string | undefined;
  private _scope: string | undefined;
  private _extraTokenParams: Record<string, unknown> | undefined;
  private _skipUserInfo: boolean | undefined;

  constructor(args: SigninStateArgs = {}) {
    super(args);

    const { nonce, authority, client_id, redirect_uri, code_verifier, code_challenge,
      response_mode, client_secret, scope, extraTokenParams, skipUserInfo } = args;

    if (nonce === true) {
      this._nonce = generateRandom();
    } else if (nonce) {
      this._nonce = nonce as string;
    }

    if (code_verifier === true) {
      this._code_verifier = generateRandom() + generateRandom() + generateRandom();
    } else if (code_verifier) {
      this._code_verifier = code_verifier as string;
    }

    // code_challenge is pre-computed by createSigninRequest (async PKCE via jose)
    // and passed in; never computed synchronously here.
    this._code_challenge = code_challenge;

    this._redirect_uri = redirect_uri;
    this._authority = authority;
    this._client_id = client_id;
    this._response_mode = response_mode;
    this._client_secret = client_secret;
    this._scope = scope;
    this._extraTokenParams = extraTokenParams;
    this._skipUserInfo = skipUserInfo;
  }

  get nonce(): string | undefined { return this._nonce; }
  get authority(): string | undefined { return this._authority; }
  get client_id(): string | undefined { return this._client_id; }
  get redirect_uri(): string | undefined { return this._redirect_uri; }
  get code_verifier(): string | undefined { return this._code_verifier; }
  get code_challenge(): string | undefined { return this._code_challenge; }
  get response_mode(): string | null | undefined { return this._response_mode; }
  get client_secret(): string | undefined { return this._client_secret; }
  get scope(): string | undefined { return this._scope; }
  get extraTokenParams(): Record<string, any> | undefined { return this._extraTokenParams; }
  get skipUserInfo(): boolean | undefined { return this._skipUserInfo; }

  toStorageString(): string {
    Log.debug('SigninState.toStorageString');
    return JSON.stringify({
      id: this.id,
      data: this.data,
      created: this.created,
      request_type: this.request_type,
      nonce: this.nonce,
      code_verifier: this.code_verifier,
      redirect_uri: this.redirect_uri,
      authority: this.authority,
      client_id: this.client_id,
      response_mode: this.response_mode,
      client_secret: this.client_secret,
      scope: this.scope,
      extraTokenParams: this.extraTokenParams,
      skipUserInfo: this.skipUserInfo,
    });
  }

  static fromStorageString(storageString: string): SigninState {
    Log.debug('SigninState.fromStorageString');
    const data = JSON.parse(storageString);
    return new SigninState(data);
  }
}

//=============================================================================
// IUserManager - Minimal interface to break circular dependency with Client.ts
//=============================================================================

interface SessionUser {
  session_state?: string | null;
  profile?: { sub?: string; sid?: string };
}

interface SessionStatus {
  session_state: string;
  sub?: string;
  sid?: string;
}

interface ISessionEvents {
  addUserLoaded(fn: (user: SessionUser) => void): void;
  addUserUnloaded(fn: () => void): void;
  _raiseUserSignedOut(): void;
  _raiseUserSignedIn(): void;
  _raiseUserSessionChanged(): void;
}

interface IUserManagerForSession {
  events: ISessionEvents;
  settings: {
    monitorAnonymousSession?: boolean;
    client_id?: string;
    checkSessionInterval?: number;
    stopCheckSessionOnError?: boolean;
  };
  metadataService: {
    getCheckSessionIframe(): Promise<string | undefined>;
  };
  getUser(): Promise<SessionUser | null>;
  querySessionStatus(): Promise<SessionStatus | null>;
}

//=============================================================================
// SessionMonitor - Monitors user session state with check_session iframe
//=============================================================================

export class SessionMonitor {
  private _userManager: IUserManagerForSession;
  private _CheckSessionIFrameCtor: typeof CheckSessionIFrame;
  private _timer: TimerService | undefined;
  private _checkSessionIFrame: CheckSessionIFrame | undefined;
  private _sub: string | undefined;
  private _sid: string | undefined;

  constructor(
    userManager: IUserManagerForSession,
    CheckSessionIFrameCtor: typeof CheckSessionIFrame = CheckSessionIFrame,
    timer: TimerService | undefined = Global.timer,
  ) {
    if (!userManager) {
      Log.error('SessionMonitor.ctor: No user manager passed to SessionMonitor');
      throw new Error('userManager');
    }

    this._userManager = userManager;
    this._CheckSessionIFrameCtor = CheckSessionIFrameCtor;
    this._timer = timer;

    this._userManager.events.addUserLoaded(this._start.bind(this));
    this._userManager.events.addUserUnloaded(this._stop.bind(this));

    Promise.resolve(
      this._userManager
        .getUser()
        .then(user => {
          // doing this manually here since calling getUser
          // doesn't trigger load event.
          if (user) {
            this._start(user);
          } else if (this._settings.monitorAnonymousSession) {
            this._userManager
              .querySessionStatus()
              .then(session => {
                if (session) {
                  const tmpUser: SessionUser = {
                    session_state: session.session_state,
                  };
                  if (session.sub && session.sid) {
                    tmpUser.profile = {
                      sub: session.sub,
                      sid: session.sid,
                    };
                  }
                  this._start(tmpUser);
                }
              })
              .catch(err => {
                // catch to suppress errors since we're in a ctor
                Log.error('SessionMonitor ctor: error from querySessionStatus:', err.message);
              });
          }
        })
        .catch(err => {
          // catch to suppress errors since we're in a ctor
          Log.error('SessionMonitor ctor: error from getUser:', err.message);
        }),
    );
  }

  private get _settings() {
    return this._userManager.settings;
  }
  private get _metadataService() {
    return this._userManager.metadataService;
  }
  private get _client_id() {
    return this._settings.client_id;
  }
  private get _checkSessionInterval() {
    return this._settings.checkSessionInterval;
  }
  private get _stopCheckSessionOnError() {
    return this._settings.stopCheckSessionOnError;
  }

  private _start(user: SessionUser): void {
    const session_state = user.session_state;

    if (session_state) {
      if (user.profile) {
        this._sub = user.profile.sub;
        this._sid = user.profile.sid;
        Log.debug('SessionMonitor._start: session_state:', session_state, ', sub:', this._sub);
      } else {
        this._sub = undefined;
        this._sid = undefined;
        Log.debug('SessionMonitor._start: session_state:', session_state, ', anonymous user');
      }

      if (!this._checkSessionIFrame) {
        this._metadataService
          .getCheckSessionIframe()
          .then(url => {
            if (url) {
              Log.debug('SessionMonitor._start: Initializing check session iframe');

              const client_id = this._client_id!;
              const interval = this._checkSessionInterval;
              const stopOnError = this._stopCheckSessionOnError;

              this._checkSessionIFrame = new this._CheckSessionIFrameCtor(
                this._callback.bind(this),
                client_id,
                url,
                interval,
                stopOnError,
              );
              this._checkSessionIFrame.load().then(() => {
                this._checkSessionIFrame!.start(session_state);
              });
            } else {
              Log.warn('SessionMonitor._start: No check session iframe found in the metadata');
            }
          })
          .catch(err => {
            // catch to suppress errors since we're in non-promise callback
            Log.error('SessionMonitor._start: Error from getCheckSessionIframe:', err.message);
          });
      } else {
        this._checkSessionIFrame.start(session_state);
      }
    }
  }

  private _stop(): void {
    this._sub = undefined;
    this._sid = undefined;

    if (this._checkSessionIFrame) {
      Log.debug('SessionMonitor._stop');
      this._checkSessionIFrame.stop();
    }

    if (this._settings.monitorAnonymousSession) {
      // using a timer to delay re-initialization to avoid race conditions during signout
      const timerHandle = this._timer!.setInterval(() => {
        this._timer!.clearInterval(timerHandle);

        this._userManager
          .querySessionStatus()
          .then(session => {
            if (session) {
              const tmpUser: SessionUser = {
                session_state: session.session_state,
              };
              if (session.sub && session.sid) {
                tmpUser.profile = {
                  sub: session.sub,
                  sid: session.sid,
                };
              }
              this._start(tmpUser);
            }
          })
          .catch(err => {
            // catch to suppress errors since we're in a callback
            Log.error('SessionMonitor: error from querySessionStatus:', err.message);
          });
      }, 1000);
    }
  }

  private _callback(): void {
    this._userManager
      .querySessionStatus()
      .then(session => {
        let raiseEvent = true;

        if (session) {
          if (session.sub === this._sub) {
            raiseEvent = false;
            this._checkSessionIFrame!.start(session.session_state);

            if (session.sid === this._sid) {
              Log.debug(
                'SessionMonitor._callback: Same sub still logged in at OP, restarting check session iframe; session_state:',
                session.session_state,
              );
            } else {
              Log.debug(
                'SessionMonitor._callback: Same sub still logged in at OP, session state has changed, restarting check session iframe; session_state:',
                session.session_state,
              );
              this._userManager.events._raiseUserSessionChanged();
            }
          } else {
            Log.debug('SessionMonitor._callback: Different subject signed into OP:', session.sub);
          }
        } else {
          Log.debug('SessionMonitor._callback: Subject no longer signed into OP');
        }

        if (raiseEvent) {
          if (this._sub) {
            Log.debug('SessionMonitor._callback: SessionMonitor._callback; raising signed out event');
            this._userManager.events._raiseUserSignedOut();
          } else {
            Log.debug('SessionMonitor._callback: SessionMonitor._callback; raising signed in event');
            this._userManager.events._raiseUserSignedIn();
          }
        }
      })
      .catch(err => {
        if (this._sub) {
          Log.debug(
            'SessionMonitor._callback: Error calling queryCurrentSigninSession; raising signed out event',
            err.message,
          );
          this._userManager.events._raiseUserSignedOut();
        }
      });
  }
}

//=============================================================================
// SilentRenewService - Automatic silent token renewal
//=============================================================================

interface IUserManagerForSilentRenew {
  events: {
    addAccessTokenExpiring(fn: () => void): void;
    removeAccessTokenExpiring(fn: () => void): void;
    _raiseSilentRenewError(e: Error): void;
  };
  getUser(): Promise<any>;
  signinSilent(args?: Record<string, any>): Promise<any>;
}

export class SilentRenewService {
  private _userManager: IUserManagerForSilentRenew;
  private _callback: (() => void) | undefined;

  constructor(userManager: IUserManagerForSilentRenew) {
    this._userManager = userManager;
  }

  start(): void {
    if (!this._callback) {
      this._callback = this._tokenExpiring.bind(this);
      this._userManager.events.addAccessTokenExpiring(this._callback);

      // this will trigger loading of the user so the expiring events can be initialized
      this._userManager
        .getUser()
        .then(_user => {
          // deliberate nop
        })
        .catch(err => {
          // catch to suppress errors since we're in a ctor
          Log.error('SilentRenewService.start: Error from getUser:', err.message);
        });
    }
  }

  stop(): void {
    if (this._callback) {
      this._userManager.events.removeAccessTokenExpiring(this._callback);
      delete this._callback;
    }
  }

  private _tokenExpiring(): void {
    this._userManager.signinSilent().then(
      _user => {
        Log.debug('SilentRenewService._tokenExpiring: Silent token renewal successful');
      },
      (err: Error) => {
        Log.error('SilentRenewService._tokenExpiring: Error from signinSilent:', err.message);
        this._userManager.events._raiseSilentRenewError(err);
      },
    );
  }
}
