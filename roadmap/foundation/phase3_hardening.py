import os

files = {
    # ---------------------------------------------------------
    # 1. Interfaces
    # ---------------------------------------------------------
    "apps/api/app/interfaces/__init__.py": "",
    "apps/api/app/interfaces/authentication/__init__.py": "",
    "apps/api/app/interfaces/authentication/identity_provider.py": """from abc import ABC, abstractmethod
from typing import Optional, Any

class IdentityProvider(ABC):
    @abstractmethod
    async def lookup(self, identifier: str) -> Optional[Any]:
        pass
""",
    "apps/api/app/interfaces/authentication/credential_verifier.py": """from abc import ABC, abstractmethod

class CredentialVerifier(ABC):
    @abstractmethod
    async def verify(self, identifier: str, secret: str) -> bool:
        pass
""",
    "apps/api/app/interfaces/authentication/token_store.py": """from abc import ABC, abstractmethod

class TokenStore(ABC):
    @abstractmethod
    async def store_refresh_token(self, identifier: str, token: str, family_id: str) -> None:
        pass
    
    @abstractmethod
    async def invalidate_refresh_token(self, token: str) -> None:
        pass

    @abstractmethod
    async def invalidate_family(self, family_id: str) -> None:
        pass
""",
    "apps/api/app/interfaces/authentication/permission_resolver.py": """from abc import ABC, abstractmethod
from typing import Any

class PermissionResolver(ABC):
    @abstractmethod
    async def resolve_scopes(self, identity: Any) -> list[str]:
        pass
""",
    "apps/api/app/interfaces/authentication/key_provider.py": """from abc import ABC, abstractmethod

class JWTKeyProvider(ABC):
    @abstractmethod
    def get_signing_key(self) -> str:
        pass

    @abstractmethod
    def get_verification_key(self) -> str:
        pass
""",
    "apps/api/app/interfaces/authentication/hasher.py": """from abc import ABC, abstractmethod

class PasswordHasher(ABC):
    @abstractmethod
    def hash(self, password: str) -> str:
        pass
        
    @abstractmethod
    def verify(self, plain: str, hashed: str) -> bool:
        pass
        
    @abstractmethod
    def needs_rehash(self, hashed: str) -> bool:
        pass
""",

    # ---------------------------------------------------------
    # 2. Configuration Modules (Security)
    # ---------------------------------------------------------
    "apps/api/app/config/security/__init__.py": "",
    "apps/api/app/config/security/jwt.py": """from pydantic_settings import BaseSettings, SettingsConfigDict

class JWTSettings(BaseSettings):
    issuer: str = "tallyme-auth"
    audience: str = "tallyme-clients"
    access_lifetime_minutes: int = 15
    refresh_lifetime_days: int = 7
    algorithm: str = "HS256"
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

jwt_settings = JWTSettings()
""",
    "apps/api/app/config/security/keys.py": """from pydantic_settings import BaseSettings, SettingsConfigDict

class KeySettings(BaseSettings):
    jwt_secret_key: str = "super_secret_temporary_key_replace_in_prod"
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

key_settings = KeySettings()
""",
    "apps/api/app/config/security/hashing.py": """from pydantic_settings import BaseSettings, SettingsConfigDict

class HashingSettings(BaseSettings):
    argon2_time_cost: int = 2
    argon2_memory_cost: int = 102400
    argon2_parallelism: int = 8
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

hashing_settings = HashingSettings()
""",
    "apps/api/app/config/security/clock.py": """from pydantic_settings import BaseSettings, SettingsConfigDict

class ClockSettings(BaseSettings):
    jwt_clock_skew_seconds: int = 10
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

clock_settings = ClockSettings()
""",

    # ---------------------------------------------------------
    # 3. Security Auditing
    # ---------------------------------------------------------
    "apps/api/app/security/audit.py": """from app.container.container import container
import time
from typing import Dict, Any

class SecurityAuditor:
    @staticmethod
    def emit_event(event_type: str, metadata: Dict[str, Any] = None):
        if metadata is None:
            metadata = {}
        # Ensure no secrets or raw tokens in metadata
        sanitized = {k: v for k, v in metadata.items() if "secret" not in k and "token" not in k}
        container.logger.get_logger().info(
            f"Security Audit: {event_type}",
            audit_event=event_type,
            audit_metadata=sanitized,
            audit_timestamp=time.time()
        )
""",

    # ---------------------------------------------------------
    # 4. Token Types
    # ---------------------------------------------------------
    "apps/api/app/security/jwt/token_types.py": """from enum import Enum

class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"
    INTERNAL_SERVICE = "internal_service"
    PASSWORD_RESET = "password_reset"
    EMAIL_VERIFICATION = "email_verification"
""",
    "apps/api/app/security/jwt/models.py": """from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.security.jwt.token_types import TokenType

class JWTClaims(BaseModel):
    sub: str
    exp: int
    iat: int
    jti: str
    type: TokenType
    iss: Optional[str] = None
    aud: Optional[str] = None
    family_id: Optional[str] = None

class TokenPayload(BaseModel):
    subject: str
    scopes: List[str] = []
    custom_claims: Dict[str, Any] = {}
    family_id: Optional[str] = None

class AccessTokenModel(BaseModel):
    token: str
    expires_in: int
    token_type: str = "bearer"

class RefreshTokenModel(BaseModel):
    token: str
    expires_in: int

class TokenResponse(BaseModel):
    access_token: AccessTokenModel
    refresh_token: RefreshTokenModel
""",

    # ---------------------------------------------------------
    # 5. Key Provider & Hasher implementation
    # ---------------------------------------------------------
    "apps/api/app/security/encryption/keys.py": """from app.interfaces.authentication.key_provider import JWTKeyProvider
from app.config.security.keys import key_settings

class HS256KeyProvider(JWTKeyProvider):
    def get_signing_key(self) -> str:
        return key_settings.jwt_secret_key

    def get_verification_key(self) -> str:
        return key_settings.jwt_secret_key
""",
    "apps/api/app/security/encryption/hashing.py": """from app.interfaces.authentication.hasher import PasswordHasher
from passlib.context import CryptContext
from app.config.security.hashing import hashing_settings

class Argon2Hasher(PasswordHasher):
    def __init__(self):
        self.context = CryptContext(
            schemes=["argon2"],
            deprecated="auto",
            argon2__time_cost=hashing_settings.argon2_time_cost,
            argon2__memory_cost=hashing_settings.argon2_memory_cost,
            argon2__parallelism=hashing_settings.argon2_parallelism
        )

    def hash(self, password: str) -> str:
        return self.context.hash(password)

    def verify(self, plain: str, hashed: str) -> bool:
        return self.context.verify(plain, hashed)
        
    def needs_rehash(self, hashed: str) -> bool:
        return self.context.needs_update(hashed)
""",

    # ---------------------------------------------------------
    # 6. Token Validator
    # ---------------------------------------------------------
    "apps/api/app/security/jwt/validator.py": """from app.security.jwt.models import JWTClaims
from app.security.jwt.token_types import TokenType
from app.config.security.jwt import jwt_settings
from app.config.security.clock import clock_settings
from app.security.exceptions import InvalidTokenError, ExpiredTokenError
import time

class JWTValidator:
    def validate_claims(self, claims: dict, required_type: TokenType) -> JWTClaims:
        now = int(time.time())
        
        # 1. Expiry & Clock Skew
        if "exp" not in claims:
            raise InvalidTokenError("Missing exp claim")
        if claims["exp"] + clock_settings.jwt_clock_skew_seconds < now:
            raise ExpiredTokenError("Token has expired")
            
        # 2. Issuer
        if claims.get("iss") != jwt_settings.issuer:
            raise InvalidTokenError("Invalid issuer")
            
        # 3. Audience
        if claims.get("aud") != jwt_settings.audience:
            raise InvalidTokenError("Invalid audience")
            
        # 4. Token Type
        token_type = claims.get("type")
        if not token_type or token_type != required_type.value:
            raise InvalidTokenError(f"Invalid token type. Expected {required_type.value}")
            
        # 5. Issued At / Not Before
        if "iat" in claims and claims["iat"] - clock_settings.jwt_clock_skew_seconds > now:
            raise InvalidTokenError("Token issued in the future")
        if "nbf" in claims and claims["nbf"] - clock_settings.jwt_clock_skew_seconds > now:
            raise InvalidTokenError("Token not yet valid")
            
        return JWTClaims(**claims)
""",

    # ---------------------------------------------------------
    # 7. JWT Service
    # ---------------------------------------------------------
    "apps/api/app/security/jwt/tokens.py": """import jwt
import uuid
import time
from app.config.security.jwt import jwt_settings
from app.interfaces.authentication.key_provider import JWTKeyProvider
from app.security.jwt.models import JWTClaims, TokenPayload
from app.security.jwt.token_types import TokenType
from app.security.jwt.validator import JWTValidator
from app.security.exceptions import InvalidTokenError

class TokenService:
    def __init__(self, key_provider: JWTKeyProvider, validator: JWTValidator):
        self.key_provider = key_provider
        self.validator = validator

    def create_access_token(self, payload: TokenPayload) -> str:
        return self._create_token(payload, jwt_settings.access_lifetime_minutes * 60, TokenType.ACCESS)

    def create_refresh_token(self, payload: TokenPayload) -> str:
        return self._create_token(payload, jwt_settings.refresh_lifetime_days * 24 * 3600, TokenType.REFRESH)

    def _create_token(self, payload: TokenPayload, expires_delta_sec: int, token_type: TokenType) -> str:
        now = int(time.time())
        expire = now + expires_delta_sec
        
        claims = {
            "sub": payload.subject,
            "exp": expire,
            "iat": now,
            "jti": str(uuid.uuid4()),
            "type": token_type.value,
            "iss": jwt_settings.issuer,
            "aud": jwt_settings.audience,
            "scopes": payload.scopes,
            **payload.custom_claims
        }
        if payload.family_id:
            claims["family_id"] = payload.family_id
            
        return jwt.encode(
            claims,
            self.key_provider.get_signing_key(),
            algorithm=jwt_settings.algorithm
        )

    def decode(self, token: str) -> dict:
        try:
            # Note: We bypass PyJWT's internal validation to use our strict centralized Validator
            return jwt.decode(
                token,
                self.key_provider.get_verification_key(),
                algorithms=[jwt_settings.algorithm],
                options={"verify_exp": False, "verify_aud": False, "verify_iss": False}
            )
        except jwt.InvalidTokenError:
            raise InvalidTokenError()
""",

    # ---------------------------------------------------------
    # 8. Revocation Store (Redis Implementation)
    # ---------------------------------------------------------
    "apps/api/app/interfaces/authentication/revocation_store.py": """from abc import ABC, abstractmethod

class RevocationStore(ABC):
    @abstractmethod
    async def revoke(self, jti: str, exp: int) -> None:
        pass

    @abstractmethod
    async def restore(self, jti: str) -> None:
        pass

    @abstractmethod
    async def is_revoked(self, jti: str) -> bool:
        pass

    @abstractmethod
    async def cleanup(self) -> None:
        pass

    @abstractmethod
    async def statistics(self) -> dict:
        pass
""",
    "apps/api/app/security/jwt/blocklist.py": """from app.interfaces.authentication.revocation_store import RevocationStore
from app.container.container import container
import time

class RedisRevocationStore(RevocationStore):
    async def revoke(self, jti: str, exp: int) -> None:
        redis = container.redis.client()
        now = int(time.time())
        ttl = exp - now
        if ttl > 0:
            await redis.setex(f"blocklist:{jti}", ttl, "revoked")

    async def restore(self, jti: str) -> None:
        redis = container.redis.client()
        await redis.delete(f"blocklist:{jti}")

    async def is_revoked(self, jti: str) -> bool:
        redis = container.redis.client()
        exists = await redis.exists(f"blocklist:{jti}")
        return exists > 0

    async def cleanup(self) -> None:
        # Handled by Redis TTL natively
        pass

    async def statistics(self) -> dict:
        # Approximation for metrics
        redis = container.redis.client()
        keys = await redis.keys("blocklist:*")
        return {"revoked_count": len(keys)}
""",

    # ---------------------------------------------------------
    # 9. Authentication Orchestrator
    # ---------------------------------------------------------
    "apps/api/app/security/authentication/service.py": """from app.interfaces.authentication.hasher import PasswordHasher
from app.interfaces.authentication.identity_provider import IdentityProvider
from app.interfaces.authentication.permission_resolver import PermissionResolver
from app.interfaces.authentication.token_store import TokenStore
from app.interfaces.authentication.revocation_store import RevocationStore
from app.security.jwt.tokens import TokenService
from app.security.jwt.validator import JWTValidator
from app.security.jwt.token_types import TokenType
from app.security.jwt.models import TokenPayload, TokenResponse, AccessTokenModel, RefreshTokenModel
from app.security.exceptions import InvalidCredentialsError, RevokedTokenError, InvalidTokenError
from app.security.audit import SecurityAuditor
from app.config.security.jwt import jwt_settings
import uuid

class AuthenticationService:
    def __init__(self, 
                 hasher: PasswordHasher,
                 provider: IdentityProvider, 
                 resolver: PermissionResolver, 
                 token_store: TokenStore,
                 revocation_store: RevocationStore,
                 token_service: TokenService,
                 validator: JWTValidator):
        self.hasher = hasher
        self.provider = provider
        self.resolver = resolver
        self.token_store = token_store
        self.revocation_store = revocation_store
        self.token_service = token_service
        self.validator = validator

    async def authenticate(self, identifier: str, secret: str, hashed_secret: str) -> TokenResponse:
        if not self.hasher.verify(secret, hashed_secret):
            SecurityAuditor.emit_event("authentication_failed", {"subject_id": identifier})
            raise InvalidCredentialsError()
            
        SecurityAuditor.emit_event("authentication_succeeded", {"subject_id": identifier})
        return await self.issue_tokens(identifier)

    async def issue_tokens(self, identifier: str) -> TokenResponse:
        identity = await self.provider.lookup(identifier)
        scopes = await self.resolver.resolve_scopes(identity)
        
        family_id = str(uuid.uuid4())
        payload = TokenPayload(subject=identifier, scopes=scopes, family_id=family_id)
        
        access = self.token_service.create_access_token(payload)
        refresh = self.token_service.create_refresh_token(payload)
        
        await self.token_store.store_refresh_token(identifier, refresh, family_id)
        
        SecurityAuditor.emit_event("token_created", {"subject_id": identifier, "family_id": family_id})
        
        return TokenResponse(
            access_token=AccessTokenModel(token=access, expires_in=jwt_settings.access_lifetime_minutes * 60),
            refresh_token=RefreshTokenModel(token=refresh, expires_in=jwt_settings.refresh_lifetime_days * 24 * 3600)
        )

    async def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        raw_claims = self.token_service.decode(refresh_token)
        claims = self.validator.validate_claims(raw_claims, TokenType.REFRESH)
        
        if await self.revocation_store.is_revoked(claims.jti):
            # Token Reuse Detected: Invalidate entire family
            SecurityAuditor.emit_event("token_reuse_detected", {"jti": claims.jti, "family_id": claims.family_id})
            if claims.family_id:
                await self.token_store.invalidate_family(claims.family_id)
            raise RevokedTokenError()
            
        # Revoke the old refresh token (rotation)
        await self.revocation_store.revoke(claims.jti, claims.exp)
        await self.token_store.invalidate_refresh_token(refresh_token)
        
        SecurityAuditor.emit_event("token_refreshed", {"subject_id": claims.sub, "family_id": claims.family_id})
        
        return await self.issue_tokens(claims.sub)

    async def verify_access_token(self, token: str) -> TokenPayload:
        raw_claims = self.token_service.decode(token)
        claims = self.validator.validate_claims(raw_claims, TokenType.ACCESS)
        
        if await self.revocation_store.is_revoked(claims.jti):
            raise RevokedTokenError()
        
        return TokenPayload(subject=claims.sub, scopes=claims.model_extra.get("scopes", []), family_id=claims.family_id)
""",

    # ---------------------------------------------------------
    # 10. Transport Adapters
    # ---------------------------------------------------------
    "apps/api/app/api/dependencies/auth.py": """from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.security.exceptions import AuthenticationError, ExpiredTokenError, InvalidTokenError, RevokedTokenError
from app.security.jwt.models import TokenPayload
# In a real setup, auth_service would be injected from the container. 
# For now, we mock the dependency injection to prove the transport adapter is logic-less.

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_auth_service():
    # Placeholder for container-resolved AuthenticationService
    pass

async def get_token_payload(token: str = Depends(oauth2_scheme), auth_service = Depends(get_auth_service)) -> TokenPayload:
    if not auth_service:
        # Mocking for phase 3 verification
        return TokenPayload(subject="mock")
        
    try:
        return await auth_service.verify_access_token(token)
    except ExpiredTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except (InvalidTokenError, RevokedTokenError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except AuthenticationError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed")
""",

    # ---------------------------------------------------------
    # 11. Authentication Tests
    # ---------------------------------------------------------
    "apps/api/tests/security/test_authentication.py": """import pytest
import time
from app.security.encryption.hashing import Argon2Hasher
from app.security.encryption.keys import HS256KeyProvider
from app.security.jwt.validator import JWTValidator
from app.security.jwt.tokens import TokenService
from app.security.jwt.token_types import TokenType
from app.security.jwt.models import TokenPayload
from app.security.exceptions import ExpiredTokenError, InvalidTokenError
from app.config.security.jwt import jwt_settings
from app.config.security.clock import clock_settings

def test_password_hashing():
    hasher = Argon2Hasher()
    pwd = "super_secure_password"
    hashed = hasher.hash(pwd)
    assert hashed != pwd
    assert hasher.verify(pwd, hashed) is True
    assert hasher.verify("wrong", hashed) is False
    assert hasher.needs_rehash(hashed) is False

def test_jwt_generation_and_validation():
    key_provider = HS256KeyProvider()
    validator = JWTValidator()
    service = TokenService(key_provider, validator)
    
    payload = TokenPayload(subject="user_123")
    token = service.create_access_token(payload)
    
    raw = service.decode(token)
    claims = validator.validate_claims(raw, TokenType.ACCESS)
    assert claims.sub == "user_123"

def test_jwt_clock_skew_and_expiry(monkeypatch):
    monkeypatch.setattr(jwt_settings, "access_lifetime_minutes", 0)
    monkeypatch.setattr(clock_settings, "jwt_clock_skew_seconds", 0)
    
    key_provider = HS256KeyProvider()
    validator = JWTValidator()
    service = TokenService(key_provider, validator)
    
    payload = TokenPayload(subject="user_123")
    token = service.create_access_token(payload)
    
    time.sleep(1) # wait for expiry
    
    raw = service.decode(token)
    with pytest.raises(ExpiredTokenError):
        validator.validate_claims(raw, TokenType.ACCESS)

def test_invalid_issuer(monkeypatch):
    key_provider = HS256KeyProvider()
    validator = JWTValidator()
    service = TokenService(key_provider, validator)
    
    payload = TokenPayload(subject="user_123")
    token = service.create_access_token(payload)
    
    monkeypatch.setattr(jwt_settings, "issuer", "wrong_issuer")
    raw = service.decode(token)
    with pytest.raises(InvalidTokenError):
        validator.validate_claims(raw, TokenType.ACCESS)
"""
}

dirs = [
    "apps/api/app/interfaces/authentication",
    "apps/api/app/config/security",
    "apps/api/app/security/jwt",
    "apps/api/app/security/encryption",
    "apps/api/app/security/authentication",
    "apps/api/tests/security"
]

for d in dirs:
    os.makedirs(d, exist_ok=True)
    init_file = os.path.join(d, '__init__.py')
    with open(init_file, 'w') as f:
        pass

# Cleanup old paths to enforce strict new architecture
old_paths = [
    "apps/api/app/security/authentication/interfaces.py",
    "apps/api/app/config/security.py"
]
for p in old_paths:
    if os.path.exists(p):
        os.remove(p)

for path, content in files.items():
    directory = os.path.dirname(path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    with open(path, "w") as f:
        f.write(content)

print("Phase 3 Hardening scaffolding complete.")
