import { announceTelegram } from "@/lib/alerts";
import { withCronSecret } from "@/lib/cron";
import { recheckDomains } from "@/lib/domains";
import { mendStalledImports } from "@/lib/import-jobs";
import { checkPostshibaStatus } from "@/lib/postshiba-status";
import { processBounceMailbox } from "@/lib/smtp-bounces";
import { queueDueSummaries } from "@/lib/summary-send";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Every hour: PostShiba's word on whether MailCheap can send, Telegram's first message once it's set up, the summary
// emails due this hour in their owners' timezones, the daily look at verified sending domains' DNS records, and the
// imports nobody looked at since they stalled. With an SMTP server, its bounce mailbox too, behind /api/cron/bounces.
export const GET = withCronSecret(async () => {
	const [postshiba, telegram, summaries, domains, imports, bounces] = await Promise.all([
		checkPostshibaStatus(),
		announceTelegram(),
		queueDueSummaries(),
		recheckDomains(),
		mendStalledImports(),
		processBounceMailbox().catch((error) => ({ error: error.message })),
	]);
	console.info(`[hourly] ${JSON.stringify({ postshiba, telegram, summaries, domains, imports, bounces })}`);
	return { postshiba, telegram, summaries, domains, imports, bounces };
});
