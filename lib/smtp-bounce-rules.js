// Bounce and complaint reports that come back to a self-hosted mail server's bounce mailbox (lib/smtp-bounces.js), read
// into the events every provider's come in (lib/email-event-rules.js). Delivery reports (RFC 3464) name each recipient
// with its action and status; feedback reports (RFC 5965) are spam complaints. The email they're about is found by
// MailCheap's ids, which every email carries in its Message-ID and X-MailCheap-Message header.
const IDS = /X-MailCheap-Message:\s*([a-f0-9]{24})\.([a-f0-9]{24})/i;
const MESSAGE_ID = /Message-ID:\s*<([a-f0-9]{24})\.([a-f0-9]{24})@/i;

// Anyone can write to a bounce mailbox, and a bounce that names a spam trap blocks the account
// (lib/email-event-rules.js). Only a server's answer while sending is trusted with that.
const TRAP_WORDS = /spam[\s_-]?trap|honey[\s_-]?pot/gi;

function unfold(raw) {
	return String(raw ?? "").replace(/\r\n/g, "\n").replace(/\n[ \t]+/g, " ");
}

function field(block, name) {
	return block.match(new RegExp(`^${name}:\\s*(.+)$`, "im"))?.[1]?.trim() ?? null;
}

function findIds(text) {
	const [, accountId, messageId] = text.match(IDS) ?? [];
	if (accountId) return { accountId, messageId };
	// The Message-ID is <message.account@domain>, the other way round.
	const [, byMessage, byAccount] = text.match(MESSAGE_ID) ?? [];
	return byMessage ? { accountId: byAccount, messageId: byMessage } : null;
}

function recipientOf(value) {
	return value?.replace(/^[^;]*;\s*/, "").replace(/[<>]/g, "").trim().toLowerCase() || null;
}

// The events one report holds, each with MailCheap's ids, or [] for mail that isn't a report about one of its emails.
export function parseBounceReport(raw, { now = new Date() } = {}) {
	const text = unfold(raw);
	const ids = findIds(text);
	if (!ids) return [];
	const reportType = text.match(/report-type\s*=\s*"?([a-z-]+)/i)?.[1]?.toLowerCase();

	if (reportType === "feedback-report" || /^Feedback-Type:/im.test(text)) {
		const feedback = field(text, "Feedback-Type")?.toLowerCase() ?? "abuse";
		const email = recipientOf(field(text, "Original-Rcpt-To") ?? field(text, "Removal-Recipient"));
		return [{ type: "complaint", feedback, ...ids, email, occurredAt: now }];
	}
	if (reportType !== "delivery-status") return [];

	// Per-recipient fields follow a blank line after the per-message ones; each recipient has its own block.
	return text
		.split(/\n\s*\n/)
		.filter((block) => /^Final-Recipient:/im.test(block) && /^Action:/im.test(block))
		.map((block) => {
			const action = field(block, "Action").toLowerCase();
			const status = field(block, "Status") ?? "";
			const reason = (field(block, "Diagnostic-Code")?.replace(/^smtp;\s*/i, "") ?? status).replace(TRAP_WORDS, "[policy]").slice(0, 300);
			const email = recipientOf(field(block, "Original-Recipient") ?? field(block, "Final-Recipient"));
			if (action === "failed" && status.startsWith("5")) return { type: "bounce", bounce: "hard", ...ids, email, reason, occurredAt: now };
			if (action === "failed" || action === "delayed") return { type: action === "delayed" ? "deferred" : "bounce", bounce: "soft", ...ids, email, reason, occurredAt: now };
			return null;
		})
		.filter(Boolean);
}
