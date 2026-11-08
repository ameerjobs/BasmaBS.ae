# Research: Authentication and Tenancy (001-auth-tenancy)

**Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Each entry resolves an unknown from the plan's Technical Context. Items marked
**Verify in PoC** must be confirmed against the live Supabase project before the related
tasks are marked complete (constitution Principle VIII: evidence before completion).

## R1. Where the Studio app lives relative to the existing store site

- **Decision**: Build the Studio as a separate static app in `studio/` at the repository root,
  with server code in `supabase/`. The existing public store pages (`index.html`, `shop.html`,
  …) are not changed.
- **Rationale**: The store site is a public brochure site; the Studio is an authenticated
  multi-tenant app. Keeping them apart avoids mixing concerns and lets them be hosted together
  or separately (ADR-008 is still undecided).
- **Alternatives considered**: Adding Studio pages beside the store pages (rejected: shared
  `js/script.js` and cart code would leak into the app); a separate repository (rejected: one
  repo is simpler for a small team).

## R2. Identity provider and sign-in method

- **Decision**: Supabase Auth with email + password (ADR-003). Session handled by the official
  `@supabase/supabase-js` v2 browser client, loaded as a pinned, vendored ES module file in
  `studio/vendor/` (no build step, no CDN at runtime).
- **Rationale**: Mandated by the constitution; the client library is a small SDK, not a UI
  framework, so it does not conflict with Principle I. Vendoring removes a runtime third-party
  dependency and makes the exact version reviewable.
- **Alternatives considered**: Calling the Auth REST API by hand (rejected: re-implements token
  refresh and storage, more error-prone); CDN import (rejected: availability and integrity risk).

## R3. Invitation-only accounts (no open sign-up)

- **Decision**: Turn **off** "Allow new users to sign up" in Supabase Auth. Accounts are created
  only by the `invitations-register` Edge Function, which validates the invitation token and
  then creates the user with the Admin API (`auth.admin.generateLink({ type: 'signup', email,
  password })`), which returns a confirmation link without sending it. The function sends that
  link in the bilingual confirmation email (R6). The account stays unconfirmed until the link is
  used (FR-002).
- **Rationale**: Disabling sign-up at the identity provider makes FR-001 enforceable by the
  platform, not only by hiding a form. The Admin API is server-only (service-role key never
  reaches the browser, Principle III).
- **Alternatives considered**: `auth.admin.inviteUserByEmail` (rejected: fails for existing
  accounts, uses a single-language template, and treats the click as confirmation, which differs
  from the spec's flow); leaving sign-up on and deleting unknown accounts (rejected: race-prone).
- **Verify in PoC**: `generateLink` type `signup` succeeds while public sign-up is disabled.

## R4. How workspace and role are decided on every request (FR-016, FR-017, FR-018)

- **Decision**: Membership and role are read from the `memberships` table at request time:
  - In PostgreSQL, RLS policies call `SECURITY DEFINER` helpers `app.is_member(ws)` and
    `app.has_role(ws, roles[])` that look up `auth.uid()` in `memberships`.
  - In Edge Functions, a shared `requireRole(workspaceId, roles)` helper does the same lookup
    using the caller's verified JWT.
  - Role and workspace are **never** put into JWT custom claims.
- **Rationale**: Claims in a JWT stay valid until the token expires, which would break FR-018
  (changes apply on the next request). A table lookup is always current.
- **Alternatives considered**: Custom access-token hook adding role claims (rejected: stale for
  up to the token lifetime); trusting a `workspace_id` header (rejected: Principle II).

## R5. Which writes go through Edge Functions vs direct table access

- **Decision**:
  - **Direct (RLS-guarded) from the browser**: read own profile, memberships, workspace,
    invitations list (Owner/Admin), members list; update own profile (display name, language,
    last-used workspace).
  - **Edge Functions only**: create workspace (operator), send/resend/revoke invitations,
    preview/register/accept invitation, change role, remove member, leave workspace, rename
    workspace.
  - Membership, invitation, and workspace tables have **no** insert/update/delete policies for
    the `authenticated` role.
  - A database trigger also refuses any change leaving an active workspace with zero Owners
    (defence in depth for FR-015).
- **Rationale**: Principle I puts server logic in Edge Functions; Principle II requires
  administrative actions to be authorised server-side. Reads stay direct for simplicity.
- **Alternatives considered**: Postgres RPC functions for admin actions (rejected: splits server
  logic across two places; Edge Functions are the approved backend).

## R6. Sending bilingual emails (FR-020, FR-027)

- **Decision**:
  - Configure a production SMTP provider in Supabase Auth (needed anyway: the built-in sender
    is rate-limited and not for production). Edit the Auth "Reset password" template to contain
    Arabic (RTL block) and English content.
  - Invitation and confirmation emails are sent by Edge Functions through the same provider's
    HTTP API, using shared templates in `supabase/functions/_shared/email/` that render both
    languages, or the recipient's saved language when known.
  - A `log` email driver is used locally (prints the email and link to the function log) so
    tests do not send real email.
  - Provider: **Resend** is the default choice (simple HTTP API and SMTP for the same account);
    any SMTP/HTTP provider with both can replace it via the `EMAIL_DRIVER` setting.
- **Rationale**: One provider for every email; templates in the repo are reviewable and
  testable for SC-008.
- **Alternatives considered**: Supabase Auth templates only (rejected: cannot send invitation
  emails to existing users); a second provider for app emails (rejected: extra setup).
- **Open for sponsor**: confirm the email provider and sending domain (DNS records needed).

## R7. 8-hour inactivity sign-out (FR-004a, SC-009)

- **Decision**: Use Supabase Auth's session **inactivity timeout = 8h** and keep the access-token
  lifetime at 1h, so an idle session cannot refresh after 8h. The browser also tracks the last
  user interaction and signs out locally after 8h idle, saving the current page path so the user
  returns there after signing in again.
- **Rationale**: Server-side enforcement is required for the guarantee in SC-009; the local
  timer gives immediate, friendly behaviour.
- **Alternatives considered**: Client-only timer (rejected: bypassable); a custom
  `last_activity` table checked by every policy (kept as **fallback** if the timeout setting is
  unavailable on the chosen plan — adds one lookup per request).
- **Verify in PoC**: the inactivity timeout setting is available on the project's Supabase plan
  (it is a paid-plan feature at the time of writing).

## R8. Password policy, breached passwords, and throttling (FR-003, FR-007)

- **Decision**: Supabase Auth minimum password length = 8; enable **leaked password protection**
  (checks breached-password lists). Use Auth's built-in sign-in rate limits, plus per-IP limits
  on the public invitation functions (`invitations-preview`, `invitations-register`) using a
  small `rate_limits` table.
- **Rationale**: Platform features avoid custom security code.
- **Verify in PoC**: leaked password protection is available on the chosen plan; if not, the
  `invitations-register` function checks the password against the Have I Been Pwned range API
  (k-anonymity, only a 5-character hash prefix leaves the server).

## R9. Security event audit (FR-024)

- **Decision**: Two sources, both server-side:
  - Sign-in success/failure and password reset are recorded by Supabase Auth's own audit log.
  - All workspace events (workspace created, invitation sent/accepted/revoked, role change,
    member removal, workspace rename) are written to `security_events` by the Edge Function that
    performs the action, in the same transaction scope.
  - No passwords, tokens, or links are ever stored (SC-006). Invitation tokens are stored only as
    SHA-256 hashes.
- **Rationale**: Avoids trusting the browser to report its own sign-ins.
- **Deferred**: retention period for `security_events` awaits the charter's retention decision.

## R10. Platform operator

- **Decision**: The operator is a normal Supabase Auth user listed in a `platform_operators`
  table (seeded by SQL; no UI to add operators). The operator uses `studio/operator.html`, which
  calls `workspaces-create` and `workspaces-owner-invite`. RLS grants operators **no** access to
  workspace data; they see only the workspace name/status list returned by the operator
  function.
- **Rationale**: Matches the clarified scope (one capability, no data access).
- **Alternatives considered**: Running SQL by hand (rejected: no audit, error-prone); a separate
  admin app (rejected: out of scope).

## R11. Arabic/English and right-to-left (FR-025–FR-027, SC-008)

- **Decision**: Plain JSON dictionaries `studio/i18n/ar.json` and `en.json`; elements carry
  `data-i18n` keys; `i18n.js` sets `<html lang dir>` and fills text. CSS uses logical properties
  (`margin-inline-start`, `inset-inline-end`) so one stylesheet serves both directions.
  User-entered text uses `dir="auto"`. Initial language: saved preference → browser language →
  Arabic. Before sign-in the choice is kept in `localStorage`; after sign-in it is saved on the
  profile.
- **Rationale**: No i18n library needed for a handful of screens (Principle V). A test checks
  both dictionaries have identical keys, catching untranslated text.
- **Alternatives considered**: An i18n library (rejected: unnecessary dependency).

## R12. Testing approach (Principle VI)

- **Decision**:
  - **Database / RLS**: pgTAP tests run with `supabase test db` — tenant-boundary tests for every
    table, role tests, last-Owner trigger.
  - **Edge Functions**: `deno test` with the local Supabase stack — positive, negative, and
    authorisation cases per endpoint, plus key/secret non-disclosure checks on responses and
    logs.
  - **End-to-end**: Playwright (dev-only, never shipped) for the P1 journeys in both languages.
  - **i18n**: a dictionary-parity test.
- **Rationale**: Tenant-boundary, non-disclosure, and auth tests are release blockers; they need
  automated, repeatable evidence.
- **Alternatives considered**: Manual testing only (rejected: not repeatable evidence).

## R13. Scale and performance assumptions

- **Decision**: Plan for up to ~100 workspaces and ~1,000 users in the MVP; pages load in under
  2 s on a typical connection; sign-in to workspace under 15 s (SC-002). Final targets to be set
  per the charter.
- **Rationale**: Lightweight SaaS MVP; Supabase handles this comfortably without special design.
