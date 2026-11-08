---

description: "Task list for 001-auth-tenancy (compact, for low-cost implementation models)"
---

# Tasks: Authentication and Tenancy

**Input**: `/specs/001-auth-tenancy/` — this file is self-contained. Open another doc only when a
task names it (e.g., "see data-model.md › invitations").

## How to work (read once)

1. Do **one task at a time**, top to bottom. Read only the files the task names.
2. Each task ends with **Done when**. Run that check; if it passes, change `- [ ]` to `- [x]`.
3. Test tasks come first and must fail until the code task after them is done.
4. Never edit the store pages at the repo root (`index.html`, `shop.html`, `cart.html`,
   `about.html`, `contact.html`, `css/`, `js/`, `images/`).
5. Never put secrets (service-role key, email API key, raw tokens) in `studio/`.
6. No frameworks, no build step, no new libraries beyond those listed in the Context Card.
7. Keep files small (aim < 150 lines). Copy the templates below instead of inventing patterns.

## Context Card

- **Frontend**: plain HTML + CSS + vanilla JS ES modules in `studio/`. Supabase client from
  `studio/vendor/supabase-js.esm.js`.
- **Backend**: Supabase Edge Functions (Deno + TypeScript) in `supabase/functions/<name>/index.ts`.
- **DB**: one migration `supabase/migrations/20261108000000_auth_tenancy.sql`.
- **Roles**: `owner` > `admin` > `editor` > `viewer`. Workspace status: `pending_owner` | `active`.
- **Languages**: `ar` (dir `rtl`, default) and `en` (dir `ltr`).
- **Golden rule**: role/workspace are always looked up in the `memberships` table on the
  server. Never trust a role or workspace sent by the browser.
- **Error JSON** (all functions): `{ "error": { "code": "<code>", "message_key": "errors.<code>" } }`
  Codes → HTTP: `invalid_input` 400, `unauthenticated` 401, `forbidden` 403, `not_found` 404,
  `conflict` 409, `rate_limited` 429, `server_error` 500.
- **Rate limit for public functions**: 20 requests per 10 minutes per IP.
- **Invitation lifetime**: 7 days, single use. Tokens stored only as SHA-256 hash.
- **Commands**: `supabase db reset` · `supabase test db` · `deno test --allow-all supabase/functions/tests`
  · `deno test --allow-read studio/tests` · `npx playwright test`

### Template A — Edge Function (copy for every function)

```ts
import { handleCors, json } from "../_shared/cors.ts";
import { jsonError } from "../_shared/errors.ts";
import { requireUser, requireRole, serviceClient } from "../_shared/auth.ts";
import { writeEvent } from "../_shared/audit.ts";

Deno.serve(async (req) => {
  const pre = handleCors(req); if (pre) return pre;
  try {
    const user = await requireUser(req);              // remove for public functions
    const body = await req.json();
    // 1. validate body → return jsonError(400, "invalid_input", ["field"])
    // 2. check permission → await requireRole(user.id, body.workspace_id, ["owner","admin"])
    // 3. do the work with serviceClient()
    // 4. await writeEvent({ actor: user.id, workspaceId, eventType, outcome: "success", details })
    return json(200, { /* result */ });
  } catch (e) {
    return e instanceof Response ? e : jsonError(500, "server_error");
  }
});
```

### Template B — Studio page (copy for every page)

```html
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title data-i18n="page.NAME.title"></title>
  <link rel="stylesheet" href="css/studio.css">
</head>
<body>
  <header><span data-i18n="app.name"></span><div id="lang-switch"></div></header>
  <main><h1 data-i18n="page.NAME.heading"></h1><p id="msg" role="alert" aria-live="polite"></p>
    <!-- page content -->
  </main>
  <script type="module" src="js/pages/NAME.js"></script>
</body>
</html>
```

```js
// js/pages/NAME.js
import { initI18n, t } from "../i18n.js";
import { requireSession } from "../session.js";   // omit on public pages
import { callFunction } from "../api.js";
await initI18n();
const session = await requireSession();
// wire form → callFunction("fn-name", {...}) → show t(result.message_key) in #msg on error
```

---

## Phase 1: Setup

- [ ] T001 Create folders: `studio/{css,js/pages,i18n,vendor,tests}`, `supabase/{migrations,templates,functions/_shared/email,functions/tests,tests/database}`, `tests/e2e/`
  - Done when: folders exist.
- [ ] T002 Run `supabase init` and set auth options in `supabase/config.toml`:
  - `[auth] enable_signup = false`, `minimum_password_length = 8`, `jwt_expiry = 3600`, `site_url = "http://localhost:5173"`, `additional_redirect_urls` = `confirm.html`, `reset.html`, `accept.html` under that site
  - `[auth.email] enable_confirmations = true`, `double_confirm_changes = true`, `otp_expiry = 3600`
  - `[auth.sessions] inactivity_timeout = "8h"`
  - Done when: `supabase start` runs without config errors.
- [ ] T003 [P] Create `package.json` (devDependencies only, exact versions: `@playwright/test`, `http-server`) and `playwright.config.js` (baseURL `http://localhost:5173`, two projects: locale `ar-AE` and `en-US`)
  - Done when: `npx playwright --version` works.
- [ ] T004 [P] Download a pinned `@supabase/supabase-js` v2 ESM build to `studio/vendor/supabase-js.esm.js`; write version, URL, and SHA-256 in `studio/vendor/README.md`
  - Done when: file exists and README has all three values.
- [ ] T005 [P] Create `supabase/.env.example` with `EMAIL_DRIVER=log`, `EMAIL_API_KEY=`, `EMAIL_FROM=`, `STUDIO_ORIGIN=http://localhost:5173`; add `supabase/.env.local`, `node_modules/`, `test-results/`, `playwright-report/` to `.gitignore`
  - Done when: both files updated.
- [ ] T006 [P] Create `supabase/functions/deno.json` with an import map pinning `@supabase/supabase-js` (jsr, exact v2 version) and `@std/assert`
  - Done when: `deno check` on an empty file using both imports succeeds.
- [ ] T007 Hosted-project check (needs a real Supabase project; ask the sponsor for access). Verify and write results in `specs/001-auth-tenancy/poc-results.md`:
  1. `auth.admin.generateLink({ type: "signup" })` works while sign-up is disabled
  2. Session inactivity timeout is available on the plan
  3. Leaked-password protection is available on the plan
  4. Failed and successful sign-ins appear in the Auth audit log, and how long they are kept
  - Done when: file lists each item as Yes/No. If any is No, stop and tell the sponsor before Phase 2.
- [ ] T008 Gate: confirm with the sponsor that ADRs exist and are approved for the email provider (default Resend) and the Have I Been Pwned password check, in `Bassmah-BookStore/basma-project/decisions/architecture-decisions.md`
  - Done when: both ADRs are marked Approved. Do not start T026 or T042 before this.

---

## Phase 2: Foundation (blocks all stories)

### Database — one migration file, built in steps

- [ ] T009 Write tests `supabase/tests/database/rls_tenant_boundary.test.sql` (pgTAP). Setup: workspaces A and B, user `a@test` member of A only. Assert:
  - `a@test` selects 0 rows of B from `workspaces`, `memberships`, `invitations`, `workspace_members`
  - `anon` selects 0 rows from every table
  - `authenticated` cannot insert/update/delete `workspaces`, `memberships`, `invitations`, `platform_operators`, `security_events`, `rate_limits`
  - selecting `invitations.token_hash` as `authenticated` fails
  - Done when: file runs and fails (tables not created yet).
- [ ] T010 [P] Write tests `supabase/tests/database/owner_trigger.test.sql`: removing or demoting the only Owner of an `active` workspace raises an error; a `pending_owner` workspace with no Owner is allowed
  - Done when: file runs and fails.
- [ ] T011 [P] Write tests `supabase/tests/database/profiles.test.sql`: inserting an `auth.users` row creates a `profiles` row; user updates only own row; `display_name` must be 1–80 chars after trim; `last_workspace_id` must be a workspace the user belongs to; `email` cannot be updated by the user
  - Done when: file runs and fails.
- [ ] T012 Migration part 1 in `supabase/migrations/20261108000000_auth_tenancy.sql`: `create extension citext`; enums `workspace_role(owner,admin,editor,viewer)`, `workspace_status(pending_owner,active)`, `invitation_status(pending,accepted,revoked,expired)`, `app_language(ar,en)`
  - Done when: `supabase db reset` succeeds.
- [ ] T013 Migration part 2: create the 7 tables exactly as in data-model.md › Entities (`profiles`, `workspaces`, `memberships`, `invitations`, `platform_operators`, `security_events`, `rate_limits`), including checks: names 1–80 chars after trim; `invitations.expires_at default now() + interval '7 days'`; unique `token_hash`; partial unique index on `invitations(workspace_id, email) where status = 'pending'`; `memberships` PK `(workspace_id, user_id)` + index on `user_id`
  - Done when: `supabase db reset` succeeds.
- [ ] T014 Migration part 3: schema `app` with two `security definer stable` SQL functions using `set search_path = public`:
  - `app.is_member(ws uuid) returns boolean` → exists membership for `auth.uid()`
  - `app.has_role(ws uuid, roles workspace_role[]) returns boolean`
  - Done when: `supabase db reset` succeeds.
- [ ] T015 Migration part 4: enable RLS on all 7 tables; add policies from data-model.md › Row Level Security summary; `revoke select (token_hash) on invitations from authenticated`; create view `workspace_members` (workspace_id, user_id, display_name, email, role, joined_at) with `security_invoker` filtered by `app.is_member(workspace_id)`
  - Done when: T009 passes (`supabase test db`).
- [ ] T016 Migration part 5: trigger `handle_new_user` (after insert on `auth.users` → insert `profiles` with email, `raw_user_meta_data->>'display_name'`, `raw_user_meta_data->>'preferred_language'` default `ar`); trigger `enforce_owner_exists` (before update/delete on `memberships` → raise if it leaves an `active` workspace with 0 owners)
  - Done when: T010 and T011 pass.
- [ ] T017 Create `supabase/seed.sql` (local only — never run against a hosted project): user `operator@local.test` / password `Operator#Local1` (confirmed) + `platform_operators` row; workspace "Seed House" (`pending_owner`); pending first-Owner invitation for `owner@local.test` with raw token `seed-token-owner-0001` (store its SHA-256 hex as `token_hash`, `is_first_owner = true`, `role = owner`)
  - Done when: `supabase db reset` loads seed without errors.

### Shared Edge Function code (`supabase/functions/_shared/`)

- [ ] T018 [P] `_shared/errors.ts`: `jsonError(status, code, fields?)` returns a `Response` with the Error JSON (Context Card); `safeLog(obj)` logs with keys `password`, `token`, `authorization`, `apikey`, `link` replaced by `"[redacted]"`
  - Done when: `deno check` passes.
- [ ] T019 [P] `_shared/cors.ts`: `handleCors(req)` answers `OPTIONS` for origin `STUDIO_ORIGIN` only; `json(status, body)` adds CORS headers
  - Done when: `deno check` passes.
- [ ] T020 Write test `supabase/functions/tests/shared_auth.test.ts`: no/invalid bearer → 401; non-member → 403; role taken from DB even if body says `"role":"owner"`
  - Done when: test runs and fails.
- [ ] T021 `_shared/auth.ts`: `serviceClient()` (uses `SUPABASE_SERVICE_ROLE_KEY`); `requireUser(req)` verifies bearer with `auth.getUser`, throws `jsonError(401,"unauthenticated")`; `requireRole(userId, workspaceId, roles)` reads `memberships`, throws 403 if missing/not allowed, returns role; `requireOperator(userId)` checks `platform_operators`, throws 403
  - Done when: T020 passes.
- [ ] T022 [P] `_shared/audit.ts`: `writeEvent({ actor, workspaceId, eventType, outcome, details })` inserts into `security_events`; rejects unknown `eventType` (list in data-model.md › security_events); removes keys `password`, `token`, `link`, `key` from `details`
  - Done when: `deno check` passes.
- [ ] T023 [P] `_shared/tokens.ts`: `newToken()` = 32 random bytes base64url; `hashToken(raw)` = SHA-256 hex
  - Done when: `deno check` passes.
- [ ] T024 [P] `_shared/rate-limit.ts`: `checkRate(bucket)` fixed window 10 min, max 20, on table `rate_limits`; throws `jsonError(429,"rate_limited")`
  - Done when: `deno check` passes.
- [ ] T025 [P] `_shared/invitations.ts`: `findUsableInvitation(rawToken)` → hash, load row; if `pending` and `expires_at < now()` update to `expired`; return row only if `pending` and not expired, else `null`
  - Done when: `deno check` passes.
- [ ] T026 [P] `_shared/email.ts`: `sendEmail({ to, subject, html, text })` — if `EMAIL_DRIVER=log` print to console; if `resend` POST to Resend API with `EMAIL_API_KEY`. Plus `invitationEmail({ workspaceName, role, link, lang? })` and `confirmationEmail({ link, lang? })` returning `{subject, html, text}` with an Arabic block (`<div dir="rtl" lang="ar">`) and an English block; only one block when `lang` given
  - Done when: `deno check` passes.

### Shared frontend code (`studio/`)

- [ ] T027 [P] `studio/js/config.js` (export `SUPABASE_URL`, `SUPABASE_ANON_KEY` — public values only) and `studio/js/supabase-client.js` (export `supabase = createClient(...)`)
  - Done when: importing in a browser console works.
- [ ] T028 [P] Write test `studio/tests/i18n-parity.test.js` (Deno): `ar.json` and `en.json` have the same keys and no empty values
  - Done when: test runs.
- [ ] T029 [P] `studio/i18n/ar.json` and `studio/i18n/en.json`: keys `app.name`, `lang.ar`, `lang.en`, `nav.signout`, and `errors.invalid_input`, `errors.unauthenticated`, `errors.forbidden`, `errors.not_found`, `errors.conflict`, `errors.rate_limited`, `errors.server_error`, `errors.not_available`
  - Done when: T028 passes.
- [ ] T030 `studio/js/i18n.js`: `initI18n()` picks language (profile → `localStorage` → browser → `ar`), sets `<html lang dir>`, fills `[data-i18n]` text and `[data-i18n-placeholder]`, renders AR/EN switch in `#lang-switch`; `t(key)`; `setLanguage(lang)` saves to `localStorage` and, if signed in, `profiles.preferred_language`
  - Done when: a test page switches direction when clicking the switch.
- [ ] T031 [P] `studio/css/studio.css`: logical properties only (`margin-inline-*`, `padding-inline-*`, `text-align: start`), visible `:focus-visible`, labelled forms, single column under 600px
  - Done when: a page looks correct in both `rtl` and `ltr`.
- [ ] T032 `studio/js/session.js`: `requireSession()` → if no session redirect to `index.html?next=<path>`; `safeNext(v)` allows only paths starting with `/` or a page name, never `//` or `http`; idle timer: on no click/key/scroll for 8 h call `signOut()` and redirect with `next`
  - Done when: opening a protected page signed out redirects with `next`.
- [ ] T033 `studio/js/api.js`: `callFunction(name, body)` → `supabase.functions.invoke`; on error returns `{ error: { code, message_key } }`, never raw error text
  - Done when: calling an unknown function returns `errors.server_error`.
- [ ] T034 `studio/js/workspace.js`: `loadWorkspace()` → my memberships (join `workspaces`); active = `?ws=` → `profiles.last_workspace_id` → first; if `?ws=` is not mine show `errors.not_available` and return `null`; returns `{ workspace, role, memberships }`
  - Done when: `?ws=<random uuid>` shows "not available".

**Checkpoint**: `supabase test db` all green.

---

## Phase 3: US1 — Sign up from invitation, sign in, reset password (P1) 🎯 MVP

Independent test: use seeded token `seed-token-owner-0001` for `owner@local.test`.

- [ ] T035 [P] [US1] Write test `supabase/functions/tests/invitations_preview.test.ts`: valid seed token → `workspace_name`, `role`, `email_masked`, `account_exists`, `expires_at`; unknown, revoked, expired → identical 404; 21st call in 10 min → 429
  - Done when: runs and fails.
- [ ] T036 [P] [US1] Write test `supabase/functions/tests/invitations_register.test.ts`: valid token + good password → 201 `{status:"confirmation_sent"}` and user unconfirmed; password < 8 or breached → 400; confirmed account exists → 409; unconfirmed account exists → 200 and email re-sent; anon `auth.signUp` → error
  - Done when: runs and fails.
- [ ] T037 [P] [US1] Write test `supabase/functions/tests/invitations_accept.test.ts`: matching confirmed user → membership created, events `invitation.accepted` (+ `workspace.activated` for first Owner, workspace becomes `active`); other email → 403 + `invitation.rejected`; unconfirmed → 403; same token again → 404
  - Done when: runs and fails.
- [ ] T038 [US1] `supabase/functions/invitations-preview/index.ts` (public, Template A without `requireUser`): `checkRate("preview:"+ip)`; `findUsableInvitation`; return workspace name, role, masked email (`ab***@domain`), `account_exists`, `expires_at`; else 404
  - Done when: T035 passes.
- [ ] T039 [US1] `supabase/functions/invitations-register/index.ts` (public): rate limit; usable invitation; password ≥ 8 chars; if Leaked-password protection is No in poc-results.md, check HIBP range API with first 5 chars of SHA-1; if user exists and confirmed → 409; else `auth.admin.generateLink({ type:"signup", email: inv.email, password, options:{ data:{display_name, preferred_language: language}, redirectTo: STUDIO_ORIGIN+"/confirm.html?token="+token } })`; send `confirmationEmail`
  - Done when: T036 passes.
- [ ] T040 [US1] `supabase/functions/invitations-accept/index.ts`: `requireUser`; user must have `email_confirmed_at` and `lower(email) = inv.email`, else 403 + event `invitation.rejected` (outcome `denied`); insert membership (role from invitation, `invited_by`); set invitation `accepted`, `accepted_at`, `accepted_by`; if `is_first_owner` set workspace `active`, `activated_at`, event `workspace.activated`; event `invitation.accepted`; return `{ workspace, role }`
  - Done when: T037 passes.
- [ ] T041 [P] [US1] `studio/index.html` + `studio/js/pages/sign-in.js` (Template B, public): email + password → `supabase.auth.signInWithPassword`; any failure → one generic message `signin.failed`; "email not confirmed" → `signin.unconfirmed` (tells user to reopen the invitation link to get a new email); 429 → `errors.rate_limited`; link to `forgot.html`; NO sign-up link; on success go to `safeNext(next)` or `app.html`
  - Done when: seeded operator can sign in.
- [ ] T042 [P] [US1] `studio/forgot.html`, `studio/reset.html` + `js/pages/forgot.js`, `js/pages/reset.js`: forgot → `resetPasswordForEmail(email, {redirectTo: reset.html})`, always show the same message; reset → `updateUser({password})` then `signOut({ scope: "others" })`, go to `app.html`
  - Done when: reset email appears in local mail log and new password works.
- [ ] T043 [P] [US1] `studio/accept.html`, `studio/confirm.html` + `js/pages/accept.js`, `js/pages/confirm.js`: accept → call `invitations-preview`; if `account_exists=false` show form (password, display name) → `invitations-register` → show "check your email"; if account exists and not signed in → `index.html?next=accept.html?token=…`; if signed in → `invitations-accept` → `app.html?ws=<id>`. confirm → redirect to `accept.html?token=<token>`
  - Done when: full flow with the seed token ends in `app.html`.
- [ ] T044 [P] [US1] `studio/app.html` + `js/pages/app.js` (protected): `loadWorkspace()`; show workspace name, my role, sign-out button; if no memberships show `app.no_workspace` message and nothing else
  - Done when: Owner sees "Seed House" and role `owner`.
- [ ] T045 [P] [US1] `studio/account.html` + `js/pages/account.js` (protected): edit display name (1–80 chars) and language (`profiles`), change password (`updateUser`)
  - Done when: changes persist after reload.
- [ ] T046 [US1] Add all keys used by T041–T045 to `studio/i18n/ar.json` and `en.json`
  - Done when: T028 passes and no page shows a raw key.
- [ ] T047 [US1] `supabase/templates/recovery.html`: reset email with Arabic (`dir="rtl"`) and English blocks using `{{ .ConfirmationURL }}`; reference it in `supabase/config.toml` under `[auth.email.template.recovery]`
  - Done when: local reset email shows both languages.
- [ ] T048 [US1] Write Playwright `tests/e2e/us1-signin.spec.ts` (both locales): no sign-up link; register with seed token; unconfirmed sign-in message; confirm (read link from function log or `EMAIL_DRIVER=log` output); land in app; sign out → protected page redirects; reset password; unknown vs known email give same messages; time the invite→app flow (< 3 min) and sign-in→app (< 15 s)
  - Done when: passes in `ar` and `en`.

---

## Phase 4: US2 — Operator creates workspaces (P1)

- [ ] T049 [P] [US2] Write test `supabase/functions/tests/workspaces_operator.test.ts`: `workspaces-create` non-operator → 403, bad name/email → 400, success → `pending_owner` + invitation + email logged + events `workspace.created`, `invitation.sent`; `workspaces-owner-invite` → old token 404, new one works, workspace `active` → 409; `workspaces-list-operator` returns only `id,name,status,created_at,pending_owner_email`; operator with no membership reads 0 rows of `memberships`
  - Done when: runs and fails.
- [ ] T050 [US2] `supabase/functions/workspaces-create/index.ts`: `requireOperator`; validate name 1–80 after trim + email; insert workspace; insert invitation (`role owner`, `is_first_owner true`, token hash); `sendEmail(invitationEmail(...))` with link `STUDIO_ORIGIN/accept.html?token=…`; events; 201
  - Done when: T049 create cases pass.
- [ ] T051 [US2] `supabase/functions/workspaces-owner-invite/index.ts`: `requireOperator`; 409 if `active`; revoke pending first-Owner invitation; create + email new one (body `owner_email` optional); event `invitation.resent`
  - Done when: T049 owner-invite cases pass.
- [ ] T052 [US2] `supabase/functions/workspaces-list-operator/index.ts`: `requireOperator`; select only the 5 contract fields
  - Done when: T049 passes fully.
- [ ] T053 [US2] `studio/operator.html` + `js/pages/operator.js` (protected): if no own `platform_operators` row show `errors.not_available`; create form (name, owner email, language); table of workspaces with "resend / change owner email"; in `js/pages/app.js` show an "Operator" link only for operators; add keys to both i18n files
  - Done when: operator creates "Test House" and the Owner can accept via T043 flow.

---

## Phase 5: US3 — Invite teammates, manage roles (P2)

Permission table (use everywhere in this phase):

| Actor | Can invite roles | Can change/remove targets with role | Can set role to |
|-------|------------------|-------------------------------------|-----------------|
| owner | any | any | any |
| admin | admin, editor, viewer | editor, viewer | admin, editor, viewer |
| editor, viewer | none | none | none |

Any change leaving an active workspace with 0 owners → 409 `conflict`.

- [ ] T054 [P] [US3] Write test `supabase/functions/tests/invitations_manage.test.ts`: create/resend/revoke follow the table; already member → 409; pending exists → 409; Admin revoking a first-Owner invitation → 403; resend makes old token 404; events written
  - Done when: runs and fails.
- [ ] T055 [P] [US3] Write test `supabase/functions/tests/members_manage.test.ts`: role change and removal follow the table; last Owner demote/remove/leave → 409; self-remove = leave; events `member.role_changed` (details `{from,to,target_user_id}`), `member.removed`, `member.left`; after removal the user's next DB query returns 0 rows for that workspace
  - Done when: runs and fails.
- [ ] T056 [US3] `supabase/functions/invitations-create/index.ts`: `requireRole(owner,admin)`; check table; lower-case+trim email; 409 if member or pending exists; create + email; event `invitation.sent`
  - Done when: T054 create cases pass.
- [ ] T057 [US3] `supabase/functions/invitations-resend/index.ts` and `supabase/functions/invitations-revoke/index.ts`: owner/admin; resend = revoke old + create new; revoke sets `revoked`, `revoked_at`; Admin cannot touch `is_first_owner` invitations
  - Done when: T054 passes.
- [ ] T058 [US3] `supabase/functions/members-update-role/index.ts` and `supabase/functions/members-remove/index.ts`: follow the table; remove also clears the target's `profiles.last_workspace_id` if it equals this workspace
  - Done when: T055 passes.
- [ ] T059 [US3] `supabase/functions/workspaces-rename/index.ts`: `requireRole(owner)`; name 1–80 after trim; event `workspace.renamed`; add a rename test case to `supabase/functions/tests/members_manage.test.ts` (non-owner → 403)
  - Done when: test passes.
- [ ] T060 [P] [US3] `studio/members.html` + `js/pages/members.js` (protected): list from `workspace_members`; for owner/admin: invite form (email, role — hide `owner` for admin), pending invitations from `invitations` with resend/revoke, role dropdown and remove per row only where the table allows; "Leave workspace" for everyone
  - Done when: Owner can invite, change role, remove.
- [ ] T061 [P] [US3] `studio/workspace-settings.html` + `js/pages/workspace-settings.js`: owner-only rename; others see `errors.not_available`
  - Done when: rename shows in `app.html`.
- [ ] T062 [US3] Add Members/Settings links in `js/pages/app.js` by role; add all US3 keys to both i18n files
  - Done when: T028 passes.
- [ ] T063 [US3] Write Playwright `tests/e2e/us3-members.spec.ts` (both locales): invite Editor + Viewer, accept, promote Editor to Admin, Admin cannot grant owner, remove signed-in Viewer → Viewer denied on next click
  - Done when: passes.

---

## Phase 6: US4 — Switch workspaces (P3)

- [ ] T064 [US4] In `studio/js/workspace.js` add `renderSwitcher(el)` (only if 2+ memberships): on change update `profiles.last_workspace_id` and reload with `?ws=<id>`; call it from `app.js`, `members.js`, `workspace-settings.js`; add keys to both i18n files
  - Done when: switching changes name, role, and members list.
- [ ] T065 [US4] Write Playwright `tests/e2e/us4-switch.spec.ts` (both locales): last-used workspace opens after sign-in; switch works; `?ws=<other workspace>` shows "not available" and no data
  - Done when: passes.

---

## Phase 7: Polish & release evidence

- [ ] T066 [P] Write `supabase/functions/tests/non_disclosure.test.ts`: call every function (success + failure) and assert responses, captured logs, and `security_events.details` contain no password, raw token, `confirm.html?token`, `accept.html?token`, service-role key, or `EMAIL_API_KEY`
  - Done when: passes.
- [ ] T067 [P] Accessibility pass on every `studio/*.html`: `<header>/<main>` landmarks, every input has `<label>`, `#msg` uses `aria-live`, user-entered text uses `dir="auto"`, keyboard-only walkthrough works
  - Done when: checklist written at the bottom of `studio/README.md`.
- [ ] T068 [P] Write `studio/README.md`: local setup (quickstart.md commands), env vars, how to add a production operator by SQL, email provider + DNS setup, secret owners and how to rotate/revoke the service-role key and email API key, static deployment, "never use `--include-seed` on hosted projects"
  - Done when: a new developer can follow it.
- [ ] T069 Update `specs/001-auth-tenancy/contracts/edge-functions.md` › `invitations-register`: unconfirmed existing account → 200 and confirmation re-sent
  - Done when: contract matches T039.
- [ ] T070 Run all commands from the Context Card and quickstart.md scenarios 1–17; record pass/fail and evidence in `specs/001-auth-tenancy/uat-evidence.md`; list open sponsor items (audit retention period, email provider, hosting)
  - Done when: file complete and all release-blocker tests pass.
- [ ] T071 Sponsor sign-off: sponsor reviews `uat-evidence.md` and writes "Accepted" with date at the end
  - Done when: signed off (constitution Principle VIII).

---

## Dependencies

- Phase 1 → Phase 2 → stories. T007 and T008 must finish before Phase 2 work that depends on them (T026, T039).
- US1 works alone with seed data. US2 reuses US1's accept page (T043). US3 needs US1 pages. US4 needs US1 + US3 pages.
- Files edited by several tasks (do these one after another, never in parallel): `studio/i18n/*.json`, `studio/js/pages/app.js`, `studio/js/workspace.js`, the migration file.

## Parallel work

- `[P]` tasks touch different files and can run at the same time.
- After Phase 2: one model can do `supabase/` tasks while another does `studio/` tasks of the same story (ADR-007: Claude Code/GLM-4.7 for `supabase/` + tests; Antigravity/Gemini for `studio/`).

## MVP

Phases 1–3 = demoable MVP (uses seed data). Add Phase 4 for the first real release (operator can
onboard workspaces).
