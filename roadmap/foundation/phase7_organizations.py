import os

files = {
    # ---------------------------------------------------------
    # 1. Platform CQRS
    # ---------------------------------------------------------
    "apps/api/app/platform/cqrs/__init__.py": "",
    "apps/api/app/platform/cqrs/contracts.py": """from abc import ABC, abstractmethod
from typing import TypeVar, Generic, Any, Optional

TResult = TypeVar('TResult')

class Command(Generic[TResult], ABC):
    pass

class Query(Generic[TResult], ABC):
    pass

class CommandResult(Generic[TResult]):
    def __init__(self, data: TResult, success: bool = True, error: Optional[str] = None):
        self.data = data
        self.success = success
        self.error = error

class QueryResult(Generic[TResult]):
    def __init__(self, data: TResult):
        self.data = data

class CommandContext(ABC):
    pass

class QueryContext(ABC):
    pass

class CommandHandler(Generic[TResult], ABC):
    @abstractmethod
    async def handle(self, command: Command[TResult], context: CommandContext) -> CommandResult[TResult]:
        pass

class QueryHandler(Generic[TResult], ABC):
    @abstractmethod
    async def handle(self, query: Query[TResult], context: QueryContext) -> QueryResult[TResult]:
        pass

class PipelineBehavior(ABC):
    @abstractmethod
    async def handle(self, request: Any, next_behavior: Any) -> Any:
        pass

class RetryPolicy(PipelineBehavior, ABC): pass
class TransactionBehavior(PipelineBehavior, ABC): pass
class ValidationBehavior(PipelineBehavior, ABC): pass
class AuthorizationBehavior(PipelineBehavior, ABC): pass
class LoggingBehavior(PipelineBehavior, ABC): pass
""",
    # ---------------------------------------------------------
    # 2. Platform Mediator
    # ---------------------------------------------------------
    "apps/api/app/platform/mediator/__init__.py": "",
    "apps/api/app/platform/mediator/contracts.py": """from abc import ABC, abstractmethod
from typing import TypeVar, Generic, Any

TResponse = TypeVar('TResponse')

class Request(Generic[TResponse], ABC):
    pass

class StreamRequest(Generic[TResponse], ABC):
    pass

class Notification(ABC):
    pass

class NotificationHandler(Generic[Notification], ABC):
    @abstractmethod
    async def handle(self, notification: Notification) -> None:
        pass

class Mediator(ABC):
    @abstractmethod
    async def send(self, request: Request[TResponse]) -> TResponse:
        pass
        
    @abstractmethod
    async def publish(self, notification: Notification) -> None:
        pass
""",
    # ---------------------------------------------------------
    # 3. Integration Contracts
    # ---------------------------------------------------------
    "apps/api/app/interfaces/integration/__init__.py": "",
    "apps/api/app/interfaces/integration/providers.py": """from abc import ABC, abstractmethod

class EmailProvider(ABC): pass
class SmsProvider(ABC): pass
class PushNotificationProvider(ABC): pass
class WebhookPublisher(ABC): pass
class StorageProvider(ABC): pass
class PdfProvider(ABC): pass
class SearchProvider(ABC): pass
class AiProvider(ABC): pass
class CalendarProvider(ABC): pass
class AuditProvider(ABC): pass
""",
    # ---------------------------------------------------------
    # 4. Domain: Organizations Bounded Context
    # ---------------------------------------------------------
    "apps/api/app/domain/organizations/aggregates/__init__.py": "",
    "apps/api/app/domain/organizations/aggregates/organization.py": """from dataclasses import dataclass, field
from typing import List, Optional
from app.domain.base.entities.base import AggregateRoot
from app.domain.base.identifiers.types import OrganizationId, UserId
from app.domain.organizations.entities.workspace import Workspace
from app.domain.organizations.entities.membership import Membership
from app.domain.organizations.events.events import OrganizationCreated, WorkspaceCreated, MembershipInvited
from app.domain.shared.clock import Clock

@dataclass(kw_only=True)
class OrganizationSettings:
    allow_guest_invites: bool = False
    max_workspaces: int = 5

@dataclass(kw_only=True)
class OrganizationMetadata:
    name: str
    tax_id: Optional[str] = None

@dataclass(kw_only=True)
class Organization(AggregateRoot):
    id: OrganizationId = field(default_factory=OrganizationId)
    metadata: OrganizationMetadata
    settings: OrganizationSettings = field(default_factory=OrganizationSettings)
    _workspaces: List[Workspace] = field(default_factory=list, init=False)
    _memberships: List[Membership] = field(default_factory=list, init=False)
    
    @classmethod
    def create(cls, id: OrganizationId, metadata: OrganizationMetadata, clock: Clock, created_by: UserId) -> 'Organization':
        org = cls(id=id, metadata=metadata, created_by=created_by.value)
        org.mark_created(clock)
        # Assuming event id and others are generated inside DomainEvent metadata hook
        org.raise_event(OrganizationCreated(org.id.value, metadata.name))
        return org
        
    def add_workspace(self, workspace: Workspace, clock: Clock) -> None:
        self._workspaces.append(workspace)
        self.mark_updated(clock)
        self.raise_event(WorkspaceCreated(self.id.value, workspace.id.value, workspace.name))
        
    def invite_member(self, membership: Membership, clock: Clock) -> None:
        self._memberships.append(membership)
        self.mark_updated(clock)
        self.raise_event(MembershipInvited(self.id.value, membership.user_id.value))
""",
    "apps/api/app/domain/organizations/entities/__init__.py": "",
    "apps/api/app/domain/organizations/entities/workspace.py": """from dataclasses import dataclass, field
from typing import Optional
from app.domain.base.entities.base import Entity, AuditableEntity
from app.domain.base.identifiers.types import OrganizationId
from app.domain.shared.clock import Clock
import uuid

@dataclass(kw_only=True)
class WorkspaceSettings:
    is_default: bool = False

@dataclass(kw_only=True)
class Workspace(AuditableEntity):
    id: OrganizationId = field(default_factory=OrganizationId) # WorkspaceId can be added to identifiers later
    name: str
    settings: WorkspaceSettings = field(default_factory=WorkspaceSettings)
""",
    "apps/api/app/domain/organizations/entities/membership.py": """from dataclasses import dataclass, field
from enum import Enum
from app.domain.base.entities.base import Entity, TimestampedEntity
from app.domain.base.identifiers.types import OrganizationId, UserId
from typing import Optional

class MembershipStatus(str, Enum):
    INVITED = "invited"
    ACTIVE = "active"
    SUSPENDED = "suspended"

@dataclass(frozen=True)
class InvitationReference:
    email: str
    token: str

@dataclass(kw_only=True)
class Membership(TimestampedEntity):
    user_id: UserId
    status: MembershipStatus = MembershipStatus.INVITED
    invitation: Optional[InvitationReference] = None
""",
    "apps/api/app/domain/organizations/value_objects/__init__.py": "",
    "apps/api/app/domain/organizations/value_objects/organization_reference.py": """from dataclasses import dataclass
from app.domain.base.identifiers.types import OrganizationId

@dataclass(frozen=True)
class OrganizationReference:
    id: OrganizationId
    name: str
""",
    "apps/api/app/domain/organizations/events/__init__.py": "",
    "apps/api/app/domain/organizations/events/events.py": """from dataclasses import dataclass
from app.domain.events.contracts import DomainEvent

@dataclass(frozen=True)
class OrganizationCreated(DomainEvent):
    organization_id: str
    name: str

@dataclass(frozen=True)
class OrganizationUpdated(DomainEvent):
    organization_id: str

@dataclass(frozen=True)
class WorkspaceCreated(DomainEvent):
    organization_id: str
    workspace_id: str
    name: str

@dataclass(frozen=True)
class WorkspaceArchived(DomainEvent):
    organization_id: str
    workspace_id: str

@dataclass(frozen=True)
class MembershipInvited(DomainEvent):
    organization_id: str
    user_id: str

@dataclass(frozen=True)
class MembershipRemoved(DomainEvent):
    organization_id: str
    user_id: str
""",
    "apps/api/app/domain/organizations/policies/__init__.py": "",
    "apps/api/app/domain/organizations/policies/organization_policy.py": """from abc import ABC, abstractmethod
from app.domain.organizations.aggregates.organization import Organization

class OrganizationLifecyclePolicy(ABC):
    @abstractmethod
    def can_archive(self, org: Organization) -> bool: pass

class WorkspacePolicy(ABC):
    @abstractmethod
    def can_create_workspace(self, org: Organization) -> bool: pass

class MembershipPolicy(ABC):
    @abstractmethod
    def can_invite_member(self, org: Organization) -> bool: pass
""",
    "apps/api/app/domain/organizations/repositories/__init__.py": "",
    "apps/api/app/domain/organizations/repositories/organization_repository.py": """from abc import ABC, abstractmethod
from typing import Optional
from app.domain.repositories.contracts import Repository
from app.domain.organizations.aggregates.organization import Organization
from app.domain.base.identifiers.types import OrganizationId

class OrganizationRepository(Repository[Organization], ABC):
    @abstractmethod
    async def get_by_id_with_workspaces(self, org_id: OrganizationId) -> Optional[Organization]:
        pass
""",
    
    # ---------------------------------------------------------
    # 5. Application Layer: Organizations
    # ---------------------------------------------------------
    "apps/api/app/application/organizations/create_organization/__init__.py": "",
    "apps/api/app/application/organizations/create_organization/dto.py": """from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class CreateOrganizationRequest:
    name: str
    tax_id: Optional[str] = None
    created_by_user_id: str

@dataclass(frozen=True)
class CreateOrganizationResponse:
    organization_id: str
""",
    "apps/api/app/application/organizations/create_organization/command.py": """from app.platform.cqrs.contracts import Command
from app.application.organizations.create_organization.dto import CreateOrganizationRequest, CreateOrganizationResponse
from dataclasses import dataclass

@dataclass(frozen=True)
class CreateOrganizationCommand(Command[CreateOrganizationResponse]):
    request: CreateOrganizationRequest
""",
    "apps/api/app/application/organizations/create_organization/handler.py": """from app.platform.cqrs.contracts import CommandHandler, CommandContext, CommandResult
from app.application.organizations.create_organization.command import CreateOrganizationCommand
from app.application.organizations.create_organization.dto import CreateOrganizationResponse
from app.domain.organizations.aggregates.organization import Organization, OrganizationMetadata
from app.domain.organizations.repositories.organization_repository import OrganizationRepository
from app.domain.base.identifiers.types import OrganizationId, UserId
from app.domain.shared.clock import Clock

class CreateOrganizationHandler(CommandHandler[CreateOrganizationResponse]):
    def __init__(self, repository: OrganizationRepository, clock: Clock):
        self.repository = repository
        self.clock = clock

    async def handle(self, command: CreateOrganizationCommand, context: CommandContext) -> CommandResult[CreateOrganizationResponse]:
        req = command.request
        
        metadata = OrganizationMetadata(name=req.name, tax_id=req.tax_id)
        org_id = OrganizationId()
        user_id = UserId(req.created_by_user_id)
        
        org = Organization.create(
            id=org_id, 
            metadata=metadata, 
            clock=self.clock, 
            created_by=user_id
        )
        
        await self.repository.add(org)
        
        return CommandResult(data=CreateOrganizationResponse(organization_id=org_id.value))
""",
    "apps/api/app/application/organizations/create_workspace/__init__.py": "",
    "apps/api/app/application/organizations/create_workspace/command.py": """from app.platform.cqrs.contracts import Command
from dataclasses import dataclass

@dataclass(frozen=True)
class CreateWorkspaceCommand(Command[bool]):
    organization_id: str
    name: str
""",
    "apps/api/app/application/organizations/invite_member/__init__.py": "",
    "apps/api/app/application/organizations/invite_member/command.py": """from app.platform.cqrs.contracts import Command
from dataclasses import dataclass

@dataclass(frozen=True)
class InviteMemberCommand(Command[bool]):
    organization_id: str
    email: str
""",

    # ---------------------------------------------------------
    # TESTS
    # ---------------------------------------------------------
    "apps/api/tests/platform/test_cqrs.py": """from app.platform.cqrs.contracts import Command, CommandResult

class DummyCommand(Command[str]):
    pass

def test_command_result():
    res = CommandResult(data="success")
    assert res.success is True
    assert res.data == "success"
""",
    "apps/api/tests/domain/organizations/test_aggregate.py": """from app.domain.organizations.aggregates.organization import Organization, OrganizationMetadata
from app.domain.base.identifiers.types import OrganizationId, UserId
from app.domain.shared.clock import FrozenClock
from datetime import datetime, timezone

def test_organization_creation():
    clock = FrozenClock(datetime(2026, 1, 1, tzinfo=timezone.utc))
    org_id = OrganizationId()
    user_id = UserId()
    
    org = Organization.create(
        id=org_id,
        metadata=OrganizationMetadata(name="TallyMe Inc"),
        clock=clock,
        created_by=user_id
    )
    
    assert org.metadata.name == "TallyMe Inc"
    assert org.created_at == clock.now()
    assert len(org.events()) == 1
    assert org.events()[0].name == "TallyMe Inc"
"""
}

dirs = [
    "apps/api/app/platform/cqrs",
    "apps/api/app/platform/mediator",
    "apps/api/app/interfaces/integration",
    "apps/api/app/domain/organizations/aggregates",
    "apps/api/app/domain/organizations/entities",
    "apps/api/app/domain/organizations/value_objects",
    "apps/api/app/domain/organizations/events",
    "apps/api/app/domain/organizations/policies",
    "apps/api/app/domain/organizations/repositories",
    "apps/api/app/application/organizations/create_organization",
    "apps/api/app/application/organizations/create_workspace",
    "apps/api/app/application/organizations/invite_member",
    "apps/api/tests/platform",
    "apps/api/tests/domain/organizations",
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

print("Platform Hardening & Phase 7 scaffolding complete.")
