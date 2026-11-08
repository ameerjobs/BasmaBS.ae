# Data Model: Authentication and Tenancy (001-auth-tenancy)

**Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

All tables live in the `public` schema unless noted. `auth.users` is owned by Supabase Auth and
is not modified directly. Every timestamp is `timestamptz`, stored in UTC.

## Enumerations

| Type | Values |
|------|--------|
| `workspace_role` | `owner`, `admin`, `editor`, `viewer` |
| `workspace_status` | `pending_owner`, `active` |
| `invitation_status` | `pending`, `accepted`, `revoked`, `expired` |
| `app_language` | `ar`, `en` |

## Entities

### profiles (User Account details)

One row per `auth.users` row, created by a trigger on `auth.users` insert.

| Field | Type | Rules |
|-------|------|-------|
| `user_id` | uuid PK, FK → `auth.users.id` (cascade) | |
| `email` | citext | Copied from `auth.users`; unique; read-only to the user |
| `display_name` | text | 1–80 chars after trimming (FR-008) |
| `preferred_language` | `app_language` | Default `ar` (FR-026) |
| `last_workspace_id` | uuid null, FK → `workspaces.id` (set null) | Must be a workspace the user belongs to (FR-012) |
| `created_at` | timestamptz | Default `now()` |

Email confirmation status and password live in `auth.users` only.

### workspaces (Tenant)

| Field | Type | Rules |
|-------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `name` | text | 1–80 chars after trimming; duplicates allowed (FR-009, edge case) |
| `status` | `workspace_status` | `pending_owner` at creation |
| `created_by` | uuid FK → `auth.users.id` | Must be a platform operator |
| `created_at` | timestamptz | |
| `activated_at` | timestamptz null | Set when the first Owner accepts |

### memberships

| Field | Type | Rules |
|-------|------|-------|
| `workspace_id` | uuid FK → `workspaces.id` (cascade) | PK part |
| `user_id` | uuid FK → `auth.users.id` (cascade) | PK part — one role per user per workspace (FR-011) |
| `role` | `workspace_role` | |
| `invited_by` | uuid null FK → `auth.users.id` | |
| `joined_at` | timestamptz | |

Index: `(user_id)` for "my workspaces" lookups.

### invitations

| Field | Type | Rules |
|-------|------|-------|
| `id` | uuid PK | |
| `workspace_id` | uuid FK → `workspaces.id` (cascade) | |
| `email` | citext | Lower-cased, trimmed |
| `role` | `workspace_role` | Admins cannot create `owner` (FR-019) |
| `token_hash` | text unique | SHA-256 of the random token; raw token only ever appears in the email link |
| `status` | `invitation_status` | |
| `invited_by` | uuid FK → `auth.users.id` | Operator for first-Owner invitations |
| `is_first_owner` | boolean | True for the operator-issued Owner invitation |
| `expires_at` | timestamptz | `created_at + 7 days` (FR-020) |
| `created_at` | timestamptz | |
| `accepted_at` / `revoked_at` | timestamptz null | |
| `accepted_by` | uuid null FK → `auth.users.id` | |

Partial unique index: one `pending` invitation per `(workspace_id, email)`.
`expired` is derived: a `pending` row with `expires_at < now()` is treated as expired everywhere
and is rewritten to `expired` when touched.

### platform_operators

| Field | Type | Rules |
|-------|------|-------|
| `user_id` | uuid PK FK → `auth.users.id` | Seeded by SQL only |
| `added_at` | timestamptz | |

### security_events (Audit)

| Field | Type | Rules |
|-------|------|-------|
| `id` | bigint identity PK | |
| `occurred_at` | timestamptz | Default `now()` |
| `actor_user_id` | uuid null | Null for anonymous actions (e.g., failed invitation preview) |
| `workspace_id` | uuid null | |
| `event_type` | text | One of: `workspace.created`, `workspace.renamed`, `workspace.activated`, `invitation.sent`, `invitation.resent`, `invitation.accepted`, `invitation.revoked`, `invitation.rejected`, `member.role_changed`, `member.removed`, `member.left` |
| `outcome` | text | `success` or `denied` |
| `details` | jsonb | Non-secret context only (e.g., `{ "from": "editor", "to": "admin", "target_user_id": … }`). Never tokens, links, passwords, or keys (SC-006) |

Sign-in success/failure and password-reset events come from the Supabase Auth audit log (R9).

### rate_limits (support)

| Field | Type | Rules |
|-------|------|-------|
| `bucket` | text PK | e.g., `invite-preview:<ip>` |
| `window_start` | timestamptz | |
| `count` | int | |

Service-role access only.

## Relationships

```text
auth.users 1──1 profiles
auth.users 1──* memberships *──1 workspaces
workspaces 1──* invitations
auth.users 1──0..1 platform_operators
workspaces 1──* security_events (nullable)
```

## State transitions

### Workspace

```text
(operator creates) ──► pending_owner ──(first-Owner invitation accepted)──► active
```

No transition back. Deletion is out of scope (spec Assumptions).

### Invitation

```text
            ┌──(accepted by matching, confirmed user)──► accepted
pending ────┼──(revoked by Owner/Admin, or replaced/resent)──► revoked
            └──(now > expires_at)──► expired
```

Only `pending` and unexpired invitations can be accepted (FR-020, FR-021). Resending creates a
new invitation and revokes the previous one, so old links stop working (US2 scenario 3).

### Membership role changes (who may do what)

| Actor role | May set target role to | May act on targets with role |
|------------|------------------------|------------------------------|
| Owner | any | any (including other Owners) |
| Admin | `admin`, `editor`, `viewer` | `editor`, `viewer` only |
| Editor, Viewer | — | — |

Any change that would leave an `active` workspace with zero Owners is refused (FR-015), by the
Edge Function and by the `enforce_owner_exists` trigger.

## Row Level Security summary

| Table | `select` for `authenticated` | Writes for `authenticated` |
|-------|------------------------------|----------------------------|
| `profiles` | Own row only; co-members are read through the `workspace_members` view (workspace_id, user_id, display_name, email, role, joined_at; filtered by `app.is_member`) | Update own `display_name`, `preferred_language`, `last_workspace_id` (must be a member) |
| `workspaces` | Where `app.is_member(id)` | None |
| `memberships` | Where `app.is_member(workspace_id)` | None |
| `invitations` | Where `app.has_role(workspace_id, {owner,admin})`; `token_hash` excluded via column grants | None |
| `platform_operators` | Own row only (lets the UI show the operator page) | None |
| `security_events` | None in this feature (feature 006 adds Owner/Admin read) | None |
| `rate_limits` | None | None |

The `anon` role has no access to any table. Helpers `app.is_member(ws uuid)` and
`app.has_role(ws uuid, roles workspace_role[])` are `SECURITY DEFINER`, `STABLE`, use a fixed
`search_path`, and read `auth.uid()`.

## Conventions for later features

Every tenant-owned table created by features 002–006 MUST have `workspace_id uuid not null`
referencing `workspaces.id`, RLS enabled, and policies built on `app.is_member` /
`app.has_role` (FR-010, constitution Principle II).
