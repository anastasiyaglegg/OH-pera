# Membership milestone: setup and verification

Branch: `codex/private-club-membership`. No remote database migration or deployment has been performed.

## Current review scope — September 30, 2026

This update includes the public artwork landing page (Member login and Register with an invitation), rounded translucent navigation, filtered opera cards and details, selected performances in My Plans, animated attending-friend circles, profile/chat dialogs, and Manage members.

Manage members lists the direct invitee with profile, chat and removal actions, or a pending invitation with cancellation. A member has one invitation slot. Removing a registered direct invitee requires explicit confirmation, removes their club access and revokes their pending invitation; already-registered descendants retain membership. Historical invitation links in the database are retained. Invitation creation returns a shareable link; automatic email delivery is not implemented.

Apply migrations in chronological order, including `20260930141454_manage_direct_invitee.sql`. None have been applied remotely by this work. The attendance migration in this branch also narrows named attendees to the inviter, direct invitee and invitee’s invitee. If an earlier version has already been applied to a staging database, reconcile its function definitions through a new forward migration before testing; do not assume editing the migration file updates an existing database.

Validation for this PR: 66 tests passed; TypeScript passed; ESLint has no errors (six existing warnings). Profile/chat and member options were verified in the local browser, and the updated management page was opened in Safari. Local demo members/messages are fictional. Hosted Auth, invitation acceptance and multi-client concurrency still require staging verification before launch.

The older milestone notes below record prior checks; the current UI no longer exposes an Appearance setting or a month calendar grid.

## Connect the correct project
Direct project access is verified for OH-pera! (`rrccitkouuszrirmaahz`). The local ignored .env.local is configured with its URL and publishable key; Auth settings respond successfully with email confirmation enabled. Remote club migrations have NOT been applied; only the original public.saved_performances table was found. Anastasiya owns backend review and setup. Prefer staging before modifying production.

Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the correct project using `.env.local` locally and the deployment environment in hosting. Never expose a secret/service-role key. Keep email confirmation enabled; configure the site URL and allowed email-verification redirect URLs for the actual staging/production origins. Invited people must verify the exact invited email, then log in and accept their personal link.

Review migration history first. Apply `supabase/migrations/20260929130209_private_club_membership.sql` using the standard Supabase migration workflow only after verifying the target. Do not expose `club_private` in the Data API. Existing saved-performance RLS remains unchanged.

## Seed founders
Create/identify the two real verified Auth users. Obtain their 18+ confirmation. In a privileged migration/admin session, insert exactly their verified Auth UUIDs into `club_private.members` with `inviter_id = NULL`, `is_admin = true`, their display names and actual confirmation timestamp. Do not invent emails/UUIDs or put administrative controls in client user metadata. The insert requires founder identity and age-attestation facts that are not yet available.

The authenticated RPC is `public.club_command(operation, payload)`. A founder can call `admin_status` with a member ID and `active`, `suspended` or `left`; ordinary members cannot. A founder administration UI remains future work. Reactivating an original member preserves accepted replacement branches but revokes any parent's still-pending replacement invitation.

## Security boundaries
Tables live outside the public schema, have RLS enabled and no client table privileges. The public RPC is security-invoker, delegating to a private security-definer command with empty search_path, auth.uid validation and transaction locks. Token hashes only are stored; the raw link is shown once. Invitations expire after seven days. Acceptance checks the verified email in auth.users, not editable JWT metadata.

Schedule API verifies the bearer token with Supabase and checks current active membership before serving even a cached snapshot. Responses are private/no-store. Public-source schedule files remain in the public GitHub repo; the club's member information is private, not the opera facts themselves.

The UI has no public signup entry. Supabase Auth signup itself remains available for invited account creation; a fabricated token can create an **unprivileged Auth account**, but cannot grant club access. If the operational policy also forbids uninvited Auth records, add a before-user-created Auth hook before launch. Add email/IP rate limiting and abuse monitoring before real invitations.

## Verification
- `node --test tests/*.test.mjs`: 53 passing checks including actual PostgreSQL membership tests via PGlite.
- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- `npm run build`: passed with existing toolchain migration warnings.
- Database tests exercise anonymous/nonmember rejection, verified email, 18+, slot reuse/expiry, graph distances, blocking, replacement/return/suspension and direct table/helper access denial.
- PGlite is a single local database connection; it does not validate races between independent network clients. Test competing accepts, revoke-vs-accept, status changes and replacements concurrently on staging.
- Live account creation, email verification, invitation acceptance and authenticated browser flows remain blocked on access/configuration of the OH-pera project. These have not been claimed as verified.

Before release run the full journey on staging: founder creates invitation → matching email verifies → accepts → profiles visible only within two steps → optional invitation continues chain → blocked/third-step accounts denied → private API rejects stale/inactive sessions. Verify account saves survive the transition.

Local UI verification: welcome and account dialog render at 1280px and 390px, with no horizontal overflow at 390px and no captured browser errors. No-backend login is disabled with an explicit notice. Anonymous schedule requests return 401 with private/no-store caching. API guard unit tests additionally cover active/inactive membership and service failures.

Dependency audit reports four moderate advisories in the pre-existing Cloudflare development-tool dependency chain (vite-plugin, wrangler, miniflare and undici), none in PGlite. Review toolchain remediation before deployment; automatic suggested downgrades were not applied.

## Continue without Supabase: local demo
Run `npm run demo:club`, then open http://localhost:3002. This separate Node development server binds only to 127.0.0.1, checks Host and Origin, and serves fictional data. It uses PGlite with all three club migrations and the exact `ClubActivity` React component used by the authenticated site. It does not add a production login bypass or contact Supabase. The in-memory data resets on restart; do not enter personal information into the demo.

Choose Maya, mark Macbeth as “I’m going,” open My Plans, click Lina, and send a fictional meeting plan. Switch the demo persona to Lina to receive it. Maya can see Sofia, Ahmet and Lina by name; Noah and Elena contribute only to totals. Month filters show matching opera cards; there is no calendar grid.

The demo tests application and SQL behavior, not hosted Supabase Auth, PostgREST configuration, email delivery, or multiple real network sessions. Those still need staging verification.

## Attendance and messaging migration
Apply `20260929132042_club_attendance_messages.sql` after the membership migration. It adds private performance snapshots, revision-aware attendance and participant-only message history. Direct access is denied; ordinary members cannot import schedules. Send authorization rechecks two-step connection visibility, active membership and blocks. Existing history is retained without exposing read timestamps. New messages are immutable.

After staging setup, an operator runs `npm run club:sync` with the correct `NEXT_PUBLIC_SUPABASE_URL` and server-only `SUPABASE_SERVICE_ROLE_KEY`. Never place the service key in a NEXT_PUBLIC variable, commit it, or use it in the browser. The command imports the validated bundled/curated schedule, preserving missing entries rather than inferring cancellations. Wire this explicit sync into the trusted schedule-refresh pipeline before launch; it is not automatically scheduled yet. None of these remote commands have been run.

The activity UI uses `club_command` for calendar, attendance, plans and messaging. The original protected schedule endpoint remains for compatibility. Account saves remain available in a disclosure under My Plans and are not silently converted to attendance.

Current validation: 61 tests pass; TypeScript, changed-file lint and production build pass. Local browser testing confirmed attendance count updates, My Plans, two-step chat send/receive and unread acknowledgment; the 390px message layout has no horizontal page overflow or captured console errors.

Still pending before pilot: persistent notifications, optional bilateral read-receipt/presence controls, reporting/moderation UI, founder admin screens, password recovery, photos, aggregate post-event feedback, production multi-client concurrency and Supabase integration checks. No live users were invited or messaged.

## UX audit follow-up — September 29, 2026

Implemented invitation-first landing CTA, copy before artwork on mobile, three-step onboarding, a secondary paste-link disclosure, centered account dialog with close control, explicit account-unavailable preview state without credential fields, higher-opacity glass navigation, persistent Appearance settings, a compact member calendar welcome, and accessible messaging labels/instructions on attendee buttons.

Validated with TypeScript, targeted ESLint and a production build. Browser checks cover the landing page at 1280px and 390px, Escape/close behavior, invitation anchor, Appearance persistence, and opening Lina's conversation from a fictional attendance card. Both landing and member calendar have no horizontal overflow at 390px.

Launch dependency remains: connect the correct OH-pera Supabase project, then verify real invitation acceptance, email verification, login and password recovery end to end. Password recovery is still a pre-launch task; the disconnected preview does not present a working account service.

## Frontend handoff
The public landing page now has one theatrical hero with OH-pera artwork and a single invitation action. The club and invitation instructions open in accessible dialogs; direct invitation links open the joining panel. Privacy remains a dedicated page. Member screens and a fictional local demo are included for integration review.

This branch is a draft integration handoff, not a launch-ready replacement for production. Backend owner: Anastasiya. Frontend owner: Ivaylo. Before merge, review all three migrations, provision staging, implement password recovery and validate real account/invitation flows. Do not apply migrations to Pulse Studio. No environment files or keys are part of the PR.

## Member profile follow-up — September 30

After the three club migrations, apply `20260930160509_member_profiles.sql` on staging after review. The editor uses owner-only `profile_get` / `profile_save`; friend dialogs use `profile_view`, which checks active membership, allowed connections and reciprocal blocks. Email comes from Auth and is not changed through the profile RPC. DOB and optional gender never enter the friend projection. Server validation enforces 18+, valid names, allowed interests and bounded photos.

The prototype stores up to three resized JPEG thumbnails in a private profile row (90,000 characters per photo maximum), returned only through the authorized profile RPC. It does not create public photo URLs. The browser resizes and re-encodes JPEG/PNG/WebP input before saving, discarding original file metadata. Move full-resolution galleries to private Supabase Storage with equivalent access policies before expanding beyond this small prototype. No remote migration, photo upload or real account changes have been performed by this work.

Local testing: use My profile in the tester menu, complete fictional first/last name and DOB, choose multiple interests, upload demo artwork, save, then return to verify persistence. A connected member sees the name, bio, interests and photos, without email, DOB or gender. Prototype data resets when the preview process restarts.
