# Architecture Decision Log — 8 November 2026

| ID | Decision | Status | Rationale |
|---|---|---|---|
| ADR-001 | HTML5/CSS3/vanilla JavaScript frontend | Approved | Minimal complexity |
| ADR-002 | Supabase Edge Functions backend | Approved | Lightweight secure server logic |
| ADR-003 | Supabase Auth, PostgreSQL, Storage | Approved | Unified managed platform |
| ADR-004 | OpenAI and Gemini BYOK, server-side only | Approved | Provider flexibility and secret safety |
| ADR-005 | Multi-tenant SaaS with RLS and membership checks | Approved | Data isolation |
| ADR-006 | GitHub Spec Kit specification workflow | Approved | Traceable delivery |
| ADR-007 | Claude Code/GLM-4.7 and Antigravity/Gemini 3 Pro roles | Approved as planned tooling | Separate implementation responsibilities |
| ADR-008 | Bunny Magic Containers hosting | Proposed / validation required | Deployment feasibility not yet tested |
| ADR-009 | No Next.js or FastAPI for MVP | Approved | Option A supersedes screenshot stack |

## Implementation clarification
Use a static frontend served over HTTPS, calling Supabase through the browser client where RLS permits; all provider requests and secret handling must go through authenticated Edge Functions. Verify whether Bunny Containers is necessary for static frontend hosting before committing.
