import "server-only";
import { readEmailImage } from "@/lib/email-image-storage";
import { getEmailProvider } from "@/lib/email-provider";
import { prepareInlineImages } from "@/lib/inline-images";
import { EVERY_READER } from "@/lib/sections";
import { TEST_CONTACT_ID, buildRecipientEmail } from "@/lib/sending-rules";

export const EMBED_PROVIDER_PROBLEM = "Embedded images currently require Amazon SES. Choose hosted delivery for this provider.";

// Embedded images are read before a send starts, the way every delivery reads them, so an image that isn't in the
// account's library, or is too big, stops the send here instead of failing each recipient's email. Its biggest email:
// every section in.
export async function findEmbedProblem({ accountId, campaign, newsletter, readImage, providerId }) {
	if (!newsletter || !campaign) return null;
	const email = buildRecipientEmail({
		campaign,
		newsletter,
		contact: { _id: TEST_CONTACT_ID, email: newsletter.fromEmail },
		messageId: TEST_CONTACT_ID,
		reader: EVERY_READER,
	});
	try {
		const { attachments } = await prepareInlineImages(email, {
			delivery: newsletter.imageDelivery || "hosted",
			readImage: readImage ?? ((url) => readEmailImage(accountId, url)),
		});
		if (attachments?.length && (providerId ?? getEmailProvider().id) !== "ses") return EMBED_PROVIDER_PROBLEM;
		return null;
	} catch (error) {
		return error.message || "An embedded image can't be read";
	}
}
