# OIDC Client

OpenID Connect (OIDC) and OAuth 2.0 client library for JavaScript applications.

## Project Structure

This project has been refactored to follow domain-driven design principles, consolidating 43 source files into 18 organized modules:

```
src/
├── auth/           # Authentication & authorization core
│   ├── Client.js   # OidcClient + UserManager
│   ├── Settings.js # OidcClientSettings + UserManagerSettings (composition pattern)
│   ├── Events.js   # Event system (Event, AccessTokenEvents, UserManagerEvents)
│   └── Session.js  # State management (State, SigninState, SessionMonitor, SilentRenewService)
│
├── protocol/       # OIDC protocol implementation
│   ├── Requests.js          # SigninRequest + SignoutRequest
│   ├── Responses.js         # SigninResponse + SignoutResponse + ErrorResponse
│   ├── ResponseValidator.js # Response validation
│   └── TokenService.js      # TokenClient + TokenRevocationClient + UserInfoService
│
├── navigation/     # Browser navigation strategies
│   └── Navigator.js # All navigators (Redirect, Popup, IFrame, Cordova)
│
├── storage/        # Client-side storage
│   └── Storage.js  # WebStorageStateStore + InMemoryWebStorage
│
├── crypto/         # Cryptographic operations
│   └── Crypto.js   # JoseUtil + generateRandom (factory pattern)
│
├── services/       # Infrastructure services
│   ├── Http.js     # UrlUtility + JsonService + MetadataService
│   └── Timer.js    # Timer + ClockService
│
├── models/         # Domain models
│   └── User.js     # User model
│
├── types/          # Type definitions
│   ├── index.d.ts  # TypeScript definitions
│   └── jsdoc.js    # JSDoc definitions
│
└── utils/          # Utilities
    ├── Log.js      # Logging
    └── Global.js   # Global object access
```

## Architecture Highlights

### Composition over Inheritance
The codebase uses **composition instead of inheritance** for better maintainability:
- `UserManagerSettings` contains an `OidcClientSettings` instance and delegates properties via getters
- This prevents deep inheritance chains and makes dependencies explicit

### Domain-Driven Organization
Files are organized by domain responsibility:
- **auth/** - Core authentication functionality
- **protocol/** - OIDC/OAuth protocol implementation
- **navigation/** - Browser navigation patterns
- **storage/** - Persistence layer
- **crypto/** - Security operations
- **services/** - Infrastructure concerns
- **models/** - Business entities
- **types/** - Type safety
- **utils/** - Common utilities

### Factory Pattern for Crypto
The crypto layer uses factory functions to support multiple implementations:
```javascript
export function getJoseUtil({ jws, KeyUtil, ... }) {
  return class JoseUtil { ... }
}
```

## Usage

### Basic Example
```javascript
import { UserManager } from './index.js';

const config = {
  authority: 'https://your-authority.com',
  client_id: 'your-client-id',
  redirect_uri: 'https://your-app.com/callback',
  response_type: 'code',
  scope: 'openid profile',
};

const userManager = new UserManager(config);

// Sign in
await userManager.signinRedirect();

// Handle callback
const user = await userManager.signinRedirectCallback();

// Get current user
const currentUser = await userManager.getUser();
```

### TypeScript Support
TypeScript definitions are available in `src/types/index.d.ts`:
```typescript
import { UserManager, UserManagerSettings } from 'oidc-client';

const settings: UserManagerSettings = {
  authority: 'https://your-authority.com',
  client_id: 'your-client-id',
  // ...
};
```

### JSDoc Type Hints
JSDoc definitions in `src/types/jsdoc.js` provide IntelliSense in editors:
```javascript
/**
 * @type {import('./src/types/jsdoc.js').UserManagerSettingsConfig}
 */
const config = { ... };
```

## Key Features

- **OpenID Connect & OAuth 2.0** - Full protocol support
- **Multiple Flow Types** - Authorization Code, Implicit, Hybrid
- **PKCE Support** - Proof Key for Code Exchange
- **Silent Renew** - Automatic token refresh
- **Session Management** - OP iframe monitoring
- **Popup & Redirect** - Flexible authentication UX
- **Cordova Support** - Mobile app integration
- **TypeScript** - Full type definitions
- **Modular Architecture** - Clean separation of concerns

## Exports

All public APIs are exported from the root `index.js`:

```javascript
// Auth
export { OidcClient, UserManager }
export { OidcClientSettings, UserManagerSettings }
export { AccessTokenEvents }
export { SessionMonitor }

// Protocol
export { TokenRevocationClient }

// Navigation
export { CheckSessionIFrame }
export { CordovaPopupNavigator, CordovaIFrameNavigator }

// Storage
export { WebStorageStateStore, InMemoryWebStorage }

// Services
export { MetadataService }

// Models
export { User }

// Utils
export { Log, Global }

// Version
export { Version }
```

## Migration from Previous Versions

If you're upgrading from the pre-consolidation version, update your imports:

**Before:**
```javascript
import { UserManager } from './src/UserManager.js';
import { OidcClientSettings } from './src/OidcClientSettings.js';
```

**After:**
```javascript
import { UserManager, OidcClientSettings } from './index.js';
// or
import { UserManager } from './src/auth/Client.js';
import { OidcClientSettings } from './src/auth/Settings.js';
```

All exports remain backward compatible.

## Benefits of Consolidation

- **62% reduction** in file count (43 → 18 files)
- **Improved discoverability** - Related code is co-located
- **Better IDE navigation** - Fewer files to search through
- **Clearer dependencies** - Import paths reflect architecture
- **Easier maintenance** - Domain boundaries are explicit
- **Type safety** - Full TypeScript and JSDoc support

## Testing

Comprehensive test suite with 100+ tests using Vitest:

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

**Test Coverage:**
- All 18 consolidated modules
- Composition pattern validation (Settings layer)
- Event system hierarchy
- Import path verification
- State serialization

See [tests/README.md](tests/README.md) and [TEST_SUITE_SUMMARY.md](TEST_SUITE_SUMMARY.md) for details.

## License

Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

Copyright (c) Callis Ezenwaka. All rights reserved.
