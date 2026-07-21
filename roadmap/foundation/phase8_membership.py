import os

files = {
    # ---------------------------------------------------------
    # 1. Pipeline Behaviors (Interfaces Only)
    # ---------------------------------------------------------
    "apps/api/app/platform/cqrs/behaviors.py": """from abc import ABC, abstractmethod
from typing import Any

class PipelineBehavior(ABC):
    @abstractmethod
    async def handle(self, request: Any, next_behavior: Any) -> Any:
        pass

class TracingBehavior(PipelineBehavior, ABC): pass
class AuditBehavior(PipelineBehavior, ABC): pass
class ResilienceBehavior(PipelineBehavior, ABC): pass
class TimeoutBehavior(PipelineBehavior, ABC): pass
""",
    # ---------------------------------------------------------
    # 2. Domain Events Base (Immutable, rich metadata)
    # ---------------------------------------------------------
    "apps/api/app/domain/events/contracts.py": """from dataclasses import dataclass, field
import uuid
from datetime import datetime, timezone

@dataclass(frozen=True)
class DomainEvent:
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    aggregate_version: int = 1
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    correlation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    causation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
""",
    # ---------------------------------------------------------
    # 3. Organization Roles
    # ---------------------------------------------------------
    "apps/api/app/domain/organizations/value_objects/organization_role.py": """from dataclasses import dataclass
from enum import Enum

class RoleName(str, Enum):
    OWNER = "owner"
    ADMINISTRATOR = "administrator"
    GUEST = "guest"

@dataclass(frozen=True)
class OrganizationRole:
    name: RoleName
""",
    # ---------------------------------------------------------
    # 4. Membership & Invitation Status
    # ---------------------------------------------------------
    "apps/api/app/domain/organizations/entities/membership_status.py": """from enum import Enum

class MembershipStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    REMOVED = "removed"

class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"
    REVOKED = "revoked"
""",
    "apps/api/app/domain/organizations/entities/membership.py": """from dataclasses import dataclass, field
from app.domain.base.entities.base import TimestampedEntity
from app.domain.base.identifiers.types import UserId
from app.domain.organizations.value_objects.organization_role import OrganizationRole
from app.domain.organizations.entities.membership_status import MembershipStatus, InvitationStatus
from typing import Optional

@dataclass(frozen=True)
class InvitationReference:
    email: str
    token: str
    status: InvitationStatus = InvitationStatus.PENDING

@dataclass(kw_only=True)
class Membership(TimestampedEntity):
    user_id: UserId
    role: OrganizationRole
    status: MembershipStatus = MembershipStatus.PENDING
    invitation: Optional[InvitationReference] = None
""",
    # ---------------------------------------------------------
    # 5. Domain Factories
    # ---------------------------------------------------------
    "apps/api/app/domain/organizations/factories/membership_factory.py": """from app.domain.organizations.entities.membership import Membership, InvitationReference
from app.domain.base.identifiers.types import UserId
from app.domain.organizations.value_objects.organization_role import OrganizationRole, RoleName
from app.domain.organizations.entities.membership_status import MembershipStatus, InvitationStatus

class MembershipFactory:
    @staticmethod
    def create_pending_invitation(user_id: UserId, role: OrganizationRole, email: str, token: str) -> Membership:
        invitation = InvitationReference(email=email, token=token, status=InvitationStatus.PENDING)
        return Membership(
            user_id=user_id,
            role=role,
            status=MembershipStatus.PENDING,
            invitation=invitation
        )
        
    @staticmethod
    def create_owner(user_id: UserId) -> Membership:
        role = OrganizationRole(name=RoleName.OWNER)
        return Membership(
            user_id=user_id,
            role=role,
            status=MembershipStatus.ACTIVE
        )
""",
    # ---------------------------------------------------------
    # 6. Domain Services
    # ---------------------------------------------------------
    "apps/api/app/domain/organizations/services/membership_service.py": """from app.domain.organizations.aggregates.organization import Organization
from app.domain.organizations.entities.membership import Membership
from app.domain.organizations.factories.membership_factory import MembershipFactory
from app.domain.organizations.policies.organization_policy import MembershipPolicy
from app.domain.shared.clock import Clock

class MembershipDomainService:
    def __init__(self, policy: MembershipPolicy, factory: MembershipFactory, clock: Clock):
        self.policy = policy
        self.factory = factory
        self.clock = clock

    def orchestrate_invitation(self, org: Organization, membership: Membership) -> None:
        if self.policy.can_invite_member(org):
            org.invite_member(membership, self.clock)
""",
    # ---------------------------------------------------------
    # 7. Rule Catalog
    # ---------------------------------------------------------
    "apps/api/app/domain/organizations/rules/rule_catalog.py": """from abc import ABC, abstractmethod
from typing import Dict, Type

class BusinessRule(ABC):
    @abstractmethod
    def evaluate(self, *args, **kwargs) -> bool:
        pass

class RuleCatalog:
    _rules: Dict[str, Type[BusinessRule]] = {}

    @classmethod
    def register(cls, name: str, rule: Type[BusinessRule]):
        cls._rules[name] = rule

    @classmethod
    def get_rule(cls, name: str) -> Type[BusinessRule]:
        return cls._rules.get(name)
""",
    # ---------------------------------------------------------
    # 8. Application Mappers
    # ---------------------------------------------------------
    "apps/api/app/application/mappers/mapper.py": """from abc import ABC, abstractmethod
from typing import TypeVar, Generic

TSource = TypeVar('TSource')
TDestination = TypeVar('TDestination')

class Mapper(Generic[TSource, TDestination], ABC):
    @abstractmethod
    def map(self, source: TSource) -> TDestination:
        pass
""",
    # ---------------------------------------------------------
    # 9. Application Slices (Invite Member)
    # ---------------------------------------------------------
    "apps/api/app/application/organizations/invite_member/dto.py": """from dataclasses import dataclass

@dataclass(frozen=True)
class InviteMemberRequest:
    organization_id: str
    email: str
    role: str

@dataclass(frozen=True)
class InviteMemberResponse:
    success: bool
    message: str
""",
    "apps/api/app/application/organizations/invite_member/validator.py": """from app.application.organizations.invite_member.dto import InviteMemberRequest

class InviteMemberValidator:
    def validate(self, request: InviteMemberRequest) -> bool:
        if not request.email or "@" not in request.email:
            return False
        return True
""",
    "apps/api/app/application/organizations/invite_member/handler.py": """from app.platform.cqrs.contracts import CommandHandler, CommandContext, CommandResult
from app.application.organizations.invite_member.command import InviteMemberCommand
from app.application.organizations.invite_member.dto import InviteMemberResponse
from app.domain.organizations.repositories.organization_repository import OrganizationRepository
from app.domain.organizations.services.membership_service import MembershipDomainService
from app.domain.organizations.factories.membership_factory import MembershipFactory
from app.domain.base.identifiers.types import OrganizationId, UserId
from app.domain.organizations.value_objects.organization_role import OrganizationRole, RoleName
import uuid

class InviteMemberHandler(CommandHandler[InviteMemberResponse]):
    def __init__(self, repository: OrganizationRepository, service: MembershipDomainService, factory: MembershipFactory):
        self.repository = repository
        self.service = service
        self.factory = factory

    async def handle(self, command: InviteMemberCommand, context: CommandContext) -> CommandResult[InviteMemberResponse]:
        req = command.request
        org_id = OrganizationId(req.organization_id)
        org = await self.repository.get_by_id_with_workspaces(org_id)
        
        if not org:
            return CommandResult(data=InviteMemberResponse(success=False, message="Organization not found"), success=False)
            
        role = OrganizationRole(name=RoleName(req.role))
        user_id = UserId(str(uuid.uuid4()))
        token = str(uuid.uuid4())
        
        membership = self.factory.create_pending_invitation(user_id, role, req.email, token)
        self.service.orchestrate_invitation(org, membership)
        
        await self.repository.update(org)
        
        return CommandResult(data=InviteMemberResponse(success=True, message="Invited successfully"))
""",
    "apps/api/app/application/organizations/invite_member/command.py": """from app.platform.cqrs.contracts import Command
from app.application.organizations.invite_member.dto import InviteMemberRequest, InviteMemberResponse
from dataclasses import dataclass

@dataclass(frozen=True)
class InviteMemberCommand(Command[InviteMemberResponse]):
    request: InviteMemberRequest
""",
    # ---------------------------------------------------------
    # 10. Tests
    # ---------------------------------------------------------
    "apps/api/tests/domain/organizations/test_membership_lifecycle.py": """from app.domain.organizations.entities.membership_status import MembershipStatus, InvitationStatus
from app.domain.organizations.entities.membership import Membership, InvitationReference
from app.domain.base.identifiers.types import UserId
from app.domain.organizations.value_objects.organization_role import OrganizationRole, RoleName

def test_invitation_lifecycle():
    role = OrganizationRole(name=RoleName.GUEST)
    user_id = UserId("user-123")
    
    invitation = InvitationReference(email="test@example.com", token="abc", status=InvitationStatus.PENDING)
    membership = Membership(user_id=user_id, role=role, status=MembershipStatus.PENDING, invitation=invitation)
    
    assert membership.status == MembershipStatus.PENDING
    assert membership.invitation.status == InvitationStatus.PENDING
""",
    "apps/api/tests/domain/organizations/test_factories.py": """from app.domain.organizations.factories.membership_factory import MembershipFactory
from app.domain.base.identifiers.types import UserId
from app.domain.organizations.value_objects.organization_role import OrganizationRole, RoleName
from app.domain.organizations.entities.membership_status import MembershipStatus, InvitationStatus

def test_create_pending_invitation():
    factory = MembershipFactory()
    role = OrganizationRole(name=RoleName.ADMINISTRATOR)
    user_id = UserId("user-123")
    
    membership = factory.create_pending_invitation(user_id, role, "admin@example.com", "token123")
    
    assert membership.status == MembershipStatus.PENDING
    assert membership.invitation.email == "admin@example.com"
    assert membership.invitation.status == InvitationStatus.PENDING
""",
    "apps/api/tests/domain/organizations/test_rules.py": """from app.domain.organizations.rules.rule_catalog import RuleCatalog, BusinessRule

class DummyRule(BusinessRule):
    def evaluate(self) -> bool:
        return True

def test_rule_catalog():
    RuleCatalog.register("dummy", DummyRule)
    rule_cls = RuleCatalog.get_rule("dummy")
    assert rule_cls is not None
    rule = rule_cls()
    assert rule.evaluate() is True
""",
    "apps/api/tests/application/organizations/test_invite_member.py": """from app.application.organizations.invite_member.dto import InviteMemberRequest
from app.application.organizations.invite_member.validator import InviteMemberValidator

def test_invite_member_validator():
    validator = InviteMemberValidator()
    
    req_valid = InviteMemberRequest(organization_id="org-1", email="test@example.com", role="guest")
    assert validator.validate(req_valid) is True
    
    req_invalid = InviteMemberRequest(organization_id="org-1", email="invalid-email", role="guest")
    assert validator.validate(req_invalid) is False
"""
}

dirs = [
    "apps/api/app/platform/cqrs",
    "apps/api/app/domain/events",
    "apps/api/app/domain/organizations/value_objects",
    "apps/api/app/domain/organizations/entities",
    "apps/api/app/domain/organizations/factories",
    "apps/api/app/domain/organizations/services",
    "apps/api/app/domain/organizations/rules",
    "apps/api/app/application/mappers",
    "apps/api/app/application/organizations/invite_member",
    "apps/api/tests/domain/organizations",
    "apps/api/tests/application/organizations",
]

import os

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

print("Phase 8 Membership Architecture and Scaffolding Complete.")
