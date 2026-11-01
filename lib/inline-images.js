import { createHash } from "node:crypto";

export const MAX_INLINE_BYTES = 8 * 1024 * 1024;
export const MAX_INLINE_IMAGES = 40;
const decode = value => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
// Only image blocks marked for delivery participate, never the open-tracking pixel or footer assets.
export async function prepareInlineImages(email, { delivery = "hosted", readImage }) {
	const attachments = [];
	const sources = new Map();
	let total = 0;
	let html = "";
	let end = 0;
	for (const match of email.html.matchAll(/<img\b[^>]*>/gi)) {
		const tag = match[0];
		const mode = tag.match(/\sdata-image-delivery="(default|hosted|embedded)"/i)?.[1];
		let replacement = tag.replace(/\sdata-image-delivery="[^"]*"/gi, "");
		if (mode && (mode === "default" ? delivery : mode) === "embedded") {
			const source = tag.match(/\ssrc="([^"]+)"/i)?.[1];
			if (!source) throw new Error("An embedded image is missing its source");
			const url = decode(source);
			let id = sources.get(url);
			if (!id) {
				if (attachments.length >= MAX_INLINE_IMAGES) throw new Error("Use at most 40 different embedded images per email");
				const image = await readImage(url);
				if (!image?.bytes?.length || !["image/png", "image/jpeg", "image/gif", "image/webp"].includes(image.contentType)) throw new Error("The embedded image is unavailable or not a supported image");
				total += image.bytes.length;
				if (total > MAX_INLINE_BYTES) throw new Error("Embedded images must total under 8 MB. Resize images or use hosted delivery.");
				id = `image-${createHash("sha256").update(url).digest("hex").slice(0, 32)}`;
				sources.set(url, id);
				attachments.push({ RawContent: image.bytes, ContentType: image.contentType, FileName: `${id}.${image.contentType.split("/")[1]}`, ContentId: id, ContentDisposition: "INLINE", ContentTransferEncoding: "BASE64" });
			}
			replacement = replacement.replace(/\ssrc="[^"]+"/i, ` src="cid:${id}"`);
		}
		html += email.html.slice(end, match.index) + replacement;
		end = match.index + tag.length;
	}
	return { ...email, html: html + email.html.slice(end), ...(attachments.length && { attachments }) };
}
