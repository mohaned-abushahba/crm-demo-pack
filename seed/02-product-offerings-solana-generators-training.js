// Seed: Solana Revenue Enablement Platform, Generators Monthly Trade Journal,
// In-Person Training - 5 day — product offerings copied from opmsalescrm1, plus
// their supporting catalogs, categories, family, UOM links, and (for Generators)
// a Binding Type characteristic with 3 options.
//
// Idempotent: looks up each record by its unique business key (code/name) before
// inserting, so re-running this script is safe.
//
// Run with the `execute` MCP tool against the target instance.
// Requires roles on the executing user: sn_prd_pm.product_catalog_manager,
// sn_prd_pm.product_catalog_admin (grant via sys_user_has_role if missing — see
// docs/CHANGELOG.md for the gotcha on write ACLs for sn_prd_pm_* tables).

async function getOrCreate(table, lookupQuery, fields) {
  const existing = await SN.TableQuery(table).where(lookupQuery).fetchOne();
  if (existing) return existing.sys_id;
  const created = await SN.TableRecord(table).insert(fields);
  return created.sys_id;
}

async function run() {
  const EACH_UOM = "cb2795d553020110286eddeeff7b12ff"; // "Each", pre-existing on target

  // --- Catalogs ---
  const catalogs = {
    technology: await getOrCreate("sn_prd_pm_product_offering_catalog", "code=TECH-CAT-01", {
      name: "Technology Catalog",
      code: "TECH-CAT-01",
      description: "Technology offerings which include hardware, software and others. (Industry: Technology)",
      start_date: "2026-01-01",
      status: "published",
    }),
    manufacturing: await getOrCreate("sn_prd_pm_product_offering_catalog", "code=MANUFACTUR1", {
      name: "Manufacturing Catalog",
      code: "MANUFACTUR1",
      description: "Manufacturing Catalog with power generators and other industrial equipments",
      start_date: "2026-01-01",
      status: "published",
    }),
    conglomerateTopLevel: await getOrCreate("sn_prd_pm_product_offering_catalog", "code=CONGLO1", {
      name: "Conglomerate Top-Level",
      code: "CONGLO1",
      description: "Top-level catalog, that has the main configurable products for quick demo access. ",
      start_date: "2026-09-01",
      status: "published",
      is_default: "true",
    }),
    conglomerate: await getOrCreate("sn_prd_pm_product_offering_catalog", "code=INDUSTRIAL2", {
      name: "Conglomerate Catalog",
      code: "INDUSTRIAL2",
      description: "Conglomerate Catalog",
      start_date: "2026-01-01",
      status: "published",
    }),
  };

  // --- Categories ---
  const categories = {
    topLevelSimple: await getOrCreate("sn_prd_pm_product_offering_category", "code=TOP-LEVEL 1", {
      name: "Top-level Simple Products",
      code: "TOP-LEVEL 1",
      description: "Top-level simple products for easy demo access",
      start_date: "2026-09-01",
      status: "published",
      is_leaf: "true",
    }),
    powerGenerators: await getOrCreate("sn_prd_pm_product_offering_category", "code=POWER GENE1", {
      name: "Power Generators",
      code: "POWER GENE1",
      description: "Industrial-grade power generation systems and components",
      start_date: "2026-02-20",
      status: "published",
      is_leaf: "true",
    }),
    topLevelConfigurable: await getOrCreate("sn_prd_pm_product_offering_category", "code=CONFIGURAB1", {
      name: "Top-Level Configurable Products",
      code: "CONFIGURAB1",
      description: "All top-level configurable products for easy demo access",
      start_date: "2026-09-01",
      status: "published",
      is_leaf: "true",
    }),
    revenueEnablement: await getOrCreate("sn_prd_pm_product_offering_category", "code=REV-ENABLEMENT", {
      name: "Revenue Enablement",
      code: "REV-ENABLEMENT",
      description: "To enable revenue for Enterprises",
      start_date: "2026-01-01",
      status: "published",
      is_leaf: "true",
    }),
    learningEvents: await getOrCreate("sn_prd_pm_product_offering_category", "code=EVE-LEARNING", {
      name: "Learning & Events",
      code: "EVE-LEARNING",
      description: "Includes conferences and in-person and virtual trainings",
      start_date: "2026-01-01",
      status: "published",
      is_leaf: "true",
    }),
  };

  // --- Catalog <-> Category links ---
  const catalogCategoryLinks = [
    [catalogs.technology, categories.revenueEnablement],
    [catalogs.technology, categories.learningEvents],
    [catalogs.manufacturing, categories.learningEvents],
    [catalogs.manufacturing, categories.powerGenerators],
    [catalogs.conglomerateTopLevel, categories.topLevelConfigurable],
    [catalogs.conglomerateTopLevel, categories.topLevelSimple],
  ];
  for (const [source, target] of catalogCategoryLinks) {
    await getOrCreate(
      "sn_prd_pm_catalog_category_relationship",
      `source=${source}^target=${target}`,
      { source, target, external_source: "ServiceNowImport" }
    );
  }

  // --- Product offering families ---
  const families = {
    revenueEnablement: await getOrCreate("sn_prd_pm_product_offering_family", "name=Revenue Enablement", {
      name: "Revenue Enablement",
    }),
    learningEvents: await getOrCreate("sn_prd_pm_product_offering_family", "name=Learning & Events", {
      name: "Learning & Events",
    }),
  };

  // --- Product offerings ---
  const solana = await getOrCreate("sn_prd_pm_product_offering", "code=SOL-RE01", {
    name: "Solana Revenue Enablement Platform",
    display_name: "Solana Revenue Enablement Platform",
    code: "SOL-RE01",
    description: "Solana's Root Product Offering\n\n",
    offering_type: "product",
    start_date: "2026-01-01",
    status: "published",
    sellable: "true",
    configurable: "true",
    create_contract: "true",
    enable_ramps: "false",
    copy_child_spec_chars: "true",
    allow_multiple_configurations: "false",
    periodicity: "annually",
    pricing_method: "recurring",
    contract_term: "not_applicable",
    product_offering_family: families.revenueEnablement,
    default_uom: EACH_UOM,
  });

  const generators = await getOrCreate("sn_prd_pm_product_offering", "code=GENERATORS1", {
    name: "Generators Monthly",
    display_name: "Generators Monthly Trade Journal",
    code: "GENERATORS1",
    description: "Generators Monthly magazine subscription",
    offering_type: "product",
    offering_sub_type: "subscription",
    start_date: "2026-06-01",
    status: "published",
    sellable: "true",
    configurable: "false",
    create_contract: "true",
    enable_ramps: "true",
    copy_child_spec_chars: "true",
    allow_multiple_configurations: "false",
    periodicity: "monthly",
    pricing_method: "recurring",
    contract_term: "not_applicable",
    default_uom: EACH_UOM,
  });

  const training = await getOrCreate("sn_prd_pm_product_offering", "code=TRNG-INPERSON-2609", {
    name: "In-Person Training",
    display_name: "In-Person Training - 5 day",
    code: "TRNG-INPERSON-2609",
    description: "In person training course for 5 days",
    offering_type: "product",
    start_date: "2026-01-01",
    status: "published",
    sellable: "true",
    configurable: "false",
    create_contract: "false",
    enable_ramps: "false",
    copy_child_spec_chars: "true",
    allow_multiple_configurations: "false",
    pricing_method: "one_time",
    contract_term: "not_applicable",
    product_offering_family: families.learningEvents,
    default_uom: EACH_UOM,
  });

  // --- Product offering <-> Category links ---
  const poCategoryLinks = [
    [solana, categories.revenueEnablement],
    [solana, categories.topLevelConfigurable],
    [generators, categories.powerGenerators],
    [generators, categories.topLevelSimple],
    [training, categories.learningEvents],
    [training, categories.topLevelSimple],
  ];
  for (const [product_offering, category] of poCategoryLinks) {
    await getOrCreate(
      "sn_prd_pm_product_offering_category_relationship",
      `product_offering=${product_offering}^category=${category}`,
      { product_offering, category, external_source: "ServiceNowImport" }
    );
  }

  // --- UOM links (all default to Each) ---
  for (const product_offering of [solana, generators, training]) {
    await getOrCreate(
      "sn_prd_pm_product_offering_uom",
      `product_offering=${product_offering}^unit_of_measure=${EACH_UOM}`,
      { product_offering, unit_of_measure: EACH_UOM, is_default: "true" }
    );
  }

  // --- Generators Monthly: Binding Type characteristic + options ---
  const bindingType = await getOrCreate("sn_prd_pm_characteristic", "code=BINDING_TYPE", {
    name: "Binding Type",
    code: "BINDING_TYPE",
    description: "Binding Type",
    input_type: "choice",
    choice_type: "radio",
    min: "1",
    max: "1",
  });

  const options = {};
  for (const [key, option, code] of [
    ["paperback", "Paperback", "BINDING_TYPE-PAPERBACK"],
    ["hardback", "Hardback", "BINDING_TYPE-HARDBACK"],
    ["recycledPaperback", "Recycled Paperback", "BINDING_TYPE-RECYCLED_PAPERBACK"],
  ]) {
    options[key] = await getOrCreate(
      "sn_prd_pm_characteristic_option",
      `characteristic=${bindingType}^code=${code}`,
      { characteristic: bindingType, option, code }
    );
  }

  // NOTE: on this instance, a "Validate char option for char" Business Rule
  // requires characteristic_option to be set on this row (unlike the opmsalescrm1
  // source record, which had it blank) — defaulting to Recycled Paperback.
  await getOrCreate(
    "sn_prd_pm_product_offering_characteristic",
    `product_offering=${generators}^characteristic=${bindingType}`,
    {
      product_offering: generators,
      characteristic: bindingType,
      characteristic_option: options.recycledPaperback,
      code: "GENTJ-BINDING_TYPE",
      is_mandatory: "false",
    }
  );

  return {
    catalogs,
    categories,
    families,
    productOfferings: { solana, generators, training },
    bindingType,
    options,
  };
}

return await run();
