// Import OIDC Client Library
// In production, use: import { UserManager } from 'oidc-client';
// For local testing: adjust path to your linked package
import { UserManager } from '../../index.js';

//=============================================================================
// Configuration
//=============================================================================

const config = {
  // Identity Provider Configuration
  authority: 'https://your-idp.com',
  client_id: 'your-client-id',

  // Redirect URIs
  redirect_uri: `${window.location.origin}/callback.html`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  silent_redirect_uri: `${window.location.origin}/silent-renew.html`,

  // OAuth/OIDC Settings
  response_type: 'code',
  scope: 'openid profile email',

  // Token Management
  automaticSilentRenew: true,
  accessTokenExpiringNotificationTime: 60,

  // Session Monitoring
  monitorSession: true,
  checkSessionInterval: 2000,

  // Security
  filterProtocolClaims: true,
  loadUserInfo: true,
};

//=============================================================================
// User Manager Instance
//=============================================================================

const userManager = new UserManager(config);

//=============================================================================
// State Management
//=============================================================================

let currentUser = null;
let currentPage = 'home';

//=============================================================================
// Auth Event Handlers
//=============================================================================

function setupAuthEvents() {
  userManager.events.addUserLoaded((user) => {
    console.log('User loaded:', user);
    currentUser = user;
    renderAuthButton();
    updatePageContent();
  });

  userManager.events.addUserUnloaded(() => {
    console.log('User unloaded');
    currentUser = null;
    renderAuthButton();
    updatePageContent();
  });

  userManager.events.addAccessTokenExpiring(() => {
    console.log('Access token expiring...');
    showNotification('Your session will expire soon', 'warning');
  });

  userManager.events.addAccessTokenExpired(() => {
    console.log('Access token expired');
    showNotification('Your session has expired. Please sign in again.', 'error');
    currentUser = null;
    renderAuthButton();
  });

  userManager.events.addSilentRenewError((error) => {
    console.error('Silent renew error:', error);
    showNotification('Failed to refresh session. Please sign in again.', 'error');
  });
}

//=============================================================================
// Authentication Functions
//=============================================================================

async function login() {
  try {
    await userManager.signinRedirect();
  } catch (error) {
    console.error('Login error:', error);
    showNotification('Login failed: ' + error.message, 'error');
  }
}

async function logout() {
  try {
    await userManager.signoutRedirect();
  } catch (error) {
    console.error('Logout error:', error);
    showNotification('Logout failed: ' + error.message, 'error');
  }
}

async function checkAuth() {
  try {
    currentUser = await userManager.getUser();
    return currentUser && !currentUser.expired;
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
}

//=============================================================================
// UI Rendering Functions
//=============================================================================

function renderAuthButton() {
  const container = document.getElementById('auth-container');

  if (currentUser && !currentUser.expired) {
    // Show user menu
    const template = document.getElementById('user-menu-template');
    const clone = template.content.cloneNode(true);

    clone.querySelector('.user-name').textContent =
      currentUser.profile.name || currentUser.profile.email || 'User';

    clone.querySelector('.logout-btn').addEventListener('click', logout);

    container.innerHTML = '';
    container.appendChild(clone);
  } else {
    // Show login button
    const template = document.getElementById('login-button-template');
    const clone = template.content.cloneNode(true);

    clone.querySelector('button').addEventListener('click', login);

    container.innerHTML = '';
    container.appendChild(clone);
  }
}

function renderHomePage() {
  const template = document.getElementById('home-template');
  const clone = template.content.cloneNode(true);
  return clone;
}

function renderProfilePage() {
  const template = document.getElementById('profile-template');
  const clone = template.content.cloneNode(true);

  const contentDiv = clone.querySelector('#profile-content');

  if (!currentUser) {
    contentDiv.innerHTML = `
      <div class="card">
        <p>Please sign in to view your profile.</p>
        <button class="btn btn-primary" onclick="login()">Sign In</button>
      </div>
    `;
  } else {
    contentDiv.innerHTML = `
      <div class="card">
        <h3>Basic Information</h3>
        <dl>
          <dt>Name:</dt>
          <dd>${currentUser.profile.name || 'N/A'}</dd>

          <dt>Email:</dt>
          <dd>${currentUser.profile.email || 'N/A'}</dd>

          <dt>Username:</dt>
          <dd>${currentUser.profile.preferred_username || 'N/A'}</dd>

          <dt>Subject:</dt>
          <dd>${currentUser.profile.sub || 'N/A'}</dd>
        </dl>
      </div>

      <div class="card">
        <h3>Token Information</h3>
        <dl>
          <dt>Token Type:</dt>
          <dd>${currentUser.token_type}</dd>

          <dt>Expires At:</dt>
          <dd>${new Date(currentUser.expires_at * 1000).toLocaleString()}</dd>

          <dt>Scopes:</dt>
          <dd>${currentUser.scope}</dd>

          <dt>Access Token (first 50 chars):</dt>
          <dd><code>${currentUser.access_token.substring(0, 50)}...</code></dd>
        </dl>
      </div>

      <div class="card">
        <h3>All Claims</h3>
        <pre>${JSON.stringify(currentUser.profile, null, 2)}</pre>
      </div>
    `;
  }

  return clone;
}

function renderApiTestPage() {
  const template = document.getElementById('api-test-template');
  const clone = template.content.cloneNode(true);

  // Setup API test button
  setTimeout(() => {
    const testBtn = document.getElementById('test-api-btn');
    if (testBtn) {
      testBtn.addEventListener('click', handleApiTest);
    }
  }, 0);

  return clone;
}

function updatePageContent() {
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = '';

  let content;
  switch (currentPage) {
    case 'home':
      content = renderHomePage();
      break;
    case 'profile':
      content = renderProfilePage();
      break;
    case 'api-test':
      content = renderApiTestPage();
      break;
    default:
      content = renderHomePage();
  }

  mainContent.appendChild(content);
}

//=============================================================================
// Navigation
//=============================================================================

function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      // Update active state
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Update page
      currentPage = link.dataset.page;
      updatePageContent();
    });
  });

  // Handle hash navigation
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.substring(1);
    if (hash) {
      currentPage = hash;
      navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.page === hash);
      });
      updatePageContent();
    }
  });
}

//=============================================================================
// API Testing
//=============================================================================

async function handleApiTest() {
  const urlInput = document.getElementById('api-url');
  const methodSelect = document.getElementById('http-method');
  const responseDiv = document.getElementById('api-response');
  const headersDiv = document.getElementById('response-headers');
  const bodyDiv = document.getElementById('response-body');

  if (!currentUser) {
    showNotification('Please sign in to test API calls', 'error');
    return;
  }

  const url = urlInput.value;
  const method = methodSelect.value;

  try {
    const response = await fetchWithAuth(url, { method });

    // Display headers
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    headersDiv.innerHTML = `
      <h4>Headers</h4>
      <pre>${JSON.stringify(headers, null, 2)}</pre>
    `;

    // Display body
    const contentType = response.headers.get('content-type');
    let body;

    if (contentType && contentType.includes('application/json')) {
      body = await response.json();
      bodyDiv.innerHTML = `
        <h4>Body</h4>
        <pre>${JSON.stringify(body, null, 2)}</pre>
      `;
    } else {
      body = await response.text();
      bodyDiv.innerHTML = `
        <h4>Body</h4>
        <pre>${body}</pre>
      `;
    }

    responseDiv.style.display = 'block';
    showNotification('API request successful', 'success');

  } catch (error) {
    console.error('API test error:', error);
    bodyDiv.innerHTML = `
      <h4>Error</h4>
      <pre class="error">${error.message}</pre>
    `;
    responseDiv.style.display = 'block';
    showNotification('API request failed: ' + error.message, 'error');
  }
}

async function fetchWithAuth(url, options = {}) {
  if (!currentUser || currentUser.expired) {
    throw new Error('Not authenticated');
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${currentUser.access_token}`,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response;
}

//=============================================================================
// Notifications
//=============================================================================

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

//=============================================================================
// Initialization
//=============================================================================

async function init() {
  console.log('Initializing app...');

  setupAuthEvents();
  setupNavigation();

  const isAuthenticated = await checkAuth();
  console.log('Is authenticated:', isAuthenticated);

  renderAuthButton();
  updatePageContent();

  // Handle initial hash
  const hash = window.location.hash.substring(1);
  if (hash) {
    currentPage = hash;
    document.querySelector(`[data-page="${hash}"]`)?.classList.add('active');
    document.querySelector('[data-page="home"]')?.classList.remove('active');
  }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for debugging
window.userManager = userManager;
window.login = login;
window.logout = logout;
