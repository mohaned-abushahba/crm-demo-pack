// Seed: AMS-West 2026 Q4 sales forecasts — rollup (Taylor Morgan / AMS-West) plus
// two individual contributor forecasts (Asher Sky / California, Riley Cole /
// Oregon-Washington), mirroring opmsalescrm1's numbers.
//
// Idempotent: looks up each quota/forecast header by owner+period+territory before
// inserting, so re-running this script is safe.
//
// Run with the `execute` MCP tool against the target instance.
// Requires roles on the executing user: sn_quota_core.quota_admin (or
// sn_quota_core.quota_manager) to write sn_quota_core_sales_quota — grant via
// sys_user_has_role if missing. sn_sales_forecast_header write needs no specific role.
//
// Prereqs this script assumes already exist on the target instance (did on
// opmsalescrmstage at the time this was written — verify before relying on sys_ids):
//   - Territories: AMS-West, California, Oregon-Washington (sn_tp_territory)
//   - Users: taylor.morgan, asher.sky, riley.cole_ams_west_or_wa_tech_l5 (sys_user)
//   - Period: "2026 Q4" business_calendar_span (calendar = Quarter, 2026-10-01 to
//     2027-01-01)
//   - Forecast model: "Opportunity Revenue for Sales Territory"
// If any of these are missing on a fresh target, create them first (see
// docs/CHANGELOG.md for the full opmsalescrm1 source values and territory
// hierarchy this was copied from).

async function getOrCreate(table, lookupQuery, fields) {
  const existing = await SN.TableQuery(table).where(lookupQuery).fetchOne();
  if (existing) return existing.sys_id;
  const created = await SN.TableRecord(table).insert(fields);
  return created.sys_id;
}

async function run() {
  // --- Resolve prereqs by name (don't hardcode sys_ids — look them up) ---
  const taylorMorgan = await SN.TableQuery("sys_user").where("user_name=taylor.morgan").fetchOne();
  const asherSky = await SN.TableQuery("sys_user").where("user_name=asher.sky").fetchOne();
  const rileyCole = await SN.TableQuery("sys_user").where("user_name=riley.cole_ams_west_or_wa_tech_l5").fetchOne();

  const amsWest = await SN.TableQuery("sn_tp_territory").where("name=AMS-West").fetchOne();
  const california = await SN.TableQuery("sn_tp_territory").where("name=California").fetchOne();
  const oregonWashington = await SN.TableQuery("sn_tp_territory").where("name=Oregon-Washington").fetchOne();

  const period = await SN.TableQuery("business_calendar_span")
    .where("start=2026-10-01 00:00:00^end=2027-01-01 00:00:00")
    .fetchOne();
  const forecastModel = await SN.TableQuery("sn_sales_forecast_model")
    .where("name=Opportunity Revenue for Sales Territory")
    .fetchOne();

  if (!taylorMorgan || !asherSky || !rileyCole || !amsWest || !california || !oregonWashington || !period || !forecastModel) {
    throw new Error(
      "Missing a prerequisite record (user/territory/period/forecast model). " +
      "Create these first — see docs/CHANGELOG.md for opmsalescrm1 source values."
    );
  }

  // --- Quotas (2026 Q4, USD) ---
  const rollupQuota = await getOrCreate(
    "sn_quota_core_sales_quota",
    `owner=${taylorMorgan.sys_id}^period=${period.sys_id}^territory=${amsWest.sys_id}`,
    {
      owner: taylorMorgan.sys_id,
      period: period.sys_id,
      forecast_model: forecastModel.sys_id,
      currency_value: "USD;2500000.00",
      type: "rollup",
      territory: amsWest.sys_id,
    }
  );
  const asherQuota = await getOrCreate(
    "sn_quota_core_sales_quota",
    `owner=${asherSky.sys_id}^period=${period.sys_id}^territory=${california.sys_id}`,
    {
      owner: asherSky.sys_id,
      period: period.sys_id,
      forecast_model: forecastModel.sys_id,
      currency_value: "USD;1500000.00",
      type: "individual",
      territory: california.sys_id,
    }
  );
  const rileyQuota = await getOrCreate(
    "sn_quota_core_sales_quota",
    `owner=${rileyCole.sys_id}^period=${period.sys_id}^territory=${oregonWashington.sys_id}`,
    {
      owner: rileyCole.sys_id,
      period: period.sys_id,
      forecast_model: forecastModel.sys_id,
      currency_value: "USD;1000000.00",
      type: "individual",
      territory: oregonWashington.sys_id,
    }
  );

  // --- Forecast headers ---
  const rollupForecast = await getOrCreate(
    "sn_sales_forecast_header",
    `owner=${taylorMorgan.sys_id}^period=${period.sys_id}^territory=${amsWest.sys_id}`,
    {
      name: "AMS-West (Taylor Morgan)",
      owner: taylorMorgan.sys_id,
      period: period.sys_id,
      forecast_model: forecastModel.sys_id,
      item_type: "rollup",
      territory: amsWest.sys_id,
      quota: rollupQuota,
      currency: "USD",
      forecast_adjustable: "true",
      submission_required: "true",
    }
  );
  const asherForecast = await getOrCreate(
    "sn_sales_forecast_header",
    `owner=${asherSky.sys_id}^period=${period.sys_id}^territory=${california.sys_id}`,
    {
      name: "Asher Sky (California)",
      owner: asherSky.sys_id,
      period: period.sys_id,
      forecast_model: forecastModel.sys_id,
      item_type: "individual",
      territory: california.sys_id,
      quota: asherQuota,
      currency: "USD",
      forecast_adjustable: "true",
      submission_required: "false",
    }
  );
  const rileyForecast = await getOrCreate(
    "sn_sales_forecast_header",
    `owner=${rileyCole.sys_id}^period=${period.sys_id}^territory=${oregonWashington.sys_id}`,
    {
      name: "Riley Cole (Oregon-Washington)",
      owner: rileyCole.sys_id,
      period: period.sys_id,
      forecast_model: forecastModel.sys_id,
      item_type: "individual",
      territory: oregonWashington.sys_id,
      quota: rileyQuota,
      currency: "USD",
      forecast_adjustable: "true",
      submission_required: "false",
    }
  );

  return {
    quotas: { rollupQuota, asherQuota, rileyQuota },
    forecasts: { rollupForecast, asherForecast, rileyForecast },
  };
}

return await run();
