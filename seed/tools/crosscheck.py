#!/usr/bin/env python3
"""Compare the demo-data sheet with the extracted fixtures.

opmsalescrm1 is authoritative for values and scope; this only reports sheet
rows with no match in the fixtures (and vice versa) so the sheet can be fixed.

Usage: seed/tools/crosscheck.py [path/to/sheet.xlsx]
"""
import json, re, sys
from pathlib import Path
import openpyxl
from extract import DATA, SEED

DEFAULT_SHEET = Path.home() / "Downloads/MyMCPServer/servicenow-mcp-main/sales-crm-demo-builder/seed-data/Sales_CRM_Golden_Demo_Data_Template.xlsx"

# tab -> (fixture file, sheet column(s), fixture field(s))
CHECKS = {
    "Departments":          ("010-cmn_department", ["department_name"], ["name"]),
    "Users_Personas":       ("030-sys_user", ["user_full_name"], ["name"]),
    "Assignment_Groups":    ("040-sys_user_group", ["name"], ["name"]),
    "Accounts":             ("100-customer_account", ["name"], ["name"]),
    "Contacts":             ("110-customer_contact", ["first_name", "last_name"], ["first_name", "last_name"]),
    "Account_Addresses":    ("020-cmn_location", ["location_name"], ["name"]),
    "Territories":          ("300-sn_tp_territory", ["name"], ["name"]),
    "PRM_Partner Programs": ("200-sn_prm_partner_program", ["Name"], ["name"]),
    "PRM_Segments":         ("190-sn_seg_segment", ["Name"], ["name"]),
    "PRM_Channel Partners": ("210-sn_prm_channel_partner", ["Channel Partner"], ["name"]),
    "Product_Catalogs":     ("430-sn_prd_pm_product_offering_catalog", ["catalog_name"], ["name"]),
    "Product_Categories":   ("435-sn_prd_pm_product_offering_category", ["category_name"], ["name"]),
    "Product_Families":     ("445-sn_prd_pm_product_offering_family", ["family_name"], ["name"]),
    "Product_Offerings":    ("450-sn_prd_pm_product_offering", ["code"], ["code"]),
    "Price_Lists":          ("500-sn_csm_pricing_price_list", ["price_list_name"], ["name"]),
    "Price_List_Lines":     ("510-sn_csm_pricing_price_list_line", ["Code"], ["code"]),
}


def norm(v):
    return re.sub(r"\s+", " ", str(v or "")).strip().lower()


def sheet_rows(ws):
    rows = ws.iter_rows(values_only=True)
    header = [norm(h) for h in next(rows)]
    for r in rows:
        yield {header[i]: v for i, v in enumerate(r) if i < len(header) and header[i]}


def main():
    sheet = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SHEET
    wb = openpyxl.load_workbook(sheet, read_only=True, data_only=True)
    lines = [f"# Sheet vs opmsalescrm1 cross-check\n\nSheet: `{sheet.name}`. opmsalescrm1 wins; fix the sheet, not the fixtures.\n"]
    for tab, (fixture, cols, fields) in CHECKS.items():
        records = json.loads((DATA / f"{fixture}.json").read_text())["records"]
        inst = {tuple(norm(r.get(f)) for f in fields): r for r in records}
        sheet_keys = []
        for row in sheet_rows(wb[tab]):
            key = tuple(norm(row.get(norm(c))) for c in cols)
            # skip guidance/notes rows: every key column must be filled, and the
            # other data columns must not all be empty
            if all(key) and sum(v is not None for v in row.values()) > 1:
                sheet_keys.append(key)
        # Instance names often carry a persona suffix ("Asher Sky_AMS_WEST_CA_TECH_L5");
        # a sheet name matches if it equals the instance name or its prefix before "_".
        prefixes = {tuple(k[0].split("_")[0] if i == 0 else v for i, v in enumerate(k)): k for k in inst}
        missing = [k for k in sheet_keys if k not in inst and k not in prefixes]
        matched = {k if k in inst else prefixes.get(k) for k in sheet_keys} - {None}
        extra = [k for k in inst if k not in matched]
        lines.append(f"## {tab} → `{fixture}`\n\n{len(sheet_keys)} sheet rows, {len(inst)} instance records, "
                     f"{len(missing)} sheet-only, {len(extra)} instance-only.\n")
        if missing:
            lines.append("Sheet-only (not on opmsalescrm1, will not be seeded):\n" + "".join(f"- {' / '.join(k)}\n" for k in missing))
        if extra:
            lines.append("Instance-only (will be seeded, missing from sheet):\n" + "".join(f"- {' / '.join(k)}\n" for k in extra))
    out = DATA / "sheet-crosscheck.md"
    out.write_text("\n".join(lines))
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
