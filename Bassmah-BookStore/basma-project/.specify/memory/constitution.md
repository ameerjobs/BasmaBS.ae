# Basma Book Store Studio Constitution
Version 1.0.0 | Ratification proposed: 2026-11-08 | Status: Draft for ratification

## I. Approved lightweight architecture (NON-NEGOTIABLE)
Frontend MUST use HTML5, CSS3, and vanilla JavaScript. Backend MUST use Supabase Edge Functions; persistence and identity MUST use Supabase PostgreSQL and Auth. Avoid Next.js, React, FastAPI, or other major frameworks without an approved ADR. Static hosting is acceptable; Bunny Magic Containers is a candidate, not an approved mandatory dependency.

## II. Tenant isolation and least privilege (NON-NEGOTIABLE)
Every tenant-owned record MUST have an explicit tenant association. PostgreSQL Row Level Security MUST be enabled and tested for tenant-owned tables. Client-supplied tenant IDs MUST NOT be trusted without membership/role verification. Storage access MUST enforce equivalent tenant boundaries. Administrative actions MUST require server-side authorization.

## III. Secret and BYOK protection (NON-NEGOTIABLE)
AI provider keys MUST NOT be embedded in frontend bundles, returned in API responses, or logged. Provider requests MUST be made server-side. Use an approved server-side secret storage mechanism with documented ownership, rotation, and revocation. Supabase Vault use must be validated for the selected Edge Function access pattern; never assume client-side access is safe.

## IV. Specification-first delivery
For every feature, maintain a user-centered specification, acceptance criteria, implementation plan, task list, and tests before implementation. Use GitHub Spec Kit conventions and workflow where supported by the installed version. Changes to architecture, scope, or security requirements require an ADR and approval.

## V. Simplicity and maintainability
Favor small, understandable modules, semantic HTML, accessible controls, responsive CSS, and vanilla JavaScript. Avoid unnecessary infrastructure and dependencies. Document environment variables, setup, migrations, and operational procedures.

## VI. Testable quality gates
Each feature MUST have positive, negative, and authorization test cases. Tenant boundary tests, API-key non-disclosure tests, and authentication tests are release blockers. AI generation MUST handle errors, timeouts, rate limits, and failed provider calls without losing prior history.

## VII. Responsible AI and observability
Store generation metadata sufficient for traceability (book, tenant, provider, model, status, timestamps, optional token usage) without storing secrets. Provide clear labeling of AI-generated content and allow human review/editing. Collect only necessary analytics, protect personal information, and define retention before launch.

## VIII. Delivery governance
ChatGPT acts as project manager and specification advisor, not as a background execution agent. Claude Code and GLM-4.7 are designated implementation assistants; Antigravity/Gemini 3 Pro is designated for frontend work. Do not mark tasks complete without verifiable evidence. Release requires sponsor acceptance and documented UAT results.

## Development workflow
Constitution → Specify → Clarify → Plan → Tasks → Analyze → Implement → Verify/Converge. Use checklist steps when useful. Feature documentation MUST link requirements to tasks and tests.

## Governance and amendment
This constitution takes precedence over individual feature plans. Amendments require an explicit sponsor decision, a version bump, and an update to the architecture decision log. MAJOR: incompatible governance change; MINOR: new principles or materially expanded rules; PATCH: clarifications.

## Initial feature sequence
001-auth-tenancy; 002-book-catalog; 003-book-content-kits; 004-byok-ai-generation; 005-generation-history; 006-admin-analytics.
