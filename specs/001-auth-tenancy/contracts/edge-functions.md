# Contract: Edge Functions (001-auth-tenancy)

Base URL: `<SUPABASE_URL>/functions/v1/`. All requests and responses are JSON (UTF-8).

## Common rules

- **Auth**: unless marked *Public*, a request MUST carry `Authorization: Bearer <user access
  token>`. The function verifies the token with Supabase Auth and derives the caller's user id.
  Workspace membership and role are looked up in `memberships` on every call (research R4);
  no role or tenant value from the request is trusted.
- **Workspace id in the body** is only a *target*; access is still checked against the caller's
  membership.
- **Errors** use one shape and never include stack traces, tokens, keys, or whether an email is
  registered (FR-006):

  ```json
  { "error": { "code": "forbidden", "message_key": "errors.forbidden" } }
  ```

  `message_key` is an i18n key the browser translates.

| HTTP | `code` | Meaning |
|------|--------|---------|
| 400 | `invalid_input` | Validation failed (`fields` array lists the fields) |
| 401 | `unauthenticated` | Missing, invalid, or expired session |
| 403 | `forbidden` | Signed in but not allowed — also used for workspaces the caller is not a member of, so existence is not revealed (FR-017) |
| 404 | `not_found` | Invitation token unknown, revoked, or expired (one code for all three) |
| 409 | `conflict` | e.g., already a member, last Owner, invitation already used |
| 429 | `rate_limited` | Too many attempts |
| 500 | `server_error` | Unexpected; details only in server logs, with secrets redacted |

- **Audit**: every state-changing call writes a `security_events` row with `outcome` `success`
  or `denied` (FR-024).
- **CORS**: only the configured Studio origin(s) are allowed.

---

## Operator functions

### `POST workspaces-create`

Caller MUST be in `platform_operators`.

Request: `{ "name": "Dar Al-Kutub", "owner_email": "owner@example.com", "language": "ar" }`

Response `201`: `{ "workspace": { "id": "…", "name": "…", "status": "pending_owner" },
"invitation": { "id": "…", "email": "owner@example.com", "expires_at": "…" } }`

Effects: creates workspace (`pending_owner`), creates first-Owner invitation, sends Owner
invitation email. Errors: `invalid_input` (name 1–80 chars, valid email), `forbidden`.

### `POST workspaces-owner-invite`

Resend or replace the first-Owner invitation of a `pending_owner` workspace. Operator only.

Request: `{ "workspace_id": "…", "owner_email": "new-owner@example.com" }` (email optional —
omitted means resend to the same email)

Response `200`: `{ "invitation": { "id": "…", "email": "…", "expires_at": "…" } }`

Effects: revokes the current pending first-Owner invitation and issues a new one.
Errors: `conflict` if the workspace is already `active`.

### `GET workspaces-list-operator`

Operator only. Response `200`: `{ "workspaces": [ { "id", "name", "status", "created_at",
"pending_owner_email" } ] }`. Returns no member, book, or other tenant data.

---

## Invitation functions

### `POST invitations-create`

Caller role in the workspace MUST be `owner` or `admin`.

Request: `{ "workspace_id": "…", "email": "editor@example.com", "role": "editor" }`

Response `201`: `{ "invitation": { "id", "email", "role", "status": "pending", "expires_at" } }`

Errors: `forbidden` (Admin inviting `owner`, or non-Owner/Admin), `conflict` (email already a
member, or a pending invitation exists — use resend), `invalid_input`.

### `POST invitations-resend`

Owner/Admin. Request: `{ "invitation_id": "…" }`. Revokes the old invitation and sends a new one
with a fresh 7-day expiry. Response `200` with the new invitation.

### `POST invitations-revoke`

Owner/Admin (Admins cannot revoke a first-Owner invitation). Request: `{ "invitation_id": "…" }`.
Response `200`: `{ "invitation": { "id", "status": "revoked" } }`.

### `POST invitations-preview` — *Public*

Request: `{ "token": "<raw token from link>" }`

Response `200`: `{ "workspace_name": "…", "role": "editor", "email_masked": "ed***@example.com",
"account_exists": true|false, "expires_at": "…" }`

`account_exists` is returned only to the holder of a valid token (proof of inbox access), so
it does not let strangers probe for registered emails. Unknown/expired/revoked → `404
not_found`. Rate-limited per IP.

### `POST invitations-register` — *Public*

Create the account for an invitee who has none.

Request: `{ "token": "…", "password": "…", "display_name": "…", "language": "ar" }`

Response `201`: `{ "status": "confirmation_sent" }`

Effects: validates token and password policy (FR-003); creates the unconfirmed user for the
invited email; sends the bilingual confirmation email whose link returns to
`accept.html?token=…` after confirmation. Errors: `not_found`, `invalid_input` (weak or breached
password), `conflict` (account already exists — sign in instead), `rate_limited`.

### `POST invitations-accept`

Caller MUST be signed in, confirmed, and their account email MUST equal the invitation email
(case-insensitive) (FR-021).

Request: `{ "token": "…" }`

Response `200`: `{ "workspace": { "id", "name", "status": "active" }, "role": "editor" }`

Effects: creates the membership; marks the invitation `accepted`; for a first-Owner invitation,
sets the workspace `active`. Errors: `not_found`, `forbidden` (email mismatch — event logged as
`invitation.rejected`), `conflict` (already a member).

---

## Member and workspace functions

### `POST members-update-role`

Request: `{ "workspace_id": "…", "user_id": "…", "role": "admin" }`

Rules: see the role-change table in [data-model.md](../data-model.md). Errors: `forbidden`,
`conflict` (would leave zero Owners).

### `POST members-remove`

Request: `{ "workspace_id": "…", "user_id": "…" }`. If `user_id` is the caller, this is
"leave workspace" (allowed for any role, except the last Owner). Errors: `forbidden`,
`conflict` (last Owner).

### `POST workspaces-rename`

Owner only. Request: `{ "workspace_id": "…", "name": "…" }`. Response `200` with the workspace.

---

## Direct database access from the browser (RLS-guarded, no Edge Function)

| Operation | Table / view | Notes |
|-----------|--------------|-------|
| List my workspaces with my role | `memberships` join `workspaces` | |
| List members of the active workspace | `workspace_members` view | Display name, email, role, joined_at |
| List pending invitations | `invitations` | Owner/Admin only; no `token_hash` |
| Read / update my profile | `profiles` | Own row; `last_workspace_id` must be a member |
| Am I an operator? | `platform_operators` | Own row only |

Auth flows handled directly by the Supabase Auth client: sign in with password, sign out,
request password reset, set new password after reset, change own password.
