import "server-only";
import { resolveTxt } from "node:dns/promises";
import nodemailer from "nodemailer";
import { LIMITS, getSendingEnv } from "@/lib/config";
import { providerError, SEND_OUTCOMES } from "@/lib/email-provider/outcomes";

// A self-hosted server's own SMTP server or relay. It has no tenants or domain API: MailCheap's own suppressions and
// pauses hold each account, its DNS lookups verify a domain, and bounces come back as rejections while sending and as
// bounce reports in a mailbox (lib/smtp-bounces.js). MailCheap Cloud never uses it (lib/config.js).
const TENANT = Object.freeze({ id: "smtp" });
const RETRY_CODES = new Set(["ECONNECTION", "ETIMEDOUT", "ESOCKET", "EDNS", "ECONNRESET", "ECONNREFUSED", "EPROTOCOL"]);

export function getSmtpConfig(env = process.env) {
	const port = Number(env.SMTP_PORT) || 587;
	const secure = env.SMTP_SECURE ? env.SMTP_SECURE === "true" : port === 465;
	return {
		host: env.SMTP_HOST,
		port,
		secure,
		// Port 587 servers announce STARTTLS; refusing to go on without it keeps the login off the wire.
		requireTLS: !secure && env.SMTP_STARTTLS !== "false",
		auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD ?? "" } : undefined,
		name: env.SMTP_HELO || undefined,
		pool: true,
		maxConnections: Number(env.SMTP_MAX_CONNECTIONS) || 5,
		connectionTimeout: 30_000,
		greetingTimeout: 30_000,
		socketTimeout: 60_000,
		tls: { rejectUnauthorized: env.SMTP_TLS_VERIFY !== "false" },
	};
}

function domainOf(address) {
	return String(address ?? "").replace(/^.*</, "").replace(/>.*$/, "").split("@").pop().trim().toLowerCase();
}

// MailCheap's ids in the Message-ID, so a bounce report that quotes it finds the email again.
export function smtpMessageId(message, fromAddress) {
	return `<${message._id}.${message.accountId}@${domainOf(fromAddress) || "mailcheap.invalid"}>`;
}

function toAttachments(attachments = []) {
	return attachments.map((part) => ({
		filename: part.FileName,
		content: Buffer.from(part.RawContent),
		contentType: part.ContentType,
		cid: part.ContentId,
		contentDisposition: "inline",
	}));
}

function dkimFor(fromAddress, env) {
	if (!env.SMTP_DKIM_PRIVATE_KEY || !env.SMTP_DKIM_SELECTOR) return undefined;
	return { domainName: domainOf(fromAddress), keySelector: env.SMTP_DKIM_SELECTOR, privateKey: env.SMTP_DKIM_PRIVATE_KEY.replace(/\\n/g, "\n") };
}

// What a refusal means for the send (./outcomes.js). A recipient the server refuses outright is a hard bounce.
export function classifySmtpError(error) {
	const code = Number(error?.responseCode) || 0;
	const reason = String(error?.response || error?.message || "SMTP error").slice(0, 300);
	if (error?.code === "EAUTH" || [530, 534, 535].includes(code)) {
		return { outcome: SEND_OUTCOMES.misconfigured, reason: `The SMTP server refused MailCheap's login: ${reason}` };
	}
	if (code >= 400 && code < 500) return { outcome: SEND_OUTCOMES.throttled, reason };
	if (!code && (RETRY_CODES.has(error?.code) || !error?.code)) return { outcome: SEND_OUTCOMES.unavailable, reason };
	if (code >= 500 && error?.code === "EENVELOPE" && error?.rejected?.length) return { outcome: SEND_OUTCOMES.suppressed, reason, isBounce: true };
	return { outcome: SEND_OUTCOMES.failed, reason };
}

export function createSmtpProvider({ env = process.env, createTransport = (options) => nodemailer.createTransport(options), recordBounce, lookupTxt = resolveTxt } = {}) {
	let transport;
	const getTransport = () => (transport ??= createTransport(getSmtpConfig(env)));

	async function send(mail) {
		try {
			return await getTransport().sendMail(mail);
		} catch (error) {
			const { outcome, reason, isBounce } = classifySmtpError(error);
			throw providerError(outcome, reason, { isBounce, smtpCode: error?.responseCode });
		}
	}

	async function sendEmail({ message, email, feedbackId }) {
		const messageId = smtpMessageId(message, email.from);
		const mail = {
			from: email.from,
			to: email.to,
			replyTo: email.replyTo,
			subject: email.subject,
			html: email.html,
			text: email.text,
			messageId,
			headers: { ...email.headers, "Feedback-ID": feedbackId, "X-MailCheap-Message": `${message.accountId}.${message._id}` },
			attachments: toAttachments(email.attachments),
			dkim: dkimFor(email.from, env),
			// Bounce reports go to the bounce mailbox when there is one, whatever the from address.
			...(env.SMTP_BOUNCE_ADDRESS && { envelope: { from: env.SMTP_BOUNCE_ADDRESS, to: email.to } }),
		};
		try {
			const info = await send(mail);
			if (info?.rejected?.length) throw providerError(SEND_OUTCOMES.suppressed, String(info.response ?? "Recipient refused"), { isBounce: true });
		} catch (error) {
			if (error.isBounce && recordBounce) {
				// Counted like a provider's bounce: the contact is suppressed and the account's rates see it.
				await recordBounce({ type: "bounce", bounce: "hard", accountId: message.accountId, messageId: message._id, email: message.email, reason: error.message, occurredAt: new Date() });
			}
			throw error;
		}
		return { providerMessageId: messageId };
	}

	async function sendPlatformEmail({ from, to, subject, text, html, headers, replyTo }) {
		await send({ from, to, replyTo, subject, text, html, headers, dkim: dkimFor(from, env) });
	}

	async function readTxt(name) {
		try {
			return (await lookupTxt(name)).map((parts) => parts.join(""));
		} catch (error) {
			if (["ENOTFOUND", "ENODATA", "ENOTIMP"].includes(error?.code)) return [];
			throw error;
		}
	}

	// MailCheap's own look at DNS: SPF on the domain, and the DKIM key at the selector the mail server signs with.
	async function readDomain({ domain }) {
		const name = domain.domain;
		const selector = env.SMTP_DKIM_SELECTOR;
		try {
			const [spf, dkim] = await Promise.all([readTxt(name), selector ? readTxt(`${selector}._domainkey.${name}`) : []]);
			const spfRecord = spf.find((text) => /^v=spf1\b/i.test(text));
			const dkimRecord = dkim.find((text) => /\bp=\S/.test(text));
			const records = [{ purpose: "mail-from", type: "TXT", name, value: env.SMTP_SPF_RECORD || "v=spf1 mx ~all" }];
			if (selector) records.unshift({ purpose: "dkim", type: "TXT", name: `${selector}._domainkey.${name}`, value: dkimRecord ?? "v=DKIM1; k=rsa; p=<your mail server's public key>" });
			return {
				verified: Boolean(spfRecord && dkimRecord),
				dkimStatus: dkimRecord ? "SUCCESS" : "PENDING",
				mailFromStatus: spfRecord ? "SUCCESS" : "PENDING",
				records,
			};
		} catch (error) {
			return { error: error.message };
		}
	}

	return Object.freeze({
		id: "smtp",
		name: "SMTP server",
		returnPathPrefix: null,
		supportsInlineImages: true,
		isConfigured: () => Boolean(env.SMTP_HOST),
		sendPlatformEmail,
		getTenant: () => TENANT,
		provisionTenant: async () => TENANT,
		ensureTenant: async () => TENANT,
		suspendTenant: async () => {},
		resumeTenant: async () => false,
		describeTenant: () => null,
		removeTenant: async () => {},
		getMailFromDomain: (domain) => domain,
		addDomain: async () => ({ providerDomainId: null }),
		readDomain,
		removeDomain: async () => {},
		getSendLane: () => ({ name: "smtp", rate: Number(env.SMTP_RATE_PER_SECOND) || LIMITS.sendRatePerSecond }),
		sendEmail,
	});
}

// Built again when an admin saves new settings (lib/sending-server.js), so the next email uses them.
let built;
export function getSmtpProvider() {
	const version = globalThis.__mailcheapSendingServer?.version ?? 0;
	if (built?.version !== version) {
		built = {
			version,
			provider: createSmtpProvider({
				env: getSendingEnv(),
				recordBounce: async (event) => (await import("@/lib/email-events")).handleEmailEvent(event),
			}),
		};
	}
	return built.provider;
}
