// Post-deploy: the From name shown in the Email Client compose dialog.
//
// The From dropdown ("IT Service Desk <opmsalescrmstage@service-now.com>") is built from
// the "ServiceNow SMTP" sys_email_account, field email_user_label, not from the
// glide.email.username property (UPDATE-026 sets that one too, for outbound mail headers).
//
// sys_email_account is not Update Set tracked and its sys_id is created per instance at
// provisioning (opmsalescrmstage 75da9bf5...ac0), and it holds credentials, so it is set by
// name here. Found 2026-10-16 on opmsalescrmstage.
//
// Idempotent: only writes when the label differs. Does nothing if the account is missing.
// Run with the `execute` MCP tool against the target instance, after the Update Sets.

const LABEL = "Solana Sales & Service";

async function run() {
  const acct = await SN.TableQuery("sys_email_account")
    .where("name=ServiceNow SMTP")
    .select("sys_id,email_user_label")
    .displayValue("false")
    .fetchOne();

  if (!acct) return { action: "skipped", reason: "no 'ServiceNow SMTP' email account on this instance" };
  if (acct.email_user_label === LABEL) return { action: "unchanged", sys_id: acct.sys_id };

  await SN.TableRecord("sys_email_account").update(acct.sys_id, { email_user_label: LABEL });
  return { action: "updated", sys_id: acct.sys_id, from: acct.email_user_label };
}

return await run();
