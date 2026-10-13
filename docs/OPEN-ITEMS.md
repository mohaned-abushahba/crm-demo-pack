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

## Forecast hierarchy not seeded on stage — OPEN (found 2026-10-13)

opmsalescrm1 has 29 forecast headers, 26 quotas and 4,184 forecast items; stage has the 3 headers and 3
quotas from `seed/03-ams-west-forecasts.js` and no items. `tests/sales-forecasting-rollup.spec.ts` needs the
full opm1 territory/persona hierarchy. Decide whether to seed it or rescope the spec.

## Candidate records on opmsalescrm1 not in any Update Set — OPEN (drift Layer 2, 2026-10-13)

Not plugin noise, to review and capture (UPDATE-024+) or consciously leave out: two
`sn_adv_appr_mgmt_approval_group` rows (SCRM-Delinquent Account Approver), `sys_decision_multi_result`
7e817a90… and flow "TEST Header tasks at submission for new add orders", two `sys_granular_delegate` rows
(rebecca.smith, 2026-09-02), `customer_contact` and `fx_rate` form sections, and PRM `sys_ui_section`
3f4b8d88… (Business Profile, UPDATE-014) which is missing on stage. See the e2e repo's
`drift-reports/`.
