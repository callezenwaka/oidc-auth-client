# Node.js OIDC Resource Server

Express server that validates JWTs issued by an OIDC provider using JWKS.

## Setup

```bash
npm install
```

## Configuration

Set environment variables before starting:

| Variable    | Description                        | Default                  |
|-------------|------------------------------------|--------------------------|
| `AUTHORITY` | OIDC provider base URL             | `https://your-idp.com`   |
| `AUDIENCE`  | Expected token audience (client_id)| `your-client-id`         |
| `PORT`      | Port to listen on                  | `4000`                   |

## Run

```bash
AUTHORITY=http://localhost:4444 AUDIENCE=my-app npm start
```

## Endpoints

| Method | Path            | Auth     | Guard              |
|--------|-----------------|----------|--------------------|
| GET    | /api/public     | none     | —                  |
| GET    | /api/me         | required | returns claims     |
| GET    | /api/protected  | required | scope: `read:data` |
| POST   | /api/data       | required | scope: `write:data`|
| GET    | /api/admin      | required | role: `admin`      |
