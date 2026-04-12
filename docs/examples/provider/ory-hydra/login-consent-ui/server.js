/**
 * Simple Login and Consent UI for Ory Hydra
 *
 * This is a minimal implementation for development/testing.
 * In production, build a proper UI with real user management.
 */

const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const HYDRA_ADMIN_URL = process.env.HYDRA_ADMIN_URL || 'http://localhost:4445';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Mock user database (in production, use a real database)
const users = {
  'admin@example.com': {
    email: 'admin@example.com',
    password: 'admin',
    name: 'Admin User',
    given_name: 'Admin',
    family_name: 'User',
  },
  'user@example.com': {
    email: 'user@example.com',
    password: 'user',
    name: 'Demo User',
    given_name: 'Demo',
    family_name: 'User',
  },
};

// --- HTML generators (replace views/*.ejs) ---

const BASE_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex; justify-content: center; align-items: center;
    min-height: 100vh; padding: 20px;
  }
  .container { background: white; border-radius: 12px; padding: 40px; max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,.3); }
  .logo { text-align: center; margin-bottom: 30px; }
  .logo h1 { color: #667eea; font-size: 28px; margin-bottom: 8px; }
  .logo p { color: #666; font-size: 14px; }
  .client-info { background: #f7f9fc; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #667eea; }
  .client-info h3 { font-size: 14px; color: #333; margin-bottom: 4px; }
  .client-info p { font-size: 12px; color: #666; }
  .form-group { margin-bottom: 20px; }
  label { display: block; margin-bottom: 8px; color: #333; font-weight: 500; font-size: 14px; }
  input[type="email"], input[type="password"] { width: 100%; padding: 12px; border: 2px solid #e1e8ed; border-radius: 6px; font-size: 14px; transition: border-color .3s; }
  input[type="email"]:focus, input[type="password"]:focus { outline: none; border-color: #667eea; }
  .checkbox-group { display: flex; align-items: center; margin-bottom: 24px; }
  input[type="checkbox"] { margin-right: 8px; }
  .checkbox-group label { margin: 0; font-weight: normal; font-size: 14px; }
  .btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform .2s; }
  .btn:hover { transform: translateY(-2px); }
  .error { background: #fee; border: 1px solid #fcc; color: #c33; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 14px; }
  .test-users { margin-top: 24px; padding-top: 24px; border-top: 1px solid #e1e8ed; }
  .test-users h4 { font-size: 12px; color: #666; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .5px; }
  .test-users code { display: block; background: #f7f9fc; padding: 8px; border-radius: 4px; font-size: 12px; margin-bottom: 4px; color: #333; }
`;

function loginPage({ loginChallenge, error, client }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign In</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>Sign In</h1>
      <p>Ory Hydra OAuth 2.0</p>
    </div>

    ${client ? `
    <div class="client-info">
      <h3>Application requesting access:</h3>
      <p><strong>${client.client_name || client.client_id}</strong></p>
    </div>` : ''}

    ${error ? `<div class="error">${error}</div>` : ''}

    <form method="POST" action="/login">
      <input type="hidden" name="login_challenge" value="${loginChallenge}">

      <div class="form-group">
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" placeholder="user@example.com" required autofocus>
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" placeholder="Enter your password" required>
      </div>

      <div class="checkbox-group">
        <input type="checkbox" id="remember" name="remember">
        <label for="remember">Remember me</label>
      </div>

      <button type="submit" class="btn">Sign In</button>

      <div class="test-users">
        <h4>Test Credentials (Dev Only)</h4>
        <code>admin@example.com / admin</code>
        <code>user@example.com / user</code>
      </div>
    </form>
  </div>
</body>
</html>`;
}

const SCOPE_LABELS = {
  openid:         { label: 'OpenID Connect',               desc: 'Required for authentication' },
  profile:        { label: 'Access your profile information', desc: 'Name, profile picture, and other profile data' },
  email:          { label: 'Access your email address',    desc: 'Your email address' },
  offline_access: { label: 'Refresh access tokens',        desc: "Stay signed in even when you're not using the app" },
};

function consentPage({ consentChallenge, client, requestedScope, subject }) {
  const scopeItems = requestedScope.map(scope => {
    const { label, desc } = SCOPE_LABELS[scope] || { label: scope, desc: '' };
    return `
      <li class="scope-item">
        <input type="checkbox" id="scope-${scope}" name="grant_scope" value="${scope}" checked>
        <label for="scope-${scope}">
          <strong>${label}</strong>
          ${desc ? `<div class="scope-desc">${desc}</div>` : ''}
        </label>
      </li>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grant Access</title>
  <style>
    ${BASE_STYLES}
    .container { max-width: 450px; }
    .client-name { font-size: 18px; font-weight: 600; color: #667eea; margin-bottom: 12px; }
    .user-info { font-size: 13px; color: #666; padding: 8px 0; border-top: 1px solid #e1e8ed; margin-top: 8px; }
    .permissions { margin-bottom: 24px; }
    .permissions h4 { font-size: 14px; color: #333; margin-bottom: 12px; font-weight: 600; }
    .scope-list { list-style: none; }
    .scope-item { display: flex; align-items: center; padding: 12px; background: #f7f9fc; border-radius: 6px; margin-bottom: 8px; border: 2px solid #e1e8ed; }
    .scope-item input[type="checkbox"] { margin-right: 12px; cursor: pointer; flex-shrink: 0; }
    .scope-item label { cursor: pointer; font-size: 14px; color: #333; }
    .scope-desc { font-size: 12px; color: #666; margin-top: 4px; }
    .remember-box { display: flex; align-items: center; margin-bottom: 24px; padding: 12px; background: #fff9e6; border-radius: 6px; border: 1px solid #ffe066; }
    .remember-box label { margin: 0; font-size: 13px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>Grant Access</h1>
      <p>Application Permission Request</p>
    </div>

    <div class="client-info">
      <h3>Application:</h3>
      <div class="client-name">${client.client_name || client.client_id}</div>
      <p>is requesting access to your account</p>
      ${subject ? `<div class="user-info">Signed in as: <strong>${subject}</strong></div>` : ''}
    </div>

    <form method="POST" action="/consent">
      <input type="hidden" name="consent_challenge" value="${consentChallenge}">

      <div class="permissions">
        <h4>This application will be able to:</h4>
        <ul class="scope-list">${scopeItems}</ul>
      </div>

      <div class="remember-box">
        <input type="checkbox" id="remember" name="remember" checked>
        <label for="remember">Remember this decision and don't ask again</label>
      </div>

      <button type="submit" class="btn">Grant Access</button>
    </form>
  </div>
</body>
</html>`;
}

function indexPage({ users }) {
  const userItems = users.map(email => `
      <div class="user-item">
        <code>${email}</code>
        <code>password: ${email.split('@')[0]}</code>
      </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ory Hydra Login/Consent UI</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; min-height: 100vh; }
    .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,.3); }
    h1 { color: #667eea; margin-bottom: 12px; font-size: 32px; }
    .subtitle { color: #666; margin-bottom: 32px; font-size: 16px; }
    .status { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
    h2 { color: #333; margin: 32px 0 16px; font-size: 20px; border-bottom: 2px solid #667eea; padding-bottom: 8px; }
    .user-list { background: #f7f9fc; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .user-list h3 { font-size: 14px; color: #666; margin-bottom: 12px; text-transform: uppercase; letter-spacing: .5px; }
    .user-item { background: white; padding: 12px 16px; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #e1e8ed; }
    .user-item code { font-size: 14px; color: #333; }
    .info-box { background: #fff9e6; border: 1px solid #ffe066; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .info-box h3 { font-size: 16px; color: #856404; margin-bottom: 12px; }
    .info-box p { font-size: 14px; color: #856404; line-height: 1.6; margin-bottom: 8px; }
    .endpoint-list { list-style: none; }
    .endpoint-item { background: #f7f9fc; padding: 12px 16px; border-radius: 6px; margin-bottom: 8px; font-family: monospace; font-size: 13px; border-left: 4px solid #667eea; }
    .method { color: #667eea; font-weight: bold; margin-right: 12px; }
    .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e1e8ed; text-align: center; color: #666; font-size: 14px; }
    a { color: #667eea; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Ory Hydra Login/Consent UI</h1>
    <p class="subtitle">Development and Testing Interface</p>

    <div class="status">
      <strong>Service is running</strong><br>
      This UI handles login and consent flows for Ory Hydra OAuth 2.0/OIDC server.
    </div>

    <div class="info-box">
      <h3>Development Mode Only</h3>
      <p>This is a simple reference implementation for testing purposes.</p>
      <p><strong>Do NOT use in production.</strong> Build a proper login/consent UI with real user authentication, password hashing, multi-factor auth, session management, and CSRF protection.</p>
    </div>

    <h2>Test User Accounts</h2>
    <div class="user-list">
      <h3>Available for testing:</h3>
      ${userItems}
    </div>

    <h2>Endpoints</h2>
    <ul class="endpoint-list">
      <li class="endpoint-item"><span class="method">GET</span> /login?login_challenge=...</li>
      <li class="endpoint-item"><span class="method">POST</span> /login</li>
      <li class="endpoint-item"><span class="method">GET</span> /consent?consent_challenge=...</li>
      <li class="endpoint-item"><span class="method">POST</span> /consent</li>
      <li class="endpoint-item"><span class="method">GET</span> /logout?logout_challenge=...</li>
      <li class="endpoint-item"><span class="method">GET</span> /health</li>
    </ul>

    <div class="footer">
      <p>Powered by <a href="https://www.ory.sh/hydra/docs/" target="_blank">Ory Hydra</a></p>
    </div>
  </div>
</body>
</html>`;
}

// --- Routes (logic unchanged — res.render replaced with res.send) ---

app.get('/login', async (req, res) => {
  const loginChallenge = req.query.login_challenge;

  if (!loginChallenge) {
    return res.status(400).send('Missing login_challenge');
  }

  try {
    const response = await axios.get(`${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/login`, {
      params: { login_challenge: loginChallenge },
    });

    const loginRequest = response.data;

    if (loginRequest.skip) {
      const acceptResponse = await axios.put(
        `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/login/accept`,
        { subject: loginRequest.subject, remember: true, remember_for: 3600 },
        { params: { login_challenge: loginChallenge } },
      );
      return res.redirect(acceptResponse.data.redirect_to);
    }

    res.send(loginPage({
      loginChallenge,
      error: null,
      client: loginRequest.client,
    }));

  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    res.status(500).send('Login request failed');
  }
});

app.post('/login', async (req, res) => {
  const { email, password, login_challenge, remember } = req.body;

  if (!login_challenge) {
    return res.status(400).send('Missing login_challenge');
  }

  const user = users[email];
  if (!user || user.password !== password) {
    try {
      const response = await axios.get(`${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/login`, {
        params: { login_challenge },
      });
      return res.send(loginPage({
        loginChallenge: login_challenge,
        error: 'Invalid email or password',
        client: response.data.client,
      }));
    } catch (error) {
      return res.status(500).send('Authentication failed');
    }
  }

  try {
    const acceptResponse = await axios.put(
      `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/login/accept`,
      {
        subject: email,
        remember: remember === 'on',
        remember_for: 3600,
        context: {
          email: user.email,
          name: user.name,
          given_name: user.given_name,
          family_name: user.family_name,
        },
      },
      { params: { login_challenge } },
    );
    res.redirect(acceptResponse.data.redirect_to);
  } catch (error) {
    console.error('Login acceptance error:', error.response?.data || error.message);
    res.status(500).send('Login acceptance failed');
  }
});

app.get('/consent', async (req, res) => {
  const consentChallenge = req.query.consent_challenge;

  if (!consentChallenge) {
    return res.status(400).send('Missing consent_challenge');
  }

  try {
    const response = await axios.get(`${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/consent`, {
      params: { consent_challenge: consentChallenge },
    });

    const consentRequest = response.data;

    if (consentRequest.skip) {
      const acceptResponse = await axios.put(
        `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/consent/accept`,
        {
          grant_scope: consentRequest.requested_scope,
          grant_access_token_audience: consentRequest.requested_access_token_audience,
          session: { id_token: consentRequest.context },
        },
        { params: { consent_challenge: consentChallenge } },
      );
      return res.redirect(acceptResponse.data.redirect_to);
    }

    res.send(consentPage({
      consentChallenge,
      client: consentRequest.client,
      requestedScope: consentRequest.requested_scope,
      subject: consentRequest.subject,
    }));

  } catch (error) {
    console.error('Consent error:', error.response?.data || error.message);
    res.status(500).send('Consent request failed');
  }
});

app.post('/consent', async (req, res) => {
  const { consent_challenge, grant_scope, remember } = req.body;

  if (!consent_challenge) {
    return res.status(400).send('Missing consent_challenge');
  }

  try {
    const consentResponse = await axios.get(`${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/consent`, {
      params: { consent_challenge },
    });

    const grantedScopes = Array.isArray(grant_scope) ? grant_scope : [grant_scope];

    const acceptResponse = await axios.put(
      `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/consent/accept`,
      {
        grant_scope: grantedScopes,
        remember: remember === 'on',
        remember_for: 3600,
        session: {
          id_token: consentResponse.data.context,
          access_token: consentResponse.data.context,
        },
      },
      { params: { consent_challenge } },
    );
    res.redirect(acceptResponse.data.redirect_to);

  } catch (error) {
    console.error('Consent acceptance error:', error.response?.data || error.message);
    res.status(500).send('Consent acceptance failed');
  }
});

app.get('/logout', async (req, res) => {
  const logoutChallenge = req.query.logout_challenge;

  if (!logoutChallenge) {
    return res.status(400).send('Missing logout_challenge');
  }

  try {
    const acceptResponse = await axios.put(
      `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/logout/accept`,
      {},
      { params: { logout_challenge: logoutChallenge } },
    );
    res.redirect(acceptResponse.data.redirect_to);
  } catch (error) {
    console.error('Logout error:', error.response?.data || error.message);
    res.status(500).send('Logout failed');
  }
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (_, res) => {
  res.send(indexPage({ users: Object.keys(users) }));
});

app.listen(PORT, () => {
  console.log(`Login/Consent UI running on http://localhost:${PORT}`);
  console.log(`Hydra Admin URL: ${HYDRA_ADMIN_URL}`);
  console.log('\nAvailable test users:');
  Object.keys(users).forEach(email => {
    console.log(`  - ${email} / ${users[email].password}`);
  });
});
