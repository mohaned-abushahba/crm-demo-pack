# Open items

Follow-ups that aren't blocking. Remove an item once it's resolved, and log the fix in CHANGELOG.md.

## Admin landing page fix (UPDATE-031 order change) not re-verified by impersonation (logged 2026-11-04)

Moved "Sales Manager Landing Page" from order `10` to `-5` on **both** opmsalescrmstage and opmsalescrm1 to
beat the OOB "Dispatcher Landing Page" (order `1`) that started winning once the FSM plugins were installed —
see CHANGELOG. On opmsalescrm1, also re-pinned admin's recent-dashboard preference (had drifted to "AI Agent
Analytics"). The previous fix of this kind (UPDATE-031, 2026-10-22) was verified by impersonating admin and
the AE/SDR/Manager personas and checking which screen loaded. That verification step was blocked this time:
impersonation via the REST endpoint was refused by this session's permission policy (identity switch).

**To do:** log in as admin (or impersonate) on both instances and confirm the landing page is the Sales
Manager Golden Landing Page, not the FSM Dispatcher Landing Page. If it's still wrong, `-5` may not be low
enough, or another FSM screen besides the Dispatcher one is also now in the running — list `sys_ux_screen`
ordered ascending and check which ones admin's roles make them eligible for.

## Otto header chat says "something went wrong" on clones — KNOWN FIX, not currently occurring (logged 2026-11-03)

Seen previously on an instance cloned from the golden instance; **not occurring on opmsalescrmstage**
as of this writing. Logging the fix here so it can be applied immediately if it resurfaces on a clone.

**Symptom:** every message sent to the Otto chat from the header gets "something went wrong" back
immediately. No AI agent or execution plan runs, and nothing new appears in `sys_generative_ai_log`.
Other Now Assist features (e.g. summaries) can still work fine.

**Cause:** the Otto header chat is configured for the NextWave experience (`ai_native_chat`), which
runs on a separate conversation server that must sign in to the instance via two OAuth clients
(`NextWave` and `NextWave-Channels`). Those OAuth clients don't exist on clones, so the handoff fails
before the LLM is ever invoked. The reference instance (opmsalescrm1) doesn't use NextWave — it's on
the classic Now Assist experience (`self_service_dialog`), which is why Otto works there.

**Fix (~2 min, manual on the affected instance):**
1. Go to `sys_now_assist_deployment_channel.list`.
2. Open the record "Otto panel – Platform / Unified Navigation"
   (sys_id `0bfc6cf73bf24b10d5260fa693e45acf` on opmsalescrm1 — likely the same on any instance
   cloned from the same reference, since the sys_id is carried over with the clone).
3. Change **Experience** from `ai_native_chat` to `self_service_dialog` and save.
4. Hard-refresh the browser and retest Otto.

**Automating this:** if this resurfaces, it can be applied directly instead of by hand:

```javascript
await SN.TableRecord("sys_now_assist_deployment_channel").update(
  "0bfc6cf73bf24b10d5260fa693e45acf",
  { experience: "self_service_dialog" }
);
```

Verify the sys_id matches that record (`field=Experience`) on the target instance before running —
if it doesn't, look up the "Otto panel – Platform / Unified Navigation" record by name instead.

## Role gaps on john.jason and marcus.reed — RESOLVED 2026-10-08

Root causes found by comparing opmsalescrm1 vs. opmsalescrmstage directly (groups, direct roles, and
`sys_user_role_contains` chains):

- **john.jason**: missing the direct role `sn_openframe_user` and missing membership in group
  "Conditional Script Writer" (`5ee74940b70022108d4406dd1e11a918`). Neither is a role-containment issue —
  his `sys_user_has_role` and `sys_user_grmember` rows for these just never existed on stage. Fixed by
  inserting both rows directly on stage. `sn_openframe_api_user` and `snc_required_script_writer_permission`
  then resolve automatically (contained by `sn_openframe_user`, granted by the group, respectively).
- **marcus.reed**: the `sys_user_role_contains` link `connection_admin → df_data_steward` was missing on
  stage (the `df_data_steward → data_interface_steward` link was already present). He already had
  `connection_admin` inherited, so adding the missing containment link alone resolved both missing roles.
  Checked `sys_update_xml` for this link on opmsalescrm1: created 2026-02-13 by `system`, i.e. **plugin
  baseline data, not a demo config change** — so this was a stage-side plugin install gap, not something
  to capture into UPDATE-023. Applied directly on stage; not added to any Update Set.

The other two mismatches, mary.stephens and order admin, are each missing the same 10 field service roles
(wm_*, fsm_skill_user, service_fulfiller, appointment booking, …). Most of those roles don't exist on stage.
This is expected: field service is out of scope.

## Logik.io model for SOL-RE01 missing on the stage tenant — OPEN (found 2026-10-13)

Customize on a Solana Revenue Enablement Platform quote line (guided configuration) fails on
opmsalescrmstage: the workspace shows "An error occurred. Please contact your administrator" and the
quote header reads Synced = No. The ServiceNow-side CPQ config matches opmsalescrm1 (HTTP connection,
tenant_url, credentials, Logik Integrator roles, OAuth entities); `POST /auth/exchange` returns 200. The
failing call is `POST https://opmsalescrmstage.demo01.logik.io/c?...` → **404** for productCode SOL-RE01,
i.e. the configurable-product model is not deployed in the stage Logik tenant. Logik tenant content is not
captured by Update Sets or the seed. Needs the model exported from the opmsalescrm1 tenant and imported /
deployed in the stage tenant by someone with Logik admin access. Re-run
`tests/catalog-guided-configuration.spec.ts` afterwards (it also gates contract-amendment and renewal).

## Forecast hierarchy not seeded on stage — RESOLVED 2026-10-13

Seeded 2026 Q3/Q4 quotas (10), forecast headers (23, 2026 Q4) and the 18 open Q4 opportunities from
opmsalescrm1; the platform calculation then generated 342 items. `sales-forecasting-rollup.spec.ts` passes
on stage (2/2). Not done: 2027 quotas (stage has no 2027 business calendar spans), the 28 opportunities
that close outside 2026 Q4, and the older "(old stage)" territories/headers/quotas from
`seed/03-ams-west-forecasts.js`, which are left in place but unused.

## Candidate records on opmsalescrm1 not in any Update Set — TRIAGED 2026-10-13, nothing to capture

Drift Layer 2 listed records created on opmsalescrm1 since 2026-08-23 that no Update Set contains and that
are absent on stage. Checked each; none belongs in UPDATE-024:

- Two `sn_adv_appr_mgmt_approval_group` rows (SCRM-Delinquent Account Approver) have no approval rule —
  orphans, inert. The rule-linked group (cae61ad0…) is already on stage.
- Two `sys_granular_delegate` rows (Rebecca Smith → Cameron Patel, 2026-09-02) have no delegation rule
  (`sys_m2m_delegate_rule`), and one expired 2026-09-08 — inert. Derek → Rebecca (UPDATE-022) is the real one.
- Flow "TEST Header tasks at submission for new add orders" and its `sys_decision_multi_result` row: a test
  duplicate of the real flow (037f8a9c…, already on stage). Order Task counts match on both instances.
- `customer_contact` / `fx_rate` Default-view form sections: auto-generated layouts (stage has its own
  customer_contact one, different sys_id).
- PRM "Business Profile" Workspace section 3f4b8d88…: stage has the same section under sys_id 553e35ab…
  (PRM plugin regenerates these per install).
- Everything else (UI views, ux macroponents/events, encryption/AI properties, Field Service and
  Employee Experience rules, change-log app) is plugin-install residue.

If any of the first four should be on stage anyway, say so and they get captured as UPDATE-024.

## Sage Reed cannot access the widgets — OPEN (logged 2026-10-13)

Sage Reed (user in the seed, `seed/data/030-sys_user.json`) is unable to access the widgets. Not yet
investigated. To pin down: which instance (opmsalescrm1 vs. opmsalescrmstage), which widgets/workspace, and
the exact symptom (missing, blank, or access denied). Start by comparing Sage's groups, direct roles and
`sys_user_role_contains` chains against the instance where it works, as was done for john.jason and
marcus.reed above, then check the widget ACLs / role requirements.

Lead (2026-10-13, not confirmed): on opmsalescrm1 Sage is in SCRM-Sales Development Representative, which has read on the
SDR and Sales Agent dashboards, so dashboard access is fine. The SDR "Leads by Source" widget is a stored
visualization whose `par_visualization_permission` rows grant only ITSM/CMDB-style roles (itil, sn_incident_*,
sn_sd.success_dashboard_read, …) plus `sn_sales_crm_mob.sales_mobile_user`, which Sage does have. The other 8 SDR widgets are
inline. Next step: reproduce as Sage and see which widget fails.

## Plugin-install REST service not yet identified — OPEN (2026-10-14)

`installer/instance.js` has `latestVersion()`, `startInstall()` and `getProgress()` as placeholders that throw. `latestVersion(plugin)` must return the newest version available for the app (store/app repo); `startInstall(plugin, {version})` must install that version or upgrade an active-but-older one (the engine requires latest, see installer/README.md). Need the internal
REST service that installs/activates plugins and store apps (candidates to check: the CI/CD
`/api/sn_cicd/plugin/{id}/activate` and `/api/sn_cicd/app_repo/install` endpoints, or whatever the internal
service is). Implement the two functions keeping their return shapes (see the contract at the top of
`instance.js`); the engine, retry logic, API and tests need no changes. Until then run the installer against a
`mock: true` instance.

Also still to confirm:
- `sn_ai_som_adv` (SOM - Advanced) is on opmsalescrm1 but **not on opmsalescrmstage** (checked 2026-10-14); the other 45
  scopes match on both. Stage's service account is also ACL-blocked from `sys_store_app` (verify falls back to `sys_scope`).
- Real per-plugin install order/dependencies (manifest order is the doc's order with Order Management first).
