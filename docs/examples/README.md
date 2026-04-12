# Examples

Working integrations for `oidc-auth-client`, organized by domain.

## Structure

```
docs/examples/
├── web/            # Browser apps — demonstrate the full auth flow
│   ├── spa/        # Vanilla JS (no framework, no build step)
│   ├── react/      # React + TypeScript + Vite
│   └── vue/        # Vue 3 + TypeScript + Vite
├── server/         # Backend servers — validate tokens from web/ apps
│   ├── node/       # Node.js + Express
│   ├── fastapi/    # Python + FastAPI
│   └── go/         # Go + net/http
├── provider/       # Identity provider setup (Ory Hydra via Docker)
├── security/       # Security best practices
└── advanced/       # Popup, silent renew, multi-tab sync
```

---

## Running a full end-to-end demo

```bash
# 1. Start the identity provider
cd provider/ory-hydra
docker-compose up

# 2. Start a backend server
cd server/node
npm install && npm start

# 3. Build the library and start a web app
cd ../../..
npm run build
cd docs/examples/web/react
npm install && npm run dev
```

---

## web/

Each example demonstrates all 5 steps of the auth flow using `oidc-auth-client`:

| Step | Method |
|------|--------|
| 1. Login | `signinRedirect()` |
| 2. Callback | `signinRedirectCallback()` |
| 3. Use tokens | `getUser()` + Bearer header |
| 4. Silent renewal | `automaticSilentRenew: true` |
| 5. Logout | `signoutRedirect()` |

The Vite alias in each `vite.config.ts` maps `oidc-auth-client` → `../../../../dist/index.js`
so examples run against the local build without publishing to npm.

---

## server/

Each server exposes the same 5 endpoints — same feature, different runtime:

| Method | Path | Auth | Guard |
|--------|------|------|-------|
| `GET` | `/api/public` | none | — |
| `GET` | `/api/me` | required | returns token claims |
| `GET` | `/api/protected` | required | scope: `read:data` |
| `POST` | `/api/data` | required | scope: `write:data` |
| `GET` | `/api/admin` | required | role: `admin` |

---

## provider/

Identity provider setup. Start this before running any web/ or server/ example.
Currently: Ory Hydra via Docker Compose.

---

## security/

Production security guidelines: PKCE enforcement, token storage, CSP, XSS/CSRF prevention.

---

## advanced/

Less common patterns: popup login/logout, silent iframe authentication, multi-tab session sync.
