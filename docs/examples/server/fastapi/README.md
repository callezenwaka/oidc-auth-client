# FastAPI OIDC Resource Server

FastAPI server that validates JWTs issued by an OIDC provider using JWKS.

## Setup

```bash
# with uv (recommended)
uv sync

# with pip
pip install .
```

## Configuration

Set environment variables before starting:

| Variable    | Description                        | Default                  |
|-------------|------------------------------------|--------------------------|
| `AUTHORITY` | OIDC provider base URL             | `https://your-idp.com`   |
| `AUDIENCE`  | Expected token audience (client_id)| `your-client-id`         |

## Run

```bash
# with uv
AUTHORITY=http://localhost:4444 AUDIENCE=my-app uv run uvicorn main:app --port 4000 --reload

# with pip
AUTHORITY=http://localhost:4444 AUDIENCE=my-app uvicorn main:app --port 4000 --reload
```

## Endpoints

| Method | Path            | Auth     | Guard               |
|--------|-----------------|----------|---------------------|
| GET    | /api/public     | none     | —                   |
| GET    | /api/me         | required | returns claims      |
| GET    | /api/protected  | required | scope: `read:data`  |
| POST   | /api/data       | required | scope: `write:data` |
| GET    | /api/admin      | required | role: `admin`       |
