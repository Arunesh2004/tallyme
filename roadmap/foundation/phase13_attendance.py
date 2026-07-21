import os

files = {
    # =========================================================
    # FINAL DOMAIN REFINEMENTS
    # =========================================================

    # 1. Scheduling Shared Concepts
    "apps/api/app/domain/shared/scheduling/__init__.py": "",
    "apps/api/app/domain/shared/scheduling/contracts.py": """from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, date

@dataclass(frozen=True)
class TimeSlot:
    start_time: datetime
    end_time: datetime

@dataclass(frozen=True)
class DateRange:
    start_date: date
    end_date: date

@dataclass(frozen=True)
class RecurringPattern:
    pattern_expression: str

@dataclass(frozen=True)
class ScheduleWindow:
    slot: TimeSlot
    is_flexible: bool = False

@dataclass(frozen=True)
class Conflict:
    description: str

class ConflictResolution(ABC):
    @abstractmethod
    def resolve(self, conflict: Conflict) -> bool:
        pass
""",

    # 2. Capacity Contracts
    "apps/api/app/domain/shared/capacity/__init__.py": "",
    "apps/api/app/domain/shared/capacity/contracts.py": """from abc import ABC, abstractmethod

class Capacity(ABC):
    pass

class CapacityLimit(ABC):
    pass

class CapacityAllocation(ABC):
    pass

class CapacityReservation(ABC):
    pass

class CapacitySnapshot(ABC):
    pass
""",

    # 3. Approval Framework
    "apps/api/app/domain/shared/approval/__init__.py": "",
    "apps/api/app/domain/shared/approval/contracts.py": """from abc import ABC, abstractmethod

class ApprovalRequest(ABC):
    pass

class ApprovalDecision(ABC):
    pass

class ApprovalHistory(ABC):
    pass

class ApprovalPolicy(ABC):
    pass

class ApprovalOutcome(ABC):
    pass
""",

    # 4. Lifecycle Framework
    "apps/api/app/domain/shared/lifecycle/__init__.py": "",
    "apps/api/app/domain/shared/lifecycle/contracts.py": """from abc import ABC, abstractmethod

class LifecycleState(ABC):
    pass

class StateTransition(ABC):
    pass

class TransitionPolicy(ABC):
    pass

class LifecycleHistory(ABC):
    pass

class LifecycleEvent(ABC):
    pass
""",

    # 5. Domain Validation Pipeline
    "apps/api/app/domain/shared/validation/__init__.py": "",
    "apps/api/app/domain/shared/validation/contracts.py": """from abc import ABC, abstractmethod
from enum import Enum

class ValidationSeverity(Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"

class ValidationContext(ABC):
    pass

class ValidationResult(ABC):
    pass

class ValidationRule(ABC):
    @abstractmethod
    def validate(self, context: ValidationContext) -> ValidationResult:
        pass

class ValidationPipeline(ABC):
    @abstractmethod
    def execute(self, rules: list[ValidationRule], context: ValidationContext) -> ValidationResult:
        pass
""",

    # =========================================================
    # PHASE 13: ATTENDANCE FOUNDATION
    # =========================================================

    # 2. Attendance Value Objects
    "apps/api/app/domain/attendance/value_objects/__init__.py": "",
    "apps/api/app/domain/attendance/value_objects/identifiers.py": """from dataclasses import dataclass

@dataclass(frozen=True)
class AttendanceIdentifier:
    value: str

@dataclass(frozen=True)
class AttendanceReference:
    attendance_id: str
""",
    "apps/api/app/domain/attendance/value_objects/types.py": """from enum import Enum
from dataclasses import dataclass
from datetime import datetime

class AttendanceStatus(str, Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"
    EXCUSED = "EXCUSED"

class AttendanceReason(str, Enum):
    MEDICAL = "MEDICAL"
    PERSONAL = "PERSONAL"
    TRANSPORT = "TRANSPORT"
    OTHER = "OTHER"

@dataclass(frozen=True)
class AttendancePeriod:
    start_time: datetime
    end_time: datetime

@dataclass(frozen=True)
class AttendanceEntry:
    student_id: str
    status: AttendanceStatus
    timestamp: datetime
    reason: AttendanceReason | None = None

@dataclass(frozen=True)
class AttendanceSummary:
    total_present: int
    total_absent: int
    total_late: int

@dataclass(frozen=True)
class AttendanceMetrics:
    attendance_percentage: float
""",

    # 1. Attendance Aggregates
    "apps/api/app/domain/attendance/aggregates/__init__.py": "",
    "apps/api/app/domain/attendance/aggregates/attendance_record.py": """from app.domain.base.entities.versioning import VersionedAggregate
from app.domain.attendance.value_objects.identifiers import AttendanceIdentifier
from app.domain.attendance.value_objects.types import AttendanceEntry, AttendanceStatus
from app.domain.shared.references import StudentReference

class AttendanceRecord(VersionedAggregate):
    def __init__(self, id: AttendanceIdentifier, student: StudentReference, session_id: str, entry: AttendanceEntry):
        super().__init__()
        self.id = id
        self.student = student
        self.session_id = session_id
        self.entry = entry
        
    def correct(self, new_entry: AttendanceEntry) -> None:
        self.entry = new_entry
        self.increment_version()

    def excuse(self) -> None:
        if self.entry.status == AttendanceStatus.ABSENT:
            # Reconstruct the entry with EXCUSED status (since entry is immutable)
            self.entry = AttendanceEntry(
                student_id=self.entry.student_id,
                status=AttendanceStatus.EXCUSED,
                timestamp=self.entry.timestamp,
                reason=self.entry.reason
            )
            self.increment_version()
""",
    "apps/api/app/domain/attendance/aggregates/attendance_session.py": """from app.domain.base.entities.versioning import VersionedAggregate
from app.domain.shared.references import SectionReference
from app.domain.attendance.value_objects.types import AttendancePeriod
from datetime import date
from typing import List

class AttendanceSession(VersionedAggregate):
    def __init__(self, id: str, section: SectionReference, session_date: date, period: AttendancePeriod):
        super().__init__()
        self.id = id
        self.section = section
        self.session_date = session_date
        self.period = period
        self.is_open = True
        self.recorded_attendances: List[str] = []

    def close(self) -> None:
        self.is_open = False
        self.increment_version()
""",

    # 3. Attendance Policies
    "apps/api/app/domain/attendance/policies/__init__.py": "",
    "apps/api/app/domain/attendance/policies/contracts.py": """from abc import ABC, abstractmethod
from app.domain.attendance.aggregates.attendance_record import AttendanceRecord

class AttendancePolicy(ABC):
    @abstractmethod
    def validate_attendance(self, record: AttendanceRecord) -> bool:
        pass

class LateArrivalPolicy(ABC):
    @abstractmethod
    def is_late(self, arrival_time: str, scheduled_time: str) -> bool:
        pass

class AbsencePolicy(ABC):
    @abstractmethod
    def requires_notification(self, student_id: str) -> bool:
        pass

class ExcusalPolicy(ABC):
    @abstractmethod
    def can_excuse(self, record: AttendanceRecord) -> bool:
        pass
""",

    # 4. Repositories
    "apps/api/app/domain/attendance/repositories/__init__.py": "",
    "apps/api/app/domain/attendance/repositories/contracts.py": """from abc import ABC, abstractmethod
from typing import Optional
from app.domain.attendance.aggregates.attendance_record import AttendanceRecord
from app.domain.attendance.aggregates.attendance_session import AttendanceSession
from app.domain.attendance.value_objects.identifiers import AttendanceIdentifier

class AttendanceRepository(ABC):
    @abstractmethod
    async def get_by_id(self, id: AttendanceIdentifier) -> Optional[AttendanceRecord]:
        pass

    @abstractmethod
    async def save(self, record: AttendanceRecord) -> None:
        pass

class AttendanceSessionRepository(ABC):
    @abstractmethod
    async def get_by_id(self, session_id: str) -> Optional[AttendanceSession]:
        pass

    @abstractmethod
    async def save(self, session: AttendanceSession) -> None:
        pass
""",

    # 5. Domain Events
    "apps/api/app/domain/attendance/events/__init__.py": "",
    "apps/api/app/domain/attendance/events/events.py": """from dataclasses import dataclass
from app.domain.events.contracts import DomainEvent

@dataclass(frozen=True)
class AttendanceRecorded(DomainEvent):
    attendance_id: str
    student_id: str
    session_id: str

@dataclass(frozen=True)
class AttendanceCorrected(DomainEvent):
    attendance_id: str

@dataclass(frozen=True)
class AttendanceExcused(DomainEvent):
    attendance_id: str

@dataclass(frozen=True)
class AttendanceCancelled(DomainEvent):
    attendance_id: str

@dataclass(frozen=True)
class AttendanceSessionOpened(DomainEvent):
    session_id: str

@dataclass(frozen=True)
class AttendanceSessionClosed(DomainEvent):
    session_id: str
""",

    # 6. Application Vertical Slices
    "apps/api/app/application/attendance/record_attendance/__init__.py": "",
    "apps/api/app/application/attendance/record_attendance/handler.py": """from app.platform.cqrs.contracts import CommandHandler, CommandContext, CommandResult
from dataclasses import dataclass
from app.platform.cqrs.contracts import Command

@dataclass(frozen=True)
class RecordAttendanceRequest:
    student_id: str
    session_id: str
    status: str

@dataclass(frozen=True)
class RecordAttendanceCommand(Command[str]):
    request: RecordAttendanceRequest

class RecordAttendanceHandler(CommandHandler[str]):
    async def handle(self, command: RecordAttendanceCommand, context: CommandContext) -> CommandResult[str]:
        # Orchestration logic here
        return CommandResult(data="att_123")
""",
    "apps/api/app/application/attendance/correct_attendance/__init__.py": "",
    "apps/api/app/application/attendance/excuse_attendance/__init__.py": "",
    "apps/api/app/application/attendance/open_attendance_session/__init__.py": "",
    "apps/api/app/application/attendance/close_attendance_session/__init__.py": "",
    "apps/api/app/application/attendance/get_attendance_summary/__init__.py": "",

    # 7. Tests
    "apps/api/tests/domain/attendance/test_aggregates.py": """from app.domain.attendance.aggregates.attendance_record import AttendanceRecord
from app.domain.attendance.aggregates.attendance_session import AttendanceSession
from app.domain.attendance.value_objects.identifiers import AttendanceIdentifier
from app.domain.attendance.value_objects.types import AttendanceEntry, AttendanceStatus, AttendancePeriod
from app.domain.shared.references import StudentReference, SectionReference
from datetime import datetime, date

def test_attendance_excusal():
    entry = AttendanceEntry(student_id="s1", status=AttendanceStatus.ABSENT, timestamp=datetime.now())
    record = AttendanceRecord(
        id=AttendanceIdentifier("a1"),
        student=StudentReference("s1"),
        session_id="sess1",
        entry=entry
    )
    
    assert record.entry.status == AttendanceStatus.ABSENT
    assert record.version == 1
    
    record.excuse()
    
    assert record.entry.status == AttendanceStatus.EXCUSED
    assert record.version == 2

def test_attendance_session_closing():
    period = AttendancePeriod(start_time=datetime.now(), end_time=datetime.now())
    session = AttendanceSession("sess1", SectionReference("sec1"), date.today(), period)
    
    assert session.is_open is True
    session.close()
    assert session.is_open is False
""",
    "apps/api/tests/domain/attendance/test_policies.py": """from app.domain.attendance.policies.contracts import LateArrivalPolicy

class DummyLateArrivalPolicy(LateArrivalPolicy):
    def is_late(self, arrival_time: str, scheduled_time: str) -> bool:
        return arrival_time > scheduled_time

def test_late_arrival_policy():
    policy = DummyLateArrivalPolicy()
    assert policy.is_late("09:15", "09:00") is True
    assert policy.is_late("08:55", "09:00") is False
""",
    "apps/api/tests/application/attendance/test_record_attendance.py": """from app.application.attendance.record_attendance.handler import RecordAttendanceRequest, RecordAttendanceCommand

def test_record_attendance_command():
    req = RecordAttendanceRequest(student_id="s1", session_id="sess1", status="PRESENT")
    cmd = RecordAttendanceCommand(request=req)
    assert cmd.request.status == "PRESENT"
"""
}

dirs = [
    "apps/api/app/domain/shared/scheduling",
    "apps/api/app/domain/shared/capacity",
    "apps/api/app/domain/shared/approval",
    "apps/api/app/domain/shared/lifecycle",
    "apps/api/app/domain/shared/validation",
    "apps/api/app/domain/attendance/value_objects",
    "apps/api/app/domain/attendance/aggregates",
    "apps/api/app/domain/attendance/policies",
    "apps/api/app/domain/attendance/repositories",
    "apps/api/app/domain/attendance/events",
    "apps/api/app/application/attendance/record_attendance",
    "apps/api/app/application/attendance/correct_attendance",
    "apps/api/app/application/attendance/excuse_attendance",
    "apps/api/app/application/attendance/open_attendance_session",
    "apps/api/app/application/attendance/close_attendance_session",
    "apps/api/app/application/attendance/get_attendance_summary",
    "apps/api/tests/domain/attendance",
    "apps/api/tests/application/attendance"
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

print("Phase 13 Attendance Architecture and Scaffolding Complete.")
