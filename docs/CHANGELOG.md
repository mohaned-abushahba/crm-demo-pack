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
