import os

files = {
    # =========================================================
    # PHASE A1: GMAIL INTEGRATION FOUNDATION
    # =========================================================

    # 1. OAuth2 Contracts
    "apps/api/app/integrations/gmail/authentication/__init__.py": "",
    "apps/api/app/integrations/gmail/authentication/contracts.py": """from abc import ABC, abstractmethod

class GmailAuthenticator(ABC):
    @abstractmethod
    async def authenticate(self) -> str:
        pass

class TokenProvider(ABC):
    @abstractmethod
    async def get_token(self) -> str:
        pass

class CredentialStore(ABC):
    @abstractmethod
    async def store_credentials(self, credentials: dict) -> None:
        pass

class TokenRefresher(ABC):
    @abstractmethod
    async def refresh_token(self) -> str:
        pass
""",

    # 2. Mailbox Models
    "apps/api/app/integrations/gmail/models/__init__.py": "",
    "apps/api/app/integrations/gmail/models/mailbox.py": """from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime

@dataclass(frozen=True)
class MessageId:
    value: str

@dataclass(frozen=True)
class ThreadId:
    value: str

@dataclass(frozen=True)
class HistoryId:
    value: str

@dataclass(frozen=True)
class AttachmentReference:
    attachment_id: str
    filename: str
    mime_type: str
    size: int

@dataclass(frozen=True)
class MessageMetadata:
    subject: str
    sender: str
    recipient: str
    date: datetime
    snippet: str

@dataclass(kw_only=True)
class MailboxMessage:
    message_id: MessageId
    thread_id: ThreadId
    history_id: HistoryId
    metadata: MessageMetadata
    attachments: List[AttachmentReference] = field(default_factory=list)
    raw_content: Optional[str] = None

@dataclass(kw_only=True)
class Mailbox:
    email_address: str
    last_history_id: Optional[HistoryId] = None
    is_watch_active: bool = False
    watch_expiration: Optional[datetime] = None
""",

    # 3. Watch Infrastructure
    "apps/api/app/integrations/gmail/watch/__init__.py": "",
    "apps/api/app/integrations/gmail/watch/contracts.py": """from abc import ABC, abstractmethod
from typing import Optional
from datetime import datetime

class WatchRegistration(ABC):
    @abstractmethod
    async def register(self, email_address: str) -> bool:
        pass

class WatchRenewal(ABC):
    @abstractmethod
    async def renew(self, email_address: str) -> datetime:
        pass

class PushNotification(ABC):
    pass

class HistoryTracker(ABC):
    @abstractmethod
    async def update_history_id(self, history_id: str) -> None:
        pass

class WatchService(ABC):
    @abstractmethod
    async def start_watch(self) -> None:
        pass

    @abstractmethod
    async def handle_push_notification(self, notification: PushNotification) -> None:
        pass
""",

    # 4. History Sync
    "apps/api/app/integrations/gmail/history/__init__.py": "",
    "apps/api/app/integrations/gmail/history/contracts.py": """from abc import ABC, abstractmethod

class HistoryCursor(ABC):
    pass

class IncrementalSync(ABC):
    @abstractmethod
    async def sync_incremental(self, start_history_id: str) -> None:
        pass

class Replay(ABC):
    @abstractmethod
    async def replay_history(self, history_id: str) -> None:
        pass

class Recovery(ABC):
    @abstractmethod
    async def recover(self) -> None:
        pass

class Checkpoint(ABC):
    @abstractmethod
    async def save_checkpoint(self, history_id: str) -> None:
        pass
""",

    # 5. Message Retrieval & Attachments
    "apps/api/app/integrations/gmail/messages/__init__.py": "",
    "apps/api/app/integrations/gmail/messages/contracts.py": """from abc import ABC, abstractmethod
from typing import List, Any
from app.integrations.gmail.models.mailbox import MailboxMessage

class ListMessages(ABC):
    @abstractmethod
    async def list(self, query: str) -> List[str]:
        pass

class FetchMessage(ABC):
    @abstractmethod
    async def fetch(self, message_id: str) -> MailboxMessage:
        pass

class MarkProcessed(ABC):
    @abstractmethod
    async def mark(self, message_id: str) -> None:
        pass
""",
    "apps/api/app/integrations/gmail/attachments/__init__.py": "",
    "apps/api/app/integrations/gmail/attachments/contracts.py": """from abc import ABC, abstractmethod

class DownloadAttachment(ABC):
    @abstractmethod
    async def download(self, message_id: str, attachment_id: str) -> bytes:
        pass
""",

    # 6. Background Processing
    "apps/api/app/integrations/gmail/services/__init__.py": "",
    "apps/api/app/integrations/gmail/services/contracts.py": """from abc import ABC, abstractmethod
from typing import Any

class MailboxWorker(ABC):
    @abstractmethod
    async def run(self) -> None:
        pass

class MessageConsumer(ABC):
    @abstractmethod
    async def consume(self, message: Any) -> None:
        pass

class RetryQueue(ABC):
    @abstractmethod
    async def enqueue_for_retry(self, item: Any) -> None:
        pass

class DeadLetterQueue(ABC):
    @abstractmethod
    async def send_to_dlq(self, item: Any) -> None:
        pass
""",

    # 7. Domain Events
    "apps/api/app/integrations/gmail/events/__init__.py": "",
    "apps/api/app/integrations/gmail/events/events.py": """from dataclasses import dataclass
from app.domain.events.contracts import DomainEvent
from datetime import datetime

@dataclass(frozen=True)
class MailboxConnected(DomainEvent):
    email_address: str

@dataclass(frozen=True)
class WatchStarted(DomainEvent):
    email_address: str
    expiration: datetime

@dataclass(frozen=True)
class WatchRenewed(DomainEvent):
    email_address: str
    new_expiration: datetime

@dataclass(frozen=True)
class MessageReceived(DomainEvent):
    message_id: str

@dataclass(frozen=True)
class AttachmentDownloaded(DomainEvent):
    message_id: str
    attachment_id: str

@dataclass(frozen=True)
class HistoryRecovered(DomainEvent):
    history_id: str
""",

    # 8. Repositories
    "apps/api/app/integrations/gmail/repositories/__init__.py": "",
    "apps/api/app/integrations/gmail/repositories/contracts.py": """from abc import ABC, abstractmethod
from typing import Optional
from app.integrations.gmail.models.mailbox import Mailbox, MailboxMessage

class MailboxRepository(ABC):
    @abstractmethod
    async def get_mailbox(self, email_address: str) -> Optional[Mailbox]:
        pass

    @abstractmethod
    async def save(self, mailbox: Mailbox) -> None:
        pass

class HistoryRepository(ABC):
    @abstractmethod
    async def get_last_history_id(self) -> Optional[str]:
        pass

    @abstractmethod
    async def update_history_id(self, history_id: str) -> None:
        pass

class MessageRepository(ABC):
    @abstractmethod
    async def get_message(self, message_id: str) -> Optional[MailboxMessage]:
        pass

    @abstractmethod
    async def save(self, message: MailboxMessage) -> None:
        pass
""",
    
    # Exceptions
    "apps/api/app/integrations/gmail/exceptions/__init__.py": "",
    "apps/api/app/integrations/gmail/exceptions/errors.py": """class GmailIntegrationError(Exception):
    pass

class AuthenticationError(GmailIntegrationError):
    pass

class WatchRegistrationError(GmailIntegrationError):
    pass
""",

    # 9. Application Vertical Slices
    "apps/api/app/application/gmail/connect_mailbox/__init__.py": "",
    "apps/api/app/application/gmail/connect_mailbox/handler.py": """from app.platform.cqrs.contracts import CommandHandler, CommandContext, CommandResult
from dataclasses import dataclass
from app.platform.cqrs.contracts import Command

@dataclass(frozen=True)
class ConnectMailboxRequest:
    auth_code: str

@dataclass(frozen=True)
class ConnectMailboxCommand(Command[str]):
    request: ConnectMailboxRequest

class ConnectMailboxHandler(CommandHandler[str]):
    async def handle(self, command: ConnectMailboxCommand, context: CommandContext) -> CommandResult[str]:
        # Orchestration only
        return CommandResult(data="connected")
""",
    "apps/api/app/application/gmail/start_watch/__init__.py": "",
    "apps/api/app/application/gmail/renew_watch/__init__.py": "",
    "apps/api/app/application/gmail/sync_history/__init__.py": "",
    "apps/api/app/application/gmail/fetch_message/__init__.py": "",

    # 10. Tests
    "apps/api/tests/integrations/gmail/test_contracts.py": """from app.integrations.gmail.authentication.contracts import GmailAuthenticator
from app.integrations.gmail.watch.contracts import WatchRegistration
from app.integrations.gmail.history.contracts import IncrementalSync

class DummyAuthenticator(GmailAuthenticator):
    async def authenticate(self) -> str:
        return "token"

def test_authenticator_interface():
    auth = DummyAuthenticator()
    assert hasattr(auth, 'authenticate')
""",
    "apps/api/tests/integrations/gmail/test_models.py": """from app.integrations.gmail.models.mailbox import Mailbox, HistoryId, MessageId, ThreadId, MessageMetadata, MailboxMessage
from datetime import datetime

def test_mailbox_model():
    mb = Mailbox(email_address="fees@tallyme.com", last_history_id=HistoryId("123"))
    assert mb.is_watch_active is False
    assert mb.last_history_id.value == "123"
""",
    "apps/api/tests/application/gmail/test_connect_mailbox.py": """from app.application.gmail.connect_mailbox.handler import ConnectMailboxRequest, ConnectMailboxCommand

def test_connect_mailbox_command():
    req = ConnectMailboxRequest(auth_code="auth-123")
    cmd = ConnectMailboxCommand(request=req)
    assert cmd.request.auth_code == "auth-123"
"""
}

dirs = [
    "apps/api/app/integrations/gmail/authentication",
    "apps/api/app/integrations/gmail/watch",
    "apps/api/app/integrations/gmail/history",
    "apps/api/app/integrations/gmail/messages",
    "apps/api/app/integrations/gmail/attachments",
    "apps/api/app/integrations/gmail/models",
    "apps/api/app/integrations/gmail/services",
    "apps/api/app/integrations/gmail/repositories",
    "apps/api/app/integrations/gmail/events",
    "apps/api/app/integrations/gmail/exceptions",
    "apps/api/app/application/gmail/connect_mailbox",
    "apps/api/app/application/gmail/start_watch",
    "apps/api/app/application/gmail/renew_watch",
    "apps/api/app/application/gmail/sync_history",
    "apps/api/app/application/gmail/fetch_message",
    "apps/api/tests/integrations/gmail",
    "apps/api/tests/application/gmail"
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

print("Phase A1 Gmail Integration Foundation Architecture and Scaffolding Complete.")
