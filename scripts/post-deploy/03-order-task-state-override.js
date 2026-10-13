// Post-deploy: restore the Order Task "state" dictionary override that opmsalescrm1 has.
//
// sys_dictionary_override 116c10be5b8420102dff5e92dc81c7cb (table sn_ind_tmt_orm_order_task,
// base table task, element state) carries the task state model:
//   close_states=5;6, default_close_state=5, tmt_task_default_resolved_state=4,
//   tmt_task_default_canceled_state=6, default_work_state=2, ...
//
// Without it, TMTTaskStateUtil.getDefaultCloseState() falls back to the base task value (3), so
// the Order Task "Close" button puts the task in "Awaiting information" (3) instead of
// "Closed complete" (5). Tasks never close, the order never reaches Approve, and Order
// Completion / Task Fulfillment stall. Found 2026-10-13 on opmsalescrmstage.
//
// This record is Order Management plugin baseline on opmsalescrm1 (no customer update, last
// touched 2023), so it is not in any Update Set — it is missing on stage because of the plugin
// install, not because of a demo change.
//
// Idempotent: does nothing if an override for that table/element already exists.
// Note: created through the Table API the record lands in the Global scope (the scope field is
// not writable that way); that has no effect on how the attributes are read.
// Run with the `execute` MCP tool against the target instance, after the Update Sets.

const SYS_ID = "116c10be5b8420102dff5e92dc81c7cb";
const ATTRIBUTES =
  "close_states=5;6,tmt_task_default_canceled_state=6,default_close_state=5," +
  "tmt_task_default_resolved_state=4,default_work_state=2,default_open_state=1," +
  "default_pending_state=0,pending_states=0;3;7;8,open_states=1,work_in_progress_states=2," +
  "supported_states_for_wo=1;2;3;7;8";

async function run() {
  const existing = await SN.TableQuery("sys_dictionary_override")
    .where("name=sn_ind_tmt_orm_order_task^element=state")
    .select("sys_id,attributes")
    .displayValue("false")
    .fetchOne();

  if (existing) {
    if (existing.attributes === ATTRIBUTES) return { action: "unchanged", sys_id: existing.sys_id };
    await SN.TableRecord("sys_dictionary_override").update(existing.sys_id, { attributes: ATTRIBUTES });
    return { action: "updated", sys_id: existing.sys_id, from: existing.attributes };
  }

  const created = await SN.TableRecord("sys_dictionary_override").insert({
    sys_id: SYS_ID,
    name: "sn_ind_tmt_orm_order_task",
    base_table: "task",
    element: "state",
    attributes_override: "true",
    default_value_override: "true",
    default_value: "0",
    attributes: ATTRIBUTES,
  });
  return { action: "created", sys_id: created.sys_id };
}

return await run();
