# Advanced Features

Advanced OIDC Client features and implementation patterns.

## Table of Contents

1. [Popup Login](#popup-login)
2. [Silent Authentication](#silent-authentication)
3. [Session Monitoring](#session-monitoring)
4. [Multiple Identity Providers](#multiple-identity-providers)
5. [Custom State Management](#custom-state-management)
6. [Token Introspection](#token-introspection)
7. [Logout Strategies](#logout-strategies)
8. [Cross-Tab Synchronization](#cross-tab-synchronization)

---

## 1. Popup Login

Login without leaving the current page using a popup window.

```javascript
import { userManager } from './auth/config';

// Popup login
async function loginWithPopup() {
  try {
    const user = await userManager.signinPopup();
    console.log('Logged in:', user);
    return user;
  } catch (error) {
    console.error('Popup login failed:', error);
    throw error;
  }
}

// Popup logout
async function logoutWithPopup() {
  try {
    await userManager.signoutPopup();
    console.log('Logged out');
  } catch (error) {
    console.error('Popup logout failed:', error);
    throw error;
  }
}

// Configure popup window features
const config = {
  // ... other settings
  popupWindowFeatures: 'location=no,toolbar=no,width=500,height=600,left=100,top=100',
  popupWindowTarget: '_blank',
  popup_redirect_uri: 'http://localhost:3000/popup-callback.html',
  popup_post_logout_redirect_uri: 'http://localhost:3000/popup-signout.html',
};
```

**popup-callback.html:**
```html
<!DOCTYPE html>
<html>
<head><title>Popup Callback</title></head>
<body>
  <script type="module">
    import { UserManager } from 'oidc-client';
    new UserManager({ response_type: 'code' })
      .signinPopupCallback()
      .catch(err => console.error(err));
  </script>
</body>
</html>
```

---

## 2. Silent Authentication

Authenticate users without interaction (e.g., session check, auto-login).

```javascript
// Check if user can be silently authenticated
async function checkSilentAuth() {
  try {
    const user = await userManager.signinSilent();
    console.log('Silent auth successful:', user);
    return user;
  } catch (error) {
    console.log('Silent auth failed:', error);
    return null;
  }
}

// Query session status
async function checkSessionStatus() {
  try {
    const status = await userManager.querySessionStatus();
    console.log('Session status:', status);
    return status;
  } catch (error) {
    console.error('Session status check failed:', error);
    return null;
  }
}

// Configuration for silent auth
const config = {
  // ... other settings

  silent_redirect_uri: 'http://localhost:3000/silent-renew.html',
  automaticSilentRenew: true,
  accessTokenExpiringNotificationTime: 60,  // seconds before expiry

  // Silent renew error handling
  silentRequestTimeout: 10000,  // 10 seconds
};

// Listen for silent renew events
userManager.events.addAccessTokenExpiring(() => {
  console.log('Token expiring, attempting silent renew...');
});

userManager.events.addSilentRenewError((error) => {
  console.error('Silent renew failed:', error);
  // Optionally force re-login
  // userManager.signinRedirect();
});
```

---

## 3. Session Monitoring

Monitor authentication state across browser tabs.

```javascript
// Enable session monitoring
const config = {
  // ... other settings
  monitorSession: true,
  monitorAnonymousSession: false,
  checkSessionInterval: 2000,  // check every 2 seconds
  stopCheckSessionOnError: true,
};

// Listen for session changes
userManager.events.addUserSessionChanged(() => {
  console.log('Session changed in another tab');

  // Re-check user state
  userManager.getUser().then(user => {
    if (!user) {
      console.log('User logged out in another tab');
      // Update UI to reflect logged-out state
      window.location.href = '/';
    } else {
      console.log('User state updated from another tab');
      // Update UI with new user state
    }
  });
});

userManager.events.addUserSignedOut(() => {
  console.log('User signed out (possibly in another tab)');
  // Redirect to login or home
  window.location.href = '/';
});

// Manual session check
async function checkSession() {
  try {
    await userManager.querySessionStatus();
    return true;
  } catch (error) {
    console.log('Session check failed:', error);
    return false;
  }
}
```

---

## 4. Multiple Identity Providers

Support login with multiple IdPs (e.g., corporate + social logins).

```javascript
// Define configurations for each provider
const providers = {
  corporate: {
    authority: 'https://corporate-idp.example.com',
    client_id: 'corporate-client',
    extraQueryParams: {
      kc_idp_hint: 'corporate',  // Keycloak example
    },
  },
  google: {
    authority: 'https://accounts.google.com',
    client_id: 'google-client-id',
  },
  microsoft: {
    authority: 'https://login.microsoftonline.com/common/v2.0',
    client_id: 'microsoft-client-id',
  },
};

// Create UserManager for specific provider
function createUserManager(providerId) {
  const providerConfig = providers[providerId];

  return new UserManager({
    ...providerConfig,
    redirect_uri: 'http://localhost:3000/callback',
    response_type: 'code',
    scope: 'openid profile email',
  });
}

// Login with specific provider
async function loginWith(providerId) {
  const userManager = createUserManager(providerId);

  // Store provider ID for callback handling
  sessionStorage.setItem('auth_provider', providerId);

  await userManager.signinRedirect();
}

// Handle callback (in callback page)
async function handleCallback() {
  const providerId = sessionStorage.getItem('auth_provider');
  const userManager = createUserManager(providerId);

  const user = await userManager.signinRedirectCallback();
  sessionStorage.removeItem('auth_provider');

  return user;
}

// UI Example
function LoginPage() {
  return (
    <div>
      <button onClick={() => loginWith('corporate')}>
        Login with Corporate Account
      </button>
      <button onClick={() => loginWith('google')}>
        Login with Google
      </button>
      <button onClick={() => loginWith('microsoft')}>
        Login with Microsoft
      </button>
    </div>
  );
}
```

---

## 5. Custom State Management

Pass custom state through the authentication flow.

```javascript
// Login with custom state
async function loginWithState(customData) {
  const state = {
    returnUrl: window.location.pathname,
    customData: customData,
    timestamp: Date.now(),
  };

  await userManager.signinRedirect({
    state: state,
  });
}

// Retrieve state in callback
async function handleCallback() {
  const user = await userManager.signinRedirectCallback();

  if (user.state) {
    console.log('Custom state:', user.state);

    // Redirect to original page
    const returnUrl = user.state.returnUrl || '/';
    window.location.href = returnUrl;
  }

  return user;
}

// Example: Save shopping cart before login
async function loginToCheckout(cartItems) {
  await loginWithState({
    action: 'checkout',
    cartItems: cartItems,
  });
}

// In callback, restore cart
async function handleCallback() {
  const user = await userManager.signinRedirectCallback();

  if (user.state?.action === 'checkout') {
    // Restore cart and proceed to checkout
    restoreCart(user.state.cartItems);
    window.location.href = '/checkout';
  }
}
```

---

## 6. Token Introspection

Inspect and validate tokens.

```javascript
// Parse access token (client-side - for debugging only)
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return null;
  }
}

// Get token claims
async function getTokenClaims() {
  const user = await userManager.getUser();

  if (!user) return null;

  return {
    profile: user.profile,
    scopes: user.scope?.split(' '),
    expiresAt: new Date(user.expires_at * 1000),
    issuedAt: new Date((user.expires_at - user.expires_in) * 1000),
    tokenType: user.token_type,
  };
}

// Check specific claim
async function hasRole(role) {
  const user = await userManager.getUser();
  const roles = user?.profile?.roles || [];
  return roles.includes(role);
}

// Check token expiration
async function getTokenExpiry() {
  const user = await userManager.getUser();

  if (!user) return null;

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = user.expires_at - now;

  return {
    expiresAt: new Date(user.expires_at * 1000),
    expiresInSeconds: expiresIn,
    isExpired: expiresIn <= 0,
    isExpiringSoon: expiresIn <= 60,
  };
}

// React hook for token monitoring
function useTokenExpiry() {
  const [expiry, setExpiry] = useState(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const expiryInfo = await getTokenExpiry();
      setExpiry(expiryInfo);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return expiry;
}
```

---

## 7. Logout Strategies

Different logout approaches for various scenarios.

```javascript
// 1. Local logout only (doesn't inform IdP)
async function localLogout() {
  await userManager.removeUser();
  window.location.href = '/';
}

// 2. Full logout with IdP redirect
async function fullLogout() {
  await userManager.signoutRedirect();
}

// 3. Popup logout
async function popupLogout() {
  await userManager.signoutPopup();
}

// 4. Silent logout
async function silentLogout() {
  try {
    await userManager.signoutSilent();
  } catch (error) {
    console.error('Silent logout failed:', error);
    // Fallback to local logout
    await localLogout();
  }
}

// 5. Logout with token revocation
async function logoutWithRevocation() {
  const user = await userManager.getUser();

  if (user?.access_token) {
    try {
      // Call token revocation endpoint
      await revokeToken(user.access_token);
    } catch (error) {
      console.error('Token revocation failed:', error);
    }
  }

  await userManager.signoutRedirect();
}

// Token revocation helper
async function revokeToken(token) {
  const response = await fetch('https://your-idp.com/oauth2/revoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      token: token,
      token_type_hint: 'access_token',
      client_id: 'your-client-id',
    }),
  });

  if (!response.ok) {
    throw new Error('Token revocation failed');
  }
}

// Configuration for revocation
const config = {
  // ... other settings
  revokeAccessTokenOnSignout: true,
  revoke_tokens_on_signout: true,
};
```

---

## 8. Cross-Tab Synchronization

Synchronize auth state across browser tabs using BroadcastChannel or localStorage.

```javascript
// Using BroadcastChannel (modern browsers)
class AuthSync {
  constructor(userManager) {
    this.userManager = userManager;
    this.channel = new BroadcastChannel('auth-sync');

    // Listen for messages from other tabs
    this.channel.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    // Listen for local auth events
    this.setupAuthListeners();
  }

  setupAuthListeners() {
    this.userManager.events.addUserLoaded((user) => {
      this.broadcast({ type: 'user-loaded', user });
    });

    this.userManager.events.addUserUnloaded(() => {
      this.broadcast({ type: 'user-unloaded' });
    });
  }

  broadcast(message) {
    this.channel.postMessage(message);
  }

  handleMessage(message) {
    switch (message.type) {
      case 'user-loaded':
        console.log('User logged in another tab');
        window.location.reload();
        break;

      case 'user-unloaded':
        console.log('User logged out in another tab');
        this.userManager.removeUser();
        window.location.href = '/';
        break;
    }
  }

  close() {
    this.channel.close();
  }
}

// Usage
const authSync = new AuthSync(userManager);

// Cleanup on unmount
window.addEventListener('beforeunload', () => {
  authSync.close();
});

// Alternative: Using localStorage events (older browsers)
class AuthSyncLegacy {
  constructor(userManager) {
    this.userManager = userManager;
    this.storageKey = 'auth-sync';

    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  broadcast(message) {
    localStorage.setItem(this.storageKey, JSON.stringify({
      ...message,
      timestamp: Date.now(),
    }));
  }

  handleStorageChange(event) {
    if (event.key === this.storageKey && event.newValue) {
      const message = JSON.parse(event.newValue);

      // Handle message (same as BroadcastChannel)
      switch (message.type) {
        case 'user-loaded':
          window.location.reload();
          break;
        case 'user-unloaded':
          this.userManager.removeUser();
          window.location.href = '/';
          break;
      }
    }
  }
}
```

---

## Best Practices

1. **Popup Blockers**: Always initiate popup actions from user gestures (clicks)
2. **Silent Auth**: Test silent authentication in different browsers
3. **Session Monitoring**: Balance check interval with performance
4. **Multi-IdP**: Store provider hint to maintain consistency
5. **Custom State**: Don't store sensitive data in state
6. **Token Introspection**: Never rely solely on client-side validation
7. **Logout**: Choose logout strategy based on security requirements
8. **Cross-Tab**: Use BroadcastChannel when possible for better performance
