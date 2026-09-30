# OH-pera private club

## Purpose
Opera fans who want company lack a simple way to discover which trusted connections are attending the same performance. OH-pera connects a private invitation network to the opera calendar so members can make plans personally.

## Membership and invitations
- Ivaylo and Anastasiya are the two founders. Each starts one invitation chain.
- Each active member can invite one person, using an email-bound link that expires after seven days. Acceptance is instant after verified registration and 18+ attestation.
- A pending invitation can be revoked or replaced after expiry. Acceptance consumes the allowance. Inviting is encouraged but never required for access.
- If an invitee leaves, the inviter can invite a replacement. A returning original member needs founder approval and keeps their historical position. Accepted replacements remain; branches are permitted.
- No overall club cap. Existing accounts and saved performances remain, but accounts alone do not confer membership.
- Suspension revokes pending invitations. Descendants remain active unless individually suspended.

## Visibility and communication
- Members can see active profiles, future named attendance and chat with members within **two undirected invitation steps**, including branches and in both directions.
- Departed or suspended positions still count as steps. Chains never compress.
- Profiles include a display name and optional biography/photo. Invitation history never overrides profile restrictions.
- Blocking mutually hides profiles and named attendance and prevents new messages. Past messages remain.
- Former members are labelled “Former member” in old chats and cannot send new messages.
- Founders have the same profile and chat visibility as everyone else. Membership/report administration is separate.

## Calendar and plans
- Anonymous welcome page offers login and invitation acceptance. Calendar and member data require active membership.
- Calendar defaults to upcoming performances grouped by date, with a month toggle.
- Members select “I’m going”; this is self-reported attendance, not a ticket purchase. Ticket purchases stay external.
- Total attendance counts all active members across both chains. Names/profiles remain restricted to the two-step circle. Show own attendance separately as “You’re going.” Other members’ past attendance stays private.
- Withdrawal updates counts silently. Members inform contacts themselves.
- Cancelled performances remain in My Plans, labelled cancelled, trigger an in-app alert and disallow new attendance.
- Material date/time/venue changes require reconfirmation; unconfirmed attendance is excluded from totals.

## Messages, privacy and moderation
- One-to-one text and link messages are available to eligible connections, whether or not attending the same performance.
- Members share meeting locations privately and manually. No public meeting locations or hosted meetups.
- No message edits/deletes in the pilot. Unread badges only; no email/push notifications.
- Read receipts and online presence each default off, have independent controls, and require both people to opt in.
- Reports include only the messages explicitly selected by the reporter. Founders moderate reports.
- Optional private post-event question measures whether a member met someone. Founders see aggregate answers only.

## Interface
Welcome → invited registration → verify email → accept invitation → Calendar.
Member navigation: Calendar, My Plans, Connections, My Invitation, My Profile; add private messaging/unread indicators in the messaging milestone. Promote unused invitations without blocking participation.

## Delivery milestones
1. **Implemented locally, pending staging integration:** invitation acceptance/creation/revocation, member profile, exact two-step connections, blocking, founder status command, private schedule API, basic welcome/member interface and account saves.
2. **Implemented locally, pending staging integration:** attendance, grouped calendar/month switch, restricted names and total counts, cancelled/changed performance handling and My Plans attendance. Changed/cancelled plans show an in-app notice; persistent notification acknowledgment is still pending.
3. **Implemented locally:** one-to-one text/link messages, unread badges and former-member history. Read receipts and presence remain unshared; opt-in controls and reporting are pending.
4. **Before pilot:** founder admin interface, optional photos, private post-event feedback aggregates, account recovery/deletion handling, accessible end-to-end tests, production concurrency tests, rate limits and operational review.

My Plans lists explicit attendance, with older account saves retained in a separate disclosure. Saving is not attendance. A separate loopback-only demo uses fictional members and a real local PostgreSQL engine with the same migrations and React activity component. This branch is not the complete pilot and must not be presented as one.
