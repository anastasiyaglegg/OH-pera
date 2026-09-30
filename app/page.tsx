// This page is forced to render dynamically (per request) instead of being
// statically pre-rendered at build time. The homepage's inline hydration
// scripts must carry the same CSP nonce that middleware.ts issues fresh on
// every request; a statically pre-rendered page bakes those scripts in at
// build time with no nonce at all, so the browser blocks them and the app
// never finishes hydrating (surfaces as React error #412 / "Loading
// performances..." never resolving).
export const dynamic = 'force-dynamic';

import ClubClient from './club/club-client';

export default function Page() {
  return <ClubClient />;
}
