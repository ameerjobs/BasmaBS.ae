# Feature Specification: Authentication and Tenancy

**Feature Branch**: `001-auth-tenancy`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "001-auth-tenancy" — first feature in the constitution's initial
feature sequence: tenant onboarding and membership, authentication, and roles for Basma Book
Store Studio.

## Clarifications

### Session 2026-11-08

- Q: Who should be able to create a new workspace (tenant)? → A: Only the platform operator
  creates workspaces and invites the first Owner; users can join only by invitation (no
  self-service workspace creation or open sign-up).
- Q: Which set of roles should each workspace have? → A: Four roles — Owner, Admin, Editor,
  Viewer — with the permissions in FR-014.
- Q: Who should own and manage the AI provider keys? → A: Keys belong to the workspace; only
  Owners can add, replace, or remove them (Editors and above may use them for generation in
  feature 004 but never see them).
- Q: Which languages must the sign-in, invitation, and workspace screens support at launch?
  → A: Arabic and English, user-switchable, with right-to-left layout for Arabic and emails in
  both languages.
- Q: How long should a user stay signed in before they have to sign in again? → A: Signed out
  after 8 hours of inactivity.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign up, sign in, and land in my workspace (Priority: P1)

An invited person opens their invitation link, creates an account with the invited email and
a password, confirms their email address, and signs in. After sign-in they land in their
workspace (tenant) and see only that workspace's data. They can sign out, and they can reset a
forgotten password. There is no open sign-up: an account can only be created from an
invitation.

**Why this priority**: Nothing else in the product (books, content kits, AI generation) is
reachable without a secure identity bound to a tenant. This is the minimum viable slice.

**Independent Test**: Starting from an invitation, create an account, confirm the email, sign
in, observe the workspace landing page showing the correct workspace name, sign out, and
confirm protected pages are no longer reachable.

**Acceptance Scenarios**:

1. **Given** an invited person with no account, **When** they register from the invitation
   link with the invited email and a password meeting the policy, **Then** an account is
   created in an unconfirmed state and a confirmation message is sent to that email.
2. **Given** a visitor without an invitation, **When** they look for a way to register,
   **Then** none is offered, and any direct registration attempt is refused.
3. **Given** an unconfirmed account, **When** the user tries to sign in, **Then** access is
   refused with a message explaining the email must be confirmed, and a resend option is shown.
4. **Given** a confirmed account with one workspace, **When** the user signs in with correct
   credentials, **Then** they land in that workspace.
5. **Given** a signed-in user, **When** they sign out, **Then** their session ends and any
   protected page redirects to sign-in.
6. **Given** a user who forgot their password, **When** they request a reset and follow the
   emailed link, **Then** they can set a new password and all their other sessions end.
7. **Given** a sign-in attempt with wrong credentials, **When** it fails, **Then** the message
   does not reveal whether the email is registered.

---

### User Story 2 - Operator provisions a workspace and its first Owner (Priority: P1)

The platform operator creates a workspace by giving it a name and the email of its first
Owner. The system sends that person an Owner invitation; when they accept it they become the
workspace's Owner and can invite the rest of their team.

**Why this priority**: Every tenant-owned record requires a tenant (constitution Principle II),
and workspaces can only come into existence through the operator, so this must exist before
anyone can use the product.

**Independent Test**: As the operator, create a workspace with a first-Owner email; accept the
invitation as that person; confirm they are recorded as its Owner and are taken into it.

**Acceptance Scenarios**:

1. **Given** the platform operator, **When** they submit a valid workspace name and a
   first-Owner email, **Then** the workspace is created in a "pending Owner" state and an
   Owner invitation is sent to that email.
2. **Given** a pending first-Owner invitation, **When** the invitee accepts it, **Then** they
   become the workspace's Owner and the workspace becomes active.
3. **Given** a workspace still pending its first Owner, **When** the operator resends or
   replaces the Owner invitation, **Then** the previous invitation stops working.
4. **Given** an empty or over-length workspace name, **When** submitted, **Then** creation is
   refused with a clear validation message.
5. **Given** any user who is not the platform operator, **When** they try to create a
   workspace, **Then** the action is refused.
6. **Given** a confirmed user with no workspace membership (for example, after being removed
   from their only workspace), **When** they sign in, **Then** they see a message that they
   have no workspace and must be invited, and no workspace data is shown.

---

### User Story 3 - Invite teammates and manage roles (Priority: P2)

A workspace Owner or Admin invites people by email and assigns a role. Invitees accept the
invitation (creating an account if needed) and join the workspace with that role. Owners and
Admins can change roles and remove members within the limits of their own role.

**Why this priority**: Collaboration is core to a multi-tenant SaaS, but a single-user
workspace already delivers value, so this follows the P1 stories.

**Independent Test**: As an Owner, invite a second email as Editor; accept as that user;
confirm they see the workspace with Editor permissions; then change their role and remove them.

**Acceptance Scenarios**:

1. **Given** an Owner or Admin, **When** they invite an email with a role, **Then** an
   invitation is recorded with an expiry and an invitation email is sent.
2. **Given** a valid, unexpired invitation, **When** the invitee accepts while signed in with
   the invited email, **Then** they become a member with the invited role.
3. **Given** an invitation, **When** someone signed in with a different email tries to accept
   it, **Then** acceptance is refused.
4. **Given** an expired or revoked invitation, **When** it is opened, **Then** acceptance is
   refused with an explanation.
5. **Given** an Admin, **When** they try to grant the Owner role, change an Owner's role, or
   remove an Owner, **Then** the action is refused.
6. **Given** a workspace with exactly one Owner, **When** that Owner tries to leave, demote
   themselves, or be removed, **Then** the action is refused until another Owner exists.
7. **Given** a member who is removed, **When** they next attempt any action in that workspace,
   **Then** access is denied immediately.

---

### User Story 4 - Belong to and switch between several workspaces (Priority: P3)

A user who is a member of more than one workspace (for example, a freelance writer working for
two publishers) chooses which workspace to work in and can switch without signing out.

**Why this priority**: Valuable for agencies and freelancers but not required for a first
release with single-workspace users.

**Independent Test**: Make one user a member of two workspaces; sign in; select each in turn
and confirm only the selected workspace's data and role apply.

**Acceptance Scenarios**:

1. **Given** a user in two or more workspaces, **When** they sign in, **Then** they can pick a
   workspace (defaulting to the last one used).
2. **Given** a user working in workspace A, **When** they switch to workspace B, **Then** all
   views and permissions reflect workspace B and their role there.
3. **Given** a user, **When** they try to open a workspace they are not a member of (for
   example, by editing a link), **Then** access is denied and no data from it is shown.

---

### Edge Cases

- A user is invited to a workspace with an email that has no account yet: they must register
  (and confirm) with that same email before the invitation can be accepted.
- An invitation is sent to someone who is already a member: the system refuses it and tells
  the inviter.
- A user's role is reduced or membership removed while they are signed in: the change applies
  to their next request, not only at their next sign-in.
- Repeated failed sign-in attempts for one account: further attempts are temporarily throttled.
- A password-reset or confirmation link is reused or expired: it is refused and the user can
  request a new one.
- A request names a workspace identifier the user does not belong to: it is rejected, and the
  response does not confirm whether that workspace exists.
- Two workspaces with the same display name: allowed; workspaces are distinguished internally.
- A session expires from 8 hours of inactivity while a form is open: the user is asked to sign
  in again, and the expired session cannot be used to submit the form.
- Mixed-direction text (for example, an English email address or workspace name on an Arabic
  screen): it displays correctly without breaking the right-to-left layout.

## Requirements *(mandatory)*

### Functional Requirements

**Accounts and sessions**

- **FR-001**: System MUST let a person register with an email address and a password only
  from a valid invitation, using the invited email; open self-registration MUST NOT exist.
- **FR-002**: System MUST require email confirmation before an account can sign in.
- **FR-003**: System MUST enforce a password policy of at least 8 characters and reject
  passwords known to be commonly breached.
- **FR-004**: System MUST let a confirmed user sign in and sign out, and MUST end the session
  on sign-out.
- **FR-004a**: System MUST end a session after 8 hours without user activity; the next action
  MUST require signing in again, and the user MUST be returned to where they were afterwards.
- **FR-005**: System MUST let users reset a forgotten password through a single-use,
  time-limited emailed link, and MUST end the user's other sessions after a reset.
- **FR-006**: System MUST NOT reveal whether an email is registered in sign-in, registration,
  or password-reset responses.
- **FR-007**: System MUST temporarily throttle sign-in attempts after repeated failures for the
  same account or source.
- **FR-008**: Users MUST be able to change their password and display name while signed in.

**Workspaces (tenants)**

- **FR-009**: System MUST allow only the platform operator to create a workspace, giving a name of
  1–80 characters and a first-Owner email; the system MUST send that email an Owner
  invitation and keep the workspace in a "pending Owner" state until it is accepted. The
  operator MUST be able to resend or replace the first-Owner invitation.
- **FR-010**: Every workspace-owned record created by this or later features MUST be associated
  with exactly one workspace.
- **FR-011**: System MUST let a user belong to multiple workspaces, holding exactly one role in
  each.
- **FR-012**: System MUST let a member of several workspaces choose and switch the active
  workspace, and MUST remember the last-used one.
- **FR-013**: Owners MUST be able to rename their workspace.

**Roles and permissions**

- **FR-014**: System MUST support four workspace roles with these permissions:
  - **Owner**: everything an Admin can do, plus rename the workspace, grant or revoke Owner,
    manage other Owners, and add, replace, or remove the workspace's AI provider keys
    (feature 004). Keys belong to the workspace, not to individual users.
  - **Admin**: invite members, revoke invitations, change roles of Editors and Viewers, remove
    Editors and Viewers, and view admin analytics (feature 006).
  - **Editor**: create, edit, and delete books and content, and run AI generation using the
    workspace's keys without ever seeing them (features 002–005).
  - **Viewer**: read-only access to the workspace's books and generated content.
- **FR-015**: Every active workspace MUST have at least one Owner; the system MUST refuse any
  action that would leave it with none. Only a workspace in the "pending Owner" state may have
  no Owner.
- **FR-016**: System MUST determine a user's workspace and role from its own membership records
  on every request, and MUST NOT rely on a workspace or role value supplied by the client.
- **FR-017**: System MUST deny, without leaking existence, any attempt to read or change data in
  a workspace the user is not a member of.
- **FR-018**: Role changes and member removals MUST take effect on the affected user's next
  request.

**Invitations**

- **FR-019**: Owners and Admins MUST be able to invite people by email with a chosen role
  (Admins may not invite Owners).
- **FR-020**: Invitations MUST expire 7 days after sending and MUST be single-use.
- **FR-021**: An invitation MUST only be accepted by a signed-in, confirmed user whose email
  matches the invited email.
- **FR-022**: Owners and Admins MUST be able to see pending invitations and revoke them.
- **FR-023**: System MUST refuse an invitation to an email that is already a member of the
  workspace.

**Language**

- **FR-025**: All screens and messages in this feature MUST be available in Arabic and English.
  Arabic MUST display right-to-left and English left-to-right.
- **FR-026**: Users MUST be able to switch language at any time, including before sign-in; the
  initial language MUST follow the browser preference (defaulting to Arabic when neither is
  preferred), and a signed-in user's choice MUST be remembered across sessions and devices.
- **FR-027**: Invitation, email-confirmation, and password-reset emails MUST be sent with both
  Arabic and English content (or in the recipient's saved language when known).

**Audit**

- **FR-024**: System MUST record security-relevant events — sign-in success and failure,
  password reset, workspace creation, invitation sent/accepted/revoked, role change, member
  removal — with actor, workspace, event type, and time, and MUST NOT record passwords or
  secrets.

### Key Entities

- **User Account**: A person who can sign in. Email (unique), display name, preferred language
  (Arabic or English), confirmation status, created time. A user can belong to zero or more workspaces.
- **Workspace (Tenant)**: The isolation boundary for all customer data. Name, status
  (pending Owner, active), created time, created by (platform operator). Owns books, content kits, AI configuration, and history in later features.
- **Membership**: Links one user to one workspace with exactly one role (Owner, Admin, Editor,
  Viewer). Joined time, who invited them.
- **Invitation**: A pending offer for an email to join a workspace with a role. Inviter,
  invited email, role, status (pending, accepted, revoked, expired), expiry time.
- **Security Event**: An audit record of a security-relevant action. Actor, workspace (if
  any), event type, time, outcome.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An invited user can register from the invitation, confirm their email, and reach
  their workspace in under 3 minutes (excluding email delivery time).
- **SC-002**: A returning user can sign in and reach their workspace in under 15 seconds.
- **SC-003**: In tenant-boundary testing, 100% of attempts to read or change another
  workspace's data — including requests that supply a forged workspace identifier — are
  denied.
- **SC-004**: In role testing, 100% of actions above a user's role (for example, an Editor
  inviting members, an Admin granting Owner) are denied.
- **SC-005**: A removed member or downgraded role loses the revoked access on their very next
  action, verified in 100% of test cases.
- **SC-006**: No passwords, reset links, or secrets appear in any audit record or error
  message, verified by review of test logs.
- **SC-007**: At least 90% of invited users who start acceptance complete joining on their
  first attempt during UAT.
- **SC-008**: Every screen, message, and email in this feature passes UAT review in both Arabic
  (right-to-left) and English, with no untranslated text.
- **SC-009**: In session testing, 100% of sessions idle for more than 8 hours are refused on
  their next action.

## Assumptions

- Sign-in is email and password only for the MVP; social sign-in and single sign-on are out of
  scope.
- Workspaces are created only by the platform operator (see Clarifications); users join only
  by invitation.
- The platform operator is a distinct, non-tenant actor with exactly one capability in this
  feature: creating workspaces and managing their first-Owner invitation. The operator does
  not gain access to any workspace's data. A full cross-workspace administration console is out
  of scope.
- Workspace deletion and account deletion are deferred until the privacy/retention decision
  in the charter is made.
- Multi-factor authentication is out of scope for the MVP but must not be precluded.
- Invitation, confirmation, and reset emails are sent through the identity provider's standard
  email capability; branded email templates are a nice-to-have.
- Billing, subscription plans, and payment are out of scope (constitution scope section).
- This feature is a dependency for features 002–006, which rely on its workspace and role
  model.
