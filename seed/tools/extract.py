#!/usr/bin/env python3
"""Extract master seed data from the source instance into seed/data/*.json.

Read-only: issues GET requests against the Table API only.

Credentials: SNOW_URL / SNOW_USER / SNOW_PASS env vars, or (fallback) the
mcpServers.<instance>.env block in ~/.claude.json. Never written to disk.

Usage: seed/tools/extract.py [--instance opmsalescrm1] [--only <table>,...]
"""
import argparse, base64, json, os, re, sys, urllib.parse, urllib.request
from pathlib import Path

SEED = Path(__file__).resolve().parent.parent
DATA = SEED / "data"
PAGE = 500


def find_mcp_env(obj, name):
    if isinstance(obj, dict):
        v = obj.get(name)
        if isinstance(v, dict) and isinstance(v.get("env"), dict):
            return v["env"]
        for child in obj.values():
            r = find_mcp_env(child, name)
            if r:
                return r
    return None


def credentials(instance):
    if os.environ.get("SNOW_URL"):
        return os.environ["SNOW_URL"], os.environ["SNOW_USER"], os.environ["SNOW_PASS"]
    env = find_mcp_env(json.loads((Path.home() / ".claude.json").read_text()), instance)
    if not env:
        sys.exit(f"No credentials: set SNOW_URL/SNOW_USER/SNOW_PASS or register MCP server '{instance}'")
    return env["SERVICENOW_INSTANCE_URL"], env["SERVICENOW_USERNAME"], env["SERVICENOW_PASSWORD"]


class Client:
    def __init__(self, url, user, pw):
        self.base = url.rstrip("/")
        self.auth = "Basic " + base64.b64encode(f"{user}:{pw}".encode()).decode()

    def get(self, path, params):
        req = urllib.request.Request(
            f"{self.base}{path}?{urllib.parse.urlencode(params)}",
            headers={"Authorization": self.auth, "Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.load(r)["result"]

    def fetch_all(self, table, query, fields=None):
        rows, offset = [], 0
        while True:
            params = {
                "sysparm_query": query + "^ORDERBYsys_id",
                "sysparm_display_value": "false",
                "sysparm_exclude_reference_link": "true",
                "sysparm_limit": PAGE,
                "sysparm_offset": offset,
            }
            if fields:
                params["sysparm_fields"] = fields
            batch = self.get(f"/api/now/table/{table}", params)
            rows += batch
            if len(batch) < PAGE:
                return rows
            offset += PAGE

    def reference_fields(self, table):
        """{field: referenced_table} for the table and all its ancestors."""
        chain, t = [], table
        while t:
            chain.append(t)
            r = self.get("/api/now/table/sys_db_object", {"sysparm_query": f"name={t}", "sysparm_fields": "super_class.name"})
            t = r[0].get("super_class.name") if r else None
        refs = {}
        for d in self.fetch_all("sys_dictionary", f"nameIN{','.join(chain)}^internal_type=reference^referenceISNOTEMPTY", "element,reference"):
            refs[d["element"]] = d["reference"]
        return refs


def apply_overrides(docs, cfg):
    """Apply deliberate exceptions to 'source instance wins', then fail if any
    forbidden string (e.g. a real company name) is still present."""
    by_id = {(d["table"], r["sys_id"]): r for _, d in docs for r in d["records"]}
    for o in cfg["overrides"]:
        rec = by_id.get((o["table"], o["sys_id"]))
        if rec is None:
            print(f"  ! override target not extracted: {o['table']} {o['sys_id']}")
            continue
        rec.update(o["set"])
    pattern = re.compile("|".join(cfg["forbidden_patterns"]), re.I)
    hits = [f"{t}.{k} {sid}: {v[:60]}" for (t, sid), r in by_id.items()
            for k, v in r.items() if isinstance(v, str) and pattern.search(v)]
    if hits:
        sys.exit("Forbidden strings remain after overrides:\n  " + "\n  ".join(hits))


def scope_query(windows, extra):
    """OR of the created-on windows, each ANDed with the table's own filter."""
    branches = []
    for start, end in windows:
        q = f"sys_created_on>={start}" + (f"^sys_created_on<{end}" if end else "")
        branches.append(q + (f"^{extra}" if extra else ""))
    return "^NQ".join(branches)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--instance")
    ap.add_argument("--only", help="comma-separated table names")
    args = ap.parse_args()

    manifest = json.loads((SEED / "manifest.json").read_text())
    instance = args.instance or manifest["source_instance"]
    client = Client(*credentials(instance))
    only = set(args.only.split(",")) if args.only else None
    DATA.mkdir(exist_ok=True)
    docs = {}

    for spec in manifest["tables"]:
        table = spec["table"]
        if only and table not in only:
            continue
        query = scope_query(manifest["windows"], spec.get("query"))
        excluded = set(manifest["exclude_fields"]) | set(spec.get("exclude", []))
        records = [{k: v for k, v in r.items() if k not in excluded} for r in client.fetch_all(table, query)]
        for field, values in spec.get("exclude_records", {}).items():
            if not field.startswith("_"):
                records = [r for r in records if r.get(field) not in values]
        doc = {
            "table": table,
            "key": spec["key"],
            "on_conflict": spec.get("on_conflict", "fail"),
            "source": instance,
            "query": query,
            "references": client.reference_fields(table),
            "records": records,
        }
        docs[spec["file"]] = (spec, doc)

    apply_overrides(docs.values(), json.loads((SEED / "overrides.json").read_text()))

    # Drop join rows whose required references point outside the fixtures
    # (e.g. role grants to platform service accounts that plugins recreate).
    # Skipped with --only, since the other fixtures aren't loaded.
    known = {r["sys_id"] for _, d in docs.values() for r in d["records"]}
    dropped = []
    for spec, doc in ([] if only else docs.values()):
        for field in spec.get("require_in_fixtures", []):
            keep = []
            for r in doc["records"]:
                if r.get(field) in known:
                    keep.append(r)
                else:
                    dropped.append({"table": doc["table"], "field": field, **r})
            doc["records"] = keep

    for name, (spec, doc) in docs.items():
        (DATA / f"{name}.json").write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
        print(f"{name:<60} {len(doc['records']):>5}")
    if not only:
        (DATA / "dropped.json").write_text(json.dumps(dropped, indent=2) + "\n")
        print(f"dropped {len(dropped)} rows referencing records outside the fixtures -> data/dropped.json")


if __name__ == "__main__":
    main()
