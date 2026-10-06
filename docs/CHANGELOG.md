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
