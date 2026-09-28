# Authentication and authorisation

Two different questions, answered by different tables.

**Who is this?** Better Auth. A session cookie, or a reviewer token.

**What may they do here?** A `memberships` row. Never a field on the user, and never the demo role switcher in `src/lib/roles.tsx`.

## Accounts

`POST /api/auth/sign-up/email` and `POST /api/auth/sign-in/email` are Better Auth's routes, mounted at `src/app/api/auth/[...all]/route.ts`.

Sign-up requires `givenName` and `familyName` as well as email, password, and name. `name` is the display string Better Auth expects. If it is blank, the create hook fills it from the given and family name.

`isSuspended` cannot be set by the client (`input: false`). A session create hook refuses a suspended user. `emailVerifiedAt` is stamped by us the first time Better Auth flips `emailVerified`; the boolean is what Better Auth reads, the timestamp is what an appeal wants.

Email verification is off unless `REQUIRE_EMAIL_VERIFICATION=true`. Reset and verification messages go through `deliverEmail`, which logs them until SMTP exists.

The browser client is `src/lib/auth-client.ts`. Sign-in, sign-up, and the shell session use it. `useSession` in `src/lib/session.tsx` loads `GET /api/v1/me` and keeps the memberships that decide the sidebar. A new account is joined to journal `ujer` as an author by `POST /api/v1/me`.

## ORCID

Set both `ORCID_CLIENT_ID` and `ORCID_CLIENT_SECRET`. The generic OIDC plugin then registers provider id `orcid` against ORCID's discovery document, with PKCE. The profile mapping stores `orcid` from the `sub` claim.

If either variable is missing, the provider is not registered and the process still boots. A self-typed ORCID on sign-up is not the same thing as a linked ORCID account. Treat the linked account as the one that was checked.

## Reviewer tokens

An invitation does not create a session.

1. `newReviewerToken()` returns 32 random bytes, base64url, and sha256 of that string.
2. `review_assignments.access_token_hash` stores the hash. The unique index is `(manuscript, reviewer, round)`.
3. The raw token is placed in the reviewer's notification body and in the email job. The job payload is cleared after a successful send. There is no second copy.
4. Opening `/api/v1/reviews/:token` hashes the path parameter and looks up the hash. A wrong token is a 404.
5. While the assignment is `invited`, the snapshot's `invitationExpiryDays` can move it to `expired` and return 410.
6. Accept, decline, and submit are the only writes the token authorises. The token does not grant access to any other manuscript.

Do not put the raw token in an editor-facing response. `inviteReviewer` returns the assignment id and the due date, not the link.

## Memberships

```text
memberships (journal_id, user_id, role, scope_type, scope_id, expires_at)
```

`journal_id` null and role `platform_admin` reaches every journal. Every write made that way inserts `audit_log` action `platform_admin.write` in the same transaction. Reads are not audited.

`scope_type` is `journal`, `section`, or `issue`. `findGrant` refuses a section grant when the manuscript's section does not match. List endpoints pass no resource into the grant check and then apply `scopeFilter`, so a section editor's desk is that section.

Expired grants are ignored.

The role groups in `src/server/authz.ts`:

| Group | Used for |
|---|---|
| editorial | Desk, invitations, decisions, issues, reports |
| author | Creating and submitting a manuscript, paying a charge |
| finance | Listing charges, waiving, recording a refund |
| production | Production board, DOI mint and deposit |
| settings | Reading and saving policy |
| integrity | Reserved for similarity review. The group exists; no route requires it alone yet |
| staff | Choosing the editor view of a manuscript the person did not write |
| member | Notifications |

`platform_admin` passes every group. An author who is also the handling editor of someone else's paper uses `staff` for that paper and the author view for their own.

## Demo session

`src/lib/session.tsx` writes a role to `localStorage`. It is how the three shells are previewed. It is not consulted by `/api/v1`. A screen that still reads mocks is inside the demo. A screen that calls the API is inside Better Auth, and a missing cookie is 401.

Do not teach the API to accept the demo session. That would make the mock role a credential.
