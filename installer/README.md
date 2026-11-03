# Plugin installer (wizard step 1)

Installs the 73 Sales CRM plugins/store apps, including the 4 Contract Management apps, 13 CSM apps, and 7 Field Service Management apps (Service CRM plugins are added to `manifest.json` under their own `group`) on a target instance **before** update sets and seed data. FSM demo data plugins (`com.snc.work_management.demo`, `com.snc.work_management_geolocation.demo`) are intentionally **excluded** — this pack does not load FSM demo data for any plugin.
Source list: `Sales CRM Top Plugins list.docx` -> `manifest.json`. All 73 are required: a run reports
`ready: true` only when every one is verified active, and seeding should be gated on that.

```
node installer/server.js          # API on :4010 (PORT to change), resumes unfinished runs on start
node --test installer/engine.test.js
```

Configure instances in `installer/instances.json` (copy `instances.example.json`; gitignored). Credentials are
read from the env vars named there. A `"mock": true` instance simulates installs for development.

## API

| Call | Purpose |
|------|---------|
| `POST /runs {"instance":"name"}` | Start a run (one active run per instance) |
| `GET /runs/:id` | Status: `installed/total`, `percent`, current plugin, per-plugin state. Reads stored state, cheap to poll |
| `GET /runs/:id?refresh=true` | Same, but wakes the poller for an immediate instance check ("check now") |
| `POST /runs/:id/retry` | Retry failed plugins with a fresh attempt budget |
| `POST /runs/:id/cancel` | Stop the run |
| `GET /runs` | Summaries of all runs |

Run `status`: `pending`, `running`, `completed`, `completed_with_errors`, `cancelled`, `failed`.
Plugin `state`: `pending`, `installing`, `retrying`, `installed`, `failed`, `cancelled`.
`percent` = (installed + current plugin's percent) / total.

## Behavior

- Sequential, in manifest order (Order Management first). Every plugin must end up **active on its latest available version**: not-installed plugins are installed at the latest version, active-but-outdated ones are upgraded, and ones already on the latest are skipped, so reruns are idempotent and bring an existing instance up to date. `ready` requires all of that. Per-plugin `installedVersion` / `latestVersion` are in the run status. Plugins with no store version (`latestVersion` returns null, e.g. platform plugins) only need to be active.
- No overall timeout. It keeps waiting while the instance reports progress; a plugin only counts as stalled after
  30 min with no change (90 min for `heavy` ones). Tunable in `engine.js` `DEFAULTS`.
- Failed/stalled installs retry up to 3 attempts (backoff 1, 5, 15 min); each retry first checks whether the plugin
  actually landed. After that the plugin is `failed` and the run continues, ending `completed_with_errors`.
- Run state is persisted to `installer/runs/` after every change; a service restart resumes in-flight runs.

## Not done yet

- `instance.js` `latestVersion` / `startInstall` / `getProgress` are placeholders (open item in `docs/OPEN-ITEMS.md`).
- No ETA, no auth on the API, no dependency graph (the instance resolves dependencies itself).
