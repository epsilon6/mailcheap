import { getConfigProblems } from "./lib/config.js";

// Runs once when a server starts, before it takes requests. Builds skip it, so they need no secrets.
export function register() {
	const problems = getConfigProblems();
	if (problems.length > 0) throw new Error(`MailCheap can't start. ${problems.join(" ")}`);
	// The import sits inside the runtime check, so the Edge bundle leaves it out.
	if (process.env.NEXT_RUNTIME === "nodejs" && process.env.MAILCHEAP_CLOUD !== "true") {
		import("./instrumentation-node.js").then(({ loadSendingServerSoon }) => loadSendingServerSoon());
	}
}
