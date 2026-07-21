import os

files = {
    # ---------------------------------------------------------
    # 1. Contexts
    # ---------------------------------------------------------
    "apps/api/app/infrastructure/context/__init__.py": "",
    "apps/api/app/infrastructure/context/correlation.py": """import contextvars
from typing import Optional
import uuid

_correlation_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("correlation_id", default=None)

class CorrelationContext:
    @staticmethod
    def current() -> Optional[str]:
        return _correlation_id.get()

    @staticmethod
    def set(correlation_id: str) -> contextvars.Token:
        return _correlation_id.set(correlation_id)

    @staticmethod
    def clear(token: contextvars.Token) -> None:
        _correlation_id.reset(token)

    @staticmethod
    def initialize() -> contextvars.Token:
        return _correlation_id.set(str(uuid.uuid4()))
""",
    "apps/api/app/infrastructure/context/request.py": """from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class RequestContext:
    request_id: str
    tenant_id: Optional[str] = None
    correlation_id: Optional[str] = None
    trace_id: Optional[str] = None
    user_id: Optional[str] = None
    locale: str = "en-US"
    timezone: str = "UTC"
""",

    # ---------------------------------------------------------
    # 2. Event Bus Contracts
    # ---------------------------------------------------------
    "apps/api/app/domain/events/bus.py": """from abc import ABC, abstractmethod
from typing import Any
from app.domain.events.contracts import DomainEvent

class SynchronousEventBus(ABC):
    @abstractmethod
    def publish(self, event: DomainEvent) -> None:
        pass

class AsynchronousEventBus(ABC):
    @abstractmethod
    async def publish_async(self, event: DomainEvent) -> None:
        pass

class IntegrationEventPublisher(ABC):
    @abstractmethod
    async def publish_integration_event(self, event: Any) -> None:
        pass

class OutboxPublisher(ABC):
    @abstractmethod
    def save_to_outbox(self, event: DomainEvent) -> None:
        pass
""",

    # ---------------------------------------------------------
    # 3. Pagination Contracts
    # ---------------------------------------------------------
    "apps/api/app/domain/repositories/pagination.py": """from abc import ABC
from typing import TypeVar, Generic, List, Optional
from dataclasses import dataclass
from enum import Enum

T = TypeVar('T')

class SortDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"

@dataclass(frozen=True)
class Sort:
    field: str
    direction: SortDirection = SortDirection.ASC

@dataclass(frozen=True)
class Filter:
    field: str
    operator: str
    value: Any

@dataclass(frozen=True)
class PageRequest:
    page_number: int
    page_size: int
    sorts: List[Sort] = None
    filters: List[Filter] = None

@dataclass(frozen=True)
class CursorRequest:
    cursor: Optional[str]
    limit: int
    sorts: List[Sort] = None
    filters: List[Filter] = None

@dataclass(frozen=True)
class SpecificationPage(Generic[T]):
    specification: Any
    page_request: PageRequest

@dataclass(frozen=True)
class PageResult(Generic[T]):
    items: List[T]
    total_elements: int
    total_pages: int
    current_page: int
    has_next: bool
    has_previous: bool

@dataclass(frozen=True)
class CursorPage(Generic[T]):
    items: List[T]
    next_cursor: Optional[str]
    has_next: bool

class Page(Generic[T], ABC):
    pass
class Cursor(Generic[T], ABC):
    pass
""",

    # ---------------------------------------------------------
    # 4. Identity Contracts
    # ---------------------------------------------------------
    "apps/api/app/identity/contracts/__init__.py": """from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from datetime import datetime

class Subject(ABC):
    @property
    @abstractmethod
    def subject_id(self) -> str:
        pass

class Principal(Subject, ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

class Identity(Principal, ABC):
    @property
    @abstractmethod
    def is_authenticated(self) -> bool:
        pass

@dataclass(frozen=True)
class IdentitySnapshot:
    subject_id: str
    is_authenticated: bool
    attributes: Dict[str, Any]
    captured_at: datetime

class AuthenticationContext(ABC):
    @property
    @abstractmethod
    def current_identity(self) -> Optional[Identity]:
        pass
""",
    "apps/api/app/identity/models/__init__.py": """from dataclasses import dataclass
from typing import Optional
from app.identity.contracts import Identity

@dataclass(frozen=True)
class UserReference(Identity):
    id: str
    display_name: str
    
    @property
    def subject_id(self) -> str:
        return self.id
        
    @property
    def name(self) -> str:
        return self.display_name
        
    @property
    def is_authenticated(self) -> bool:
        return True

@dataclass(frozen=True)
class SystemUser(Identity):
    @property
    def subject_id(self) -> str:
        return "system"
        
    @property
    def name(self) -> str:
        return "System"
        
    @property
    def is_authenticated(self) -> bool:
        return True

@dataclass(frozen=True)
class AnonymousUser(Identity):
    @property
    def subject_id(self) -> str:
        return "anonymous"
        
    @property
    def name(self) -> str:
        return "Anonymous"
        
    @property
    def is_authenticated(self) -> bool:
        return False

@dataclass(frozen=True)
class ServiceAccount(Identity):
    service_id: str
    service_name: str
    
    @property
    def subject_id(self) -> str:
        return self.service_id
        
    @property
    def name(self) -> str:
        return self.service_name
        
    @property
    def is_authenticated(self) -> bool:
        return True
""",
    "apps/api/app/identity/events/__init__.py": """from dataclasses import dataclass
from app.domain.events.contracts import DomainEvent

@dataclass(frozen=True)
class IdentityAuthenticated(DomainEvent):
    subject_id: str

@dataclass(frozen=True)
class IdentityRevoked(DomainEvent):
    subject_id: str
    reason: str

@dataclass(frozen=True)
class IdentityChanged(DomainEvent):
    subject_id: str
    attribute: str
""",
    "apps/api/app/identity/contracts/cache.py": """from abc import ABC, abstractmethod
from typing import Optional
from app.identity.contracts import IdentitySnapshot

class IdentityCache(ABC):
    @abstractmethod
    async def get_identity(self, subject_id: str) -> Optional[IdentitySnapshot]:
        pass
        
    @abstractmethod
    async def set_identity(self, subject_id: str, snapshot: IdentitySnapshot, ttl_seconds: int) -> None:
        pass
""",

    # ---------------------------------------------------------
    # 5. Authorization Contracts
    # ---------------------------------------------------------
    "apps/api/app/authorization/permissions/__init__.py": """from abc import ABC, abstractmethod
from typing import List, Set
from dataclasses import dataclass
from app.identity.contracts import Identity

@dataclass(frozen=True)
class Permission:
    code: str
    description: str

@dataclass(frozen=True)
class PermissionSet:
    permissions: Set[Permission]
    
    def has_permission(self, code: str) -> bool:
        return any(p.code == code for p in self.permissions)

class PermissionEvaluator(ABC):
    @abstractmethod
    def evaluate(self, identity: Identity, required_permission: str) -> bool:
        pass

class PermissionProvider(ABC):
    @abstractmethod
    async def get_permissions(self, identity: Identity) -> PermissionSet:
        pass

class PermissionResolver(ABC):
    @abstractmethod
    async def resolve(self, identity: Identity) -> PermissionSet:
        pass
""",
    "apps/api/app/authorization/roles/__init__.py": """from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Set
from app.identity.contracts import Identity

@dataclass(frozen=True)
class RoleReference:
    id: str
    code: str

@dataclass(frozen=True)
class Role:
    reference: RoleReference
    name: str

@dataclass(frozen=True)
class RoleAssignment:
    identity_id: str
    role: RoleReference

class RoleResolver(ABC):
    @abstractmethod
    async def resolve_roles(self, identity: Identity) -> Set[Role]:
        pass

class RoleHierarchy(ABC):
    @abstractmethod
    def get_effective_roles(self, base_role: Role) -> Set[Role]:
        pass
""",
    "apps/api/app/authorization/policies/__init__.py": """from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional
from app.identity.contracts import Identity

@dataclass(frozen=True)
class AuthorizationContext:
    identity: Identity
    resource: Optional[Any] = None
    action: Optional[str] = None

@dataclass(frozen=True)
class AuthorizationDecision:
    is_allowed: bool
    reason: str = ""

@dataclass(frozen=True)
class PolicyResult:
    is_satisfied: bool
    reason: str = ""

class Policy(ABC):
    @abstractmethod
    def evaluate(self, context: AuthorizationContext) -> PolicyResult:
        pass

class PolicyEvaluator(ABC):
    @abstractmethod
    async def evaluate(self, policy: Policy, context: AuthorizationContext) -> AuthorizationDecision:
        pass
""",
    "apps/api/app/authorization/services/__init__.py": """from abc import ABC, abstractmethod
from app.authorization.policies import AuthorizationContext, AuthorizationDecision
from app.authorization.permissions import PermissionSet
from app.identity.contracts import Identity

class AuthorizationService(ABC):
    @abstractmethod
    async def authorize(self, context: AuthorizationContext) -> AuthorizationDecision:
        pass
        
    @abstractmethod
    async def check_permission(self, identity: Identity, permission_code: str) -> bool:
        pass
""",
    "apps/api/app/authorization/contracts/cache.py": """from abc import ABC, abstractmethod
from typing import Optional
from app.authorization.permissions import PermissionSet
from app.authorization.roles import Role

class PermissionCache(ABC):
    @abstractmethod
    async def get_permissions(self, subject_id: str) -> Optional[PermissionSet]: pass

class RoleCache(ABC):
    @abstractmethod
    async def get_roles(self, subject_id: str) -> Optional[list[Role]]: pass

class PolicyCache(ABC):
    @abstractmethod
    async def get_decision(self, cache_key: str) -> Optional[bool]: pass
""",
    "apps/api/app/authorization/events/__init__.py": """from dataclasses import dataclass
from app.domain.events.contracts import DomainEvent

@dataclass(frozen=True)
class PermissionGranted(DomainEvent):
    subject_id: str
    permission_code: str

@dataclass(frozen=True)
class PermissionRevoked(DomainEvent):
    subject_id: str
    permission_code: str

@dataclass(frozen=True)
class RoleAssigned(DomainEvent):
    subject_id: str
    role_code: str

@dataclass(frozen=True)
class RoleRevoked(DomainEvent):
    subject_id: str
    role_code: str
""",

    # ---------------------------------------------------------
    # 6. Session Contracts
    # ---------------------------------------------------------
    "apps/api/app/session/contracts/__init__.py": """from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass(frozen=True)
class SessionReference:
    session_id: str

@dataclass(frozen=True)
class SessionSnapshot:
    session_id: str
    subject_id: str
    started_at: datetime
    expires_at: datetime
    is_active: bool

class SessionContext(ABC):
    @property
    @abstractmethod
    def current_session(self) -> Optional[SessionSnapshot]:
        pass

class SessionProvider(ABC):
    @abstractmethod
    async def get_session(self, session_id: str) -> Optional[SessionSnapshot]:
        pass

class SessionStore(ABC):
    @abstractmethod
    async def save(self, snapshot: SessionSnapshot) -> None:
        pass
        
    @abstractmethod
    async def delete(self, session_id: str) -> None:
        pass

class SessionValidator(ABC):
    @abstractmethod
    async def is_valid(self, session_id: str) -> bool:
        pass
""",
    "apps/api/app/session/events/__init__.py": """from dataclasses import dataclass
from app.domain.events.contracts import DomainEvent

@dataclass(frozen=True)
class SessionStarted(DomainEvent):
    session_id: str
    subject_id: str

@dataclass(frozen=True)
class SessionExpired(DomainEvent):
    session_id: str
    subject_id: str
""",
    "apps/api/app/session/contracts/cache.py": """from abc import ABC, abstractmethod
from typing import Optional
from app.session.contracts import SessionSnapshot

class SessionCache(ABC):
    @abstractmethod
    async def get_session(self, session_id: str) -> Optional[SessionSnapshot]: pass
""",

    # ---------------------------------------------------------
    # TESTS
    # ---------------------------------------------------------
    "apps/api/tests/infrastructure/test_context.py": """import pytest
from app.infrastructure.context.correlation import CorrelationContext
from app.infrastructure.context.request import RequestContext

def test_correlation_context():
    token = CorrelationContext.initialize()
    cid1 = CorrelationContext.current()
    assert cid1 is not None
    
    CorrelationContext.clear(token)
    assert CorrelationContext.current() is None

def test_request_context():
    ctx = RequestContext(request_id="req-1", tenant_id="tenant-1")
    assert ctx.request_id == "req-1"
    assert ctx.tenant_id == "tenant-1"
    assert ctx.locale == "en-US"
""",
    "apps/api/tests/domain/test_pagination.py": """from app.domain.repositories.pagination import PageRequest, Sort, SortDirection, CursorRequest, PageResult

def test_page_request_creation():
    sort = Sort(field="created_at", direction=SortDirection.DESC)
    req = PageRequest(page_number=1, page_size=20, sorts=[sort])
    assert req.page_number == 1
    assert req.sorts[0].direction == "desc"

def test_page_result():
    res = PageResult(items=[1, 2, 3], total_elements=3, total_pages=1, current_page=1, has_next=False, has_previous=False)
    assert res.total_elements == 3
""",
    "apps/api/tests/identity/test_contracts.py": """from app.identity.models import AnonymousUser, SystemUser

def test_anonymous_user():
    u = AnonymousUser()
    assert u.is_authenticated is False
    assert u.subject_id == "anonymous"

def test_system_user():
    u = SystemUser()
    assert u.is_authenticated is True
    assert u.subject_id == "system"
""",
    "apps/api/tests/authorization/test_contracts.py": """from app.authorization.permissions import Permission, PermissionSet
from app.authorization.roles import Role, RoleReference
from app.authorization.policies import AuthorizationContext, AuthorizationDecision, Policy, PolicyResult
from app.identity.models import SystemUser

def test_permission_set():
    p1 = Permission("read:invoices", "Read invoices")
    p2 = Permission("write:invoices", "Write invoices")
    ps = PermissionSet({p1, p2})
    
    assert ps.has_permission("read:invoices") is True
    assert ps.has_permission("delete:invoices") is False

def test_policy_context():
    u = SystemUser()
    ctx = AuthorizationContext(identity=u, resource="invoice-123", action="read")
    assert ctx.identity.subject_id == "system"
    assert ctx.resource == "invoice-123"
""",
    "apps/api/tests/session/test_contracts.py": """from app.session.contracts import SessionSnapshot
from datetime import datetime, timezone

def test_session_snapshot():
    now = datetime.now(timezone.utc)
    s = SessionSnapshot(session_id="sess-1", subject_id="usr-1", started_at=now, expires_at=now, is_active=True)
    assert s.is_active is True
    assert s.session_id == "sess-1"
"""
}

dirs = [
    "apps/api/app/infrastructure/context",
    "apps/api/app/domain/events",
    "apps/api/app/domain/repositories",
    "apps/api/app/identity/contracts",
    "apps/api/app/identity/models",
    "apps/api/app/identity/events",
    "apps/api/app/authorization/permissions",
    "apps/api/app/authorization/roles",
    "apps/api/app/authorization/policies",
    "apps/api/app/authorization/services",
    "apps/api/app/authorization/contracts",
    "apps/api/app/authorization/events",
    "apps/api/app/session/contracts",
    "apps/api/app/session/events",
    "apps/api/tests/infrastructure",
    "apps/api/tests/domain",
    "apps/api/tests/identity",
    "apps/api/tests/authorization",
    "apps/api/tests/session",
]

for d in dirs:
    os.makedirs(d, exist_ok=True)
    init_file = os.path.join(d, '__init__.py')
    if not os.path.exists(init_file):
        with open(init_file, 'w') as f:
            pass

for path, content in files.items():
    directory = os.path.dirname(path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    with open(path, "w") as f:
        f.write(content)

print("Final Hardening & Phase 6 scaffolding complete.")
