#!/usr/bin/env python3
"""Record each seeded user's effective roles on the source instance.

Output: seed/data/expected-user-roles.json — for every user in 030-sys_user.json,
the names of all active roles they hold (direct, group-inherited and contained).
bundle.py ships it in the bundle; the loader compares it with the target after
the load, which shows whether group → member role inheritance rebuilt the roles.

Read-only: issues GET requests against the Table API only.

Usage: seed/tools/expected_roles.py [--instance opmsalescrm1]
"""
import argparse, json
from extract import DATA, SEED, Client, credentials


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--instance")
    args = ap.parse_args()

    manifest = json.loads((SEED / "manifest.json").read_text())
    instance = args.instance or manifest["source_instance"]
    client = Client(*credentials(instance))
    users = json.loads((DATA / "030-sys_user.json").read_text())["records"]

    # One query per user: a batched userIN query is rejected with HTTP 400.
    roles = {
        u["sys_id"]: {r["role.name"] for r in client.fetch_all(
            "sys_user_has_role", f"user={u['sys_id']}^state=active", "role.name")}
        for u in users
    }

    doc = {
        "source": instance,
        "users": {
            u["sys_id"]: {"user_name": u["user_name"], "roles": sorted(roles[u["sys_id"]])}
            for u in sorted(users, key=lambda u: u["user_name"])
        },
    }
    out = DATA / "expected-user-roles.json"
    out.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n")
    print(f"wrote {out} — {len(users)} users, {sum(len(r) for r in roles.values())} role grants")


if __name__ == "__main__":
    main()
