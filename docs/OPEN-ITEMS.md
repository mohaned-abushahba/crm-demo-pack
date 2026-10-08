# Open items

Follow-ups that aren't blocking. Remove an item once it's resolved, and log the fix in CHANGELOG.md.

## Role gaps on john.jason and marcus.reed (found 2026-10-08)

The post-load role check on opmsalescrmstage, after UPDATE-021 and Contract Management for Sales CRM were
applied, gave 59/63 matching users. Two of the four mismatches still need investigating:

| User | Missing roles (all exist on stage) |
|---|---|
| john.jason | sn_openframe_api_user, sn_openframe_user, snc_required_script_writer_permission |
| marcus.reed | data_interface_steward, df_data_steward |

These roles exist on the target, but the users don't get them. Likely cause: a role-containment link is
missing (as with UPDATE-021), or a group role didn't rebuild. Next step: compare the users' group memberships
and the parent roles' sys_user_role_contains rows on opmsalescrm1 against stage. If links are missing, add them to UPDATE-021 or put them in a new Update Set.

The other two mismatches, mary.stephens and order admin, are each missing the same 10 field service roles
(wm_*, fsm_skill_user, service_fulfiller, appointment booking, …). Most of those roles don't exist on stage.
This is expected: field service is out of scope.
