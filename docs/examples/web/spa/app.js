// When installed from npm: import { UserManager } from 'oidc-auth-client'
// For this example (within repo, after npm run build at repo root):
import { UserManager } from '../../../../dist/index.js';
import { AUTHORITY, CLIENT_ID } from './config.js';

// ─── Configuration ────────────────────────────────────────────────────────────

const userManager = new UserManager({
  authority: AUTHORITY,
  client_id: CLIENT_ID,
  redirect_uri: `${window.location.origin}/callback.html`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  silent_redirect_uri: `${window.location.origin}/silent-renew.html`,
  response_type: 'code',
  scope: 'openid profile email',
  automaticSilentRenew: true,   // Step 4: silent renewal runs automatically
});

// ─── Auth flow ────────────────────────────────────────────────────────────────

// Step 1: Login
async function login() {
  await userManager.signinRedirect();
}

// Step 5: Logout
async function logout() {
  await userManager.signoutRedirect();
}

// Step 3: Use token to call a protected API endpoint
async function callApi() {
  const user = await userManager.getUser();
  if (!user || user.expired) return;

  const res = await fetch('http://localhost:4000/api/me', {
    headers: { Authorization: `Bearer ${user.access_token}` },
  });

  const data = await res.json();
  document.getElementById('api-result').textContent = JSON.stringify(data, null, 2);
}

// ─── UI ───────────────────────────────────────────────────────────────────────

async function render() {
  const user = await userManager.getUser();
  const authenticated = !!user && !user.expired;

  document.getElementById('login-btn').hidden = authenticated;
  document.getElementById('logout-btn').hidden = !authenticated;
  document.getElementById('guest-section').hidden = authenticated;
  document.getElementById('user-section').hidden = !authenticated;

  if (authenticated) {
    document.getElementById('user-name').textContent = user.profile.name ?? '';
    document.getElementById('user-email').textContent = user.profile.email ?? '';
    document.getElementById('user-sub').textContent = user.profile.sub ?? '';
  }
}

// ─── Events (Step 4: react to silent renewal outcomes) ────────────────────────

userManager.events.addUserLoaded(() => render());
userManager.events.addUserUnloaded(() => render());
userManager.events.addSilentRenewError((err) => console.error('Silent renew error:', err));

// ─── Bootstrap ────────────────────────────────────────────────────────────────

document.getElementById('login-btn').addEventListener('click', login);
document.getElementById('logout-btn').addEventListener('click', logout);
document.getElementById('call-api-btn').addEventListener('click', callApi);

render();
