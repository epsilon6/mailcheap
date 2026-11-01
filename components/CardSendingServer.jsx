"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, PlugZap, XCircle } from "lucide-react";
import { saveSendingServerAction, testSendingServerAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast";

const SECURITY = [
	["starttls", "STARTTLS (port 587)"],
	["tls", "SSL/TLS (port 465)"],
	["none", "None (not recommended)"],
];

// The SMTP server and bounce mailbox a self-hosted server sends through (lib/sending-server.js). Passwords are write
// only: the page never gets them back, and an empty field keeps the saved one.
export default function CardSendingServer({ server, provider }) {
	const [enabled, setEnabled] = useState(server.enabled);
	const [smtp, setSmtp] = useState({ port: 587, security: "starttls", maxConnections: 5, spfRecord: "v=spf1 mx ~all", tlsVerify: true, ...server.smtp, password: "" });
	const [imap, setImap] = useState({ port: 993, secure: true, mailbox: "INBOX", tlsVerify: true, ...server.imap, password: "" });
	const [results, setResults] = useState(null);
	const [isSaving, startSaving] = useTransition();
	const [isTesting, startTesting] = useTransition();
	const values = () => ({ enabled, smtp, imap });
	const setSmtpField = (name) => (event) => setSmtp({ ...smtp, [name]: event.target.type === "checkbox" ? event.target.checked : event.target.value });
	const setImapField = (name) => (event) => setImap({ ...imap, [name]: event.target.type === "checkbox" ? event.target.checked : event.target.value });

	function save(event) {
		event.preventDefault();
		startSaving(async () => {
			const answer = await saveSendingServerAction(values());
			if (answer?.error) return void toast.error(answer.error);
			setSmtp({ ...smtp, password: "" });
			setImap({ ...imap, password: "" });
			toast.success(enabled ? "Saved: new emails go through this SMTP server" : "Saved");
		});
	}

	function test() {
		startTesting(async () => {
			const answer = await testSendingServerAction(values());
			if (answer?.error) return void toast.error(answer.error);
			setResults(answer);
		});
	}

	if (server.isSetInEnvironment) {
		return (
			<div className="rounded-xl bg-card p-4 text-sm text-pretty text-muted-foreground shadow-border">
				The environment sets the email provider (EMAIL_PROVIDER or SMTP_HOST), and it wins over this page. Remove them there to
				set the SMTP server here.
			</div>
		);
	}

	return (
		<form onSubmit={save} className="flex flex-col gap-5 rounded-xl bg-card p-4 shadow-border">
			<div className="flex items-start justify-between gap-4">
				<div className="flex min-w-0 flex-col gap-1">
					<p className="text-sm font-medium">Send through your own SMTP server</p>
					<p className="text-xs text-pretty text-muted-foreground">
						Sending now: {provider === "smtp" ? "this SMTP server" : provider === "ses" ? "Amazon SES" : provider === "postshiba" ? "PostShiba" : "no provider"}. Every
						account sends through it. Bounce reports are read from the bounce mailbox every few minutes.
					</p>
				</div>
				<Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Send through this SMTP server" />
			</div>
			{!server.canEncrypt && (
				<p className="rounded-lg bg-muted px-3 py-2 text-xs text-pretty">
					Set CREDENTIALS_ENCRYPTION_KEY (openssl rand -base64 32) to save passwords: they&apos;re stored encrypted.
				</p>
			)}

			<fieldset className="grid gap-3 sm:grid-cols-6">
				<legend className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">SMTP server</legend>
				<Field label="Host" className="sm:col-span-4"><Input value={smtp.host ?? ""} onChange={setSmtpField("host")} placeholder="mail.example.com" autoComplete="off" spellCheck={false} /></Field>
				<Field label="Port" className="sm:col-span-2"><Input type="number" min={1} max={65535} value={smtp.port ?? ""} onChange={setSmtpField("port")} /></Field>
				<Field label="Encryption" className="sm:col-span-2">
					<select value={smtp.security} onChange={setSmtpField("security")} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
						{SECURITY.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
					</select>
				</Field>
				<Field label="Username" className="sm:col-span-2"><Input value={smtp.user ?? ""} onChange={setSmtpField("user")} autoComplete="off" spellCheck={false} /></Field>
				<Field label="Password" className="sm:col-span-2" hint={server.hasSmtpPassword ? "Saved. Type to change it." : undefined}>
					<Input type="password" value={smtp.password} onChange={setSmtpField("password")} placeholder={server.hasSmtpPassword ? "••••••••" : ""} autoComplete="new-password" />
				</Field>
				<Field label="HELO hostname" className="sm:col-span-3" hint="Some servers want a real hostname"><Input value={smtp.helo ?? ""} onChange={setSmtpField("helo")} placeholder="news.example.com" spellCheck={false} /></Field>
				<Field label="DKIM selector" className="sm:col-span-3" hint="A domain sends once its key is in DNS"><Input value={smtp.dkimSelector ?? ""} onChange={setSmtpField("dkimSelector")} placeholder="default" spellCheck={false} /></Field>
				<Field label="Bounce address" className="sm:col-span-3" hint="Bounce reports go here"><Input type="email" value={smtp.bounceAddress ?? ""} onChange={setSmtpField("bounceAddress")} placeholder="bounces@example.com" spellCheck={false} /></Field>
				<Field label="SPF record to suggest" className="sm:col-span-3"><Input value={smtp.spfRecord ?? ""} onChange={setSmtpField("spfRecord")} spellCheck={false} /></Field>
				<Field label="Max connections" className="sm:col-span-2"><Input type="number" min={1} max={50} value={smtp.maxConnections ?? ""} onChange={setSmtpField("maxConnections")} /></Field>
				<Field label="Emails a second" className="sm:col-span-2" hint="Empty: the default rate"><Input type="number" min={0} max={1000} value={smtp.ratePerSecond || ""} onChange={setSmtpField("ratePerSecond")} /></Field>
				<Check label="Check the certificate" className="sm:col-span-2" checked={smtp.tlsVerify} onChange={setSmtpField("tlsVerify")} />
			</fieldset>

			<fieldset className="grid gap-3 sm:grid-cols-6">
				<legend className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Bounce mailbox (IMAP)</legend>
				<Field label="Host" className="sm:col-span-4"><Input value={imap.host ?? ""} onChange={setImapField("host")} placeholder="mail.example.com" autoComplete="off" spellCheck={false} /></Field>
				<Field label="Port" className="sm:col-span-2"><Input type="number" min={1} max={65535} value={imap.port ?? ""} onChange={setImapField("port")} /></Field>
				<Field label="Username" className="sm:col-span-2"><Input value={imap.user ?? ""} onChange={setImapField("user")} autoComplete="off" spellCheck={false} /></Field>
				<Field label="Password" className="sm:col-span-2" hint={server.hasImapPassword ? "Saved. Type to change it." : undefined}>
					<Input type="password" value={imap.password} onChange={setImapField("password")} placeholder={server.hasImapPassword ? "••••••••" : ""} autoComplete="new-password" />
				</Field>
				<Field label="Folder" className="sm:col-span-2"><Input value={imap.mailbox ?? ""} onChange={setImapField("mailbox")} spellCheck={false} /></Field>
				<Check label="SSL/TLS" className="sm:col-span-3" checked={imap.secure} onChange={setImapField("secure")} />
				<Check label="Check the certificate" className="sm:col-span-3" checked={imap.tlsVerify} onChange={setImapField("tlsVerify")} />
			</fieldset>

			{results && (
				<ul className="flex flex-col gap-1.5 text-sm">
					{[["smtp", "SMTP"], ["imap", "Bounce mailbox"]].map(([key, label]) =>
						results[key] ? (
							<li key={key} className="flex items-start gap-2">
								{results[key].ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />}
								<span className="min-w-0 break-words"><span className="font-medium">{label}:</span> {results[key].detail}</span>
							</li>
						) : null
					)}
				</ul>
			)}

			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-xs text-muted-foreground">{server.updatedBy ? `Last saved by ${server.updatedBy}` : "Not saved yet"}</p>
				<div className="flex gap-2">
					<Button type="button" variant="outline" onClick={test} disabled={isTesting || isSaving}>
						{isTesting ? <Loader2 className="animate-spin" /> : <PlugZap data-icon="inline-start" />}
						Test connection
					</Button>
					<Button type="submit" disabled={isSaving || isTesting}>
						{isSaving && <Loader2 className="animate-spin" />}
						Save
					</Button>
				</div>
			</div>
		</form>
	);
}

function Field({ label, hint, className, children }) {
	return (
		<label className={`flex min-w-0 flex-col gap-1.5 ${className ?? ""}`}>
			<span className="text-xs font-medium">{label}</span>
			{children}
			{hint && <span className="text-xs text-muted-foreground">{hint}</span>}
		</label>
	);
}

function Check({ label, className, checked, onChange }) {
	return (
		<label className={`flex items-center gap-2 self-end pb-2 text-sm ${className ?? ""}`}>
			<input type="checkbox" checked={checked !== false} onChange={onChange} className="size-4 accent-primary" />
			{label}
		</label>
	);
}
