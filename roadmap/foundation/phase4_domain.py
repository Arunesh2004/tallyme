import os
import shutil

files = {
    # ---------------------------------------------------------
    # 1. Identifiers
    # ---------------------------------------------------------
    "apps/api/app/domain/base/identifiers/__init__.py": "",
    "apps/api/app/domain/base/identifiers/base.py": """from abc import ABC
import uuid
from typing import Any

class BaseId(ABC):
    def __init__(self, value: str = None):
        if value is None:
            self._value = str(uuid.uuid4())
        else:
            # Validate UUID format implicitly by parsing
            try:
                uuid.UUID(value)
                self._value = str(value)
            except ValueError:
                raise ValueError(f"Invalid UUID string for identifier: {value}")

    @property
    def value(self) -> str:
        return self._value

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, self.__class__):
            return False
        return self._value == other._value

    def __hash__(self) -> int:
        return hash(self._value)

    def __str__(self) -> str:
        return self._value
        
    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self._value})"
""",
    "apps/api/app/domain/base/identifiers/types.py": """from app.domain.base.identifiers.base import BaseId

class EntityId(BaseId): pass
class TenantId(BaseId): pass
class OrganizationId(BaseId): pass
class UserId(BaseId): pass
class RoleId(BaseId): pass
class PermissionId(BaseId): pass
class StudentId(BaseId): pass
class VendorId(BaseId): pass
class VoucherId(BaseId): pass
class DocumentId(BaseId): pass
class SessionId(BaseId): pass
""",

    # ---------------------------------------------------------
    # 2. Value Objects
    # ---------------------------------------------------------
    "apps/api/app/domain/base/value_objects/__init__.py": "",
    "apps/api/app/domain/base/value_objects/primitives.py": """from dataclasses import dataclass, field
from decimal import Decimal
from datetime import datetime
import re
from typing import Optional

@dataclass(frozen=True)
class Email:
    value: str
    def __post_init__(self):
        if not self.value or "@" not in self.value:
            raise ValueError(f"Invalid email format: {self.value}")
        object.__setattr__(self, 'value', self.value.lower().strip())

@dataclass(frozen=True)
class PhoneNumber:
    value: str
    def __post_init__(self):
        cleaned = re.sub(r'\\D', '', self.value)
        if len(cleaned) < 10:
            raise ValueError(f"Invalid phone number length: {self.value}")
        object.__setattr__(self, 'value', cleaned)

@dataclass(frozen=True)
class Currency:
    code: str
    def __post_init__(self):
        if len(self.code) != 3:
            raise ValueError("Currency code must be 3 characters")
        object.__setattr__(self, 'code', self.code.upper())

@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: Currency
    def __post_init__(self):
        if not isinstance(self.amount, Decimal):
            raise TypeError("Amount must be a Decimal")
            
    def __add__(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise ValueError("Cannot add money with different currencies")
        return Money(amount=self.amount + other.amount, currency=self.currency)

@dataclass(frozen=True)
class Address:
    street: str
    city: str
    state: str
    country: str
    postal_code: str

@dataclass(frozen=True)
class Name:
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    def full_name(self) -> str:
        parts = [self.first_name, self.middle_name, self.last_name]
        return " ".join(p for p in parts if p)

@dataclass(frozen=True)
class Percentage:
    value: Decimal
    def __post_init__(self):
        if self.value < 0 or self.value > 100:
            raise ValueError("Percentage must be between 0 and 100")

@dataclass(frozen=True)
class DateRange:
    start_date: datetime
    end_date: datetime
    def __post_init__(self):
        if self.start_date > self.end_date:
            raise ValueError("start_date cannot be after end_date")

@dataclass(frozen=True)
class Locale:
    code: str

@dataclass(frozen=True)
class Language:
    code: str

@dataclass(frozen=True)
class TimeZone:
    identifier: str
""",

    # ---------------------------------------------------------
    # 3. Entities
    # ---------------------------------------------------------
    "apps/api/app/domain/base/entities/__init__.py": "",
    "apps/api/app/domain/base/entities/base.py": """from abc import ABC
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Optional, List, Any
from app.domain.base.identifiers.types import EntityId, TenantId

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
class TimestampedEntity(Entity):
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

@dataclass(kw_only=True)
class SoftDeleteEntity(Entity):
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None

@dataclass(kw_only=True)
class VersionedEntity(Entity):
    version: int = 1

@dataclass(kw_only=True)
class MultiTenantEntity(Entity):
    tenant_id: TenantId

@dataclass(kw_only=True)
class AuditableEntity(TimestampedEntity, SoftDeleteEntity):
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    deleted_by: Optional[str] = None

@dataclass(kw_only=True)
class AggregateRoot(Entity):
    _domain_events: List[Any] = field(default_factory=list, init=False, repr=False, compare=False)

    def add_domain_event(self, event: Any) -> None:
        self._domain_events.append(event)

    def clear_domain_events(self) -> None:
        self._domain_events.clear()

    @property
    def domain_events(self) -> List[Any]:
        return list(self._domain_events)
""",

    # ---------------------------------------------------------
    # 4. Repository Contracts
    # ---------------------------------------------------------
    "apps/api/app/domain/repositories/__init__.py": "",
    "apps/api/app/domain/repositories/contracts.py": """from typing import TypeVar, Generic, Optional, List, Any
from abc import ABC, abstractmethod
from app.domain.base.entities.base import Entity
from app.domain.base.identifiers.base import BaseId

T = TypeVar('T', bound=Entity)

class SpecificationExecutor(Generic[T], ABC):
    @abstractmethod
    def find_by_specification(self, spec: Any) -> List[T]:
        pass

class ReadRepository(Generic[T], ABC):
    @abstractmethod
    def get_by_id(self, id: BaseId) -> Optional[T]:
        pass
        
    @abstractmethod
    def list_all(self) -> List[T]:
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

class Repository(ReadRepository[T], WriteRepository[T], SpecificationExecutor[T], ABC):
    pass

class UnitOfWork(ABC):
    @abstractmethod
    def commit(self) -> None:
        pass
        
    @abstractmethod
    def rollback(self) -> None:
        pass

class TransactionManager(ABC):
    @abstractmethod
    def begin(self) -> UnitOfWork:
        pass
""",

    # ---------------------------------------------------------
    # 5. Tenant Foundation
    # ---------------------------------------------------------
    "apps/api/app/domain/tenant/__init__.py": "",
    "apps/api/app/domain/tenant/context.py": """import contextvars
from typing import Optional
from app.domain.base.identifiers.types import TenantId

_current_tenant: contextvars.ContextVar[Optional[TenantId]] = contextvars.ContextVar("current_tenant", default=None)

class TenantContext:
    @staticmethod
    def get() -> Optional[TenantId]:
        return _current_tenant.get()

    @staticmethod
    def set(tenant_id: TenantId) -> contextvars.Token:
        return _current_tenant.set(tenant_id)

    @staticmethod
    def reset(token: contextvars.Token) -> None:
        _current_tenant.reset(token)
""",
    "apps/api/app/domain/tenant/interfaces.py": """from abc import ABC, abstractmethod
from typing import Optional
from app.domain.base.identifiers.types import TenantId

class TenantResolver(ABC):
    @abstractmethod
    def resolve_from_context(self, context_data: dict) -> Optional[TenantId]:
        pass

class TenantProvider(ABC):
    @abstractmethod
    def get_tenant_details(self, tenant_id: TenantId) -> dict:
        pass
""",

    # ---------------------------------------------------------
    # 6. Domain Events
    # ---------------------------------------------------------
    "apps/api/app/domain/events/__init__.py": "",
    "apps/api/app/domain/events/contracts.py": """from dataclasses import dataclass, field
from datetime import datetime, timezone
import uuid
from abc import ABC, abstractmethod

@dataclass(frozen=True)
class EventMetadata:
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    occurred_on: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    correlation_id: str = ""
    causation_id: str = ""

@dataclass(frozen=True)
class DomainEvent(ABC):
    metadata: EventMetadata = field(default_factory=EventMetadata)

class EventHandler(ABC):
    @abstractmethod
    def handle(self, event: DomainEvent) -> None:
        pass

class EventPublisher(ABC):
    @abstractmethod
    def publish(self, event: DomainEvent) -> None:
        pass

class EventDispatcher(ABC):
    @abstractmethod
    def register(self, event_type: type, handler: EventHandler) -> None:
        pass
        
    @abstractmethod
    def dispatch(self, event: DomainEvent) -> None:
        pass
""",

    # ---------------------------------------------------------
    # 7. Validation
    # ---------------------------------------------------------
    "apps/api/app/domain/validation/__init__.py": "",
    "apps/api/app/domain/validation/framework.py": """from abc import ABC, abstractmethod
from typing import Any, List

class ValidationError(Exception):
    def __init__(self, message: str, rule: str = None):
        self.message = message
        self.rule = rule
        super().__init__(self.message)

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

class Validator:
    @staticmethod
    def check_rule(rule: BusinessRule) -> None:
        if not rule.is_satisfied():
            raise ValidationError(rule.message, rule.__class__.__name__)
            
    @staticmethod
    def check_rules(rules: List[BusinessRule]) -> None:
        for rule in rules:
            Validator.check_rule(rule)
""",

    # ---------------------------------------------------------
    # 8. Audit Foundation
    # ---------------------------------------------------------
    "apps/api/app/domain/audit/__init__.py": "",
    "apps/api/app/domain/audit/metadata.py": """from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class AuditMetadata:
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    deleted_by: Optional[str] = None
    version: int = 1
    correlation_id: Optional[str] = None
    trace_id: Optional[str] = None
""",

    # ---------------------------------------------------------
    # 9. Domain Tests
    # ---------------------------------------------------------
    "apps/api/tests/domain/__init__.py": "",
    "apps/api/tests/domain/test_identifiers.py": """import pytest
from app.domain.base.identifiers.types import EntityId, TenantId

def test_identifier_equality():
    id_val = "123e4567-e89b-12d3-a456-426614174000"
    e1 = EntityId(id_val)
    e2 = EntityId(id_val)
    assert e1 == e2
    assert hash(e1) == hash(e2)

def test_identifier_mismatch():
    id_val = "123e4567-e89b-12d3-a456-426614174000"
    e1 = EntityId(id_val)
    t1 = TenantId(id_val)
    assert e1 != t1

def test_invalid_uuid():
    with pytest.raises(ValueError):
        EntityId("not-a-uuid")
""",
    "apps/api/tests/domain/test_value_objects.py": """import pytest
from decimal import Decimal
from datetime import datetime, timedelta
from app.domain.base.value_objects.primitives import Email, Money, Currency, DateRange

def test_email_normalization():
    e = Email(" Test@EXAMPLE.com ")
    assert e.value == "test@example.com"

def test_value_object_immutability():
    e = Email("test@test.com")
    with pytest.raises(Exception): # FrozenInstanceError
        e.value = "new@test.com"

def test_money_arithmetic():
    usd = Currency("USD")
    m1 = Money(Decimal("10.50"), usd)
    m2 = Money(Decimal("20.00"), usd)
    m3 = m1 + m2
    assert m3.amount == Decimal("30.50")
    
    eur = Currency("EUR")
    m4 = Money(Decimal("10.00"), eur)
    with pytest.raises(ValueError):
        _ = m1 + m4

def test_date_range_validation():
    now = datetime.now()
    with pytest.raises(ValueError):
        DateRange(now, now - timedelta(days=1))
""",
    "apps/api/tests/domain/test_entities.py": """from app.domain.base.entities.base import Entity, AggregateRoot
from app.domain.base.identifiers.types import EntityId

def test_entity_equality():
    id1 = EntityId()
    e1 = Entity(id=id1)
    e2 = Entity(id=id1)
    assert e1 == e2

def test_aggregate_events():
    class DummyEvent:
        pass
        
    agg = AggregateRoot()
    agg.add_domain_event(DummyEvent())
    assert len(agg.domain_events) == 1
    agg.clear_domain_events()
    assert len(agg.domain_events) == 0
""",
    "apps/api/tests/domain/test_tenant.py": """from app.domain.tenant.context import TenantContext
from app.domain.base.identifiers.types import TenantId

def test_tenant_context_isolation():
    assert TenantContext.get() is None
    
    t_id = TenantId()
    token = TenantContext.set(t_id)
    assert TenantContext.get() == t_id
    
    TenantContext.reset(token)
    assert TenantContext.get() is None
"""
}

dirs = [
    "apps/api/app/domain/base/identifiers",
    "apps/api/app/domain/base/value_objects",
    "apps/api/app/domain/base/entities",
    "apps/api/app/domain/repositories",
    "apps/api/app/domain/tenant",
    "apps/api/app/domain/events",
    "apps/api/app/domain/validation",
    "apps/api/app/domain/audit",
    "apps/api/tests/domain",
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

print("Phase 4 Domain Foundation scaffolding complete.")
