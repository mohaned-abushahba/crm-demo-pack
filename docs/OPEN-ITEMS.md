# Open items

Follow-ups that aren't blocking. Remove an item once it's resolved, and log the fix in CHANGELOG.md.

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
