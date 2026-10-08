# Update Sets

Exported Update Set XML, one file per logical feature/fix, applied in numeric order.

Naming: `UPDATE-<NNN>-<short-kebab-name>.xml`

## Sources

| Files | Built on | How |
|---|---|---|
| UPDATE-003 | opmsalescrmstage | Re-applied deliberately with a named Update Set current, then exported |
| UPDATE-004 … 017 | opmsalescrm1 (stable golden instance) | Captured 2026-10-06 from the instance's customer update payloads (Default update sets), grouped by feature. See `docs/CHANGELOG.md` |
| UPDATE-018 | opmsalescrm1 | Captured 2026-10-07: UI16 banner image properties plus their image attachments, serialised by hand |
| UPDATE-019 | opmsalescrm1 | Captured 2026-10-07: OOB Standard Price Adjustment v2 / Price List Defaulting v2 matrices set to draft, serialised from live values |
| UPDATE-022 | opmsalescrm1 | Captured 2026-10-08: gaps from the audit of the golden demo change list (Business Portal logo, CRO→CFO approval delegation, SOW homepage rules off, sidebar-off default preference, branding/date/locale/currency/matrix-edit properties) |
| UPDATE-020 | opmsalescrm1 | Captured 2026-10-07: approver groups/users on the Advanced Approval rules, serialised from live values |
| UPDATE-023 | opmsalescrm1 | Captured 2026-10-08: 8 role-containment links (sys_user_role_contains) missing on stage, copied with the same sys_ids |

UPDATE-004 … 017 each contain **one retrieved update set per application scope**, named
`UPDATE-NNN-slug [Scope]`, because ServiceNow update sets are scope-bound. After importing a file,
you will see several retrieved update sets. Preview and commit the `[Global]` one first (or the
file's only one), then the scoped ones.

## Recommended commit order

Prerequisites: plugins installed. Users, groups, product offerings and price lists must be seeded
with opmsalescrm1's sys_ids before 006, 010, 011, 012 and 020, because those records reference them.

`004 → 005 → 013 → 006 → 007 → 008 → 009 → 010 → 020 → 011 → 012 → 014 → 015 → 016 → 017 → 018 → 019 → 022 → 023`

018 (UI16 banner image) has no dependencies and can be committed at any point. 019 (pricing matrix
states) must come after 011: it drafts the OOB v2 matrices so 011's custom versions are the live ones. 020 (approval approvers) goes right after 010, whose rules it references.
Session timeout and outbound email are set after commit by `scripts/post-deploy/01-system-properties.js`, not by an Update Set.

013 goes early because the Sync Process Record BRs in 006/007/012 call `BOProcessChainUtil`.

## Removed sets

UPDATE-001 (stage-only $500K approval test) and UPDATE-002 (stage copy of the Solana quote template)
were removed on 2026-10-07. UPDATE-010 and UPDATE-009 are canonical for approvals and quote
templates. UPDATE-003 targets the same `sp_portal` record as on opmsalescrm1, so it is not
duplicated in 004–017.

UPDATE-021-persona-landing-dashboards was removed on 2026-10-08. Its 3 `par_dashboard` parents are in
UPDATE-016 (same values), so the number 021 is left unused. opmsalescrmstage still shows UPDATE-021 as the
old name of UPDATE-023 (role-containment links).

## Review before committing

- **UPDATE-017** holds other @snc personnel's direct changes. Its 16 `snc_external` role grants on
  UI-framework query ACLs are a known workaround for an existing instance defect (RFQ playbook).
  They are kept as-is by decision (2026-10-07).
- **UPDATE-015** and **UPDATE-017** modify OOB script includes (`SalesForecastHeaderItemUtil`,
  `CustomerPortalCatalogAccessUtil`). Expect skip/collision prompts in Preview if plugin versions differ.
- **UPDATE-019** overwrites 2 OOB Rule Matrix records (full field values from opmsalescrm1). Its
  `rule`, `matrix_type`, context-variable and validation references are OOB sys_ids, confirmed present on a
  fresh instance (opmsalescrmstage). If a newer plugin version adds fields or versions, check Preview.
- **UPDATE-020** references SCRM groups (CFO, Deal Desk, Pricing Manager, Shipping Approver, Delinquent
  Account Approver) and users (Marcus Patel, Derek Sanchez, Cameron Patel) by opmsalescrm1 sys_id. Seed them
  first, or the approvers import blank. Two orphan Approval Group rows on opmsalescrm1 with no rule were left out.
- **UPDATE-022** goes last: its Business Portal record replaces UPDATE-003's (stage-built, coral logo)
  with opmsalescrm1's Solana logo. Its delegation records reference Derek Sanchez and Rebecca Smith by
  opmsalescrm1 sys_id, so seed users first. `sys_granular_delegate` and `sys_m2m_delegate_rule` are not
  update-set tracked; those 2 payloads were serialised from live values.
- 35 records in **UPDATE-007/011/013** come from tables that ServiceNow does not update-set track:
  L2C mappings, CPQ rule matrices, and the Business Object group + members. Their payloads were
  serialised from live field values. Check them in Preview.

Full inventory, method and risks:
`~/Downloads/servicenow-mcp-main v2/docs/instances/opmsalescrm1/06-delta-2026-10-06.md`.
