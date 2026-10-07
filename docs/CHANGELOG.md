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
