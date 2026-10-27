// Run: node --test installer/
process.env.INSTALLER_RUNS_DIR = require("node:fs").mkdtempSync(require("node:os").tmpdir() + "/installer-test-");
const test = require("node:test");
const assert = require("node:assert");
const { Engine, compareVersions } = require("./engine");

const FAST = { pollMs: 5, backoffMs: [5, 5], maxAttempts: 3, stallMs: 1000, heavyStallMs: 1000 };
const wait = async (engine, id) => { while (["pending", "running"].includes(engine.get(id).status)) await new Promise((r) => setTimeout(r, 10)); return engine.get(id); };

test("installs everything, skips pre-installed, reports ready", async () => {
  const e = new Engine({ options: FAST, instances: { m: { mock: true, durationMs: 10, preInstalled: ["sn_prm"] } } });
  const run = await wait(e, e.start("m").id);
  assert.equal(run.status, "completed");
  assert.equal(run.ready, true);
  const s = e.summary(run);
  assert.equal(s.installed, 53); assert.equal(s.percent, 100);
});

test("retries a failing plugin and succeeds on a later attempt", async () => {
  const e = new Engine({ options: FAST, instances: { m: { mock: true, durationMs: 10, failIds: { sn_ind_tmt_orm: 2 } } } });
  const run = await wait(e, e.start("m").id);
  assert.equal(run.status, "completed");
  assert.equal(run.plugins[0].attempts, 3);
});

test("exhausted retries -> failed, run continues, not ready, then retryFailed recovers", async () => {
  const e = new Engine({ options: FAST, instances: { m: { mock: true, durationMs: 10, failIds: { sn_cpq_intg: 3 } } } });
  let run = await wait(e, e.start("m").id);
  assert.equal(run.status, "completed_with_errors");
  assert.equal(run.ready, false);
  assert.equal(run.plugins.find((p) => p.id === "sn_cpq_intg").state, "failed");
  assert.equal(e.summary(run).installed, 52);
  e.retryFailed(run.id);
  run = await wait(e, run.id);
  assert.equal(run.status, "completed"); assert.equal(run.ready, true);
});

test("slow install is waited out, not timed out (heavy plugin runs 3x longer)", async () => {
  const e = new Engine({ options: { ...FAST, stallMs: 200, heavyStallMs: 200 }, instances: { m: { mock: true, durationMs: 10, heavyDurationMs: 600 } } });
  const run = await wait(e, e.start("m").id);
  assert.equal(run.plugins[0].attempts, 1); // progress kept changing, so no stall
  assert.equal(run.status, "completed");
});

test("placeholder install service fails cleanly on a real instance config", async () => {
  process.env.T_U = "u"; process.env.T_P = "p";
  const e = new Engine({ options: FAST, instances: { r: { url: "http://127.0.0.1:9", userEnv: "T_U", passEnv: "T_P" } } });
  const run = await wait(e, e.start("r").id);
  assert.ok(["failed", "completed_with_errors"].includes(run.status));
});

test("second concurrent run on same instance is refused", async () => {
  const e = new Engine({ options: FAST, instances: { m: { mock: true, durationMs: 50 } } });
  const r = e.start("m");
  assert.throws(() => e.start("m"), /already active/);
  e.cancel(r.id); await wait(e, r.id);
});

test("compareVersions orders dotted versions numerically", () => {
  assert.equal(compareVersions("14.1.12", "14.2.0"), -1);
  assert.equal(compareVersions("1.10.0", "1.9.9"), 1);
  assert.equal(compareVersions("8.2", "8.2.0"), 0);
});

test("active but outdated plugin is upgraded to latest; up-to-date one is skipped", async () => {
  const e = new Engine({ options: FAST, instances: { m: { mock: true, durationMs: 10,
    preInstalled: ["sn_prm", "sn_cpq_intg"], installedVersions: { sn_prm: "1.0.0" }, latestVersions: { sn_prm: "7.0.1" } } } });
  const run = await wait(e, e.start("m").id);
  const prm = run.plugins.find((p) => p.id === "sn_prm");
  assert.equal(prm.attempts, 1);               // outdated -> reinstalled, not skipped
  assert.equal(prm.installedVersion, "7.0.1");
  assert.equal(run.plugins.find((p) => p.id === "sn_cpq_intg").attempts, 0); // already latest -> skipped
  assert.equal(run.ready, true);
});

test("fresh install records the latest version on every plugin", async () => {
  const e = new Engine({ options: FAST, instances: { m: { mock: true, durationMs: 10, installedVersions: {} } } });
  const run = await wait(e, e.start("m").id);
  assert.ok(run.plugins.every((p) => p.installedVersion === p.latestVersion));
  assert.equal(run.ready, true);
});
