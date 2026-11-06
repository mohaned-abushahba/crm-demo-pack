# Open items

Follow-ups that aren't blocking. Remove an item once it's resolved, and log the fix in CHANGELOG.md.

## Stray duplicate contact/team-member rows on opmsalescrm1's 10 seeded Opportunities — OPEN (logged 2026-11-05)

The loader race fixed in CHANGELOG ("fix loader: Phase 1/Phase 2 'adopt' race...") stops this going
forward, but doesn't retroactively clean up what the earlier (buggy) load already wrote on
opmsalescrm1: one extra `sn_opty_mgmt_core_opportunity_associated_contact` row and one extra
`sn_opty_mgmt_core_opportunity_team_member` row per seeded Opportunity (OPTY0001085/86/87/88/89/90/
94/95/96/98 — 10 of each, 20 rows total), each a bare BR-created stub (no `opportunity_role`, no
`primary`, created a few seconds before the real migrated row in the same load). Confirmed on
OPTY0001085: Contacts related list shows "Sarah Whitman" twice, Team shows the owner twice.

**To do:** for each of the 10 opportunities, delete the stub row — identify it as the
`opportunity_associated_contact`/`opportunity_team_member` row whose `sys_id` is **not** one of the
sys_ids present in `seed/data/943-...json` / `942-...json` for that opportunity (the real migrated
rows keep their source sys_id; the stub does not). Do **not** delete by "oldest `sys_created_on`"
alone without also checking the sys_id isn't in the fixture — re-running role/order sync could change
timestamps. A short one-off script, not a loader change, is the right tool here since this is cleanup
of already-landed bad data, not a repeatable load step.

## Opportunity "Recent and Upcoming Activity" shows nothing on the 10 seeded Opportunities — OPEN (logged 2026-11-05)

Reported alongside the duplicate-contact issue above, on the same 10 opportunities. The
`sn_opty_mgmt_core_opportunity_task` junction rows linking each Opportunity to its Touchpoints, and
the Touchpoint records themselves (`sn_crm_touchpoint_touchpoint`), are byte-identical between
opmsalescrmstage and opmsalescrm1 — same sys_ids, same `opened_at`/`due_date`, same `state`. Ruled
out as a missing/un-migrated-data problem; the touchpoint data is fine on both instances.

**Also checked and ruled out (2026-11-05): this is not the "Emails & Meetings from Touchpoints not
linked" complaint below in disguise.** The CRM Touchpoints are themselves correctly linked to the
Opportunity via `origin_table`/`origin_id`, identically on both instances — see that item for detail
on why Meetings/Emails are a separate, never-seeded data gap rather than a migration bug.

**Not yet root-caused.** Working theory, unconfirmed: the Opportunity Summary widget's "Recent and
Upcoming Activity" panel does its own primary-contact (or similar) lookup to decide what counts as
relevant activity, and the stray duplicate contact row above (same person, `primary=false`, sitting
next to the real `primary=true` row) could be making that lookup return nothing or the wrong record.
Couldn't verify directly — the sales-workspace UI that renders this widget wasn't reachable in this
session (only the classic form rendered; Agent Workspace and `/now/sow/...` both 404'd for this
instance). **To do:** open OPTY0001085 in whatever UI actually hosts "Opportunity Summary" on
opmsalescrm1 (ask the user for the right URL/workspace if the ones tried above don't work), check
whether it's live here or already fixed now that the duplicate-contact cleanup above has landed
(15 of 16 stray rows deleted as of 2026-11-05; one remains, blocked on an allocation re-point — see
that item), and if not, inspect the widget's server script / client script for how it picks "the"
contact or builds the activity list.

## "Emails & Meetings from Touchpoints are not linked to the Opportunity" — RESOLVED 2026-11-05

Reported by the colleague testing opmsalescrm1 alongside the duplicate-contact/team-member issue.
First investigated as if it might be the same class of migration bug (it wasn't, see below), then
root-caused and fixed by extending the seed. See CHANGELOG, "seed Emails and Meetings for the 10
golden opportunities (closes the real root cause of the Emails/Meetings gap)".

Summary of what was wrong: the Opportunity form's "Emails" and "Meetings" related lists query
`sys_email` (via `instance`/`target_table`) and `sn_meeting_mgmt_meeting_details` (via
`associated_record`/`source`) directly — not the CRM Touchpoint table. Touchpoints themselves (shown
as "Tasks") were correctly linked on both instances the whole time; `sys_email` and
`sn_meeting_mgmt_meeting_details`/`_participant` were simply never part of the original 10-opportunity
seed capture, so "Emails"/"Meetings" were empty on opmsalescrm1 even though stage had them.

---

## Sales quotas for Q3 2026 - Q4 2027 missing on opmsalescrm1 (155 expected, 26 present) — RESOLVED 2026-11-06

Reported by the colleague who built the quota set: added Q4 2026 and Q1-Q4 2027 quotas for the entire
sales team, adding to 26M globally and at the TECH industry level (one industry per instance right
now), and they "did not come over" to opmsalescrm1 — only 26 of 155 were present.

Root-caused and fixed by extending the seed with a new loader mechanism. See CHANGELOG, "Seed +
loader: sales quotas for Q3 2026 - Q4 2027 (closes 'quotas didn't come over')".

Summary of what was wrong: `sn_quota_core_sales_quota` was never part of the seed at all. The 26 rows
already on opmsalescrm1 were NOT a partial migration — only 10 of the 26 actually matched a stage
sys_id; the other 16 were unrelated, genuinely local rows (same 5 owners repeated, only 2 territories)
predating this fix. The harder part: quota's `period` field references `business_calendar_span`, a
fiscal calendar every instance generates independently (same quarter, same dates, different sys_id
per instance) — so the existing `on_conflict:'adopt'`-by-sys_id pattern used for other platform-
generated rows didn't apply; `business_calendar_span` itself was never in the bundle to adopt against.
Fixed with a new `resolve_by` mechanism (extraction captures the referenced row's business key,
loader.js resolves it against the target instance's own calendar by business key, not sys_id, before
its normal Phase 1 plan). 145 missing rows inserted onto opmsalescrm1; the 16 unrelated local-only
rows were left alone. Not yet verified in the actual quota workspace UI (only via direct table
queries) — same "couldn't reach the workspace UI this session" limitation as the Emails/Meetings and
Recent/Upcoming Activity items.

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
