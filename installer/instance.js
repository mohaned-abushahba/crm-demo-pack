// Instance client: the only module that talks to a ServiceNow instance.
//
// Contract used by engine.js:
//   verify(plugin)        -> { installed: boolean, version?: string }
//   startInstall(plugin)  -> { id: string }                 (handle for getProgress)
//   getProgress(handle)   -> { state: 'running'|'succeeded'|'failed', percent?: number, message?: string }
//
// verify() is implemented (Table API reads). startInstall()/getProgress() are PLACEHOLDERS
// until the internal plugin-install REST service is identified (docs/OPEN-ITEMS.md).
// Use a `mock: true` instance (see instances.example.json) to exercise the engine meanwhile.

class NotImplementedError extends Error {}

function createClient(cfg) {
  if (cfg.mock) return require("./instance.mock").createMockClient(cfg);

  const base = cfg.url.replace(/\/+$/, "");
  const user = process.env[cfg.userEnv || "SN_USER"];
  const pass = process.env[cfg.passEnv || "SN_PASSWORD"];
  if (!user || !pass) throw new Error(`Credentials missing: set ${cfg.userEnv || "SN_USER"} / ${cfg.passEnv || "SN_PASSWORD"}`);
  const auth = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");

  async function request(path, opts = {}) {
    const res = await fetch(base + path, {
      method: opts.method || "GET",
      headers: { Authorization: auth, Accept: "application/json", "Content-Type": "application/json" },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    return { status: res.status, data };
  }

  async function query(table, encoded, fields) {
    const qs = new URLSearchParams({ sysparm_query: encoded, sysparm_fields: fields, sysparm_limit: "1", sysparm_display_value: "false" });
    const r = await request(`/api/now/table/${table}?${qs}`);
    if (r.status >= 400) { const e = new Error(`${table} query failed (${r.status})`); e.status = r.status; throw e; }
    return (r.data.result || [])[0] || null;
  }

  return {
    async verify(plugin) {
      if (plugin.type === "plugin") {
        const row = await query("sys_plugins", `source=${plugin.id}`, "active,version");
        return { installed: !!row && row.active === "true", version: row && row.version };
      }
      try {
        const row = await query("sys_store_app", `scope=${plugin.id}`, "active,version");
        return { installed: !!row && row.active === "true", version: row && row.version };
      } catch (e) {
        // sys_store_app can be ACL-locked for the service account (seen on opmsalescrmstage);
        // fall back to sys_scope, which only proves the scope exists, not that it is active.
        if (e.status !== 403) throw e;
        const row = await query("sys_scope", `scope=${plugin.id}`, "version");
        return { installed: !!row, version: row && row.version };
      }
    },

    // PLACEHOLDER - OPEN ITEM: identify the internal REST service that installs/activates
    // plugins and store apps, then implement both calls below. Keep the return shapes.
    async startInstall(plugin) {
      throw new NotImplementedError(`startInstall(${plugin.id}): plugin-install REST service not yet identified (see docs/OPEN-ITEMS.md)`);
    },
    async getProgress(handle) {
      throw new NotImplementedError(`getProgress(${handle && handle.id}): plugin-install REST service not yet identified`);
    },
  };
}

module.exports = { createClient, NotImplementedError };
