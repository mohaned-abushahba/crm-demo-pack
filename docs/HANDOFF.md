# CRM Demo Pack: Handoff and Lessons Learned

Written 2026-10-26 for anyone who wants to reuse or fork this repo. It records what was built,
how, the decisions behind it, and the gotchas that cost the most time.

- Repo: https://github.com/mohaned-abushahba/crm-demo-pack (private; ask for access, or fork once you have it)
- Companion test suite: https://github.com/mohaned-abushahba/sales-crm-e2e-tests (public)
- Detail lives in `README.md`, `docs/CHANGELOG.md` (append-only history), `docs/OPEN-ITEMS.md`,
  `update-sets/README.md`, `seed/README.md`, `installer/README.md`.

## 1. What this is

A button-push packaging of the ServiceNow **Sales CRM** demo (Service CRM is being added) so an SC can take a
blank demo instance and end up with the fully configured environment: plugins, configuration, demo data,
personas and landing pages.

Deploy order is always: **plugins -> Update Sets -> seed data -> post-deploy config**.

| Layer | What it holds | Where |
|---|---|---|
| Plugins | 51 plugins / store apps that must be active first | `installer/manifest.json` |
| Update Sets | Config: flows, BRs, roles, ACLs, schema, UI, properties | `update-sets/UPDATE-NNN-*.xml` |
| Seed data | Demo records (~2,600 master + transactional) | `seed/data/*.json`, bundled to `seed/dist/` |
| Post-deploy | Per-instance settings that can't live in an Update Set | `scripts/post-deploy/` |
| Validation | Playwright suite that proves the deployed result works | separate repo `sales-crm-e2e-tests` |

## 2. Instances involved

| Instance | Role |
|---|---|
| `opmsalescrm1` | **Golden source.** Declared stable 2026-10-06. Everything is captured *from* here. |
| `opmsalescrmstage` | Target used to prove the deploy works end to end (loaded 2026-10-07/08). |
| `opmsalescrmgd`, `molearning` | Other Forge-connected instances used for dry runs. |

All instances are reached through the **ServiceNow Forge MCP server** (`snow_read`, `snow_execute`,
`snow_api`, ... exposed as `mcp__<instance>__*`). Nothing in the repo uses credentials directly; real `.env`
files and `seed/secrets/passwords.json` are git-ignored. Never commit them.

## 3. How the project evolved (timeline)

1. **2026-06-24: Decided to build on Claude + Forge MCP, not a standalone app.** A from-scratch React/Fastify
   demo-builder was dropped because Forge already provides schema-aware CRUD, CPQ/SOM tools and skills.
2. **2026-10-05: Seeded a minimal auto-parts demo on stage** and learned the quote/order API recipe (section 7).
   Moved the Playwright suite to its own repo.
3. **2026-10-05/06: Created this repo.** Decision: capture config as **Update Sets**, demo data as
   **idempotent seed scripts**, instead of trying to snapshot/diff a whole instance.
4. **2026-10-06: Captured opmsalescrm1's entire demo config** into UPDATE-004...017 (14 files, 1,018 records),
   read-only, without touching the source.
5. **2026-10-07/08: Master data seed** (JSON fixtures + generic upsert loader), loaded onto stage:
   2,615 of 2,616 records, then role checks and fixes. Audit of a manual "golden demo changes" doc produced
   UPDATE-018...023.
6. **2026-10-13...22: Hardening and extension.** Forecast hierarchy, buying groups, transactional quotes/orders,
   leads, 10 golden opportunities, quotas, email branding, forecast schedule jobs, Claude MCP OAuth client,
   landing-page screen-order fix (UPDATE-031).
7. **Plugin installer** (51 plugins, retrying engine, status API) and a **seed-loader Claude skill**.
8. Repo repositioned as **CRM Demo Pack (Sales + Service CRM)** so a teammate can add Service CRM data in the
   same structure.

## 4. Repo map

```
installer/     manifest.json (plugins, install order), engine.js (retry/poll), server.js (API :4010), tests
update-sets/   UPDATE-003 ... UPDATE-031 XML, applied in numeric order; README has the commit order
seed/
  manifest.json  which tables, load order, business keys, scope windows, per-table insert_as/on_conflict
  overrides.json value overrides by sys_id + forbidden_patterns (e.g. a real company name must never ship)
  data/          one JSON fixture per table, numbered by dependency order (010 ... 971)
  tools/         extract.py, bundle.py, crosscheck.py, refcheck.py, passwords.py, expected_roles.py, image tools
  dist/          golden-demo-seed.json (+ images json), the single bundle handed to the loader
skills/golden-demo-seed-loader/   Claude skill + scripts/loader.js (server-side loader)
scripts/deploy.sh, scripts/post-deploy/   deploy outline + by-name settings
docs/          CHANGELOG.md, OPEN-ITEMS.md, this file
backups/       git-ignored stage cleanup scratch
```

## 5. The method, step by step

### 5.1 Config -> Update Sets
- **Rule: set a named Update Set current before any change. Never work in "Default".** Default fills with
  ~920 unrelated plugin/activation records and is not worth mining.
- One Update Set per feature/fix session, named `UPDATE-NNN-short-name`, exported to XML.
- When config already landed in Default (as on opmsalescrm1), capture from the **latest customer
  `sys_update_xml` payload per record** (created on/after 2026-08-23; 08-22 was plugin activation). Drop Scripted
  REST noise from MCP `snow_execute`, deletes and plugin-package records.
- Files UPDATE-004...017 hold **one retrieved update set per application scope** (update sets are scope-bound).
  After import, preview and commit `[Global]` first, then scoped ones.
- **Untracked tables must be serialised by hand** from live values: `sn_bo_core_obj_group` (+members; the
  `BOProcessChainUtil` script hard-codes sys_id `3f1c98c22b878f104deaf02ac891bfec`),
  `sn_csm_ctxrul_mgt_rule_matrix`, `sn_l2c_core_*`, `sys_granular_delegate`, `sys_m2m_delegate_rule`, approval
  group approvers. Verify hand-built payloads by MD5 against an instance-side serialisation.
- **Gap check:** list user-created records since 08-23, drop system/plugin authors, compare against every
  `<name>` in the update sets. This found missing `par_dashboard` parents (Workspace-built dashboards write no
  `sys_update_xml`), the SDR dashboard metadata, and role-containment links.
- Check parent records exist in the repo, not just children.
- Image-field payloads can embed a **stale attachment**; always check the embedded attachment sys_id.

Commit order is in `update-sets/README.md`:
`004 -> 005 -> 013 -> 006 -> 007 -> 008 -> 009 -> 010 -> 020 -> 011 -> 012 -> 014 -> 015 -> 016 -> 017 -> 018 -> 019 -> 022 -> 023 -> 024 -> 028 -> 029 -> 030` (plus 003 first, and 031 for landing pages; 021 is intentionally unused).

### 5.2 Settings that are not Update Set material -> `scripts/post-deploy/`
Settings whose sys_id is created per instance (e.g. `glide.ui.session_timeout`), private properties, the
account-code counter, order-task state override, email account From label, admin landing dashboard. Set **by name**.

### 5.3 Demo data -> seed fixtures + loader
- Source of truth is **opmsalescrm1**, extracted raw (`display_value=false`) with direct role grants only
  (`sys_user_has_role` where `inherited=false`). **When the Excel sheet and opmsalescrm1 disagree, opmsalescrm1 wins**;
  the sheet is only a scope/cross-check (`seed/tools/crosscheck.py` -> `seed/data/sheet-crosscheck.md`).
- Fixtures are numbered by dependency order, not by domain. References resolve by business key where possible,
  but **opmsalescrm1 sys_ids are preserved** because update-set config hard-codes them.
- The generic loader upserts: look up by sys_id, then by business key, else insert with that sys_id. A key match
  with a different sys_id follows the table's `on_conflict` (`fail` or `adopt`).
- `insert_as` handles ordering traps, e.g. price lists/catalogs/offerings insert as `draft` and are flipped to
  the real state after all tables load (lines can only be added to a draft list).
- Scope = records created 2026-08-21 or on/after 2026-08-23. Transactional specs (940-971 quotes/orders/opps)
  are read from a source instance by explicit record numbers.
- Platform-generated children (related parties, addresses, allocations, snapshots, approvals, order tasks) are
  **not** seeded because the platform recreates them.
- Passwords come from the sheet into git-ignored `seed/secrets/passwords.json`, never into the bundle.
- `seed/tools/bundle.py` builds `seed/dist/golden-demo-seed.json` (format `golden-demo-seed/1`); the
  `golden-demo-seed-loader` skill + `loader.js` loads it server-side and runs a post-load role check against
  `expected_user_roles`.

### 5.4 Plugin installer
`installer/` installs the 51 required plugins/store apps in manifest order, each to its **latest** version,
with up to 3 retries (1, 5, 15 min backoff), stall detection (30 min, 90 for heavy apps), persisted run state and
a status API. Supports `mock: true` instances. **Not finished:** `instance.js` `latestVersion`, `startInstall`,
`getProgress` are placeholders until the internal plugin-install REST service is identified (candidates:
`/api/sn_cicd/plugin/{id}/activate`, `/api/sn_cicd/app_repo/install`).

### 5.5 Validation -> `sales-crm-e2e-tests`
Playwright, serial, 30/30 passing on opmsalescrm1 (2026-10-01). Covers lead->opportunity, CPQ (quote, guided
configuration, ramps, discounts, approvals, documents), order management, contracts, amendment, renewal and
forecasting rollups. `config-drift.spec.ts` compares a target against the update sets and the source instance
and writes `drift-reports/`. Docs there: `CATALOG.md`, `FLOWS.md`, `TESTING-STRATEGY.md`.

## 6. Deploying to a new instance (the practical recipe)

1. Install the plugins (installer, or manually; the list is `installer/manifest.json`). Some update sets need
   specific apps: UPDATE-016 needs `sn_acct_lc` 6.7.5 and `sn_tech_exp` 1.1.5; UPDATE-017 needs `sn_sales_crm_mob` 1.0.0;
   role checks need `sn_som_clm` 1.2.6.
2. Import and commit update sets in the README order. Update Sets are applied through attachments plus a
   server script that parses each `<unload>` into `sys_remote_update_set` (state=loaded) and `sys_update_xml`,
   then preview/commit through the CI/CD API
   `/api/sn_cicd/update_set/preview|commit/{id}`. (`scripts/deploy.sh` still tells you to do this manually.)
3. Seed users, groups, accounts etc. **before** the update sets that reference them by sys_id
   (006, 010, 011, 012, 020, 022); see the prerequisite note in `update-sets/README.md`.
4. Load the seed bundle with the skill. Run the loader as an on-demand `sysauto_script` queued via
   `SncTriggerSynchronizer.executeNow()`, because REST/MCP-started scripts are killed after 5 minutes.
5. Run `scripts/post-deploy/*.js`.
6. Run the e2e suite against the instance.

## 7. Gotchas that cost the most time

**Update Sets**
- UPDATE-007 depends on UPDATE-011 [Context Rule Management]: commit 011's sets first.
- UPDATE-010's four sets reference each other in a cycle. The CI/CD API refuses even with `force_commit`.
  Set the "found in another uncommitted update set" preview warnings to `status=ignored` (same as the UI's
  "Accept remote update") and commit without re-previewing.
- UPDATE-015 and UPDATE-017 modify OOB script includes; expect collision prompts if plugin versions differ.
- UPDATE-017 has a `snc_external` role grants workaround for an existing instance defect. Kept on purpose.
- Landing page chosen by `sys_ux_screen.order` ascending among role-matching screens, **not** by the order on
  `sys_ux_applicability_m2m_screen`. Managers hold `sales_agent` and AEs hold `lead_agent`, so ties are real:
  Manager 10 < AE 20 < SDR 30 (UPDATE-031). Don't put SDR ahead of AE.
- `sn_prd_pm_*` writes did not engage update-set tracking through any path, so product/catalog data is seeded.
- The catalog/category tables have a broken auto-code Business Rule that discards all fields when `name` isn't
  set; the API still reports success. **Always set `code` explicitly and re-read to verify.**
- Price list line start date must be inside the price list's date range (BR); `seed/overrides.json` has a rule.

**Seed loading**
- Scoped tables with `delete_access=false` cannot be deleted from global scripts; the delete is silently refused.
- Unique keys block side-by-side duplicates: catalog code, characteristic name+code, option code, service org
  code+path, `sys_user.user_name`.
- Roles missing after load usually mean missing plugin versions or missing `sys_user_role_contains` links, not a
  seed problem. Compare `sys_user_has_role`, `sys_user_grmember` and containment chains on both instances.
- Field service is out of scope by decision; some FSM roles legitimately don't exist on target.
- Real company names must never ship. `forbidden_patterns` in `seed/overrides.json` fails extraction if one
  reappears (Golden Gate AI -> Gatelynx AI). Re-check on every transactional pass.

**Quotes and orders via platform APIs** (from the stage seeding)
- Quote: `new sn_opty_mgmt.QuoteIntegration().createQuoteFromOpty(optyGr,'automatic')`
- Approve: `sn_quote_mgmt_core.QuoteAPI().approveQuote(q)`
- Order (needs quote state `completed`): `sn_quote_mgmt.OrderIntegration().createOrderFromQuote(id,'sn_l2c_quote_to_order')`
- Acknowledge: `new sn_ind_tmt_orm.OrderDAO(id).orderAcknowledgement()`
- Flows failing with "Attempted to add black listed role" = dangling `sys_user_role_contains` rows pointing at roles
  that no longer exist (14 were deleted on stage with approval).
- No order decomposition rules exist by default; order tasks were created manually.

**MCP / tooling**
- `snow_execute` may return no output. On opmsalescrm1 output comes back only through a `return` statement;
  on stage write results into a record's `work_notes` and read `sys_journal_field`.
- Heavy per-record cross-table loops in `snow_execute` time out. Keep queries narrow, and use
  `addEncodedQuery` rather than `addQuery('f','STARTSWITHx')`.
- MCP tools load at session start. If a server connected after Claude Code started, restart Claude Code.
- The checkout may be shared between sessions: check `git branch --show-current` before committing. `main` is
  the only long-lived branch; use short-lived branches only for big/experimental changes.

**Persona testing recipe (Playwright)**
Log in as admin, then
`fetch('/api/now/ui/impersonate/<sys_id>', {method:'POST', headers:{'X-UserToken': g_ck}})` (GET returns 405),
then open `/now/cwf/agent/home`. The screen id is the first key in the base64 `__state__` URL parameter.
Verified 2026-10-22: AE -> Sales Agent Golden Landing Page, SDR -> SDR page, Manager -> Sales Manager page.

## 8. Open items (as of 2026-10-26; see `docs/OPEN-ITEMS.md` for the live list)

- **Logik.io model for `SOL-RE01` missing on the stage tenant.** Guided configuration fails with a 404 from
  `opmsalescrmstage.demo01.logik.io`. Logik tenant content is not captured by Update Sets or the seed; someone
  with Logik admin access must export the model from the opmsalescrm1 tenant and deploy it. It also gates the
  contract amendment and renewal specs.
- **Sage Reed cannot access the widgets.** Not yet reproduced. Lead: the SDR "Leads by Source" stored
  visualization grants only ITSM/CMDB-style roles through `par_visualization_permission`.
- **Plugin-install REST service not yet identified** (section 5.4). `sn_ai_som_adv` exists on opmsalescrm1 but not on stage.
- Not yet made on opmsalescrm1, so excluded from the repo: probability-from-Category rule, Involved Parties
  Location column, email display name. (Probability from forecast category is now UPDATE-027.)
- Forecast: 2027 quotas depend on business calendar spans on the target; some stage forecast headers are left
  from the older seed and unused.
- Service CRM (cases, install base, install base items) is being added by a teammate. First slice landed
  2026-10-29 (see CHANGELOG): `956`-`959` add 5 install base items, the sold-product bridge row, one
  Technical Product Support Case (`TPSC0001005`) and one Interaction (`IMS0000178`), plus two new
  `SCRM-CSM-*` groups/roles. Sourced from opmsalescrmstage directly (opmsalescrm1 has no
  `sn_tech_product_support_case` table). Still open: broader case/interaction volume, other Service CRM
  case types, and loading this slice onto a blank instance to verify end to end.
- **FSM clickpath extension off `TPSC0001005` (2026-11-03).** Added to the existing demo clickpath: from
  Case `TPSC0001005`, Ravi Kapoor creates a Work Order; dispatcher **Lisa Ray** (`lisa.ray`, NorCal
  Technicians group, `wm_dispatcher` role) dispatches the Work Order Task to field technician **Teddy
  Taylor** (`teddy.taylor`, NorCal Technicians group, `wm_agent` role), who resets a router in the data
  center to resolve the case. Both personas, their two groups (California Dispatchers, NorCal Technicians)
  and their direct roles are captured in `030`/`040`/`050`/`060` from opmsalescrmstage (they're OOTB FSM
  demo personas, pre-dating today's plugin activation — not something this pack creates). The Work Order and
  Work Order Task are **not** seeded: they're created live during demo execution, the same way the case
  itself leads into them. Note: `com.snc.work_management.demo` / `com.snc.work_management_geolocation.demo`
  (the FSM demo-data plugins) remain deliberately excluded from `installer/manifest.json` — see the Field
  Service Management installer entries below. Teddy Taylor's dispatcher/tech group setup does not depend on
  either excluded plugin. Also captured `080-agent_work_schedule.json`: Teddy Taylor's work schedule
  assignment to the OOTB "8-5 weekdays" `cmn_schedule`. Triaged from a set of 6 raw-table XML exports handed
  over for this clickpath (see CHANGELOG for the full breakdown of what was/wasn't needed from each). The
  business rule one of those exports described (case → Work Order location copy) was never actually created
  on the source instance — see `docs/OPEN-ITEMS.md`.

## 9. How to fork and adapt it

1. Get access to the private repo, then fork or clone it. The e2e repo is public.
2. Pick your **source** instance (your equivalent of opmsalescrm1) and **target** instance. Register both as MCP
   servers in Claude Code, or substitute your own REST client in the scripts.
3. For a new domain or feature, **keep the layout**: add plugins to `installer/manifest.json` under a new `group`
   (array order = install order); take the next free `UPDATE-NNN` **after pulling**; number new fixtures by
   dependency order; log every addition in `docs/CHANGELOG.md` tagged with its domain.
4. Capture your own config with a named Update Set from the start. Use section 5.1's gap check against your source.
5. Add seed tables to `seed/manifest.json` (`file`, `table`, `key`, optional `on_conflict`, `insert_as`, scope
   `query`), run `seed/tools/extract.py`, then `refcheck.py`, then `bundle.py`.
6. Replace the branding. The pack uses the fictional **Solana** brand and personas (Asher Sky, Riley Cole, Taylor
   Morgan, Marcus Reed, Sage Reed, ...). Search for these and any instance-specific sys_ids before reusing.
7. Prove it with the e2e suite and `config-drift.spec.ts`.

Hygiene: keep passwords, `.env*`, `seed/secrets/`, `installer/instances.json` and `backups/` out of git
(already in `.gitignore`).
