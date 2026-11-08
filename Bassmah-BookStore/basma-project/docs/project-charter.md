# Basma Book Store Studio — Project Charter
Version 1.0 | 8 November 2026 | Status: Draft for charter sign-off

## Purpose
Deliver a lightweight multi-tenant SaaS application for managing books and generating AI-assisted book descriptions, summaries, and promotional materials.

## Sponsor and governance
Product Owner / Sponsor: User. Project Manager: ChatGPT (planning and advisory; no autonomous execution). Implementation agents: Claude Code, GLM-4.7; frontend implementation: Antigravity / Gemini 3 Pro. Human approval required for scope, production deployment, and release acceptance.

## Approved architecture
Static HTML5, CSS3, vanilla JavaScript frontend; Supabase Auth, PostgreSQL, Storage, Edge Functions, and secure credential storage. OpenAI and Gemini integration via server-side functions. No Next.js or FastAPI in MVP. Bunny Magic Containers remains a proposed hosting option pending technical feasibility; a static host may be simpler for the frontend.

## Scope
In: tenant onboarding and membership, authentication and roles, book CRUD and metadata, covers/assets, book content kits (tone, audience, language, prompt guidance), BYOK provider configuration, AI generation, per-book generation history, and basic admin analytics.
Out: checkout, payments, fulfillment, stock management, subscription billing, marketplace integration, and fully automated social publishing.

## Deliverables
Project charter; product requirements and prioritized backlog; architecture and data model; GitHub Spec Kit constitution/specifications/plans/tasks; working MVP; tests and UAT evidence; deployment instructions and handover.

## Success and acceptance
Users can securely log in, manage books within their tenant, generate and retrieve content; RLS and server authorization prevent cross-tenant access; BYOK secrets never reach client code or logs; critical flows pass UAT; no unresolved critical security defects at release. Quantitative performance and availability targets to be agreed during requirements.

## Proposed schedule (not committed)
Week 1 requirements and architecture; Week 2 Supabase foundation and RLS; Week 3 book management; Week 4 AI/BYOK/history; Week 5 admin analytics and testing; Week 6 UAT, deployment, and handover.

## Risks and dependencies
Tenant isolation and role escalation; secret leakage; provider outages, rate limits, and costs; unverified Bunny hosting compatibility; resource availability; content quality and rights. Mitigations: RLS and authorization tests, server-only keys, usage limits, fallback error handling, hosting proof of concept, and staged release.

## Open decisions
Tenant creation/invitations and admin role model; BYOK key ownership (user vs tenant); supported languages and content templates; budget, traffic and usage limits; hosting choice; privacy/retention requirements; resource allocation and start date.

## Approval
Architecture Option A: approved by sponsor on 8 November 2026. Charter and six-week delivery commitment: pending separate sign-off.
