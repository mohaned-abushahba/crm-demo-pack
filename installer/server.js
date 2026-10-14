// Status API for the wizard front end. Zero dependencies.
//   POST /runs                 { "instance": "<name from instances.json>" }  -> starts a run
//   GET  /runs                 -> summaries of all runs
//   GET  /runs/:id[?refresh=true] -> summary + per-plugin detail (cheap: reads stored state;
//                                 refresh=true wakes the poller for an immediate instance check)
//   POST /runs/:id/retry       -> retry failed plugins
//   POST /runs/:id/cancel      -> stop the run
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { Engine } = require("./engine");

const instFile = process.env.INSTANCES_FILE || path.join(__dirname, "instances.json");
const instances = fs.existsSync(instFile) ? JSON.parse(fs.readFileSync(instFile, "utf8")) : {};
const engine = new Engine({ instances });

const send = (res, code, body) => { res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }); res.end(JSON.stringify(body)); };

function detail(run) {
  return { ...engine.summary(run), error: run.error || null,
    plugins: run.plugins.map(({ id, name, group, state, attempts, percent, message, error, startedAt, finishedAt }) =>
      ({ id, name, group, state, attempts, percent, message, error, startedAt, finishedAt })) };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") { res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST", "Access-Control-Allow-Headers": "Content-Type" }); return res.end(); }
    const url = new URL(req.url, "http://x");
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] !== "runs") return send(res, 404, { error: "not found" });

    if (parts.length === 1 && req.method === "GET") return send(res, 200, engine.list().map((r) => engine.summary(r)));
    if (parts.length === 1 && req.method === "POST") {
      let raw = ""; for await (const c of req) raw += c;
      const { instance } = raw ? JSON.parse(raw) : {};
      return send(res, 201, detail(engine.start(instance)));
    }
    const run = engine.get(parts[1]);
    if (!run) return send(res, 404, { error: "run not found" });
    if (parts.length === 2 && req.method === "GET") {
      if (url.searchParams.get("refresh") === "true") engine.pokeNow(run.id);
      return send(res, 200, detail(run));
    }
    if (parts[2] === "retry" && req.method === "POST") return send(res, 202, detail(engine.retryFailed(run.id)));
    if (parts[2] === "cancel" && req.method === "POST") return send(res, 202, detail(engine.cancel(run.id)));
    send(res, 404, { error: "not found" });
  } catch (e) {
    send(res, e.status || 500, { error: e.message });
  }
});

if (require.main === module) {
  const port = Number(process.env.PORT || 4010);
  server.listen(port, () => { console.log(`installer API on :${port} (instances: ${Object.keys(instances).join(", ") || "none"})`); engine.resumeAll(); });
}
module.exports = { server, engine };
