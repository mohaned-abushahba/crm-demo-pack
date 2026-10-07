#!/usr/bin/env python3
"""Collect demo login passwords from the sheet into seed/secrets/passwords.json.

The instance never exposes passwords, so they come from the sheet's 'password'
columns (Users_Personas, Contacts). Output is keyed by the extracted record's
sys_id and is git-ignored; the loader sets them at deploy time.

Usage: seed/tools/passwords.py [path/to/sheet.xlsx]
"""
import json, sys
from pathlib import Path
import openpyxl
from extract import DATA, SEED
from crosscheck import DEFAULT_SHEET, norm, sheet_rows


def main():
    sheet = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SHEET
    wb = openpyxl.load_workbook(sheet, read_only=True, data_only=True)
    users = json.loads((DATA / "030-sys_user.json").read_text())["records"]
    contacts = json.loads((DATA / "110-customer_contact.json").read_text())["records"]
    by_user_name = {norm(u["user_name"]): u for u in users}
    by_name = {norm(u["name"]): u for u in users}

    out, unmatched = {}, []
    for row in sheet_rows(wb["Users_Personas"]):
        if not row.get("password"):
            continue
        rec = by_user_name.get(norm(row.get("username"))) or by_name.get(norm(row.get("user_full_name")))
        if rec:
            out[rec["sys_id"]] = {"user_name": rec["user_name"], "password": str(row["password"])}
        else:
            unmatched.append(f"Users_Personas: {row.get('username')} / {row.get('user_full_name')}")
    for row in sheet_rows(wb["Contacts"]):
        if not row.get("password"):
            continue
        hits = [c for c in contacts if norm(c.get("first_name")) == norm(row.get("first_name"))
                and norm(c.get("last_name")) == norm(row.get("last_name"))]
        if len(hits) == 1:
            out[hits[0]["sys_id"]] = {"user_name": hits[0]["user_name"], "password": str(row["password"])}
        else:
            unmatched.append(f"Contacts: {row.get('first_name')} {row.get('last_name')} ({len(hits)} matches)")

    secrets = SEED / "secrets"
    secrets.mkdir(exist_ok=True)
    (secrets / "passwords.json").write_text(json.dumps(out, indent=2) + "\n")
    print(f"wrote {len(out)} passwords to seed/secrets/passwords.json")
    for u in unmatched:
        print("  ! no matching record:", u)


if __name__ == "__main__":
    main()
