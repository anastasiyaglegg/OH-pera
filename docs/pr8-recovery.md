# Recover PR #8 on current main

PR #8 merged into codex/security-and-privacy after PR #7 had already merged into main. Its merge commit is not an ancestor of main. PR #18 later restored the five illustrations, histories, history buttons, and most grid alignment; those are retained without replacement.

Recovered: muted looping hero autoplay with reduced-motion/data-saving opt-outs; Discover-only footer with consistent disclosure styling; separate privacy page; Saved page without discovery filters; account clear controls on Saved with bottom spacing; transparent navigation background; About CTA spacing; unrestricted biography/caption widths; illustration prompt provenance.

Compatibility: retain account-specific Supabase saves, authentication, Contacts label, singing logo, larger text, clickable cards, video retry/hide controls, dependency updates and CSP fixes. Privacy text describes accounts rather than reinstating obsolete browser-only claims. PR #8’s browser-memory Undo is replaced by an explicit clear confirmation because the current account API deletes server records; account storage semantics are unchanged.

Review video autoplay intentionally: it connects to YouTube on page load unless reduced-motion or data-saving is enabled. Privacy copy discloses this. Third-party playback availability cannot be guaranteed.
