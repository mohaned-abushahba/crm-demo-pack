---
name: golden-demo-seed-loader
description: Load the Sales CRM golden demo master data (users, groups, accounts, contacts, territories, PRM, product catalog, price lists, cost books) onto a ServiceNow instance from a golden-demo-seed.json bundle, keeping the source instance's sys_ids. Use when given golden-demo-seed.json, a file whose "format" is "golden-demo-seed/1", or asked to seed / load / deploy golden demo data onto an instance.
---

# Golden demo seed loader

The bundle is a snapshot of demo master data from the golden instance
(opmsalescrm1). Your job is to get every record onto the target instance with
**the same sys_id**, because Update Sets and scripts reference these records
by sys_id.

## Rule 1: never read the records

The bundle holds ~2,600 records (~2.2 MB). Do not open, page through, or
summarise the `records` arrays, and never recreate records one by one with
create/update tools. You will run out of context and silently miss records.

Instead, run `scripts/loader.js` on the instance. It parses the file
server-side and does everything below. You only need the header:
the first ~10 lines of the file give `format`, `source`, `record_count`,
`table_count`; `prerequisites` and each table's header line give the rest.

## Bundle format (`golden-demo-seed/1`)

```
{
  "format": "golden-demo-seed/1",
  "source": "opmsalescrm1",
  "record_count": 2616, "table_count": 47,
  "prerequisites": [ { "table", "sys_id", "label" } ],   // must already exist on target
  "tables": [                                             // in load order
    { "table": "sys_user_group",
      "key": ["name"],             // business key, used to detect a clash
      "on_conflict": "fail",       // or "adopt"
      "insert_as": {},             // temporary values used on insert
      "references": { "manager": "sys_user" },
      "count": 32,
      "records": [ { "sys_id": "...", "name": "...", ... } ] }
  ],
  "expected_user_roles": {                                // for the post-load role check
    "<sys_user sys_id>": { "user_name": "...", "roles": ["role name", ...] } }
}
```

- Values are **raw** (sys_ids and choice values, not display values).
- `sys_class_name` on a record means insert into that child table.
- `on_conflict`: a record with the same `key` but a different sys_id already
  exists on the target. `fail` stops the load; `adopt` keeps the target's
  record and points references at it (used for join rows such as group
  memberships that platform automation may already have created).
- `insert_as`: e.g. price lists insert as `draft` because price-list lines can
  only be added to a draft list; catalogs/specs/offerings insert as `draft`.
  The real values are applied after every table is loaded.
- Passwords are **not** in the bundle. They come in a separate
  `passwords.json` (`{ "<sys_id>": { "user_name", "password" } }`). Treat it
  as a secret: never print, log, or commit its contents.

## Procedure

1. **Confirm the target.** Ask which instance to load into and confirm it is a
   demo instance, never production. The load writes ~2,600 records.
2. **Check the instance is ready.** The golden demo Update Sets
   (UPDATE-003 onward) and plugins must already be committed and installed.
   The loader checks this through `prerequisites`.
3. **Make the files available on the instance.** Create a Fix Script named
   `Golden demo seed loader` with the contents of `scripts/loader.js`. Attach
   `golden-demo-seed.json` (and `passwords.json`, if provided) to that Fix
   Script record. Note each attachment's `sys_attachment.sys_id`.
4. **Configure.** Set `BUNDLE_ATTACHMENT`, `PASSWORDS_ATTACHMENT` (or leave
   empty), `IMAGES_ATTACHMENT` (or leave empty), `DRY_RUN = true` and `ROLE_CHECK_ONLY = false` at the top of the
   script.
5. **Dry run.** Run the Fix Script as an admin, in the **global** scope. Read
   the JSON report from the system log (`gs.info`, source `*** Script`):
   - `missing_prerequisites`: records the target lacks. Usually a plugin not
     installed or an Update Set not committed. Stop and report them to the
     user. Do not create them yourself.
   - `conflicts`: same business key, different sys_id. Stop and report each
     one (table, key, existing record). Don't delete or rename target records
     without the user's explicit approval. If the user says the old records
     may stay (e.g. a test instance with earlier demo data), set
     `ON_CONFLICT = 'insert'`: the bundle records are then loaded alongside
     them and listed under `duplicates` instead. Never use it on a demo
     instance meant for customers.
   - `tables[]`: planned `insert` / `update` / `adopt` per table. On a fresh
     instance almost everything is `insert`; on a re-run, `update`.
6. **Load.** When the dry run shows no missing prerequisites and no conflicts,
   and the user approves, set `DRY_RUN = false` and run again.
7. **Verify and report.** In the final report every table needs
   `present_after_load == expected`, and `errors` must be empty. Report a
   per-table summary to the user, plus any `errors` verbatim (table, sys_id,
   message). If the loader stopped partway, it's safe to fix the cause and run
   it again.
   Then check `role_check`: each user's active roles compared with the source
   instance's. Report `users_checked` / `users_matching`, and each mismatch
   (user, `missing`, `extra`) verbatim. `missing` roles mean group → member
   inheritance didn't rebuild them (check the user's memberships and that
   group's `sys_group_has_role` rows). `extra` roles are usually OOTB
   defaults on the target; report them, don't remove them.
   To re-run only the check later, set `ROLE_CHECK_ONLY = true`; it writes
   nothing.
8. **Clean up.** Delete the attachments (especially `passwords.json`) from the
   Fix Script after a successful load.

## Images (Product Visuals)

Image-type fields hold a sys_attachment sys_id, and update sets and the record
fixtures don't carry the file. `seed/tools/extract_images.py` downloads each
image from the source into `seed/images/` and builds
`seed/dist/golden-demo-images.json` (`golden-demo-images/1`). Phase 4b of the
loader writes each file with `GlideSysAttachment.writeBase64` onto its record
and re-points the field at the new attachment (sys_ids differ from the
source). The report shows `images: {expected, loaded, unchanged}`; re-runs skip
fields that already have an attachment of the same size. Fields whose
attachment is missing on the source itself get a drawn image from
`seed/tools/generate_catalog_images.py` where one exists (Data Storage,
Implementation Services, Integration Gateway; flagged `generated` in
`seed/images/manifest.json`). Thumbnails missing on the source stay empty
(`still_empty`).

Run the loader as a real Fix Script in the instance UI. Run through the
Forge MCP `fix_script` action, `writeBase64` returned nothing on 2026-10-15
(the same code had worked the day before), so images were pushed with the
Attachment REST API instead.

## Known platform behaviour

- **Run as admin in global scope.** The `sn_csm_pricing_*` line tables and the
  offering↔category relationship table reject Table API inserts (cross-scope
  ACLs); server-side GlideRecord works. Catalog writes may need
  `sn_prd_pm.product_catalog_admin` and `sn_prd_pm.product_catalog_manager`.
- **Catalogs/categories need `code`.** A buggy auto-code Business Rule
  silently discards all fields if `code` is empty at insert. Every bundle
  record already carries a code; don't strip it.
- **Business Rules stay on.** Role inheritance (group → member roles,
  contained roles) is built by Business Rules, so the loader doesn't disable
  them. Direct role grants are in the bundle with `inherited=false`.
- **Re-running against a published price list:** a re-run that has to insert
  *new* price-list lines fails if the list is already published. Set that
  list back to draft, run, and the loader publishes it again at the end.
- **Duplicate codes are expected.** Offering codes `GENERATORS1` and
  `GENERATOR 1` each appear twice in the source. The loader matches by sys_id
  first, so this is fine.
- **Opportunity insert fires BRs that pre-create its own children.** Inserting
  `sn_opty_mgmt_core_opportunity` with `contact` or `assigned_to` already set
  fires OOTB Business Rules ("Populate Oppty Contact from Oppty Header",
  "Populate team member from Oppty Header") that insert a stub
  `opportunity_associated_contact` / `opportunity_team_member` row right then —
  before the loader reaches those tables' own bundle records. Both tables are
  `on_conflict: 'adopt'` for exactly this reason, and the loader re-checks the
  business key live at write time (not from the Phase 1 plan) so the bundle
  record adopts that stub instead of duplicating it. If a future table shows
  the same pattern (a parent insert that a BR reacts to by creating a child
  with a guessable key), mark it `on_conflict: 'adopt'` too — don't add a
  one-off workaround in the loader.
- **Some reference fields point at a table every instance generates on its
  own, with a different sys_id per instance for the same business entity**
  (e.g. `business_calendar_span`: every instance has its own row per fiscal
  quarter, same `calendar` + `start`/`end`, different sys_id). `on_conflict:
  'adopt'` doesn't help here — that pattern adopts by matching a business key
  against values the bundle itself carries, but this referenced table is
  never in the bundle to match against. Mark the field `resolve_by` instead:
  `{"field": {"table": "...", "match": ["field1", "field2"]}}`. Extraction
  captures the referenced row's `match` field values into `_resolve.<field>`
  on each bundle record; the loader looks those up against the TARGET
  instance in a new Phase 0.5, before its Phase 1 plan, and caches the result
  into the same `idMap` every other phase already reads through `mapRef()` —
  so nothing else needs to special-case it. See `sn_quota_core_sales_quota`'s
  `period` field (docs/CHANGELOG.md, "sales quotas for Q3 2026 - Q4 2027") for
  the table this was built for. If a future reference field shows the same
  shape (a platform/system table the instance maintains for itself), use
  `resolve_by` rather than inventing another one-off.

## Don'ts

- Don't edit the bundle or "fix" values in it. It's generated from the golden
  instance; changes belong upstream (seed/overrides.json in the
  crm-demo-pack repo).
- Don't add records that aren't in the bundle, and don't load it into
  opmsalescrm1 (the source).
- Don't use names of real companies in demo data. If one appears in an error
  or a prerequisite label, tell the user.
