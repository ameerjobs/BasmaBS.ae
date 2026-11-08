<<<<<<< HEAD
<!--
Sync Impact Report
- Version change: (unversioned template) → 1.0.0 (initial ratification)
- Source: Bassmah-BookStore/basma-project/ (README.md, docs/project-charter.md,
  decisions/architecture-decisions.md, .specify/memory/constitution.md proposed v1.0.0 draft)
- Principles defined (template placeholders → named principles):
  - [PRINCIPLE_1_NAME] → I. Approved Lightweight Architecture (NON-NEGOTIABLE)
  - [PRINCIPLE_2_NAME] → II. Tenant Isolation and Least Privilege (NON-NEGOTIABLE)
  - [PRINCIPLE_3_NAME] → III. Secret and BYOK Protection (NON-NEGOTIABLE)
  - [PRINCIPLE_4_NAME] → IV. Specification-First Delivery
  - [PRINCIPLE_5_NAME] → V. Simplicity and Maintainability
  - Added: VI. Testable Quality Gates
  - Added: VII. Responsible AI and Observability
  - Added: VIII. Delivery Governance
- Added sections: Scope and Technical Constraints (SECTION_2), Development Workflow and
  Quality Gates (SECTION_3), Governance
- Removed sections: none
- Templates: not modified (scope guard); plan/spec/tasks templates read this file at runtime.
- Follow-up TODOs / open items (from charter "Open decisions", not placeholders):
  - ADR-008 Bunny Magic Containers hosting remains Proposed; hosting choice pending PoC.
  - Charter and six-week delivery commitment pending separate sponsor sign-off.
  - Open business decisions: tenant creation/invitation & admin role model; BYOK key
    ownership (user vs tenant); languages/content templates; budget/traffic/usage limits;
    privacy/retention requirements; resources and start date.
  - Quantitative performance and availability targets to be agreed during requirements.
- This report is review scratch material; remove before committing.
-->

# Basma Book Store Studio Constitution

## Core Principles

### I. Approved Lightweight Architecture (NON-NEGOTIABLE)

- The frontend MUST use HTML5, CSS3, and vanilla JavaScript (ADR-001).
- Server-side logic MUST run in Supabase Edge Functions (ADR-002); identity, persistence, and
  file storage MUST use Supabase Auth, PostgreSQL, and Storage (ADR-003).
- Next.js, React, FastAPI, or any other major framework MUST NOT be introduced without an
  approved ADR (ADR-009).
- The frontend MUST be served as static assets over HTTPS. Static hosting is acceptable;
  Bunny Magic Containers is a candidate host only (ADR-008, Proposed) and MUST NOT become a
  mandatory dependency until a feasibility proof of concept is approved.
- The browser MAY call Supabase directly only where RLS permits the operation.

Rationale: Architecture Option A, approved by the sponsor on 2026-11-08, minimizes
complexity on a unified managed platform.

### II. Tenant Isolation and Least Privilege (NON-NEGOTIABLE)

- Every tenant-owned record MUST carry an explicit tenant association (ADR-005).
- PostgreSQL Row Level Security MUST be enabled and tested on every tenant-owned table.
- Client-supplied tenant IDs MUST NOT be trusted without server-side membership and role
  verification.
- Storage access (covers, assets) MUST enforce tenant boundaries equivalent to RLS.
- Administrative actions MUST require server-side authorization; role escalation paths MUST
  be covered by tests.

Rationale: Cross-tenant data exposure and role escalation are the project's top-ranked risks.

### III. Secret and BYOK Protection (NON-NEGOTIABLE)

- OpenAI and Gemini provider keys MUST NOT appear in frontend code or bundles, API
  responses, or logs (ADR-004).
- All AI provider requests and secret handling MUST go through authenticated Edge Functions.
- Keys MUST be held in an approved server-side secret store with documented ownership,
  rotation, and revocation procedures.
- Supabase Vault (or any alternative) MUST be validated for the selected Edge Function access
  pattern before use; client-side key access MUST never be assumed safe.

Rationale: BYOK credentials belong to customers; leakage is a release-blocking defect.

### IV. Specification-First Delivery

- Every feature MUST have a user-centered specification, acceptance criteria, implementation
  plan, task list, and tests defined before implementation begins (ADR-006).
- Delivery MUST follow GitHub Spec Kit conventions as supported by the installed version.
- Feature documentation MUST trace requirements to tasks and tests.
- Changes to architecture, scope, or security requirements MUST be recorded as an ADR and
  approved by the sponsor before implementation.

Rationale: Traceable delivery lets the sponsor approve scope and verify outcomes.

### V. Simplicity and Maintainability

- Code MUST favor small, understandable modules, semantic HTML, accessible controls,
  responsive CSS, and vanilla JavaScript.
- New infrastructure or third-party dependencies MUST be justified in the feature plan;
  unjustified additions MUST be rejected.
- Environment variables, setup, database migrations, and operational procedures MUST be
  documented.

Rationale: A lightweight MVP stays cheap to run, review, and hand over.

### VI. Testable Quality Gates

- Each feature MUST include positive, negative, and authorization test cases.
- Tenant-boundary tests, API-key non-disclosure tests, and authentication tests are release
  blockers.
- AI generation MUST handle provider errors, timeouts, rate limits, and failed calls without
  losing prior generation history.

Rationale: Security and isolation claims are only credible when demonstrated by tests.

### VII. Responsible AI and Observability

- Each generation MUST store traceability metadata (book, tenant, provider, model, status,
  timestamps, optional token usage) and MUST NOT store secrets.
- AI-generated content MUST be clearly labeled and MUST remain reviewable and editable by a
  human before use.
- Analytics MUST collect only necessary data and protect personal information; a data
  retention policy MUST be defined before launch.

Rationale: Users need to trust, audit, and control AI output and their data.

### VIII. Delivery Governance

- The Product Owner / Sponsor (the user) holds approval authority for scope, production
  deployment, and release acceptance.
- ChatGPT acts as project manager and specification advisor only, not as an autonomous or
  background execution agent.
- Claude Code and GLM-4.7 are the designated implementation assistants; Antigravity /
  Gemini 3 Pro is designated for frontend implementation (ADR-007).
- No task MAY be marked complete without verifiable evidence (tests, output, or review).
- Release MUST require sponsor acceptance and documented UAT results.

Rationale: Human approval and evidence-based completion keep AI-assisted delivery accountable.

## Scope and Technical Constraints

- **In scope (MVP)**: tenant onboarding and membership; authentication and roles; book CRUD
  and metadata; covers/assets; book content kits (tone, audience, language, prompt guidance);
  BYOK provider configuration; AI generation of descriptions, summaries, and promotional
  materials; per-book generation history; basic admin analytics.
- **Out of scope (MVP)**: checkout, payments, fulfillment, stock management, subscription
  billing, marketplace integration, and fully automated social publishing. Any feature that
  introduces these MUST be rejected or escalated as a scope-change ADR.
- **Release acceptance**: users can securely log in, manage books within their tenant, and
  generate and retrieve content; RLS and server authorization prevent cross-tenant access;
  BYOK secrets never reach client code or logs; critical flows pass UAT; no unresolved
  critical security defects remain.
- **Initial feature sequence**: 001-auth-tenancy; 002-book-catalog; 003-book-content-kits;
  004-byok-ai-generation; 005-generation-history; 006-admin-analytics.
- Quantitative performance and availability targets will be set during requirements and
  recorded by amendment or in the relevant specification.

## Development Workflow and Quality Gates

- Workflow: Constitution → Specify → Clarify → Plan → Tasks → Analyze → Implement →
  Verify/Converge. Checklists MAY be used at any step.
- Every implementation plan MUST include a Constitution Check confirming compliance with
  Principles I–VIII; any deviation MUST cite an approved ADR.
- Risk mitigations MUST be reflected in plans where applicable: RLS and authorization tests,
  server-only keys, usage limits, fallback error handling, a hosting proof of concept, and a
  staged release.
- Production deployment MUST NOT occur without explicit sponsor approval.

## Governance

- This constitution takes precedence over individual feature specifications, plans, and
  tasks. Where they conflict, the constitution wins until amended.
- Amendments require an explicit sponsor decision, a semantic version bump, and a
  corresponding update to the architecture decision log
  (`Bassmah-BookStore/basma-project/decisions/architecture-decisions.md`).
- Versioning: MAJOR for incompatible governance changes or principle removals/redefinitions;
  MINOR for new principles or materially expanded rules; PATCH for clarifications and wording.
- Compliance review: `/speckit-analyze` and plan Constitution Checks MUST verify adherence
  before implementation; release review MUST confirm the Principle VI release blockers pass.
- Supporting references: `Bassmah-BookStore/basma-project/docs/project-charter.md` and the
  architecture decision log.

**Version**: 1.0.0 | **Ratified**: 2026-11-08 | **Last Amended**: 2026-11-08
=======
# [PROJECT_NAME] Constitution
<!-- Example: Spec Constitution, TaskFlow Constitution, etc. -->

## Core Principles

### [PRINCIPLE_1_NAME]
<!-- Example: I. Library-First -->
[PRINCIPLE_1_DESCRIPTION]
<!-- Example: Every feature starts as a standalone library; Libraries must be self-contained, independently testable, documented; Clear purpose required - no organizational-only libraries -->

### [PRINCIPLE_2_NAME]
<!-- Example: II. CLI Interface -->
[PRINCIPLE_2_DESCRIPTION]
<!-- Example: Every library exposes functionality via CLI; Text in/out protocol: stdin/args → stdout, errors → stderr; Support JSON + human-readable formats -->

### [PRINCIPLE_3_NAME]
<!-- Example: III. Test-First (NON-NEGOTIABLE) -->
[PRINCIPLE_3_DESCRIPTION]
<!-- Example: TDD mandatory: Tests written → User approved → Tests fail → Then implement; Red-Green-Refactor cycle strictly enforced -->

### [PRINCIPLE_4_NAME]
<!-- Example: IV. Integration Testing -->
[PRINCIPLE_4_DESCRIPTION]
<!-- Example: Focus areas requiring integration tests: New library contract tests, Contract changes, Inter-service communication, Shared schemas -->

### [PRINCIPLE_5_NAME]
<!-- Example: V. Observability, VI. Versioning & Breaking Changes, VII. Simplicity -->
[PRINCIPLE_5_DESCRIPTION]
<!-- Example: Text I/O ensures debuggability; Structured logging required; Or: MAJOR.MINOR.BUILD format; Or: Start simple, YAGNI principles -->

## [SECTION_2_NAME]
<!-- Example: Additional Constraints, Security Requirements, Performance Standards, etc. -->

[SECTION_2_CONTENT]
<!-- Example: Technology stack requirements, compliance standards, deployment policies, etc. -->

## [SECTION_3_NAME]
<!-- Example: Development Workflow, Review Process, Quality Gates, etc. -->

[SECTION_3_CONTENT]
<!-- Example: Code review requirements, testing gates, deployment approval process, etc. -->

## Governance
<!-- Example: Constitution supersedes all other practices; Amendments require documentation, approval, migration plan -->

[GOVERNANCE_RULES]
<!-- Example: All PRs/reviews must verify compliance; Complexity must be justified; Use [GUIDANCE_FILE] for runtime development guidance -->

**Version**: [CONSTITUTION_VERSION] | **Ratified**: [RATIFICATION_DATE] | **Last Amended**: [LAST_AMENDED_DATE]
<!-- Example: Version: 2.1.1 | Ratified: 2025-06-13 | Last Amended: 2025-07-16 -->
>>>>>>> 81980054948484f405d3aedd285891179c4a8d4b
