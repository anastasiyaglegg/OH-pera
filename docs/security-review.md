# Security and privacy review — 2026-09-24

Scope: OH-pera source, tracked history, dependencies, importer, read-only API, browser storage, third-party embeds, GitHub Actions, and a local production Cloudflare Worker preview. This is an application review, not a penetration-test certification or legal compliance opinion. Public hosting settings were not accessible through this checkout.

## Findings addressed

- Dependency audit originally reported 13 affected packages (1 critical, 11 high, 1 low). Updated the framework, React/RSC, bundler and worker tooling; npm audit now reports zero known vulnerabilities. Lockfile committed; automated audit and weekly Dependabot checks added.
- External schedules previously had incomplete validation. Shared validation now checks fields, lengths, dates, enums, duplicate IDs and HTTPS destinations before import, API delivery, browser rendering or saved-record recovery. Invalid remote data falls back to the last validated snapshot.
- Fetches now allow only named publishers/evidence hosts, validate every redirect, reject credentials and unapproved destinations, use a 25-second timeout and bound streamed bodies (6 MB importer; 2 MB remote snapshot). Ticket links also have explicit allowed hosts. No user-controlled fetch endpoint exists.
- Remote snapshot requests are coalesced and cached for five minutes per warm worker. This reduces repeated upstream work but is not distributed rate limiting.
- Production pages use a fresh random CSP nonce, reject caller-supplied nonce/CSP headers, disable HTML caching to prevent nonce reuse, and restrict scripts, frames, connections and other resources. Anti-framing, MIME-sniffing, referrer, permission and HSTS headers are set. API responses retain public caching. Inline styles remain allowed; development permits inline scripts/eval for tooling.
- YouTube is not instantiated until the visitor clicks Play video. Hide video unloads it; consent is not persisted. The privacy notice explains the third party. Fonts and artwork are served locally. No application analytics, accounts, payment collection or advertising SDK was found.
- Saved performances are bounded and validated on recovery; malformed storage fails safely. Unsave deletes the associated stored record. Clear saved performances removes stored preferences, with cross-tab synchronization. Empty arrays/objects can subsequently be written by state persistence; no saved records remain. Browser storage is not encrypted and other users of the same browser profile can access it.
- Collection CI has read-only repository access and does not retain checkout credentials. Only a separate publishing job receives write access, validates the downloaded snapshot without installing packages, and commits only that snapshot after collection succeeds. Actions are pinned to commit SHAs. PR checks use read-only permissions.

## Verification

- 36 automated tests pass, including malicious URLs, unexpected schemas, malformed storage, oversized streaming bodies, and redirect attacks; TypeScript and production build pass.
- Gitleaks v8.30.1: no findings in 28 scanned commits or the non-ignored project-file scan. Dependencies/build products were excluded from the project scan. This does not audit hosting secrets or prove that credentials never existed elsewhere.
- Local production HTTP checks: page/API security headers, unique per-response CSP nonce, matching inline-script nonce, caller nonce override protection, and API cache headers.
- Browser verification: app hydrates without console errors; iframe absent initially, present only after Play video, removed by Hide video. Save, clear and reload retain zero saves. Actual YouTube playback is not certified by this test.

## Launch gates still requiring deployment/account access

1. Verify the real HTTPS deployment preserves CSP, nonce matching, HSTS and the remaining security headers on pages, assets and API responses. Verify HTTPS redirection and no unintended public preview/debug endpoints. Local HTTP cannot prove TLS configuration.
2. Inspect hosting access logs, retention, access permissions, region and any provider-injected analytics. Choose and publish the actual retention/contact details; current footer explicitly does not promise provider log retention. Search/filter URLs may enter browser history and server logs.
3. Confirm repository branch/ruleset protection, required security checks, secret scanning/push protection availability, account MFA and collaborator access. The schedule publisher currently writes main directly; protection rules must deliberately accommodate or replace that workflow with reviewed PRs.
4. Run the new workflows on GitHub and verify scheduled collection/publishing under real token permissions. Configure provider-level rate limits/abuse controls if exposed publicly; the in-process cache is not a WAF.
5. Recheck privacy requirements if accounts, analytics, forms, payments or additional third parties are introduced. The current notice describes the application rather than claiming jurisdiction-specific legal compliance.

References: [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html), [OWASP CSP guidance](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html).
