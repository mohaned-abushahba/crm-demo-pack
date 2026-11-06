#!/usr/bin/env python3
"""Combine seed/data/*.json into the single file handed to an agent / loader.

Output: seed/dist/golden-demo-seed.json (format golden-demo-seed/1). Passwords
are never included; they stay in git-ignored seed/secrets/passwords.json.
Each seeded user's expected roles (seed/tools/expected_roles.py) go last, for
the loader's post-load role check.

Usage: seed/tools/bundle.py
"""
import json
from datetime import datetime, timezone
from extract import DATA, SEED


def main():
    manifest = json.loads((SEED / "manifest.json").read_text())
    tables = []
    for spec in manifest["tables"]:
        doc = json.loads((DATA / f"{spec['file']}.json").read_text())
        tables.append({
            "table": spec["table"],
            "key": spec["key"],
            "on_conflict": spec.get("on_conflict", "fail"),
            "insert_as": spec.get("insert_as", {}),
            "resolve_by": spec.get("resolve_by", {}),
            "references": doc["references"],
            "count": len(doc["records"]),
            "records": doc["records"],
        })
    prerequisites = [
        {"table": e["table"], "sys_id": e["sys_id"], "label": e["label"]}
        for e in json.loads((DATA / "external-refs.json").read_text())
    ]
    bundle = {
        "format": "golden-demo-seed/1",
        "source": manifest["source_instance"],
        "generated_on": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "record_count": sum(t["count"] for t in tables),
        "table_count": len(tables),
        "prerequisites": prerequisites,
        "tables": tables,
    }
    expected_roles = json.loads((DATA / "expected-user-roles.json").read_text())["users"]
    out = SEED / "dist" / "golden-demo-seed.json"
    out.parent.mkdir(exist_ok=True)
    # Header first, then one record per line: small to inspect, safe to stream.
    lines = ["{"]
    for k in ("format", "source", "generated_on", "record_count", "table_count"):
        lines.append(f'"{k}": {json.dumps(bundle[k])},')
    lines.append('"prerequisites": [')
    lines.append(",\n".join(json.dumps(p, ensure_ascii=False) for p in prerequisites))
    lines.append("],")
    lines.append('"tables": [')
    for i, t in enumerate(tables):
        head = {k: v for k, v in t.items() if k != "records"}
        lines.append(json.dumps(head, ensure_ascii=False)[:-1] + ', "records": [')
        lines.append(",\n".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in t["records"]))
        lines.append("]}" + ("," if i < len(tables) - 1 else ""))
    lines.append("],")
    lines.append('"expected_user_roles": {')
    lines.append(",\n".join(f"{json.dumps(uid)}: {json.dumps(u, ensure_ascii=False, separators=(',', ':'))}"
                            for uid, u in expected_roles.items()))
    lines.append("}}")
    out.write_text("\n".join(lines) + "\n")
    json.loads(out.read_text())  # self-check
    print(f"wrote {out} — {bundle['table_count']} tables, {bundle['record_count']} records, "
          f"{len(prerequisites)} prerequisites, {len(expected_roles)} users' expected roles, {out.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
