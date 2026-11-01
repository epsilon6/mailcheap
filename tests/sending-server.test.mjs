import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getEmailProviderId, getSendingEnv } from "../lib/config.js";
import { getSmtpProvider } from "../lib/email-provider/smtp.js";
import { isSendingSetInEnvironment, readSendingServerInput, toSendingEnv } from "../lib/sending-server-rules.js";

const complete = {
	enabled: true,
	smtp: { host: "Mail.Example.com", port: "587", security: "starttls", user: "news@example.com", password: "secret", dkimSelector: "default", bounceAddress: "bounces@example.com" },
	imap: { host: "mail.example.com", port: "993", user: "bounces@example.com", password: "other" },
};

afterEach(() => {
	delete globalThis.__mailcheapSendingServer;
});

test("the form's settings are checked, and passwords come back apart from them", () => {
	const { settings, passwords } = readSendingServerInput(complete);
	assert.equal(settings.smtp.host, "mail.example.com");
	assert.equal(settings.smtp.port, 587);
	assert.equal(settings.smtp.password, undefined, "a password never sits in the settings");
	assert.deepEqual(passwords, { smtp: "secret", imap: "other" });
});

test("turning SMTP on needs a host, a DKIM selector and a bounce mailbox, and odd values are refused", () => {
	assert.match(readSendingServerInput({ ...complete, smtp: { ...complete.smtp, host: "" } }).error, /host/);
	assert.match(readSendingServerInput({ ...complete, smtp: { ...complete.smtp, dkimSelector: "" } }).error, /DKIM/);
	assert.match(readSendingServerInput({ ...complete, imap: {} }).error, /bounce mailbox/);
	assert.match(readSendingServerInput({ ...complete, smtp: { ...complete.smtp, host: "mail.example.com; rm -rf /" } }).error, /hostname/);
	assert.match(readSendingServerInput({ ...complete, smtp: { ...complete.smtp, port: "70000" } }).error, /port/);
	assert.match(readSendingServerInput({ ...complete, smtp: { ...complete.smtp, spfRecord: "include:evil" } }).error, /v=spf1/);
	assert.ok(readSendingServerInput({ enabled: false }).settings, "an empty form that leaves SMTP off saves");
});

test("saved settings become the same environment the server would read", () => {
	const { settings } = readSendingServerInput({ ...complete, smtp: { ...complete.smtp, security: "tls", port: "465" } });
	const env = toSendingEnv(settings, { smtp: "secret", imap: "other" });
	assert.equal(env.EMAIL_PROVIDER, "smtp");
	assert.equal(env.SMTP_SECURE, "true");
	assert.equal(env.SMTP_PASSWORD, "secret");
	assert.equal(env.BOUNCE_IMAP_PASSWORD, "other");
	assert.equal(toSendingEnv({ ...settings, enabled: false }), null, "off means no settings at all");
});

test("the saved server picks the provider unless the environment picks one, and never on MailCheap Cloud", () => {
	const saved = { EMAIL_PROVIDER: "smtp", SMTP_HOST: "mail.example.com" };
	globalThis.__mailcheapSendingServer = { env: saved, version: 1 };
	const { EMAIL_PROVIDER, SMTP_HOST, MAILCHEAP_CLOUD } = process.env;
	delete process.env.EMAIL_PROVIDER;
	delete process.env.SMTP_HOST;
	try {
		assert.equal(getSendingEnv().SMTP_HOST, "mail.example.com");
		assert.equal(getEmailProviderId(), "smtp");
		process.env.EMAIL_PROVIDER = "ses";
		assert.equal(getEmailProviderId(), "ses", "the environment wins");
		assert.equal(isSendingSetInEnvironment(process.env), true);
		delete process.env.EMAIL_PROVIDER;
		process.env.MAILCHEAP_CLOUD = "true";
		assert.equal(getEmailProviderId(), null, "Cloud refuses smtp, however it's set");
	} finally {
		for (const [name, value] of Object.entries({ EMAIL_PROVIDER, SMTP_HOST, MAILCHEAP_CLOUD })) {
			if (value === undefined) delete process.env[name];
			else process.env[name] = value;
		}
	}
});

test("the SMTP provider is built again when new settings are saved", () => {
	globalThis.__mailcheapSendingServer = { env: { EMAIL_PROVIDER: "smtp", SMTP_HOST: "one.example.com" }, version: 1 };
	const first = getSmtpProvider();
	assert.equal(getSmtpProvider(), first, "the same settings keep the same connection pool");
	globalThis.__mailcheapSendingServer = { env: { EMAIL_PROVIDER: "smtp", SMTP_HOST: "two.example.com" }, version: 2 };
	assert.notEqual(getSmtpProvider(), first);
});
