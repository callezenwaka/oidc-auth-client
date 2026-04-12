import os
import httpx
from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwk, jwt, JWTError

# ─── Config ───────────────────────────────────────────────────────────────────

AUTHORITY = os.getenv("AUTHORITY", "https://your-idp.com")
AUDIENCE  = os.getenv("AUDIENCE",  "your-client-id")

# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_headers=["*"],
    allow_methods=["*"],
)

security = HTTPBearer()

# ─── JWKS ─────────────────────────────────────────────────────────────────────

_jwks_cache: dict | None = None

async def get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{AUTHORITY}/.well-known/jwks.json")
            _jwks_cache = res.json()
    return _jwks_cache

async def get_signing_key(token: str):
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    jwks = await get_jwks()
    for key_data in jwks.get("keys", []):
        if key_data.get("kid") == kid:
            return jwk.construct(key_data)
    raise HTTPException(status_code=401, detail="Signing key not found")

# ─── Auth ─────────────────────────────────────────────────────────────────────

async def verify_token(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    token = credentials.credentials
    try:
        key = await get_signing_key(token)
        claims = jwt.decode(
            token, key,
            algorithms=["RS256"],
            audience=AUDIENCE,
            issuer=AUTHORITY,
        )
        return claims
    except JWTError as e:
        raise HTTPException(status_code=401, detail=str(e))

def check_scope(claims: dict, scope: str) -> None:
    scopes = claims.get("scope", "").split()
    if scope not in scopes:
        raise HTTPException(status_code=403, detail=f"Insufficient scope: {scope} required")

def check_role(claims: dict, role: str) -> None:
    roles = claims.get("roles", [])
    if role not in roles:
        raise HTTPException(status_code=403, detail=f"Insufficient role: {role} required")

# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/public")
def public():
    return {"message": "Public endpoint — no authentication required"}

@app.get("/api/me")
async def me(claims: dict = Depends(verify_token)):
    return {k: claims[k] for k in ("sub", "name", "email", "scope") if k in claims}

@app.get("/api/protected")
async def protected(claims: dict = Depends(verify_token)):
    check_scope(claims, "read:data")
    return {"message": "Protected data", "user": claims["sub"]}

@app.post("/api/data")
async def data(body: dict, claims: dict = Depends(verify_token)):
    check_scope(claims, "write:data")
    return {"message": "Data written", "body": body}

@app.get("/api/admin")
async def admin(claims: dict = Depends(verify_token)):
    check_role(claims, "admin")
    return {"message": "Admin data", "user": claims["sub"]}
