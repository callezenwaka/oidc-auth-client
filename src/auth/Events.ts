// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import { Log } from '../utils/Log.js';
import { Event } from '../utils/Event.js';
import { Timer } from '../services/Timer.js';
import type { EventCallback } from '../utils/Event.js';

//=============================================================================
// AccessTokenEvents - Access token lifecycle event management
//=============================================================================

const DefaultAccessTokenExpiringNotificationTime = 60; // seconds

export interface TokenContainer {
  access_token?: string | null;
  expires_in?: number;
}

export interface AccessTokenEventsOptions {
  accessTokenExpiringNotificationTime?: number;
  accessTokenExpiringTimer?: Timer;
  accessTokenExpiredTimer?: Timer;
}

export class AccessTokenEvents {
  protected _accessTokenExpiringNotificationTime: number;
  protected _accessTokenExpiring: Timer;
  protected _accessTokenExpired: Timer;

  constructor({
    accessTokenExpiringNotificationTime = DefaultAccessTokenExpiringNotificationTime,
    accessTokenExpiringTimer = new Timer('Access token expiring'),
    accessTokenExpiredTimer = new Timer('Access token expired'),
  }: AccessTokenEventsOptions = {}) {
    this._accessTokenExpiringNotificationTime = accessTokenExpiringNotificationTime;
    this._accessTokenExpiring = accessTokenExpiringTimer;
    this._accessTokenExpired = accessTokenExpiredTimer;
  }

  load(container: TokenContainer): void {
    // only register events if there's an access token and it has an expiration
    if (container.access_token && container.expires_in !== undefined) {
      const duration = container.expires_in;
      Log.debug('AccessTokenEvents.load: access token present, remaining duration:', duration);

      if (duration > 0) {
        // only register expiring if we still have time
        let expiring = duration - this._accessTokenExpiringNotificationTime;
        if (expiring <= 0) {
          expiring = 1;
        }

        Log.debug('AccessTokenEvents.load: registering expiring timer in:', expiring);
        this._accessTokenExpiring.init(expiring);
      } else {
        Log.debug("AccessTokenEvents.load: canceling existing expiring timer becase we're past expiration.");
        this._accessTokenExpiring.cancel();
      }

      // if it's negative, it will still fire
      const expired = duration + 1;
      Log.debug('AccessTokenEvents.load: registering expired timer in:', expired);
      this._accessTokenExpired.init(expired);
    } else {
      this._accessTokenExpiring.cancel();
      this._accessTokenExpired.cancel();
    }
  }

  unload(): void {
    Log.debug('AccessTokenEvents.unload: canceling existing access token timers');
    this._accessTokenExpiring.cancel();
    this._accessTokenExpired.cancel();
  }

  addAccessTokenExpiring(cb: EventCallback): void {
    this._accessTokenExpiring.addHandler(cb);
  }
  removeAccessTokenExpiring(cb: EventCallback): void {
    this._accessTokenExpiring.removeHandler(cb);
  }

  addAccessTokenExpired(cb: EventCallback): void {
    this._accessTokenExpired.addHandler(cb);
  }
  removeAccessTokenExpired(cb: EventCallback): void {
    this._accessTokenExpired.removeHandler(cb);
  }
}

//=============================================================================
// UserManagerEvents - User manager event system (extends AccessTokenEvents)
//=============================================================================

export class UserManagerEvents extends AccessTokenEvents {
  private _userLoaded: Event;
  private _userUnloaded: Event;
  private _silentRenewError: Event;
  private _userSignedIn: Event;
  private _userSignedOut: Event;
  private _userSessionChanged: Event;

  constructor(settings: AccessTokenEventsOptions) {
    super(settings);
    this._userLoaded = new Event('User loaded');
    this._userUnloaded = new Event('User unloaded');
    this._silentRenewError = new Event('Silent renew error');
    this._userSignedIn = new Event('User signed in');
    this._userSignedOut = new Event('User signed out');
    this._userSessionChanged = new Event('User session changed');
  }

  load(user: TokenContainer, raiseEvent: boolean = true): void {
    Log.debug('UserManagerEvents.load');
    super.load(user);
    if (raiseEvent) {
      this._userLoaded.raise(user);
    }
  }

  unload(): void {
    Log.debug('UserManagerEvents.unload');
    super.unload();
    this._userUnloaded.raise();
  }

  addUserLoaded(cb: EventCallback): void {
    this._userLoaded.addHandler(cb);
  }
  removeUserLoaded(cb: EventCallback): void {
    this._userLoaded.removeHandler(cb);
  }

  addUserUnloaded(cb: EventCallback): void {
    this._userUnloaded.addHandler(cb);
  }
  removeUserUnloaded(cb: EventCallback): void {
    this._userUnloaded.removeHandler(cb);
  }

  addSilentRenewError(cb: EventCallback): void {
    this._silentRenewError.addHandler(cb);
  }
  removeSilentRenewError(cb: EventCallback): void {
    this._silentRenewError.removeHandler(cb);
  }
  _raiseSilentRenewError(e: Error): void {
    Log.debug('UserManagerEvents._raiseSilentRenewError', e.message);
    this._silentRenewError.raise(e);
  }

  addUserSignedIn(cb: EventCallback): void {
    this._userSignedIn.addHandler(cb);
  }
  removeUserSignedIn(cb: EventCallback): void {
    this._userSignedIn.removeHandler(cb);
  }
  _raiseUserSignedIn(): void {
    Log.debug('UserManagerEvents._raiseUserSignedIn');
    this._userSignedIn.raise();
  }

  addUserSignedOut(cb: EventCallback): void {
    this._userSignedOut.addHandler(cb);
  }
  removeUserSignedOut(cb: EventCallback): void {
    this._userSignedOut.removeHandler(cb);
  }
  _raiseUserSignedOut(): void {
    Log.debug('UserManagerEvents._raiseUserSignedOut');
    this._userSignedOut.raise();
  }

  addUserSessionChanged(cb: EventCallback): void {
    this._userSessionChanged.addHandler(cb);
  }
  removeUserSessionChanged(cb: EventCallback): void {
    this._userSessionChanged.removeHandler(cb);
  }
  _raiseUserSessionChanged(): void {
    Log.debug('UserManagerEvents._raiseUserSessionChanged');
    this._userSessionChanged.raise();
  }
}
