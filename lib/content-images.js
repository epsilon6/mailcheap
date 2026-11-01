import "server-only";
import sanitizeHtml from "sanitize-html";
import { renderEmail } from "./render-email.js";
import { decodeVideo } from "./video-blocks.js";

export const CONTENT_PAGE_SIZE = 24;
export const CONTENT_SORTS = {
	newest: { createdAt: -1, _id: -1 },
	oldest: { createdAt: 1, _id: 1 },
	name: { name: 1, _id: 1 },
	largest: { bytes: -1, _id: -1 },
};
export const escapeImageSearch = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function contentImage(upload) {
	const fallback = String(upload.pathname ?? "").split("/").at(-1) || "Image";
	return {
		id: String(upload._id), url: upload.url, name: upload.name || upload.fileName || fallback,
		fileName: upload.fileName || fallback, folder: upload.folder || "", contentType: upload.contentType,
		bytes: upload.bytes, width: upload.width || null, height: upload.height || null,
		createdAt: upload.createdAt ? new Date(upload.createdAt).toISOString() : null,
	};
}
function sameImage(a, b) {
	try { return new URL(a).href === new URL(b).href; } catch { return false; }
}

// Parse the rendered body so encoded Code, Social and Video blocks are included, without fetching images.
export function campaignImageRoles(campaign, url) {
	const roles = new Set();
	if (sameImage(campaign.thumbnailUrl, url)) roles.add("Campaign cover");
	const html = renderEmail({ ...campaign, isWebVersion: true }).html;
	sanitizeHtml(html, {
		allowedTags: ["img"], allowedAttributes: {},
		transformTags: { img: (tagName, attrs) => {
			if (sameImage(attrs.src, url)) roles.add("Email image");
			return { tagName, attribs: {} };
		} },
	});
	for (const match of String(campaign.html || "").matchAll(/data-video="([^"]*)"/gi)) {
		if (sameImage(decodeVideo(match[1]).sourceThumbnail, url)) roles.add("Video thumbnail source");
	}
	return [...roles];
}
export function imageCampaignCandidates(url) {
	const variants = [url, url.replaceAll("&", "&amp;").replaceAll('"', "&quot;"), encodeURIComponent(url)];
	const pattern = [...new Set(variants)].map(escapeImageSearch).join("|");
	return { $or: [{ thumbnailUrl: url }, { html: { $regex: pattern } }, { markdown: { $regex: pattern } }] };
}
