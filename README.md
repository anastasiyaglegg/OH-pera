# OH-pera: source-backed NYC opera discovery

The demo schedule has been replaced by source importers, a durable snapshot, and an API.
The existing design and device-local favorites are retained.

## Local development

Use Node 24 (the importer uses built-in SQLite):

```sh
npm ci
npm run test:data
npm run data:refresh
npm run dev
```

The importer stores per-source results in `.data/schedules.sqlite` and atomically exports
`data/schedule.json`. The versioned JSON is the portable durable recovery snapshot;
a fresh machine reconstructs the next refresh from it. No database credentials are needed.

The website reads `/api/performances`, which requests the latest snapshot from this
repository's **main** branch and falls back to its bundled snapshot during outages.
The UI retries every five minutes; intermediary caches last at most five minutes.

## Automatic refresh

`.github/workflows/refresh-schedules.yml` runs every six hours and on manual dispatch.
To activate it, merge this change into `main` and enable GitHub Actions with repository
contents write permission. Branch protection may require a bot exception or a PR-based
update process. GitHub's schedule is best-effort, not an exact refresh SLA.

The workflow changes only `data/schedule.json`. Source failures remain visible in the
snapshot. Previously verified records keep their original timestamps; missing records
are flagged `unconfirmed`, never silently interpreted as cancellations. If every source
fails the workflow fails; GitHub's workflow notification settings control alerts.

No scheduled job is active merely because these files exist locally. To serve current
snapshots, the deployed application must include the new API route. If renaming/forking
the repository, update the fixed raw GitHub feed URL in `app/api/performances/route.ts`.

## Coverage and limitations

- Metropolitan Opera: tries official structured calendar data; if blocked or unrecognized,
  uses Leporello's public factual snapshot and preserves its original refresh timestamp.
  The current official calendar presents a waiting room and does not expose parsed events.
  This is explicitly secondary data, not a claim of real-time Met integration.
- Heartbeat Opera: follows the current season link and imports production announcements.
  Date ranges are not expanded into invented daily performances. Individual ticketing
  sessions require a supported ticketing feed or approved integration.
- Bronx Opera: imports season announcements separately. Missing years/times are not guessed.
- New York City Opera: parses dated NYC event sections; international events are excluded.
  Undated programs are announcements. Older dates are filtered out.
- BAM: discovers opera cards and HD series; checks detail pages and labels screenings
  separately. Unknown times remain unknown. Live-stage coverage is marked partial.

The coverage panel lists all five configured organizations, including failures and empty
sources. This is **not comprehensive coverage of every NYC opera company**. Expand the
registry using the NY Opera Alliance directory and validate each additional official source.

Use official source/ticketing agreements when available. Review source terms and rate limits
before expanding collection. Importers use bounded requests, timeouts and no access-challenge
bypass. They do not infer ticket inventory, prices, casting changes, or cancellation from silence.

## Validation

`npm run test:data` covers dates, source failures, stale-data retention, duplicates, unconfirmed
removals, overseas exclusions, announcements, and screening classification.
`npm run build` builds the existing Vinext/Cloudflare application.

## Hosting

The original Sites project ID is preserved in `.openai/hosting.json`.
The current connected account cannot access that Site. Its owner must publish these changes
or grant access. GitHub collaborator access alone does not grant Sites deployment access.

## Artwork

Twelve original AI-generated conceptual illustrations are stored in `public/images/operas`: one NYC opera hero and eleven opera artworks shared by performances of the same work. These are not official production photographs. Cards load images lazily; unrecognized future titles retain the existing abstract fallback. JPEG assets are optimized for delivery, with original generation files retained outside the repository.

## Discovery and saved dates

Discovery groups dates by work, presenter, event type, and venue, with a chronological list as an alternative. Search matches titles, composers, companies, and venues without requiring accents. Date filters use New York dates; This weekend means the upcoming Saturday/Sunday (or the remaining Sunday). Filters and selected performances are reflected in shareable query parameters. Browser Back returns from details and navigation.

Favorites remain specific performance dates stored on the current device. Saved records preserve descriptive details for the Past / unavailable archive; disappeared dates are not inferred to be cancelled. Season announcements have separate search/company filters and omit generic marketing headings. Performance details use a native modal dialog for focus containment, Escape dismissal, and focus restoration.
