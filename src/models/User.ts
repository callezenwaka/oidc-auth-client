// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import { Log } from '../utils/Log.js';
import type { UserProfile } from '../types/user.js';

export interface UserData {
  id_token?: string;
  session_state?: string | null;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  profile?: UserProfile;
  expires_at?: number;
  state?: unknown;
}

export class User {
  id_token: string;
  session_state: string | null;
  access_token: string;
  refresh_token: string;
  token_type: string;
  scope: string;
  profile: UserProfile;
  expires_at: number | undefined;
  state: unknown;

  constructor({
    id_token = '',
    session_state = null,
    access_token = '',
    refresh_token = '',
    token_type = '',
    scope = '',
    profile = { sub: '' },
    expires_at,
    state,
  }: UserData) {
    this.id_token = id_token;
    this.session_state = session_state;
    this.access_token = access_token;
    this.refresh_token = refresh_token;
    this.token_type = token_type;
    this.scope = scope;
    this.profile = profile;
    this.expires_at = expires_at;
    this.state = state;
  }

  get expires_in(): number | undefined {
    if (this.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      return this.expires_at - now;
    }
    return undefined;
  }
  set expires_in(value: number | string | undefined) {
    const expires_in = parseInt(String(value));
    if (typeof expires_in === 'number' && expires_in > 0) {
      const now = Math.floor(Date.now() / 1000);
      this.expires_at = now + expires_in;
    }
  }

  get expired(): boolean | undefined {
    const expires_in = this.expires_in;
    if (expires_in !== undefined) {
      return expires_in <= 0;
    }
    return undefined;
  }

  get scopes(): string[] {
    return (this.scope || '').split(' ');
  }

  toStorageString(): string {
    Log.debug('User.toStorageString');
    return JSON.stringify({
      id_token: this.id_token,
      session_state: this.session_state,
      access_token: this.access_token,
      refresh_token: this.refresh_token,
      token_type: this.token_type,
      scope: this.scope,
      profile: this.profile,
      expires_at: this.expires_at,
    });
  }

  static fromStorageString(storageString: string): User {
    Log.debug('User.fromStorageString');
    return new User(JSON.parse(storageString));
  }
}
