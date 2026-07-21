import os

files = {
    # =========================================================
    # PHASE 11: STUDENT LIFECYCLE FOUNDATION
    # =========================================================

    # 1 & 2. Student Value Objects
    "apps/api/app/domain/students/value_objects/__init__.py": "",
    "apps/api/app/domain/students/value_objects/identifiers.py": """from dataclasses import dataclass

@dataclass(frozen=True)
class RollNumber:
    value: str

@dataclass(frozen=True)
class AdmissionNumber:
    value: str

@dataclass(frozen=True)
class StudentIdentifier:
    system_id: str
    national_id: str | None = None
""",
    "apps/api/app/domain/students/value_objects/demographics.py": """from dataclasses import dataclass
from enum import Enum

class Gender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"
    PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY"

class BloodGroup(str, Enum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"
    UNKNOWN = "UNKNOWN"

@dataclass(frozen=True)
class Nationality:
    country_code: str
""",
    "apps/api/app/domain/students/value_objects/contact.py": """from dataclasses import dataclass

@dataclass(frozen=True)
class Address:
    street_line1: str
    city: str
    state: str
    postal_code: str
    country: str
    street_line2: str | None = None

@dataclass(frozen=True)
class GuardianContact:
    primary_phone: str
    email: str | None = None
    secondary_phone: str | None = None
""",
    
    # 1. Student Entities & Sub-components
    "apps/api/app/domain/students/entities/__init__.py": "",
    "apps/api/app/domain/students/entities/components.py": """from dataclasses import dataclass, field
from datetime import date
from typing import List
from enum import Enum
from app.domain.students.value_objects.contact import GuardianContact, Address

class AcademicStatus(str, Enum):
    PROSPECTIVE = "PROSPECTIVE"
    ADMITTED = "ADMITTED"
    ENROLLED = "ENROLLED"
    GRADUATED = "GRADUATED"
    WITHDRAWN = "WITHDRAWN"
    TRANSFERRED = "TRANSFERRED"
    SUSPENDED = "SUSPENDED"

@dataclass(kw_only=True)
class StudentProfile:
    first_name: str
    last_name: str
    date_of_birth: date
    middle_name: str | None = None
    
@dataclass(kw_only=True)
class AdmissionInformation:
    admission_date: date
    grade_level_id: str
    academic_year_id: str
    
@dataclass(kw_only=True)
class GuardianInformation:
    first_name: str
    last_name: str
    relationship: str
    contact: GuardianContact
    address: Address | None = None
    is_primary: bool = True

@dataclass(kw_only=True)
class EmergencyContact:
    name: str
    relationship: str
    phone_number: str

@dataclass(kw_only=True)
class EnrollmentHistory:
    records: List[dict] = field(default_factory=list)
""",

    # 1. Student Aggregate
    "apps/api/app/domain/students/aggregates/__init__.py": "",
    "apps/api/app/domain/students/aggregates/student.py": """from app.domain.base.entities.versioning import VersionedAggregate
from app.domain.students.entities.components import (
    StudentProfile, AdmissionInformation, AcademicStatus, 
    GuardianInformation, EmergencyContact, EnrollmentHistory
)
from app.domain.students.value_objects.identifiers import StudentIdentifier, AdmissionNumber, RollNumber
from app.domain.students.value_objects.demographics import Gender, BloodGroup, Nationality
from typing import List

class Student(VersionedAggregate):
    def __init__(
        self,
        id: str,
        identifier: StudentIdentifier,
        profile: StudentProfile,
        admission_info: AdmissionInformation,
        admission_number: AdmissionNumber,
        gender: Gender,
        nationality: Nationality
    ):
        super().__init__()
        self.id = id
        self.identifier = identifier
        self.profile = profile
        self.admission_info = admission_info
        self.admission_number = admission_number
        self.gender = gender
        self.nationality = nationality
        
        self.status = AcademicStatus.ADMITTED
        self.roll_number: RollNumber | None = None
        self.blood_group: BloodGroup = BloodGroup.UNKNOWN
        self.guardians: List[GuardianInformation] = []
        self.emergency_contacts: List[EmergencyContact] = []
        self.enrollment_history = EnrollmentHistory()
        
    def add_guardian(self, guardian: GuardianInformation) -> None:
        self.guardians.append(guardian)
        self.increment_version()

    def update_status(self, new_status: AcademicStatus) -> None:
        self.status = new_status
        self.increment_version()
""",

    "apps/api/app/domain/students/value_objects/student_reference.py": """from dataclasses import dataclass

@dataclass(frozen=True)
class StudentReference:
    student_id: str
    full_name: str
""",

    # 3. Student Policies
    "apps/api/app/domain/students/policies/__init__.py": "",
    "apps/api/app/domain/students/policies/contracts.py": """from abc import ABC, abstractmethod
from app.domain.students.aggregates.student import Student

class AdmissionPolicy(ABC):
    @abstractmethod
    def can_admit(self, candidate_data: dict) -> bool:
        pass

class PromotionEligibilityPolicy(ABC):
    @abstractmethod
    def is_eligible_for_promotion(self, student: Student) -> bool:
        pass

class TransferPolicy(ABC):
    @abstractmethod
    def can_transfer(self, student: Student) -> bool:
        pass

class WithdrawalPolicy(ABC):
    @abstractmethod
    def can_withdraw(self, student: Student) -> bool:
        pass

class GraduationEligibilityPolicy(ABC):
    @abstractmethod
    def can_graduate(self, student: Student) -> bool:
        pass
""",

    # 4. Repositories
    "apps/api/app/domain/students/repositories/__init__.py": "",
    "apps/api/app/domain/students/repositories/contracts.py": """from abc import ABC, abstractmethod
from typing import Optional
from app.domain.students.aggregates.student import Student

class StudentRepository(ABC):
    @abstractmethod
    async def get_by_id(self, student_id: str) -> Optional[Student]:
        pass

    @abstractmethod
    async def save(self, student: Student) -> None:
        pass

class AdmissionRepository(ABC):
    @abstractmethod
    async def get_pending_admissions(self) -> list:
        pass
""",

    # 5. Domain Events
    "apps/api/app/domain/students/events/__init__.py": "",
    "apps/api/app/domain/students/events/events.py": """from dataclasses import dataclass
from app.domain.events.contracts import DomainEvent

@dataclass(frozen=True)
class StudentAdmitted(DomainEvent):
    student_id: str
    admission_number: str

@dataclass(frozen=True)
class StudentTransferred(DomainEvent):
    student_id: str
    destination_institution: str | None = None

@dataclass(frozen=True)
class StudentPromoted(DomainEvent):
    student_id: str
    new_grade_level_id: str

@dataclass(frozen=True)
class StudentWithdrawn(DomainEvent):
    student_id: str
    reason: str

@dataclass(frozen=True)
class GuardianUpdated(DomainEvent):
    student_id: str

@dataclass(frozen=True)
class EmergencyContactUpdated(DomainEvent):
    student_id: str
""",

    # 6. Application Vertical Slices
    "apps/api/app/application/students/admit_student/__init__.py": "",
    "apps/api/app/application/students/admit_student/handler.py": """from app.platform.cqrs.contracts import CommandHandler, CommandContext, CommandResult
from dataclasses import dataclass
from app.platform.cqrs.contracts import Command
from datetime import date

@dataclass(frozen=True)
class AdmitStudentRequest:
    first_name: str
    last_name: str
    date_of_birth: date
    national_id: str

@dataclass(frozen=True)
class AdmitStudentCommand(Command[str]):
    request: AdmitStudentRequest

class AdmitStudentHandler(CommandHandler[str]):
    async def handle(self, command: AdmitStudentCommand, context: CommandContext) -> CommandResult[str]:
        # Orchestration logic goes here
        return CommandResult(data="student_id_123")
""",
    "apps/api/app/application/students/transfer_student/__init__.py": "",
    "apps/api/app/application/students/withdraw_student/__init__.py": "",
    "apps/api/app/application/students/update_guardian/__init__.py": "",
    "apps/api/app/application/students/get_student_profile/__init__.py": "",

    # 7. Tests
    "apps/api/tests/domain/students/test_student_aggregate.py": """from app.domain.students.aggregates.student import Student
from app.domain.students.value_objects.identifiers import StudentIdentifier, AdmissionNumber
from app.domain.students.value_objects.demographics import Gender, Nationality
from app.domain.students.entities.components import StudentProfile, AdmissionInformation, AcademicStatus
from datetime import date

def test_student_initial_status():
    student = Student(
        id="stu1",
        identifier=StudentIdentifier(system_id="sys1"),
        profile=StudentProfile(first_name="Jane", last_name="Doe", date_of_birth=date(2010, 5, 1)),
        admission_info=AdmissionInformation(admission_date=date.today(), grade_level_id="gl1", academic_year_id="ay1"),
        admission_number=AdmissionNumber(value="A001"),
        gender=Gender.FEMALE,
        nationality=Nationality(country_code="US")
    )
    
    assert student.status == AcademicStatus.ADMITTED
    assert student.version == 1
    
    student.update_status(AcademicStatus.ENROLLED)
    assert student.status == AcademicStatus.ENROLLED
    assert student.version == 2
""",
    "apps/api/tests/domain/students/test_policies.py": """from app.domain.students.policies.contracts import AdmissionPolicy

class DummyAdmissionPolicy(AdmissionPolicy):
    def can_admit(self, candidate_data: dict) -> bool:
        return candidate_data.get("age", 0) >= 5

def test_admission_policy():
    policy = DummyAdmissionPolicy()
    assert policy.can_admit({"age": 6}) is True
    assert policy.can_admit({"age": 4}) is False
""",
    "apps/api/tests/application/students/test_admit_student.py": """from app.application.students.admit_student.handler import AdmitStudentRequest, AdmitStudentCommand
from datetime import date

def test_admit_student_command_creation():
    req = AdmitStudentRequest(first_name="John", last_name="Doe", date_of_birth=date(2015,1,1), national_id="N123")
    cmd = AdmitStudentCommand(request=req)
    assert cmd.request.first_name == "John"
"""
}

dirs = [
    "apps/api/app/domain/students/value_objects",
    "apps/api/app/domain/students/entities",
    "apps/api/app/domain/students/aggregates",
    "apps/api/app/domain/students/policies",
    "apps/api/app/domain/students/repositories",
    "apps/api/app/domain/students/events",
    "apps/api/app/application/students/admit_student",
    "apps/api/app/application/students/transfer_student",
    "apps/api/app/application/students/withdraw_student",
    "apps/api/app/application/students/update_guardian",
    "apps/api/app/application/students/get_student_profile",
    "apps/api/tests/domain/students",
    "apps/api/tests/application/students"
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

print("Phase 11 Student Lifecycle Architecture and Scaffolding Complete.")
