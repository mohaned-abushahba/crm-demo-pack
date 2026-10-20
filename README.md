# CRM Demo Pack

Deployable, trackable packaging of the ServiceNow CRM demo environment — **Sales CRM** and
**Service CRM** — so an SC can push a button against a blank demo instance and get the whole
environment, fully configured.

The pack started as the Sales CRM golden demo and is now being extended with Service CRM
(cases, install base, install base items, and related objects). Service CRM builds on top of the
Sales CRM data (same accounts, contacts, products and sold products), so the two ship as one pack
and deploy in one pass.

Sales CRM was built against **opmsalescrmstage** (ServiceNow Forge MCP). See companion repo
[sales-crm-e2e-tests](https://github.com/mohaned-abushahba/sales-crm-e2e-tests) for the
Playwright validation suite that proves the deployed result actually works.

## What a demo pack is

Every domain in the pack is delivered the same three ways:

| Layer | What it holds | Where |
|---|---|---|
| **Plugins** | Plugins / store apps that must be active before anything else | `installer/manifest.json` |
| **Update Sets** | Configuration and customizations (flows, business rules, roles, ACLs, schema, UI, properties) | `update-sets/` |
| **Seed data** | Demo records (accounts, contacts, catalog, price lists, personas, quotes, orders, cases, install base, …) | `seed/` |

Deploy order is always plugins → Update Sets → seed data → post-deploy config.

## Repo structure

```
installer/     Plugin installer — manifest of plugins/store apps + retrying install engine and status API
update-sets/   Exported Update Set XML — config changes (flows, BRs, roles, ACLs, schema)
seed/          Demo data — JSON fixtures + idempotent loader scripts, built into a loadable bundle
  data/        One JSON fixture per table, numbered in load (dependency) order
  tools/       Extract / bundle / cross-check helpers
skills/        golden-demo-seed-loader — Claude skill that loads the seed bundle onto an instance
scripts/       Deploy automation — applies update-sets then seed/ to a target instance
  post-deploy/ Config set by name after Update Sets commit (per-instance sys_ids, private properties)
docs/          CHANGELOG and OPEN-ITEMS
```

## Domains in the pack

| Domain | Status | Notes |
|---|---|---|
| Sales CRM | Deployed and validated | Opportunity/lead/quote/order flows, CPQ, forecasting, PRM, territories, approvals, persona landing pages |
| Service CRM | In progress | Cases, install base, install base items, and related objects. Seeded by a teammate; plugins and Update Sets land in the same folders as Sales |

Sales CRM already seeds `sn_install_base_sold_product` (`seed/data/955-…`), which is the natural
bridge into the Service install base data.

## Adding a new domain or feature

Keep the layout above — don't fork a parallel structure per domain.

- **Plugins:** add entries to `installer/manifest.json` with a new `group` (e.g. `"Service CRM - Required"`).
  Array order is install order.
- **Update Sets:** continue the single shared `UPDATE-NNN` sequence (next free number). Say which
  domain a set belongs to in its `docs/CHANGELOG.md` entry and in the table in
  `update-sets/README.md`. If a set depends on another, record it in the commit-order list there.
- **Seed data:** number fixtures/scripts by dependency order, not by domain. Service records that
  reference accounts, contacts or sold products must load after those (higher number). Resolve
  references by business key, not hardcoded sys_ids.
- **Changelog:** one entry per Update Set or seed addition, tagged with the domain.

## How changes get captured

**Config changes (flows, business rules, roles, ACLs, schema, UI policies, etc.)**
Captured as ServiceNow Update Sets, exported to XML, committed under `update-sets/`.

- Always make a named Update Set **current** before any manual UI change or MCP/`execute`
  config change. Never work in "Default."
- One Update Set per logical feature or fix session. Name it descriptively
  (e.g. `UPDATE-003-fix-order-decomposition-rules`).
- Export immediately after the session (Retrieve XML, or System Update Sets > Export).
- Commit the XML to `update-sets/` with an incrementing numeric prefix so deploy order
  is unambiguous. Log it in `docs/CHANGELOG.md`.

**Demo data (accounts, contacts, catalog, price lists, personas, quotes, orders, cases, install base)**
NOT captured via Update Set. Captured as idempotent seed fixtures and scripts under `seed/`,
written for the `execute` MCP tool (`SN.TableRecord` / `SN.TableQuery`). See `seed/README.md`.

**Manual changes made directly in the UI**
Same rule as above — set the target Update Set current first. If you forget and the
change lands in "Default," treat it as uncaptured: redo it deliberately with the
right Update Set active rather than trying to extract it from Default afterward
(Default fills up with unrelated plugin/platform noise and isn't worth mining).

## Deploying to a fresh instance

```
scripts/deploy.sh <target-instance-mcp-name>
```

Lists the plugins, Update Sets (in numeric order), seed scripts and post-deploy scripts to apply.
See `scripts/deploy.sh` for current status — update-set import currently requires manual steps
in Studio/Update Set UI; data seeding is scripted end-to-end via MCP.

## Working in this repo

Several people now contribute. Pull before starting, keep commits small and scoped to one
Update Set or seed addition, and take the next `UPDATE-NNN` number only after pulling so two
people don't claim the same one.
