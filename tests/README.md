# OIDC Client Test Suite

Comprehensive test suite for the consolidated OIDC client library using Vitest.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

Tests are organized to mirror the consolidated source structure:

```
tests/
├── auth/
│   ├── Settings.test.js    # OidcClientSettings + UserManagerSettings (composition pattern)
│   ├── Events.test.js      # Event system tests
│   └── Session.test.js     # State, SigninState, SilentRenewService
│
├── protocol/
│   ├── Requests.test.js    # SigninRequest + SignoutRequest
│   └── Responses.test.js   # SigninResponse + SignoutResponse + ErrorResponse
│
├── storage/
│   └── Storage.test.js     # WebStorageStateStore + InMemoryWebStorage
│
├── crypto/
│   └── Crypto.test.js      # JoseUtil + generateRandom
│
├── services/
│   ├── Http.test.js        # UrlUtility + JsonService + MetadataService
│   └── Timer.test.js       # Timer + ClockService
│
├── models/
│   └── User.test.js        # User model
│
├── utils/
│   ├── Log.test.js         # Logging system
│   └── Global.test.js      # Global object access
│
├── imports.test.js         # Import path verification
├── setup.js                # Test setup and globals
└── README.md               # This file
```

## Test Coverage

The test suite covers:

### ✅ Unit Tests
- All consolidated modules
- Public APIs and exports
- Internal class methods
- Edge cases and error handling

### ✅ Integration Tests
- Import path consistency
- Module composition (Settings composition pattern)
- Event system integration
- State serialization/deserialization

### ✅ Import Verification
- All public API exports from index.js
- All consolidated module exports
- Import path consistency between index.js and direct imports

## Key Test Areas

### Composition Pattern (Settings)
Tests verify that `UserManagerSettings` uses composition instead of inheritance:
```javascript
// UserManagerSettings contains an OidcClientSettings instance
// and delegates properties via getters
expect(settings.client_id).toBe(oidcSettings.client_id);
```

### Event System
Tests cover the event hierarchy:
- `Event` - Base event class
- `AccessTokenEvents` - Token lifecycle events
- `UserManagerEvents extends AccessTokenEvents` - User lifecycle events

### State Management
Tests verify state serialization and storage:
- State persistence to/from storage strings
- SigninState with PKCE support
- Stale state cleanup

### Import Paths
Tests ensure backward compatibility:
- Public API available from index.js
- Direct imports from consolidated modules work
- Same class instances exported from both paths

## Writing Tests

### Test Template
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyClass } from '../src/path/to/Module.js';

describe('Module/MyClass', () => {
  let instance;

  beforeEach(() => {
    instance = new MyClass();
  });

  it('should create an instance', () => {
    expect(instance).toBeInstanceOf(MyClass);
  });

  it('should have expected behavior', () => {
    // Test implementation
  });
});
```

### Mocking
Use Vitest's built-in mocking:
```javascript
import { vi } from 'vitest';

const mockFn = vi.fn();
const spy = vi.spyOn(object, 'method');
```

### Async Tests
```javascript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe(expected);
});
```

## Coverage Goals

Target coverage metrics:
- **Lines:** >80%
- **Functions:** >80%
- **Branches:** >75%
- **Statements:** >80%

## Notes

- Tests use jsdom environment for browser globals
- Timers are mocked with `vi.useFakeTimers()` where needed
- HTTP requests are not fully tested (would require network mocking)
- Crypto implementations use the actual libraries (not mocked)
- Some integration tests may require actual OIDC server (future work)

## Future Enhancements

- [ ] Add E2E tests with real OIDC server
- [ ] Mock XMLHttpRequest/fetch for HTTP tests
- [ ] Add performance benchmarks
- [ ] Add mutation testing
- [ ] Add visual regression tests for popup/iframe navigators
