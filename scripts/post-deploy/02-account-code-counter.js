// Post-deploy: re-sync the customer_account code counter after master data is seeded.
//
// New accounts get account_code/account_path from generateCodeForTreePath, which reads the
// counter property com.snc.cs_base.last.generated.code.tree.path and increments it. The seed
// loads accounts with the account_code values they have on opmsalescrm1, so the counter on the
// target is left behind the seeded codes. The next insert then generates a code that already
// exists and the DB rejects it:
//
//   Duplicate entry '!!!U' for key '<unique index>'  ->  Table API 403 "Operation Failed"
//
// (found 2026-10-13 on opmsalescrmstage: every E2E fixture insert of customer_account failed.)
//
// This sets the counter to the highest valid account_code, comparing in the generator's own
// character order (not ASCII). Codes with characters outside the alphabet (e.g. a hand-made
// "ACCT-GATELYNX-000") are ignored, as the generator itself does.
//
// Idempotent: only writes when the value differs. Never moves the counter backwards.
// Run with the `execute` MCP tool against the target instance, AFTER seeding customer_account.

const PROPERTY = "com.snc.cs_base.last.generated.code.tree.path";
const ALPHABET = "!#$&()*+,-.0123456789:;<?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]`}|{~";

function isValid(code) {
  for (let i = 0; i < code.length; i++) if (ALPHABET.indexOf(code[i]) === -1) return false;
  return code.length > 0;
}
// Longer codes are larger; same length compares character by character in ALPHABET order.
function compare(a, b) {
  if (a.length !== b.length) return a.length - b.length;
  for (let i = 0; i < a.length; i++) {
    const d = ALPHABET.indexOf(a[i]) - ALPHABET.indexOf(b[i]);
    if (d !== 0) return d;
  }
  return 0;
}

async function run() {
  let max = "";
  for (let offset = 0; ; offset += 200) {
    const rows = await SN.TableQuery("customer_account")
      .where("account_codeISNOTEMPTY")
      .select("account_code")
      .displayValue("false")
      .limit(200)
      .offset(offset)
      .fetch();
    for (const r of rows) {
      if (isValid(r.account_code) && (max === "" || compare(r.account_code, max) > 0)) max = r.account_code;
    }
    if (rows.length < 200) break;
  }
  if (!max) return { action: "skipped", reason: "no valid account_code found" };

  const prop = await SN.TableQuery("sys_properties")
    .where("name=" + PROPERTY)
    .select("sys_id,value")
    .displayValue("false")
    .fetchOne();

  if (!prop) {
    const created = await SN.TableRecord("sys_properties").insert({
      name: PROPERTY, value: max, type: "string", description: "Code used to generate next account code",
    });
    return { action: "created", value: max, sys_id: created.sys_id };
  }
  if (isValid(prop.value) && compare(prop.value, max) >= 0) {
    return { action: "unchanged", value: prop.value, maxSeeded: max };
  }
  await SN.TableRecord("sys_properties").update(prop.sys_id, { value: max });
  return { action: "updated", from: prop.value, to: max };
}

return await run();
