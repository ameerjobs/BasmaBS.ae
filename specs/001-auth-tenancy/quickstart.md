# Quickstart & Validation: Authentication and Tenancy (001-auth-tenancy)

How to run the feature locally and prove it meets the spec. Interfaces are defined in
[contracts/edge-functions.md](./contracts/edge-functions.md) and
[contracts/ui-pages.md](./contracts/ui-pages.md); tables in [data-model.md](./data-model.md).

## Prerequisites

- Docker Desktop (for the local Supabase stack)
- Supabase CLI
- Deno 2.x (Edge Function tests)
- Node.js LTS (only for Playwright end-to-end tests and a static file server)

## Setup

```powershell
supabase start                      # local Postgres, Auth, Storage, Edge runtime
supabase db reset                   # applies supabase/migrations and supabase/seed.sql
supabase functions serve --env-file supabase/.env.local
npx http-server studio -p 5173      # or any static server
```

`supabase/.env.local` (never committed) contains `EMAIL_DRIVER=log`, `STUDIO_ORIGIN=
http://localhost:5173`. `supabase/config.toml` sets: sign-up disabled, minimum password length
8, inactivity timeout 8h, JWT expiry 3600 s. The seed creates one operator account
(`operator@local.test`).

## Automated checks (all are release blockers per constitution Principle VI)

```powershell
supabase test db                                   # pgTAP: RLS, roles, last-Owner trigger
deno test --allow-all supabase/functions/tests     # Edge Function contracts and authorisation
deno test --allow-read studio/tests                # i18n dictionary parity
npx playwright test                                # P1 journeys in ar and en
```

Expected: all pass, zero skipped release-blocker tests.

## Manual validation scenarios

With `EMAIL_DRIVER=log`, email links appear in the `supabase functions serve` output.

| # | Scenario | Steps | Expected outcome | Spec |
|---|----------|-------|------------------|------|
| 1 | No open sign-up | Open `index.html`; call Auth sign-up directly with any email | No sign-up link; direct sign-up refused | FR-001 |
| 2 | Operator provisions workspace | Sign in as operator → `operator.html` → create "Test House" with `owner@local.test` | Workspace `pending_owner`; Owner invitation link logged | US2 #1 |
| 3 | First Owner joins | Open link → register (password, name) → open confirmation link → accept | Lands in `app.html` as Owner; workspace `active` | US1 #1–4, US2 #2 |
| 4 | Unconfirmed sign-in | Register from an invitation but skip the confirmation link; sign in | Refused with "confirm email" and resend option | US1 #3 |
| 5 | Invite Editor and Viewer | As Owner, invite `editor@…` and `viewer@…`; accept each | Each sees the workspace with the right role | US3 #1–2 |
| 6 | Wrong account accepts | Sign in as `viewer@…`, open the Editor's invitation link | Refused; `invitation.rejected` event | US3 #3 |
| 7 | Admin limits | Make Editor an Admin; as Admin try to grant Owner or remove the Owner | Both refused | US3 #5 |
| 8 | Last Owner | As sole Owner, try to leave or demote yourself | Refused | US3 #6, FR-015 |
| 9 | Immediate removal | Keep Viewer signed in; Owner removes Viewer; Viewer reloads | Access denied on next action | US3 #7, SC-005 |
| 10 | Cross-tenant probe | Create a second workspace; as a member of the first, open `app.html?ws=<second id>` and query its tables with the browser client | "Not available"; queries return no rows | US4 #3, SC-003 |
| 11 | Workspace switch | Invite Editor into both workspaces; switch | Data and role follow the selected workspace; last used is remembered | US4 #1–2 |
| 12 | Password reset | Request reset; use link; check other session | New password works; other session ended; reset link single-use | US1 #6 |
| 13 | No email enumeration | Sign in / reset with an unknown email vs a known one | Identical messages | US1 #7, FR-006 |
| 14 | Throttling | Fail sign-in repeatedly | Further attempts temporarily refused | FR-007 |
| 15 | Idle timeout | Set inactivity timeout to 2 min in local config; wait | Next action requires sign-in, returns to same page | FR-004a, SC-009 |
| 16 | Languages | Repeat 2–5 in Arabic and English; check emails | RTL in Arabic, no untranslated text, emails in both languages | FR-025–027, SC-008 |
| 17 | No secrets leak | Inspect function logs, `security_events`, and API responses from all scenarios | No passwords, tokens, links, or keys | FR-024, SC-006 |

## Proof-of-concept checks on the hosted project (before marking related tasks complete)

- `generateLink` type `signup` works with public sign-up disabled (research R3).
- Inactivity timeout and leaked-password protection are available on the chosen plan (R7, R8);
  if not, enable the documented fallbacks.
- SMTP provider and sending domain verified; reset email renders in both languages (R6).
