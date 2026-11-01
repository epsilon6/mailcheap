import { expandVideoBlocks } from "./video-blocks.js";
import { expandSocialBlocks } from "./social-blocks.js";
import { beforeLastTagEnd, cleanRichHtml, expandHtmlBlocks, keepSafeUrls } from "./clean-html.js";
import { markdownToHtml } from "./markdown.js";
import { withMergeFallbacks } from "./merge-tags.js";
import { UNSUBSCRIBE_PLACEHOLDER, renderEmail, styleDesignerBlocks, withResponsiveImages } from "./render-email.js";
import { sanitizeHtmlBlock, sanitizeIssueHtml } from "./safe-html.js";
import { forWeb } from "./sections.js";

// The first picture is the hero, so it loads right away; the rest wait until they scroll into view.
function prioritizeImages(html) {
	let index = 0;
	return html.replace(/<img\b([^>]*?)\/?>/gi, (_, attributes) => {
		index += 1;
		const loading = index === 1 ? ' fetchpriority="high"' : ' loading="lazy"';
		return `<img${attributes}${loading} decoding="async">`;
	});
}

// Inline HTML becomes part of the page, so it goes through the sanitizer last, however it was stored. The editor's HTML
// blocks go through it on their own terms, with their inline styles.
function article(html, { hasBlocks = false } = {}) {
	const body = expandVideoBlocks(expandSocialBlocks(styleDesignerBlocks(styleImages(sanitizeIssueHtml(prioritizeImages(html)))))).replace(
		/\sdata-image-delivery="[^"]*"/g,
		""
	);
	return { kind: "article", html: hasBlocks ? expandHtmlBlocks(body, sanitizeHtmlBlock) : body };
}

// The image settings from the editor (lib/clean-html.js): a size relative to the column and a link. Alignment stays an
// attribute the page's styles read, and how an email delivers the image doesn't matter on the web.
function styleImages(html) {
	return html.replace(/<img\b([^>]*?)\s*\/?>/gi, (_, attributes) => {
		const mode = attributes.match(/\sdata-size-mode="(original|fill|scale)"/)?.[1];
		const scale = Math.max(1, Math.min(100, Number(attributes.match(/\sdata-scale="(\d+)"/)?.[1]) || 100));
		const href = attributes.match(/\sdata-image-link="(https?:\/\/[^"]*)"/i)?.[1];
		const newTab = /\sdata-image-new-tab="true"/.test(attributes);
		let kept = attributes.replace(/\sdata-(?:size-mode|scale|image-link|image-new-tab|image-delivery)="[^"]*"/g, "");
		if (mode === "fill" || mode === "scale") kept = `${kept.replace(/\s(?:width|height)="[^"]*"/g, "")} style="width:${mode === "fill" ? 100 : scale}%"`;
		const image = `<img${kept} />`;
		return href ? `<a href="${href}"${newTab ? ' target="_blank" rel="noopener noreferrer"' : ""}>${image}</a>` : image;
	});
}

// Editor and Markdown issues take the archive's typography. HTML issues, including every one sent
// through the API, keep their own design in a sandboxed frame, which measures its height once pictures
// load, so nothing in it loads lazily. {{first_name}} prints its fallback: no reader's name is ever public, and only
// the sections set to show on the website do (lib/sections.js).
export function renderIssueBody(campaign) {
	if (campaign.format === "rich") {
		return article(cleanRichHtml(withMergeFallbacks(forWeb(campaign.html), { isHtml: true })), { hasBlocks: true });
	}
	if (campaign.format !== "html") return article(cleanRichHtml(markdownToHtml(withMergeFallbacks(campaign.markdown))));

	const rendered = renderEmail({
		format: "html",
		html: campaign.html,
		subject: campaign.subject,
		previewText: campaign.previewText,
		isWebVersion: true,
	});
	const html = withMergeFallbacks(rendered.html, { isHtml: true });
	const framed = beforeLastTagEnd(keepSafeUrls(withResponsiveImages(html)), (part) =>
		part.replace(/<head([^>]*)>/i, (head) => `${head}<base target="_blank">`)
	);
	return { kind: "frame", html: framed.replaceAll(UNSUBSCRIBE_PLACEHOLDER, "#") };
}
