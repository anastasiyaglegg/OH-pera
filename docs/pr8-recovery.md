# Recover PR #8 on current main

PR #8 merged into codex/security-and-privacy after PR #7 had already merged into main. Its merge commit is not an ancestor of main. PR #18 later restored the five illustrations, histories, history buttons, and most grid alignment; those are retained without replacement.

Recovered: muted looping hero autoplay with reduced-motion/data-saving opt-outs; Discover-only footer with consistent disclosure styling; separate privacy page; Saved page without discovery filters; account clear controls on Saved with bottom spacing; transparent navigation background; About CTA spacing; unrestricted biography/caption widths; illustration prompt provenance.

Compatibility: retain account-specific Supabase saves, authentication, Contacts label, singing logo, larger text, clickable cards, video retry/hide controls, dependency updates and CSP fixes. Privacy text describes accounts rather than reinstating obsolete browser-only claims. PR #8’s browser-memory Undo is replaced by an explicit clear confirmation because the current account API deletes server records; account storage semantics are unchanged.

Review video autoplay intentionally: it connects to YouTube on page load unless reduced-motion or data-saving is enabled. Privacy copy discloses this. Third-party playback availability cannot be guaranteed.

## UX audit follow-up

- Card titles are native links stretched across the card; hearts remain independent. Modified clicks retain normal browser behavior. Focus outlines stay inside cards, with visible keyboard focus restored to other controls.
- Signed-out Save opens login immediately, retaining only the selected ID and timestamp in session storage for at most 15 minutes. Cancel consumes no account data and clears the intent. The current validated schedule supplies the saved record after login; missing records are not recreated. Conflict-ignoring upserts avoid toggling an existing save off. Existing owner checks, generation guards and RLS remain.
- Compact mobile header stays in document flow, with a shorter hero and usable discovery anchor spacing. About matches the content. Cards and vertical List layouts replace the long horizontal strip.
- Retry appears only after the video loading timeout. Unconfigured account access is described in visitor-facing language.

Validation: 40 tests pass, including continuation consumption, replacement, expiry, cancellation, and malformed-input cases. TypeScript and production build pass; changed-component lint has no errors. Browser checks at 390px and 1280px verify layout switching, mobile header/hero, link keyboard activation, artwork click, independent Save opening login, and login from details. Live authenticated saving remains unverified because the local preview lacks Supabase configuration; no production account data was accessed or changed.
