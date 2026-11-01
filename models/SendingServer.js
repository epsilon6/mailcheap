import mongoose from "mongoose";

// The SMTP server and bounce mailbox a self-hosted server sends through when an admin sets them on /admin
// (lib/sending-server.js): one document, _id "smtp". Passwords are AES-256-GCM encrypted (lib/credentials.js), left out
// of every read but the one that sends, and never sent to a browser.
const sendingServerSchema = new mongoose.Schema(
	{
		_id: { type: String },
		enabled: { type: Boolean, default: false },
		smtp: {
			host: { type: String },
			port: { type: Number },
			security: { type: String, enum: ["starttls", "tls", "none"] },
			user: { type: String },
			password: { type: String, select: false },
			helo: { type: String },
			maxConnections: { type: Number },
			ratePerSecond: { type: Number },
			bounceAddress: { type: String },
			dkimSelector: { type: String },
			spfRecord: { type: String },
			tlsVerify: { type: Boolean },
		},
		imap: {
			host: { type: String },
			port: { type: Number },
			secure: { type: Boolean },
			user: { type: String },
			password: { type: String, select: false },
			mailbox: { type: String },
			tlsVerify: { type: Boolean },
		},
		updatedBy: { type: String },
	},
	{ timestamps: true }
);

export default mongoose.models.SendingServer || mongoose.model("SendingServer", sendingServerSchema);
