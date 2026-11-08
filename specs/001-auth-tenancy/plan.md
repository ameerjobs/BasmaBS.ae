# Implementation Plan: Authentication and Tenancy

**Branch**: `001-auth-tenancy` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-auth-tenancy/spec.md`

## Summary

Invitation-only authentication and multi-tenant workspaces for Basma Book Store Studio. The
platform operator creates workspaces and invites each first Owner; members join only by
invitation and hold one of four roles (Owner, Admin, Editor, Viewer) per workspace. Sessions
end after 8 hours of inactivity, and every screen and email works in Arabic (right-to-left) and
English.

Technical approach: a static vanilla-JS app in `studio/` uses Supabase Auth (public sign-up
disabled) for sign-in. Tenant isolation is enforced by PostgreSQL RLS that looks up
`memberships` on every request, never trusting JWT claims or client-supplied tenant ids. All
administrative changes (workspaces, invitations, roles, removals) go through authenticated
Supabase Edge Functions that check roles server-side and write an audit trail. Invitation and
confirmation emails are bilingual and sent server-side. See [research.md](./research.md).

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2022 modules, no build step) for the browser;
TypeScript on Deno 2 (Supabase Edge Runtime) for Edge Functions; SQL (PostgreSQL 15+) for
migrations and policies.

**Primary Dependencies**: `@supabase/supabase-js` v2 (pinned, vendored into `studio/vendor/`);
Supabase Auth, PostgreSQL, Edge Functions; transactional email provider (Resend by default,
research R6). Dev-only: Supabase CLI, pgTAP, Deno test, Playwright.

**Storage**: Supabase PostgreSQL — `profiles`, `workspaces`, `memberships`, `invitations`,
`platform_operators`, `security_events`, `rate_limits` ([data-model.md](./data-model.md)).
No Storage buckets in this feature.

**Testing**: pgTAP via `supabase test db` (RLS and roles); `deno test` (Edge Function
contracts, authorisation, non-disclosure); Playwright (P1 journeys in `ar` and `en`); i18n
dictionary-parity test.

**Target Platform**: Current evergreen browsers (desktop and mobile); static HTTPS hosting
(host per ADR-008, still proposed); Supabase hosted project.

**Project Type**: Web application — static frontend + managed backend (Supabase).

**Performance Goals**: Sign-in to workspace < 15 s (SC-002); invitation to workspace < 3 min
excluding email (SC-001); pages interactive < 2 s on a typical connection.

**Constraints**: No frameworks or build tooling for the frontend (Principle I); no secrets in
the browser (service-role key and email API key are Edge Function secrets only); one stylesheet
for both text directions; 8 h inactivity timeout enforced server-side.

**Scale/Scope**: MVP planning figure ~100 workspaces, ~1,000 users; 10 pages; 12 Edge
Functions; 7 tables.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate | Pre-research | Post-design |
|---|-----------|------|--------------|-------------|
| I | Approved lightweight architecture | HTML/CSS/vanilla JS frontend; Edge Functions backend; Supabase Auth + Postgres; no Next.js/React/FastAPI; host not locked to Bunny | ✅ | ✅ `studio/` is plain static files; `supabase-js` is an SDK, not a framework; host-agnostic |
| II | Tenant isolation & least privilege | Tenant id on tenant records; RLS on and tested; no trust in client tenant ids; admin actions authorised server-side | ✅ | ✅ RLS on all 7 tables; role lookup per request (R4); no client writes to membership/invitation/workspace tables (R5); last-Owner trigger; pgTAP boundary tests |
| III | Secret & BYOK protection | No secrets in browser, responses, or logs; server-side provider calls | ✅ | ✅ Service-role and email keys only in Edge Function secrets; invitation tokens stored hashed; error shape excludes secrets; non-disclosure tests. BYOK keys arrive in feature 004; Owner-only management recorded in spec FR-014 |
| IV | Specification-first delivery | Spec, acceptance criteria, plan, tasks, tests before code | ✅ | ✅ Spec clarified; plan, contracts, quickstart done; tasks next |
| V | Simplicity & maintainability | Small modules, semantic accessible HTML, few dependencies, documented setup | ✅ | ✅ No i18n or UI library; one runtime dependency; quickstart documents setup. Email provider and dev-only test tools justified below |
| VI | Testable quality gates | Positive/negative/authorisation tests; tenant-boundary, key non-disclosure, and auth tests are blockers | ✅ | ✅ R12 test layers; quickstart scenarios 1–17 map to spec |
| VII | Responsible AI & observability | Traceability without secrets; retention defined before launch | ✅ (no AI in this feature) | ⚠️ `security_events` and Auth audit log recorded without secrets; **retention period deferred** to the charter decision — must be set before launch, not before implementation |
| VIII | Delivery governance | Evidence before completion; sponsor approval for production | ✅ | ✅ PoC checks listed in quickstart must pass before related tasks close; no production deployment in this plan |

**Result**: PASS. One item (VII retention) is a pre-launch obligation, not a blocker for planning.

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-tenancy/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── edge-functions.md
│   └── ui-pages.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
studio/                          # New static Studio app (existing store pages untouched)
├── index.html                   # sign in
├── forgot.html  reset.html  confirm.html  accept.html
├── app.html  members.html  workspace-settings.html  account.html  operator.html
├── css/
│   └── studio.css               # logical properties, RTL + LTR
├── js/
│   ├── supabase-client.js       # creates the client from public config
│   ├── config.js                # SUPABASE_URL + anon key only (public values)
│   ├── api.js                   # calls Edge Functions, maps error message_key
│   ├── i18n.js                  # language detection, dir switching, data-i18n fill
│   ├── session.js               # auth guard, next= redirect, 8 h idle sign-out
│   ├── workspace.js             # active workspace, switcher, last_workspace_id
│   └── pages/                   # one small module per page
├── i18n/
│   ├── ar.json
│   └── en.json
├── vendor/
│   └── supabase-js.esm.js       # pinned version, checksum recorded in vendor/README.md
└── tests/
    └── i18n-parity.test.js

supabase/
├── config.toml                  # sign-up off, password min 8, JWT 3600 s, inactivity 8 h
├── seed.sql                     # local operator account only
├── migrations/
│   └── 20261108000000_auth_tenancy.sql
├── functions/
│   ├── _shared/                 # auth.ts (requireUser/requireRole/requireOperator),
│   │                            # errors.ts, audit.ts, cors.ts, rate-limit.ts, tokens.ts,
│   │                            # email/ (driver.ts, templates/*.ts in ar+en)
│   ├── workspaces-create/  workspaces-owner-invite/  workspaces-list-operator/
│   ├── workspaces-rename/
│   ├── invitations-create/  invitations-resend/  invitations-revoke/
│   ├── invitations-preview/  invitations-register/  invitations-accept/
│   ├── members-update-role/  members-remove/
│   └── tests/                   # deno tests per function
└── tests/
    └── database/                # pgTAP: rls_*.test.sql, roles.test.sql, owner_trigger.test.sql

tests/e2e/                       # Playwright (dev-only) — P1 journeys, ar + en
package.json                     # dev-only: playwright, http-server
```

**Structure Decision**: Static frontend in `studio/` plus Supabase project in `supabase/`,
following the Supabase CLI layout. The existing public store site at the repository root stays
as is and shares no code with the Studio.

## Complexity Tracking

No constitution violations. Additions that need a one-line justification under Principle V:

| Addition | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|-------------------------------------|
| Transactional email provider (Resend default) | Bilingual invitation/confirmation emails and production-grade Auth SMTP | Supabase built-in email is rate-limited, not for production, and cannot send invitations to existing accounts |
| Playwright + Node (dev-only) | Repeatable evidence for P1 journeys in both languages (Principle VI) | Manual-only UAT is not repeatable release evidence |
| `rate_limits` table | Per-IP throttling on the two public invitation functions (FR-007) | Auth rate limits do not cover custom public functions |

## Open Items for the Sponsor

- Confirm email provider and sending domain (R6).
- Confirm the Supabase plan includes inactivity timeout and leaked-password protection (R7,
  R8); otherwise the documented fallbacks are used.
- Set the audit-log retention period before launch (Principle VII).
- Hosting choice (ADR-008) — does not block this feature.
