import { createHash } from "node:crypto";

export const MAX_INLINE_BYTES = 8 * 1024 * 1024;
export const MAX_INLINE_IMAGES = 40;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const decode = (value) => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// Only image blocks marked for delivery participate, never the open-tracking pixel or footer assets. An image set to
// Embedded is embedded or the email fails, since someone chose it. One that only follows the newsletter's default is
// embedded when it can be, and otherwise stays hosted: switching the default to Embedded never breaks an older issue
// whose pictures are links to other sites or too big to attach. Chosen images claim the size and count limits first.
export async function prepareInlineImages(email, { delivery = "hosted", readImage }) {
	const tags = [...email.html.matchAll(/<img\b[^>]*>/gi)].map((match) => {
		const mode = match[0].match(/\sdata-image-delivery="(default|hosted|embedded)"/i)?.[1];
		const source = match[0].match(/\ssrc="([^"]+)"/i)?.[1];
		return { match, isChosen: mode === "embedded", isDefault: mode === "default" && delivery === "embedded", url: source && decode(source) };
	});
	const attachments = [];
	const ids = new Map();
	const skipped = new Set();
	let total = 0;

	async function embed(url, isChosen) {
		if (ids.has(url)) return;
		if (!isChosen && skipped.has(url)) return;
		const fail = (message) => {
			if (isChosen) throw new Error(message);
			skipped.add(url);
		};
		if (attachments.length >= MAX_INLINE_IMAGES) return fail("Use at most 40 different embedded images per email");
		let image;
		try {
			image = await readImage(url);
		} catch (error) {
			return fail(error.message);
		}
		if (!image?.bytes?.length || !IMAGE_TYPES.includes(image.contentType)) return fail("The embedded image is unavailable or not a supported image");
		if (total + image.bytes.length > MAX_INLINE_BYTES) return fail("Embedded images must total under 8 MB. Resize images or use hosted delivery.");
		total += image.bytes.length;
		const id = `image-${createHash("sha256").update(url).digest("hex").slice(0, 32)}`;
		ids.set(url, id);
		attachments.push({ RawContent: image.bytes, ContentType: image.contentType, FileName: `${id}.${image.contentType.split("/")[1]}`, ContentId: id, ContentDisposition: "INLINE", ContentTransferEncoding: "BASE64" });
	}

	for (const { url, isChosen } of tags) {
		if (!isChosen) continue;
		if (!url) throw new Error("An embedded image is missing its source");
		await embed(url, true);
	}
	for (const { url, isDefault } of tags) if (isDefault && url) await embed(url, false);

	let html = "";
	let end = 0;
	for (const { match, url, isChosen, isDefault } of tags) {
		let replacement = match[0].replace(/\sdata-image-delivery="[^"]*"/gi, "");
		if ((isChosen || isDefault) && ids.has(url)) replacement = replacement.replace(/\ssrc="[^"]+"/i, ` src="cid:${ids.get(url)}"`);
		html += email.html.slice(end, match.index) + replacement;
		end = match.index + match[0].length;
	}
	return { ...email, html: html + email.html.slice(end), ...(attachments.length && { attachments }) };
}
