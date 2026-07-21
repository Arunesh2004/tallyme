import os

files = {
    # =========================================================
    # REFINEMENTS: DOMAIN CAPABILITIES
    # =========================================================

    # 1. Specifications
    "apps/api/app/domain/shared/specifications/__init__.py": "",
    "apps/api/app/domain/shared/specifications/contracts.py": """from abc import ABC, abstractmethod
from typing import TypeVar, Generic

T = TypeVar('T')

class Specification(Generic[T], ABC):
    @abstractmethod
    def is_satisfied_by(self, candidate: T) -> bool:
        pass

    def and_spec(self, other: 'Specification[T]') -> 'Specification[T]':
        return AndSpecification(self, other)

    def or_spec(self, other: 'Specification[T]') -> 'Specification[T]':
        return OrSpecification(self, other)

    def not_spec(self) -> 'Specification[T]':
        return NotSpecification(self)

class AndSpecification(Specification[T]):
    def __init__(self, left: Specification[T], right: Specification[T]):
        self.left = left
        self.right = right
    
    def is_satisfied_by(self, candidate: T) -> bool:
        return self.left.is_satisfied_by(candidate) and self.right.is_satisfied_by(candidate)

class OrSpecification(Specification[T]):
    def __init__(self, left: Specification[T], right: Specification[T]):
        self.left = left
        self.right = right
    
    def is_satisfied_by(self, candidate: T) -> bool:
        return self.left.is_satisfied_by(candidate) or self.right.is_satisfied_by(candidate)

class NotSpecification(Specification[T]):
    def __init__(self, spec: Specification[T]):
        self.spec = spec
    
    def is_satisfied_by(self, candidate: T) -> bool:
        return not self.spec.is_satisfied_by(candidate)
""",

    # 2. Domain Notifications
    "apps/api/app/domain/shared/notifications/__init__.py": "",
    "apps/api/app/domain/shared/notifications/domain_notification.py": """from dataclasses import dataclass
from typing import List

@dataclass(frozen=True)
class DomainNotification:
    key: str
    message: str

class NotificationCollector:
    def __init__(self):
        self._notifications: List[DomainNotification] = []
        
    def add(self, key: str, message: str) -> None:
        self._notifications.append(DomainNotification(key, message))
        
    def has_errors(self) -> bool:
        return len(self._notifications) > 0
        
    def get_notifications(self) -> List[DomainNotification]:
        return list(self._notifications)

class ValidationNotification(DomainNotification):
    pass
""",

    # 3. Domain Error Catalog
    "apps/api/app/domain/shared/errors/__init__.py": "",
    "apps/api/app/domain/shared/errors/catalog.py": """from enum import Enum

class DomainErrorCode(str, Enum):
    BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION"
    CONCURRENCY_VIOLATION = "CONCURRENCY_VIOLATION"
    INVARIANT_VIOLATION = "INVARIANT_VIOLATION"
    ENTITY_NOT_FOUND = "ENTITY_NOT_FOUND"
    DUPLICATE_ENTITY = "DUPLICATE_ENTITY"

class DomainError(Exception):
    def __init__(self, code: DomainErrorCode, message: str):
        self.code = code
        self.message = message
        super().__init__(self.message)

class BusinessRuleViolation(DomainError):
    def __init__(self, message: str):
        super().__init__(DomainErrorCode.BUSINESS_RULE_VIOLATION, message)

class ConcurrencyViolation(DomainError):
    def __init__(self, message: str):
        super().__init__(DomainErrorCode.CONCURRENCY_VIOLATION, message)

class InvariantViolation(DomainError):
    def __init__(self, message: str):
        super().__init__(DomainErrorCode.INVARIANT_VIOLATION, message)

class EntityNotFound(DomainError):
    def __init__(self, message: str):
        super().__init__(DomainErrorCode.ENTITY_NOT_FOUND, message)

class DuplicateEntity(DomainError):
    def __init__(self, message: str):
        super().__init__(DomainErrorCode.DUPLICATE_ENTITY, message)
""",

    # 4. Repository Unit of Work Contract
    "apps/api/app/domain/repositories/uow.py": """from abc import ABC, abstractmethod
from typing import Any

class RepositoryContext(ABC):
    pass

class TransactionScope(ABC):
    @abstractmethod
    async def commit(self) -> None:
        pass
        
    @abstractmethod
    async def rollback(self) -> None:
        pass
        
    @abstractmethod
    async def __aenter__(self) -> 'TransactionScope':
        pass
        
    @abstractmethod
    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        pass

class UnitOfWork(ABC):
    @abstractmethod
    def begin_transaction(self) -> TransactionScope:
        pass
""",

    # 5. Aggregate Versioning
    "apps/api/app/domain/base/entities/versioning.py": """from abc import ABC

class VersionedAggregate(ABC):
    def __init__(self):
        self._version = 1
        
    @property
    def version(self) -> int:
        return self._version
        
    def increment_version(self) -> None:
        self._version += 1

class ExpectedVersion:
    def __init__(self, version: int):
        self.version = version
""",

    # =========================================================
    # PHASE 9: USER PROFILE & IDENTITY MANAGEMENT
    # =========================================================

    # 1. User Value Objects
    "apps/api/app/domain/users/value_objects/__init__.py": "",
    "apps/api/app/domain/users/value_objects/preferences.py": """from dataclasses import dataclass
from enum import Enum

class Theme(str, Enum):
    LIGHT = "light"
    DARK = "dark"
    SYSTEM = "system"

class NotificationPreference(str, Enum):
    ALL = "all"
    IMPORTANT = "important"
    NONE = "none"

@dataclass(frozen=True)
class Preferences:
    theme: Theme = Theme.SYSTEM
    language: str = "en"
    timezone: str = "UTC"
    locale: str = "en-US"
    notifications: NotificationPreference = NotificationPreference.ALL
    accessibility: bool = False
""",
    "apps/api/app/domain/users/value_objects/contact_information.py": """from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class ContactInformation:
    email: str
    phone_number: Optional[str] = None
""",
    "apps/api/app/domain/users/value_objects/profile_details.py": """from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class DisplayName:
    first_name: str
    last_name: str
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

@dataclass(frozen=True)
class AvatarReference:
    url: str
    is_default: bool = False
""",
    "apps/api/app/domain/users/value_objects/identity_reference.py": """from dataclasses import dataclass

@dataclass(frozen=True)
class IdentityReference:
    provider: str
    provider_id: str
""",

    # 2. User Aggregate
    "apps/api/app/domain/users/aggregates/__init__.py": "",
    "apps/api/app/domain/users/aggregates/user_profile.py": """from dataclasses import dataclass, field
from typing import Optional
from app.domain.base.identifiers.types import UserId
from app.domain.base.entities.versioning import VersionedAggregate
from app.domain.users.value_objects.preferences import Preferences
from app.domain.users.value_objects.contact_information import ContactInformation
from app.domain.users.value_objects.profile_details import DisplayName, AvatarReference
from app.domain.users.value_objects.identity_reference import IdentityReference

@dataclass(kw_only=True)
class ProfileSettings:
    is_public: bool = False
    allow_marketing: bool = False

class UserProfile(VersionedAggregate):
    def __init__(
        self,
        id: UserId,
        identity: IdentityReference,
        contact: ContactInformation,
        display_name: DisplayName,
        preferences: Preferences = Preferences(),
        settings: ProfileSettings = ProfileSettings(),
        avatar: Optional[AvatarReference] = None
    ):
        super().__init__()
        self.id = id
        self.identity = identity
        self.contact = contact
        self.display_name = display_name
        self.preferences = preferences
        self.settings = settings
        self.avatar = avatar

    def update_preferences(self, new_preferences: Preferences) -> None:
        self.preferences = new_preferences
        self.increment_version()

    def update_avatar(self, new_avatar: AvatarReference) -> None:
        self.avatar = new_avatar
        self.increment_version()
""",

    # 3. Domain Events
    "apps/api/app/domain/users/events/__init__.py": "",
    "apps/api/app/domain/users/events/events.py": """from dataclasses import dataclass
from app.domain.events.contracts import DomainEvent

@dataclass(frozen=True)
class UserProfileCreated(DomainEvent):
    user_id: str
    email: str

@dataclass(frozen=True)
class UserProfileUpdated(DomainEvent):
    user_id: str

@dataclass(frozen=True)
class PreferencesChanged(DomainEvent):
    user_id: str

@dataclass(frozen=True)
class AvatarUpdated(DomainEvent):
    user_id: str
    avatar_url: str
""",

    # 4. Repository Contracts
    "apps/api/app/domain/users/repositories/__init__.py": "",
    "apps/api/app/domain/users/repositories/user_profile_repository.py": """from abc import ABC, abstractmethod
from typing import Optional
from app.domain.base.identifiers.types import UserId
from app.domain.users.aggregates.user_profile import UserProfile
from app.domain.repositories.uow import RepositoryContext

class UserProfileRepository(ABC):
    @abstractmethod
    async def get_by_id(self, user_id: UserId, context: Optional[RepositoryContext] = None) -> Optional[UserProfile]:
        pass

    @abstractmethod
    async def save(self, profile: UserProfile, context: Optional[RepositoryContext] = None) -> None:
        pass
""",

    # 5. Application Vertical Slices
    "apps/api/app/application/users/create_profile/__init__.py": "",
    "apps/api/app/application/users/create_profile/dto.py": """from dataclasses import dataclass

@dataclass(frozen=True)
class CreateProfileRequest:
    email: str
    first_name: str
    last_name: str
    provider: str
    provider_id: str

@dataclass(frozen=True)
class CreateProfileResponse:
    user_id: str
""",
    "apps/api/app/application/users/create_profile/handler.py": """from app.platform.cqrs.contracts import CommandHandler, CommandContext, CommandResult
from app.application.users.create_profile.command import CreateProfileCommand
from app.application.users.create_profile.dto import CreateProfileResponse
from app.domain.users.repositories.user_profile_repository import UserProfileRepository
from app.domain.users.aggregates.user_profile import UserProfile
from app.domain.base.identifiers.types import UserId
from app.domain.users.value_objects.contact_information import ContactInformation
from app.domain.users.value_objects.profile_details import DisplayName
from app.domain.users.value_objects.identity_reference import IdentityReference

class CreateProfileHandler(CommandHandler[CreateProfileResponse]):
    def __init__(self, repository: UserProfileRepository):
        self.repository = repository

    async def handle(self, command: CreateProfileCommand, context: CommandContext) -> CommandResult[CreateProfileResponse]:
        req = command.request
        
        user_id = UserId()
        contact = ContactInformation(email=req.email)
        display = DisplayName(first_name=req.first_name, last_name=req.last_name)
        identity = IdentityReference(provider=req.provider, provider_id=req.provider_id)
        
        profile = UserProfile(
            id=user_id,
            identity=identity,
            contact=contact,
            display_name=display
        )
        
        await self.repository.save(profile)
        
        return CommandResult(data=CreateProfileResponse(user_id=user_id.value))
""",
    "apps/api/app/application/users/create_profile/command.py": """from app.platform.cqrs.contracts import Command
from app.application.users.create_profile.dto import CreateProfileRequest, CreateProfileResponse
from dataclasses import dataclass

@dataclass(frozen=True)
class CreateProfileCommand(Command[CreateProfileResponse]):
    request: CreateProfileRequest
""",

    "apps/api/app/application/users/update_preferences/__init__.py": "",
    "apps/api/app/application/users/update_preferences/dto.py": """from dataclasses import dataclass

@dataclass(frozen=True)
class UpdatePreferencesRequest:
    user_id: str
    theme: str
    language: str
""",
    "apps/api/app/application/users/update_preferences/handler.py": """from app.platform.cqrs.contracts import CommandHandler, CommandContext, CommandResult
from app.application.users.update_preferences.command import UpdatePreferencesCommand
from app.domain.users.repositories.user_profile_repository import UserProfileRepository
from app.domain.base.identifiers.types import UserId
from app.domain.users.value_objects.preferences import Preferences, Theme

class UpdatePreferencesHandler(CommandHandler[bool]):
    def __init__(self, repository: UserProfileRepository):
        self.repository = repository

    async def handle(self, command: UpdatePreferencesCommand, context: CommandContext) -> CommandResult[bool]:
        req = command.request
        
        profile = await self.repository.get_by_id(UserId(req.user_id))
        if not profile:
            return CommandResult(data=False, success=False, error="User not found")
            
        new_prefs = Preferences(theme=Theme(req.theme), language=req.language)
        profile.update_preferences(new_prefs)
        
        await self.repository.save(profile)
        return CommandResult(data=True)
""",
    "apps/api/app/application/users/update_preferences/command.py": """from app.platform.cqrs.contracts import Command
from app.application.users.update_preferences.dto import UpdatePreferencesRequest
from dataclasses import dataclass

@dataclass(frozen=True)
class UpdatePreferencesCommand(Command[bool]):
    request: UpdatePreferencesRequest
""",

    # 6. Tests
    "apps/api/tests/domain/shared/test_specifications.py": """from app.domain.shared.specifications.contracts import Specification

class IsEven(Specification[int]):
    def is_satisfied_by(self, candidate: int) -> bool:
        return candidate % 2 == 0

class IsPositive(Specification[int]):
    def is_satisfied_by(self, candidate: int) -> bool:
        return candidate > 0

def test_specifications_composition():
    even = IsEven()
    positive = IsPositive()
    
    even_and_positive = even.and_spec(positive)
    
    assert even_and_positive.is_satisfied_by(4) is True
    assert even_and_positive.is_satisfied_by(-2) is False
    assert even_and_positive.is_satisfied_by(3) is False
""",
    "apps/api/tests/domain/users/test_user_profile.py": """from app.domain.users.aggregates.user_profile import UserProfile
from app.domain.base.identifiers.types import UserId
from app.domain.users.value_objects.preferences import Preferences, Theme
from app.domain.users.value_objects.contact_information import ContactInformation
from app.domain.users.value_objects.profile_details import DisplayName
from app.domain.users.value_objects.identity_reference import IdentityReference

def test_user_profile_versioning():
    profile = UserProfile(
        id=UserId("u1"),
        identity=IdentityReference("auth0", "id1"),
        contact=ContactInformation("test@example.com"),
        display_name=DisplayName("John", "Doe")
    )
    
    assert profile.version == 1
    
    profile.update_preferences(Preferences(theme=Theme.DARK))
    assert profile.version == 2
    assert profile.preferences.theme == Theme.DARK
""",
    "apps/api/tests/application/users/test_create_profile.py": """from app.application.users.create_profile.dto import CreateProfileRequest
from app.domain.users.value_objects.profile_details import DisplayName

def test_display_name_full_name():
    dn = DisplayName(first_name="Jane", last_name="Doe")
    assert dn.full_name == "Jane Doe"
"""
}

dirs = [
    "apps/api/app/domain/shared/specifications",
    "apps/api/app/domain/shared/notifications",
    "apps/api/app/domain/shared/errors",
    "apps/api/app/domain/repositories",
    "apps/api/app/domain/base/entities",
    "apps/api/app/domain/users/value_objects",
    "apps/api/app/domain/users/aggregates",
    "apps/api/app/domain/users/events",
    "apps/api/app/domain/users/repositories",
    "apps/api/app/application/users/create_profile",
    "apps/api/app/application/users/update_preferences",
    "apps/api/tests/domain/shared",
    "apps/api/tests/domain/users",
    "apps/api/tests/application/users",
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

print("Phase 9 User Profile Architecture and Scaffolding Complete.")
