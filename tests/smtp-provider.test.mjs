import assert from "node:assert/strict";
import { test } from "node:test";
import { getEmailProviderId } from "../lib/config.js";
import { classifySmtpError, createSmtpProvider, getSmtpConfig, smtpMessageId } from "../lib/email-provider/smtp.js";
import { applyBounceEvents } from "../lib/smtp-bounces.js";
import { parseBounceReport } from "../lib/smtp-bounce-rules.js";

const accountId = "6ae6aa01c06d22a222014801";
const messageId = "6ae6aa01c06d22a222014802";
const message = { _id: messageId, accountId, email: "reader@example.com" };
const email = { from: "News <news@example.com>", to: "reader@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi", headers: { "List-Unsubscribe": "<https://example.com/u>" } };

function fakeTransport(result) {
	const sent = [];
	return { sent, createTransport: () => ({ sendMail: async (mail) => (sent.push(mail), typeof result === "function" ? result() : result) }) };
}

test("smtp is a self-hosted choice only, picked explicitly", () => {
	assert.equal(getEmailProviderId({ EMAIL_PROVIDER: "smtp" }), "smtp");
	assert.equal(getEmailProviderId({ EMAIL_PROVIDER: "smtp", MAILCHEAP_CLOUD: "true" }), null);
	assert.equal(getEmailProviderId({ SMTP_HOST: "mail.example.com" }), "ses", "an SMTP host alone doesn't switch providers");
});

test("port 587 requires STARTTLS, port 465 is implicit TLS, and certificates are checked unless turned off", () => {
	assert.deepEqual([getSmtpConfig({ SMTP_HOST: "h" }).secure, getSmtpConfig({ SMTP_HOST: "h" }).requireTLS], [false, true]);
	assert.equal(getSmtpConfig({ SMTP_PORT: "465" }).secure, true);
	assert.equal(getSmtpConfig({}).tls.rejectUnauthorized, true);
	assert.equal(getSmtpConfig({ SMTP_TLS_VERIFY: "false" }).tls.rejectUnauthorized, false);
});

test("an email carries MailCheap's ids, the feedback id, inline images and the bounce address as its envelope", async () => {
	const { sent, createTransport } = fakeTransport({ accepted: ["reader@example.com"], rejected: [] });
	const provider = createSmtpProvider({ env: { SMTP_HOST: "h", SMTP_BOUNCE_ADDRESS: "bounces@example.com" }, createTransport });
	const attachments = [{ RawContent: new Uint8Array([1, 2]), ContentType: "image/png", FileName: "image-a.png", ContentId: "image-a" }];
	const { providerMessageId } = await provider.sendEmail({ message, email: { ...email, attachments }, feedbackId: "f" });
	assert.equal(providerMessageId, `<${messageId}.${accountId}@example.com>`);
	assert.equal(sent[0].messageId, smtpMessageId(message, email.from));
	assert.equal(sent[0].headers["X-MailCheap-Message"], `${accountId}.${messageId}`);
	assert.equal(sent[0].headers["Feedback-ID"], "f");
	assert.deepEqual(sent[0].envelope, { from: "bounces@example.com", to: "reader@example.com" });
	assert.equal(sent[0].attachments[0].cid, "image-a");
	assert.equal(provider.supportsInlineImages, true);
});

test("a recipient the server refuses is a hard bounce, recorded and then skipped", async () => {
	const recorded = [];
	const refusal = Object.assign(new Error("550 5.1.1 no such user"), { code: "EENVELOPE", responseCode: 550, rejected: ["reader@example.com"], response: "550 5.1.1 no such user" });
	const provider = createSmtpProvider({ env: { SMTP_HOST: "h" }, createTransport: () => ({ sendMail: async () => { throw refusal; } }), recordBounce: async (event) => recorded.push(event) });
	await assert.rejects(provider.sendEmail({ message, email, feedbackId: "f" }), (error) => error.outcome === "suppressed");
	assert.equal(recorded.length, 1);
	assert.deepEqual([recorded[0].type, recorded[0].bounce, recorded[0].email], ["bounce", "hard", "reader@example.com"]);
});

test("refusals map to what the send does next", () => {
	assert.equal(classifySmtpError({ code: "EAUTH", responseCode: 535 }).outcome, "misconfigured");
	assert.equal(classifySmtpError({ responseCode: 421 }).outcome, "throttled");
	assert.equal(classifySmtpError({ code: "ECONNECTION" }).outcome, "unavailable");
	assert.equal(classifySmtpError({ code: "EMESSAGE", responseCode: 554 }).outcome, "failed");
});

test("a domain is verified by its SPF record and the DKIM key at the configured selector", async () => {
	const dns = { "example.com": [["v=spf1 mx ~all"]], "mail._domainkey.example.com": [["v=DKIM1; k=rsa; p=MIIB"]] };
	const lookupTxt = async (name) => {
		if (dns[name]) return dns[name];
		throw Object.assign(new Error("none"), { code: "ENOTFOUND" });
	};
	const provider = createSmtpProvider({ env: { SMTP_HOST: "h", SMTP_DKIM_SELECTOR: "mail" }, lookupTxt });
	const status = await provider.readDomain({ domain: { domain: "example.com" } });
	assert.equal(status.verified, true);
	assert.equal(status.records.find(({ purpose }) => purpose === "dkim").value, "v=DKIM1; k=rsa; p=MIIB");
	const unsigned = createSmtpProvider({ env: { SMTP_HOST: "h" }, lookupTxt });
	assert.equal((await unsigned.readDomain({ domain: { domain: "example.com" } })).verified, false, "without DKIM a domain doesn't send");
});

const dsn = (status, action = "failed", extra = "") => `From: MAILER-DAEMON@mail.example.net
Content-Type: multipart/report; report-type=delivery-status; boundary="b"

--b
Content-Type: message/delivery-status

Reporting-MTA: dns; mail.example.net

Final-Recipient: rfc822; reader@example.com
Action: ${action}
Status: ${status}
Diagnostic-Code: smtp; 550 5.1.1 user unknown${extra}

--b
Content-Type: text/rfc822-headers

Message-ID: <${messageId}.${accountId}@example.com>
X-MailCheap-Message: ${accountId}.${messageId}
--b--
`;

test("delivery reports become hard bounces, soft bounces and deferrals", () => {
	assert.deepEqual(parseBounceReport(dsn("5.1.1")).map(({ type, bounce, email, accountId: a, messageId: m }) => ({ type, bounce, email, a, m })), [
		{ type: "bounce", bounce: "hard", email: "reader@example.com", a: accountId, m: messageId },
	]);
	assert.equal(parseBounceReport(dsn("4.2.2")).at(0).bounce, "soft");
	assert.equal(parseBounceReport(dsn("4.4.1", "delayed")).at(0).type, "deferred");
	assert.deepEqual(parseBounceReport("Subject: hello\n\nNot a report"), []);
});

test("a report can't name a spam trap, and a complaint report is a complaint", () => {
	assert.doesNotMatch(parseBounceReport(dsn("5.7.1", "failed", " spam trap hit")).at(0).reason, /spam\s?trap/i);
	const arf = `Content-Type: multipart/report; report-type=feedback-report; boundary="b"\n\n--b\nContent-Type: message/feedback-report\n\nFeedback-Type: abuse\nOriginal-Rcpt-To: reader@example.com\n\n--b\nContent-Type: text/rfc822-headers\n\nX-MailCheap-Message: ${accountId}.${messageId}\n--b--\n`;
	assert.deepEqual(parseBounceReport(arf).map(({ type, email }) => ({ type, email })), [{ type: "complaint", email: "reader@example.com" }]);
});

test("a report only ever applies to its own email's recipient", async () => {
	const handled = [];
	const findMessage = async () => ({ email: "reader@example.com" });
	const handle = async (event) => handled.push(event);
	await applyBounceEvents([{ type: "bounce", bounce: "hard", accountId, messageId, email: "someone-else@example.com" }], { findMessage, handle });
	assert.equal(handled.length, 0, "a forged report naming another address does nothing");
	await applyBounceEvents([{ type: "bounce", bounce: "hard", accountId, messageId, email: "READER@example.com".toLowerCase() }], { findMessage, handle });
	assert.deepEqual(handled[0].emails, ["reader@example.com"]);
	await applyBounceEvents([{ type: "bounce", accountId, messageId }], { findMessage: async () => null, handle });
	assert.equal(handled.length, 1, "an unknown email is ignored");
});
