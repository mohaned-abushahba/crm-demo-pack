#!/usr/bin/env python3
"""List references in seed/data/*.json that point outside the fixtures.

Each such record must already exist on the target instance (OOTB/plugin data,
or config shipped in an Update Set). Writes seed/data/external-refs.json and
prints a summary grouped by referenced table.

Usage: seed/tools/refcheck.py [--instance opmsalescrm1]
"""
import argparse, json, urllib.error
from collections import defaultdict
from extract import DATA, SEED, Client, credentials


def in_windows(ts, windows):
    return any(ts >= start and (end is None or ts < end) for start, end in windows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--instance")
    args = ap.parse_args()
    manifest = json.loads((SEED / "manifest.json").read_text())
    client = Client(*credentials(args.instance or manifest["source_instance"]))

    docs = [json.loads(p.read_text()) for p in sorted(DATA.glob("[0-9]*.json"))]
    known = {r["sys_id"] for d in docs for r in d["records"]}
    external = defaultdict(lambda: defaultdict(set))  # ref_table -> sys_id -> {"table.field"}
    for d in docs:
        for field, ref_table in d["references"].items():
            for r in d["records"]:
                for v in (r.get(field) or "").split(","):
                    if v and v not in known:
                        external[ref_table][v].add(f"{d['table']}.{field}")

    out = []
    for ref_table, ids in sorted(external.items()):
        found = {}
        id_list = sorted(ids)
        unreadable = False
        for i in range(0, len(id_list), 100):
            try:
                rows = client.fetch_all(ref_table, "sys_idIN" + ",".join(id_list[i:i + 100]),
                                        "sys_id,sys_created_on,sys_class_name,name,user_name,number,code")
            except urllib.error.HTTPError as e:
                print(f"  ! cannot read {ref_table}: HTTP {e.code}")
                unreadable = True
                break
            for row in rows:
                found[row["sys_id"]] = row
        for sid in id_list:
            row = found.get(sid)
            out.append({
                "table": ref_table,
                "sys_id": sid,
                "label": (row and (row.get("name") or row.get("user_name") or row.get("number") or row.get("code"))) or None,
                "exists_on_source": None if unreadable else bool(row),
                "created_in_scope": bool(row and in_windows(row.get("sys_created_on", ""), manifest["windows"])),
                "used_by": sorted(ids[sid]),
            })
    (DATA / "external-refs.json").write_text(json.dumps(out, indent=2) + "\n")

    summary = defaultdict(lambda: [0, 0, 0])
    for e in out:
        s = summary[e["table"]]
        s[0] += 1
        s[1] += e["exists_on_source"] is False
        s[2] += e["created_in_scope"]
    print(f"{'referenced table':<55}{'refs':>6}{'dangling':>10}{'in-scope':>15}")
    for t, (n, missing, post) in sorted(summary.items()):
        print(f"{t:<55}{n:>6}{missing:>10}{post:>15}")


if __name__ == "__main__":
    main()
