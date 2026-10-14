// Installer engine: installs the manifest's plugins one at a time on a target instance.
//
//  - Never gives up on a slow install: it waits as long as the instance reports progress.
//    A plugin only counts as stalled when its progress has not changed for `stallMs`
//    (longer for `heavy` plugins such as Order Management).
//  - Failed or stalled installs are retried with backoff; each attempt re-verifies first,
//    in case the plugin actually landed.
//  - A plugin that exhausts its attempts is marked `failed`; the run carries on with the
//    rest and ends `completed_with_errors`. `ready` is true only when ALL plugins are active.
//  - State is persisted after every change so a restart resumes where it left off.
const crypto = require("node:crypto");
const store = require("./store");
const { createClient } = require("./instance");
const manifest = require("./manifest.json");

const DEFAULTS = {
  pollMs: 15_000,
  stallMs: 30 * 60_000,
  heavyStallMs: 90 * 60_000,
  maxAttempts: 3,
  backoffMs: [60_000, 300_000, 900_000],
};

const ACTIVE = new Set(["pending", "running"]);
const now = () => new Date().toISOString();

class Engine {
  constructor({ instances, options } = {}) {
    this.instances = instances || {};
    this.opt = { ...DEFAULTS, ...(options || {}) };
    this.runs = new Map();      // id -> run
    this.workers = new Map();   // id -> { cancelled, wake }
    for (const r of store.list()) this.runs.set(r.id, r);
  }

  // Resume runs that were in flight when the service stopped.
  resumeAll() {
    for (const run of this.runs.values()) if (ACTIVE.has(run.status)) this._launch(run);
  }

  start(instanceName) {
    if (!this.instances[instanceName]) throw httpError(400, `Unknown instance '${instanceName}'`);
    for (const r of this.runs.values()) {
      if (r.instance === instanceName && ACTIVE.has(r.status)) throw httpError(409, `Run ${r.id} is already active on ${instanceName}`);
    }
    const run = {
      id: crypto.randomUUID(),
      instance: instanceName,
      status: "pending",
      ready: false,
      createdAt: now(),
      finishedAt: null,
      plugins: manifest.plugins.map((p) => ({
        ...p, state: "pending", attempts: 0, percent: 0, message: null, error: null,
        handle: null, startedAt: null, finishedAt: null, lastProgressAt: null,
      })),
    };
    this.runs.set(run.id, run);
    store.save(run);
    this._launch(run);
    return run;
  }

  get(id) { return this.runs.get(id) || null; }
  list() { return [...this.runs.values()]; }

  // Re-queue failed plugins (fresh attempt budget) and continue the run.
  retryFailed(id) {
    const run = this._need(id);
    if (ACTIVE.has(run.status)) throw httpError(409, "Run is still active");
    const failed = run.plugins.filter((p) => p.state === "failed");
    if (!failed.length) throw httpError(409, "No failed plugins to retry");
    for (const p of failed) Object.assign(p, { state: "pending", attempts: 0, error: null, handle: null, percent: 0 });
    run.status = "pending"; run.finishedAt = null; run.ready = false;
    store.save(run);
    this._launch(run);
    return run;
  }

  cancel(id) {
    const run = this._need(id);
    const w = this.workers.get(id);
    if (!w) throw httpError(409, "Run is not active");
    w.cancelled = true; w.wake();
    return run;
  }

  // Wake the poll loop so the next instance check happens now (UI "check now").
  pokeNow(id) { const w = this.workers.get(id); if (w) w.wake(); }

  summary(run) {
    const total = run.plugins.length;
    const done = run.plugins.filter((p) => p.state === "installed").length;
    const cur = run.plugins.find((p) => p.state === "installing" || p.state === "retrying");
    const frac = (done + (cur ? (cur.percent || 0) / 100 : 0)) / total;
    const count = (s) => run.plugins.filter((p) => p.state === s).length;
    return {
      id: run.id, instance: run.instance, status: run.status, ready: run.ready,
      installed: done, total, percent: Math.round(frac * 1000) / 10,
      counts: { pending: count("pending"), installing: count("installing"), retrying: count("retrying"),
                installed: done, failed: count("failed"), cancelled: count("cancelled") },
      current: cur ? { id: cur.id, name: cur.name, state: cur.state, attempt: cur.attempts, percent: cur.percent, message: cur.message } : null,
      createdAt: run.createdAt, finishedAt: run.finishedAt,
    };
  }

  // ---- internals ----

  _need(id) { const r = this.runs.get(id); if (!r) throw httpError(404, "Run not found"); return r; }

  _launch(run) {
    if (this.workers.has(run.id)) return;
    const w = { cancelled: false, wake: () => {}, };
    this.workers.set(run.id, w);
    this._execute(run, w)
      .catch((e) => { run.status = "failed"; run.error = String(e.message || e); this.workers.delete(run.id); run.finishedAt = now(); })
      .finally(() => store.save(run));
  }

  _sleep(w, ms) {
    return new Promise((resolve) => {
      const t = setTimeout(resolve, ms);
      w.wake = () => { clearTimeout(t); resolve(); };
    });
  }

  async _execute(run, w) {
    const client = createClient(this.instances[run.instance]);
    run.status = "running"; store.save(run);

    // Preflight: anything already active is done; makes reruns and resumes idempotent.
    for (const p of run.plugins) {
      if (p.state !== "pending" && p.state !== "installing" && p.state !== "retrying") continue;
      const v = await client.verify(p);
      if (v.installed) this._finish(run, p, "installed", { message: "already active", percent: 100 });
    }

    for (const p of run.plugins) {
      if (w.cancelled) break;
      if (p.state === "installed" || p.state === "failed") continue;
      await this._installOne(run, p, client, w);
    }

    // Release the worker in the same tick the terminal status is set, so a retry issued the
    // instant the run looks finished is never swallowed by a still-registered worker.
    this.workers.delete(run.id);
    run.finishedAt = now();
    if (w.cancelled) {
      for (const p of run.plugins) if (p.state === "pending" || p.state === "installing" || p.state === "retrying") p.state = "cancelled";
      run.status = "cancelled";
    } else {
      const bad = run.plugins.some((p) => p.state !== "installed");
      run.status = bad ? "completed_with_errors" : "completed";
    }
    run.ready = run.plugins.every((p) => p.state === "installed");
  }

  async _installOne(run, p, client, w) {
    while (p.attempts < this.opt.maxAttempts && !w.cancelled) {
      if (p.attempts > 0) {
        p.state = "retrying"; store.save(run);
        await this._sleep(w, this.opt.backoffMs[Math.min(p.attempts - 1, this.opt.backoffMs.length - 1)]);
        if (w.cancelled) return;
        // It may have landed despite the reported failure.
        if ((await client.verify(p)).installed) return this._finish(run, p, "installed", { percent: 100, message: "verified active after retry wait" });
      }
      p.attempts++;
      p.state = "installing"; p.startedAt = p.startedAt || now(); p.lastProgressAt = Date.now();
      try {
        // On resume, keep following the in-flight install instead of starting a duplicate.
        if (!p.handle) p.handle = await client.startInstall(p);
        store.save(run);
        const out = await this._follow(run, p, client, w);
        if (w.cancelled) return;
        if (out.state === "succeeded") {
          if ((await client.verify(p)).installed) return this._finish(run, p, "installed", { percent: 100, message: null });
          throw new Error("install reported success but plugin is not active on the instance");
        }
        throw new Error(out.message || "install failed");
      } catch (e) {
        p.error = String(e.message || e); p.handle = null;
        store.save(run);
      }
    }
    if (!w.cancelled) this._finish(run, p, "failed", {});
  }

  // Poll until the install finishes. No overall timeout; only a stall ends it.
  async _follow(run, p, client, w) {
    const stallMs = p.heavy ? this.opt.heavyStallMs : this.opt.stallMs;
    for (;;) {
      const prog = await client.getProgress(p.handle);
      if (prog.state !== "running") return prog;
      if (prog.percent !== p.percent || prog.message !== p.message) p.lastProgressAt = Date.now();
      p.percent = prog.percent ?? p.percent; p.message = prog.message ?? p.message;
      store.save(run);
      if (Date.now() - p.lastProgressAt > stallMs) return { state: "failed", message: `stalled: no progress for ${Math.round(stallMs / 60000)} min` };
      await this._sleep(w, this.opt.pollMs);
      if (w.cancelled) return { state: "failed", message: "cancelled" };
    }
  }

  _finish(run, p, state, extra) {
    Object.assign(p, extra, { state, finishedAt: now() });
    if (state === "installed") { p.error = null; p.handle = null; }
    store.save(run);
  }
}

function httpError(status, message) { const e = new Error(message); e.status = status; return e; }

module.exports = { Engine, DEFAULTS };
