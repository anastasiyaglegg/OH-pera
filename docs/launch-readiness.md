# OH-PERA launch readiness

The website is a discovery prototype. The three-company / 90% coverage proposal in the PRD is not an achieved launch claim.

## Source inventory

- Metropolitan Opera: official calendar https://www.metopera.org/Calendar/; structured-event importer. Access currently fails, so the importer uses https://leporello.app/ as a secondary snapshot. Its original check date is preserved. Official calendar access or an agreed feed remains necessary for dependable coverage.
- New York City Opera: https://www.nycopera.com/events; dated NYC event sections. International listings are excluded; unsupported locations and undated programs remain announcements. No guarantee of complete season coverage.
- Heartbeat Opera: https://www.heartbeatopera.org/; follows the current season page. Imports announced runs only. A supported source for individual sessions is still required.
- Bronx Opera: https://bronxopera.org/this-season/; season announcements. Missing years and times are not inferred. Individual performance details need confirmation.
- BAM: https://www.bam.org/ and the current Met HD series. Imports separately labeled screenings. These do not count as an additional staged-opera-producing company for the PRD coverage gate.

## Maintenance procedure

1. Run `npm run data:refresh` to fetch the five configured sources. Inspect every source status, not only the command exit code: partial success does not imply complete coverage.
2. Run `npm run data:audit` for a dated 60-day coverage report. It lists source issues and counts; it cannot establish 90% completeness without a manual inventory of official dates.
3. GitHub Actions is configured to refresh every six hours on main. Verify its recent successful runs and that the deployed API consumes those snapshots. A workflow file alone does not prove the schedule is active.
4. On failure, check the source and compare the current page with the parser. Do not bypass source access challenges. Preserve previous check timestamps and do not treat missing listings as cancellations.
5. Review errors within one working day during the pilot. Manually reconcile listings weekly and before launch, including dates, times, venue, cancellation status, and ticket destinations.
6. Publish a complete coverage audit before claiming the launch target. Count public staged-opera dates in the agreed next-60-day window and compare them with the official inventory. Do not count screenings or announcements in that denominator.

## Ownership and permissions awaiting confirmation

The PRD proposes Ivaylo for technical maintenance and Anastasiya for editorial review, with reciprocal backup. Neither assignment is recorded as accepted by this code change. Both owners must confirm responsibilities and release approval.

Record the access/reuse basis for each source before public launch. No publisher permission is established merely by its page being publicly reachable. Existing importers do not copy production photography or promotional descriptions. New artwork is labeled as AI-generated conceptual imagery. The hero uses an official-channel YouTube embed, not downloaded footage; confirm the intended public use before launch.

## Editorial content

`lib/opera-content.ts` contains original, short work introductions with research links. They describe the opera, not a particular cast or staging. They do not modify schedule check dates. A source description takes precedence; unknown works show an explicit fallback. Anastasiya and Ivaylo should review these introductions before public launch. Runtime, language, prices, and venue access details are not inferred from general knowledge about a work.

## Still required for PRD sign-off

- Reliable dated coverage for at least three opera-producing companies and manual measurement of the proposed 90% target.
- Confirmed source permissions, ownership, editorial review, and deployed refresh operation.
- Five-person usability study and complete keyboard, screen-reader, contrast, and motion checks.
- Approved analytics/privacy approach before measuring active visitors, ticket-link engagement, and return visits. No analytics tracking has been silently enabled.

## Manually sourced listings

`data/curated.json` supplements automated imports. Each entry must cite the official page, identify the reviewer, record the actual source-check timestamp, set a review deadline, and explain the evidence for its individual performance date and NYC venue. Unknown start times stay null. Never expand a run into presumed daily performances. Codex research is labeled as such; it is not partner editorial approval.

The refresh command validates these entries before publishing. The API also merges them into newer remote snapshots, so updates from main cannot silently remove local curated additions. Exact matches use company, normalized title, venue, date and time; the more recent source check wins. A changed title, venue or start time requires explicitly reconciling the old entry: this is not fuzzy matching. Removing a curated entry removes it on the next refresh/API response. A missed review deadline marks it unconfirmed; cancellation requires explicit evidence. Automatic refreshes never advance manual review timestamps.

Initial evidence: Heartbeat's official Queeney Todd page identifies October 27, 2026 as its season gala at Judson Memorial Church. Added this one confirmed date, with no assumed start time. Its wider October 22–31 run stays an announcement until individual dates are verified. Regina's 2026–27 season page currently says TBA; no dates were invented. AOP's calendar includes out-of-city and past events, so calendar access alone does not establish relevant coverage. Universe is linked by Heartbeat but its public page did not expose individual sessions in the retrieved text. Ticketmaster Discovery requires an API key and has not been connected.

Before launch, Ivaylo and Anastasiya still need to assign a continuing data reviewer and approve editorial text. Review curated entries at least weekly and before their deadlines; check cancellation and venue changes against the cited official pages. Schedule facts do not grant permission to copy artwork or source descriptions. This workflow improves coverage but does not establish complete NYC coverage or the proposed three-company launch target.

## November schedule repair — September 23, 2026

Added 15 individually published Met dates: four November Lincoln in the Bardo sessions, six November/December Jenůfa sessions, and five November/December La Bohème dates. Evidence came from indexed official 2026–27 production pages, not a successful direct live-calendar request. Each record identifies this evidence method and links to the indexed page. La Bohème start times remain null because only the cast schedule dates were available. Existing October records and their old timestamps are unchanged. November Medea and Tosca sessions remain missing pending adequate evidence. Do not describe this repair as a complete November inventory.
