// Run-state persistence: one JSON file per run, written atomically so a crash or restart
// never leaves a half-written file. Runs survive service restarts (engine resumes them).
const fs = require("node:fs");
const path = require("node:path");

const DIR = process.env.INSTALLER_RUNS_DIR || path.join(__dirname, "runs");

function file(id) { return path.join(DIR, `${id}.json`); }

function save(run) {
  fs.mkdirSync(DIR, { recursive: true });
  const tmp = file(run.id) + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(run, null, 2));
  fs.renameSync(tmp, file(run.id));
}

function load(id) {
  try { return JSON.parse(fs.readFileSync(file(id), "utf8")); } catch { return null; }
}

function list() {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => load(f.slice(0, -5))).filter(Boolean);
}

module.exports = { save, load, list };
