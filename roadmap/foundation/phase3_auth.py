import os
import re

files = {
    # ---------------------------------------------------------
    # 1. Password Security
    # ---------------------------------------------------------
    "apps/api/app/security/encryption/__init__.py": "",
    "apps/api/app/security/encryption/hashing.py": """from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
""",

    # ---------------------------------------------------------
    # 2. Token Models
    # ---------------------------------------------------------
    "apps/api/app/security/jwt/__init__.py": "",
    "apps/api/app/security/jwt/models.py": """from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class JWTClaims(BaseModel):
    sub: str
    exp: int
    iat: int
    jti: str
    iss: Optional[str] = None
    aud: Optional[str] = None
    type: str

class TokenPayload(BaseModel):
    subject: str
    scopes: List[str] = []
    custom_claims: Dict[str, Any] = {}

class AccessToken(BaseModel):
    token: str
    expires_in: int
    token_type: str = "bearer"

class RefreshToken(BaseModel):
    token: str
    expires_in: int

class TokenResponse(BaseModel):
    access_token: AccessToken
    refresh_token: RefreshToken

class RefreshRequest(BaseModel):
    refresh_token: str
""",

    # ---------------------------------------------------------
    # 3. JWT Configuration
    # ---------------------------------------------------------
    "apps/api/app/config/security.py": """from pydantic_settings import BaseSettings, SettingsConfigDict

class SecuritySettings(BaseSettings):
    jwt_secret_key: str = "super_secret_temporary_key_replace_in_prod"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7
    jwt_issuer: str = "tallyme-auth"
    jwt_audience: str = "tallyme-clients"
    jwt_clock_skew_seconds: int = 10
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

security_settings = SecuritySettings()
""",

    # ---------------------------------------------------------
    # 4. JWT Service
    # ---------------------------------------------------------
    "apps/api/app/security/jwt/tokens.py": """import jwt
import uuid
from datetime import datetime, timedelta, timezone
from app.config.security import security_settings
from app.security.jwt.models import JWTClaims, TokenPayload
from app.security.exceptions import InvalidTokenError, ExpiredTokenError

def create_access_token(payload: TokenPayload) -> str:
    return _create_token(payload, security_settings.jwt_access_token_expire_minutes, "access")

def create_refresh_token(payload: TokenPayload) -> str:
    return _create_token(payload, security_settings.jwt_refresh_token_expire_days * 24 * 60, "refresh")

def _create_token(payload: TokenPayload, expires_delta_minutes: int, token_type: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=expires_delta_minutes)
    
    claims = {
        "sub": payload.subject,
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "jti": str(uuid.uuid4()),
        "type": token_type,
        "iss": security_settings.jwt_issuer,
        "aud": security_settings.jwt_audience,
        "scopes": payload.scopes,
        **payload.custom_claims
    }
    
    return jwt.encode(
        claims,
        security_settings.jwt_secret_key,
        algorithm=security_settings.jwt_algorithm
    )

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            security_settings.jwt_secret_key,
            algorithms=[security_settings.jwt_algorithm],
            issuer=security_settings.jwt_issuer,
            audience=security_settings.jwt_audience,
            leeway=security_settings.jwt_clock_skew_seconds
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise ExpiredTokenError()
    except jwt.InvalidTokenError:
        raise InvalidTokenError()

def decode_token(token: str) -> JWTClaims:
    payload = verify_token(token)
    return JWTClaims(**payload)

def validate_claims(claims: JWTClaims, required_type: str = "access") -> bool:
    if claims.type != required_type:
        raise InvalidTokenError("Invalid token type")
    return True
""",

    # ---------------------------------------------------------
    # 5. Token Revocation (Blocklist)
    # ---------------------------------------------------------
    "apps/api/app/security/jwt/blocklist.py": """from app.container.container import container
from app.security.exceptions import InvalidTokenError
import time

async def revoke(jti: str, exp: int) -> None:
    redis = container.redis.client()
    now = int(time.time())
    ttl = exp - now
    if ttl > 0:
        await redis.setex(f"blocklist:{jti}", ttl, "revoked")

async def is_revoked(jti: str) -> bool:
    redis = container.redis.client()
    exists = await redis.exists(f"blocklist:{jti}")
    return exists > 0

async def cleanup() -> None:
    # Handled automatically by Redis TTL
    pass
""",

    # ---------------------------------------------------------
    # 6. Security Exceptions
    # ---------------------------------------------------------
    "apps/api/app/security/__init__.py": "",
    "apps/api/app/security/exceptions.py": """class AuthenticationError(Exception):
    pass

class InvalidTokenError(AuthenticationError):
    pass

class ExpiredTokenError(AuthenticationError):
    pass

class RevokedTokenError(AuthenticationError):
    pass

class InvalidCredentialsError(AuthenticationError):
    pass

class AuthenticationRequiredError(AuthenticationError):
    pass

class AuthorizationFailedError(AuthenticationError):
    pass
""",

    # ---------------------------------------------------------
    # 7. Identity Abstractions
    # ---------------------------------------------------------
    "apps/api/app/security/authentication/__init__.py": "",
    "apps/api/app/security/authentication/interfaces.py": """from abc import ABC, abstractmethod
from typing import Optional, Any
from app.security.jwt.models import TokenPayload

class CredentialVerifier(ABC):
    @abstractmethod
    async def verify(self, identifier: str, secret: str) -> bool:
        pass

class IdentityProvider(ABC):
    @abstractmethod
    async def lookup(self, identifier: str) -> Optional[Any]:
        pass

class PermissionResolver(ABC):
    @abstractmethod
    async def resolve_scopes(self, identity: Any) -> list[str]:
        pass

class TokenStore(ABC):
    @abstractmethod
    async def store_refresh_token(self, identifier: str, token: str) -> None:
        pass
    
    @abstractmethod
    async def invalidate_refresh_token(self, token: str) -> None:
        pass
""",

    # ---------------------------------------------------------
    # 8. Authentication Service
    # ---------------------------------------------------------
    "apps/api/app/security/authentication/service.py": """from app.security.authentication.interfaces import CredentialVerifier, IdentityProvider, PermissionResolver, TokenStore
from app.security.jwt.models import TokenPayload, TokenResponse, AccessToken, RefreshToken
from app.security.jwt.tokens import create_access_token, create_refresh_token, decode_token, validate_claims
from app.security.jwt.blocklist import revoke, is_revoked
from app.security.exceptions import InvalidCredentialsError, RevokedTokenError
from app.config.security import security_settings

class AuthenticationService:
    def __init__(self, verifier: CredentialVerifier, provider: IdentityProvider, resolver: PermissionResolver, token_store: TokenStore):
        self.verifier = verifier
        self.provider = provider
        self.resolver = resolver
        self.token_store = token_store

    async def authenticate(self, identifier: str, secret: str) -> TokenResponse:
        is_valid = await self.verifier.verify(identifier, secret)
        if not is_valid:
            raise InvalidCredentialsError()
        return await self.issue_tokens(identifier)

    async def issue_tokens(self, identifier: str) -> TokenResponse:
        identity = await self.provider.lookup(identifier)
        scopes = await self.resolver.resolve_scopes(identity)
        
        payload = TokenPayload(subject=identifier, scopes=scopes)
        access = create_access_token(payload)
        refresh = create_refresh_token(payload)
        
        await self.token_store.store_refresh_token(identifier, refresh)
        
        return TokenResponse(
            access_token=AccessToken(token=access, expires_in=security_settings.jwt_access_token_expire_minutes * 60),
            refresh_token=RefreshToken(token=refresh, expires_in=security_settings.jwt_refresh_token_expire_days * 24 * 3600)
        )

    async def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        claims = decode_token(refresh_token)
        validate_claims(claims, required_type="refresh")
        
        if await is_revoked(claims.jti):
            raise RevokedTokenError()
            
        await revoke(claims.jti, claims.exp)
        await self.token_store.invalidate_refresh_token(refresh_token)
        
        return await self.issue_tokens(claims.sub)

    async def revoke_tokens(self, access_token: str, refresh_token: str = None) -> None:
        acc_claims = decode_token(access_token)
        await revoke(acc_claims.jti, acc_claims.exp)
        
        if refresh_token:
            ref_claims = decode_token(refresh_token)
            await revoke(ref_claims.jti, ref_claims.exp)
            await self.token_store.invalidate_refresh_token(refresh_token)

    async def verify_access_token(self, token: str) -> TokenPayload:
        claims = decode_token(token)
        validate_claims(claims, required_type="access")
        if await is_revoked(claims.jti):
            raise RevokedTokenError()
        
        # We return a generic payload here. FastAPI adapter will handle injecting it.
        return TokenPayload(subject=claims.sub, scopes=claims.model_extra.get("scopes", []))
""",

    # ---------------------------------------------------------
    # 9. FastAPI Adapter
    # ---------------------------------------------------------
    "apps/api/app/api/dependencies/__init__.py": "",
    "apps/api/app/api/dependencies/auth.py": """from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.security.jwt.tokens import decode_token, validate_claims
from app.security.jwt.blocklist import is_revoked
from app.security.exceptions import AuthenticationError, ExpiredTokenError, InvalidTokenError, RevokedTokenError
from app.security.jwt.models import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_token_payload(token: str = Depends(oauth2_scheme)) -> TokenPayload:
    try:
        claims = decode_token(token)
        validate_claims(claims, required_type="access")
        
        if await is_revoked(claims.jti):
            raise RevokedTokenError()
            
        return TokenPayload(subject=claims.sub, scopes=claims.model_extra.get("scopes", []))
    except ExpiredTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired", headers={"WWW-Authenticate": "Bearer"})
    except (InvalidTokenError, RevokedTokenError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token", headers={"WWW-Authenticate": "Bearer"})
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed", headers={"WWW-Authenticate": "Bearer"})
""",

    # ---------------------------------------------------------
    # 10. Authentication Tests
    # ---------------------------------------------------------
    "apps/api/tests/security/__init__.py": "",
    "apps/api/tests/security/test_authentication.py": """import pytest
import time
from app.security.encryption.hashing import hash_password, verify_password
from app.security.jwt.tokens import create_access_token, decode_token, verify_token
from app.security.jwt.models import TokenPayload
from app.security.exceptions import ExpiredTokenError, InvalidTokenError

def test_password_hashing():
    pwd = "super_secure_password"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrong", hashed) is False

def test_jwt_generation_and_validation():
    payload = TokenPayload(subject="user_123")
    token = create_access_token(payload)
    
    claims = decode_token(token)
    assert claims.sub == "user_123"
    assert claims.type == "access"

def test_jwt_malformed():
    with pytest.raises(InvalidTokenError):
        decode_token("not.a.real.token")

@pytest.mark.asyncio
async def test_redis_blocklist():
    from app.security.jwt.blocklist import revoke, is_revoked
    from app.container.startup import startup_infrastructure
    from app.container.shutdown import shutdown_infrastructure
    
    # We must start infrastructure to connect to redis
    try:
        startup_infrastructure()
    except ValueError:
        pytest.skip("Skipping blocklist test, infrastructure configs not set")
        
    jti = "test_jti_123"
    exp = int(time.time()) + 60
    
    assert await is_revoked(jti) is False
    await revoke(jti, exp)
    assert await is_revoked(jti) is True
    
    await shutdown_infrastructure()
"""
}

dirs = [
    "apps/api/app/security",
    "apps/api/app/security/encryption",
    "apps/api/app/security/jwt",
    "apps/api/app/security/authentication",
    "apps/api/app/api/dependencies",
    "apps/api/tests/security"
]

for d in dirs:
    os.makedirs(d, exist_ok=True)
    init_file = os.path.join(d, '__init__.py')
    with open(init_file, 'w') as f:
        pass

for path, content in files.items():
    directory = os.path.dirname(path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    with open(path, "w") as f:
        f.write(content)

# Update pyproject.toml
import re
pyproject_path = "apps/api/pyproject.toml"
if os.path.exists(pyproject_path):
    with open(pyproject_path, "r") as f:
        content = f.read()
    
    if "PyJWT" not in content:
        # Add pyjwt and passlib to dependencies
        content = re.sub(r'(\s*"httpx>=0\.24\.0")', r'\1,\n    "PyJWT>=2.8.0",\n    "passlib[argon2]>=1.7.4"', content)
        with open(pyproject_path, "w") as f:
            f.write(content)

print("Phase 3 Authentication Infrastructure scaffolding complete.")
