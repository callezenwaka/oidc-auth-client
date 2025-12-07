/* eslint-disable */
// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import {Log} from '../utils/Log.js';
import {Event} from '../utils/Event.js';
import {Timer} from '../services/Timer.js';

//=============================================================================
// AccessTokenEvents - Access token lifecycle event management
//=============================================================================

const DefaultAccessTokenExpiringNotificationTime = 60; // seconds

export class AccessTokenEvents {
  constructor({
    accessTokenExpiringNotificationTime = DefaultAccessTokenExpiringNotificationTime,
    accessTokenExpiringTimer = new Timer('Access token expiring'),
    accessTokenExpiredTimer = new Timer('Access token expired'),
  } = {}) {
    this._accessTokenExpiringNotificationTime = accessTokenExpiringNotificationTime;

    this._accessTokenExpiring = accessTokenExpiringTimer;
    this._accessTokenExpired = accessTokenExpiredTimer;
  }

  load(container) {
    // only register events if there's an access token and it has an expiration
    if (container.access_token && container.expires_in !== undefined) {
      let duration = container.expires_in;
      Log.debug(
        'AccessTokenEvents.load: access token present, remaining duration:',
        duration,
      );

      if (duration > 0) {
        // only register expiring if we still have time
        let expiring = duration - this._accessTokenExpiringNotificationTime;
        if (expiring <= 0) {
          expiring = 1;
        }

        Log.debug(
          'AccessTokenEvents.load: registering expiring timer in:',
          expiring,
        );
        this._accessTokenExpiring.init(expiring);
      } else {
        Log.debug(
          "AccessTokenEvents.load: canceling existing expiring timer becase we're past expiration.",
        );
        this._accessTokenExpiring.cancel();
      }

      // if it's negative, it will still fire
      let expired = duration + 1;
      Log.debug(
        'AccessTokenEvents.load: registering expired timer in:',
        expired,
      );
      this._accessTokenExpired.init(expired);
    } else {
      this._accessTokenExpiring.cancel();
      this._accessTokenExpired.cancel();
    }
  }

  unload() {
    Log.debug(
      'AccessTokenEvents.unload: canceling existing access token timers',
    );
    this._accessTokenExpiring.cancel();
    this._accessTokenExpired.cancel();
  }

  addAccessTokenExpiring(cb) {
    this._accessTokenExpiring.addHandler(cb);
  }
  removeAccessTokenExpiring(cb) {
    this._accessTokenExpiring.removeHandler(cb);
  }

  addAccessTokenExpired(cb) {
    this._accessTokenExpired.addHandler(cb);
  }
  removeAccessTokenExpired(cb) {
    this._accessTokenExpired.removeHandler(cb);
  }
}

//=============================================================================
// UserManagerEvents - User manager event system (extends AccessTokenEvents)
//=============================================================================

export class UserManagerEvents extends AccessTokenEvents {
  constructor(settings) {
    super(settings);
    this._userLoaded = new Event('User loaded');
    this._userUnloaded = new Event('User unloaded');
    this._silentRenewError = new Event('Silent renew error');
    this._userSignedIn = new Event('User signed in');
    this._userSignedOut = new Event('User signed out');
    this._userSessionChanged = new Event('User session changed');
  }

  load(user, raiseEvent = true) {
    Log.debug('UserManagerEvents.load');
    super.load(user);
    if (raiseEvent) {
      this._userLoaded.raise(user);
    }
  }
  unload() {
    Log.debug('UserManagerEvents.unload');
    super.unload();
    this._userUnloaded.raise();
  }

  addUserLoaded(cb) {
    this._userLoaded.addHandler(cb);
  }
  removeUserLoaded(cb) {
    this._userLoaded.removeHandler(cb);
  }

  addUserUnloaded(cb) {
    this._userUnloaded.addHandler(cb);
  }
  removeUserUnloaded(cb) {
    this._userUnloaded.removeHandler(cb);
  }

  addSilentRenewError(cb) {
    this._silentRenewError.addHandler(cb);
  }
  removeSilentRenewError(cb) {
    this._silentRenewError.removeHandler(cb);
  }
  _raiseSilentRenewError(e) {
    Log.debug('UserManagerEvents._raiseSilentRenewError', e.message);
    this._silentRenewError.raise(e);
  }

  addUserSignedIn(cb) {
    this._userSignedIn.addHandler(cb);
  }
  removeUserSignedIn(cb) {
    this._userSignedIn.removeHandler(cb);
  }
  _raiseUserSignedIn() {
    Log.debug('UserManagerEvents._raiseUserSignedIn');
    this._userSignedIn.raise();
  }

  addUserSignedOut(cb) {
    this._userSignedOut.addHandler(cb);
  }
  removeUserSignedOut(cb) {
    this._userSignedOut.removeHandler(cb);
  }
  _raiseUserSignedOut() {
    Log.debug('UserManagerEvents._raiseUserSignedOut');
    this._userSignedOut.raise();
  }

  addUserSessionChanged(cb) {
    this._userSessionChanged.addHandler(cb);
  }
  removeUserSessionChanged(cb) {
    this._userSessionChanged.removeHandler(cb);
  }
  _raiseUserSessionChanged() {
    Log.debug('UserManagerEvents._raiseUserSessionChanged');
    this._userSessionChanged.raise();
  }
}
