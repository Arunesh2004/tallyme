# TallyMe Repository Structure

## Overview
This document defines the final frozen architecture for the TallyMe backend. The structure follows a strict Modular Monolith pattern based on Clean Architecture and Domain-Driven Design (DDD).

## Layer Responsibilities

### 1. Presentation (`presentation/`)
- Contains ONLY delivery mechanisms (HTTP, FastAPI, routers, controllers, middlewares).
- No business rules.
- HTTP Schemas and Presentation Validators belong here.

### 2. Application (`application/`)
- Coordinates business use cases as Vertical Slices.
- Connects the Presentation layer to Domain and Infrastructure.
- No business logic, purely orchestration.
- Application Validation belongs here.

### 3. Domain (`domain/`)
- The core of the software. Contains all business knowledge.
- Aggregates, Entities, Value Objects, Domain Events, and Domain Services.
- Strictly isolated. No dependencies on Infrastructure or Presentation.
- Organised by Bounded Contexts (e.g., `academic`, `students`, `organizations`).

### 4. Infrastructure (`infrastructure/`)
- Contains all technical implementations (Database, Redis, Queue, Logging, External SDKs).
- Implements repository interfaces defined in the Domain.
- Infrastructure Validation and Persistence Schemas belong here.

### 5. Integrations (`integrations/`)
- Isolated external system boundaries (e.g., Gmail, Tally, OCR).
- Each integration follows its own internal `application`, `domain`, and `infrastructure` pattern to prevent external domain pollution.

### 6. Platform (`platform/`)
- Reusable enterprise capabilities (Identity, Authorization, Session, CQRS, Audit).
- These are NOT business domains, but foundational building blocks.

## Dependency Rules
1. **Presentation** depends on **Application**.
2. **Application** depends on **Domain** and **Platform**.
3. **Infrastructure** depends on abstractions defined in **Application** or **Domain**.
4. **Domain** depends on NOTHING (except native language constructs).
5. No circular dependencies allowed.

## Repository Freeze Policy
As of the final architecture refactor, this repository structure is **PERMANENTLY FROZEN**. No new top-level folders may be created inside `apps/api/app/` without explicit architectural approval. Future features must fit inside the established bounded contexts or be introduced as new bounded contexts under `domain/` and `application/`.
