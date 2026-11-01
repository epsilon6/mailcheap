import "server-only";
import { ImapFlow } from "imapflow";
import { getEmailProviderId } from "@/lib/config";
import { connectDb } from "@/lib/db";
import { handleEmailEvent } from "@/lib/email-events";
import { parseBounceReport } from "@/lib/smtp-bounce-rules";
import Message from "@/models/Message";

// Enough for a few minutes of a large send's bounces; the next run takes the rest.
const MAX_REPORTS = 200;
const MAX_REPORT_BYTES = 1024 * 1024;

export function getBounceMailboxConfig(env = process.env) {
	if (!env.BOUNCE_IMAP_HOST || !env.BOUNCE_IMAP_USER) return null;
	return {
		host: env.BOUNCE_IMAP_HOST,
		port: Number(env.BOUNCE_IMAP_PORT) || 993,
		secure: env.BOUNCE_IMAP_SECURE !== "false",
		auth: { user: env.BOUNCE_IMAP_USER, pass: env.BOUNCE_IMAP_PASSWORD ?? "" },
		tls: { rejectUnauthorized: env.BOUNCE_IMAP_TLS_VERIFY !== "false" },
		logger: false,
	};
}

// One report's events, each only for the email it names and only for that email's own recipient: a report someone
// forged can't suppress another contact.
export async function applyBounceEvents(events, { findMessage = defaultFindMessage, handle = handleEmailEvent } = {}) {
	let applied = 0;
	for (const event of events) {
		const message = await findMessage(event);
		if (!message || (event.email && event.email !== String(message.email).toLowerCase())) continue;
		await handle({ ...event, email: message.email, emails: [message.email], providerMessageId: message.providerMessageId ?? undefined });
		applied += 1;
	}
	return applied;
}

async function defaultFindMessage({ accountId, messageId }) {
	return Message.findOne({ accountId, _id: messageId }).select({ email: 1, providerMessageId: 1 }).lean();
}

// Unread reports in the bounce mailbox, marked read once handled. A message that isn't a report is marked read too.
export async function processBounceMailbox({ env = process.env, createClient = (config) => new ImapFlow(config) } = {}) {
	if (getEmailProviderId(env) !== "smtp") return { skipped: "SMTP isn't the email provider" };
	const config = getBounceMailboxConfig(env);
	if (!config) return { skipped: "no bounce mailbox (BOUNCE_IMAP_HOST)" };
	await connectDb();
	const client = createClient(config);
	let reports = 0;
	let events = 0;
	await client.connect();
	const lock = await client.getMailboxLock(env.BOUNCE_IMAP_MAILBOX || "INBOX");
	try {
		const unseen = (await client.search({ seen: false }, { uid: true })) || [];
		for (const uid of unseen.slice(0, MAX_REPORTS)) {
			// Reports put what MailCheap reads at the top; a huge message is only read that far.
			const message = await client.fetchOne(String(uid), { source: { maxLength: MAX_REPORT_BYTES } }, { uid: true });
			const parsed = parseBounceReport(message?.source?.toString("utf8") ?? "");
			events += await applyBounceEvents(parsed);
			await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
			reports += 1;
		}
		return { reports, events, left: Math.max(0, unseen.length - MAX_REPORTS) };
	} finally {
		lock.release();
		await client.logout().catch(() => {});
	}
}
