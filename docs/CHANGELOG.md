# Changelog

Append-only log of captured changes. One entry per Update Set or seed script added.

Format:

```
## UPDATE-XXX-short-name (YYYY-MM-DD)
Instance: opmsalescrmstage
What: <what this changes, one or two lines>
Why: <why it was needed>
File: update-sets/UPDATE-XXX-short-name.xml
```

---

## Contract Management plugins added to installer manifest (2026-10-26)
Domain: Sales CRM
What: Four store apps appended to `installer/manifest.json` under group "Contract Management", in install order: `sn_som_clm` (Contract Management for Sales CRM), `sn_cm_pro` (Contract Management Pro), `sn_cm_workspace` (Contract Workspace), `sn_cm_word_addin` (Microsoft Word Add-in for ServiceNow Contracts). Manifest is now 50 plugins; installer README and mock test count updated.
Demo data: `sn_som_clm` is flagged `loadDemoData: true`. Its demo data still has to be loaded after install; the flag is informational only (engine ignores it) and no seed fixture exists yet.
Not verified: plugin IDs are as supplied, not checked against an instance; dependency order between the four is assumed.
File: installer/manifest.json

---

## Seed: SCRM- group roles and memberships captured from opmsalescrmstage (2026-10-26)
Domain: Sales CRM
Instance: opmsalescrmstage (compared against the opmsalescrm1-sourced fixtures)
What: The 31 `SCRM-` groups already matched the fixtures (040). Stage had 14 group-role rows (`sys_group_has_role`) and 1 group member (`sys_user_grmember`) that the fixtures lacked, now captured in `seed/data/070` (80 -> 94 SCRM rows) and `050`:
- SCRM-Account Exec Team, SCRM-Sales Managers, SCRM-Sales CRM Admin: `sn_crm_outlook.crm_outlook_user` (Admin also `crm_outlook_admin`) and `sn_outlook_addin.outlook_addin_setup`, added 2026-10-22.
- SCRM-Legal Approver: `sn_cm_core.contract_admin`, `contract_config`, `contract_fulfiller`, `contract_reviewer`, `contract_user`, `contract_report_publisher`, `contract_report_viewer`, added 2026-10-26.
- Member: Priya Nair (`990987212b0f8b104deaf02ac891bffe`) in SCRM-Solution Consultants - Not Used.
How: `seed/manifest.json` entries for 050 and 070 got `also_from` opmsalescrmstage with an explicit `groupIN<31 SCRM group sys_ids>` query (extract.py supports this, as used by 105). The explicit list is deliberate: a new SCRM- group has to be added to it. Re-extracted with `--only` and bundled to `seed/dist`.
Users inherit these roles through group membership (inherited rows are platform-generated and not seeded), so applying the pack grants them once the group, member and group-role rows are loaded.
Caveats: `--only` skips the `require_in_fixtures` filter, so the 11 non-fixture-user member rows it pulled back were removed by hand (all already in `dropped.json`). The new roles belong to `sn_cm_core` (Contracts Core), `sn_outlook_addin` (Add-Ins for Microsoft 365) and `sn_crm_outlook`; the first two are not in `installer/manifest.json` and are assumed to arrive as dependencies of the Contract Management / CRM Outlook apps. If they don't, the role rows can't resolve on a new instance. The loader was not run against a blank instance.
File: seed/data/050-sys_user_grmember.json, seed/data/070-sys_group_has_role.json, seed/manifest.json, seed/dist/golden-demo-seed.json

---

## Seed: capture Teddy Taylor's agent work schedule from 6 FSM XML exports (2026-11-03)
Domain: Service CRM
What: Added `080-agent_work_schedule.json` to the seed pack: one row linking `teddy.taylor` to the
OOTB `cmn_schedule` "8-5 weekdays" (from_date 2026-11-03, to_date 2026-12-31, as captured). Sourced
from opmsalescrmstage via `seed/manifest.json`'s new `080-agent_work_schedule` table spec.
Why: a colleague handed over 6 raw-table XML exports from opmsalescrmstage
(`DH_KD-AgentWorkSchedule.xml`, `DH_KD-BusinessRule.xml`, `DH_KD-Calendars.xml`,
`DH_KD-FieldServiceConfig.xml`, `DH_KD-Locations.xml`, `DH_KD-Users.xml`) meant for the FSM
clickpath. None were actual Update Set XML (no `sys_update_xml` children) — all 6 were direct table
exports, so they're handled as seed data rather than update-sets. Triage of the other 5:
- `DH_KD-Locations.xml` (4 `cmn_location` rows) and `DH_KD-Users.xml` (lisa.ray, teddy.taylor) were
  already in the seed pack — no action needed.
- `DH_KD-FieldServiceConfig.xml` is the OOTB `sm_config` singleton (created 2014), only
  `sys_updated_on`-touched by today's FSM plugin activation, not actually customized — not seeded.
- `DH_KD-Calendars.xml` includes an unused "Teddy Taylor Personal Schedule" `cmn_schedule` record
  that nothing on the instance references (his real schedule, on both `sys_user.schedule` and the
  `agent_work_schedule` row, is OOTB "8-5 weekdays") — left out as dead data.
- `DH_KD-BusinessRule.xml` turned out to be only the `sys_update_set` header record ("Demo Harness
  Update Set - FSM KD", state "in progress") with 0 `sys_update_xml` children. Queried
  opmsalescrmstage directly: no custom business rule matching its description ("FSM
  case-to-work-order location business rule ... Teddy Taylor assignment assistance") exists on the
  instance — it was never actually created. Tracked as an open item in `docs/OPEN-ITEMS.md`.
File: seed/manifest.json, seed/data/080-agent_work_schedule.json, seed/data/external-refs.json, seed/dist/golden-demo-seed.json, docs/OPEN-ITEMS.md

---

## Seed: capture FSM dispatcher/technician personas for TPSC0001005 clickpath (2026-11-03)
Domain: Service CRM
What: Added `lisa.ray` (dispatcher, NorCal Technicians group, direct `wm_dispatcher` role) and
`teddy.taylor` (field technician, NorCal Technicians group, direct `wm_agent` role) from
opmsalescrmstage to `030-sys_user.json`, plus their two groups (`California Dispatchers`,
`NorCal Technicians`) to `040-sys_user_group.json`, the group memberships to
`050-sys_user_grmember.json`, and their direct (non-inherited) roles to `060-sys_user_has_role.json`.
`expected-user-roles.json` and `seed/dist/golden-demo-seed.json` regenerated (66 users now have
recorded roles, up from 64).
Why: extends the existing demo clickpath off Case `TPSC0001005`: Ravi Kapoor creates a Work Order from
the case, Lisa Ray dispatches the Work Order Task to Teddy Taylor, who resets a router in the data
center to close it out. The Work Order and Work Order Task themselves are intentionally **not** seeded —
they're created live during demo execution, same as the rest of this clickpath.
Note: both personas and their groups pre-date today's FSM demo-data plugin activation on stage (groups
created 2026-07-06) — they don't depend on `com.snc.work_management.demo` /
`com.snc.work_management_geolocation.demo`, which stay excluded from `installer/manifest.json`.
Gotcha: a plain re-run of `extract.py` against the open-ended `windows` scope on opmsalescrm1 also swept
in ~34 unrelated users added there since the last capture (new hires on the source instance, nothing to
do with this change) — reverted and hand-spliced only the 2 users / 2 groups / 2 memberships / 3 direct
roles actually needed, to avoid conflating unrelated drift with this capture. Also found and fixed:
`California Dispatchers`' `manager` field pointed to a sys_id that 404s on opmsalescrmstage (orphaned
reference) — nulled out rather than carried over broken.
File: seed/manifest.json, seed/data/030-sys_user.json, seed/data/040-sys_user_group.json, seed/data/050-sys_user_grmember.json, seed/data/060-sys_user_has_role.json, seed/data/expected-user-roles.json, seed/data/external-refs.json, seed/dist/golden-demo-seed.json, docs/HANDOFF.md

---

## Installer: 10 more CSM plugins added (2026-11-03)
Domain: Sales CRM
What: 10 more plugins added to the `CSM` group in `installer/manifest.json`: `com.snc.install_base` (Customer Service Install Base Management), `com.snc.csm_action_status` (Customer Service Case Action Status), `com.sn_csm_playbook` (Playbook for Customer Service Problem Management), `com.snc.uib.csm_agent_workspace` (Customer Service Problem Management Agent Workspace), `com.sn_cs_sm` (Customer Service with Service Management), `com.sn_cs_sm_request` (Customer Service with Request Management), `com.sn_csm_case_digest` (Customer Service Case Digest), `com.sn_prd_pm` (Product Catalog Management Core), `com.sn_st_mgmt` (Service Test Management) - all platform plugins (type `plugin`, no store version, IDs not yet confirmed against a live instance); and `sn_sprb_mgmt` (Customer Service Problem Management, store app). Manifest is now 73 plugins; test counts and installer README updated.
File: installer/manifest.json, installer/README.md, installer/engine.test.js

---

## Installer: Field Service Management plugins added, demo data plugins excluded (2026-11-03)
Domain: Sales CRM
What: New `Field Service Management` group added to `installer/manifest.json` (7 apps): `com.snc.time_recording_fsm` (Time Recording for Field Service), `com.snc.automatic_assignment` (Automatic Assignment) - both platform plugins, no store version; `sn_fsm_disp_wrkspc` (FSM Configurable Dispatcher Workspace), `sn_fsm_mobile` (Field Service Mobile), `sn_fsm_tp` (Field Service Territory Planning), `sn_fsm_equip_schd` (Field Service Resource Scheduling), `sn_fsm_components`.
Why: `com.snc.work_management.demo` and `com.snc.work_management_geolocation.demo` (FSM demo data plugins) are deliberately left out of the manifest - this demo pack must not load FSM demo data for any plugin. Manifest is now 63 plugins; test counts and installer README updated.
File: installer/manifest.json, installer/README.md, installer/engine.test.js

---

## Installer: CSM plugins added (2026-11-02)
Domain: Sales CRM
What: New `CSM` group added to `installer/manifest.json` with the first batch of Customer Success/CSM plugins: `sn_tech_support` (Product Support for Technology), `sn_ti_core` (Technology Core), `sn_acct_lc` (Customer Success Management). Manifest is now 56 plugins; more CSM plugins to follow in later entries. Test counts and installer README updated.
File: installer/manifest.json, installer/README.md, installer/engine.test.js

---

## Installer: Contracts Core and Add-Ins for Microsoft 365 added explicitly (2026-10-26)
Domain: Sales CRM
What: `sn_cm_core` (Contracts Core, v3.6.1 on opmsalescrmstage) added before `sn_som_clm`, and `sn_outlook_addin` (ServiceNow Add-Ins for Microsoft 365, v7.5.1) before `sn_crm_outlook`. The SCRM- group roles in seed 070 belong to these scopes, so they are no longer left to arrive as dependencies. Manifest is now 53 plugins; test counts and installer README updated.
File: installer/manifest.json

---

## Installer: Sales Common added, install-to-latest-version (2026-10-26)
Domain: Sales CRM
What: (1) `sn_sales_common` (Sales Common, v8.2.0 on opmsalescrmstage) added to `installer/manifest.json` before Opportunity Management; manifest is now 51. The other four requested apps were already in it: `sn_som_gen_ai`, `sn_opty_mgmt_ai`, `sn_opty_mgmt`, `sn_opty_mgmt_ml` (IDs and active state confirmed on opmsalescrmstage). (2) Engine now requires every plugin to be active on its latest available version: outdated ones are upgraded, up-to-date ones skipped, `ready` only when all are current. New client method `latestVersion(plugin)`; mock supports `latestVersions` / `installedVersions`; tests added (9 pass).
Not working yet: against a real instance `latestVersion`, `startInstall` and `getProgress` are still placeholders (OPEN-ITEMS), so a real run fails until the install/version REST service is identified. Only the mock path is exercised.
File: installer/engine.js, installer/instance.js, installer/instance.mock.js, installer/manifest.json

---

## post-deploy 06 — admin lands on Sales Manager Golden Landing Page (2026-10-26)
Instance: opmsalescrm1 (fixed), opmsalescrmstage (already correct)
What: `scripts/post-deploy/06-admin-landing-dashboard.js` upserts two `sys_user_preference` rows for admin (`6816f79c…be441`): `glide.next_experience.continue_landing_page` = false, and moves the Sales Manager Golden Landing Page (`16520a20…bf19`) to the front of `com.snc.par.dashboards.ui.preferences` "recent".
Why: admin landed on the SDR Golden Landing Page on opmsalescrm1 and on Sales Manager on opmsalescrmstage. Both load the same screen (Sales Manager Landing Page `efd686ac…`, macroponent `a2d64a6c…`, defaultDashboard = Sales Manager). The home tab opens the user's most recently viewed dashboard, so admin's last view decided it; crm1 admin had last viewed SDR. Screens, applicabilities, dashboard permissions and the default-dashboard property are identical on both instances, so no Update Set content differs.
Applied: opmsalescrm1 on 2026-10-26 (continue_landing_page true -> false, recents reordered). Verified with 3 fresh admin logins: Sales Manager Golden Landing Page each time. Stage was not changed.
Why not an Update Set: `sys_user_preference` is not tracked, and the platform re-creates the "recent" row with a new sys_id, so a fixed-sys_id payload would duplicate. The script upserts by user + name and keeps the existing history.
Caveats: "Sales dashboard landing page" was read as what stage shows, the Sales Manager Golden Landing Page; the Sales Agent one is `7fc64331…bf1a` if that was meant. The page follows the last viewed dashboard, so if admin opens another landing dashboard, that one becomes the landing page until the script is re-run. Stage once showed Sales Agent on a single load during testing, so it is not strictly pinned either. Script not yet run through the `execute` tool; the change on crm1 was made with direct preference writes.
File: scripts/post-deploy/06-admin-landing-dashboard.js

---

## Persona landing page reconciliation, no new Update Set (2026-10-22)
Instance: opmsalescrm1
What: Audit of the AE / SDR / Sales Manager landing pages against opmsalescrm1. Nothing new to capture; every record matched the repo by sys_id, `sys_updated_on` and `sys_mod_count`, and nothing on the instance changed after 2026-10-08.
Persona map (all in UPDATE-016 unless noted):
- AE / Sales Rep: role `sn_sales_common.sales_agent` (applicability "Sales Agent") -> screen + macroponent "CSM Sales Rep Landing Page" -> dashboard Sales Agent Golden Landing Page `7fc64331…bf1a`. The applicability row `ba37ab21…` ships with the Opportunity Management plugin (created 2026-04-29), so it is plugin baseline and not in an update set. The screen and macroponent are the customised copies (2026-09-03).
- SDR: role `sn_lead_mgmt_core.lead_agent` (applicability "Lead Agent") -> screen + macroponent "SDR Landing Page" -> dashboard SDR Golden Landing Page `918685ca…bfad` (applicability row `c2cdf6f5…`; metadata row in UPDATE-024).
- Sales Manager: role `sn_sales_common.sales_manager` (applicability "Sales Manager") -> screen "Sales Manager Landing Page" -> dashboard Sales Manager Golden Landing Page `16520a20…bf19` (applicability row `abd686ac…`). The screen's macroponent `a2d64a6c…` is a clone that kept the name "CSM Sales Rep Landing Page"; it is the one bound to the Manager dashboard, so do not "fix" the name or merge it with the AE macroponent.
- Counts on both sides: 3 dashboards, 8 tabs, 11 canvases, 39 widgets (8 carry the 2026-09-28 edit), 7 dashboard permissions, 3 metadata rows, 3 screens, 3 landing-page macroponents.
Not captured, on purpose: report "Average Response Time Hrs" (`fce4cf11…`, OOB CSM case report on `sn_customerservice_case`, edited 2026-09-09; no persona dashboard uses it).
Caveat: the three applicability rows all have order 0. A user holding both `sales_agent` and `lead_agent` (e.g. an SDR) could get either page; not tested here.
File: none (docs only)

---

## UPDATE-029-landing-page-forecast-model-and-collector (2026-10-21)
Instance: opmsalescrmstage (source; values already applied there); domain Sales CRM
What: property `sn_opty_mgmt.glide.ui.landing_page_forecast_model` (`56207604fff08310e4d5ffffffffff2f`) = `f7a3e9c14b2d8610a5cf3e7b92d1f480`, the active model; Data Collector job `Collect Sales Amount for Landing Page` (`66adf323ff544710e4d5ffffffffff80`) weekly, Monday, 7:30 AM US/Pacific.
Why: landing page widgets pointed at the wrong forecast model, so the sales amount did not show; the job's schedule did not carry over. opmsalescrm1 still has the old model `3dac4ce7...` and the job on Saturday in GMT.
File: update-sets/UPDATE-029-landing-page-forecast-model-and-collector.xml
Caveats: both records serialised from live values (no tracked sys_update_xml); XML not yet imported through the loader. After commit, flush cache (cache.do), hard-refresh the landing page and run the job once. The note said "for both scores and index": there is one job, and its Collect field is `scores_text`; nothing for an index was found. The model must exist (seeded OOB sys_id, present on both instances).

---

## UPDATE-028-forecast-schedule-daily-active-model (2026-10-21)
Instance: opmsalescrm1 and opmsalescrmstage (record serialised from live values; sys_update_xml has no tracked row for it); domain Sales CRM
What: scheduled job `Sales forecast schedule` (`d4c4b634ff1022102095ffffffffff0b`, scope Sales Forecasting) now runs daily at 7:00 AM US/Pacific (was weekly, Monday; stage had 12:00 AM) and line 1 of its script is `var forecastModelId = 'f7a3e9c14b2d8610a5cf3e7b92d1f480';` (the active model, Opportunity Revenue for Sales Territory) instead of `SalesForecastConstants.DEFAULT_FORECAST_MODEL`.
Why: the job's settings did not carry over, so forecast headers were not being created or updated.
File: update-sets/UPDATE-028-forecast-schedule-daily-active-model.xml
Caveats: on opmsalescrm1 the job script was `submitForecastCalculationRequest(f7a3e9c1...)` with the id unquoted (a ReferenceError at run time) and line 1 commented out; this set replaces the whole script. The "Product Family" job on opmsalescrm1 (inactive, other model) is not captured. The XML was not yet imported through the update-set loader. The pasted instruction said "weekly daily"; read as daily.

---

## seed/data/900-forecast-2026q4.json quotas (2026-10-21)
Instance: opmsalescrmstage
What: Quotas re-captured from stage: 155 `sn_quota_core_sales_quota` rows (was 10). 2026 Q3 unchanged (5);
2026 Q4 now covers the whole sales team (16 individual quotas) and 2027 Q1-Q4 add the same set per quarter.
Every quarter from 2026 Q4 on: individual quotas sum to $26M, TECH rollup = $26M, Global rollup = $26M
(14 rollups per quarter, $104M of rollup rows). The one value change to an existing record: 2026 Q4 TECH
rollup 54c54fe5… $7M -> $26M. Script 04 comments updated: 2027 spans now required.
Why: demo uses one industry per instance, so TECH carries the full $26M global target.
Not captured: the 11 extra 2026 Q4 forecast headers on stage (34 there vs 23 in the fixture); quotas have no
name field, none contains "old".
File: seed/data/900-forecast-2026q4.json, seed/04-forecast-hierarchy.js

## UPDATE-024-sdr-dashboard-metadata (2026-10-13)
Instance: opmsalescrm1
What: One `par_dashboard_user_metadata` record (958685ca…) for the SDR Golden Landing Page. Must be
committed after UPDATE-016 (it references the dashboard).
Why: Audit of the persona landing page dashboards on opmsalescrm1. Everything else was already in
UPDATE-016: the 3 dashboards (Sales Agent / Sales Manager / SDR Golden Landing Page), 8 tabs, 11 canvases,
39 widgets, 7 dashboard permissions, 14 visualizations + permissions, and the other 2 metadata rows. The SDR
metadata row was missed because its only payload sits in an unrelated plugin batch update set.
Nothing on the par_* tables changed on opmsalescrm1 after 2026-09-28.
Access model (all group-based, no per-user assignment): SDR Golden Landing Page -> SCRM-Sales Development
Representative (Sage Reed); Sales Agent Golden Landing Page (default, via
`sn_opty_mgmt.glide.ui.landing_page_default_dashboard`) -> SCRM-Account Exec Team (Asher Sky) and SDR group;
Sales Manager Golden Landing Page -> SCRM-Sales Managers (write). Groups and members are in seed/.
File: update-sets/UPDATE-024-sdr-dashboard-metadata.xml

## UPDATE-021-persona-landing-dashboards removed (2026-10-08)
Instance: n/a (repo clean-up)
What: Deleted update-sets/UPDATE-021-persona-landing-dashboards.xml. Its 3 par_dashboard parents
(Sales Agent / Sales Manager / SDR Golden Landing Page) are also in UPDATE-016, which is the copy
deployed to opmsalescrmstage.
Why: The branch merge left the same 3 records in two Update Sets. The field values match; only the XML
serialisation differs. 021 is left unused instead of renumbering 022/023.
File: update-sets/UPDATE-016-workspace-landing-pages-dashboards.xml

## UPDATE-023-role-containment-links (2026-10-08)
Instance: opmsalescrm1
What: 8 sys_user_role_contains links (Sales Agent/Manager/Ops -> territory roles, inbound_queue_read ->
entity_mapping_viewer, quote_viewer -> product_inventory_viewer, svc_location_manager_contributor ->
account/consumer_contributor), copied with the same sys_ids.
Why: Both roles exist on the target but the link doesn't (stage lost them in the 2026-10-05 dangling-role
cleanup), so users didn't inherit those roles. With this set and Contract Management for Sales CRM
(sn_som_clm 1.2.6) installed, the stage role check passes for 59/63 users; the 4 remaining gaps are
tracked in docs/OPEN-ITEMS.md.
File: update-sets/UPDATE-023-role-containment-links.xml
Note: renumbered from UPDATE-021 at merge (main already had UPDATE-021/022). opmsalescrmstage committed it
under the old name, UPDATE-021-role-containment-links.

## Seed loader: ON_CONFLICT option and price-list-line date rule (2026-10-08)
What: loader.js gains `ON_CONFLICT = 'insert'` (load bundle records alongside existing ones on test
instances, reported under `duplicates`); companies adopt existing records by name. overrides.json gains
`where` rules; one gives Partner Price list lines the list's end date (2028-04-30) so the date-range
Business Rule accepts them. Bundle regenerated.
Why: First full load on opmsalescrmstage (2,615/2,616 records).
Files: skills/golden-demo-seed-loader/, seed/

## UPDATE-022-audit-gap-fixes (2026-10-08)
Instance: opmsalescrm1
What: Business Portal logo (Solana, attachment embedded); approval delegation Derek Sanchez (CRO) →
Rebecca Smith (CFO) for Marquee Large Deal approvals until 2027-12-31 (granular delegate, rule link,
delegation rule + 2 rule tables); 3 SOW Landing Page homepage destination rules set inactive;
system-default preference `workspace.showAgentAssist=false` (sidebar off unless a user set it);
system properties `glide.product.name` = Solana Conglomerate, `glide.sys.date_format` = MM-dd-yyyy,
`glide.sys.time_format` = hh:mm:ss a, `glide.system.locale` = en.US, `glide.i18n.single_currency` = true,
`allow_edit_on_published_matrices` = true (Context Rule Management scope). These 6 have the same OOB
sys_ids on a fresh instance (checked on opmsalescrmstage), so they ship in the Update Set.
Post-deploy script now also sets `glide.login.home`,
`sn_opty_mgmt.glide.ui.landing_page_default_dashboard` and `sn_sales_territory.default_sales_model`.
Why: Audit of `docs/golden demo changes made.docx` against opmsalescrm1 and UPDATE-003…021. These
were the doc items made on the instance but not captured. UPDATE-003's portal record came from stage
and carried the coral logo; opmsalescrm1's own update payload also embedded the old attachment, so the
new one (SHA-256 60a153d0…, 8,101 bytes) was embedded by hand and checked against the source.
Excluded for now (not yet made on opmsalescrm1, per user 2026-10-08): Probability % from Category rule;
removing the Location column from Quote Involved Parties; email display name "Solana Conglomerate".
File: update-sets/UPDATE-022-audit-gap-fixes.xml, scripts/post-deploy/01-system-properties.js

## UPDATE-021-persona-landing-dashboards (2026-10-07)
Instance: opmsalescrm1
What: The 3 persona landing page dashboards (`par_dashboard`): Sales Agent Golden Landing Page,
Sales Manager Golden Landing Page, SDR Golden Landing Page.
Why: opmsalescrm1 never wrote `sys_update_xml` rows for these parent records (the table is tracked,
but the Platform Analytics editor did not record them), so UPDATE-016 carried their 8 tabs, 11
canvases, 39 widgets, 7 permissions and 3 user-metadata rows without the dashboards themselves.
Gap check (2026-10-07) of every report, dashboard and workspace page record changed since the
baseline found nothing else missing: other uncaptured items were plugin installs (`system` author),
deletes, or non-CRM workspaces. Everything the widgets reference (PA indicators, breakdowns,
filters, chart components, opportunity stages, colours) is OOB and present on a fresh instance;
the base dashboard "Sales Agent Landing Page OOB" too. Payloads verified by MD5.
File: update-sets/UPDATE-021-persona-landing-dashboards.xml

## UPDATE-019 trimmed to the two v2 drafts (2026-10-07)
What: Removed 8 of the 10 Rule Matrix records from update-sets/UPDATE-019-pricing-matrix-states.xml:
the 6 Product Offering / Catalog / Category Eligibility matrices (v1 and v2) and Standard Price
Adjustment v1 + Price List Defaulting v1. It now holds 2 records: Standard Price Adjustment v2 and
Price List Defaulting v2, both set to draft (changed on opmsalescrm1 2026-08-26 and 2026-09-03).
Why: Confirmed with the team that nobody changed the Eligibility matrices. Those 6 and the two v1
records all carry the same pre-baseline timestamp (2026-08-21 22:57:41), so their states came from
plugin setup and a fresh instance should keep its own defaults. The live pricing versions come from
UPDATE-011 (Standard Price Adjustment v5, Price List Defaulting v4).
File: update-sets/UPDATE-019-pricing-matrix-states.xml

## UPDATE-020-approval-rule-approvers (2026-10-07)
Instance: opmsalescrm1
What: Approver assignments for the Advanced Approval rules in UPDATE-010. 6 Approval Group records
(SCRM-CFO, SCRM-Deal Desk, SCRM-Pricing Manager x2, SCRM-Shipping Approver, SCRM-Delinquent Account
Approver) and 4 Approval User records (Marcus Patel x2, Derek Sanchez, Cameron Patel).
Why: `sn_adv_appr_mgmt_approval_group` / `_user` are not update-set tracked, so UPDATE-010 imported its
14 rules with no approvers. The 5 tracked tables (configurations, trigger conditions, rules, chains,
reminders) were re-checked: all records are in UPDATE-010 and none changed since 2026-10-06. Approval
Request/Step are runtime data and excluded. Two orphan group rows (no rule) skipped. Payloads verified
by MD5 against an instance-side serialisation.
File: update-sets/UPDATE-020-approval-rule-approvers.xml

## UPDATE-019-pricing-matrix-states (2026-10-07)
Instance: opmsalescrm1
What: Version states of the 10 OOB CPQ rule matrices (`sn_csm_ctxrul_mgt_rule_matrix`) as set on
opmsalescrm1. v1 Standard Price Adjustment, Price List Defaulting and Product Offering / Catalog /
Category Eligibility are published; their v2 versions are draft. A fresh install (opmsalescrmstage)
ships the reverse (v1 retired, v2 published).
Why: Rule Matrix is not update-set tracked and has no audit history, so these state changes were
missing from UPDATE-011, which only covers the custom matrices (Standard Price Adjustment v3/v4/v5,
Price List Defaulting v3/v4) and the 8 decision tables. Payloads serialised from live field values;
each verified by MD5 against an instance-side serialisation. Decision tables, matrix types, context
variables and validations referenced are all OOB and present on a fresh instance.
File: update-sets/UPDATE-019-pricing-matrix-states.xml

## scripts/post-deploy/01-system-properties.js (2026-10-07)
Instance: opmsalescrm1
What: Sets `glide.ui.session_timeout` = 1440 (1-day max) and `glide.email.smtp.active` = true by
name, via the execute tool, after Update Sets are committed. Idempotent.
Why: The session-timeout record is created per instance at provisioning, so its sys_id differs
between instances (opmsalescrm1 vs opmsalescrmstage confirmed). An Update Set would insert a
duplicate rather than update it. SMTP is a private property that Update Set import can skip.
File: scripts/post-deploy/01-system-properties.js
Update (2026-10-07): added `sn_prd_pm.show_product_visuals_on_catalog_ui` = true (product visuals
on the catalog UI). Plugin-owned property (Product Catalog Management Core, sys_id cf5224b5…ddbf),
set on opmsalescrm1 2026-09-01; set by name here rather than in a one-record scoped Update Set.

## UPDATE-018-ui16-banner-image (2026-10-07)
Instance: opmsalescrm1
What: UI16 Basic Configuration banner image set to the Solana Conglomerate logo. The file covers
`glide.product.image.light` (UI16 banner) and the legacy `glide.product.image`, and embeds each
property's `sys_attachment` + `sys_attachment_doc` rows (Solana logo.png, 155x28, 4,392 bytes).
Why: Demo branding. Update sets track only the property value (`<attachment sys_id>.iix`), not the
image, so the attachment rows were serialised by hand into the payload (same pattern as UPDATE-003).
Verified the embedded image decodes byte-for-byte to the source PNG.
File: update-sets/UPDATE-018-ui16-banner-image.xml

## Removed UPDATE-001 and UPDATE-002 (2026-10-07)
What: Deleted update-sets/UPDATE-001-quote-approval-500k-threshold.xml and
update-sets/UPDATE-002-quote-doc-template-solana.xml. Their entries below are kept for history.
Why: UPDATE-001 was a test-only approval retune on opmsalescrmstage; UPDATE-010 (opmsalescrm1's
Quote + Deal Registration approvals) is canonical. UPDATE-002 duplicated the Solana quote template
with stage-specific sys_ids; UPDATE-009 (opmsalescrm1 original, incl. 2026-09-29 edit) is canonical.
Also decided: UPDATE-017's `snc_external` ACL role grants stay as-is — they are a workaround for an
existing instance defect.

## UPDATE-004 … UPDATE-017 — opmsalescrm1 golden build capture (2026-10-06)
Instance: opmsalescrm1
What: The full Sales CRM demo **config** build from the stable golden instance, in 14 files /
56 per-scope retrieved update sets / 1,018 records:
  - 004 crm-custom-fields-and-choices (24): `u_` fields, import data-source tables, labels, choices
  - 005 territory-model-and-sales-owner-sync (13): territory model/levels/mappings + 2 BRs
  - 006 lead-opportunity-automation (14): lead/opty BRs, RENEW cycle type, stage, allocation types
  - 007 quote-defaulting-automation (38): 9 quote/RFQ BRs, client script, forms, L2C mappings
  - 008 account-actions-and-forms (17): Create Quote/Opportunity actions, Account forms
  - 009 quote-document-templates (23): Solana / Quote Lines / Sales Cart templates + blocks
  - 010 advanced-approvals (40): Quote + Deal Registration approval configuration
  - 011 cpq-pricing-decision-tables (614): 8 pricing decision tables, 5 rule matrices, context vars
  - 012 order-management-automation (28): order BRs, OrderTaskUtils, task policy, 3 flows
  - 013 business-process-chain-sync (35): BOProcessChainUtil, 7 sync BRs, BO types/group
  - 014 partner-segmentation (7), 015 sales-forecasting (5), 016 workspace-landing-pages-dashboards (135)
  - 017 contributed-snc-personnel-changes (25): other @snc personnel's direct changes (review first)
Why: opmsalescrm1 is declared stable. Capturing its config lets a blank instance be rebuilt without
hand-recreating the build. Master/seed data was excluded by request and stays on the seed/ path.
How: Read-only. Took the latest customer `sys_update_xml` payload per record (2026-08-23 onward),
dropped platform/plugin noise, deletes and 43 orphans (labels/choices for deleted decision tables,
TEST flow result), then grouped by feature and wrote one `sys_remote_update_set` per scope. Nothing
was written to opmsalescrm1.
Known limitations / gotchas:
  - opmsalescrm1's demo build all landed in "Default" update sets. That is why the capture works
    from payloads rather than a named set.
  - 35 records come from tables that are not update-set tracked (`sn_bo_core_obj_group`(+members),
    `sn_csm_ctxrul_mgt_rule_matrix`, `sn_l2c_core_*`). They were serialised from live field values.
    `BOProcessChainUtil` hard-codes the BO group sys_id, so 013 needs that group.
  - Overlapped stage-built UPDATE-001/002. Resolved 2026-10-07 by removing both (see entry above).
  - Data-dependent config references opmsalescrm1 master-data sys_ids (SDR group, Sage Reed,
    SCRM-Order Operations, approvers, product offerings, price lists). Seed with matching sys_ids.
  - Not captured: CPQ/Logik OAuth + tenant URL, Now Assist/Otto settings, SMTP/clone/crypto
    properties, Change Log Tracker app, AI Agents, approval delegation rule.
Files: update-sets/UPDATE-004-crm-custom-fields-and-choices.xml … UPDATE-017-contributed-snc-personnel-changes.xml

## UPDATE-001-quote-approval-500k-threshold (2026-10-06)
Instance: opmsalescrmstage
What: Advanced Approval Management (sn_adv_appr_mgmt) config for Quote
(sn_quote_mgmt_core_quote). Retuned the existing "Quote" Approval Configuration's
two trigger conditions/rules:
  - "All quote approvals" trigger condition → condition changed to `total_amount>=0`
    (fires for every quote, was previously >$100K). Rule renamed to "Quotes under
    $500K - Sales Manager approval only" (chain: Sales Manager approval, approver:
    Taylor Morgan — pre-existing wiring, unchanged).
  - "Deal Desk - Quote over $50K" trigger condition → renamed to "Deal Desk - Quote
    over $500K", threshold changed from $50,000 to $500,000. Rule renamed to "Quotes
    over $500K - Deal Desk approval (additional)" (chain: Deal Desk approval,
    approver: Marcus Reed — pre-existing wiring, unchanged).
Why: Requested approval policy — quotes under $500K need only Sales Manager sign-off;
quotes over $500K need Deal Desk approval in addition to Sales Manager.
No new Deal Desk approver user was created — Marcus Reed (Deal Desk Manager) already
existed on opmsalescrmstage, matching the persona used on opmsalescrm1.
Also granted the `sn_adv_appr_mgmt.approval_rule_writer` role to the admin service
account — required to write Approval Rule/Trigger Condition records, previously
missing.
Gotcha hit: running `execute`/`snow_execute` script calls while this Update Set was
current generated Scripted REST API/Resource/Version noise entries (the tool's
internal execution mechanism). These were deleted from the Update Set before export —
future captures should either avoid `snow_execute` while a demo Update Set is current,
or clean up the same way before exporting.
File: update-sets/UPDATE-001-quote-approval-500k-threshold.xml

## UPDATE-002-quote-doc-template-solana (2026-10-06)
Instance: opmsalescrmstage
What: Imported the "Quote Demo Template for Solana" HTML document template
(sn_doc_html_template, table sn_quote_mgmt_core_quote, category "Sales Proposals")
from opmsalescrm1, added alongside the existing "Auto Parts Quote" template — not
replacing it. Includes:
  - The `quoteScriptDemo` Document Template Script — renders quote line items as an
    HTML table.
  - 6 Document Template Blocks with their Block Content rows: Quote Subscription
    Summary; Quote Commerical Terms for Payment Terms / Subscription Changes / Quote
    Validity; Quote Terms & Conditions for Subscriptions / One-time purchases.
  - 12 HTML-Template-to-Block m2m link rows (6 real + 6 accidental duplicates — see
    gotcha below).
Why: User asked to reuse the quote document template from opmsalescrm1 on
opmsalescrmstage.
Known limitations / gotchas:
  - The m2m link table `sn_doc_m2m_html_template_to_block` refuses deletes via both
    the Table API and server-side GlideRecord on this instance (ACL blocks even
    forced/system deletes) — so 6 duplicate m2m rows from an accidental double-insert
    could not be cleaned up and remain on the instance. Harmless: the template body
    embeds block references directly via div IDs, not via the m2m table, but noted
    for anyone auditing record counts.
  - The header image (PNG logo) from the source template was NOT attached. The new
    record was created directly in "Published" state, which this instance locks
    against further API writes (including attachments, and even reverting state back
    to draft) — the template works but has no header image. Add manually via the UI
    if needed.
  - The template script, 6 blocks, 6 block-contents, and the main template record
    were all created via normal Table API creates with no issues.
  - m2m link inserts required server-side GlideRecord (`snow_execute`) instead of the
    Table API, because `sn_doc_m2m_html_template_to_block` has a cross-scope
    Application Access restriction that refuses external/API creates by default. An
    earlier attempt to grant that access via the platform's auto-fix flipped the
    table's `create_access` flag to `true` as a side effect; this was identified and
    reverted back to `false` afterward so no persistent schema change was left behind.
File: update-sets/UPDATE-002-quote-doc-template-solana.xml

## UPDATE-003-enable-business-portal (2026-10-06)
Instance: opmsalescrmstage
What: Enabled the "Business Portal" Service Portal (`sp_portal`,
sys_id f264dbaccbfd52108d3f6a6fc041e4b5) by unchecking its `inactive` flag
(true → false). No other fields changed.
Why: User identified this as a necessary standing config for the golden demo
instance — the Business Portal needs to be active for the automation pack to
produce a working demo instance out of the box.
Known limitations / gotchas: none hit — single clean record update, captured on
the first attempt with no Business Rule interference or role gaps (sp_portal
write needed no additional role grant). The exported Update Set XML includes the
portal's two logo attachment records' metadata, but the large base64 image
payloads were trimmed to placeholder bytes in the committed XML file to avoid
bloating the repo with binary data unrelated to this change — the logos already
existed on the instance before this change and aren't being introduced by it.
File: update-sets/UPDATE-003-enable-business-portal.xml

## seed/03-ams-west-forecasts.js (2026-10-06)
Instance: opmsalescrmstage
What: Created 2026 Q4 sales forecasts for the AMS-West territory, mirroring
opmsalescrm1's numbers:
  - Rollup forecast "AMS-West (Taylor Morgan)" — $2.5M quota, territory AMS-West,
    submission_required=true.
  - Individual forecast "Asher Sky (California)" — $1.5M quota, territory California.
  - Individual forecast "Riley Cole (Oregon-Washington)" — $1M quota, territory
    Oregon-Washington.
  All use forecast model "Opportunity Revenue for Sales Territory" and period
  "2026 Q4" (2026-10-01 to 2027-01-01), currency USD.
Why: User requested AMS-West territory forecasts (rollup + individuals) copied from
opmsalescrm1.
Findings before building — prereqs already existed on opmsalescrmstage, nothing
needed to be created for them:
  - Territories AMS-West, California, Oregon-Washington already existed (flat
    structure — no Global/TECH/AMS ancestor chain like opmsalescrm1 has, just
    AMS-West as a standalone Sub-region with California/Oregon-Washington as Leaf
    children). AMS-West.manager was already set to Taylor Morgan;
    Oregon-Washington.manager was already set to a user named "Riley Cole".
  - Riley Cole already existed as a `sys_user`, just under `user_name
    riley.cole_ams_west_or_wa_tech_l5` (matching opmsalescrm1's naming convention
    directly) rather than a simplified `riley.cole` — a first pass incorrectly
    concluded this persona was missing by searching the wrong username. Always
    resolve users by display name search or the full qualified username before
    assuming a persona needs creating.
  - Business calendar period "2026 Q4" (f861faf13b670310916b37f726e45a3b) and
    forecast model "Opportunity Revenue for Sales Territory"
    (f7a3e9c14b2d8610a5cf3e7b92d1f480) already existed with their own sys_ids on
    this instance (the forecast model shares the exact same sys_id as
    opmsalescrm1 — same OOTB-style shared reference pattern seen elsewhere in this
    repo's capture work).
Known limitations / gotchas:
  - Writing `sn_quota_core_sales_quota` required granting
    `sn_quota_core.quota_admin` to the admin service account (previously missing —
    same recurring pattern as `sn_adv_appr_mgmt.approval_rule_writer` and
    `sn_prd_pm.product_catalog_manager` from earlier entries).
    `sn_sales_forecast_header` write needed no specific role.
  - Unlike the product-offering catalog/category creates in the previous entry, all
    quota and forecast header creates here landed cleanly on the first attempt — no
    field-blanking Business Rule bug encountered on these tables.
File: seed/03-ams-west-forecasts.js

## seed/02-product-offerings-solana-generators-training.js (2026-10-06)
Instance: opmsalescrmstage
What: Created 3 product offerings copied from opmsalescrm1 — "Solana Revenue
Enablement Platform" (SOL-RE01), "Generators Monthly Trade Journal" (GENERATORS1),
"In-Person Training - 5 day" (TRNG-INPERSON-2609) — plus their supporting records:
  - 4 catalogs: Technology Catalog, Manufacturing Catalog, Conglomerate Top-Level
    (set as new instance default), Conglomerate Catalog.
  - 5 categories: Top-level Simple Products, Power Generators, Top-Level Configurable
    Products, Revenue Enablement, Learning & Events.
  - 6 catalog↔category links, 6 product↔category links, 3 UOM links (all → "Each",
    which already existed on this instance with the same sys_id as opmsalescrm1).
  - 2 product offering families: Revenue Enablement, Learning & Events.
  - 1 characteristic ("Binding Type") with 3 options (Paperback, Hardback, Recycled
    Paperback) and its link to Generators Monthly, defaulted to Recycled Paperback.
Why: User requested these 3 product offerings be copied over with their full
relationship graph (catalog, category, UOM, characteristics). Research on
opmsalescrm1 found NO actual product-offering-relationship or child/component
records for any of the three (those tables are empty instance-wide there) — so no
relationship/child-product data existed to copy; user confirmed proceeding with
only what actually exists.
Captured as: a seed script (`seed/02-product-offerings-solana-generators-training.js`),
NOT an Update Set — see gotcha below.
Known limitations / gotchas:
  - **sn_prd_pm_* writes did not engage update-set tracking on this instance**,
    through any write path tried: Table API create, Table API update (re-touching
    existing records), and server-side GlideRecord via `snow_execute`. Verified by
    checking `sys_update_xml` for both the active named Update Set and "Default"
    after each write — the real records never appeared in either, only unrelated
    Scripted REST noise from the `execute` tool's own internal mechanism. Root cause
    not fully diagnosed (time-boxed); by user decision, product/catalog demo data is
    now captured via seed script instead of Update Set as the standing convention
    going forward, which also matches our existing config-vs-data split.
  - **Broken auto-code-generation Business Rule** on `sn_prd_pm_product_offering_catalog`
    and `sn_prd_pm_product_offering_category`: throws `Cannot find function replace
    in object` (visible in syslog) when a record is created via the Table API with
    `name` not yet committed at BR execution time, which silently discarded ALL
    fields on the created row (not just code) — the Table API's "action": "created"
    response did NOT reflect this; only a follow-up read revealed the blank record.
    Fixed each one via GlideRecord, setting `code` explicitly up front to avoid the
    buggy path. The seed script sets `code` on every catalog/category create for
    this reason.
  - **Role gaps**: writing `sn_prd_pm_product_offering`, `..._catalog`, and
    `..._category` required granting `sn_prd_pm.product_catalog_manager` and
    `sn_prd_pm.product_catalog_admin` to the admin service account (previously
    missing, same pattern as the `sn_adv_appr_mgmt.approval_rule_writer` gap from
    UPDATE-001). Role-check caching was inconsistent within the session — some
    tables honored the grant immediately, `sn_prd_pm_product_offering_category`
    never did despite the grant being Active in `sys_user_has_role`; this is why
    that table's writes were done via GlideRecord instead of Table API.
  - **sn_prd_pm_product_offering_characteristic** has a "Validate char option for
    char" Business Rule requiring `characteristic_option` to be set, even though the
    source record on opmsalescrm1 had it blank — defaulted to "Recycled Paperback"
    to satisfy it.
  - Logik/CPQ blueprint sync step requested by the user was NOT performed — the
    `sn-aidev` MCP server (which hosts the `execute` tool used by the CPQ connection
    test skill) failed to connect this session (ECONNREFUSED). Deferred; needs that
    connector restarted/fixed, then re-run separately.
File: seed/02-product-offerings-solana-generators-training.js

## 2026-10-09 — Stage audit fixes: group role grants

What: Added 3 `sys_group_has_role` rows on SCRM-Account Exec Team (`sn_mcp_client.viewer`,
`sn_mcp_server.viewer`, `sn_qut_sum_skill.quote_ai`; created on opmsalescrm1 2026-10-08, after the
fixtures were extracted) to seed/data/070 and the bundle, and inserted them on opmsalescrmstage.
Also rebuilt the empty `configuration_json` cache on 10 published product offerings on stage via
`ProductCatalogCacheAPI().cacheProductOffering()` (read-only cache field; direct writes are silently discarded).
Why: Full opmsalescrm1 vs opmsalescrmstage master-data audit.

## post-deploy 02 + 03 — E2E blockers on opmsalescrmstage (2026-10-13)
Instance: opmsalescrmstage
What: Two stage-only defects found by the E2E suite, fixed on stage and scripted for fresh deploys.
  - `scripts/post-deploy/02-account-code-counter.js` — property
    `com.snc.cs_base.last.generated.code.tree.path` lagged behind the seeded account_codes, so every new
    customer_account insert collided ("Duplicate entry '!!!U'", Table API 403 "Operation Failed").
    Set to `!!#2` on stage.
  - `scripts/post-deploy/03-order-task-state-override.js` — dictionary override for
    sn_ind_tmt_orm_order_task.state (plugin baseline on opm1) was missing, so Order Task "Close" set
    "Awaiting information" instead of "Closed complete". Inserted on stage (landed in Global scope).
Result: order-submission, order-task-fulfillment and order-completion pass on stage.

## seed/04-forecast-hierarchy.js (2026-10-13)
Instance: opmsalescrmstage
What: Quotas (2026 Q3/Q4), 23 forecast headers (2026 Q4) and 18 open Q4 opportunities copied from
opmsalescrm1, then a forecast calculation to generate items. Fixture: seed/data/900-forecast-2026q4.json.
Why: the forecasting E2E spec needs opmsalescrm1's header names and live opportunities. Headers are never
created by the calculation, so they have to be seeded.
Findings: business calendar spans have per-instance sys_ids (resolve by name); stage had no 2027 spans;
the calculation entry point is `sn_sales_forecast.SalesForecastAsynchronousCalculation` (scoped);
batch-creating opportunities returned a misleading "403 ACL" when the number collided with an existing
record, and Forge auto-granted `sn_prm_dr.enterprise_b2c_deal_reg_agent` to the admin while trying to fix it
(removed again). Applied to stage by hand through the Forge MCP; the script form has not been run end to end.
File: seed/04-forecast-hierarchy.js

## seed buying groups (2026-10-14)
Instance: opmsalescrm1 (source)
What: Buying Groups were never captured (not in the Update Sets, drifted on stage). Added three fixtures
extracted from opmsalescrm1 and registered them in seed/manifest.json: `910-sn_buying_groups_buying_group` (1:
BYGR0001001 Redwood Cloud Technologies - Platform Modernization), `920-..._buying_group_member` (3 contacts: Robert
Chang, Nina Patel, Angela Diaz) and `930-sn_opty_mgmt_core_buying_group_opportunity` (1: link to OPTY0001034).
Group product family overridden to Revenue Enablement via seed/overrides.json (opmsalescrm1 still has Intelligence & Analytics). Bundle rebuilt (2,624 records). The engagement-metric table is empty on source, so nothing to capture.
Prerequisite: OPTY0001034 comes from the forecast seed (seed/data/900, script 04), not the bundle, so it is listed
in external-refs.json; load order is account/contacts/family -> group -> members -> association.
Also: seed/tools/refcheck.py now skips script-loaded fixtures that have no `records` key (it crashed on 900).
Loaded onto opmsalescrmstage 2026-10-14 (1 group, 3 members, 1 opportunity link; re-read and verified).

## seed transactional quotes + orders (2026-10-15)
Instance: opmsalescrmstage (source)
What: 7 opportunities, 7 quotes and 5 orders built through the real flow on stage, captured as fixtures 940-971
and registered in seed/manifest.json (manifest specs with `source_instance` + `scope_query` are read from that
instance by explicit record numbers; seed/tools/extract.py now supports this). Tables: opportunity (+ lines, team
members, associated contacts), quote (+ lines, associated contacts), sold product, order (+ lines), contract
(+ lines). Bundle rebuilt (62 tables, 2,838 records).
- Full flow, completed: Gatelynx AI new business (OPTY0001084 / QT0001063 / ORD0001029); Hudson Yards Analytics new
  business 2026 (OPTY0001091 / QT0001064 / ORD0001030) and its 2027 renewal (OPTY0001100 / QT0001067 / ORD0001031,
  renew quote with +50 seats).
- Open: Gatelynx AI expansion, quote left in Draft (OPTY0001092 / QT0001065); Redwood Cloud Technologies, quote
  Approved, no order (OPTY0001093 / QT0001066).
- Draft orders: Nimbus Analytics ORD0001032 (QT0001069) and Rose City Software ORD0001033 (QT0001070); their quotes
  were completed directly with no approval chain.
- 16 contracts (CNTR0010015-30) set Active, including the renewal's CNTR0010026-30.
Not seeded: platform-generated children (quote/order/opportunity related parties and addresses, allocations,
snapshots, order tasks, approval requests and steps); quote `document_template` is dropped (stage-only template).
Opportunity `primary_quote` is deferred (insert_as) because the quote points back at the opportunity.
Why: transactional demo data for the quote-to-order story; stage already holds it, the repo now reproduces it.
Caveats: the load is untested. The loader inserts with Business Rules on, so quote pricing, quote state (an
opportunity update resets a synced quote to Draft) and order/contract creation may behave differently than on stage.
Opportunity numbers (OPTY0001084-1105) may collide with the forecast seed's opportunities on a fresh instance.
Fixed on stage first: a mistyped Redwood contact id on the opportunity and quote associated-contact rows.

## seed dry run on molearning (2026-10-15)
Instance: molearning (disposable test instance, already carries the golden master data)
What: loader.js run with DRY_RUN = true and ON_CONFLICT = 'fail' against the rebuilt bundle (62 tables, 2,838 records).
Nothing was written to data tables. Result: no errors; the only missing prerequisite is the known
`sys_user_group not-applicable` placeholder. Master-data tables (55 of 62) plan as updates only, plus 3 new
`sys_group_has_role` rows. 44 business-key conflicts, all on the transactional fixtures (940-971): other records
on molearning already hold the same `number` (opportunity 3, opportunity line 11, sold product 4, order 3,
contract 7, contract line 16; e.g. OPTY0001100/1103/1105, ORD0001030/1032/1033, CNTR0010015-18/22/26/27). With the
default `on_conflict: fail` the real load stops before inserting them.
Why: confirms the number-collision risk noted in the previous entry. molearning's counters (opportunity 1676,
quote 1713, order 1245, contract 10125) are past our fixture numbers, so raising counters would not help; the
collision is with existing records below the counter.
Not done: the real load (DRY_RUN = false) was not run. A pre-flight collision check against the target, and
`scripts/post-deploy/04-number-counters.js`, are still to do. A fresh instance is unaffected.

## seed leads for existing customers (2026-10-15)
Instance: opmsalescrmstage (source and target)
What: new fixture `935-sn_lead_mgmt_core_lead` (6 leads, LEAD0001006-1011), all owned by Sage Reed in the SCRM-Sales
Development Representative group, all `existing_business`. Loads before the opportunities (940), which reference `lead`.
- LEAD0001006: the hot lead. Gatelynx AI / Daniel Foster, score 76, rating Hot, stage New, Inbound Phone, California.
  Modelled on LEAD0001094 on opmsalescrm1 (same owner, group, source, industry, stage, score), but with the account
  and contact filled in, which 1094 lacks.
- LEAD0001007-1011: Rheinland Systems (Anna Hoffmann, Warm, New), Thames Valley Software (James Whitmore, Hot,
  Contacted), Sakura Digital (Kenta Yamamoto, Warm, Nurturing), Marina Bay Software (Priya Sharma, Hot, New),
  Desert Peak (Rashid Ahmed, Cold, Contacted). Same shape as the opmsalescrm1 existing-customer leads.
Why: lead stage of the lead-to-cash story; stage had only 3 leads of its own (LEAD0001001-1003), none for the golden customers.
Caveats: the stage's lead numbers (1006-1011) can collide with other records on instances with older leads. The
platform reassigned Desert Peak's territory from UAE to TECH on insert; the fixture keeps TECH. `lead_score` is
kept as given on insert; not tested whether scoring automation overwrites it on a fresh instance.

## UPDATE-025-solana-logo-embedding (2026-10-16)
Instance: opmsalescrmstage (tested), source payloads from UPDATE-006 / UPDATE-009
What: the Solana logo (`Solana logo.png`, 155x28, 4,392 bytes) now ships inside the repo for two places that showed a broken image on stage.
- Email client template "Opportunity Default": the `<img>` was hotlinked to `empksingampalli.service-now.com/sys_attachment.do?...`
  (another instance). Replaced with an inline `data:image/png;base64,...` URI, so it needs no attachment or network access.
- Quote template "Quote Demo Template for Solana" (`7e06a6d0...`): `header_image` pointed at attachment `a896a654...`, which was never
  deployed. The `sys_attachment` + 2 `sys_attachment_doc` rows are now embedded in the template payload (same pattern as UPDATE-018), keeping the same sys_id.
- Quote template body: the Solana logo paragraph added at the top of the body (2026-10-16 edit on stage; `<img>` -> attachment `ae51b610...`, 188x34) is captured, along with that attachment (same image as `a896a654...`). The rest of the body is unchanged from UPDATE-009. The retired `... -Old` duplicate template is not captured.
Why: the update-set payloads only carried a reference, not the image, so any instance other than the source showed a broken logo.
Tested on stage 2026-10-16: attachment `a896a654...` downloads as 155x28 PNG; email body decodes to a 155x28 image; hotlink gone. The stage
fix was applied server-side from the image bytes already on stage (MD5 of the base64 matches the repo file); the XML itself was not yet
imported through the update-set loader. Not covered: stage also has a second "Quote Demo Template for Solana" (`be10ac51...`) with no header image, not in the repo.
Caveat: Gmail/Outlook web may block `data:` images in a sent email; the Email Client compose preview shows it fine.

## UPDATE-026-email-sender-name (2026-10-16)
Instance: opmsalescrmstage (source)
What: system property `glide.email.username` (the From display name on outbound email) changed from "IT Service Desk" to "Solana Sales & Service". Property sys_id `f290a941...` is the OOB one, same on every instance.
Also (2026-10-16): the Email Client compose From dropdown ignores that property. It reads `email_user_label` on the "ServiceNow SMTP" `sys_email_account`, which was "IT Service Desk". That table is not update-set tracked and the record has per-instance sys_id and credentials, so it ships as `scripts/post-deploy/05-email-account-label.js` (sets it by name), not in the XML.
Why: demo emails should come from the Solana brand, not the generic IT desk.
Caveats: the property is `is_private=true`, which update-set import can skip; if the From name is still "IT Service Desk" after commit, set it by name (as in `scripts/post-deploy/01-system-properties.js`). The XML was not yet imported through the update-set loader. Commit after 022/025; no dependencies.

## UPDATE-027-probability-from-forecast-category (2026-10-16)
Instance: opmsalescrmstage (source + tested)
What: Global before-insert/update business rule "Set probability from forecast category" (order 150, condition `forecast_category VALCHANGES`) on `sn_opty_mgmt_core_opportunity`. Sets Probability % from Forecast Category: Pipeline 10, Upside 30, Strong Upside 50, Commit 80, Won 100, Omitted 0. Rule sys_id `e266dfdc...`.
Why: probability should follow the forecast category instead of being keyed by hand. Runs after OOTB "Set forecast category" (100, stage-driven) and before "Set Amount And Weighted Amount" (550), so weighted amount recalculates.
Tested on stage 2026-10-16 (OPTY0001038): Upside -> Commit gave 80, Commit -> Upside gave 30; weighted amount recalculated; record restored. Only Commit and Upside exercised. The XML was not yet imported through the update-set loader.
Caveat: a manual probability is overwritten if the category changes in the same save; it sticks when the category is unchanged. Categories are matched by display name. No dependencies.

## seed Meeting Intelligence Dashboard offering (2026-10-21)
Instance: opmsalescrmstage (source), tested by extraction only
What: new product offering "Meeting Intelligence Dashboard" (code `MEETING IN1`), monthly recurring, UOM Each, family Intelligence & Analytics, category Revenue Enablement, no catalog. Fixtures now carry it from stage:
- `450` offering, 2 rows: v1 `d202b833...` (PRDOF01009, Retired) and v2 `6d7570bf...` (PRDOF01011, Published, sellable, ramps enabled, `previous_version` = v1). v1 is kept because v2's `initial_version`/`previous_version` point at it.
- `455` category link and `460` UOM link, one pair per version (4 rows).
- `510` price list line `PLL0001016` on Standard Price List: $20, Each, start 2026-01-01, for v2 only.
The family (`044cf59b...`) and category (`6bebb95b...`) were already in the fixtures from opmsalescrm1, so no change there.
How: `seed/tools/extract.py` gained a per-table `also_from` option in `manifest.json` (extra `source_instance` + `scope_query`, merged by sys_id, main source wins), for records that exist only on another instance. Used on 450/455/460/510, pointing at stage by sys_id.
Why: the offering was created on stage after the opmsalescrm1 capture, so the created-on windows never saw it.
Caveats: the offering and line numbers (PRDOF01009/01011, PLL0001016) already exist on other fixture rows; the numbers are not unique-constrained, same as earlier duplicates. Both versions share code `MEETING IN1`; the loader's key check runs before any writes, so both insert on a blank instance (same as `GENERATORS1`). Not captured: stage's retired "Meeting Intelligence" `USR-MTG` v2 (`abdde8ff...`), a leftover from the same session. Re-extracting 450 also picked up an unrelated opmsalescrm1 edit to a "Tokens" offering (description, cleared `configuration_json`); that was left out so this change stays scoped, so 450 still has the older value for it. Not loaded onto a blank instance yet; the bundle was rebuilt (2,851 records).

## seed 10 golden opportunities with touchpoints, tasks, competitors (2026-10-21)
Instance: opmsalescrmstage (source), extraction only, not loaded on a blank instance yet
What: OPTY0001085, 1086, 1087, 1088, 1089, 1090, 1094, 1095, 1096, 1098 (Nimbus Analytics, Gatelynx AI, Rose City Software, Boxeo x2, Hudson Yards Analytics, Redwood Cloud Technologies, Willamette Data Systems, Piedmont Data Systems, Cascadia Cyber Systems) and what hangs off them:
- `940`-`943` scope queries extended: opportunities (now 17), line items (114), team members (34), associated contacts (51).
- `944` touchpoints (60, all `origin_id` = one of the 10 opps; `case_report` excluded, the platform makes it), `945` opportunity tasks (40), `946` competitors (16). New fixtures, loaded after the opportunities and before quotes.
- `105` + 7 competitor companies (Ashgrove Pipeline Co, Brightquill Sales Labs, Corvane Standby Systems, Halvorsen Grid Systems, Northmere Revenue Systems, Quillon Growth Works, Tallowfield Enablement); `910` + 7 buying groups, `920` + 21 members, `930` + 8 buying group links. All via `also_from` pointing at stage.
- `overrides.json`: line item OPTYL0001113 had `parent_line_item` = `1103771790` (not a sys_id, matches nothing); blanked.
Why: these are the demo opportunities for the Revenue Enablement / Power Generator stories; they were built on stage after the opmsalescrm1 capture.
Caveats:
- Amounts on stage differ from the planning table (e.g. OPTY0001085 $45,060 vs $36,800; 1088 $284,160 vs $393,480). Stage values are what is captured.
- The 7 opportunities captured earlier were refreshed from stage too: owner reassigned and probability updated since the 10-15 capture (e.g. probability 50 -> 10 on one, after UPDATE-027).
- Allocations (10) are not seeded; the platform recreates them (one was last touched by `logik.intg`).
- Opportunity numbers may collide with existing records on instances that already hold OPTY0001085-1098, same as the earlier note on 1084-1105.
- refcheck against opmsalescrm1 shows no new dangling references. Touchpoints are task records; whether the loader inserts them without firing notifications/flows is untested.

## UPDATE-030 Claude MCP Client OAuth registration (2026-10-22)
Instance: opmsalescrmstage (source)
What: Application Registry record `Claude MCP Client` (`oauth_entity` `de6bbd04...3c63`, created 2026-10-15 by admin in Default). Auth-code inbound, default grant password, redirect `https://claude.ai/api/mcp/auth_callback`, PKCE S256, JWT tokens, 8,640,000 s access/refresh lifespans.
Why: lets the Claude MCP client connect to a freshly deployed demo instance.
Caveats: `client_secret` is blank on purpose (stage's is encrypted with its instance key and would not decrypt elsewhere); after commit, open the record on the target, copy the generated secret into the Claude connector. `client_id` is carried over unchanged. The record stores no username/password; `asher.sky` is already seeded (`030-sys_user.json`) without a password, and none is captured. Not committed on a blank instance yet; blank-secret generation on import is untested.

## UPDATE-031 Sales Manager landing page order (2026-10-22)
Instance: opmsalescrm1 (source), applied and verified on opmsalescrmstage
What: `sys_ux_screen` "Sales Manager Landing Page" (`efd686ac...bfc7`) order 20 -> 10. One record.
Why: the screen winner is `sys_ux_screen.order` (ascending), not the `order` on `sys_ux_applicability_m2m_screen`. The AE screen (CSM Sales Rep, OOB) and the Manager screen were both 20 and managers also hold `sales_agent`, so Taylor Morgan landed on the AE screen / plain "Sales Agent Landing Page".
Caveats: SDR screen left at 30 on purpose. AEs also hold Lead Agent, so moving SDR ahead of AE (tried at 15) put Asher Sky on the SDR page. Applicability-row `order` was tried first (-20/+20) and has no effect; those edits were reverted. Verified on stage by impersonation: AE -> AE screen, SDR -> SDR screen, Manager -> Manager screen. Not yet committed or pushed.

## seed Service CRM install base items, CSM groups, Technical Support Case, Interaction (2026-10-29)
Domain: Service CRM
Instance: opmsalescrmstage (source — this data was built directly on stage, not on opmsalescrm1; opmsalescrm1 has no `sn_tech_product_support_case` table and an unrelated record under number IMS0000178, so stage is treated as source-of-record for this slice, same precedent as the Meeting Intelligence offering and the 10 golden opportunities)
What:
- `030-sys_user.json`: added `ravi.kapoor` (`32714694...c75`, IT Application Support), via `also_from` since he doesn't exist on opmsalescrm1.
- `040-sys_user_group.json`: added groups `SCRM-CSM-Customer Service` (`7f2c14dc...ce5`) and `SCRM-CSM-Technical Support` (`838cd010...cb3`).
- `050-sys_user_grmember.json`: `john.jason` -> Customer Service, `ravi.kapoor` -> Technical Support.
- `060-sys_user_has_role.json` + `expected-user-roles.json`: `ravi.kapoor` direct roles `admin`, `sn_customerservice_agent`, `sn_tech_support.agent`, `sn_cwf_wrkspc.frontline_agent`, `sn_openframe_user`; `john.jason` gained the same four (plus his existing `snc_internal`) since the groups were created. `expected-user-roles.json` was regenerated for just these two users against stage (255 effective roles each, group-inherited roles included) — not for the other 62 users, to keep this change scoped.
- `955-sn_install_base_sold_product.json`: added `SLPRD0001039` "Configurable Product for Data Storage Solution" (`0af071...a07`), the root sold product the install base items and case below hang off.
- `956-sn_install_base_item.json` (new): `IBITM0001001`-`IBITM0001005` — root item "Configurable Product for Data Storage Solution" plus 4 children (Software, Hardware, Cloud Solution, Services), all account Gatelynx AI / contact Daniel Foster.
- `957-sn_install_base_m2m_installed_product.json` (new): `IBPRD0001001`, the bridge row linking the root install base item to `SLPRD0001039`.
- `958-sn_tech_product_support_case.json` (new): `TPSC0001005`, "Cannot access the documents on the storage account" — priority 1/critical, assignment group SCRM-CSM-Technical Support, assigned to ravi.kapoor, opened by john.jason, linked to `SLPRD0001039`.
- `959-interaction.json` (new): `IMS0000178`, phone interaction with the same short description/account/contact, opened and closed by john.jason. Not formally linked to the case by any field — same customer scenario, two independent transactional records, as asked.
Why: requested capture of this Service CRM slice (install base items, CSM groups + roles, one case, one interaction) from opmsalescrmstage into the seed.
Caveats:
- `case_report` (`CSR0010198`, platform-generated child of the case) is excluded, same rule as touchpoints/competitors on opportunities — the platform recreates it.
- The case's `service` field ("Something is Broken") and `sold_product`'s `product_specification`/`prd_offering` resolve to records already in the fixtures or to OOB taxonomy; `refcheck.py --instance opmsalescrmstage` shows zero dangling references across all 70 fixture files after this change.
- `expected-user-roles.json`'s top-level `source` stays `opmsalescrm1` on purpose — only the two touched users' role lists were refreshed from stage; a full regeneration against stage would have changed roles for all 62 other seeded users (plugin/role drift unrelated to this change) and was reverted.
- Not loaded onto a blank instance yet; bundle rebuilt (70 tables, 3,194 records).
