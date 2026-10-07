# Seed scripts

Demo data for the golden demo — accounts, contacts, catalog, price lists, personas,
quotes/orders — scripted here as idempotent `execute`-tool scripts.

Each script uses `SN.TableQuery(...).fetchOne()` to check for an existing record
(by a unique business key — code/name) before inserting, so re-running the seed
doesn't duplicate data.

Run with the `execute` MCP tool against the target instance.

## Files

- `02-product-offerings-solana-generators-training.js` — creates the "Solana Revenue
  Enablement Platform", "Generators Monthly Trade Journal", and "In-Person Training -
  5 day" product offerings (copied from opmsalescrm1), plus their catalogs,
  categories, catalog↔category and product↔category links, a product offering
  family each, UOM links (all default to "Each"), and (for Generators) a "Binding
  Type" characteristic with 3 options.

  **Prereqs on target instance:** the executing user needs
  `sn_prd_pm.product_catalog_manager` and `sn_prd_pm.product_catalog_admin` roles to
  write `sn_prd_pm_*` tables — grant via `sys_user_has_role` if missing.

  **Why this is a seed script, not an Update Set:** `sn_prd_pm_*` table writes on
  opmsalescrmstage did not engage update-set tracking via any write path tested
  (Table API create/update, nor server-side GlideRecord via the `execute` tool) —
  verified by checking `sys_update_xml` for the target Update Set and for "Default"
  after each write; the real records never appeared in either. Rather than chase
  that further, product/catalog data is captured as a seed script per our
  convention (config → Update Sets, demo data → seed scripts) — see
  `docs/CHANGELOG.md` for the full gotcha writeup.

  **Other gotchas hit while building this (see CHANGELOG for detail):** the
  `sn_prd_pm_product_offering_catalog` and `sn_prd_pm_product_offering_category`
  tables have a broken auto-code-generation Business Rule that throws when `name`
  isn't already set at BR execution time, silently discarding ALL fields on that
  create — the Table API's "success" response did not reflect this, so each create
  was verified by re-reading the record. Always set `code` explicitly (the seed
  script does this) to avoid triggering the buggy auto-gen path.

- `03-ams-west-forecasts.js` — creates 2026 Q4 sales forecasts for the AMS-West
  territory: a rollup forecast for Taylor Morgan ($2.5M) and individual forecasts
  for Asher Sky/California ($1.5M) and Riley Cole/Oregon-Washington ($1M), copied
  from opmsalescrm1. Resolves all prerequisite records (territories, users,
  period, forecast model) by name/query rather than hardcoded sys_ids, and throws
  if any are missing rather than silently creating wrong-shaped data — see
  docs/CHANGELOG.md for the full opmsalescrm1 source values and territory
  hierarchy if those prereqs need to be built from scratch on a fresh instance.

  **Prereqs on target instance:** the executing user needs
  `sn_quota_core.quota_admin` (or `sn_quota_core.quota_manager`) to write
  `sn_quota_core_sales_quota` — grant via `sys_user_has_role` if missing.

## Planned (not yet written)

```
seed/
  01-accounts.js
  04-catalog-pricelist.js
  05-quotes-orders.js
```
