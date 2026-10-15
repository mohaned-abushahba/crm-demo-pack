#!/usr/bin/env python3
"""Extract the images behind Image-type fields (Product Visuals) from the source
instance and bundle them for the loader.

Read-only: GET requests only. Credentials as in extract.py.

For every fixture record of the tables in IMAGE_FIELDS, each non-empty image
field holds a sys_attachment sys_id on the source. Each is downloaded to
seed/images/<attachment sys_id>.<ext>, listed in seed/images/manifest.json,
and combined into seed/dist/golden-demo-images.json (format
golden-demo-images/1) for the loader. A field whose attachment is missing on
the source is reported; if seed/images/generated.json (generate_catalog_images.py)
has a drawn image for it, that one is shipped instead.

Usage: seed/tools/extract_images.py [--instance opmsalescrm1]
"""
import argparse, base64, hashlib, json, mimetypes, sys, urllib.request
from datetime import datetime, timezone
from extract import DATA, SEED, Client, credentials

IMAGES = SEED / "images"
IMAGE_FIELDS = {"sn_prd_pm_visuals": ["image", "thumbnail"]}
EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/svg+xml": ".svg"}


def download(client, sys_id):
    req = urllib.request.Request(f"{client.base}/api/now/attachment/{sys_id}/file",
                                 headers={"Authorization": client.auth})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--instance")
    args = ap.parse_args()
    instance = args.instance or json.loads((SEED / "manifest.json").read_text())["source_instance"]
    client = Client(*credentials(instance))
    IMAGES.mkdir(exist_ok=True)

    wanted = []  # (table, record sys_id, field, attachment sys_id)
    for table, fields in IMAGE_FIELDS.items():
        for path in sorted(DATA.glob(f"*-{table}.json")):
            for r in json.loads(path.read_text())["records"]:
                wanted += [(table, r["sys_id"], f, r[f]) for f in fields if r.get(f)]

    meta = {a["sys_id"]: a for a in client.fetch_all(
        "sys_attachment", "sys_idIN" + ",".join(w[3] for w in wanted),
        "sys_id,file_name,content_type,size_bytes,table_name,table_sys_id")}

    gen_file = IMAGES / "generated.json"
    generated = {(g["record"], g["field"]): g for g in json.loads(gen_file.read_text())["images"]} if gen_file.exists() else {}

    entries, missing = [], []
    for table, rec, field, att in wanted:
        m = meta.get(att)
        if not m:
            missing.append(f"{table} {rec} {field} -> {att}")
            g = generated.get((rec, field))
            if g:
                data = (IMAGES / g["file"]).read_bytes()
                entries.append({"table": table, "record": rec, "field": field, "attachment": att, "file": g["file"],
                                "file_name": g["file_name"], "content_type": g["content_type"], "size": len(data),
                                "sha256": hashlib.sha256(data).hexdigest(), "generated": True})
                print(f"{g['file']:<44} {g['content_type']:<11} {len(data):>9} bytes  {table}.{field}  (generated)")
            continue
        data = download(client, att)
        ctype = m["content_type"]
        name = f"{att}{EXT.get(ctype) or mimetypes.guess_extension(ctype) or ''}"
        (IMAGES / name).write_bytes(data)
        entries.append({"table": table, "record": rec, "field": field, "attachment": att,
                        "file": name, "file_name": m["file_name"], "content_type": ctype,
                        "size": len(data), "sha256": hashlib.sha256(data).hexdigest()})
        print(f"{name:<44} {ctype:<11} {len(data):>9} bytes  {table}.{field}")

    (IMAGES / "manifest.json").write_text(json.dumps(
        {"source": instance, "images": entries, "missing_on_source": missing,
         "still_empty": [x for x in missing if not any(e["attachment"] == x.split(" -> ")[1] for e in entries)]}, indent=2) + "\n")

    out = SEED / "dist" / "golden-demo-images.json"
    out.parent.mkdir(exist_ok=True)
    lines = ["{", '"format": "golden-demo-images/1",', f'"source": {json.dumps(instance)},',
             f'"generated_on": "{datetime.now(timezone.utc):%Y-%m-%d %H:%M:%S}",',
             f'"count": {len(entries)},', '"images": [']
    lines.append(",\n".join(json.dumps(
        {**e, "base64": base64.b64encode((IMAGES / e["file"]).read_bytes()).decode()},
        separators=(",", ":")) for e in entries))
    lines.append("]}")
    out.write_text("\n".join(lines) + "\n")
    json.loads(out.read_text())  # self-check
    print(f"wrote {out} — {len(entries)} images, {out.stat().st_size / 1e6:.1f} MB")
    for m in missing:
        if not any(e["attachment"] == m.split(" -> ")[1] for e in entries):
            print(f"  ! missing on {instance}, nothing generated: {m}")


if __name__ == "__main__":
    main()
