/**
 * Simple Login and Consent UI for Ory Hydra
 *
 * This is a minimal implementation for development/testing.
 * In production, you should build a proper UI with user management.
 */

const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HYDRA_ADMIN_URL = process.env.HYDRA_ADMIN_URL || 'http://localhost:4445';

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Mock user database (in production, use a real database)
const users = {
  'admin@example.com': {
    email: 'admin@example.com',
    password: 'admin',
    name: 'Admin User',
    given_name: 'Admin',
    family_name: 'User'
  },
  'user@example.com': {
    email: 'user@example.com',
    password: 'user',
    name: 'Demo User',
    given_name: 'Demo',
    family_name: 'User'
  }
};

// Login endpoint
app.get('/login', async (req, res) => {
  const loginChallenge = req.query.login_challenge;

  if (!loginChallenge) {
    return res.status(400).send('Missing login_challenge');
  }

  try {
    // Get login request information from Hydra
    const response = await axios.get(`${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/login`, {
      params: { login_challenge: loginChallenge }
    });

    const loginRequest = response.data;

    // If user is already authenticated (session exists), accept the login
    if (loginRequest.skip) {
      const acceptResponse = await axios.put(
        `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/login/accept`,
        {
          subject: loginRequest.subject,
          remember: true,
          remember_for: 3600
        },
        { params: { login_challenge: loginChallenge } }
      );

      return res.redirect(acceptResponse.data.redirect_to);
    }

    // Render login form
    res.render('login', {
      loginChallenge,
      error: null,
      client: loginRequest.client,
      requestedScope: loginRequest.requested_scope
    });

  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    res.status(500).send('Login request failed');
  }
});

// Login form submission
app.post('/login', async (req, res) => {
  const { email, password, login_challenge, remember } = req.body;

  if (!login_challenge) {
    return res.status(400).send('Missing login_challenge');
  }

  // Validate credentials (in production, use proper authentication)
  const user = users[email];
  if (!user || user.password !== password) {
    try {
      const response = await axios.get(`${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/login`, {
        params: { login_challenge }
      });

      return res.render('login', {
        loginChallenge: login_challenge,
        error: 'Invalid email or password',
        client: response.data.client,
        requestedScope: response.data.requested_scope
      });
    } catch (error) {
      return res.status(500).send('Authentication failed');
    }
  }

  try {
    // Accept the login request
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
          family_name: user.family_name
        }
      },
      { params: { login_challenge } }
    );

    // Redirect to consent screen
    res.redirect(acceptResponse.data.redirect_to);

  } catch (error) {
    console.error('Login acceptance error:', error.response?.data || error.message);
    res.status(500).send('Login acceptance failed');
  }
});

// Consent endpoint
app.get('/consent', async (req, res) => {
  const consentChallenge = req.query.consent_challenge;

  if (!consentChallenge) {
    return res.status(400).send('Missing consent_challenge');
  }

  try {
    // Get consent request information from Hydra
    const response = await axios.get(`${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/consent`, {
      params: { consent_challenge: consentChallenge }
    });

    const consentRequest = response.data;

    // If consent was previously granted, skip the consent screen
    if (consentRequest.skip) {
      const acceptResponse = await axios.put(
        `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/consent/accept`,
        {
          grant_scope: consentRequest.requested_scope,
          grant_access_token_audience: consentRequest.requested_access_token_audience,
          session: {
            id_token: consentRequest.context
          }
        },
        { params: { consent_challenge: consentChallenge } }
      );

      return res.redirect(acceptResponse.data.redirect_to);
    }

    // Render consent form
    res.render('consent', {
      consentChallenge,
      client: consentRequest.client,
      requestedScope: consentRequest.requested_scope,
      subject: consentRequest.subject
    });

  } catch (error) {
    console.error('Consent error:', error.response?.data || error.message);
    res.status(500).send('Consent request failed');
  }
});

// Consent form submission
app.post('/consent', async (req, res) => {
  const { consent_challenge, grant_scope, remember } = req.body;

  if (!consent_challenge) {
    return res.status(400).send('Missing consent_challenge');
  }

  try {
    // Get consent request to access context
    const consentResponse = await axios.get(`${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/consent`, {
      params: { consent_challenge }
    });

    const grantedScopes = Array.isArray(grant_scope) ? grant_scope : [grant_scope];

    // Accept the consent request
    const acceptResponse = await axios.put(
      `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/consent/accept`,
      {
        grant_scope: grantedScopes,
        remember: remember === 'on',
        remember_for: 3600,
        session: {
          id_token: consentResponse.data.context,
          access_token: consentResponse.data.context
        }
      },
      { params: { consent_challenge } }
    );

    // Redirect back to OAuth flow
    res.redirect(acceptResponse.data.redirect_to);

  } catch (error) {
    console.error('Consent acceptance error:', error.response?.data || error.message);
    res.status(500).send('Consent acceptance failed');
  }
});

// Logout endpoint
app.get('/logout', async (req, res) => {
  const logoutChallenge = req.query.logout_challenge;

  if (!logoutChallenge) {
    return res.status(400).send('Missing logout_challenge');
  }

  try {
    // Accept the logout request
    const acceptResponse = await axios.put(
      `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/logout/accept`,
      {},
      { params: { logout_challenge: logoutChallenge } }
    );

    // Redirect to post-logout page
    res.redirect(acceptResponse.data.redirect_to);

  } catch (error) {
    console.error('Logout error:', error.response?.data || error.message);
    res.status(500).send('Logout failed');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Home page with user list
app.get('/', (req, res) => {
  res.render('index', { users: Object.keys(users) });
});

// Start server
app.listen(PORT, () => {
  console.log(`Login/Consent UI running on http://localhost:${PORT}`);
  console.log(`Hydra Admin URL: ${HYDRA_ADMIN_URL}`);
  console.log('\nAvailable test users:');
  Object.keys(users).forEach(email => {
    console.log(`  - ${email} / ${users[email].password}`);
  });
});
