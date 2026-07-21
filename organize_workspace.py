import os
import shutil

# Target directories
tallyme_dir = "tallyme"
roadmap_dir = os.path.join(tallyme_dir, "roadmap")
foundation_dir = os.path.join(roadmap_dir, "foundation")
gmail_dir = os.path.join(roadmap_dir, "gmail")
vendor_dir = os.path.join(roadmap_dir, "vendor")
archive_dir = os.path.join(roadmap_dir, "archive")
prompts_dir = os.path.join(tallyme_dir, "prompts")
docs_dir = os.path.join(tallyme_dir, "docs")
outputs_dir = os.path.join(tallyme_dir, "outputs")
temp_dir = os.path.join(tallyme_dir, "temp")

dirs_to_create = [
    foundation_dir,
    gmail_dir,
    vendor_dir,
    archive_dir,
    prompts_dir,
    docs_dir,
    outputs_dir,
    temp_dir
]

for d in dirs_to_create:
    os.makedirs(d, exist_ok=True)

# Files to move
files_in_root = [f for f in os.listdir('.') if os.path.isfile(f) and f.endswith('.py') and f not in ('organize_workspace.py',)]

for f in files_in_root:
    if f.startswith('phase_A1') or f == 'refactor_gmail.py':
        dest = os.path.join(gmail_dir, f)
    elif f.startswith('phase') or f.startswith('scaffold'):
        dest = os.path.join(foundation_dir, f)
    else:
        dest = os.path.join(archive_dir, f)
    
    shutil.move(f, dest)

if os.path.exists("CLAUDE.md"):
    shutil.move("CLAUDE.md", os.path.join(tallyme_dir, "CLAUDE.md"))

readme_content = """# TallyMe Workspace

This dedicated workspace organizes the generation scripts, prompts, and temporary files related to building the TallyMe platform. The actual TallyMe source code (the `apps/` directory and others) remains untouched by these administrative scripts.

## Directory Layout

- `roadmap/`: Contains all the Python scripts used to scaffold the different architectural phases of TallyMe.
  - `foundation/`: Scripts for Phase 2 through Phase 13 (Platform Foundation, Academic, Student, Enrollment, Attendance).
  - `gmail/`: Scripts and refactors for Phase A1 (Gmail Integration).
  - `vendor/`: Reserved for future vendor automation prompts and scripts.
  - `archive/`: Superseded, old, or experimental scripts.
- `prompts/`: A collection of system prompts, user requests, and guidelines used to direct the AI agents.
- `docs/`: Additional documentation and design specifications.
- `outputs/`: Captured outputs, trees, or reports from executed scripts.
- `temp/`: Scratch space for temporary files.
- `CLAUDE.md`: System-level guidelines.
"""

with open(os.path.join(tallyme_dir, "README.md"), "w") as f:
    f.write(readme_content)

print("Workspace organization complete.")
