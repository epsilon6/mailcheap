import { withCronSecret } from "@/lib/cron";
import { processBounceMailbox } from "@/lib/smtp-bounces";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Every few minutes on a self-hosted server that sends through its own SMTP server: the bounce mailbox's reports.
export const GET = withCronSecret(async () => {
	const bounces = await processBounceMailbox();
	console.info(`[bounces] ${JSON.stringify(bounces)}`);
	return { bounces };
});
