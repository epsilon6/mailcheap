// The SMTP server and bounce mailbox an admin sets on /admin (lib/sending-server.js), checked here and turned into the
// same settings the environment gives (.env.example), so lib/email-provider/smtp.js and lib/smtp-bounces.js read one
// shape. The environment wins: with SMTP_HOST or EMAIL_PROVIDER set there, the page only shows what it would set.
const HOST = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/i;
const ADDRESS = /^[^\s@<>()",;:]{1,64}@[a-z0-9.-]{1,253}\.[a-z]{2,63}$/i;
const SELECTOR = /^[a-z0-9](?:[a-z0-9._-]{0,61}[a-z0-9])?$/i;
const SECURITY = ["starttls", "tls", "none"];

function text(value, max) {
	return String(value ?? "").trim().slice(0, max);
}

function whole(value, min, max, fallback) {
	if (value === "" || value === null || value === undefined) return fallback;
	const number = Number(value);
	return Number.isInteger(number) && number >= min && number <= max ? number : NaN;
}

// { settings } to save, or { error } for the first field that's wrong. Passwords come back apart: blank keeps the saved one.
export function readSendingServerInput(input = {}) {
	const smtp = input.smtp ?? {};
	const imap = input.imap ?? {};
	const settings = {
		enabled: input.enabled === true,
		smtp: {
			host: text(smtp.host, 253).toLowerCase(),
			port: whole(smtp.port, 1, 65535, 587),
			security: SECURITY.includes(smtp.security) ? smtp.security : "starttls",
			user: text(smtp.user, 320),
			helo: text(smtp.helo, 253).toLowerCase(),
			maxConnections: whole(smtp.maxConnections, 1, 50, 5),
			ratePerSecond: whole(smtp.ratePerSecond, 0, 1000, 0),
			bounceAddress: text(smtp.bounceAddress, 320).toLowerCase(),
			dkimSelector: text(smtp.dkimSelector, 63),
			spfRecord: text(smtp.spfRecord, 255) || "v=spf1 mx ~all",
			tlsVerify: smtp.tlsVerify !== false,
		},
		imap: {
			host: text(imap.host, 253).toLowerCase(),
			port: whole(imap.port, 1, 65535, 993),
			secure: imap.secure !== false,
			user: text(imap.user, 320),
			mailbox: text(imap.mailbox, 200) || "INBOX",
			tlsVerify: imap.tlsVerify !== false,
		},
	};
	const passwords = { smtp: typeof smtp.password === "string" ? smtp.password.slice(0, 500) : "", imap: typeof imap.password === "string" ? imap.password.slice(0, 500) : "" };
	const { smtp: s, imap: i } = settings;
	const problem =
		(settings.enabled && !s.host && "Add the SMTP server's host to send through it") ||
		(s.host && !HOST.test(s.host) && "The SMTP host is a hostname, like mail.example.com") ||
		(Number.isNaN(s.port) && "The SMTP port is a number from 1 to 65535") ||
		(s.helo && !HOST.test(s.helo) && "The HELO name is a hostname, like news.example.com") ||
		(Number.isNaN(s.maxConnections) && "Connections are a whole number from 1 to 50") ||
		(Number.isNaN(s.ratePerSecond) && "The rate is a whole number of emails a second, up to 1,000, or empty") ||
		(s.bounceAddress && !ADDRESS.test(s.bounceAddress) && "The bounce address is an email address") ||
		(s.dkimSelector && !SELECTOR.test(s.dkimSelector) && "The DKIM selector is letters, digits, dots, dashes or underscores") ||
		(!/^v=spf1\b/i.test(s.spfRecord) && "The SPF record starts with v=spf1") ||
		(settings.enabled && !s.dkimSelector && "Add the DKIM selector your server signs with: inboxes need DKIM") ||
		(i.host && !HOST.test(i.host) && "The IMAP host is a hostname, like mail.example.com") ||
		(Number.isNaN(i.port) && "The IMAP port is a number from 1 to 65535") ||
		(i.host && !i.user && "Add the bounce mailbox's login") ||
		(settings.enabled && !i.host && "Add the bounce mailbox: without it, bounced addresses keep getting mail") ||
		null;
	return problem ? { error: problem } : { settings, passwords };
}

// The saved settings, passwords decrypted, as environment variables.
export function toSendingEnv(saved, passwords = {}) {
	if (!saved?.enabled || !saved.smtp?.host) return null;
	const { smtp, imap = {} } = saved;
	const env = {
		EMAIL_PROVIDER: "smtp",
		SMTP_HOST: smtp.host,
		SMTP_PORT: String(smtp.port ?? 587),
		SMTP_SECURE: String(smtp.security === "tls"),
		SMTP_STARTTLS: String(smtp.security !== "none"),
		SMTP_USER: smtp.user || "",
		SMTP_PASSWORD: passwords.smtp || "",
		SMTP_HELO: smtp.helo || "",
		SMTP_MAX_CONNECTIONS: String(smtp.maxConnections ?? 5),
		SMTP_RATE_PER_SECOND: smtp.ratePerSecond ? String(smtp.ratePerSecond) : "",
		SMTP_BOUNCE_ADDRESS: smtp.bounceAddress || "",
		SMTP_DKIM_SELECTOR: smtp.dkimSelector || "",
		SMTP_SPF_RECORD: smtp.spfRecord || "v=spf1 mx ~all",
		SMTP_TLS_VERIFY: String(smtp.tlsVerify !== false),
	};
	if (imap.host) {
		Object.assign(env, {
			BOUNCE_IMAP_HOST: imap.host,
			BOUNCE_IMAP_PORT: String(imap.port ?? 993),
			BOUNCE_IMAP_SECURE: String(imap.secure !== false),
			BOUNCE_IMAP_USER: imap.user || "",
			BOUNCE_IMAP_PASSWORD: passwords.imap || "",
			BOUNCE_IMAP_MAILBOX: imap.mailbox || "INBOX",
			BOUNCE_IMAP_TLS_VERIFY: String(imap.tlsVerify !== false),
		});
	}
	return env;
}

// The environment's own SMTP or provider choice overrides the page.
export function isSendingSetInEnvironment(env) {
	return Boolean(env.SMTP_HOST || env.EMAIL_PROVIDER);
}
