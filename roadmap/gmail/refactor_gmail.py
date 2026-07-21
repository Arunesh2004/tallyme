import os
import shutil

base_dir = "apps/api/app"
gmail_dir = os.path.join(base_dir, "integrations", "gmail")
tests_dir = "apps/api/tests"
tests_gmail_dir = os.path.join(tests_dir, "integrations", "gmail")

moves = [
    # Application Slices
    (os.path.join(base_dir, "application", "gmail"), os.path.join(gmail_dir, "application")),
    
    # Domain
    (os.path.join(gmail_dir, "models"), os.path.join(gmail_dir, "domain", "models")),
    (os.path.join(gmail_dir, "events"), os.path.join(gmail_dir, "domain", "events")),
    (os.path.join(gmail_dir, "repositories"), os.path.join(gmail_dir, "domain", "repositories")),
    (os.path.join(gmail_dir, "services"), os.path.join(gmail_dir, "domain", "services")),
    (os.path.join(gmail_dir, "exceptions"), os.path.join(gmail_dir, "domain", "exceptions")),
    
    # Infrastructure
    (os.path.join(gmail_dir, "authentication"), os.path.join(gmail_dir, "infrastructure", "authentication")),
    (os.path.join(gmail_dir, "watch"), os.path.join(gmail_dir, "infrastructure", "watch")),
    (os.path.join(gmail_dir, "history"), os.path.join(gmail_dir, "infrastructure", "history")),
    (os.path.join(gmail_dir, "messages"), os.path.join(gmail_dir, "infrastructure", "messages")),
    (os.path.join(gmail_dir, "attachments"), os.path.join(gmail_dir, "infrastructure", "attachments")),
    
    # Tests
    (os.path.join(tests_dir, "application", "gmail"), os.path.join(tests_gmail_dir, "application")),
]

# Create missing directories
dirs_to_create = [
    os.path.join(gmail_dir, "domain", "value_objects"),
    os.path.join(gmail_dir, "infrastructure", "adapters"),
    os.path.join(gmail_dir, "contracts")
]

for src, dest in moves:
    if os.path.exists(src) and not os.path.exists(dest):
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.move(src, dest)
        print(f"Moved {src} to {dest}")

for d in dirs_to_create:
    os.makedirs(d, exist_ok=True)
    init_file = os.path.join(d, "__init__.py")
    if not os.path.exists(init_file):
        with open(init_file, "w") as f:
            pass
    print(f"Created {d}")

readme_content = """# Gmail Integration Bounded Context

## Purpose
This module handles all synchronization, message parsing, and webhook integration for Gmail. It runs as an autonomous bounded context that reliably monitors configured mailboxes (like fees@tallyme.com) to automatically process incoming notifications.

## Architecture
The Gmail bounded context implements a strict modular architecture isolating external dependencies from domain models. 

## Flow
1. **Infrastructure**: Authenticates via OAuth2 and receives incoming push notifications from Google Pub/Sub (Watch).
2. **Application**: Interprets notifications to determine changes. Executes use-cases to pull incremental History or Fetch specific messages.
3. **Domain**: Evaluates business invariants on the Mailbox state, generating Domain Events for successfully acquired items.

## Folder Responsibilities
- `application/`: CQRS vertical slices encapsulating the functional use-cases (e.g., Connect Mailbox, Sync History).
- `domain/`: Pure domain models, events, exceptions, and repository contracts for Gmail interactions. Free of vendor specific SDKs.
- `infrastructure/`: Implementation details (e.g., calling the Google SDK) fulfilling the contracts.
- `contracts/`: Abstract endpoints representing integration surfaces.

## Dependency Direction
`application/` -> `domain/` -> `contracts/` -> `infrastructure/`

The inner layers (Domain, Contracts) never depend on outer layers.

## Future Extension Points
- Implement concrete Google SDK infrastructure adapters in `infrastructure/adapters/`.
- Introduce DLQ management for failed WebHook deliveries.
"""

readme_path = os.path.join(gmail_dir, "README.md")
with open(readme_path, "w") as f:
    f.write(readme_content)
print(f"Created {readme_path}")

print("Gmail Architecture Refactoring Complete.")
