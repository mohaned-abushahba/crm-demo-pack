// Seed: forecast hierarchy for 2026 Q3/Q4 — quotas, forecast headers and the open opportunities
// that drive them — copied from opmsalescrm1 (2026-10-13). Fixture: seed/data/900-forecast-2026q4.json
// (paste its content into FIXTURE below; the execute sandbox has no file access).
//
// Why this exists: the Sales Forecasting rollup E2E spec looks up headers by name for the quarter
// that contains today (e.g. "Riley Cole_AMS_WEST_OR_WA_TECH_L5", "AMS (Avery Chen_AMS_TECH_L3)") and
// derives expected totals from the live opportunities. The platform only *calculates* items for
// headers that already exist; it never creates the headers, so they have to be seeded.
//
// What it does, in order (all idempotent — each record is looked up by sys_id first):
//   1. Quotas   — period resolved by span name ("2026 Q4"); periods are per-instance sys_ids.
//   2. Headers  — one per territory/owner in the hierarchy, same sys_ids as opmsalescrm1.
//   3. Opportunities — the open deals that close in the quarter, assigned to the same reps.
//   4. Calls sn_sales_forecast.SalesForecastAsynchronousCalculation to generate the items.
//      Items fill in asynchronously; wait about two minutes before reading totals.
//
// Prereqs on the target: users, territories (same sys_ids as opmsalescrm1 — loaded by the master data
// seed), accounts, the forecast model, and business calendar spans "2026 Q3"/"2026 Q4". The target's
// calendar had no 2027 spans, so 2027 quotas are NOT seeded. Run as an admin that holds
// sn_quota_core.quota_admin (quotas) — grant it first if missing.
//
// Do not run seed/03-ams-west-forecasts.js on the same instance: it creates headers on the
// "(old stage)" territories and is superseded by this script.

const FIXTURE = /* paste seed/data/900-forecast-2026q4.json here */ null;

async function spanId(name) {
  const span = await SN.TableQuery("business_calendar_span")
    .where("span_name.name=" + name + "^calendar.name=Quarter")
    .select("sys_id")
    .displayValue("false")
    .fetchOne();
  if (!span) throw new Error("Business calendar span not found: " + name);
  return span.sys_id;
}

async function ensure(table, sysId, fields) {
  const existing = await SN.TableQuery(table).where("sys_id=" + sysId).select("sys_id").fetchOne();
  if (existing) return "exists";
  await SN.TableRecord(table).insert(Object.assign({ sys_id: sysId }, fields));
  return "created";
}

async function run() {
  if (!FIXTURE) throw new Error("Paste seed/data/900-forecast-2026q4.json into FIXTURE first.");
  const model = FIXTURE.forecast_model;
  const periods = {};
  const out = { quotas: {}, headers: {}, opportunities: {} };
  const tally = (bucket, r) => { bucket[r] = (bucket[r] || 0) + 1; };

  for (const q of FIXTURE.quotas) {
    periods[q.period] = periods[q.period] || (await spanId(q.period));
    tally(out.quotas, await ensure("sn_quota_core_sales_quota", q.sys_id, {
      owner: q.owner, territory: q.territory, period: periods[q.period], forecast_model: model,
      currency_value: "USD;" + q.amount + ".00", type: q.type, active: "true",
    }));
  }

  periods["2026 Q4"] = periods["2026 Q4"] || (await spanId("2026 Q4"));
  for (const h of FIXTURE.headers) {
    const fields = {
      owner: h.owner, item_type: h.item_type, territory: h.territory, quota: h.quota,
      submission_required: h.submission_required, period: periods["2026 Q4"],
      forecast_model: model, currency: "USD", forecast_adjustable: "true",
    };
    if (h.name) fields.name = h.name;
    tally(out.headers, await ensure("sn_sales_forecast_header", h.sys_id, fields));
  }

  for (const o of FIXTURE.opportunities) {
    const fields = {
      number: o.number, short_description: o.short_description, amount: String(o.amount),
      estimated_closed_date: o.estimated_closed_date, probability: String(o.probability),
      forecast_category: o.forecast_category, sales_cycle_type: o.sales_cycle_type, stage: o.stage,
    };
    if (o.account) fields.account = o.account;
    if (o.assigned_to) fields.assigned_to = o.assigned_to;
    if (o.territory) fields.territory = o.territory;
    tally(out.opportunities, await ensure("sn_opty_mgmt_core_opportunity", o.sys_id, fields));
  }

  // Generate the forecast items. Scoped API, hence the namespace.
  new sn_sales_forecast.SalesForecastAsynchronousCalculation().submitForecastCalculationRequest(model);
  out.calculation = "submitted — items appear within a couple of minutes";
  return out;
}

return await run();
