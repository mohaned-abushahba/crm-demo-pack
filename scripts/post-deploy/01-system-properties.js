// Post-deploy: system properties that can't be shipped reliably in an Update Set.
//
//   glide.ui.session_timeout = 1440   Session timeout at the 1-day max. The record is
//                                     created per instance at provisioning, so its sys_id
//                                     differs everywhere (opmsalescrm1 f95ede4e…bf98,
//                                     opmsalescrmstage f95a3e7d…5a43). An Update Set
//                                     matches by sys_id and would insert a duplicate.
//   glide.email.smtp.active = true    Outbound email on. Private property (is_private=true),
//                                     which Update Set import can skip.
//   sn_prd_pm.show_product_visuals_on_catalog_ui = true
//                                     Show product visuals on the catalog UI. Plugin-owned
//                                     (Product Catalog Management Core); setting it by name
//                                     avoids a scoped Update Set for one property.
//   glide.email.username = Solana Conglomerate
//                                     Outgoing mail display name (was "IT Service Desk").
//                                     Private property. Note: opmsalescrm1's live value had
//                                     reverted to "IT Service Desk" at the 2026-10-08 audit,
//                                     although its update payload records this value.
//   glide.login.home = /now/cwf/agent/home
//                                     Land users in the CRM Workspace after login.
//   sn_opty_mgmt.glide.ui.landing_page_default_dashboard = 7fc64331…bf1a
//                                     Default landing dashboard (Sales Agent Golden Landing
//                                     Page, shipped in UPDATE-021).
//   sn_sales_territory.default_sales_model = d7edc96b…a9cb
//                                     Sales Territory Model (UPDATE-005), used by the OOB
//                                     account territory assignment.
//
// Matches each property by name, so it works whatever the sys_id is on the target.
// Idempotent: only writes when the value differs; creates the property if missing.
//
// Run with the `execute` MCP tool against the target instance, after the Update Sets
// are committed. Requires admin on the executing user.

const PROPERTIES = [
  { name: "glide.ui.session_timeout", value: "1440", type: "integer",
    description: "Sets the session timeout, in minutes. Values exceeding 1440 minutes will be treated as one day." },
  { name: "glide.email.smtp.active", value: "true", type: "boolean",
    description: "Email sending enabled" },
  { name: "sn_prd_pm.show_product_visuals_on_catalog_ui", value: "true", type: "boolean",
    description: "This flag, when true, loades the product visuals on the catalog UI. If an product do not have any visuals, a placeholder text is shown. If the flag is false, the visuals will not be loaded." },
  { name: "glide.email.username", value: "Solana Conglomerate", type: "string",
    description: "Outgoing mail display name (e.g. \"Help Desk\")" },
  { name: "glide.login.home", value: "/now/cwf/agent/home", type: "string",
    description: "Default page to open after login" },
  { name: "sn_opty_mgmt.glide.ui.landing_page_default_dashboard", value: "7fc643312bc74f104deaf02ac891bf1a", type: "string",
    description: "Default landing page dashboard" },
  { name: "sn_sales_territory.default_sales_model", value: "d7edc96bb7e26210794ef561ae11a9cb", type: "string",
    description: "Default sales territory model" },
];

async function run() {
  const results = [];
  for (const p of PROPERTIES) {
    const existing = await SN.TableQuery("sys_properties")
      .where("name=" + p.name)
      .select("sys_id,name,value")
      .displayValue("false")
      .fetchOne();

    if (!existing) {
      const created = await SN.TableRecord("sys_properties").insert({
        name: p.name, value: p.value, type: p.type, description: p.description,
      });
      results.push({ name: p.name, action: "created", value: p.value, sys_id: created.sys_id });
    } else if (existing.value !== p.value) {
      await SN.TableRecord("sys_properties").update(existing.sys_id, { value: p.value });
      results.push({ name: p.name, action: "updated", from: existing.value, to: p.value, sys_id: existing.sys_id });
    } else {
      results.push({ name: p.name, action: "unchanged", value: p.value, sys_id: existing.sys_id });
    }
  }
  return results;
}

return await run();
