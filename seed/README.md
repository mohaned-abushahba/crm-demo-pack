# Seed scripts (placeholder)

Demo data for the golden demo — accounts, contacts, catalog, price lists, personas,
quotes/orders — will be scripted here as idempotent `execute`-tool scripts, sourced
from the existing demo-data spreadsheet.

Not populated yet. Current work on opmsalescrmstage is config/flow validation only;
data seeding is deferred until the config baseline is solid.

Planned shape, one file per entity group, each safe to re-run:

```
seed/
  01-accounts.js
  02-contacts-personas.js
  03-catalog-pricelist.js
  04-quotes-orders.js
```

Each script should use `SN.TableRecord(table).get(...)` to check for an existing
record (e.g. by name/external id) before inserting, so re-running the seed doesn't
duplicate data.
