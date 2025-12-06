// Copyright (c) Callis Ezenwaka. All rights reserved.
// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

// Utils
import {Log} from './src/utils/Log.js';
import {Global} from './src/utils/Global.js';

// Models
import {User} from './src/models/User.js';

// Storage
import {WebStorageStateStore, InMemoryWebStorage} from './src/storage/Storage.js';

// Services
import {MetadataService} from './src/services/Http.js';

// Navigation
import {
  CheckSessionIFrame,
  CordovaPopupNavigator,
  CordovaIFrameNavigator,
} from './src/navigation/Navigator.js';

// Protocol
import {TokenRevocationClient} from './src/protocol/TokenService.js';

// Auth
import {OidcClient, UserManager} from './src/auth/Client.js';
import {OidcClientSettings, UserManagerSettings} from './src/auth/Settings.js';
import {AccessTokenEvents} from './src/auth/Events.js';
import {SessionMonitor} from './src/auth/Session.js';

// Version
import {Version} from './version.js';

export {
  // Version
  Version,
  // Utils
  Log,
  Global,
  // Models
  User,
  // Storage
  WebStorageStateStore,
  InMemoryWebStorage,
  // Services
  MetadataService,
  // Navigation
  CheckSessionIFrame,
  CordovaPopupNavigator,
  CordovaIFrameNavigator,
  // Protocol
  TokenRevocationClient,
  // Auth
  OidcClient,
  UserManager,
  OidcClientSettings,
  UserManagerSettings,
  AccessTokenEvents,
  SessionMonitor,
};
