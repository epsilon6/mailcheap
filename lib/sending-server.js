import "server-only";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { decryptSecret, encryptSecret } from "@/lib/credentials";
import { connectDb } from "@/lib/db";
import { isSendingSetInEnvironment, readSendingServerInput, toSendingEnv } from "@/lib/sending-server-rules";
import { getSmtpConfig } from "@/lib/email-provider/smtp";
import { getBounceMailboxConfig } from "@/lib/smtp-bounces";
import Campaign from "@/models/Campaign";
import SendingServer from "@/models/SendingServer";

const ID = "smtp";
const SECRETS = { smtp: "sending-server:smtp", imap: "sending-server:imap" };
// globalThis, so every bundle of the server (pages, route handlers, jobs) reads the same settings (lib/config.js).
const CACHE = "__mailcheapSendingServer";

function remember(env) {
	globalThis[CACHE] = { env, version: (globalThis[CACHE]?.version ?? 0) + 1, loadedAt: Date.now() };
}

// The saved settings, decrypted, into the cache lib/config.js getSendingEnv reads. At start (instrumentation.js) and
// after every save.
export async function loadSendingServer() {
	await connectDb();
	const saved = await SendingServer.findById(ID).select("+smtp.password +imap.password").lean();
	const decrypt = (value, context) => (value ? decryptSecret(value, { context }) : "");
	const env = saved?.enabled ? toSendingEnv(saved, { smtp: decrypt(saved.smtp?.password, SECRETS.smtp), imap: decrypt(saved.imap?.password, SECRETS.imap) }) : null;
	remember(env);
	return env;
}

// What the admin page shows: no password, only whether one is saved.
export async function readSendingServerForAdmin() {
	await connectDb();
	const saved = await SendingServer.findById(ID).select("+smtp.password +imap.password").lean();
	const { password: smtpPassword, ...smtp } = saved?.smtp ?? {};
	const { password: imapPassword, ...imap } = saved?.imap ?? {};
	return {
		enabled: Boolean(saved?.enabled),
		smtp,
		imap,
		hasSmtpPassword: Boolean(smtpPassword),
		hasImapPassword: Boolean(imapPassword),
		updatedBy: saved?.updatedBy ?? null,
		updatedAt: saved?.updatedAt ?? null,
		isSetInEnvironment: isSendingSetInEnvironment(process.env),
		canEncrypt: Boolean(process.env.CREDENTIALS_ENCRYPTION_KEY),
	};
}

async function readPasswords() {
	const saved = await SendingServer.findById(ID).select("+smtp.password +imap.password").lean();
	return { smtp: saved?.smtp?.password ?? null, imap: saved?.imap?.password ?? null };
}

// Turning SMTP on or off while a campaign sends would split it between two servers.
export async function saveSendingServer(input, { by }) {
	const read = readSendingServerInput(input);
	if (read.error) return { error: read.error };
	const { settings, passwords } = read;
	await connectDb();
	const current = await SendingServer.findById(ID).select({ enabled: 1 }).lean();
	if (Boolean(current?.enabled) !== settings.enabled && (await Campaign.exists({ status: "sending" }).setOptions({ crossAccount: true }))) {
		return { error: "A campaign is sending: switch servers once it's done, or pause it first" };
	}
	const stored = await readPasswords();
	let smtpPassword;
	let imapPassword;
	try {
		smtpPassword = passwords.smtp ? encryptSecret(passwords.smtp, { context: SECRETS.smtp }) : stored.smtp;
		imapPassword = passwords.imap ? encryptSecret(passwords.imap, { context: SECRETS.imap }) : stored.imap;
	} catch (error) {
		// CREDENTIALS_ENCRYPTION_KEY missing or malformed: say so, never the password.
		return { error: error.message };
	}
	if (settings.enabled && settings.smtp.user && !smtpPassword) return { error: "Add the SMTP password" };
	if (settings.enabled && !imapPassword) return { error: "Add the bounce mailbox's password" };
	await SendingServer.updateOne(
		{ _id: ID },
		{ $set: { enabled: settings.enabled, smtp: { ...settings.smtp, password: smtpPassword ?? undefined }, imap: { ...settings.imap, password: imapPassword ?? undefined }, updatedBy: by } },
		{ upsert: true }
	);
	await loadSendingServer();
	return { ok: true };
}

// A login to each server with what the form holds, a blank password meaning the saved one. Nothing is sent.
export async function testSendingServer(input) {
	const read = readSendingServerInput({ ...input, enabled: false });
	if (read.error) return { error: read.error };
	const { settings, passwords } = read;
	await connectDb();
	const stored = await readPasswords();
	const password = (typed, saved, context) => typed || (saved ? decryptSecret(saved, { context }) : "");
	const env = toSendingEnv({ ...settings, enabled: true }, { smtp: password(passwords.smtp, stored.smtp, SECRETS.smtp), imap: password(passwords.imap, stored.imap, SECRETS.imap) }) ?? {};
	const result = {};
	if (settings.smtp.host) {
		const transport = nodemailer.createTransport({ ...getSmtpConfig(env), pool: false, connectionTimeout: 15_000, greetingTimeout: 15_000 });
		try {
			await transport.verify();
			result.smtp = { ok: true, detail: env.SMTP_USER ? "Connected and signed in" : "Connected (no login set)" };
		} catch (error) {
			result.smtp = { ok: false, detail: String(error.response || error.message).slice(0, 200) };
		} finally {
			transport.close();
		}
	}
	const imap = getBounceMailboxConfig(env);
	if (imap) {
		const client = new ImapFlow({ ...imap, socketTimeout: 15_000, greetingTimeout: 15_000 });
		try {
			await client.connect();
			const mailbox = await client.mailboxOpen(env.BOUNCE_IMAP_MAILBOX || "INBOX", { readOnly: true });
			result.imap = { ok: true, detail: `Signed in: ${mailbox.exists} messages in ${mailbox.path}` };
		} catch (error) {
			result.imap = { ok: false, detail: String(error.responseText || error.message).slice(0, 200) };
		} finally {
			await client.logout().catch(() => {});
		}
	}
	return result;
}
