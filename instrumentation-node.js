import { loadSendingServer } from "./lib/sending-server.js";

// The SMTP server an admin saved on /admin, loaded beside startup rather than before it, so a configuration problem
// still stops the server at once (instrumentation.js). A database that isn't up yet is tried again every 30 seconds.
export async function loadSendingServerSoon() {
	try {
		await loadSendingServer();
	} catch (error) {
		console.error(`[sending-server] Not loaded yet: ${error.message}`);
		setTimeout(loadSendingServerSoon, 30_000).unref?.();
	}
}
