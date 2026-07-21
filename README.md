# TallyMe Workspace

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
