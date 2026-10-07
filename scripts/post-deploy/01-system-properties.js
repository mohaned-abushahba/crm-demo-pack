// Post-deploy: system properties that can't be shipped reliably in an Update Set.
//
//   glide.ui.session_timeout = 1440   Session timeout at the 1-day max. The record is
//                                     created per instance at provisioning, so its sys_id
//                                     differs everywhere (opmsalescrm1 f95ede4e…bf98,
//                                     opmsalescrmstage f95a3e7d…5a43). An Update Set
//                                     matches by sys_id and would insert a duplicate.
//   glide.email.smtp.active = true    Outbound email on. Private property (is_private=true),
//                                     which Update Set import can skip.
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
