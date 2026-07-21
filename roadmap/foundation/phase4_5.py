import os

files = {
    # ---------------------------------------------------------
    # PHASE 4: Shared Kernel
    # ---------------------------------------------------------
    "apps/api/app/domain/shared/__init__.py": "",
    "apps/api/app/domain/shared/errors.py": """class DomainError(Exception):
    pass

class BusinessRuleViolation(DomainError):
    pass

class InvariantViolation(DomainError):
    pass

class ConcurrencyError(DomainError):
    pass

class EntityNotFound(DomainError):
    pass

class DuplicateEntity(DomainError):
    pass

class ValidationFailure(DomainError):
    pass
""",
    "apps/api/app/domain/shared/clock.py": """from abc import ABC, abstractmethod
from datetime import datetime, timezone

class Clock(ABC):
    @abstractmethod
    def now(self) -> datetime:
        pass

class SystemClock(Clock):
    def now(self) -> datetime:
        return datetime.now(timezone.utc)

class FrozenClock(Clock):
    def __init__(self, time: datetime):
        self._time = time

    def now(self) -> datetime:
        return self._time
""",
    "apps/api/app/domain/shared/result.py": """from typing import TypeVar, Generic, Optional, Callable, Any
from app.domain.shared.errors import DomainError

T = TypeVar('T')
E = TypeVar('E', bound=DomainError)

class Result(Generic[T, E]):
    def __init__(self, is_success: bool, value: Optional[T] = None, error: Optional[E] = None):
        self.is_success = is_success
        self.value = value
        self.error = error
        
    @classmethod
    def ok(cls, value: T) -> 'Result[T, E]':
        return cls(is_success=True, value=value)
        
    @classmethod
    def fail(cls, error: E) -> 'Result[T, E]':
        return cls(is_success=False, error=error)
        
    @property
    def is_failure(self) -> bool:
        return not self.is_success
""",
    "apps/api/app/domain/shared/maybe.py": """from typing import TypeVar, Generic, Optional

T = TypeVar('T')

class Maybe(Generic[T]):
    def __init__(self, value: Optional[T]):
        self._value = value

    @property
    def has_value(self) -> bool:
        return self._value is not None

    @property
    def value(self) -> T:
        if not self.has_value:
            raise ValueError("Maybe has no value")
        return self._value
""",
    "apps/api/app/domain/shared/guard.py": """from typing import Any
from app.domain.shared.errors import InvariantViolation

class Guard:
    @staticmethod
    def against_null(value: Any, param_name: str) -> None:
        if value is None:
            raise InvariantViolation(f"{param_name} cannot be null")
            
    @staticmethod
    def against_empty_string(value: str, param_name: str) -> None:
        if not value or not value.strip():
            raise InvariantViolation(f"{param_name} cannot be empty")
""",

    # ---------------------------------------------------------
    # PHASE 4: Refined Value Objects (Money)
    # ---------------------------------------------------------
    "apps/api/app/domain/base/value_objects/primitives.py": """from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
import re
from typing import Optional, List
from app.domain.shared.errors import InvariantViolation

@dataclass(frozen=True)
class Email:
    value: str
    def __post_init__(self):
        if not self.value or "@" not in self.value:
            raise InvariantViolation(f"Invalid email format: {self.value}")
        object.__setattr__(self, 'value', self.value.lower().strip())

@dataclass(frozen=True)
class PhoneNumber:
    value: str
    def __post_init__(self):
        cleaned = re.sub(r'\\D', '', self.value)
        if len(cleaned) < 10:
            raise InvariantViolation(f"Invalid phone number length: {self.value}")
        object.__setattr__(self, 'value', cleaned)

@dataclass(frozen=True)
class Currency:
    code: str
    def __post_init__(self):
        if len(self.code) != 3:
            raise InvariantViolation("Currency code must be 3 characters")
        object.__setattr__(self, 'code', self.code.upper())

@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: Currency

    def __post_init__(self):
        if not isinstance(self.amount, Decimal):
            raise InvariantViolation("Amount must be a Decimal")
        # Round to 2 decimal places to prevent floating point quirks
        rounded = self.amount.quantize(Decimal('.01'), rounding=ROUND_HALF_UP)
        object.__setattr__(self, 'amount', rounded)

    def _check_currency(self, other: 'Money'):
        if self.currency != other.currency:
            raise InvariantViolation("Currencies must match")

    def __add__(self, other: 'Money') -> 'Money':
        self._check_currency(other)
        return Money(amount=self.amount + other.amount, currency=self.currency)

    def __sub__(self, other: 'Money') -> 'Money':
        self._check_currency(other)
        return Money(amount=self.amount - other.amount, currency=self.currency)

    def __lt__(self, other: 'Money') -> bool:
        self._check_currency(other)
        return self.amount < other.amount

    def allocate(self, ratios: List[int]) -> List['Money']:
        total = sum(ratios)
        remainder = self.amount
        results = []
        for r in ratios:
            share = (self.amount * r / total).quantize(Decimal('.01'), rounding=ROUND_HALF_UP)
            results.append(Money(amount=share, currency=self.currency))
            remainder -= share
        
        # distribute remainder to the first one
        if remainder != Decimal('0.00'):
            results[0] = Money(amount=results[0].amount + remainder, currency=self.currency)
        return results

@dataclass(frozen=True)
class DateRange:
    start_date: datetime
    end_date: datetime
    def __post_init__(self):
        if self.start_date > self.end_date:
            raise InvariantViolation("start_date cannot be after end_date")
""",

    # ---------------------------------------------------------
    # PHASE 4: Refined Entities
    # ---------------------------------------------------------
    "apps/api/app/domain/base/entities/base.py": """from abc import ABC
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Optional, List, Any
from app.domain.base.identifiers.types import EntityId, TenantId
from app.domain.shared.clock import Clock

@dataclass(kw_only=True)
class Entity(ABC):
    id: EntityId = field(default_factory=EntityId)

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, self.__class__):
            return False
        return self.id == other.id

    def __hash__(self) -> int:
        return hash(self.id)

@dataclass(kw_only=True)
class VersionedEntity(Entity):
    version: int = 1
    def increment_version(self):
        self.version += 1

@dataclass(kw_only=True)
class TimestampedEntity(VersionedEntity):
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def mark_created(self, clock: Clock) -> None:
        self.created_at = clock.now()
        self.updated_at = clock.now()
        
    def mark_updated(self, clock: Clock) -> None:
        self.updated_at = clock.now()
        self.increment_version()

@dataclass(kw_only=True)
class SoftDeleteEntity(TimestampedEntity):
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    
    def mark_deleted(self, clock: Clock) -> None:
        self.is_deleted = True
        self.deleted_at = clock.now()
        self.mark_updated(clock)

@dataclass(kw_only=True)
class MultiTenantEntity(SoftDeleteEntity):
    tenant_id: TenantId

@dataclass(kw_only=True)
class AuditableEntity(MultiTenantEntity):
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    deleted_by: Optional[str] = None

@dataclass(kw_only=True)
class AggregateRoot(AuditableEntity):
    _domain_events: List[Any] = field(default_factory=list, init=False, repr=False, compare=False)

    def raise_event(self, event: Any) -> None:
        self._domain_events.append(event)

    def events(self) -> List[Any]:
        return list(self._domain_events)

    def clear_events(self) -> None:
        self._domain_events.clear()
""",

    # ---------------------------------------------------------
    # PHASE 4: Refined Specifications
    # ---------------------------------------------------------
    "apps/api/app/domain/validation/framework.py": """from abc import ABC, abstractmethod
from typing import Any, List
from app.domain.shared.errors import ValidationFailure

class BusinessRule(ABC):
    @abstractmethod
    def is_satisfied(self) -> bool:
        pass
        
    @property
    @abstractmethod
    def message(self) -> str:
        pass

class Specification(ABC):
    @abstractmethod
    def is_satisfied_by(self, candidate: Any) -> bool:
        pass

    def __and__(self, other: 'Specification') -> 'Specification':
        return AndSpecification(self, other)

    def __or__(self, other: 'Specification') -> 'Specification':
        return OrSpecification(self, other)

    def __invert__(self) -> 'Specification':
        return NotSpecification(self)

class AndSpecification(Specification):
    def __init__(self, left: Specification, right: Specification):
        self.left = left
        self.right = right
    def is_satisfied_by(self, candidate: Any) -> bool:
        return self.left.is_satisfied_by(candidate) and self.right.is_satisfied_by(candidate)

class OrSpecification(Specification):
    def __init__(self, left: Specification, right: Specification):
        self.left = left
        self.right = right
    def is_satisfied_by(self, candidate: Any) -> bool:
        return self.left.is_satisfied_by(candidate) or self.right.is_satisfied_by(candidate)

class NotSpecification(Specification):
    def __init__(self, spec: Specification):
        self.spec = spec
    def is_satisfied_by(self, candidate: Any) -> bool:
        return not self.spec.is_satisfied_by(candidate)

class Validator:
    @staticmethod
    def check_rule(rule: BusinessRule) -> None:
        if not rule.is_satisfied():
            raise ValidationFailure(rule.message)
""",

    # ---------------------------------------------------------
    # PHASE 4: Refined Repository Contracts
    # ---------------------------------------------------------
    "apps/api/app/domain/repositories/contracts.py": """from typing import TypeVar, Generic, Optional, List, Any
from abc import ABC, abstractmethod
from app.domain.base.entities.base import Entity
from app.domain.base.identifiers.base import BaseId

T = TypeVar('T', bound=Entity)

class ReadRepository(Generic[T], ABC):
    @abstractmethod
    def exists(self, id: BaseId) -> bool:
        pass

    @abstractmethod
    def count(self) -> int:
        pass

    @abstractmethod
    def find_by_id(self, id: BaseId) -> Optional[T]:
        pass
        
    @abstractmethod
    def find_many(self, ids: List[BaseId]) -> List[T]:
        pass

    @abstractmethod
    def stream(self):
        pass

class WriteRepository(Generic[T], ABC):
    @abstractmethod
    def add(self, entity: T) -> None:
        pass
        
    @abstractmethod
    def update(self, entity: T) -> None:
        pass
        
    @abstractmethod
    def remove(self, entity: T) -> None:
        pass

    @abstractmethod
    def save_all(self, entities: List[T]) -> None:
        pass

    @abstractmethod
    def delete_all(self, entities: List[T]) -> None:
        pass

class SpecificationExecutor(Generic[T], ABC):
    @abstractmethod
    def find_by_specification(self, spec: Any) -> List[T]:
        pass

class Repository(ReadRepository[T], WriteRepository[T], SpecificationExecutor[T], ABC):
    pass
""",

    # ---------------------------------------------------------
    # PHASE 4: Refined Domain Events & Audit
    # ---------------------------------------------------------
    "apps/api/app/domain/events/contracts.py": """from dataclasses import dataclass, field
from datetime import datetime, timezone
import uuid
from abc import ABC
from typing import Dict, Any

@dataclass(frozen=True)
class EventMetadata:
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    aggregate_id: str = ""
    aggregate_type: str = ""
    correlation_id: str = ""
    causation_id: str = ""
    version: int = 1
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass(frozen=True)
class DomainEvent(ABC):
    meta: EventMetadata = field(default_factory=EventMetadata)
""",
    "apps/api/app/domain/audit/metadata.py": """from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass(frozen=True)
class AuditMetadata:
    created_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[str] = None
    version: int = 1
    trace_id: Optional[str] = None
    correlation_id: Optional[str] = None
""",

    # ---------------------------------------------------------
    # PHASE 5: Tenant Infrastructure
    # ---------------------------------------------------------
    "apps/api/app/config/tenant.py": """from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class TenantSettings(BaseSettings):
    enabled_strategies: List[str] = ["header", "subdomain"]
    header_name: str = "X-Tenant-ID"
    subdomain_suffix: str = "tallyme.app"
    strict_mode: bool = True
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

tenant_settings = TenantSettings()
""",
    "apps/api/app/infrastructure/tenant/exceptions.py": """class TenantException(Exception):
    pass

class TenantNotResolved(TenantException):
    pass

class TenantResolutionFailed(TenantException):
    pass

class InvalidTenantIdentifier(TenantException):
    pass

class MissingTenant(TenantException):
    pass

class TenantContextMissing(TenantException):
    pass
""",
    "apps/api/app/domain/tenant/context.py": """import contextvars
from typing import Optional
from app.domain.base.identifiers.types import TenantId
from app.infrastructure.tenant.exceptions import TenantContextMissing

_current_tenant: contextvars.ContextVar[Optional[TenantId]] = contextvars.ContextVar("current_tenant", default=None)

class TenantContext:
    @staticmethod
    def current() -> Optional[TenantId]:
        return _current_tenant.get()

    @staticmethod
    def set(tenant_id: TenantId) -> contextvars.Token:
        return _current_tenant.set(tenant_id)

    @staticmethod
    def clear(token: contextvars.Token) -> None:
        _current_tenant.reset(token)

    @staticmethod
    def exists() -> bool:
        return _current_tenant.get() is not None

    @staticmethod
    def require() -> TenantId:
        val = _current_tenant.get()
        if not val:
            raise TenantContextMissing("Tenant context is required but missing.")
        return val
""",
    "apps/api/app/infrastructure/tenant/strategies.py": """from abc import ABC, abstractmethod
from typing import Optional
from fastapi import Request
from app.domain.base.identifiers.types import TenantId
from app.config.tenant import tenant_settings
from app.infrastructure.tenant.exceptions import InvalidTenantIdentifier

class TenantResolutionStrategy(ABC):
    @abstractmethod
    def supports(self, request: Request) -> bool:
        pass
        
    @abstractmethod
    def resolve(self, request: Request) -> TenantId:
        pass

class HeaderTenantStrategy(TenantResolutionStrategy):
    def supports(self, request: Request) -> bool:
        return tenant_settings.header_name in request.headers

    def resolve(self, request: Request) -> TenantId:
        val = request.headers.get(tenant_settings.header_name)
        try:
            return TenantId(val)
        except ValueError:
            raise InvalidTenantIdentifier("Malformed TenantId in header")

class SubdomainTenantStrategy(TenantResolutionStrategy):
    def supports(self, request: Request) -> bool:
        host = request.headers.get("host", "")
        return host.endswith(tenant_settings.subdomain_suffix) and host != tenant_settings.subdomain_suffix

    def resolve(self, request: Request) -> TenantId:
        host = request.headers.get("host", "")
        subdomain = host.split(".")[0]
        try:
            return TenantId(subdomain)
        except ValueError:
            raise InvalidTenantIdentifier("Malformed TenantId in subdomain")
""",
    "apps/api/app/infrastructure/tenant/pipeline.py": """from typing import List
from fastapi import Request
from app.infrastructure.tenant.strategies import TenantResolutionStrategy
from app.infrastructure.tenant.exceptions import TenantNotResolved
from app.domain.base.identifiers.types import TenantId

class TenantResolutionPipeline:
    def __init__(self, strategies: List[TenantResolutionStrategy]):
        self.strategies = strategies

    def resolve(self, request: Request) -> TenantId:
        for strategy in self.strategies:
            if strategy.supports(request):
                return strategy.resolve(request)
        raise TenantNotResolved("No configured strategy could resolve a tenant from the request")
""",
    "apps/api/app/infrastructure/tenant/provider.py": """from app.domain.tenant.interfaces import TenantProvider
from app.domain.base.identifiers.types import TenantId
from app.infrastructure.tenant.exceptions import InvalidTenantIdentifier, MissingTenant

class MockTenantProvider(TenantProvider):
    # Phase 5 specifically prohibits DB lookups. Only format validation is allowed.
    def get_tenant_details(self, tenant_id: TenantId) -> dict:
        if not tenant_id or not tenant_id.value:
            raise MissingTenant("Empty identifier")
        if tenant_id.value == "00000000-0000-0000-0000-000000000000":
            raise InvalidTenantIdentifier("Reserved identifier")
        return {"id": tenant_id.value, "status": "active"}
""",
    "apps/api/app/api/middleware/tenant.py": """from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.infrastructure.tenant.pipeline import TenantResolutionPipeline
from app.domain.tenant.context import TenantContext
from app.infrastructure.tenant.exceptions import TenantException
from app.security.audit import SecurityAuditor
from fastapi.responses import JSONResponse

class TenantMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, pipeline: TenantResolutionPipeline, strict_mode: bool = True):
        super().__init__(app)
        self.pipeline = pipeline
        self.strict_mode = strict_mode

    async def dispatch(self, request: Request, call_next):
        token = None
        try:
            tenant_id = self.pipeline.resolve(request)
            token = TenantContext.set(tenant_id)
            SecurityAuditor.emit_event("tenant_resolved", {"tenant_id": tenant_id.value})
            
            response = await call_next(request)
            return response
            
        except TenantException as e:
            SecurityAuditor.emit_event("tenant_resolution_failed", {"error": str(e)})
            if self.strict_mode:
                return JSONResponse(status_code=400, content={"detail": str(e)})
            else:
                return await call_next(request)
        finally:
            if token:
                TenantContext.clear(token)
""",

    # ---------------------------------------------------------
    # TESTS
    # ---------------------------------------------------------
    "apps/api/tests/domain/test_money.py": """import pytest
from decimal import Decimal
from app.domain.base.value_objects.primitives import Money, Currency
from app.domain.shared.errors import InvariantViolation

def test_money_arithmetic_and_rounding():
    usd = Currency("USD")
    m1 = Money(Decimal("10.505"), usd) # Should round to 10.51
    assert m1.amount == Decimal("10.51")
    
    m2 = Money(Decimal("5.00"), usd)
    
    m3 = m1 + m2
    assert m3.amount == Decimal("15.51")
    
    m4 = m1 - m2
    assert m4.amount == Decimal("5.51")
    
    assert m2 < m1

def test_money_allocation():
    usd = Currency("USD")
    m = Money(Decimal("10.00"), usd)
    parts = m.allocate([1, 1, 1])
    # 3.33, 3.33, 3.33 = 9.99, remaining 0.01 to first
    assert parts[0].amount == Decimal("3.34")
    assert parts[1].amount == Decimal("3.33")
    assert parts[2].amount == Decimal("3.33")
""",
    "apps/api/tests/domain/test_specifications.py": """from app.domain.validation.framework import Specification

class TrueSpec(Specification):
    def is_satisfied_by(self, candidate) -> bool: return True

class FalseSpec(Specification):
    def is_satisfied_by(self, candidate) -> bool: return False

def test_composite_specifications():
    s1 = TrueSpec()
    s2 = FalseSpec()
    
    assert (s1 & s1).is_satisfied_by(None) is True
    assert (s1 & s2).is_satisfied_by(None) is False
    assert (s1 | s2).is_satisfied_by(None) is True
    assert (~s1).is_satisfied_by(None) is False
    assert (~s2).is_satisfied_by(None) is True
""",
    "apps/api/tests/infrastructure/tenant/test_pipeline.py": """import pytest
from fastapi import Request
from app.infrastructure.tenant.strategies import HeaderTenantStrategy, SubdomainTenantStrategy
from app.infrastructure.tenant.pipeline import TenantResolutionPipeline
from app.infrastructure.tenant.exceptions import TenantNotResolved, InvalidTenantIdentifier
from app.domain.base.identifiers.types import TenantId
from app.config.tenant import tenant_settings

def make_request(headers: dict) -> Request:
    return Request(scope={"type": "http", "headers": [(k.encode(), v.encode()) for k, v in headers.items()]})

def test_pipeline_header_strategy():
    pipeline = TenantResolutionPipeline([HeaderTenantStrategy()])
    req = make_request({tenant_settings.header_name.lower(): "123e4567-e89b-12d3-a456-426614174000"})
    tenant_id = pipeline.resolve(req)
    assert isinstance(tenant_id, TenantId)
    assert tenant_id.value == "123e4567-e89b-12d3-a456-426614174000"

def test_pipeline_subdomain_strategy():
    pipeline = TenantResolutionPipeline([SubdomainTenantStrategy()])
    req = make_request({"host": f"123e4567-e89b-12d3-a456-426614174000.{tenant_settings.subdomain_suffix}"})
    tenant_id = pipeline.resolve(req)
    assert tenant_id.value == "123e4567-e89b-12d3-a456-426614174000"

def test_pipeline_fails_gracefully():
    pipeline = TenantResolutionPipeline([HeaderTenantStrategy()])
    req = make_request({}) # empty
    with pytest.raises(TenantNotResolved):
        pipeline.resolve(req)

def test_pipeline_malformed_uuid():
    pipeline = TenantResolutionPipeline([HeaderTenantStrategy()])
    req = make_request({tenant_settings.header_name.lower(): "invalid"})
    with pytest.raises(InvalidTenantIdentifier):
        pipeline.resolve(req)
"""
}

dirs = [
    "apps/api/app/domain/shared",
    "apps/api/app/config",
    "apps/api/app/infrastructure/tenant",
    "apps/api/app/api/middleware",
    "apps/api/tests/infrastructure/tenant"
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

print("Phase 4 Hardening and Phase 5 Scaffolding complete.")
