/* eslint-disable */
// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import {Log} from '../utils/Log.js';
import {generateRandom} from '../crypto/Crypto.js';
import {JoseUtil} from '../crypto/Crypto.js';
import {CheckSessionIFrame} from '../navigation/Navigator.js';
import {Global} from '../utils/Global.js';

//=============================================================================
// State - Base state class for OIDC requests
//=============================================================================

export class State {
  constructor({id, data, created, request_type} = {}) {
    this._id = id || generateRandom();
    this._data = data;

    if (typeof created === 'number' && created > 0) {
      this._created = created;
    } else {
      this._created = parseInt(Date.now() / 1000);
    }
    this._request_type = request_type;
  }

  get id() {
    return this._id;
  }
  get data() {
    return this._data;
  }
  get created() {
    return this._created;
  }
  get request_type() {
    return this._request_type;
  }

  toStorageString() {
    Log.debug('State.toStorageString');
    return JSON.stringify({
      id: this.id,
      data: this.data,
      created: this.created,
      request_type: this.request_type,
    });
  }

  static fromStorageString(storageString) {
    Log.debug('State.fromStorageString');
    return new State(JSON.parse(storageString));
  }

  static clearStaleState(storage, age) {
    var cutoff = Date.now() / 1000 - age;

    return storage.getAllKeys().then(keys => {
      Log.debug('State.clearStaleState: got keys', keys);

      var promises = [];
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        var p = storage.get(key).then(item => {
          let remove = false;

          if (item) {
            try {
              var state = State.fromStorageString(item);

              Log.debug(
                'State.clearStaleState: got item from key: ',
                key,
                state.created,
              );

              if (state.created <= cutoff) {
                remove = true;
              }
            } catch (e) {
              Log.error(
                'State.clearStaleState: Error parsing state for key',
                key,
                e.message,
              );
              remove = true;
            }
          } else {
            Log.debug(
              'State.clearStaleState: no item in storage for key: ',
              key,
            );
            remove = true;
          }

          if (remove) {
            Log.debug('State.clearStaleState: removed item for key: ', key);
            return storage.remove(key);
          }
        });

        promises.push(p);
      }

      Log.debug(
        'State.clearStaleState: waiting on promise count:',
        promises.length,
      );
      return Promise.all(promises);
    });
  }
}

//=============================================================================
// SigninState - Extended state for signin requests (extends State)
//=============================================================================

export class SigninState extends State {
  constructor({
    nonce,
    authority,
    client_id,
    redirect_uri,
    code_verifier,
    response_mode,
    client_secret,
    scope,
    extraTokenParams,
    skipUserInfo,
  } = {}) {
    super(arguments[0]);

    if (nonce === true) {
      this._nonce = generateRandom();
    } else if (nonce) {
      this._nonce = nonce;
    }

    if (code_verifier === true) {
      // generateRandom() produces 32 length
      this._code_verifier = generateRandom() + generateRandom() + generateRandom();
    } else if (code_verifier) {
      this._code_verifier = code_verifier;
    }

    if (this.code_verifier) {
      let hash = JoseUtil.hashString(this.code_verifier, 'SHA256');
      this._code_challenge = JoseUtil.hexToBase64Url(hash);
    }

    this._redirect_uri = redirect_uri;
    this._authority = authority;
    this._client_id = client_id;
    this._response_mode = response_mode;
    this._client_secret = client_secret;
    this._scope = scope;
    this._extraTokenParams = extraTokenParams;
    this._skipUserInfo = skipUserInfo;
  }

  get nonce() {
    return this._nonce;
  }
  get authority() {
    return this._authority;
  }
  get client_id() {
    return this._client_id;
  }
  get redirect_uri() {
    return this._redirect_uri;
  }
  get code_verifier() {
    return this._code_verifier;
  }
  get code_challenge() {
    return this._code_challenge;
  }
  get response_mode() {
    return this._response_mode;
  }
  get client_secret() {
    return this._client_secret;
  }
  get scope() {
    return this._scope;
  }
  get extraTokenParams() {
    return this._extraTokenParams;
  }
  get skipUserInfo() {
    return this._skipUserInfo;
  }

  toStorageString() {
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

  static fromStorageString(storageString) {
    Log.debug('SigninState.fromStorageString');
    var data = JSON.parse(storageString);
    return new SigninState(data);
  }
}

//=============================================================================
// SessionMonitor - Monitors user session state with check_session iframe
//=============================================================================

export class SessionMonitor {
  constructor(
    userManager,
    CheckSessionIFrameCtor = CheckSessionIFrame,
    timer = Global.timer,
  ) {
    if (!userManager) {
      Log.error(
        'SessionMonitor.ctor: No user manager passed to SessionMonitor',
      );
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
                let tmpUser = {
                  session_state: session.session_state,
                };
                if (session.sub && session.sid) {
                  tmpUser.profile = {
                    sub: session.sub,
                    sid: session.sid,
                  };
                }
                this._start(tmpUser);
              })
              .catch(err => {
                // catch to suppress errors since we're in a ctor
                Log.error(
                  'SessionMonitor ctor: error from querySessionStatus:',
                  err.message,
                );
              });
          }
        })
        .catch(err => {
          // catch to suppress errors since we're in a ctor
          Log.error('SessionMonitor ctor: error from getUser:', err.message);
        }),
    );
  }

  get _settings() {
    return this._userManager.settings;
  }
  get _metadataService() {
    return this._userManager.metadataService;
  }
  get _client_id() {
    return this._settings.client_id;
  }
  get _checkSessionInterval() {
    return this._settings.checkSessionInterval;
  }
  get _stopCheckSessionOnError() {
    return this._settings.stopCheckSessionOnError;
  }

  _start(user) {
    let session_state = user.session_state;

    if (session_state) {
      if (user.profile) {
        this._sub = user.profile.sub;
        this._sid = user.profile.sid;
        Log.debug(
          'SessionMonitor._start: session_state:',
          session_state,
          ', sub:',
          this._sub,
        );
      } else {
        this._sub = undefined;
        this._sid = undefined;
        Log.debug(
          'SessionMonitor._start: session_state:',
          session_state,
          ', anonymous user',
        );
      }

      if (!this._checkSessionIFrame) {
        this._metadataService
          .getCheckSessionIframe()
          .then(url => {
            if (url) {
              Log.debug(
                'SessionMonitor._start: Initializing check session iframe',
              );

              let client_id = this._client_id;
              let interval = this._checkSessionInterval;
              let stopOnError = this._stopCheckSessionOnError;

              this._checkSessionIFrame = new this._CheckSessionIFrameCtor(
                this._callback.bind(this),
                client_id,
                url,
                interval,
                stopOnError,
              );
              this._checkSessionIFrame.load().then(() => {
                this._checkSessionIFrame.start(session_state);
              });
            } else {
              Log.warn(
                'SessionMonitor._start: No check session iframe found in the metadata',
              );
            }
          })
          .catch(err => {
            // catch to suppress errors since we're in non-promise callback
            Log.error(
              'SessionMonitor._start: Error from getCheckSessionIframe:',
              err.message,
            );
          });
      } else {
        this._checkSessionIFrame.start(session_state);
      }
    }
  }

  _stop() {
    this._sub = undefined;
    this._sid = undefined;

    if (this._checkSessionIFrame) {
      Log.debug('SessionMonitor._stop');
      this._checkSessionIFrame.stop();
    }

    if (this._settings.monitorAnonymousSession) {
      // using a timer to delay re-initialization to avoid race conditions during signout
      let timerHandle = this._timer.setInterval(() => {
        this._timer.clearInterval(timerHandle);

        this._userManager
          .querySessionStatus()
          .then(session => {
            let tmpUser = {
              session_state: session.session_state,
            };
            if (session.sub && session.sid) {
              tmpUser.profile = {
                sub: session.sub,
                sid: session.sid,
              };
            }
            this._start(tmpUser);
          })
          .catch(err => {
            // catch to suppress errors since we're in a callback
            Log.error(
              'SessionMonitor: error from querySessionStatus:',
              err.message,
            );
          });
      }, 1000);
    }
  }

  _callback() {
    this._userManager
      .querySessionStatus()
      .then(session => {
        var raiseEvent = true;

        if (session) {
          if (session.sub === this._sub) {
            raiseEvent = false;
            this._checkSessionIFrame.start(session.session_state);

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
            Log.debug(
              'SessionMonitor._callback: Different subject signed into OP:',
              session.sub,
            );
          }
        } else {
          Log.debug(
            'SessionMonitor._callback: Subject no longer signed into OP',
          );
        }

        if (raiseEvent) {
          if (this._sub) {
            Log.debug(
              'SessionMonitor._callback: SessionMonitor._callback; raising signed out event',
            );
            this._userManager.events._raiseUserSignedOut();
          } else {
            Log.debug(
              'SessionMonitor._callback: SessionMonitor._callback; raising signed in event',
            );
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

export class SilentRenewService {
  constructor(userManager) {
    this._userManager = userManager;
  }

  start() {
    if (!this._callback) {
      this._callback = this._tokenExpiring.bind(this);
      this._userManager.events.addAccessTokenExpiring(this._callback);

      // this will trigger loading of the user so the expiring events can be initialized
      this._userManager
        .getUser()
        .then(user => {
          // deliberate nop
        })
        .catch(err => {
          // catch to suppress errors since we're in a ctor
          Log.error(
            'SilentRenewService.start: Error from getUser:',
            err.message,
          );
        });
    }
  }

  stop() {
    if (this._callback) {
      this._userManager.events.removeAccessTokenExpiring(this._callback);
      delete this._callback;
    }
  }

  _tokenExpiring() {
    this._userManager.signinSilent().then(
      user => {
        Log.debug(
          'SilentRenewService._tokenExpiring: Silent token renewal successful',
        );
      },
      err => {
        Log.error(
          'SilentRenewService._tokenExpiring: Error from signinSilent:',
          err.message,
        );
        this._userManager.events._raiseSilentRenewError(err);
      },
    );
  }
}
