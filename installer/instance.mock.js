// Mock instance for exercising the engine without a real install service.
// cfg options: durationMs (default 3000), heavyDurationMs, failIds: { id: timesToFail }, preInstalled: [ids]
// State lives on the cfg object so it persists across runs, like a real instance would.
function createMockClient(cfg) {
  const st = cfg._state || (cfg._state = { installed: new Set(cfg.preInstalled || []), failLeft: { ...(cfg.failIds || {}) }, jobs: new Map(), seq: 0 });
  const { installed, failLeft, jobs } = st;
  return {
    async verify(p) { return { installed: installed.has(p.id), version: installed.has(p.id) ? "mock" : undefined }; },
    async startInstall(p) {
      const id = `mock-${++st.seq}`;
      const dur = p.heavy ? (cfg.heavyDurationMs ?? (cfg.durationMs ?? 3000) * 3) : (cfg.durationMs ?? 3000);
      const fail = (failLeft[p.id] || 0) > 0;
      if (fail) failLeft[p.id]--;
      jobs.set(id, { p, start: Date.now(), dur, fail });
      return { id };
    },
    async getProgress(h) {
      const j = jobs.get(h.id);
      if (!j) return { state: "failed", message: "unknown job" };
      const pct = Math.min(100, Math.round(((Date.now() - j.start) / j.dur) * 100));
      if (pct < 100) return { state: "running", percent: pct, message: `installing ${j.p.id}` };
      if (j.fail) return { state: "failed", percent: pct, message: "mock install failure" };
      installed.add(j.p.id);
      return { state: "succeeded", percent: 100 };
    },
  };
}
module.exports = { createMockClient };
