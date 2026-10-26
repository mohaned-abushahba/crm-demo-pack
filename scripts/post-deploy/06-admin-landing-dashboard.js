// Post-deploy: the admin user lands on the Sales Manager Golden Landing Page.
//
// The CRM Workspace home tab (Sales Manager screen, macroponent a2d64a6c...) opens the
// user's most recently viewed dashboard from their `com.snc.par.dashboards.ui.preferences`
// "recent" list, and only falls back to the macroponent's defaultDashboard (Sales Manager
// Golden Landing Page 16520a20...bf19) when that list is empty. On opmsalescrm1 admin had
// viewed the SDR dashboard last and landed there; opmsalescrmstage landed on Sales Manager.
// Also sets glide.next_experience.continue_landing_page=false for admin, as for the other
// demo personas and as on opmsalescrmstage.
//
// sys_user_preference is not Update Set tracked, and the platform re-creates the "recent" row
// with a new sys_id, so both rows are upserted by user + name. Found 2026-10-26.
//
// Idempotent: does nothing when the Manager dashboard is already first. Existing history in
// the recent list is kept, only the Manager entry is moved to the front.
// Run with the `execute` MCP tool against the target instance, after the Update Sets.

const ADMIN = "6816f79cc0a8016401c5a33be04be441"; // System Administrator, same sys_id on every instance
const MANAGER_DASHBOARD = "16520a202bd3c3504deaf02ac891bf19";
const RECENT_PREF = "com.snc.par.dashboards.ui.preferences";
const CONTINUE_PREF = "glide.next_experience.continue_landing_page";

async function upsertPref(name, value) {
  const row = await SN.TableQuery("sys_user_preference")
    .where("user=" + ADMIN + "^name=" + name)
    .select("sys_id,value")
    .displayValue("false")
    .fetchOne();
  if (!row) {
    const r = await SN.TableRecord("sys_user_preference").insert({ user: ADMIN, name: name, type: "string", value: value });
    return { action: "inserted", sys_id: r.sys_id };
  }
  if (row.value === value) return { action: "unchanged", sys_id: row.sys_id };
  await SN.TableRecord("sys_user_preference").update(row.sys_id, { value: value });
  return { action: "updated", sys_id: row.sys_id };
}

async function run() {
  const cont = await upsertPref(CONTINUE_PREF, "false");

  const row = await SN.TableQuery("sys_user_preference")
    .where("user=" + ADMIN + "^name=" + RECENT_PREF)
    .select("sys_id,value")
    .displayValue("false")
    .fetchOne();

  let prefs = { filters: {}, recent: "[]", bookmarkedDashboards: [] };
  if (row && row.value) {
    try { prefs = JSON.parse(row.value); } catch (e) { /* unreadable value: rebuild below */ }
  }
  let recent = [];
  try { recent = JSON.parse(prefs.recent || "[]"); } catch (e) { recent = []; }
  if (recent.length && recent[0].sys_id === MANAGER_DASHBOARD) return { continue_landing_page: cont, recent: { action: "unchanged" } };

  recent = recent.filter(function (r) { return r.sys_id !== MANAGER_DASHBOARD; });
  recent.unshift({ sys_id: MANAGER_DASHBOARD, viewed: new Date().toISOString().slice(0, 19).replace("T", " ") });
  prefs.recent = JSON.stringify(recent);

  return { continue_landing_page: cont, recent: await upsertPref(RECENT_PREF, JSON.stringify(prefs)) };
}

return await run();
