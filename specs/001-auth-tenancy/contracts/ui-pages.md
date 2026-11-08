# Contract: Studio Pages (001-auth-tenancy)

Static pages under `studio/`. Every page:

- sets `<html lang dir>` from the active language (`ar` → `rtl`, `en` → `ltr`) and shows a
  language switch (FR-025, FR-026);
- uses only `data-i18n` keys for fixed text — no hard-coded user-visible strings;
- is reachable by keyboard, with visible focus and labelled form controls (Principle V);
- shows a translated error from the API `message_key` and never shows raw errors.

| Page | Access | Purpose | Spec |
|------|--------|---------|------|
| `index.html` | Public | Sign in; links to "Forgot password". No sign-up link. | US1, FR-001, FR-004 |
| `forgot.html` | Public | Request a reset email; always shows the same confirmation message | FR-005, FR-006 |
| `reset.html` | Reset link | Set a new password; other sessions end | FR-005 |
| `accept.html?token=…` | Public → signed in | Shows invitation preview; register (no account) or sign in (account exists), then accept | US1, US2, US3, FR-021 |
| `confirm.html` | Confirmation link | Landing page after email confirmation; continues to `accept.html` | FR-002 |
| `app.html` | Signed in, member | Workspace home: workspace name, my role, workspace switcher (if more than one), sign out. Shows the "no workspace — ask for an invitation" message when the user has none | US1, US2 #6, US4 |
| `members.html` | Owner/Admin to manage; others read-only list | Members, roles, pending invitations; invite, resend, revoke, change role, remove | US3 |
| `workspace-settings.html` | Owner | Rename workspace | FR-013 |
| `account.html` | Signed in | Display name, language, change password | FR-008, FR-026 |
| `operator.html` | Platform operator | Create workspace + first-Owner email; list workspaces; resend/replace Owner invitation | US2, FR-009 |

## Navigation and session rules

- Any protected page without a valid session redirects to `index.html?next=<path>`; after
  sign-in the user returns to `next` (only same-origin relative paths are accepted) (FR-004a).
- After 8 hours with no interaction the page signs out and redirects the same way (R7).
- The active workspace comes from `?ws=<id>` or `profiles.last_workspace_id`; if the user is not
  a member, the page shows "not available" without saying whether the workspace exists (FR-017).
- Pages hide controls the role cannot use, but the server checks every action anyway.
