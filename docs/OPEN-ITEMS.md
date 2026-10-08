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
