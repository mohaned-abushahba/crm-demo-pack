# Sales CRM Golden Demo

Deployable, trackable packaging of the Sales CRM golden demo build. Goal: an SC can
push a button against a blank demo instance and get this environment, fully configured.

Built against **opmsalescrmstage** (ServiceNow Forge MCP). See companion repo
[sales-crm-e2e-tests](https://github.com/mohaned-abushahba/sales-crm-e2e-tests) for the
Playwright validation suite that proves the deployed result actually works.

## Repo structure

```
update-sets/   Exported Update Set XML — config changes (flows, BRs, roles, ACLs, schema)
seed/          Demo data seed scripts — accounts, contacts, catalog, price lists, personas
scripts/       Deploy automation — applies update-sets then seed/ to a target instance
  post-deploy/ Config set by name after Update Sets commit (per-instance sys_ids, private properties)
docs/          CHANGELOG and capture conventions
```

## How changes get captured (going forward)

**Config changes (flows, business rules, roles, ACLs, schema, UI policies, etc.)**
Captured as ServiceNow Update Sets, exported to XML, committed under `update-sets/`.

- Always make a named Update Set **current** before any manual UI change or MCP/`execute`
  config change. Never work in "Default."
- One Update Set per logical feature or fix session. Name it descriptively
  (e.g. `UPDATE-003-fix-order-decomposition-rules`).
- Export immediately after the session (Retrieve XML, or System Update Sets > Export).
- Commit the XML to `update-sets/` with an incrementing numeric prefix so deploy order
  is unambiguous. Log it in `docs/CHANGELOG.md`.

**Demo data (accounts, contacts, catalog, price lists, personas, quotes, orders)**
NOT captured via Update Set. Captured as idempotent seed scripts under `seed/`,
written for the `execute` MCP tool (`SN.TableRecord` / `SN.TableQuery`), sourced from
the demo data spreadsheet (see `seed/README.md` — to be filled in when we seed this).

**Manual changes made directly in the UI**
Same rule as above — set the target Update Set current first. If you forget and the
change lands in "Default," treat it as uncaptured: redo it deliberately with the
right Update Set active rather than trying to extract it from Default afterward
(Default fills up with unrelated plugin/platform noise and isn't worth mining).

## Deploying to a fresh instance

```
scripts/deploy.sh <target-instance-mcp-name>
```

Applies `update-sets/` in numeric order, then (once populated) seeds `seed/`.
See `scripts/deploy.sh` for current status — update-set import currently requires
manual steps in Studio/Update Set UI; data seeding is scripted end-to-end via MCP.
