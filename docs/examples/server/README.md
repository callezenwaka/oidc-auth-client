# Server Examples

Backend resource servers that validate JWTs issued by an OIDC provider.
Same 5 endpoints, three runtimes — pick whichever matches your stack.

## Startup order

```
1. provider/ory-hydra/   — start the IdP first
2. server/node/          — (or fastapi/ or go/) start the resource server
3. web/react/            — (or vue/ or spa/) start the browser app
```

## Servers

| Runtime  | Directory   | Port | Command          |
|----------|-------------|------|------------------|
| Node.js  | `node/`     | 4000 | `npm start`      |
| FastAPI  | `fastapi/`  | 4000 | `uv run uvicorn main:app --port 4000` |
| Go       | `go/`       | 4000 | `go run main.go` |

All three expose the same endpoints:

| Method | Path            | Auth     | Guard               |
|--------|-----------------|----------|---------------------|
| GET    | /api/public     | none     | —                   |
| GET    | /api/me         | required | returns token claims|
| GET    | /api/protected  | required | scope: `read:data`  |
| POST   | /api/data       | required | scope: `write:data` |
| GET    | /api/admin      | required | role: `admin`       |

## Environment variables

Each server reads the same variables:

```bash
AUTHORITY=http://localhost:4444   # OIDC provider base URL
AUDIENCE=your-client-id           # Expected token audience
PORT=4000                         # Port to listen on (default: 4000)
```
